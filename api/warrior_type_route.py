"""POST /api/warrior-type — сохранить выбранный тип воина."""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from api.tma_auth import get_user_from_init_data
from api.tma_infra import _cache_get, _cache_invalidate, _cache_set, _rl_check
from database import db

VALID_WARRIOR_TYPES = {"default", "tank", "agile", "crit", "neutral"}


class WarriorTypeBody(BaseModel):
    init_data: str
    warrior_type: str


def register_warrior_type_route(app: FastAPI) -> None:
    @app.post("/api/warrior-type")
    def set_warrior_type(body: WarriorTypeBody):
        user = get_user_from_init_data(body.init_data)
        uid = int(user["id"])
        _rl_check(uid, "warrior_type", max_hits=10, window_sec=30)
        wt = (body.warrior_type or "default").strip().lower()
        if wt not in VALID_WARRIOR_TYPES:
            return {"ok": False, "reason": "invalid_type"}
        db.update_warrior_type(uid, wt)
        # Обновляем кеш немедленно — иначе гонка: параллельный /api/player
        # может вернуть старый warrior_type из кеша до его инвалидации
        cached = _cache_get(uid)
        if cached:
            _cache_set(uid, {**cached, "warrior_type": wt})
        else:
            _cache_invalidate(uid)
        return {"ok": True, "warrior_type": wt}
