"""Уведомления рефереру и разметка покупателя."""

import logging
from html import escape as html_escape

from database import db

logger = logging.getLogger(__name__)


class BotHandlersReferralNotify:
    @staticmethod
    def _referral_buyer_label_html(user_id: int) -> str:
        p = db.get_or_create_player(user_id, "")
        un = (p.get("username") or "").strip()
        if un:
            return f"@{html_escape(un)}"
        return f"id {user_id}"

    @staticmethod
    async def notify_referrer_join(bot, referrer_id: int, new_user):
        """Сообщение рефереру: кто-то зашёл по ссылке (нужен chat_id реферера)."""
        cid = db.get_player_chat_id(referrer_id)
        if not cid:
            return
        un = (new_user.username or "").strip()
        if un:
            line = f"👋 По вашей ссылке зашёл игрок: <b>@{html_escape(un)}</b>"
        else:
            fn = html_escape(new_user.first_name or "игрок")
            line = f"👋 По вашей ссылке зашёл игрок: <b>{fn}</b> (id {new_user.id})"
        try:
            await bot.send_message(chat_id=cid, text=line, parse_mode="HTML")
        except Exception as exc:
            logger.warning("referrer join notify failed: %s", exc)

    @staticmethod
    async def notify_referrer_stars_payment(bot, buyer_id: int, payload: str, diamonds: int, stars: int, ref: dict):
        """Рефереру: реферал что-то купил за Stars + награда, если есть."""
        rid = db.get_referrer_id(buyer_id)
        if not rid:
            return
        cid = db.get_player_chat_id(rid)
        if not cid:
            return
        label = BotHandlersReferralNotify._referral_buyer_label_html(buyer_id)
        if payload == "premium_sub":
            if ref.get("renewal"):
                head = f"💳 Ваш реферал {label} продлил <b>Premium</b>."
            else:
                head = f"💳 Ваш реферал {label} купил <b>Premium</b> подписку."
        else:
            head = f"💳 Ваш реферал {label} купил <b>{diamonds}</b> 💎 за Stars ({stars}⭐)."
        tails = []
        if ref.get("reward_diamonds"):
            tails.append(f"Вам: +{ref['reward_diamonds']} 💎")
        if ref.get("reward_gold"):
            tails.append(f"Вам: +{ref['reward_gold']} 💰")
        if (
            ref.get("rank") is not None
            and ref.get("reward_diamonds", 0) == 0
            and ref.get("reward_gold", 0) == 0
            and not ref.get("renewal")
        ):
            tails.append(f"Платящий реферал №{ref['rank']} (первая подписка).")
        text = head
        if tails:
            text += "\n" + " · ".join(tails)
        try:
            await bot.send_message(chat_id=cid, text=text, parse_mode="HTML")
        except Exception as exc:
            logger.warning("referrer stars notify failed: %s", exc)

    @staticmethod
    async def notify_referrer_gold_shop(bot, buyer_id: int, item_key: str, ref_r: dict):
        """Рефереру: покупка за золото / алмазы в игровом магазине."""
        rid = db.get_referrer_id(buyer_id)
        if not rid:
            return
        cid = db.get_player_chat_id(rid)
        if not cid:
            return
        label = BotHandlersReferralNotify._referral_buyer_label_html(buyer_id)
        titles = {
            "hp_potion": "зелье HP",
            "xp_boost": "XP-буст",
            "stat_reset": "сброс статов",
        }
        what = titles.get(item_key, item_key)
        head = f"🛒 Ваш реферал {label} купил в магазине: <b>{what}</b>."
        tails = []
        if ref_r.get("reward_diamonds"):
            tails.append(f"Вам: +{ref_r['reward_diamonds']} 💎")
        if ref_r.get("reward_gold"):
            tails.append(f"Вам: +{ref_r['reward_gold']} 💰")
        text = head
        if tails:
            text += "\n" + " · ".join(tails)
        try:
            await bot.send_message(chat_id=cid, text=text, parse_mode="HTML")
        except Exception as exc:
            logger.warning("referrer gold shop notify failed: %s", exc)
