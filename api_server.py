"""
FastAPI сервер для Duel Arena TMA (Telegram Mini App).
Шарит database.py и battle_system.py с Telegram-ботом.

Локально: uvicorn api_server:app --host 0.0.0.0 --port 8000
Прод: см. Dockerfile + scripts/start_web_and_bot.sh и DEPLOY_TMA.md
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
import urllib.parse
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Подтягиваем существующие модули игры
from config import (
    BOT_TOKEN, PLAYER_START_LEVEL, PLAYER_START_MAX_HP, PLAYER_START_CRIT,
    stamina_stats_invested, total_free_stats_at_level,
    DODGE_MAX_CHANCE, CRIT_MAX_CHANCE, ARMOR_MAX_REDUCTION,
    ARMOR_STAMINA_K, STRENGTH_DAMAGE_BASE, STRENGTH_DAMAGE_PCT_PER_POINT,
    HP_MIN_BATTLE_PCT, HP_REGEN_BASE_SECONDS, HP_REGEN_ENDURANCE_BONUS,
    MAX_LEVEL, exp_needed_for_next_level, format_exp_progress,
    VICTORY_GOLD,
)
from database import db
from battle_system import battle_system

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Duel Arena TMA API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── WebSocket менеджер ──────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.connections[user_id] = ws

    def disconnect(self, user_id: int):
        self.connections.pop(user_id, None)

    async def send(self, user_id: int, data: dict):
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(user_id)

    async def broadcast_battle(self, battle: dict, payload: dict):
        p1_uid = battle["player1"]["user_id"]
        p2_uid = battle["player2"].get("user_id")
        await self.send(p1_uid, payload)
        if p2_uid:
            await self.send(p2_uid, payload)


manager = ConnectionManager()

# ─── Авторизация через Telegram initData ────────────────────────────────────

def _verify_telegram_init_data(init_data: str) -> Optional[Dict]:
    """
    Проверяет подпись Telegram initData (HMAC-SHA256).
    Возвращает распарсенные данные или None если подпись неверна.
    """
    if not BOT_TOKEN:
        # Dev-режим без токена: принимаем всё
        try:
            parsed = dict(urllib.parse.parse_qsl(init_data, strict_parsing=False))
            user_str = parsed.get("user", "{}")
            parsed["_user"] = json.loads(urllib.parse.unquote(user_str))
            return parsed
        except Exception:
            return None

    try:
        parsed = dict(urllib.parse.parse_qsl(init_data, strict_parsing=False))
        hash_received = parsed.pop("hash", "")
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected_hash, hash_received):
            return None

        user_str = parsed.get("user", "{}")
        parsed["_user"] = json.loads(urllib.parse.unquote(user_str))
        return parsed
    except Exception as e:
        logger.warning("initData verify error: %s", e)
        return None


def get_user_from_init_data(init_data: str) -> Dict:
    data = _verify_telegram_init_data(init_data)
    if not data:
        raise HTTPException(status_code=401, detail="Invalid Telegram auth")
    return data["_user"]


# ─── Pydantic schemas ────────────────────────────────────────────────────────

class InitDataHeader(BaseModel):
    init_data: str


class BattleChoiceBody(BaseModel):
    init_data: str
    attack: str    # HEAD / TORSO / LEGS
    defense: str


class FindBattleBody(BaseModel):
    init_data: str
    queue_only: bool = False   # True = join PvP queue, don't fall back to bot
    prefer_bot: bool = False   # True = skip PvP, start bot immediately

class TrainBody(BaseModel):
    init_data: str
    stat: str   # strength | agility | intuition | stamina


# ─── Вспомогательные функции ─────────────────────────────────────────────────

def _player_api(player: dict) -> dict:
    """Сериализовать игрока для API."""
    lv  = int(player.get("level", 1))
    mhp = int(player.get("max_hp", PLAYER_START_MAX_HP))
    chp = int(player.get("current_hp", mhp))
    s   = int(player.get("strength", 3))
    agi = int(player.get("endurance", 3))
    intu = int(player.get("crit", PLAYER_START_CRIT))
    vyn  = stamina_stats_invested(mhp, lv)
    tf   = total_free_stats_at_level(lv)

    avg_agi  = max(1, 3 + tf // 4)
    avg_intu = max(1, PLAYER_START_CRIT + tf // 4)
    dodge_p = int(min(DODGE_MAX_CHANCE, agi / (agi + avg_agi) * DODGE_MAX_CHANCE) * 100)
    crit_p  = int(min(CRIT_MAX_CHANCE, intu / (intu + avg_intu) * CRIT_MAX_CHANCE) * 100)
    s_pct   = vyn / tf * 100 if tf > 0 else 0
    armor_p = int(min(ARMOR_MAX_REDUCTION, s_pct / (s_pct + ARMOR_STAMINA_K)) * 100) if s_pct > 0 else 0
    dmg     = int(STRENGTH_DAMAGE_BASE * (1 + s * STRENGTH_DAMAGE_PCT_PER_POINT))

    need_xp = exp_needed_for_next_level(lv)

    return {
        "user_id": player.get("user_id"),
        "username": player.get("username") or "Боец",
        "level": lv,
        "exp": int(player.get("exp", 0)),
        "exp_needed": need_xp,
        "strength": s,
        "agility": agi,
        "intuition": intu,
        "stamina": vyn,
        "max_hp": mhp,
        "current_hp": chp,
        "gold": int(player.get("gold", 0)),
        "diamonds": int(player.get("diamonds", 0)),
        "wins": int(player.get("wins", 0)),
        "losses": int(player.get("losses", 0)),
        "rating": int(player.get("rating", 1000)),
        "free_stats": int(player.get("free_stats", 0)),
        "win_streak": int(player.get("win_streak", 0)),
        "dmg": dmg,
        "dodge_pct": dodge_p,
        "crit_pct": crit_p,
        "armor_pct": armor_p,
        "hp_pct": int(chp / max(1, mhp) * 100),
        "xp_pct": int(int(player.get("exp", 0)) / max(1, need_xp) * 100) if need_xp > 0 else 100,
        "max_level": lv >= MAX_LEVEL,
    }


def _battle_state_api(user_id: int) -> Optional[dict]:
    """Состояние текущего боя для API (перспектива user_id)."""
    ctx = battle_system.get_battle_ui_context(user_id)
    if not ctx:
        return None

    bid  = battle_system.battle_queue.get(user_id)
    b    = battle_system.active_battles.get(bid) if bid else None
    is_p1 = b and b["player1"]["user_id"] == user_id if b else True
    is_pvp = b and not b.get("is_bot2") if b else False

    # Секунд до конца хода (из deadline в battle)
    deadline_sec = None
    if b and b.get("next_turn_deadline"):
        from datetime import datetime
        left = (b["next_turn_deadline"] - datetime.now()).total_seconds()
        deadline_sec = max(0, int(left))

    return {
        "battle_id": bid,
        "active": True,
        "is_pvp": is_pvp,
        "is_p1": is_p1,
        "round": ctx.get("round_num", 0),
        "my_hp": ctx.get("your_hp"),
        "my_max_hp": ctx.get("your_max"),
        "opp_hp": ctx.get("opp_hp"),
        "opp_max_hp": ctx.get("opp_max"),
        "opp_name": ctx.get("opponent_name"),
        "opp_level": ctx.get("opponent_level"),
        "opp_strength": ctx.get("opp_strength"),
        "opp_agility": ctx.get("opp_endurance"),
        "opp_intuition": ctx.get("opp_crit"),
        "pending_attack": ctx.get("pending_attack"),
        "pending_defense": ctx.get("pending_defense"),
        "waiting_opponent": ctx.get("waiting_opponent", False),
        "combat_log": (b.get("combat_log_lines", []) if b else [])[-3:],
        "deadline_sec": deadline_sec,
    }


# ─── Маршруты API ────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"ok": True, "ts": int(time.time())}


@app.post("/api/player")
async def get_player(body: InitDataHeader):
    tg_user = get_user_from_init_data(body.init_data)
    uid      = int(tg_user["id"])
    username = tg_user.get("username") or tg_user.get("first_name") or ""

    player = db.get_or_create_player(uid, username)
    # Реген HP
    inv = stamina_stats_invested(player.get("max_hp", PLAYER_START_MAX_HP), player.get("level", 1))
    regen = db.apply_hp_regen(uid, inv)
    if regen:
        player = dict(player)
        player["current_hp"] = regen["current_hp"]

    return {"ok": True, "player": _player_api(player)}


@app.post("/api/battle/find")
async def find_battle(body: FindBattleBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid      = int(tg_user["id"])
    username = tg_user.get("username") or ""

    player = db.get_or_create_player(uid, username)

    # Уже в бою?
    if battle_system.get_battle_status(uid):
        state = _battle_state_api(uid)
        return {"ok": True, "status": "already_in_battle", "battle": state}

    # HP check
    mhp = int(player.get("max_hp", PLAYER_START_MAX_HP))
    chp = int(player.get("current_hp", mhp))
    if chp < int(mhp * HP_MIN_BATTLE_PCT):
        inv = stamina_stats_invested(mhp, player.get("level", 1))
        mult = 1.0 + inv * HP_REGEN_ENDURANCE_BONUS
        hp_needed = int(mhp * HP_MIN_BATTLE_PCT) - chp
        secs = int(hp_needed / max(0.001, mhp / HP_REGEN_BASE_SECONDS * mult))
        return {"ok": False, "reason": "low_hp", "regen_seconds": secs, "current_hp": chp, "min_hp": int(mhp * HP_MIN_BATTLE_PCT)}

    # PvP поиск (если не prefer_bot)
    if not body.prefer_bot:
        pvp_entry = db.pvp_find_opponent(uid, int(player.get("level", PLAYER_START_LEVEL)))
        if pvp_entry:
            opp_uid = pvp_entry["user_id"]
            db.pvp_dequeue(opp_uid)
            opp_player = db.get_or_create_player(opp_uid, "")
            battle_id = await battle_system.start_battle(player, opp_player, is_bot2=False)
            b = battle_system.active_battles.get(battle_id)
            if b:
                b["_tma_p1"] = True  # маркер — запущен из TMA

            # Уведомить P2 по WebSocket
            await manager.send(opp_uid, {
                "event": "battle_started",
                "battle": _battle_state_api(opp_uid),
            })

            return {
                "ok": True,
                "status": "pvp_started",
                "battle": _battle_state_api(uid),
            }

        # Режим очереди: встаём ждать, не падаем на бота
        if body.queue_only:
            db.pvp_enqueue(uid, int(player.get("level", PLAYER_START_LEVEL)), chat_id=0, message_id=None)
            return {"ok": True, "status": "queued"}

    # Бот
    opponent = db.find_suitable_opponent(player["level"])
    if not opponent:
        return {"ok": False, "reason": "no_opponent"}

    completed = player.get("wins", 0) + player.get("losses", 0)
    if completed < 3:
        opponent = battle_system.apply_onboarding_bot(opponent)

    battle_id = await battle_system.start_battle(player, opponent, is_bot2=True)
    return {
        "ok": True,
        "status": "bot_started",
        "battle": _battle_state_api(uid),
    }


@app.post("/api/battle/choice")
async def battle_choice(body: BattleChoiceBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])

    ZONE_MAP = {
        "HEAD": "ГОЛОВА",
        "TORSO": "ТУЛОВИЩЕ",
        "LEGS": "НОГИ",
    }
    atk = ZONE_MAP.get(body.attack.upper(), "ТУЛОВИЩЕ")
    dfn = ZONE_MAP.get(body.defense.upper(), "ТУЛОВИЩЕ")

    result = await battle_system.make_choice(uid, atk, dfn)

    # Найти battle и оппонента
    bid = battle_system.battle_queue.get(uid)
    b   = battle_system.active_battles.get(bid) if bid else None
    is_pvp = b and not b.get("is_bot2") if b else False

    if result.get("status") == "round_completed":
        state_p1 = _battle_state_api(uid)
        await manager.send(uid, {"event": "round_result", "battle": state_p1, "result": result})
        if is_pvp and b:
            opp_uid = (b["player2"] if b["player1"]["user_id"] == uid else b["player1"]).get("user_id")
            if opp_uid:
                state_p2 = _battle_state_api(opp_uid)
                await manager.send(opp_uid, {"event": "round_result", "battle": state_p2, "result": result})
        return {"ok": True, "status": "round_completed", "battle": state_p1}

    if result.get("status") in ("battle_ended", "battle_ended_afk"):
        winner_id = result.get("winner_id")
        human_won = winner_id == uid
        await manager.send(uid, {
            "event": "battle_ended",
            "human_won": human_won,
            "result": {
                "gold": result.get("gold_reward", 0) if human_won else 0,
                "exp": result.get("exp_reward", 0) if human_won else result.get("exp_reward", 0),
                "level_up": result.get("level_up", False) if human_won else False,
                "rounds": result.get("rounds", 0),
            }
        })
        if is_pvp and b:
            opp_uid = (b["player2"] if b["player1"]["user_id"] == uid else b["player1"]).get("user_id")
            if opp_uid:
                opp_won = winner_id == opp_uid
                await manager.send(opp_uid, {
                    "event": "battle_ended",
                    "human_won": opp_won,
                    "result": {
                        "gold": result.get("gold_reward", 0) if opp_won else 0,
                        "exp": result.get("exp_reward", 0),
                        "level_up": result.get("level_up", False) if opp_won else False,
                        "rounds": result.get("rounds", 0),
                    }
                })
        return {"ok": True, "status": "battle_ended", "human_won": human_won}

    if result.get("status") == "choice_made":
        return {"ok": True, "status": "waiting_opponent"}

    return {"ok": True, "status": result.get("status"), "result": result}


@app.post("/api/battle/queue")
async def join_queue(body: InitDataHeader):
    """Встать в PvP очередь."""
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    player  = db.get_or_create_player(uid, "")
    db.pvp_enqueue(uid, int(player.get("level", 1)), chat_id=0, message_id=None)
    return {"ok": True, "status": "queued"}


@app.post("/api/battle/cancel_queue")
async def cancel_queue(body: InitDataHeader):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    db.pvp_dequeue(uid)
    return {"ok": True}


@app.get("/api/battle/state")
async def battle_state(init_data: str):
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])
    state   = _battle_state_api(uid)
    return {"ok": True, "in_battle": state is not None, "battle": state}


@app.get("/api/rating")
async def get_rating(init_data: str, limit: int = 20):
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])
    rows    = db.get_top_players(limit=limit)
    players = [_player_api(dict(r)) for r in rows]
    my_rank = next((i + 1 for i, p in enumerate(players) if p["user_id"] == uid), None)
    return {"ok": True, "players": players, "my_rank": my_rank}


# ─── WebSocket ───────────────────────────────────────────────────────────────

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(ws: WebSocket, user_id: int):
    await manager.connect(user_id, ws)
    logger.info("WS connected user_id=%s", user_id)
    try:
        # Слать ping каждые 20 сек чтобы не дропало
        async def _ping():
            while True:
                await asyncio.sleep(20)
                try:
                    await ws.send_json({"event": "ping"})
                except Exception:
                    break
        ping_task = asyncio.create_task(_ping())
        while True:
            data = await ws.receive_text()
            msg  = json.loads(data)
            if msg.get("type") == "pong":
                pass  # heartbeat OK
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("WS error user_id=%s: %s", user_id, e)
    finally:
        ping_task.cancel()
        manager.disconnect(user_id)
        logger.info("WS disconnected user_id=%s", user_id)


# ─── Прокачка статов ─────────────────────────────────────────────────────────

STAT_MAP = {
    "strength":  "strength",
    "agility":   "endurance",
    "intuition": "crit",
    "stamina":   "stamina",   # особый случай — HP
}

@app.post("/api/player/train")
async def train_stat(body: TrainBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    stat    = body.stat.lower()

    if stat not in STAT_MAP:
        raise HTTPException(status_code=400, detail=f"Unknown stat: {stat}")

    player = db.get_or_create_player(uid, "")
    free   = int(player.get("free_stats", 0))

    if free <= 0:
        return {"ok": False, "reason": "no_free_stats"}

    stats_update: dict = {"free_stats": free - 1}
    result_msg = ""

    if stat == "strength":
        stats_update["strength"] = int(player["strength"]) + 1
        result_msg = f"+1 💪 Сила → {stats_update['strength']}"
    elif stat == "agility":
        stats_update["endurance"] = int(player["endurance"]) + 1
        result_msg = f"+1 🤸 Ловкость → {stats_update['endurance']}"
    elif stat == "intuition":
        stats_update["crit"] = int(player.get("crit", PLAYER_START_CRIT)) + 1
        result_msg = f"+1 💥 Интуиция → {stats_update['crit']}"
    elif stat == "stamina":
        from config import STAMINA_PER_FREE_STAT
        inc = int(STAMINA_PER_FREE_STAT)
        stats_update["max_hp"]     = int(player["max_hp"]) + inc
        stats_update["current_hp"] = int(player["current_hp"]) + inc
        result_msg = f"+{inc} ❤️ к пулу HP → {stats_update['max_hp']}"

    db.update_player_stats(uid, stats_update)

    fresh = db.get_or_create_player(uid, "")
    inv   = stamina_stats_invested(fresh.get("max_hp", PLAYER_START_MAX_HP), fresh.get("level", 1))
    regen = db.apply_hp_regen(uid, inv)
    if regen:
        fresh = dict(fresh)
        fresh["current_hp"] = regen["current_hp"]

    return {"ok": True, "message": result_msg, "player": _player_api(fresh)}

# ─── Статика (webapp/) ───────────────────────────────────────────────────────

webapp_dir = os.path.join(os.path.dirname(__file__), "webapp")
if os.path.isdir(webapp_dir):
    app.mount("/", StaticFiles(directory=webapp_dir, html=True), name="webapp")
