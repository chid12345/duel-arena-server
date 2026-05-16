"""Маршруты премиум-перков (Этап 7C редизайна).

POST /api/premium/next_battle_x2/use — активировать заряд «удвоить следующий бой»
GET  /api/premium/next_battle_x2/status — статус для UI
"""
from __future__ import annotations

import logging

from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from api.tma_infra import _rl_check
from api.tma_models import InitDataHeader
from database import db

_log = logging.getLogger(__name__)


class _PremiumBody(InitDataHeader):
    pass


def register_premium_perks_routes(app: FastAPI) -> None:

    @app.post("/api/premium/next_battle_x2/use")
    def next_battle_x2_use(body: _PremiumBody):
        """Активировать «удвоить следующий бой» (1 раз в день для премов)."""
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            _rl_check(uid, "premium_perk", max_hits=5, window_sec=10)
            res = db.activate_next_battle_x2(uid)
            status = db.get_next_battle_x2_status(uid)
            return {
                "ok": bool(res.get("ok")),
                "reason": res.get("error", ""),
                "status": status,
            }
        except Exception as e:
            _log.error("next_battle_x2_use error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}

    @app.get("/api/premium/next_battle_x2/status")
    def next_battle_x2_status(init_data: str):
        """Статус «удвоить следующий бой» для UI (без побочных эффектов)."""
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            return {"ok": True, "status": db.get_next_battle_x2_status(uid)}
        except Exception as e:
            _log.error("next_battle_x2_status error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}
