"""REST API рейда Мирового босса: /api/world_boss/* (см. docs/WORLD_BOSS.md).

Эндпоинты:
- GET  /api/world_boss/state         — состояние рейда + игрока + инвентарь
- POST /api/world_boss/hit           — удар по боссу
- POST /api/world_boss/use_scroll    — применить рейд-свиток в слот (1/2)
- POST /api/world_boss/resurrect     — воскрешение (res_30/60/100)
- POST /api/world_boss/claim_reward  — забрать награду
- POST /api/world_boss/reminder_toggle — вкл/выкл пуш за 5 мин до рейда

Сборка payload для GET /state — в `api/world_boss_state.py`.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter

from api.world_boss_hit import HitBody, world_boss_hit_inner
from api.world_boss_actions import (
    ClaimRewardBody,
    RegisterBody,
    ReminderToggleBody,
    ResurrectBody,
    UseScrollBody,
    world_boss_claim_reward_inner,
    world_boss_register_inner,
    world_boss_reminder_toggle_inner,
    world_boss_resurrect_inner,
    world_boss_use_scroll_inner,
)
from api.world_boss_state import build_wb_state_payload

log = logging.getLogger(__name__)


def register_world_boss_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    db = ctx["db"]
    get_user = ctx["get_user_from_init_data"]
    _inner_ctx = dict(db=db, get_user_from_init_data=get_user)

    @router.get("/api/world_boss/state")
    def wb_state(init_data: str):
        try:
            tg = get_user(init_data)
            return build_wb_state_payload(db, int(tg["id"]))
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

    @router.post("/api/world_boss/register")
    async def wb_register(body: RegisterBody):
        try:
            return await world_boss_register_inner(body, **_inner_ctx)
        except Exception as e:
            log.error("wb_register error: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    @router.get("/api/rating/world_boss")
    def wb_rating(init_data: str):
        try:
            tg = get_user(init_data)
            uid = int(tg["id"])
            spawn = db.get_wb_last_finished()
            if not spawn:
                return {"ok": True, "spawn": None, "top": [], "my_pos": None, "my_damage": 0}
            sid = spawn["spawn_id"]
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute(
                "SELECT ps.user_id, p.username, ps.total_damage, ps.hits_count, ps.is_dead "
                "FROM world_boss_player_state ps "
                "JOIN players p ON p.user_id = ps.user_id "
                "WHERE ps.spawn_id=? ORDER BY ps.total_damage DESC LIMIT 10",
                (sid,),
            )
            top = [dict(r) for r in cur.fetchall()]
            cur.execute(
                "SELECT total_damage FROM world_boss_player_state WHERE spawn_id=? AND user_id=?",
                (sid, uid),
            )
            my_row = cur.fetchone()
            my_dmg = int(my_row["total_damage"]) if my_row else 0
            my_pos = None
            if my_row:
                cur.execute(
                    "SELECT COUNT(*)+1 AS pos FROM world_boss_player_state "
                    "WHERE spawn_id=? AND total_damage>?",
                    (sid, my_dmg),
                )
                pos_row = cur.fetchone()
                my_pos = int(pos_row["pos"]) if pos_row else None
            conn.close()
            return {"ok": True, "spawn": spawn, "top": top, "my_pos": my_pos, "my_damage": my_dmg}
        except Exception as e:
            log.error("wb_rating error: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    @router.get("/api/admin/wb_test_schedule")
    def wb_test_schedule(in_minutes: int = 2):
        """Тест: отменить все scheduled-спавны и создать новый через in_minutes минут."""
        try:
            from datetime import datetime, timezone, timedelta
            import random
            from config.world_boss_constants import WB_BOSS_NAMES, calc_boss_hp
            from config.world_boss import roll_boss_type
            from repositories.world_boss.damage_calc import roll_boss_stat_profile

            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute(
                "UPDATE world_boss_spawns SET status='cancelled', ended_at=CURRENT_TIMESTAMP "
                "WHERE status IN ('scheduled','active')"
            )
            conn.commit()
            conn.close()

            spawn_at = datetime.now(timezone.utc) + timedelta(minutes=max(1, in_minutes))
            btype = roll_boss_type()
            pool = btype.get("name_pool") or WB_BOSS_NAMES
            boss_name = random.choice(pool)
            stat_profile = roll_boss_stat_profile(base=btype.get("stat_profile_base"))
            db.create_wb_spawn(
                scheduled_at=spawn_at.strftime("%Y-%m-%d %H:%M:%S"),
                boss_name=boss_name,
                stat_profile=stat_profile,
                max_hp=calc_boss_hp(0),
                boss_type=btype.get("type", "universal"),
            )
            return {"ok": True, "scheduled_at_utc": spawn_at.isoformat(), "boss_name": boss_name,
                    "in_minutes": in_minutes}
        except Exception as e:
            log.error("wb_test_schedule error: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    app.include_router(router)
