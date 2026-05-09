"""
api/season_pass_routes.py — endpoints боевого пропуска для Mini App.

Маршруты:
  POST /api/season_pass/state  — текущее состояние пасса для игрока
  POST /api/season_pass/claim  — забрать награду уровня

Авторизация: Telegram initData.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from api.tma_auth import get_user_from_init_data
from database import db
from repositories.season_pass.config_loader import (
    get_pass_max_level,
    get_points_per_level,
    get_rewards_grid,
    get_premium_subscription_config,
    load_season_pass_config,
)

logger = logging.getLogger(__name__)


class StateBody(BaseModel):
    init_data: str


class ClaimBody(BaseModel):
    init_data: str
    level: int
    track: str  # 'free' | 'premium'


class InvoiceBody(BaseModel):
    init_data: str


def _build_state_for_user(user_id: int) -> dict:
    """Собрать состояние пасса для UI."""
    season = db.ensure_bp_season()
    season_id = int(season["id"])
    progress = db.get_bp_progress(user_id, season_id)
    max_level = get_pass_max_level()
    per_level = get_points_per_level()
    grid = get_rewards_grid()

    # Список наград с флагами claimed/locked для каждого уровня
    levels = []
    for level_str, cell in sorted(grid.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0):
        if not level_str.isdigit():
            continue
        lv = int(level_str)
        free_claimed = db.is_bp_reward_claimed(user_id, season_id, lv, "free")
        prem_claimed = db.is_bp_reward_claimed(user_id, season_id, lv, "premium")
        levels.append({
            "level": lv,
            "reached": progress["level"] >= lv,
            "free": cell.get("free", {}),
            "premium": cell.get("premium", {}),
            "free_claimed": free_claimed,
            "premium_claimed": prem_claimed,
        })

    return {
        "ok": True,
        "season": {
            "id": season_id,
            "name": season.get("name"),
            "theme": season.get("theme"),
            "ends_at": str(season.get("ends_at")),
        },
        "progress": {
            "points": progress["points"],
            "level": progress["level"],
            "max_level": max_level,
            "points_per_level": per_level,
            "next_level_at": (progress["level"] + 1) * per_level if progress["level"] < max_level else None,
            "has_premium": bool(progress.get("has_premium")),
        },
        "levels": levels,
        "premium_subscription": get_premium_subscription_config(),
    }


async def _create_premium_invoice_link() -> str:
    """Через Bot API создаёт invoice link для Premium-подписки (Telegram Stars).
    payload='premium_sub' — обрабатывается в successful_payment_handler существующего бота."""
    token = (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
    if not token:
        raise HTTPException(status_code=503, detail="TELEGRAM_BOT_TOKEN не настроен")
    from config import PREMIUM_SUBSCRIPTION_STARS

    payload: dict[str, Any] = {
        "title": "Premium-подписка",
        "description": "Premium-трек батл-пасса + бонусы (XP +30%, золото +18%, ящик в день)",
        "payload": "premium_sub",
        "currency": "XTR",  # Telegram Stars
        "prices": [{"label": "Premium", "amount": int(PREMIUM_SUBSCRIPTION_STARS)}],
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            f"https://api.telegram.org/bot{token}/createInvoiceLink",
            json=payload,
        )
        data = r.json()
    if not data.get("ok"):
        logger.error("createInvoiceLink failed: %s", data)
        raise HTTPException(status_code=502, detail=f"createInvoiceLink: {data.get('description')}")
    return str(data["result"])


def register_season_pass_routes(app: FastAPI) -> None:
    @app.post("/api/season_pass/state", tags=["season_pass"])
    def get_state(body: StateBody):
        try:
            user = get_user_from_init_data(body.init_data)
            uid = int(user["id"])
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"auth: {e}")
        return _build_state_for_user(uid)

    @app.post("/api/season_pass/buy_premium_invoice", tags=["season_pass"])
    async def buy_premium_invoice(body: InvoiceBody):
        try:
            user = get_user_from_init_data(body.init_data)
            int(user["id"])
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"auth: {e}")
        link = await _create_premium_invoice_link()
        return {"ok": True, "invoice_link": link}

    @app.post("/api/season_pass/claim", tags=["season_pass"])
    def claim_reward(body: ClaimBody):
        try:
            user = get_user_from_init_data(body.init_data)
            uid = int(user["id"])
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"auth: {e}")
        if body.track not in ("free", "premium"):
            raise HTTPException(status_code=400, detail="track must be 'free' or 'premium'")
        result = db.claim_bp_reward(uid, int(body.level), body.track)
        if not result.get("ok"):
            logger.info("bp_claim refused uid=%s lv=%s track=%s reason=%s",
                        uid, body.level, body.track, result.get("reason"))
            return result
        # Возвращаем обновлённое состояние, чтобы UI сразу перерисовался
        result["state"] = _build_state_for_user(uid)
        logger.info("bp_claim ok uid=%s lv=%s track=%s reward=%s",
                    uid, body.level, body.track, result.get("reward"))
        return result
