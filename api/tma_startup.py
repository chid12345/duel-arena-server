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
            from api.payment_routes.recovery_deliver import deliver_recovery_payload
            loop = asyncio.get_event_loop()

            async def _deliver(uid: int, inv_id: int, payload: str, diamonds: int = 0,
                               amount: str = "0", asset: str = "USDT") -> bool:
                return await deliver_recovery_payload(
                    db,
                    manager=manager,
                    send_tg_message=_send_tg_message,
                    cache_invalidate=_cache_invalidate,
                    loop=loop,
                    uid=uid,
                    inv_id=inv_id,
                    payload=payload,
                    diamonds=diamonds,
                    amount=amount,
                    asset=asset,
                )

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
                    # ":diamond_first:N" в payload → пометить колонку первой покупки
                    # ДО confirm (так же как делают crypto_check и crypto_webhook).
                    # Без этого invoice'ы, доехавшие только через recovery, оставались
                    # без флага → игрок мог второй раз получить скидку на тот же пакет.
                    payload = str(inv.get("payload") or "")
                    _diamond_first_col = None
                    if ":diamond_first:" in payload:
                        try:
                            _df_n = int(payload.split(":diamond_first:", 1)[1].strip())
                            if _df_n > 0:
                                if _df_n <= 100:
                                    _diamond_first_col = "diamond_first_100"
                                elif _df_n <= 300:
                                    _diamond_first_col = "diamond_first_300"
                                else:
                                    _diamond_first_col = "diamond_first_500"
                        except (ValueError, IndexError):
                            _diamond_first_col = None
                    result = await loop.run_in_executor(
                        None,
                        lambda i=inv_id, c=_diamond_first_col: db.confirm_crypto_invoice(i, first_purchase_col=c),
                    )
                    if not result.get("ok"):
                        continue
                    uid = int(result["user_id"])
                    logger.info("invoice recovery: confirmed invoice=%s uid=%s first_col=%s", inv_id, uid, _diamond_first_col)
                    if await _deliver(uid, inv_id, payload, int(result.get("diamonds") or 0),
                                       amount=str(result.get("amount") or "0"),
                                       asset=str(result.get("asset") or "USDT")):
                        await loop.run_in_executor(None, db.mark_items_delivered, inv_id)

            # Phase 2: PAID но items_delivered=0 — выдать без повторного confirm
            undelivered = await loop.run_in_executor(None, db.get_paid_undelivered_invoices, 60)
            for inv in undelivered:
                uid = int(inv["user_id"])
                inv_id = inv["invoice_id"]
                payload = str(inv.get("payload") or "")
                logger.info("delivery recovery: undelivered invoice=%s uid=%s", inv_id, uid)
                if await _deliver(uid, inv_id, payload, int(inv.get("diamonds") or 0),
                                   amount=str(inv.get("amount") or "0"),
                                   asset=str(inv.get("asset") or "USDT")):
                    await loop.run_in_executor(None, db.mark_items_delivered, inv_id)
        except Exception as exc:
            logger.warning("invoice recovery failed: %s", exc)

    async def _referral_auto_reconcile_loop() -> None:
        """Подстраховка реферальной комиссии: каждые 60 секунд проверяем
        не пропустил ли какой из путей доставки (webhook/check/recovery)
        вызов process_referral_*. Идемпотентно (дедуп по first_premium_at
        для премиума и по invoice_id для shop). Шлёт рефереру уведомление
        с правильным текстом — реферер видит результат В ТЕЧЕНИЕ МИНУТЫ
        даже если все мгновенные пути почему-то промахнулись.
        Цель: чтобы игроку никогда не приходилось руками жать /reconcile_refs.
        """
        await asyncio.sleep(30)  # дать серверу прогреться
        loop = asyncio.get_event_loop()
        while True:
            try:
                prem = await loop.run_in_executor(None, db.reconcile_all_premium_referrals)
                shop = await loop.run_in_executor(None, db.reconcile_all_shop_referrals)
                for c in prem.get("credited", []) or []:
                    reward = float(c.get("reward_usdt") or 0)
                    rid = c.get("referrer_id")
                    if reward > 0 and rid:
                        await _send_tg_message(
                            rid,
                            "💰 <b>Реферальный бонус!</b>\n"
                            "Ваш приглашённый купил <b>Premium</b>.\n"
                            f"<b>+{reward:.4f} USDT</b> добавлено на ваш баланс.\n\n⚔️ Duel Arena",
                        )
                for c in shop.get("credited", []) or []:
                    reward = float(c.get("reward_usdt") or 0)
                    rid = c.get("referrer_id")
                    if reward > 0 and rid:
                        await _send_tg_message(
                            rid,
                            "💰 <b>Реферальный бонус!</b>\n"
                            "Ваш приглашённый совершил покупку в магазине (USDT).\n"
                            f"<b>+{reward:.4f} USDT</b> добавлено на ваш баланс.\n\n⚔️ Duel Arena",
                        )
            except Exception as exc:
                logger.warning("referral auto reconcile failed: %s", exc)
            await asyncio.sleep(60)

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
        # Реферальная авто-страховка каждые 60 секунд — догоняет любую покупку,
        # которую пропустили все 3 мгновенных пути доставки. Игроку НЕ нужно
        # руками жать /reconcile_refs — система сама шлёт уведомление и USDT.
        t_ref = asyncio.create_task(_referral_auto_reconcile_loop(), name="referral_auto_reconcile")
        t_ref.add_done_callback(_on_task_done)
        logger.info("referral auto-reconcile task started (every 60s)")
        render_url = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
        if render_url:
            t3 = asyncio.create_task(_keepalive_loop(f"{render_url}/api/health"), name="keepalive")
            t3.add_done_callback(_on_task_done)
            logger.info("keepalive task started → %s/api/health (every 10 min)", render_url)
