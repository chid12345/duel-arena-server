"""REST API чата зала ожидания рейда.

POST /api/world_boss/lobby_chat/send
  body: {init_data, text}
  → {ok, msg_id} | {ok:false, reason}
  reasons: not_registered, no_gather, too_long, cooldown, empty

GET /api/world_boss/lobby_chat/messages?init_data=...&since=<id>
  → {ok, messages: [{id, user_id, username, text, ts}]}

Видят и пишут ТОЛЬКО зарегистрированные на текущий рейд (фаза scheduled).
Когда рейд переходит в active — start_wb_spawn чистит таблицу.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel, Field

from repositories.world_boss.lobby_chat import (
    MAX_MSG_LEN, COOLDOWN_SEC, DEFAULT_LIMIT,
)

log = logging.getLogger(__name__)


class LobbyChatSendBody(BaseModel):
    init_data: str = Field(..., min_length=1)
    text: str = Field(..., max_length=400)  # 200 — реальный, 400 — защита от мусора


def _current_scheduled_spawn_id(db) -> int:
    """ID ближайшего рейда в фазе сбора. 0 если нет."""
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT spawn_id FROM world_boss_spawns "
        "WHERE status='scheduled' ORDER BY scheduled_at ASC LIMIT 1"
    )
    row = cur.fetchone()
    conn.close()
    return int(row["spawn_id"]) if row else 0


def _is_registered(db, spawn_id: int, user_id: int) -> bool:
    """Зарегистрирован ли игрок на этот рейд."""
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT 1 FROM world_boss_registrations WHERE spawn_id=? AND user_id=? LIMIT 1",
        (int(spawn_id), int(user_id)),
    )
    ok = cur.fetchone() is not None
    conn.close()
    return ok


def register_world_boss_lobby_chat_routes(app, ctx: Dict[str, Any]) -> None:
    """Регистрирует чат-эндпоинты на app (FastAPI)."""
    db = ctx["db"]
    get_user = ctx["get_user_from_init_data"]
    router = APIRouter()

    @router.post("/api/world_boss/lobby_chat/send")
    async def lobby_chat_send(body: LobbyChatSendBody):
        try:
            tg = get_user(body.init_data)
            uid = int(tg["id"])
            spawn_id = _current_scheduled_spawn_id(db)
            if not spawn_id:
                return {"ok": False, "reason": "no_gather"}
            if not _is_registered(db, spawn_id, uid):
                return {"ok": False, "reason": "not_registered"}
            text = (body.text or "").strip()
            if not text:
                return {"ok": False, "reason": "empty"}
            if len(text) > MAX_MSG_LEN:
                return {"ok": False, "reason": "too_long"}
            # Кулдаун: последний ts отправки от этого юзера + COOLDOWN_SEC > now → отказ
            last_ts = db.lobby_chat_last_ts(uid)
            now = int(time.time())
            if last_ts and (now - last_ts) < COOLDOWN_SEC:
                return {"ok": False, "reason": "cooldown",
                        "retry_in": COOLDOWN_SEC - (now - last_ts)}
            uname = (tg.get("username") or tg.get("first_name") or f"Воин#{uid % 10000:04d}")
            ok, msg_id, why = db.lobby_chat_send(uid, uname, text)
            if not ok:
                return {"ok": False, "reason": why}
            return {"ok": True, "msg_id": msg_id}
        except Exception as e:
            log.error("lobby_chat_send error: %s", e, exc_info=True)
            return {"ok": False, "reason": "internal"}

    @router.get("/api/world_boss/lobby_chat/messages")
    async def lobby_chat_messages(init_data: str, since: int = 0):
        try:
            tg = get_user(init_data)
            uid = int(tg["id"])
            spawn_id = _current_scheduled_spawn_id(db)
            if not spawn_id:
                return {"ok": True, "messages": []}  # нет рейда — пустой ответ
            if not _is_registered(db, spawn_id, uid):
                return {"ok": False, "reason": "not_registered", "messages": []}
            msgs = db.lobby_chat_get_since(int(since or 0), limit=DEFAULT_LIMIT)
            return {"ok": True, "messages": msgs}
        except Exception as e:
            log.error("lobby_chat_messages error: %s", e, exc_info=True)
            return {"ok": False, "reason": "internal", "messages": []}

    app.include_router(router)
