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
    manager: Any = None,
    CRYPTOPAY_TOKEN: str = None,
    CRYPTOPAY_API_BASE: str = None,
    USDT_SCROLL_PACKAGES: list = None,
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

    async def _recover_pending_invoices() -> None:
        if not CRYPTOPAY_TOKEN or not CRYPTOPAY_API_BASE:
            return
        try:
            import httpx
            loop = asyncio.get_event_loop()

            async def _deliver(uid: int, inv_id: int, payload: str, diamonds: int = 0) -> bool:
                """Выдать вторичную награду и вернуть True при успехе."""
                if ":usdt_scroll:" in payload:
                    scroll_id = payload.split(":usdt_scroll:", 1)[1].strip()
                    try:
                        await loop.run_in_executor(None, db.add_to_inventory, uid, scroll_id)
                    except Exception as _e:
                        logger.error("CRITICAL: recovery add_to_inventory uid=%s scroll=%s inv=%s err=%s", uid, scroll_id, inv_id, _e)
                        return False
                    if manager is not None:
                        await manager.send(uid, {"event": "scroll_received", "scroll_id": scroll_id})
                    await _send_tg_message(uid, f"📜 <b>Свиток получен!</b>\nОткройте «Герой → Моё → Особые» и нажмите Применить.\n\n⚔️ Duel Arena")
                elif ":usdt_slot:" in payload:
                    try:
                        ok2, _m, new_class_id = await loop.run_in_executor(None, db.create_usdt_class, uid)
                        if not ok2:
                            return False
                        if manager is not None:
                            await manager.send(uid, {"event": "usdt_slot_created", "class_id": new_class_id, "ok": True})
                        await _send_tg_message(uid, f"💠 <b>Легендарный образ получен!</b>\nОткройте «Статы → Гардероб → Мой инвентарь» и настройте его.\n\n⚔️ Duel Arena")
                    except Exception as _e:
                        logger.error("CRITICAL: recovery create_usdt_class uid=%s inv=%s err=%s", uid, inv_id, _e)
                        return False
                elif ":usdt_reset:" in payload:
                    class_id = payload.split(":usdt_reset:", 1)[1].strip()
                    try:
                        await loop.run_in_executor(None, db.reset_usdt_slot_stats, uid, class_id)
                        if manager is not None:
                            await manager.send(uid, {"event": "usdt_slot_reset", "class_id": class_id})
                        await _send_tg_message(uid, f"🔄 <b>Статы образа сброшены!</b>\nОткройте «Гардероб» и настройте новую сборку.\n\n⚔️ Duel Arena")
                    except Exception as _e:
                        logger.error("CRITICAL: recovery reset_usdt_slot_stats uid=%s class=%s inv=%s err=%s", uid, class_id, inv_id, _e)
                        return False
                elif ":avatar:" in payload:
                    avatar_id = payload.split(":avatar:", 1)[1].strip()
                    try:
                        unlock = await loop.run_in_executor(None, db.unlock_avatar, uid, avatar_id, "usdt")
                        if unlock.get("ok"):
                            if not unlock.get("already_unlocked"):
                                await loop.run_in_executor(None, db.track_purchase, uid, avatar_id, "usdt", 0)
                            _cache_invalidate(uid)
                            if manager is not None:
                                await manager.send(uid, {"event": "avatar_unlocked", "avatar_id": avatar_id, "source": "cryptopay"})
                            await _send_tg_message(uid, f"👑 <b>Новый образ разблокирован!</b>\nОбраз: <b>{avatar_id}</b>\nОткройте «Статы → Образы» и наденьте его.\n\n⚔️ Duel Arena")
                        else:
                            logger.error("CRITICAL: recovery unlock_avatar uid=%s avatar=%s inv=%s reason=%s", uid, avatar_id, inv_id, unlock.get("reason"))
                            await _send_tg_message(uid, "⚠️ Оплата получена, но выдача образа задержалась. Напишите в поддержку и укажите ID платежа.")
                            return False
                    except Exception as _e:
                        logger.error("CRITICAL: recovery unlock_avatar exc uid=%s avatar=%s inv=%s err=%s", uid, avatar_id, inv_id, _e)
                        return False
                elif ":premium:" in payload:
                    try:
                        prem = await loop.run_in_executor(None, db.activate_premium, uid, 21)
                        bonus_d = prem.get("bonus_diamonds", 0)
                        days_left = prem.get("days_left", 21)
                        if manager is not None:
                            await manager.send(uid, {"event": "premium_activated", "days_left": days_left, "bonus_diamonds": bonus_d, "source": "cryptopay"})
                        bonus_txt = f"\n💎 Бонус: <b>+{bonus_d} алмазов</b>" if bonus_d > 0 else ""
                        await _send_tg_message(uid, f"👑 <b>Premium подписка активирована!</b>\nСрок действия: <b>{days_left} дней</b>{bonus_txt}\n\nСпасибо за покупку! ⚔️ Duel Arena")
                    except Exception as _e:
                        logger.error("CRITICAL: recovery activate_premium uid=%s inv=%s err=%s", uid, inv_id, _e)
                        return False
                else:
                    if manager is not None and diamonds > 0:
                        await manager.send(uid, {"event": "diamonds_credited", "diamonds": diamonds, "source": "cryptopay"})
                    if diamonds > 0:
                        await _send_tg_message(uid, f"💎 <b>+{diamonds} алмазов зачислено!</b>\nОплата через CryptoPay подтверждена.\n\n⚔️ Duel Arena")
                return True

            # Phase 1: PENDING инвойсы — подтвердить + выдать
            invoices = await loop.run_in_executor(None, db.get_pending_crypto_invoices_older_than, 600)
            if invoices:
                ids_str = ",".join(str(inv["invoice_id"]) for inv in invoices)
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(
                        f"{CRYPTOPAY_API_BASE}/getInvoices",
                        headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                        params={"invoice_ids": ids_str},
                    )
                    data = resp.json()
                items = (data.get("result") or {}).get("items") or []
                paid_map = {item["invoice_id"]: item for item in items if item.get("status") == "paid"}
                for inv in invoices:
                    inv_id = inv["invoice_id"]
                    if inv_id not in paid_map:
                        continue
                    result = await loop.run_in_executor(None, db.confirm_crypto_invoice, inv_id)
                    if not result.get("ok"):
                        continue
                    uid = int(result["user_id"])
                    payload = str(inv.get("payload") or "")
                    logger.info("invoice recovery: confirmed invoice=%s uid=%s", inv_id, uid)
                    if await _deliver(uid, inv_id, payload, int(result.get("diamonds") or 0)):
                        await loop.run_in_executor(None, db.mark_items_delivered, inv_id)

            # Phase 2: PAID но items_delivered=0 — выдать без повторного confirm
            undelivered = await loop.run_in_executor(None, db.get_paid_undelivered_invoices, 60)
            for inv in undelivered:
                uid = int(inv["user_id"])
                inv_id = inv["invoice_id"]
                payload = str(inv.get("payload") or "")
                logger.info("delivery recovery: undelivered invoice=%s uid=%s", inv_id, uid)
                if await _deliver(uid, inv_id, payload, int(inv.get("diamonds") or 0)):
                    await loop.run_in_executor(None, db.mark_items_delivered, inv_id)
        except Exception as exc:
            logger.warning("invoice recovery failed: %s", exc)

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
                logger.warning("keepalive ping failed: %s", exc)
            rate_limiter_cleanup()
            await _run_weekly_leaderboard_payouts()
            await _run_season_rotation()
            await _recover_pending_invoices()
            await asyncio.sleep(600)

    def _on_task_done(task: asyncio.Task) -> None:
        try:
            task.result()
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("background task %s failed: %s", task.get_name(), exc)

    @app.on_event("startup")
    async def _start_keepalive() -> None:
        t1 = asyncio.create_task(_run_weekly_leaderboard_payouts(), name="weekly_payouts")
        t2 = asyncio.create_task(_recover_pending_invoices(), name="invoice_recovery")
        t1.add_done_callback(_on_task_done)
        t2.add_done_callback(_on_task_done)
        render_url = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
        if render_url:
            t3 = asyncio.create_task(_keepalive_loop(f"{render_url}/api/health"), name="keepalive")
            t3.add_done_callback(_on_task_done)
            logger.info("keepalive task started → %s/api/health (every 10 min)", render_url)
