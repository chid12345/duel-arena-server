"""WebSocket-канал рейда Мирового босса: /ws/world_boss/{user_id}.

Подписка живёт только пока открыта вкладка «⚔️ Босс» в Mini App.
Каждую секунду `world_boss_battle_tick_job` вызывает `wb_broadcast_tick`,
который строит общий payload + персонализирует HP игрока для каждого uid.

Payload:
  {
    event: "wb_tick",
    ts: <unix_ms>,
    active: true|false,
    boss: {hp, max_hp, crown_flags, seconds_left, vulnerable},
    player: {current_hp, max_hp, is_dead},         # персональное
    top: [{user_id, total_damage}, ...],           # топ-3
  }

Когда рейда нет — шлём {event:"wb_idle"} раз в сек, клиент сам закроется.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config.world_boss_constants import WB_DURATION_SEC, WB_PREP_SEC, is_vulnerability_window

logger = logging.getLogger(__name__)


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).replace("T", " ").split(".")[0]
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


class WBConnectionManager:
    """Держит сокеты подписчиков вкладки «Босс» (отдельно от общего /ws/{uid})."""

    def __init__(self) -> None:
        self.connections: Dict[int, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            old = self.connections.get(int(user_id))
            if old is not None:
                # Закрываем старый сокет — игрок переоткрыл вкладку
                try:
                    await old.close()
                except Exception:
                    pass
            self.connections[int(user_id)] = ws

    async def disconnect(self, user_id: int) -> None:
        async with self._lock:
            self.connections.pop(int(user_id), None)

    async def send(self, user_id: int, data: dict) -> None:
        async with self._lock:
            ws = self.connections.get(int(user_id))
        if not ws:
            return
        try:
            await ws.send_json(data)
        except Exception:
            await self.disconnect(user_id)

    def subscribers(self) -> list[int]:
        # Снапшот под lock не нужен — list() на dict атомарен в CPython
        return list(self.connections.keys())


wb_manager = WBConnectionManager()


def _build_boss_block(active: Dict[str, Any]) -> Dict[str, Any]:
    seconds_left = None
    vulnerable = False
    try:
        started_at = _parse_ts(active["started_at"])
        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
        seconds_left = max(0, int(WB_DURATION_SEC - elapsed))
        vulnerable = is_vulnerability_window(elapsed)
    except Exception:
        pass
    return {
        "hp": int(active.get("current_hp") or 0),
        "max_hp": int(active.get("max_hp") or 0),
        "crown_flags": int(active.get("crown_flags") or 0),
        "seconds_left": seconds_left,
        "vulnerable": vulnerable,
        "stage": int(active.get("stage") or 1),
    }


def _build_top_block(db, spawn_id: int) -> list:
    top = db.get_wb_top_damagers(spawn_id, limit=3)
    return [
        {"user_id": int(r["user_id"]), "total_damage": int(r.get("total_damage") or 0)}
        for r in top
    ]


def _run_battle_tick(db) -> None:
    """Боевая логика тика: ответка босса + коронные удары.
    Вызывается внутри _load_tick_data (уже в потоке) — не нужен отдельный to_thread."""
    try:
        from jobs.world_boss_battle_tick import _check_crown_strikes, _do_boss_counter_attack
        from repositories.world_boss.damage_calc import BOSS_ATTACK_COOLDOWN_SEC
        active = db.get_wb_active_spawn()
        if not active:
            return
        spawn_id = int(active["spawn_id"])
        current_hp = int(active.get("current_hp") or 0)
        max_hp = int(active.get("max_hp") or 0)
        stat_profile = active.get("stat_profile") or {}
        if current_hp > 0:
            stat_profile = _check_crown_strikes(db, spawn_id, current_hp, max_hp, stat_profile)
        if db.wb_try_mark_boss_attacked(spawn_id, BOSS_ATTACK_COOLDOWN_SEC):
            _do_boss_counter_attack(db, spawn_id, stat_profile)
    except Exception as e:
        logger.warning("_run_battle_tick: %s", e)


def _load_tick_data(db, subs: list) -> dict:
    """Sync: боевой тик + загрузка данных для WS.
    Запускается через asyncio.to_thread — ОДИН поток на тик, event loop не блокируется."""
    _run_battle_tick(db)
    active = db.get_wb_active_spawn()
    ts_ms = int(time.time() * 1000)
    if not active:
        next_sched = db.get_wb_next_scheduled()
        reg_count = 0
        prep_left = None
        if next_sched:
            try:
                reg_count = db.wb_registration_count(int(next_sched["spawn_id"]))
                until_start = (_parse_ts(next_sched["scheduled_at"]) - datetime.now(timezone.utc)).total_seconds()
                if 0 < until_start <= WB_PREP_SEC:
                    prep_left = int(until_start)
            except Exception:
                pass
        return {"kind": "idle", "ts": ts_ms, "reg_count": reg_count, "prep_left": prep_left}
    spawn_id = int(active["spawn_id"])
    boss = _build_boss_block(active)
    top = _build_top_block(db, spawn_id)
    players = {}
    for uid in subs:
        ps = db.get_wb_player_state(spawn_id, uid)
        if ps:
            players[uid] = {
                "current_hp": int(ps.get("current_hp") or 0),
                "max_hp": int(ps.get("max_hp") or 100),
                "is_dead": bool(int(ps.get("is_dead") or 0)),
                "total_damage": int(ps.get("total_damage") or 0),
            }
    return {"kind": "active", "ts": ts_ms, "spawn_id": spawn_id, "boss": boss, "top": top, "players": players}


async def wb_broadcast_tick(db) -> None:
    """Боевой тик + бродкаст подписчикам.
    ОДИН asyncio.to_thread на тик: бой и загрузка данных совмещены."""
    subs = wb_manager.subscribers()
    data = await asyncio.to_thread(_load_tick_data, db, subs)
    if not subs:
        return  # бой уже сработал в потоке — бродкаст не нужен
    if data["kind"] == "idle":
        if data["prep_left"] is not None:
            payload = {"event": "wb_preparing", "ts": data["ts"], "active": False,
                       "prep_seconds_left": data["prep_left"], "registrants_count": data["reg_count"]}
        else:
            payload = {"event": "wb_idle", "ts": data["ts"], "active": False, "registrants_count": data["reg_count"]}
        await asyncio.gather(*(wb_manager.send(uid, payload) for uid in subs), return_exceptions=True)
        return
    ts, spawn_id, boss, top, players = data["ts"], data["spawn_id"], data["boss"], data["top"], data["players"]
    await asyncio.gather(*(wb_manager.send(uid, {
        "event": "wb_tick", "ts": ts, "active": True,
        "spawn_id": spawn_id, "boss": boss, "player": players.get(uid), "top": top,
    }) for uid in subs), return_exceptions=True)


def register_world_boss_ws_routes(app) -> None:
    router = APIRouter()

    @app.websocket("/ws/world_boss/{user_id}")
    async def wb_websocket(ws: WebSocket, user_id: int):
        await wb_manager.connect(user_id, ws)
        logger.info("WB WS connected uid=%s (subs=%d)", user_id, len(wb_manager.connections))
        try:
            while True:
                # Держим соединение — payload шлёт batter_tick_job.
                # Клиент может слать любой текст (ping) — читаем и игнорим.
                await ws.receive_text()
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.warning("WB WS error uid=%s: %s", user_id, e)
        finally:
            await wb_manager.disconnect(user_id)
            logger.info("WB WS disconnected uid=%s (subs=%d)", user_id, len(wb_manager.connections))

    app.include_router(router)
