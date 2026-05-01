"""Инфраструктура TMA API: rate limit, кэш профиля, WebSocket-менеджер, user-lock."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict

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


# ── Per-user asyncio lock (защита от параллельных покупок одного юзера) ──
class _UserLock:
    """Один asyncio.Lock на каждого uid — гарантирует строго последовательную обработку."""

    def __init__(self) -> None:
        self._locks: dict[int, asyncio.Lock] = {}

    def get(self, uid: int) -> asyncio.Lock:
        lock = self._locks.get(uid)
        if lock is None:
            lock = asyncio.Lock()
            self._locks[uid] = lock
        return lock

    def cleanup(self) -> None:
        self._locks = {k: v for k, v in self._locks.items() if v.locked()}


_user_locks = _UserLock()


def get_user_lock(uid: int) -> asyncio.Lock:
    """Вернуть asyncio.Lock для данного uid (для использования через `async with`)."""
    return _user_locks.get(uid)


def user_lock_cleanup() -> None:
    _user_locks.cleanup()


_PLAYER_CACHE_TTL = 20.0   # было 3 с → 20 с (безопасно: инвалидируем при мутациях)
_BUFFS_CACHE_TTL = 30.0    # бафы меняются редко — кешируем 30 с

_player_cache: dict[int, tuple[dict, float]] = {}
_buffs_cache: dict[int, tuple[dict, float]] = {}


def _cache_get(uid: int) -> dict | None:
    entry = _player_cache.get(uid)
    if entry and (time.monotonic() - entry[1]) < _PLAYER_CACHE_TTL:
        return entry[0]
    return None


def _cache_set(uid: int, player: dict) -> None:
    _player_cache[uid] = (dict(player), time.monotonic())


def _cache_invalidate(uid: int) -> None:
    _player_cache.pop(uid, None)
    _buffs_cache.pop(uid, None)  # сбрасываем и бафы при любой инвалидации


def _buffs_cache_get(uid: int) -> dict | None:
    entry = _buffs_cache.get(uid)
    if entry and (time.monotonic() - entry[1]) < _BUFFS_CACHE_TTL:
        return entry[0]
    return None


def _buffs_cache_set(uid: int, buffs: dict) -> None:
    _buffs_cache[uid] = (dict(buffs), time.monotonic())


# ── Глобальный кеш медленно-меняющихся данных (сезон, лидерборд) ──────────
_GLOBAL_CACHE_TTL = 60.0  # 60 секунд — данные одинаковы для всех пользователей
_global_cache: dict[str, tuple[Any, float]] = {}


def _global_cache_get(key: str) -> Any | None:
    entry = _global_cache.get(key)
    if entry and (time.monotonic() - entry[1]) < _GLOBAL_CACHE_TTL:
        return entry[0]
    return None


def _global_cache_set(key: str, value: Any) -> None:
    _global_cache[key] = (value, time.monotonic())


def _global_cache_invalidate(key: str) -> None:
    _global_cache.pop(key, None)


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        # ВАЖНО: ws.accept() теперь делается в handler'е (system_realtime_routes)
        # ДО auth-проверки — иначе закрытие WS даёт HTTP 403 на handshake,
        # и Chrome показывает "closed before connection established".
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
