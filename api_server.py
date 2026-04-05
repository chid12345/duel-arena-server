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
    DODGE_MAX_CHANCE, CRIT_MAX_CHANCE,
    ARMOR_STAMINA_K_ABS, ARMOR_CAP_BASE, ARMOR_CAP_PER_LEVEL, ARMOR_ABSOLUTE_MAX,
    STRENGTH_DAMAGE_FLAT_PER_LEVEL, STRENGTH_DAMAGE_SCALE, STRENGTH_DAMAGE_POWER,
    AGI_BONUS_STEP, AGI_BONUS_PCT_PER_STEP,
    INT_BONUS_STEP, INT_BONUS_PCT_PER_STEP,
    PLAYER_START_ENDURANCE, PLAYER_START_CRIT,
    HP_MIN_BATTLE_PCT, HP_REGEN_BASE_SECONDS, HP_REGEN_ENDURANCE_BONUS,
    MAX_LEVEL, exp_needed_for_next_level, format_exp_progress,
    VICTORY_GOLD, CRYPTOPAY_TOKEN, CRYPTOPAY_TESTNET, PREMIUM_SUBSCRIPTION_STARS,
    PREMIUM_XP_BONUS_PERCENT, FULL_RESET_CRYPTO_USDT,
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


async def _send_tg_message(chat_id: int, text: str, parse_mode: str = "HTML") -> None:
    """Отправить сообщение пользователю через Bot API (fire-and-forget)."""
    if not BOT_TOKEN:
        return
    import httpx
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            )
    except Exception as e:
        logger.warning("_send_tg_message failed: %s", e)


