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

from config.world_boss_constants import WB_DURATION_SEC, WB_PREP_SEC
from config.world_boss.abilities import wb_is_vuln_window

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

# last_action: uid → 'atk'|'crit' (эфемерно, в памяти процесса).
# Обновляется из world_boss_hit.py при каждом ударе — без изменений схемы БД.
_last_actions: Dict[int, str] = {}
_last_dmg: Dict[int, int] = {}


def update_last_action(uid: int, action: str, dmg: int = 0) -> None:
    _last_actions[int(uid)] = action
    _last_dmg[int(uid)] = int(dmg)


def _build_boss_block(active: Dict[str, Any]) -> Dict[str, Any]:
    seconds_left = None
    vulnerable = False
    try:
        started_at = _parse_ts(active["started_at"])
        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
        seconds_left = max(0, int(WB_DURATION_SEC - elapsed))
        _mhp = int(active.get("max_hp") or 0)
        _hpp = (int(active.get("current_hp") or 0) / _mhp) if _mhp > 0 else 1.0
        vulnerable = wb_is_vuln_window(active.get("boss_type") or "", _hpp, elapsed)
    except Exception:
        pass
    from config.world_boss import get_boss_type
    from config.world_boss.abilities import wb_crown_labels
    _bt = get_boss_type(active.get("boss_type"))
    return {
        "hp": int(active.get("current_hp") or 0),
        "max_hp": int(active.get("max_hp") or 0),
        "crown_flags": int(active.get("crown_flags") or 0),
        "crown_labels": wb_crown_labels(active.get("boss_type")),
        "seconds_left": seconds_left,
        "vulnerable": vulnerable,
        "stage": int(active.get("stage") or 1),
        "boss_bg_hex": int(_bt.get("bg_tint_hex") or 0x4a3a5a),
        "boss_sprite": _bt.get("sprite", "boss_lich.webp"),
        "boss_glow": _bt.get("glow_color", "#9b30ff"),
    }


def _build_participants_block(db, spawn_id: int) -> list:
    """Список участников для live-панели: топ-15 по урону + last_action из памяти."""
    rows = db.wb_get_participants(spawn_id, limit=15)
    now = time.time()
    result = []
    for r in rows:
        uid = int(r["user_id"])
        last_hit_ago = 999
        try:
            lh = r.get("last_hit_at")
            if lh:
                last_hit_ago = int(now - _parse_ts(lh).timestamp())
        except Exception:
            pass
        result.append({
            "user_id": uid,
            "name": r.get("username") or "Игрок",
            "level": int(r.get("level") or 1),
            "warrior_type": r.get("warrior_type") or "warrior",
            "hp": int(r.get("current_hp") or 0),
            "max_hp": int(r.get("max_hp") or 100),
            "is_dead": bool(int(r.get("is_dead") or 0)),
            "damage": int(r.get("total_damage") or 0),
            "last_hit_ago": last_hit_ago,
            "hits": int(r.get("hits_count") or 0),
            "last_action": _last_actions.get(uid, "atk"),
            "last_dmg": _last_dmg.get(uid, 0),
        })
    return result


def _build_top_block(db, spawn_id: int) -> list:
    top = db.get_wb_top_damagers(spawn_id, limit=3)
    return [
        {
            "user_id": int(r["user_id"]),
            "name": r.get("username") or "Игрок",
            "level": int(r.get("level") or 1),
            "damage": int(r.get("total_damage") or 0),
            "total_damage": int(r.get("total_damage") or 0),
            "atk": int(r.get("strength") or 10),
            "crits": int(r.get("crits_count") or 0),
            "hp": int(r.get("current_hp") or 0),
            "max_hp": int(r.get("max_hp") or 100),
        }
        for r in top
    ]


