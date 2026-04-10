from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from typing import Any, Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


def register_system_realtime_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    db = ctx["db"]
    manager = ctx["manager"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    APP_BUILD_VERSION = ctx["APP_BUILD_VERSION"]
    GAME_VERSION = ctx["GAME_VERSION"]
    CRYPTOPAY_TOKEN = ctx["CRYPTOPAY_TOKEN"]
    CRYPTOPAY_API_BASE = ctx["CRYPTOPAY_API_BASE"]

    @router.get("/api/health")
    async def health():
        from config import WEBAPP_PUBLIC_URL

        self_url = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
        webapp_base = WEBAPP_PUBLIC_URL.split("?")[0] if WEBAPP_PUBLIC_URL else ""
        url_mismatch = bool(self_url and webapp_base and self_url != webapp_base)
        return {
            "ok": True,
            "ts": int(time.time()),
            "version": APP_BUILD_VERSION,
            "webapp_url": WEBAPP_PUBLIC_URL,
            "self_url": self_url,
            "url_mismatch": url_mismatch,
        }

    @router.get("/api/version")
    async def app_version():
        return {"ok": True, "version": GAME_VERSION, "build": APP_BUILD_VERSION}

    @router.get("/api/rating")
    async def get_rating(init_data: str, limit: int = 20):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        season = db.get_active_season()
        if season:
            rows = db.get_season_leaderboard(season["id"], limit=limit)
        else:
            rows = db.get_top_players(limit=limit)
        players = [_player_api(dict(r)) for r in rows]
        my_rank = next((i + 1 for i, p in enumerate(players) if p.get("user_id") == uid), None)
        return {"ok": True, "players": players, "my_rank": my_rank, "season": season}

    @router.get("/api/debug/cryptopay")
    async def debug_cryptopay():
        import httpx

        token_hint = (CRYPTOPAY_TOKEN[:8] + "...") if CRYPTOPAY_TOKEN else "НЕ ЗАДАН"
        result = {"testnet": "testnet-pay.crypt.bot" in CRYPTOPAY_API_BASE, "api_base": CRYPTOPAY_API_BASE, "token_hint": token_hint}
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    f"{CRYPTOPAY_API_BASE}/getMe",
                    headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                )
                d = r.json()
                result["getMe_ok"] = d.get("ok")
                result["getMe_name"] = (d.get("result") or {}).get("name")
                result["getMe_err"] = d.get("error")
        except Exception as e:
            result["getMe_exception"] = str(e)
        return result

    @app.websocket("/ws/{user_id}")
    async def websocket_endpoint(ws: WebSocket, user_id: int):
        ping_task = None
        await manager.connect(user_id, ws)
        logger.info("WS connected user_id=%s", user_id)
        try:
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
                msg = json.loads(data)
                if msg.get("type") == "pong":
                    pass
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.warning("WS error user_id=%s: %s", user_id, e)
        finally:
            if ping_task:
                ping_task.cancel()
            manager.disconnect(user_id)
            logger.info("WS disconnected user_id=%s", user_id)

    app.include_router(router)
