"""POST /api/world_boss/qte_bonus — бонусный урон за QTE «Коллективный удар».

Вызывается 1 раз при успешном завершении QTE (10/10 тапов).
Бонус = 1 удар × 1.5 (эквивалент 15% от 10 ударов).
Анти-спам: кулдаун 60 сек на (spawn_id, uid).
"""
from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel

from api.tma_infra import get_user_lock
from config.battle_constants import PLAYER_START_CRIT, PLAYER_START_ENDURANCE
from config.world_boss_constants import is_vulnerability_window
from repositories.world_boss.damage_calc import calc_player_damage_to_boss

QTE_COOLDOWN_MS = 60_000  # 60 секунд в мс


class QteBonusBody(BaseModel):
    init_data: str


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).replace("T", " ").split(".")[0]
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


async def world_boss_qte_bonus_inner(body: QteBonusBody, *, db, get_user_from_init_data) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])

    async with get_user_lock(uid):
        active = db.get_wb_active_spawn()
        if not active:
            return {"ok": False, "reason": "Нет активного рейда"}
        spawn_id = int(active["spawn_id"])
        if int(active.get("current_hp") or 0) <= 0:
            return {"ok": False, "reason": "Босс уже мёртв"}

        ps = db.get_wb_player_state(spawn_id, uid)
        if not ps:
            return {"ok": False, "reason": "Вы не в рейде"}
        if int(ps.get("is_dead") or 0):
            return {"ok": False, "reason": "Вы мертвы"}

        now_utc = datetime.now(timezone.utc)
        now_ms = int(now_utc.timestamp() * 1000)
        if not db.wb_try_record_qte(spawn_id, uid, now_ms, QTE_COOLDOWN_MS):
            return {"ok": False, "reason": "QTE недавно использован"}

        try:
            eq = db.get_equipment_stats(uid) or {}
        except Exception:
            eq = {}
        try:
            buffs = db.get_combined_buffs(uid) or {}
        except Exception:
            buffs = {}
        player = db.get_or_create_player(uid, "")
        eff_strength = (int(player.get("strength", 10))
                        + int(eq.get("str_bonus", 0) or 0)
                        + int(eq.get("atk_bonus", 0) or 0)
                        + int(buffs.get("strength", 0) or 0))
        eff_crit = (int(player.get("crit") or PLAYER_START_CRIT)
                    + int(eq.get("crit_bonus", 0) or 0)
                    + int(eq.get("intu_bonus", 0) or 0)
                    + int(buffs.get("crit", 0) or 0))
        # Бонусы за комплект (set bonus): atk_pct + perk_id (для perks ниже)
        _sb = {"atk_pct": 0, "perk_id": None}
        try:
            from config.set_bonuses import get_wb_set_data
            equipped_raw = db.get_equipment(uid)
            _sb = get_wb_set_data(equipped_raw, player.get("current_class") or player.get("warrior_type"))
            if _sb["atk_pct"]:
                eff_strength = int(eff_strength * (1 + _sb["atk_pct"] / 100))
        except Exception:
            pass

        try:
            elapsed = (now_utc - _parse_ts(active["started_at"])).total_seconds()
            vuln = is_vulnerability_window(elapsed)
        except Exception:
            vuln = False

        player_stats = {"strength": max(1, eff_strength), "crit": max(0, eff_crit)}
        stat_profile = active.get("stat_profile") or {}
        # Активные свитки: JSON-список (до 5), фолбэк на legacy slot_1/2.
        import json as _json_qte
        try:
            _active_qte = _json_qte.loads(ps.get("raid_scrolls_active") or "[]")
            if not isinstance(_active_qte, list): _active_qte = []
        except Exception:
            _active_qte = []
        if not _active_qte:
            _legacy_qte = [ps.get("raid_scroll_1"), ps.get("raid_scroll_2")]
            _active_qte = [s for s in _legacy_qte if s]
        base_dmg, _, _ = calc_player_damage_to_boss(
            player_stats, stat_profile,
            scrolls=_active_qte,
            is_vulnerability_window=vuln,
        )
        bonus_dmg = int(base_dmg * 1.5)

        # Set-bonus перки на QTE (QTE считается за «удар» как и обычный hit)
        _perk = _sb.get("perk_id")
        _hits_before = int(ps.get("hits_count") or 0)
        if _perk == "decisive_strike" and _hits_before == 0:
            bonus_dmg = int(bonus_dmg * 1.5)
        elif _perk == "cold_blood":
            ramp = min(10, _hits_before) / 100.0
            if ramp > 0:
                bonus_dmg = int(bonus_dmg * (1.0 + ramp))
        if _perk == "gods_wrath" and (_hits_before + 1) % 5 == 0:
            bonus_dmg = bonus_dmg * 2

        new_hp = db.apply_damage_to_boss(spawn_id, bonus_dmg)
        if new_hp is None:
            return {"ok": False, "reason": "Рейд уже завершён"}

        db.log_wb_hit(spawn_id=spawn_id, user_id=uid, damage=bonus_dmg,
                      is_crit=False, is_vulnerability_window=vuln)
        db.wb_add_player_damage(spawn_id, uid, bonus_dmg)

        return {"ok": True, "bonus_damage": bonus_dmg, "boss_hp": new_hp}
