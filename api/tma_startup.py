"""Keepalive и еженедельные выплаты лидербордов при старте TMA."""

from __future__ import annotations

import asyncio
import logging
import os
import urllib.request
from datetime import datetime, timedelta
from typing import Any, Callable

from fastapi import FastAPI

from api.tma_infra import rate_limiter_cleanup

logger = logging.getLogger(__name__)


def attach_tma_startup(
    app: FastAPI,
    *,
    db: Any,
    _cache_invalidate: Callable[[int], None],
    _send_tg_message: Callable[..., Any],
) -> None:
    async def _run_season_rotation() -> None:
        """Авто-завершение сезона если прошло ≥14 дней."""
        try:
            loop = asyncio.get_event_loop()
            season = await loop.run_in_executor(None, db.get_active_season)
            if not season:
                return
            started_str = str(season["started_at"])[:19].replace(" ", "T")
            try:
                started_at = datetime.fromisoformat(started_str)
            except ValueError:
                return
            from repositories.shop.seasons import SEASON_DURATION_DAYS
            if datetime.utcnow() < started_at + timedelta(days=SEASON_DURATION_DAYS):
                return
            # Сезон истёк — завершаем
            new_sid = season["id"] + 1
            new_name = f"Сезон {new_sid}"
            res = await loop.run_in_executor(None, db.end_season, new_name)
            if not res.get("ok"):
                return
            logger.info(
                "auto season rotation: ended=%s new=%s rewarded=%s",
                res["ended_season_id"], res["new_season_id"], res["rewarded"],
            )
            for uid in [m["chat_id"] for m in res.get("telegram") or [] if m.get("chat_id")]:
                _cache_invalidate(int(uid))
            for msg in res.get("telegram") or []:
                cid = msg.get("chat_id")
                if cid:
                    await _send_tg_message(int(cid), msg.get("text") or "")
        except Exception as exc:
            logger.warning("season rotation failed: %s", exc)

    async def _run_weekly_leaderboard_payouts() -> None:
        try:
            loop = asyncio.get_event_loop()
            res = await loop.run_in_executor(None, db.process_weekly_leaderboard_payouts)
            for uid in res.get("invalidate_uids") or []:
                _cache_invalidate(int(uid))
            for msg in res.get("telegram") or []:
                cid = msg.get("chat_id")
                if cid:
                    await _send_tg_message(int(cid), msg.get("text") or "")
            pp, tt = int(res.get("pvp_paid") or 0), int(res.get("titan_paid") or 0)
            if pp > 0 or tt > 0:
                logger.info(
                    "weekly leaderboard payouts week=%s pvp_slots=%s titan_slots=%s",
                    res.get("week_key"),
                    pp,
                    tt,
                )
        except Exception as exc:
            logger.warning("weekly leaderboard payouts failed: %s", exc)

    async def _keepalive_loop(health_url: str) -> None:
        await asyncio.sleep(120)
        while True:
            try:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: urllib.request.urlopen(health_url, timeout=15),
                )
                logger.info("keepalive ping ok → %s", health_url)
            except Exception as exc:
                logger.debug("keepalive ping failed: %s", exc)
            rate_limiter_cleanup()
            await _run_weekly_leaderboard_payouts()
            await _run_season_rotation()
            await asyncio.sleep(600)

    @app.on_event("startup")
    async def _start_keepalive() -> None:
        asyncio.create_task(_run_weekly_leaderboard_payouts())
        render_url = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
        if render_url:
            asyncio.create_task(_keepalive_loop(f"{render_url}/api/health"))
            logger.info("keepalive task started → %s/api/health (every 10 min)", render_url)
