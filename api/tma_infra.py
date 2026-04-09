"""Инфраструктура TMA API: rate limit, кэш профиля, WebSocket-менеджер."""

from __future__ import annotations

import logging
import time
from typing import Dict

from fastapi import HTTPException, WebSocket

logger = logging.getLogger(__name__)


class _RateLimiter:
    """Простой in-memory rate limiter по ключу (uid:endpoint)."""

    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = {}

    def check(self, key: str, max_hits: int, window_sec: int) -> bool:
        """True = запрос разрешён, False = превышен лимит."""
        now = time.monotonic()
        hits = self._hits.get(key)
        if hits is None:
            self._hits[key] = [now]
            return True
        cutoff = now - window_sec
        while hits and hits[0] < cutoff:
            hits.pop(0)
        if len(hits) >= max_hits:
            return False
        hits.append(now)
        return True

    def cleanup(self) -> None:
        """Удаляет пустые/неактивные ключи (вызывается периодически)."""
        now = time.monotonic()
        self._hits = {k: v for k, v in self._hits.items() if v and v[-1] > now - 300}


_rl = _RateLimiter()


def _rl_check(uid: int, endpoint: str, max_hits: int, window_sec: int) -> None:
    """Бросает HTTPException 429 если лимит превышен."""
    if not _rl.check(f"{uid}:{endpoint}", max_hits, window_sec):
        raise HTTPException(status_code=429, detail="Слишком много запросов, подожди немного")


def rate_limiter_cleanup() -> None:
    _rl.cleanup()


_PLAYER_CACHE_TTL = 3.0
_player_cache: dict[int, tuple[dict, float]] = {}


def _cache_get(uid: int) -> dict | None:
    entry = _player_cache.get(uid)
    if entry and (time.monotonic() - entry[1]) < _PLAYER_CACHE_TTL:
        return entry[0]
    return None


def _cache_set(uid: int, player: dict) -> None:
    _player_cache[uid] = (dict(player), time.monotonic())


def _cache_invalidate(uid: int) -> None:
    _player_cache.pop(uid, None)


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self.connections[user_id] = ws

    def disconnect(self, user_id: int) -> None:
        self.connections.pop(user_id, None)

    async def send(self, user_id: int, data: dict) -> None:
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(user_id)

    def is_online(self, user_id: int) -> bool:
        return int(user_id) in self.connections

    async def broadcast_battle(self, battle: dict, payload: dict) -> None:
        p1_uid = battle["player1"]["user_id"]
        p2_uid = battle["player2"].get("user_id")
        await self.send(p1_uid, payload)
        if p2_uid:
            await self.send(p2_uid, payload)


manager = ConnectionManager()
