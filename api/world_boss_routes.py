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
    ReminderToggleBody,
    ResurrectBody,
    UseScrollBody,
    world_boss_claim_reward_inner,
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

    app.include_router(router)
