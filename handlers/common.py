"""
handlers/common.py — общие утилиты, используемые всеми хендлерами.
"""

import asyncio
import logging
import time
from html import escape as html_escape
from typing import Optional, Tuple
from telegram.error import BadRequest, NetworkError, RetryAfter, TimedOut

from config import *

logger = logging.getLogger(__name__)


def _referral_milestone_bar(paying: int, width: int = 12) -> str:
    """Полоска прогресса до 30 платящих (без цифр — только шкала)."""
    cap = 30
    filled = min(width, int(width * min(int(paying), cap) / cap))
    return "█" * filled + "░" * (width - filled)


def _referral_program_html(
    bot_username: str,
    ref_code: str,
    stats: dict,
    recent_rows: list,
) -> str:
    """Экран реферальной программы: ссылка в pre/code для копирования в Telegram, правила, статистика."""
    invite_url = f"https://t.me/{bot_username}?start={ref_code}"
    ps = int(stats.get("paying_subscribers") or 0)
    inv = int(stats.get("invited_count") or 0)
    d = int(stats.get("total_reward_diamonds") or 0)
    g = int(stats.get("total_reward_gold") or 0)
    bar = _referral_milestone_bar(ps)

    if ps < 10:
        tier_line = f"{REFERRAL_PCT_SUB_RANK_1_10}% разово за первую Premium подписку"
        hint = f"ещё <b>{10 - ps}</b> платящих → уровень <b>{REFERRAL_PCT_SUB_RANK_11_30}%</b>"
    elif ps < 30:
        tier_line = f"{REFERRAL_PCT_SUB_RANK_11_30}% разово за первую Premium"
        hint = f"ещё <b>{30 - ps}</b> платящих → уровень <b>{REFERRAL_PCT_SUB_RANK_31_PLUS}%</b> и бонус с магазина"
    else:
        tier_line = (
            f"{REFERRAL_PCT_SUB_RANK_31_PLUS}% за первую Premium + "
            f"{REFERRAL_PCT_VIP_ALL_SHOP}% с покупок у VIP-приглашённых"
        )
        hint = "максимальный уровень реферальных %"

    lines = [
        "👥 <b>РЕФЕРАЛЬНАЯ ПРОГРАММА</b>",
        "──────────────",
        "",
        "🔗 <b>Твоя ссылка</b>",
        f"<pre>{html_escape(invite_url)}</pre>",
        "<i>Нажми на серый блок — скопируется весь адрес.</i>",
        "",
        "🔗 <b>Код приглашения</b> (коротко)",
        f"<code>{html_escape(ref_code)}</code>",
        "",
        "📊 <b>Статистика</b>",
        f"👤 Всего пришло: <b>{inv}</b>",
        f"💳 Из них платили: <b>{ps}</b>",
        f"💎 Алмазы: <b>{d}</b> · 💰 Золото: <b>{g}</b>",
        "",
        "🏆 <b>Твой уровень</b>",
        tier_line,
        f"<code>{bar}</code>",
        hint,
        "",
        "💡 <b>Как работает</b>",
        f"• 1–10 платящих → <b>{REFERRAL_PCT_SUB_RANK_1_10}%</b> с первой Premium (разово)",
        (
            f"• 11–30 → <b>{REFERRAL_PCT_SUB_RANK_11_30}%</b> (разово) | "
            f"31+ → <b>{REFERRAL_PCT_SUB_RANK_31_PLUS}%</b> и <b>{REFERRAL_PCT_VIP_ALL_SHOP}%</b> "
            f"с покупок у VIP-приглашённых"
        ),
        "",
        "🔔 Уведомления в личку: когда друг зашёл по ссылке и при его покупках.",
    ]
    if recent_rows:
        lines.append("")
        lines.append("👤 <b>Последние рефералы</b>")
        for r in recent_rows:
            un = (r.get("username") or "").strip()
            if un:
                lines.append(f"⭐ @{html_escape(un)}")
            else:
                lines.append(f"⭐ id {r['referred_id']}")
    return "\n".join(lines)


# Один ход боя на пользователя — защита от дублей при быстрых нажатиях
_battle_turn_locks: dict[int, asyncio.Lock] = {}

def _battle_turn_lock(user_id: int) -> asyncio.Lock:
    if user_id not in _battle_turn_locks:
        _battle_turn_locks[user_id] = asyncio.Lock()
    return _battle_turn_locks[user_id]

def _telegram_message_unchanged(exc: BaseException) -> bool:
    """Telegram не даёт edit, если текст/клавиатура совпадают — это не ошибка логики."""
    msg = (getattr(exc, "message", None) or str(exc) or "").lower()
    return "message is not modified" in msg


async def tg_api_call(call, *args, retries: int = 3, base_delay: float = 0.4, **kwargs):
    """Надёжный вызов Telegram API с retry/backoff (BadRequest не ретраим — это логика API)."""
    for attempt in range(retries):
        try:
            return await call(*args, **kwargs)
        except BadRequest:
            raise
        except RetryAfter as exc:
            wait_seconds = float(getattr(exc, "retry_after", 1.0))
            await asyncio.sleep(wait_seconds + 0.1)
        except (TimedOut, NetworkError):
            if attempt == retries - 1:
                raise
            await asyncio.sleep(base_delay * (2 ** attempt))

class RateLimiter:
    """Простой in-memory rate limiter для антифлуда."""

    _last_request = {}

    @classmethod
    def is_allowed(cls, user_id: int, action: str, min_interval: float) -> bool:
        now = time.monotonic()
        key = (user_id, action)
        last_seen = cls._last_request.get(key, 0.0)

        if now - last_seen < min_interval:
            return False

        cls._last_request[key] = now
        return True
