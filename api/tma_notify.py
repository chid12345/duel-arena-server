"""Уведомления в Telegram и сброс профиля после оплаты (TMA)."""

from __future__ import annotations

import logging

from config import BOT_TOKEN

from api.tma_infra import _cache_invalidate, manager

logger = logging.getLogger(__name__)


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
    """Сброс прогресса после оплаты USDT: золото, алмазы, клан и рефералка сохраняются."""
    from battle_system import battle_system
    from database import db

    try:
        battle_system.force_abandon_battle(uid)
    except Exception as e:
        logger.warning("force_abandon before full reset uid=%s: %s", uid, e)
    db.wipe_player_profile(uid, keep_wallet_clan_and_referrals=True)
    battle_system.mark_profile_reset(uid, ttl_seconds=600)
    _cache_invalidate(uid)
    db.get_or_create_player(uid, "")
    db.log_metric_event("paid_full_reset", uid, value=1)
    try:
        await manager.send(uid, {"event": "profile_reset", "source": "cryptopay_usdt"})
    except Exception as e:
        logger.warning("ws profile_reset uid=%s: %s", uid, e)
    await _send_tg_message(
        uid,
        "🔄 <b>Прогресс сброшен</b>\n"
        "Оплата USDT получена. Уровень и бои — с нуля; <b>золото, алмазы, клан и реферальная программа</b> сохранены.\n"
        "Откройте /start или Mini App.\n\n"
        "⚔️ Duel Arena",
    )