def _run_battle_tick(db) -> None:
    """Боевая логика тика: ответка босса + коронные удары + завершение рейда.
    Вызывается внутри _load_tick_data (уже в потоке) — не нужен отдельный to_thread."""
    try:
        from jobs.world_boss_battle_tick import _check_crown_strikes
        from jobs.world_boss_counter import do_boss_counter_attack
        from config.world_boss.abilities import wb_counter_cooldown
        from repositories.world_boss.damage_calc import BOSS_ATTACK_COOLDOWN_SEC
        active = db.get_wb_active_spawn()
        if not active:
            return
        spawn_id = int(active["spawn_id"])
        current_hp = int(active.get("current_hp") or 0)
        max_hp = int(active.get("max_hp") or 0)
        stat_profile = active.get("stat_profile") or {}
        boss_type = active.get("boss_type") or ""

        # Завершаем рейд из WS-тика если scheduler (бот) недоступен.
        # Проверяем: HP=0 или время вышло.
        try:
            from jobs.world_boss_scheduler import _finish_expired_or_dead_spawn
            _finish_expired_or_dead_spawn(db)
            # Если рейд только что завершили — active уже не active, выходим
            if not db.get_wb_active_spawn():
                return
        except Exception as _fe:
            logger.debug("_run_battle_tick finish check: %s", _fe)

        if current_hp > 0:
            stat_profile = _check_crown_strikes(db, spawn_id, current_hp, max_hp, stat_profile, boss_type)
        hp_pct = (current_hp / max_hp) if max_hp > 0 else 1.0
        cooldown = wb_counter_cooldown(boss_type, hp_pct, BOSS_ATTACK_COOLDOWN_SEC)
        if db.wb_try_mark_boss_attacked(spawn_id, cooldown):
            do_boss_counter_attack(db, spawn_id, stat_profile, boss_type, hp_pct)
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
    try:
        top = _build_top_block(db, spawn_id)
    except Exception as _te:
        logger.warning("_build_top_block: %s", _te)
        top = []
    try:
        participants = _build_participants_block(db, spawn_id)
    except Exception as _pe:
        logger.warning("_build_participants_block: %s", _pe)
        participants = []
    # Батч: один SQL вместо N open/close при 100+ подписчиках.
    states = db.get_wb_player_states(spawn_id, subs)
    players = {}
    for uid, ps in states.items():
        players[uid] = {
            "current_hp": int(ps.get("current_hp") or 0),
            "max_hp": int(ps.get("max_hp") or 100),
            "is_dead": bool(int(ps.get("is_dead") or 0)),
            "total_damage": int(ps.get("total_damage") or 0),
        }
    # Live-счётчики для лобби (если игрок ещё не зашёл в бой).
    try:
        fighters = db.get_wb_participants_count(spawn_id)
        regs = db.wb_registration_count(spawn_id)
    except Exception:
        fighters = 0; regs = 0
    return {"kind": "active", "ts": ts_ms, "spawn_id": spawn_id, "boss": boss, "top": top,
            "participants": participants, "players": players,
            "fighters_count": fighters, "registrants_count": regs}


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
    participants = data.get("participants", [])
    fighters_count = data.get("fighters_count", 0)
    regs_count = data.get("registrants_count", 0)
    await asyncio.gather(*(wb_manager.send(uid, {
        "event": "wb_tick", "ts": ts, "active": True,
        "spawn_id": spawn_id, "boss": boss, "player": players.get(uid), "top": top,
        "participants": participants,
        "fighters_count": fighters_count, "registrants_count": regs_count,
    }) for uid in subs), return_exceptions=True)


def register_world_boss_ws_routes(app) -> None:
    router = APIRouter()
    # Импорт здесь, чтобы избежать циклов при старте (tma_auth тянет db).
    from api.tma_auth import get_user_from_init_data

    @app.websocket("/ws/world_boss/{user_id}")
    async def wb_websocket(ws: WebSocket, user_id: int, init_data: str = ""):
        # См. /ws/{user_id}: без валидации любой мог подменить user_id в URL.
        try:
            tg_user = get_user_from_init_data(init_data) if init_data else None
        except Exception:
            tg_user = None
        if not tg_user or int(tg_user.get("id", 0)) != int(user_id):
            try:
                await ws.close(code=1008)
            except Exception:
                pass
            return
        await wb_manager.connect(user_id, ws)
        logger.info("WB WS connected uid=%s (subs=%d)", user_id, len(wb_manager.connections))

        async def _ping():
            while True:
                await asyncio.sleep(20)
                try:
                    await ws.send_json({"event": "ping"})
                except Exception:
                    break

        ping_task = asyncio.create_task(_ping())
        try:
            while True:
                # Держим соединение — payload шлёт batter_tick_job.
                # Клиент может слать любой текст (ping/pong) — читаем и игнорим.
                await ws.receive_text()
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.warning("WB WS error uid=%s: %s", user_id, e)
        finally:
            ping_task.cancel()
            await wb_manager.disconnect(user_id)
            logger.info("WB WS disconnected uid=%s (subs=%d)", user_id, len(wb_manager.connections))

    app.include_router(router)
