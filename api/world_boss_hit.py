"""POST /api/world_boss/hit — игрок бьёт босса.

Анти-чит: весь расчёт на сервере. Клиент только триггерит «бью».
Cooldown 300мс через атомарный UPDATE world_boss_player_state.last_hit_ms.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from pydantic import BaseModel

from api.tma_infra import get_user_lock
from config.battle_constants import PLAYER_START_CRIT, PLAYER_START_ENDURANCE
from config.world_boss_constants import is_vulnerability_window
from repositories.world_boss.damage_calc import (
    PLAYER_HIT_COOLDOWN_MS,
    calc_player_damage_to_boss,
)

log = logging.getLogger(__name__)


class HitBody(BaseModel):
    init_data: str
    # Зоны атаки/защиты (HEAD/TORSO/LEGS) — приходят с нового UI боя WB.
    # Пока в расчёте урона НЕ используются (бэкап-совместимость со старым клиентом),
    # но логируются и валидируются. Тактическая логика — отдельной фазой.
    attack_zone: str | None = None
    defense_zone: str | None = None


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).replace("T", " ").split(".")[0]
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


async def world_boss_hit_inner(body: HitBody, *, db, get_user_from_init_data) -> dict:
    """Обработка удара игрока по боссу.
    Возвращает: {ok, damage, is_crit, boss_hp, boss_killed?, vulnerable}.
    """
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])

    async with get_user_lock(uid):
        active = db.get_wb_active_spawn()
        if not active:
            return {"ok": False, "reason": "Нет активного рейда"}
        spawn_id = int(active["spawn_id"])
        if int(active.get("current_hp") or 0) <= 0:
            return {"ok": False, "reason": "Босс уже мёртв"}

        now_utc = datetime.now(timezone.utc)

        # Анти-эксплойт «вход после 8й минуты»: если у игрока ещё нет
        # player_state и прошло > WB_LATE_JOIN_WINDOW_SEC — отказ.
        # Уже подключившиеся (player_state есть) бьют как обычно.
        existing_ps = db.get_wb_player_state(spawn_id, uid)
        if not existing_ps:
            from config.world_boss_constants import WB_LATE_JOIN_WINDOW_SEC
            try:
                started_at = _parse_ts(active["started_at"])
                elapsed = (now_utc - started_at).total_seconds()
                if elapsed > WB_LATE_JOIN_WINDOW_SEC:
                    return {"ok": False, "reason": "Вход в рейд закрыт — присоединиться можно только в первые 2 минуты"}
            except Exception:
                pass

        # Автоподключение к рейду при первом ударе
        _uname = tg_user.get("username") or tg_user.get("first_name") or f"User{uid}"
        player = db.get_or_create_player(uid, _uname)
        # Бонусы экипировки (зеркало PvP `_apply_equipment_stats`):
        # hp_bonus → max_hp, str_bonus+atk_bonus → strength, crit_bonus+intu_bonus → crit.
        try:
            eq = db.get_equipment_stats(uid) or {}
        except Exception:
            eq = {}
        # Активные свитки/эликсиры — те же что в PvP. Списываются один раз
        # в конце рейда (см. world_boss_scheduler._finish_expired_or_dead_spawn).
        try:
            buffs = db.get_combined_buffs(uid) or {}
        except Exception:
            buffs = {}
        eff_max_hp   = int(player.get("max_hp", 100)) + int(eq.get("hp_bonus", 0) or 0) \
                       + int(buffs.get("hp_bonus", 0) or 0)
        eff_strength = int(player.get("strength", 10)) \
                       + int(eq.get("str_bonus", 0) or 0) \
                       + int(eq.get("atk_bonus", 0) or 0) \
                       + int(buffs.get("strength", 0) or 0)
        eff_crit     = int(player.get("crit") or PLAYER_START_CRIT) \
                       + int(eq.get("crit_bonus", 0) or 0) \
                       + int(eq.get("intu_bonus", 0) or 0) \
                       + int(buffs.get("crit", 0) or 0)
        eff_endur    = int(player.get("endurance") or PLAYER_START_ENDURANCE) \
                       + int(eq.get("agi_bonus", 0) or 0) \
                       + int(buffs.get("endurance", 0) or 0)
        ps = db.wb_join_raid(
            spawn_id, uid, max_hp=eff_max_hp,
            endurance=eff_endur,
            crit=eff_crit,
        )
        if int(ps.get("is_dead") or 0):
            return {"ok": False, "reason": "Вы мертвы — нужен свиток воскрешения"}

        # Авто-применение рейд-свитков при ПЕРВОМ входе (existing_ps не было).
        # Купил до боя → зашёл → сами применились → работают весь рейд → сброс после.
        if not existing_ps:
            _RAID_ORDER = ["damage_25", "power_10", "defense_20", "dodge_10", "crit_10"]
            try:
                inv_rows = db.get_inventory(uid)
                inv = {r["item_id"]: int(r["quantity"]) for r in inv_rows
                       if r["item_id"] in _RAID_ORDER}
                for scroll_id in _RAID_ORDER:
                    if inv.get(scroll_id, 0) > 0:
                        db.wb_apply_raid_scroll(user_id=uid, scroll_name=scroll_id, slot=None)
                        # Обновляем ps чтобы урон считался уже с учётом свитка
                        fresh = db.get_wb_player_state(spawn_id, uid)
                        if fresh:
                            ps = fresh
                        # Если оба слота заняты — стоп
                        if ps.get("raid_scroll_1") and ps.get("raid_scroll_2"):
                            break
            except Exception as _ae:
                log.warning("wb auto-apply scrolls uid=%s: %s", uid, _ae)

        # Атомарный кулдаун 300 мс (ms-точность, анти-чит)
        now_ms = int(now_utc.timestamp() * 1000)
        if not db.wb_try_record_hit(spawn_id, uid, now_ms, PLAYER_HIT_COOLDOWN_MS):
            return {"ok": False, "reason": "Слишком быстро"}

        # Окно уязвимости x3 (5 сек каждые 60 сек)
        try:
            started_at = _parse_ts(active["started_at"])
            elapsed = (now_utc - started_at).total_seconds()
            vuln = is_vulnerability_window(elapsed)
        except Exception:
            vuln = False

        # Расчёт урона на сервере — статы с учётом экипировки
        player_stats = {
            "strength": max(1, eff_strength),
            "crit": max(0, eff_crit),
        }
        stat_profile = active.get("stat_profile") or {}
        dmg, is_crit, _dbg = calc_player_damage_to_boss(
            player_stats, stat_profile,
            scroll_1=ps.get("raid_scroll_1"),
            scroll_2=ps.get("raid_scroll_2"),
            is_vulnerability_window=vuln,
        )

        new_hp = db.apply_damage_to_boss(spawn_id, dmg)
        if new_hp is None:
            return {"ok": False, "reason": "Рейд уже завершён"}

        db.log_wb_hit(
            spawn_id=spawn_id, user_id=uid, damage=dmg,
            is_crit=is_crit, is_vulnerability_window=vuln,
        )
        db.wb_add_player_damage(spawn_id, uid, dmg)

        return {
            "ok": True,
            "damage": dmg,
            "is_crit": is_crit,
            "boss_hp": new_hp,
            "boss_max_hp": int(active.get("max_hp") or 0),
            "boss_killed": new_hp <= 0,
            "vulnerable": vuln,
        }
