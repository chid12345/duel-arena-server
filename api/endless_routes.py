from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any, Dict

_ENDLESS_SESSION_TTL = 60  # секунд — сессия Натиска истекает после 1 мин неактивности

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class TitanStartBody(BaseModel):
    init_data: str
    floor: int | None = None


class BuyAttemptBody(BaseModel):
    init_data: str
    kind: str = "gold"


BASE_ENDLESS_ATTEMPTS = 3
PREMIUM_ENDLESS_BONUS = 5
ENDLESS_GOLD_COST = 100
ENDLESS_DIAMOND_COST = 50
ENDLESS_DIAMOND_COUNT = 3


def register_endless_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _premium_fields = ctx["_premium_fields"]
    _iso_week_key = ctx["_iso_week_key"]
    _endless_bot_for_wave = ctx["_endless_bot_for_wave"]
    battle_system = ctx["battle_system"]
    _battle_state_api = ctx["_battle_state_api"]

    @router.get("/api/endless/status")
    async def endless_status(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or ""
        player = db.get_or_create_player(uid, username)
        progress = db.get_endless_progress(uid)
        attempts_data = db.endless_get_attempts(uid)
        is_premium = bool(_premium_fields(player).get("is_premium"))
        base = BASE_ENDLESS_ATTEMPTS + (PREMIUM_ENDLESS_BONUS if is_premium else 0)
        total_available = base + attempts_data["extra_gold"] + attempts_data["extra_diamond"]
        attempts_left = max(0, total_available - attempts_data["used"])
        can_buy_gold = attempts_data["extra_gold"] == 0
        can_buy_diamond = True
        gold = int(player.get("gold", 0))
        diamonds = int(player.get("diamonds", 0))
        return {
            "ok": True,
            "attempts_left": attempts_left,
            "attempts_used": attempts_data["used"],
            "base_attempts": base,
            "can_buy_gold": can_buy_gold,
            "can_buy_diamond": can_buy_diamond,
            "gold_cost": ENDLESS_GOLD_COST,
            "diamond_cost": ENDLESS_DIAMOND_COST,
            "diamond_count": ENDLESS_DIAMOND_COUNT,
            "player_gold": gold,
            "player_diamonds": diamonds,
            "is_premium": is_premium,
            "progress": progress,
            "daily_endless_wins": db.endless_get_daily_wins(uid),
            "weekly_endless": db.endless_get_weekly_progress(uid, _iso_week_key()),
        }

    @router.post("/api/endless/start")
    async def endless_start(body: TitanStartBody):
        uid = "?"
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            username = tg_user.get("username") or ""
            player = db.get_or_create_player(uid, username)
            progress = db.get_endless_progress(uid)
            if progress["is_active"] and progress["current_wave"] > 0:
                db.endless_on_loss(uid, progress["current_wave"])
                progress = db.get_endless_progress(uid)

            attempts_data = db.endless_get_attempts(uid)
            is_premium = bool(_premium_fields(player).get("is_premium"))
            base = BASE_ENDLESS_ATTEMPTS + (PREMIUM_ENDLESS_BONUS if is_premium else 0)
            total_available = base + attempts_data["extra_gold"] + attempts_data["extra_diamond"]
            attempts_left = max(0, total_available - attempts_data["used"])
            if attempts_left <= 0:
                return {"ok": False, "reason": "Попытки закончились. Приходи завтра!"}
            wave = 1
            full_hp = int(player.get("max_hp", 100))
            db.endless_start_run(uid, full_hp)
            db.endless_use_attempt(uid)
            # 1 заход в Натиск = 1 заряд баффа (независимо от числа волн)
            db.consume_charges(uid)
            db.cleanup_expired(uid)

            bot = _endless_bot_for_wave(wave)
            player_for_battle = dict(player)
            player_for_battle["current_hp"] = full_hp
            await battle_system.start_battle(
                player_for_battle, bot, is_bot2=True, mode="endless", mode_meta={"wave": wave}
            )
            state = _battle_state_api(uid)
            return {"ok": True, "status": "endless_started", "wave": wave, "bot": bot, "battle": state}
        except Exception as e:
            logger.error("endless_start error uid=%s: %s", uid, e, exc_info=True)
            return {"ok": False, "reason": str(e)[:200]}

    @router.post("/api/endless/next_wave")
    async def endless_next_wave(body: TitanStartBody):
        uid = "?"
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            username = tg_user.get("username") or ""
            player = db.get_or_create_player(uid, username)
            progress = db.get_endless_progress(uid)
            if not progress["is_active"] or progress["current_wave"] <= 0:
                return {"ok": False, "reason": "Нет активного захода"}
            # Сессия истекла (>1 мин неактивности) — заход считается проигранным
            try:
                upd = str(progress.get("updated_at") or "")[:19]
                upd_ts = datetime.strptime(upd, "%Y-%m-%d %H:%M:%S").timestamp()
                if time.time() - upd_ts > _ENDLESS_SESSION_TTL:
                    db.endless_on_loss(uid, progress["current_wave"])
                    return {"ok": False, "reason": "Заход истёк. Начни новый!"}
            except Exception:
                pass
            wave = progress["current_wave"]
            player_for_battle = dict(player)
            player_for_battle["current_hp"] = progress["current_hp"]
            bot = _endless_bot_for_wave(wave)
            await battle_system.start_battle(
                player_for_battle, bot, is_bot2=True, mode="endless", mode_meta={"wave": wave}
            )
            state = _battle_state_api(uid)
            return {"ok": True, "status": "endless_started", "wave": wave, "bot": bot, "battle": state}
        except Exception as e:
            logger.error("endless_next_wave error uid=%s: %s", uid, e, exc_info=True)
            return {"ok": False, "reason": str(e)[:200]}

    @router.post("/api/endless/buy_attempt")
    async def endless_buy_attempt(body: BuyAttemptBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or ""
        player = db.get_or_create_player(uid, username)
        kind = body.kind

        if kind == "gold":
            attempts_data = db.endless_get_attempts(uid)
            if attempts_data["extra_gold"] > 0:
                return {"ok": False, "reason": "Уже куплена попытка за золото сегодня"}
            gold = int(player.get("gold", 0))
            if gold < ENDLESS_GOLD_COST:
                return {"ok": False, "reason": f"Нужно {ENDLESS_GOLD_COST} 🪙"}
            db.update_player_stats(uid, {"gold": gold - ENDLESS_GOLD_COST})
            db.endless_add_extra(uid, "gold", 1)
            db.track_purchase(uid, "endless_extra", "gold", ENDLESS_GOLD_COST)
            return {"ok": True, "bought": 1, "cost": ENDLESS_GOLD_COST}
        if kind == "diamond":
            diamonds = int(player.get("diamonds", 0))
            if diamonds < ENDLESS_DIAMOND_COST:
                return {"ok": False, "reason": f"Нужно {ENDLESS_DIAMOND_COST} 💎"}
            db.update_player_stats(uid, {"diamonds": diamonds - ENDLESS_DIAMOND_COST})
            db.endless_add_extra(uid, "diamond", ENDLESS_DIAMOND_COUNT)
            db.track_purchase(uid, "endless_extra", "diamonds", ENDLESS_DIAMOND_COST)
            return {"ok": True, "bought": ENDLESS_DIAMOND_COUNT, "cost": ENDLESS_DIAMOND_COST}
        return {"ok": False, "reason": "Неверный тип"}

    @router.post("/api/endless/abandon")
    async def endless_abandon(body: TitanStartBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        progress = db.get_endless_progress(uid)
        if progress["is_active"]:
            db.endless_on_loss(uid, progress["current_wave"])
        return {"ok": True}

    @router.get("/api/endless/top")
    async def endless_top(init_data: str):
        from db_core import iso_week_key_utc
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        leaders = db.endless_get_top(20)
        my_pos = next((i + 1 for i, r in enumerate(leaders) if r["user_id"] == uid), None)
        week_key = iso_week_key_utc()
        weekly = db.endless_get_weekly_top(week_key, limit=20)
        rewards = [
            {"rank": 1,    "diamonds": 100, "gold": 300, "title": "Покоритель Волн"},
            {"rank": 2,    "diamonds": 60,  "gold": 200, "title": "Штормовой боец"},
            {"rank": 3,    "diamonds": 40,  "gold": 100, "title": "Волновой боец"},
            {"rank": "4-10","diamonds": 15, "gold": 50,  "title": "Участник натиска"},
        ]
        return {"ok": True, "leaders": leaders, "my_pos": my_pos,
                "week_key": week_key, "weekly": weekly, "rewards": rewards}

    app.include_router(router)