async def _notify_paid_full_reset(uid: int) -> None:
    """Полный сброс аккаунта после оплаты USDT (CryptoPay). Идемпотентность — на уровне инвойса."""
    try:
        battle_system.force_abandon_battle(uid)
    except Exception as e:
        logger.warning("force_abandon before full reset uid=%s: %s", uid, e)
    db.wipe_player_profile(uid)
    db.get_or_create_player(uid, "")
    db.log_metric_event("paid_full_reset", uid, value=1)
    try:
        await manager.send(uid, {"event": "profile_reset", "source": "cryptopay_usdt"})
    except Exception as e:
        logger.warning("ws profile_reset uid=%s: %s", uid, e)
    await _send_tg_message(
        uid,
        "🔄 <b>Профиль полностью сброшен</b>\n"
        "Оплата USDT получена. Вы снова новый игрок — откройте /start или Mini App.\n\n"
        "⚔️ Duel Arena",
    )


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

    avg_agi  = max(1, PLAYER_START_ENDURANCE + tf // 4)
    avg_intu = max(1, PLAYER_START_CRIT + tf // 4)
    agi_inv  = max(0, agi - PLAYER_START_ENDURANCE)
    int_inv  = max(0, intu - PLAYER_START_CRIT)
    dodge_p = int(min(DODGE_MAX_CHANCE,
        agi / (agi + avg_agi) * DODGE_MAX_CHANCE
        + (agi_inv // AGI_BONUS_STEP) * AGI_BONUS_PCT_PER_STEP
    ) * 100)
    crit_p  = int(min(CRIT_MAX_CHANCE,
        intu / (intu + avg_intu) * CRIT_MAX_CHANCE
        + (int_inv // INT_BONUS_STEP) * INT_BONUS_PCT_PER_STEP
    ) * 100)
    armor_base = vyn / (vyn + ARMOR_STAMINA_K_ABS) if vyn > 0 else 0.0
    armor_cap  = min(ARMOR_ABSOLUTE_MAX, ARMOR_CAP_BASE + ARMOR_CAP_PER_LEVEL * lv)
    armor_p    = int(min(armor_cap, armor_base) * 100)
    dmg     = max(5, int(STRENGTH_DAMAGE_FLAT_PER_LEVEL * lv + STRENGTH_DAMAGE_SCALE * (s ** STRENGTH_DAMAGE_POWER)))

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
        # Реген HP — для таймера в TMA
        "regen_per_min": round(
            mhp / HP_REGEN_BASE_SECONDS
            * (1.0 + max(0, vyn) * HP_REGEN_ENDURANCE_BONUS)
            * 60, 1
        ),
        "regen_secs_to_full": (
            0 if chp >= mhp else
            int((mhp - chp) / max(0.001,
                mhp / HP_REGEN_BASE_SECONDS
                * (1.0 + max(0, vyn) * HP_REGEN_ENDURANCE_BONUS)
            ))
        ),
        # Premium подписка
        **_premium_fields(player),
    }


def _premium_fields(player: dict) -> dict:
    """Вычислить поля Premium из данных игрока."""
    from datetime import datetime
    until_str = player.get("premium_until")
    if not until_str:
        return {"is_premium": False, "premium_until": None, "premium_days_left": 0}
    try:
        until = datetime.fromisoformat(until_str)
        if until <= datetime.utcnow():
            return {"is_premium": False, "premium_until": until_str, "premium_days_left": 0}
        days_left = max(0, (until - datetime.utcnow()).days)
        return {"is_premium": True, "premium_until": until_str, "premium_days_left": days_left}
    except Exception:
        return {"is_premium": False, "premium_until": None, "premium_days_left": 0}


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

    # Данные соперника для карточки
    opp_entity = None
    opp_is_bot = True
    if b:
        if is_p1:
            opp_entity = b.get("player2")
            opp_is_bot = b.get("is_bot2", True)
        else:
            opp_entity = b.get("player1")
            opp_is_bot = False
    opp_is_premium = False
    if opp_entity and not opp_is_bot:
        opp_is_premium = bool(_premium_fields(opp_entity).get("is_premium"))

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
        "opp_stamina": ctx.get("opp_stamina_invested", 0),
        "opp_rating": ctx.get("opp_rating", 1000),
        "opp_is_bot": opp_is_bot,
        "opp_is_premium": opp_is_premium,
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
        is_afk    = result.get("status") == "battle_ended_afk"
        await manager.send(uid, {
            "event":     "battle_ended",
            "human_won": human_won,
            "afk_loss":  is_afk and not human_won,
            "result": {
                "gold":     result.get("gold_reward", 0) if human_won else 0,
                "exp":      result.get("exp_reward",  0),
                "level_up": result.get("level_up", False) if human_won else False,
                "rounds":   result.get("rounds", 0),
            }
        })
        # Проверяем: возможно квест только что выполнился
        if human_won:
            try:
                qs = db.get_daily_quest_status(uid)
                if qs.get("is_completed") and not qs.get("reward_claimed"):
                    await manager.send(uid, {"event": "quest_complete"})
            except Exception:
                pass
        if is_pvp and b:
            opp_uid = (b["player2"] if b["player1"]["user_id"] == uid else b["player1"]).get("user_id")
            if opp_uid:
                opp_won = winner_id == opp_uid
                await manager.send(opp_uid, {
                    "event":     "battle_ended",
                    "human_won": opp_won,
                    "afk_loss":  is_afk and not opp_won,
                    "result": {
                        "gold":     result.get("gold_reward", 0) if opp_won else 0,
                        "exp":      result.get("exp_reward",  0),
                        "level_up": result.get("level_up", False) if opp_won else False,
                        "rounds":   result.get("rounds", 0),
                    }
                })
        return {
            "ok":        True,
            "status":    "battle_ended",
            "human_won": human_won,
            "afk_loss":  is_afk and not human_won,
            "result": {
                "gold":     result.get("gold_reward", 0) if human_won else 0,
                "exp":      result.get("exp_reward",  0),
                "level_up": result.get("level_up", False) if human_won else False,
                "rounds":   result.get("rounds", 0),
                "streak_bonus": result.get("streak_bonus_gold", 0) if human_won else 0,
                "win_streak":   result.get("win_streak", 0) if human_won else 0,
            },
        }

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
    if state:
        return {"ok": True, "active": True,  **state}
    return     {"ok": True, "active": False}


@app.get("/api/battle/last_result")
async def battle_last_result(init_data: str):
    """Последний результат завершённого боя (для polling-fallback)."""
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])
    player  = db.get_or_create_player(uid, "")
    # Возвращаем мини-результат на основе stats игрока
    return {
        "ok":        True,
        "human_won": False,          # неизвестно — пусть ResultScene сама разберётся
        "result":    {},
        "afk_loss":  True,           # подсказка что это AFK-поражение
        "player":    _player_api(dict(player)),
    }


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

# ─── Рефералка ───────────────────────────────────────────────────────────────

@app.get("/api/referral")
async def get_referral_info(init_data: str):
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])
    code    = db.get_referral_code(uid)
    stats   = db.get_referral_stats(uid)
    recent  = db.get_recent_referrals(uid, limit=5)
    return {
        "ok": True,
        "referral_code": code,
        "link": f"https://t.me/ZenDuelArena_bot?start={code}",
        "invited_count":         stats["invited_count"],
        "paying_subscribers":    stats["paying_subscribers"],
        "total_reward_diamonds": stats["total_reward_diamonds"],
        "total_reward_gold":     stats["total_reward_gold"],
        "total_reward_usdt":     stats["total_reward_usdt"],
        "usdt_balance":          stats["usdt_balance"],
        "can_withdraw":          stats["can_withdraw"],
        "cooldown_hours":        stats["cooldown_hours"],
        "withdraw_min":          5.0,
        "recent": recent,
    }


# ─── Сезон ──────────────────────────────────────────────────────────────────

@app.get("/api/season")
async def get_season_info(init_data: str):
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])
    season  = db.get_active_season()
    if not season:
        return {"ok": True, "season": None, "leaderboard": [], "my_stats": None}
    lb      = db.get_season_leaderboard(season["id"], limit=20)
    my_pos  = next((i + 1 for i, r in enumerate(lb) if r["user_id"] == uid), None)
    my_stat = next((r for r in lb if r["user_id"] == uid), None)
    return {"ok": True, "season": dict(season), "leaderboard": lb,
            "my_stats": my_stat, "my_pos": my_pos}


