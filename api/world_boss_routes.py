"""REST API рейда Мирового босса: /api/world_boss/* (см. docs/WORLD_BOSS.md).

Эндпоинты:
- GET  /api/world_boss/state         — состояние рейда + игрока + инвентарь
- POST /api/world_boss/hit           — удар по боссу
- POST /api/world_boss/use_scroll    — применить рейд-свиток в слот (1/2)
- POST /api/world_boss/resurrect     — воскрешение (res_30/60/100)
- POST /api/world_boss/claim_reward  — забрать награду
- POST /api/world_boss/reminder_toggle — вкл/выкл пуш за 5 мин до рейда
"""
from __future__ import annotations

import logging
from typing import Any, Dict
from datetime import datetime, timezone

from fastapi import APIRouter

from api.world_boss_hit import HitBody, world_boss_hit_inner
from api.world_boss_actions import (
    ClaimRewardBody,
    ReminderToggleBody,
    ResurrectBody,
    UseScrollBody,
    world_boss_claim_reward_inner,
    world_boss_reminder_toggle_inner,
    world_boss_resurrect_inner,
    world_boss_use_scroll_inner,
)
from config.world_boss_constants import WB_DURATION_SEC, is_vulnerability_window

log = logging.getLogger(__name__)

_RAID_SCROLL_IDS = ("damage_25", "power_10", "defense_20", "dodge_10", "crit_10")
_RES_SCROLL_IDS = ("res_30", "res_60", "res_100")


def _parse_ts(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).replace("T", " ").split(".")[0]
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def _wb_state_payload(db, uid: int) -> Dict[str, Any]:
    """Состояние рейда и игрока для UI (читается при входе на вкладку + polling fallback)."""
    active = db.get_wb_active_spawn()
    next_sched = db.get_wb_next_scheduled()
    last = db.get_wb_last_finished()
    player_state = None
    seconds_left = None
    vulnerable = False

    if active:
        spawn_id = int(active["spawn_id"])
        try:
            started_at = _parse_ts(active["started_at"])
            elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
            seconds_left = max(0, int(WB_DURATION_SEC - elapsed))
            vulnerable = is_vulnerability_window(elapsed)
        except Exception:
            pass
        ps = db.get_wb_player_state(spawn_id, uid)
        if ps:
            player_state = {
                "current_hp": int(ps.get("current_hp") or 0),
                "max_hp": int(ps.get("max_hp") or 100),
                "is_dead": bool(int(ps.get("is_dead") or 0)),
                "total_damage": int(ps.get("total_damage") or 0),
                "hits_count": int(ps.get("hits_count") or 0),
                "raid_scroll_1": ps.get("raid_scroll_1"),
                "raid_scroll_2": ps.get("raid_scroll_2"),
            }

    inv_rows = db.get_inventory(uid)
    inv = {r["item_id"]: int(r["quantity"]) for r in inv_rows}
    raid_scrolls_inv = {sid: inv.get(sid, 0) for sid in _RAID_SCROLL_IDS}
    res_scrolls_inv = {sid: inv.get(sid, 0) for sid in _RES_SCROLL_IDS}
    unclaimed = db.get_wb_unclaimed_rewards(uid)
    player_row = db.get_or_create_player(uid, "")
    reminder_opt_in = bool(int(player_row.get("wb_reminder_opt_in") or 0))

    return {
        "ok": True,
        "active": {
            "spawn_id": int(active["spawn_id"]),
            "boss_name": active.get("boss_name"),
            "current_hp": int(active.get("current_hp") or 0),
            "max_hp": int(active.get("max_hp") or 0),
            "stat_profile": active.get("stat_profile") or {},
            "seconds_left": seconds_left,
            "vulnerable": vulnerable,
            "crown_flags": int(active.get("crown_flags") or 0),
        } if active else None,
        "next_scheduled": {
            "scheduled_at": next_sched.get("scheduled_at"),
            "boss_name": next_sched.get("boss_name"),
        } if next_sched else None,
        "last_finished": {
            "spawn_id": int(last.get("spawn_id")),
            "boss_name": last.get("boss_name"),
            "status": last.get("status"),
            "ended_at": last.get("ended_at"),
        } if last else None,
        "player_state": player_state,
        "raid_scrolls_inv": raid_scrolls_inv,
        "res_scrolls_inv": res_scrolls_inv,
        "reminder_opt_in": reminder_opt_in,
        "unclaimed_rewards": [
            {
                "reward_id": int(r["reward_id"]),
                "spawn_id": int(r["spawn_id"]),
                "boss_name": r.get("boss_name"),
                "gold": int(r.get("gold") or 0),
                "exp": int(r.get("exp") or 0),
                "diamonds": int(r.get("diamonds") or 0),
                "chest_type": r.get("chest_type"),
                "contribution_pct": float(r.get("contribution_pct") or 0.0),
                "is_victory": bool(r.get("is_victory")),
            } for r in unclaimed
        ],
    }


def register_world_boss_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    db = ctx["db"]
    get_user = ctx["get_user_from_init_data"]
    _inner_ctx = dict(db=db, get_user_from_init_data=get_user)

    @router.get("/api/world_boss/state")
    def wb_state(init_data: str):
        try:
            tg = get_user(init_data)
            return _wb_state_payload(db, int(tg["id"]))
        except Exception as e:
            log.error("wb_state error: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    @router.post("/api/world_boss/hit")
    async def wb_hit(body: HitBody):
        try:
            return await world_boss_hit_inner(body, **_inner_ctx)
        except Exception as e:
            log.error("wb_hit error: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    @router.post("/api/world_boss/use_scroll")
    async def wb_use_scroll(body: UseScrollBody):
        try:
            return await world_boss_use_scroll_inner(body, **_inner_ctx)
        except Exception as e:
            log.error("wb_use_scroll error: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    @router.post("/api/world_boss/resurrect")
    async def wb_resurrect(body: ResurrectBody):
        try:
            return await world_boss_resurrect_inner(body, **_inner_ctx)
        except Exception as e:
            log.error("wb_resurrect error: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    @router.post("/api/world_boss/claim_reward")
    async def wb_claim_reward(body: ClaimRewardBody):
        try:
            return await world_boss_claim_reward_inner(body, **_inner_ctx)
        except Exception as e:
            log.error("wb_claim_reward error: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    @router.post("/api/world_boss/reminder_toggle")
    async def wb_reminder_toggle(body: ReminderToggleBody):
        try:
            return await world_boss_reminder_toggle_inner(body, **_inner_ctx)
        except Exception as e:
            log.error("wb_reminder_toggle error: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    app.include_router(router)
