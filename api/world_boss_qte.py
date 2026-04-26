"""POST /api/world_boss/qte_bonus — бонусный урон за QTE «Коллективный удар».

Вызывается 1 раз при успешном завершении QTE (10/10 тапов).
Бонус = 1 удар × 1.5 (эквивалент 15% от 10 ударов).
Анти-спам: кулдаун 60 сек на (spawn_id, uid).
"""
from __future__ import annotations

import time
from datetime import datetime, timezone

from pydantic import BaseModel

from api.tma_infra import get_user_lock
from config.battle_constants import PLAYER_START_CRIT, PLAYER_START_ENDURANCE
from config.world_boss_constants import is_vulnerability_window
from repositories.world_boss.damage_calc import calc_player_damage_to_boss

_qte_last: dict = {}
QTE_COOLDOWN_SEC = 60


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

        key = (spawn_id, uid)
        now = time.time()
        if now - _qte_last.get(key, 0) < QTE_COOLDOWN_SEC:
            return {"ok": False, "reason": "QTE недавно использован"}
        _qte_last[key] = now

        try:
            eq = db.get_equipment_stats(uid) or {}
        except Exception:
            eq = {}
        player = db.get_or_create_player(uid, "")
        eff_strength = (int(player.get("strength", 10))
                        + int(eq.get("str_bonus", 0) or 0)
                        + int(eq.get("atk_bonus", 0) or 0))
        eff_crit = (int(player.get("crit") or PLAYER_START_CRIT)
                    + int(eq.get("crit_bonus", 0) or 0)
                    + int(eq.get("intu_bonus", 0) or 0))

        now_utc = datetime.now(timezone.utc)
        try:
            elapsed = (now_utc - _parse_ts(active["started_at"])).total_seconds()
            vuln = is_vulnerability_window(elapsed)
        except Exception:
            vuln = False

        player_stats = {"strength": max(1, eff_strength), "crit": max(0, eff_crit)}
        stat_profile = active.get("stat_profile") or {}
        base_dmg, _, _ = calc_player_damage_to_boss(
            player_stats, stat_profile,
            scroll_1=ps.get("raid_scroll_1"),
            scroll_2=ps.get("raid_scroll_2"),
            is_vulnerability_window=vuln,
        )
        bonus_dmg = int(base_dmg * 1.5)

        new_hp = db.apply_damage_to_boss(spawn_id, bonus_dmg)
        if new_hp is None:
            return {"ok": False, "reason": "Рейд уже завершён"}

        db.log_wb_hit(spawn_id=spawn_id, user_id=uid, damage=bonus_dmg,
                      is_crit=False, is_vulnerability_window=vuln)
        db.wb_add_player_damage(spawn_id, uid, bonus_dmg)

        return {"ok": True, "bonus_damage": bonus_dmg, "boss_hp": new_hp}