# ─── Battle Pass ──────────────────────────────────────────────────────────────

@app.get("/api/battlepass")
async def get_battlepass(init_data: str):
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])
    bp      = db.get_battle_pass(uid)
    tiers   = [
        {"tier": i + 1, "battles_needed": t[0], "wins_needed": t[1],
         "diamonds": t[2], "gold": t[3]}
        for i, t in enumerate(db.BATTLE_PASS_TIERS)
    ]
    return {"ok": True, "bp": dict(bp), "tiers": tiers}


class BattlePassClaimBody(BaseModel):
    init_data: str
    tier: int


@app.post("/api/battlepass/claim")
async def claim_battlepass(body: BattlePassClaimBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    result  = db.claim_battle_pass_tier(uid, body.tier)
    return result


# ─── Клан ────────────────────────────────────────────────────────────────────

@app.get("/api/clan")
async def get_clan(init_data: str):
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])
    player  = db.get_or_create_player(uid, "")
    clan_id = player.get("clan_id")
    if not clan_id:
        return {"ok": True, "clan": None, "is_leader": False}
    info = db.get_clan_info(int(clan_id))
    if not info:
        return {"ok": True, "clan": None, "is_leader": False}
    is_leader = info["clan"].get("leader_id") == uid
    username  = tg_user.get("username") or tg_user.get("first_name") or f"User{uid}"
    return {"ok": True, "clan": info["clan"], "members": info["members"],
            "is_leader": is_leader, "my_user_id": uid, "my_username": username}


