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
from repositories.world_boss.zone_tactics import resolve_zones

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
        # Атакующие статы экипировки по боссу: двойной удар (шанс x2) и вампиризм.
        _eq_double_pct = int(eq.get("double_pct", 0) or 0) + int(buffs.get("double_pct", 0) or 0)
        _eq_lifesteal_pct = int(eq.get("lifesteal_pct", 0) or 0) + int(buffs.get("lifesteal_pct", 0) or 0)
        # Бонусы за комплект (set bonus): hp_pct, atk_pct + perk_id (для perks ниже)
        _sb = {"hp_pct": 0, "atk_pct": 0, "def_pct": 0.0, "perk_id": None, "count": 0}
        try:
            from config.set_bonuses import get_wb_set_data
            equipped_raw = db.get_equipment(uid)
            _sb = get_wb_set_data(equipped_raw, player.get("current_class") or player.get("warrior_type"))
            eff_max_hp   = int(eff_max_hp * (1 + _sb["hp_pct"] / 100)) if _sb["hp_pct"] else eff_max_hp
            eff_strength = int(eff_strength * (1 + _sb["atk_pct"] / 100)) if _sb["atk_pct"] else eff_strength
        except Exception:
            pass
        ps = db.wb_join_raid(
            spawn_id, uid, max_hp=eff_max_hp,
            endurance=eff_endur,
            crit=eff_crit,
        )
        if int(ps.get("is_dead") or 0):
            return {"ok": False, "reason": "Вы мертвы — нужен свиток воскрешения"}

        # Авто-применение ВСЕХ купленных рейд-свитков при ПЕРВОМ входе.
        # Каждый из 5 типов покупается в лобби максимум 1 раз перед рейдом.
        # Здесь забираем их все из инвентаря и кладём в JSON-список
        # raid_scrolls_active — он же источник правды для damage_calc.
        if not existing_ps:
            _RAID_ORDER = ["damage_25", "power_10", "defense_20", "dodge_10", "crit_10"]
            try:
                inv_rows = db.get_inventory(uid)
                inv = {r["item_id"]: int(r["quantity"]) for r in inv_rows
                       if r["item_id"] in _RAID_ORDER}
                bought = [sid for sid in _RAID_ORDER if inv.get(sid, 0) > 0]
                for scroll_id in bought:
                    try:
                        db.remove_from_inventory(uid, scroll_id, quantity=1)
                    except Exception:
                        pass
                if bought:
                    import json as _json
                    try:
                        conn_ = db.get_connection()
                        cur_ = conn_.cursor()
                        cur_.execute(
                            "UPDATE world_boss_player_state SET raid_scrolls_active=? "
                            "WHERE spawn_id=? AND user_id=?",
                            (_json.dumps(bought), int(spawn_id), int(uid)),
                        )
                        conn_.commit(); conn_.close()
                    except Exception as _ue:
                        log.warning("wb auto-apply set raid_scrolls_active uid=%s: %s", uid, _ue)
                    # Обновляем локальный ps чтобы свитки сразу учлись в этом ударе
                    ps = dict(ps)
                    ps["raid_scrolls_active"] = _json.dumps(bought)
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
        # Парсим активные свитки из JSON. Фолбэк на legacy slot_1/slot_2
        # для старых player_state-записей (или если миграция ещё не отработала).
        import json as _json_dc
        try:
            _active = _json_dc.loads(ps.get("raid_scrolls_active") or "[]")
            if not isinstance(_active, list): _active = []
        except Exception:
            _active = []
        if not _active:
            _legacy = [ps.get("raid_scroll_1"), ps.get("raid_scroll_2")]
            _active = [s for s in _legacy if s]
        dmg, is_crit, _dbg = calc_player_damage_to_boss(
            player_stats, stat_profile,
            scrolls=_active,
            is_vulnerability_window=vuln,
        )

        # Броня Голема (криты сквозь) / фазы Тени — множитель к урону по боссу.
        try:
            from config.world_boss.abilities import wb_player_dmg_mult
            _mhp = int(active.get("max_hp") or 0)
            _hpp = (int(active.get("current_hp") or 0) / _mhp) if _mhp > 0 else 1.0
            _pm = wb_player_dmg_mult(active.get("boss_type") or "", _hpp, is_crit, elapsed)
            if _pm != 1.0:
                dmg = max(1, int(dmg * _pm))
        except Exception:
            pass

        # Set-bonus перки (атака игрока по боссу). hits_count — кол-во УЖЕ нанесённых
        # ударов; этот удар — следующий по счёту (hits_count + 1).
        _perk = _sb.get("perk_id")
        _hits_before = int(ps.get("hits_count") or 0)
        if _perk == "decisive_strike" and _hits_before == 0:
            dmg = int(dmg * 1.5)  # первый удар +50%
        elif _perk == "cold_blood":
            ramp = min(10, _hits_before) / 100.0
            if ramp > 0:
                dmg = int(dmg * (1.0 + ramp))
        if _perk == "gods_wrath" and (_hits_before + 1) % 5 == 0:
            dmg = dmg * 2  # каждый 5-й удар x2

        # Тактика по зонам (Фаза 2): модификатор урона + контр-урон по игроку.
        # Если клиент не прислал зоны (старый клиент) — режим бэкап-совместимости.
        zr = resolve_zones(body.attack_zone, body.defense_zone, eff_max_hp, dmg,
                           player_level=int(player.get("level") or 1))
        dmg = zr["modified_damage"]

        # Двойной удар (double_pct, оружие/usdt): шанс нанести x2 урона по боссу.
        import random as _rnd
        is_double = bool(_eq_double_pct) and _rnd.random() < _eq_double_pct / 100.0
        if is_double:
            dmg = max(1, dmg * 2)

        new_hp = db.apply_damage_to_boss(spawn_id, dmg)
        if new_hp is None:
            return {"ok": False, "reason": "Рейд уже завершён"}

        # Вампиризм (lifesteal_pct, ботинки): лечим игрока на % от урона по боссу.
        if _eq_lifesteal_pct and dmg > 0 and not int(ps.get("is_dead") or 0):
            try:
                db.wb_heal_player(spawn_id, uid, max(1, int(dmg * _eq_lifesteal_pct / 100.0)))
            except Exception:
                pass

        # Контр-урон по игроку (если защита не угадала зону атаки босса).
        # Учитываем активный щит (-30% на 2 сек).
        counter = int(zr["counter_damage"] or 0)
        player_hp_after = int(ps.get("current_hp") or 0)
        player_died = False
        if counter > 0 and not int(ps.get("is_dead") or 0):
            try:
                shield_until = int(ps.get("shield_until_ms") or 0)
                if shield_until > now_ms:
                    counter = max(1, int(counter * 0.7))
            except Exception:
                pass
            player_hp_after, player_died = db.wb_apply_damage_to_player(spawn_id, uid, counter)

        db.log_wb_hit(
            spawn_id=spawn_id, user_id=uid, damage=dmg,
            is_crit=is_crit, is_vulnerability_window=vuln,
        )
        db.wb_add_player_damage(spawn_id, uid, dmg)
        try:
            from api.world_boss_ws import update_last_action
            update_last_action(uid, "crit" if is_crit else "atk", dmg)
        except Exception:
            pass

        return {
            "ok": True,
            "damage": dmg,
            "is_crit": is_crit,
            "boss_hp": new_hp,
            "boss_max_hp": int(active.get("max_hp") or 0),
            "boss_killed": new_hp <= 0,
            "vulnerable": vuln,
            # Фаза 2: зоны
            "zone_mode": zr["zone_mode"],
            "boss_atk_zone": zr["boss_atk_zone"],
            "boss_def_zone": zr["boss_def_zone"],
            "atk_blocked": zr["atk_blocked"],
            "def_blocked": zr["def_blocked"],
            "counter_damage": counter,
            "player_hp": player_hp_after,
            "player_max_hp": int(ps.get("max_hp") or eff_max_hp),
            "player_died": player_died,
        }