@app.get("/api/clan/top")
async def clan_top():
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT c.id, c.name, c.tag, c.level, c.wins,
                  (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count
           FROM clans c ORDER BY c.wins DESC, member_count DESC LIMIT 20"""
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"ok": True, "clans": rows}


@app.get("/api/clan/search")
async def clan_search(q: str = "", init_data: str = ""):
    results = db.search_clans(q.strip(), limit=10)
    return {"ok": True, "clans": results}


class ClanCreateBody(BaseModel):
    init_data: str
    name: str
    tag: str


@app.post("/api/clan/create")
async def clan_create(body: ClanCreateBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    result  = db.create_clan(uid, body.name.strip(), body.tag.strip())
    if result.get("ok"):
        player = db.get_or_create_player(uid, "")
        result["player"] = dict(player)
    return result


class ClanJoinBody(BaseModel):
    init_data: str
    clan_id: int


@app.post("/api/clan/join")
async def clan_join(body: ClanJoinBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    result  = db.join_clan(uid, body.clan_id)
    if result.get("ok"):
        player = db.get_or_create_player(uid, "")
        result["player"] = dict(player)
    return result


class ClanLeaveBody(BaseModel):
    init_data: str


@app.post("/api/clan/leave")
async def clan_leave(body: ClanLeaveBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    result  = db.leave_clan(uid)
    if result.get("ok"):
        player = db.get_or_create_player(uid, "")
        result["player"] = dict(player)
    return result


# ─── Клановый чат ────────────────────────────────────────────────────────────

@app.get("/api/clan/chat")
async def get_clan_chat(init_data: str):
    tg_user  = get_user_from_init_data(init_data)
    uid      = int(tg_user["id"])
    player   = db.get_or_create_player(uid, "")
    clan_id  = player.get("clan_id")
    if not clan_id:
        return {"ok": False, "reason": "not_in_clan"}
    messages = db.get_clan_messages(int(clan_id), limit=40)
    return {"ok": True, "messages": messages}


class ClanChatSendBody(BaseModel):
    init_data: str
    message: str


@app.post("/api/clan/chat/send")
async def send_clan_chat(body: ClanChatSendBody):
    tg_user  = get_user_from_init_data(body.init_data)
    uid      = int(tg_user["id"])
    username = (tg_user.get("username") or tg_user.get("first_name") or f"User{uid}")
    player   = db.get_or_create_player(uid, username)
    clan_id  = player.get("clan_id")
    if not clan_id:
        return {"ok": False, "reason": "not_in_clan"}
    ok = db.send_clan_message(int(clan_id), uid, username, body.message)
    return {"ok": ok, "reason": "empty" if not ok else None}


# ─── Ежедневные квесты ───────────────────────────────────────────────────────

@app.get("/api/quests")
async def get_quests(init_data: str):
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])
    quest   = db.get_daily_quest_status(uid)
    daily   = db.check_daily_bonus(uid)
    return {
        "ok":    True,
        "quest": quest,   # battles_played, battles_won, is_completed, reward_claimed
        "daily": daily,   # can_claim, streak, bonus
    }


class ClaimQuestBody(BaseModel):
    init_data: str


@app.post("/api/quests/claim")
async def claim_quest(body: ClaimQuestBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    result  = db.claim_daily_quest_reward(uid)
    if result.get("ok"):
        player = db.get_or_create_player(uid, "")
        result["player"] = dict(player)
    return result


@app.post("/api/daily/claim")
async def claim_daily(body: ClaimQuestBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    result  = db.check_daily_bonus(uid)
    if not result.get("can_claim"):
        return {"ok": False, "reason": "Бонус уже получен сегодня"}
    player  = db.get_or_create_player(uid, "")
    result["ok"]     = True
    result["player"] = dict(player)
    return result


# ─── Магазин ─────────────────────────────────────────────────────────────────

# Каталог товаров — единый источник истины для фронта и бэка
SHOP_CATALOG = {
    "hp_small":   {"name": "Малое зелье HP",     "price": 12,  "currency": "gold",     "icon": "🧪", "tab": "potions"},
    "hp_full":    {"name": "Большое зелье HP",    "price": 30,  "currency": "gold",     "icon": "⚗️", "tab": "potions"},
    "xp_boost":   {"name": "Буст XP ×1.5 (5боёв)","price": 100, "currency": "gold",    "icon": "💊", "tab": "potions"},
    "stat_reset": {"name": "Сброс статов",        "price": 50,  "currency": "diamonds", "icon": "🔄", "tab": "special"},
}


@app.get("/api/shop/catalog")
async def shop_catalog():
    return {"ok": True, "items": SHOP_CATALOG}


class ShopBuyBody(BaseModel):
    init_data: str
    item_id: str


@app.post("/api/shop/buy")
async def shop_buy(body: ShopBuyBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])

    item = SHOP_CATALOG.get(body.item_id)
    if not item:
        return {"ok": False, "reason": "Товар не найден"}

    if body.item_id == "hp_small":
        result = db.buy_hp_potion_small(uid)
    elif body.item_id == "hp_full":
        result = db.buy_hp_potion(uid)
    elif body.item_id == "xp_boost":
        result = db.buy_xp_boost(uid)
    elif body.item_id == "stat_reset":
        result = db.buy_stat_reset(uid)
    else:
        return {"ok": False, "reason": "Покупка недоступна"}

    if result.get("ok"):
        # Возвращаем обновлённого игрока
        player = db.get_or_create_player(uid, "")
        result["player"] = dict(player)
    return result


# ─── Монетизация: Stars + CryptoPay ─────────────────────────────────────────

# Пакеты алмазов за Telegram Stars (TEST: все по 1 звезде)
STARS_PACKAGES = [
    {"id": "d100",    "diamonds": 100, "stars": 1, "label": "100 💎"},
    {"id": "d300",    "diamonds": 300, "stars": 1, "label": "300 💎"},
    {"id": "d500",    "diamonds": 500, "stars": 1, "label": "500 💎"},
    {"id": "premium", "diamonds": 0,   "stars": 1, "label": "👑 Premium"},
]

# Пакеты за криптовалюту (CryptoPay)
CRYPTO_PACKAGES = [
    {"id": "cd100",     "diamonds": 100, "label": "100 💎",          "ton": "0.50", "usdt": "1.50"},
    {"id": "cd300",     "diamonds": 300, "label": "300 💎",          "ton": "1.30", "usdt": "3.50"},
    {"id": "cd500",     "diamonds": 500, "label": "500 💎",          "ton": "2.00", "usdt": "5.00"},
    {"id": "cdpremium", "diamonds": 0,   "label": "👑 Premium",      "ton": "1.50", "usdt": "4.00", "premium": True},
    {
        "id": "cdfullreset",
        "diamonds": 0,
        "label": "🔄 Полный сброс",
        "usdt": FULL_RESET_CRYPTO_USDT,
        "full_reset": True,
        "usdt_only": True,
    },
]

CRYPTOPAY_API_BASE = (
    "https://testnet-pay.crypt.bot/api" if CRYPTOPAY_TESTNET
    else "https://pay.crypt.bot/api"
)


@app.get("/api/shop/packages")
async def shop_packages():
    """Каталог пакетов пополнения (Stars + CryptoPay)."""
    return {
        "ok": True,
        "stars":  STARS_PACKAGES,
        "crypto": CRYPTO_PACKAGES,
        "premium_stars": PREMIUM_SUBSCRIPTION_STARS,
        "cryptopay_enabled": bool(CRYPTOPAY_TOKEN),
    }


class StarsConfirmBody(BaseModel):
    init_data:  str
    package_id: str   # d100 | d300 | d500 | premium


@app.post("/api/shop/stars_confirm")
async def stars_confirm(body: StarsConfirmBody):
    """Вызывается из TMA сразу после tg.openInvoice() вернул status='paid'.
    Начисляет алмазы напрямую (без ожидания бота) с защитой от двойного начисления."""
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])

    pkg = next((p for p in STARS_PACKAGES if p["id"] == body.package_id), None)
    if not pkg:
        return {"ok": False, "reason": "Пакет не найден"}

    diamonds   = pkg["diamonds"]
    stars      = pkg["stars"]
    is_premium = pkg["id"] == "premium"

    # Проверка: нельзя купить Premium если уже активен
    if is_premium:
        prem = db.get_premium_status(uid)
        if prem["is_active"]:
            fresh = db.get_or_create_player(uid, "")
            return {
                "ok": False,
                "reason": f"Premium уже активен ещё {prem['days_left']} дн.",
                "player": dict(fresh),
            }
        # Активируем Premium на 21 день
        prem_result = db.activate_premium(uid, days=21)
        bonus_d   = prem_result.get("bonus_diamonds", 0)
        days_left = prem_result.get("days_left", 21)
        # Реферальный бонус в USDT за Stars
        try:
            ref_res = db.process_referral_stars_premium(uid, stars)
            if ref_res.get("ok"):
                logger.info("Referral Stars→USDT: referrer=%s reward=%.4f USDT rank=%s",
                            ref_res["referrer_id"], ref_res["reward_usdt"], ref_res["rank"])
                await _send_tg_message(
                    ref_res["referrer_id"],
                    f"💰 <b>Реферальный бонус!</b>\n"
                    f"Ваш приглашённый купил Premium за Telegram Stars.\n"
                    f"<b>+{ref_res['reward_usdt']:.4f} USDT</b> добавлено на ваш баланс.\n"
                    f"Выведите через раздел «Рефералка» в игре.\n\n"
                    f"⚔️ Duel Arena"
                )
        except Exception as e:
            logger.error("process_referral_stars_premium error: %s", e)
        await manager.send(uid, {
            "event":          "premium_activated",
            "days_left":      days_left,
            "bonus_diamonds": bonus_d,
            "source":         "stars",
        })
        bonus_txt = f"\n💎 Бонус при покупке: <b>+{bonus_d} алмазов</b>" if bonus_d > 0 else ""
        await _send_tg_message(uid,
            f"👑 <b>Premium подписка активирована!</b>\n"
            f"Срок действия: <b>{days_left} дней</b>{bonus_txt}\n"
            f"📈 Опыт за бои: <b>+{PREMIUM_XP_BONUS_PERCENT}%</b>\n\n"
            f"Спасибо за покупку! ⚔️ Duel Arena"
        )
        fresh = db.get_or_create_player(uid, "")
        return {
            "ok": True,
            "diamonds_added": bonus_d,
            "premium_activated": True,
            "premium_days_left": days_left,
            "bonus_diamonds":    bonus_d,
            "player": _player_api(dict(fresh)),
        }

    result = db.confirm_stars_payment(uid, body.package_id, diamonds, stars)

    if result.get("ok"):
        if diamonds > 0:
            await manager.send(uid, {
                "event":    "diamonds_credited",
                "diamonds": diamonds,
                "source":   "stars",
            })
            await _send_tg_message(uid,
                f"💎 <b>+{diamonds} алмазов зачислено!</b>\n"
                f"Оплата через Telegram Stars подтверждена.\n\n"
                f"⚔️ Duel Arena"
            )
    # already_credited тоже OK для UI — просто показываем успех
    fresh  = db.get_or_create_player(uid, "")
    return {
        "ok":     True,
        "diamonds_added": diamonds,
        "already_credited": result.get("reason") == "already_credited",
        "player": _player_api(dict(fresh)),
    }


class StarsInvoiceBody(BaseModel):
    init_data: str
    package_id: str   # d100 | d300 | d500 | premium


@app.post("/api/shop/stars_invoice")
async def stars_invoice(body: StarsInvoiceBody):
    """Создать invoice для покупки алмазов через Telegram Stars.
    Возвращает invoice_url — фронт открывает его через tg.openInvoice()."""
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])

    pkg = next((p for p in STARS_PACKAGES if p["id"] == body.package_id), None)
    if not pkg:
        return {"ok": False, "reason": "Пакет не найден"}
    if not BOT_TOKEN:
        return {"ok": False, "reason": "Бот не настроен (нет BOT_TOKEN)"}

    if pkg["id"] == "premium":
        payload = "premium_sub"
        title   = "Premium подписка"
        desc    = f"Duel Arena Premium: +{PREMIUM_XP_BONUS_PERCENT}% опыта за бои и прочие бонусы"
    else:
        payload = f"diamonds_{pkg['diamonds']}"
        title   = f"{pkg['diamonds']} алмазов"
        desc    = f"{pkg['diamonds']} 💎 алмазов в Duel Arena"

    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink",
                json={
                    "title":       title,
                    "description": desc,
                    "payload":     payload,
                    "currency":    "XTR",
                    "prices":      [{"label": title, "amount": pkg["stars"]}],
                },
            )
            data = resp.json()
        if data.get("ok"):
            return {"ok": True, "invoice_url": data["result"]}
        logger.error("createInvoiceLink error: %s", data)
        return {"ok": False, "reason": "Telegram отклонил запрос"}
    except Exception as e:
        logger.error("Stars invoice HTTP error: %s", e)
        return {"ok": False, "reason": "Ошибка соединения с Telegram"}


class CryptoInvoiceBody(BaseModel):
    init_data:  str
    package_id: str          # cd100 | cd300 | cd500
    asset:      str = "TON"  # TON | USDT


@app.post("/api/shop/crypto_invoice")
async def crypto_invoice(body: CryptoInvoiceBody):
    """Создать CryptoPay invoice.
    Возвращает mini_app_invoice_url — фронт открывает через tg.openLink()."""
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])

    pkg = next((p for p in CRYPTO_PACKAGES if p["id"] == body.package_id), None)
    if not pkg:
        return {"ok": False, "reason": "Пакет не найден"}

    if not CRYPTOPAY_TOKEN:
        return {"ok": False, "reason": "CryptoPay не настроен"}

    asset = body.asset.upper()
    if asset not in ("TON", "USDT"):
        return {"ok": False, "reason": "Неверная валюта (TON или USDT)"}

    is_premium = pkg.get("premium", False)
    is_full_reset = pkg.get("full_reset", False)

    if is_full_reset:
        if asset != "USDT":
            return {"ok": False, "reason": "Полный сброс доступен только за USDT"}
        amount = str(pkg["usdt"])
    elif asset == "TON":
        amount = pkg["ton"]
    else:
        amount = pkg["usdt"]

    # Блокируем повторную покупку Premium если уже активна
    if is_premium:
        prem_status = db.get_premium_status(uid)
        if prem_status["is_active"]:
            return {
                "ok": False,
                "reason": f"👑 Premium уже активен ещё {prem_status['days_left']} дн. — деньги не списаны"
            }

    if is_full_reset:
        description = "Duel Arena — полный сброс профиля (необратимо, USDT)"
        payload_str = f"uid:{uid}:full_reset:1"
    elif is_premium:
        description = "Duel Arena — 👑 Premium подписка"
        payload_str = f"uid:{uid}:premium:1"
    else:
        description = f"Duel Arena — {pkg['diamonds']} 💎 алмазов"
        payload_str = f"uid:{uid}:diamonds:{pkg['diamonds']}"

    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{CRYPTOPAY_API_BASE}/createInvoice",
                headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                json={
                    "asset":              asset,
                    "amount":             amount,
                    "payload":            payload_str,
                    "description":        description,
                    "allow_comments":     False,
                    "allow_anonymous":    False,
                },
            )
            data = resp.json()
        if data.get("ok"):
            inv = data["result"]
            # Сохраняем в БД для webhook-подтверждения
            db.create_crypto_invoice(
                uid,
                inv["invoice_id"],
                pkg["diamonds"],
                asset,
                amount,
            )
            return {
                "ok":          True,
                "invoice_url": inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url"),
                "invoice_id":  inv["invoice_id"],
            }
        logger.error("CryptoPay createInvoice error: %s", data)
        return {"ok": False, "reason": "CryptoPay отклонил запрос"}
    except Exception as e:
        logger.error("CryptoPay HTTP error: %s", e)
        return {"ok": False, "reason": "Ошибка соединения с CryptoPay"}


@app.post("/api/webhooks/cryptopay")
async def cryptopay_webhook(request: Request):
    """Webhook от CryptoPay при успешной оплате инвойса (event: invoice_paid)."""
    if not CRYPTOPAY_TOKEN:
        return JSONResponse({"ok": False}, status_code=400)

    body_bytes = await request.body()
    signature  = request.headers.get("crypto-pay-api-signature", "")

    # Верификация подписи HMAC-SHA256
    import hashlib, hmac as _hmac
    secret  = hashlib.sha256(CRYPTOPAY_TOKEN.encode()).digest()
    expected = _hmac.new(secret, body_bytes, hashlib.sha256).hexdigest()
    if not _hmac.compare_digest(expected, signature):
        logger.warning("CryptoPay webhook: invalid signature")
        return JSONResponse({"ok": False}, status_code=401)

    try:
        data = json.loads(body_bytes)
    except Exception:
        return JSONResponse({"ok": False}, status_code=400)

    if data.get("update_type") != "invoice_paid":
        return {"ok": True}  # другие события игнорируем

    inv        = data.get("payload", {})
    invoice_id = inv.get("invoice_id")
    if not invoice_id:
        return {"ok": True}

    result = db.confirm_crypto_invoice(int(invoice_id))
    if result.get("ok"):
        uid            = result["user_id"]
        diamonds       = result["diamonds"]
        asset          = result.get("asset", "TON")
        amount_str     = result.get("amount", "0")
        custom_payload = inv.get("payload", "")
        is_premium     = ":premium:" in custom_payload
        is_full_reset  = ":full_reset:" in custom_payload
        logger.info("CryptoPay paid: uid=%s diamonds=%s premium=%s reset=%s asset=%s invoice=%s",
                    uid, diamonds, is_premium, is_full_reset, asset, invoice_id)
        if is_premium:
            prem = db.activate_premium(uid, days=21)
            bonus_d = prem.get("bonus_diamonds", 0)
            days_left = prem.get("days_left", 21)
            # Реферальный бонус в USDT (только если оплата в USDT)
            if asset == "USDT":
                try:
                    ref_res = db.process_referral_crypto_premium(uid, float(amount_str))
                    if ref_res.get("ok"):
                        logger.info("Referral USDT reward: referrer=%s reward=%.4f USDT",
                                    ref_res["referrer_id"], ref_res["reward_usdt"])
                        await _send_tg_message(
                            ref_res["referrer_id"],
                            f"💰 <b>Реферальный бонус!</b>\n"
                            f"Ваш приглашённый купил Premium через CryptoPay.\n"
                            f"<b>+{ref_res['reward_usdt']:.4f} USDT</b> добавлено на ваш баланс.\n\n"
                            f"⚔️ Duel Arena"
                        )
                except Exception as e:
                    logger.error("Referral crypto premium error: %s", e)
            await manager.send(uid, {
                "event":          "premium_activated",
                "days_left":      days_left,
                "bonus_diamonds": bonus_d,
                "source":         "cryptopay",
            })
            bonus_txt = f"\n💎 Бонус при покупке: <b>+{bonus_d} алмазов</b>" if bonus_d > 0 else ""
            await _send_tg_message(uid,
                f"👑 <b>Premium подписка активирована!</b>\n"
                f"Срок действия: <b>{days_left} дней</b>{bonus_txt}\n"
                f"📈 Опыт за бои: <b>+{PREMIUM_XP_BONUS_PERCENT}%</b>\n\n"
                f"Спасибо за покупку! ⚔️ Duel Arena"
            )
        elif is_full_reset:
            await _notify_paid_full_reset(uid)
        else:
            await manager.send(uid, {
                "event":    "diamonds_credited",
                "diamonds": diamonds,
                "source":   "cryptopay",
            })
            await _send_tg_message(uid,
                f"💎 <b>+{diamonds} алмазов зачислено!</b>\n"
                f"Оплата через CryptoPay подтверждена.\n\n"
                f"⚔️ Duel Arena"
            )
    else:
        logger.warning("CryptoPay confirm_invoice %s: %s", invoice_id, result.get("reason"))

    return {"ok": True}


@app.get("/api/shop/crypto_check/{invoice_id}")
async def crypto_check_invoice(invoice_id: int, init_data: str):
    """Polling-fallback: проверить статус CryptoPay инвойса через API CryptoPay.
    Если оплачен — подтвердить в БД и начислить алмазы."""
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])

    if not CRYPTOPAY_TOKEN:
        return {"ok": False, "reason": "CryptoPay не настроен"}

    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{CRYPTOPAY_API_BASE}/getInvoices",
                headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                params={"invoice_ids": str(invoice_id)},
            )
            data = resp.json()
        if not data.get("ok"):
            return {"ok": False, "reason": "CryptoPay API error"}
        items = data.get("result", {}).get("items", [])
        if not items:
            return {"ok": False, "reason": "invoice_not_found"}
        inv    = items[0]
        status = inv.get("status")
        if status != "paid":
            return {"ok": True, "status": status, "paid": False}
        # Подтверждаем
        custom_payload = inv.get("payload", "")
        is_premium     = ":premium:" in custom_payload
        is_full_reset  = ":full_reset:" in custom_payload
        result = db.confirm_crypto_invoice(int(invoice_id))
        if result.get("ok"):
            diamonds   = result["diamonds"]
            asset      = result.get("asset", "TON")
            amount_str = result.get("amount", "0")
            owner_uid  = int(result.get("user_id", 0))
            if owner_uid != uid:
                logger.warning("crypto_check invoice %s user mismatch db=%s init=%s", invoice_id, owner_uid, uid)
                return {"ok": False, "reason": "invoice_user_mismatch"}
            if is_premium:
                prem = db.activate_premium(owner_uid, days=21)
                bonus_d = prem.get("bonus_diamonds", 0)
                days_left = prem.get("days_left", 21)
                # Реферальный бонус в USDT
                if asset == "USDT":
                    try:
                        ref_res = db.process_referral_crypto_premium(owner_uid, float(amount_str))
                        if ref_res.get("ok"):
                            await _send_tg_message(
                                ref_res["referrer_id"],
                                f"💰 <b>Реферальный бонус!</b>\n"
                                f"Ваш приглашённый купил Premium через CryptoPay.\n"
                                f"<b>+{ref_res['reward_usdt']:.4f} USDT</b> добавлено на ваш баланс.\n\n"
                                f"⚔️ Duel Arena"
                            )
                    except Exception as e:
                        logger.error("Referral crypto premium (check) error: %s", e)
                await manager.send(owner_uid, {
                    "event":          "premium_activated",
                    "days_left":      days_left,
                    "bonus_diamonds": bonus_d,
                    "source":         "cryptopay",
                })
                bonus_txt = f"\n💎 Бонус при покупке: <b>+{bonus_d} алмазов</b>" if bonus_d > 0 else ""
                await _send_tg_message(owner_uid,
                    f"👑 <b>Premium подписка активирована!</b>\n"
                    f"Срок действия: <b>{days_left} дней</b>{bonus_txt}\n"
                    f"📈 Опыт за бои: <b>+{PREMIUM_XP_BONUS_PERCENT}%</b>\n\n"
                    f"Спасибо за покупку! ⚔️ Duel Arena"
                )
                return {"ok": True, "paid": True, "diamonds": bonus_d, "premium_activated": True,
                        "premium_days_left": days_left, "bonus_diamonds": bonus_d}
            if is_full_reset:
                await _notify_paid_full_reset(owner_uid)
                return {"ok": True, "paid": True, "profile_reset": True}
            await manager.send(owner_uid, {
                "event":    "diamonds_credited",
                "diamonds": diamonds,
                "source":   "cryptopay",
            })
            await _send_tg_message(owner_uid,
                f"💎 <b>+{diamonds} алмазов зачислено!</b>\n"
                f"Оплата через CryptoPay подтверждена.\n\n"
                f"⚔️ Duel Arena"
            )
            return {"ok": True, "paid": True, "diamonds": diamonds}
        # already_paid тоже считаем успехом для UI
        if result.get("reason") == "already_paid":
            return {
                "ok": True,
                "paid": True,
                "already_confirmed": True,
                "profile_reset": is_full_reset,
            }
        return {"ok": False, "reason": result.get("reason")}
    except Exception as e:
        logger.error("crypto_check error: %s", e)
        return {"ok": False, "reason": "connection_error"}


# ─── Передача лидерства ───────────────────────────────────────────────────────

class ClanTransferBody(BaseModel):
    init_data: str
    new_leader_id: int


@app.post("/api/clan/transfer_leader")
async def clan_transfer_leader(body: ClanTransferBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    result  = db.transfer_clan_leader(uid, body.new_leader_id)
    return result


# ─── Вывод USDT рефералки ─────────────────────────────────────────────────────

class ReferralWithdrawBody(BaseModel):
    init_data: str


@app.post("/api/referral/withdraw")
async def referral_withdraw(body: ReferralWithdrawBody):
    tg_user  = get_user_from_init_data(body.init_data)
    uid      = int(tg_user["id"])

    # Проверяем возможность вывода (баланс >= $5, cooldown 24ч)
    check = db.request_referral_withdrawal(uid)
    if not check.get("ok"):
        return check

    amount = check["amount"]

    if not CRYPTOPAY_TOKEN:
        return {"ok": False, "reason": "CryptoPay не настроен — обратитесь к администратору"}

    # Автоматический перевод через CryptoPay Transfer API
    import httpx
    from datetime import datetime as _dt
    spend_id = f"ref_wd_{uid}_{int(_dt.utcnow().timestamp())}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{CRYPTOPAY_API_BASE}/transfer",
                headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                json={
                    "user_id":                  uid,
                    "asset":                    "USDT",
                    "amount":                   f"{amount:.2f}",
                    "spend_id":                 spend_id,
                    "comment":                  "Duel Arena — реферальный бонус 💰",
                    "disable_send_notification": False,
                },
            )
            data = resp.json()

        if data.get("ok"):
            # Фиксируем вывод в БД
            db.confirm_referral_withdrawal(uid, amount)
            logger.info("Referral withdrawal sent: uid=%s amount=%.2f USDT", uid, amount)
            await _send_tg_message(uid,
                f"💸 <b>Вывод {amount:.2f} USDT выполнен!</b>\n"
                f"Средства отправлены через @CryptoBot.\n"
                f"Следующий вывод доступен через 24 часа.\n\n"
                f"⚔️ Duel Arena"
            )
            return {"ok": True, "amount": amount}

        # Разбираем ошибки CryptoPay
        err  = data.get("error", {})
        code = err.get("code") or err.get("name") or ""
        logger.warning("CryptoPay transfer failed: uid=%s code=%s data=%s", uid, code, data)
        if "NOT_ENOUGH_COINS" in code or "not enough" in str(data).lower():
            return {"ok": False, "reason": "Недостаточно USDT на счёте бота — обратитесь к администратору"}
        if "USER_NOT_FOUND" in code or "user" in code.lower():
            return {
                "ok": False,
                "reason": "Сначала откройте @CryptoBot в Telegram (один раз), затем повторите",
                "cryptobot_required": True,
            }
        return {"ok": False, "reason": f"Ошибка перевода: {code or 'неизвестно'}"}

    except Exception as e:
        logger.error("CryptoPay transfer error: %s", e)
        return {"ok": False, "reason": "Ошибка соединения с CryptoPay"}


# ─── Статика (webapp/) ───────────────────────────────────────────────────────

webapp_dir = os.path.join(os.path.dirname(__file__), "webapp")
if os.path.isdir(webapp_dir):
    app.mount("/", StaticFiles(directory=webapp_dir, html=True), name="webapp")
