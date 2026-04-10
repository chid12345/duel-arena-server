"""Профиль: сводка статов, welcome-текст, отправка карточки."""

import io
import logging
from html import escape as html_escape

from telegram import InputMediaPhoto

from config import *
from database import db
from profile_card import generate_profile_card
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


class CallbackHandlersProfileUi:
    @staticmethod
    def _combat_stats_summary(player: dict) -> str:
        """Строка с реальными % уворота/крита/брони/урона для экрана статов."""
        lv = int(player.get("level", 1))
        s = int(player.get("strength", PLAYER_START_STRENGTH))
        agi = int(player.get("endurance", PLAYER_START_ENDURANCE))
        intu = int(player.get("crit", PLAYER_START_CRIT))
        mhp = int(player.get("max_hp", PLAYER_START_MAX_HP))

        tf = total_free_stats_at_level(lv)
        avg_agi = max(1, PLAYER_START_ENDURANCE + tf // 4)
        avg_intu = max(1, PLAYER_START_CRIT + tf // 4)

        dodge_pct = min(DODGE_MAX_CHANCE, agi / (agi + avg_agi) * DODGE_MAX_CHANCE) * 100
        crit_pct = min(CRIT_MAX_CHANCE, intu / (intu + avg_intu) * CRIT_MAX_CHANCE) * 100

        stamina = stamina_stats_invested(mhp, lv)
        armor_pct = (
            min(ARMOR_ABSOLUTE_MAX, stamina / (stamina + ARMOR_STAMINA_K_ABS)) * 100 if stamina > 0 else 0
        )

        dmg = int(STRENGTH_DAMAGE_FLAT_PER_LEVEL * lv + STRENGTH_DAMAGE_SCALE * (s ** STRENGTH_DAMAGE_POWER))

        return (
            f"⚔️ Урон: ~{dmg}  |  🛡 Броня: -{armor_pct:.0f}%\n"
            f"🤸 Уворот: ~{dodge_pct:.0f}%  |  💥 Крит: ~{crit_pct:.0f}%\n"
            f"<i>(уворот и крит — против равного противника)</i>"
        )

    @staticmethod
    def _hp_status_line(player: dict) -> str:
        """Строка HP с инфо о регене. Если не полное — показывает темп и ETA."""
        mh = int(player.get("max_hp", PLAYER_START_MAX_HP))
        ch = int(player.get("current_hp", mh))
        inv = stamina_stats_invested(mh, player.get("level", 1))
        if ch >= mh:
            return f"{ch}/{mh} ✅"
        endurance_mult = 1.0 + inv * HP_REGEN_ENDURANCE_BONUS
        regen_per_min = round(mh / HP_REGEN_BASE_SECONDS * endurance_mult * 60, 1)
        hp_missing = mh - ch
        secs_to_full = int(hp_missing / max(0.001, mh / HP_REGEN_BASE_SECONDS * endurance_mult))
        mins, secs = divmod(secs_to_full, 60)
        eta = f"{mins}м {secs}с" if mins else f"{secs}с"
        return f"{ch}/{mh}  ⏱ +{regen_per_min} HP/мин · полное через {eta}"

    @staticmethod
    def _welcome_html(player: dict, username: str) -> str:
        """Главный экран: профиль, персонаж (эмодзи), статы. HTML."""
        u = html_escape(username or "Боец")
        inv = stamina_stats_invested(player["max_hp"], player["level"])
        return (
            f"{MESSAGES['welcome']}\n\n"
            f"👤 <b>Боец:</b> {u}\n"
            f"📊 <b>Уровень:</b> {player['level']} · 💰 <b>Золото:</b> {player['gold']}\n"
            f"🏆 <b>Рейтинг:</b> {player['rating']}\n\n"
            f"🧍 <b>Ваш персонаж</b>\n"
            f"💪 <b>Сила:</b> {player['strength']}\n"
            f"🤸 <b>Ловкость:</b> {player['endurance']}\n"
            f"💥 <b>Интуиция:</b> {player.get('crit', PLAYER_START_CRIT)}\n"
            f"❤️ <b>Выносливость:</b> {inv} · {CallbackHandlersProfileUi._hp_status_line(player)}\n\n"
            f"⭐ <b>Опыт:</b> {format_exp_progress(player['exp'], player['level'])}\n"
            f"💎 <b>Алмазы:</b> {player['diamonds']}\n"
            f"🔥 <b>Побед:</b> {player['wins']}\n"
            f"💔 <b>Поражений:</b> {player['losses']}"
        )

    @staticmethod
    async def _send_profile_card(
        target, player: dict, username: str, reply_markup, is_message=False, extra_text: str = ""
    ):
        """
        Отправить/обновить карточку профиля как фото.
        target: update.message (is_message=True) или query (callback).
        """
        from handlers.ui_helpers import CallbackHandlers

        player = dict(player)
        player.setdefault("username", username)
        img_bytes = generate_profile_card(player)
        caption = extra_text or ""

        if is_message:
            try:
                await tg_api_call(
                    target.reply_photo,
                    photo=img_bytes,
                    caption=caption or None,
                    reply_markup=reply_markup,
                    parse_mode="HTML",
                )
            except Exception as e:
                logger.warning("profile_card send failed, fallback to text: %s", e)
                text = CallbackHandlers._welcome_html(player, username)
                await tg_api_call(target.reply_text, text, reply_markup=reply_markup, parse_mode="HTML")
            return

        msg = target.message
        if msg and msg.photo:
            try:
                media = InputMediaPhoto(
                    media=img_bytes,
                    caption=caption or None,
                    parse_mode="HTML",
                )
                await tg_api_call(target.edit_message_media, media=media, reply_markup=reply_markup)
                return
            except Exception as e:
                logger.warning("edit_message_media failed: %s", e)
        try:
            if msg:
                try:
                    await msg.delete()
                except Exception:
                    pass
            chat_id = msg.chat_id if msg else target.from_user.id
            bot = target.get_bot()
            await tg_api_call(
                bot.send_photo,
                chat_id=chat_id,
                photo=img_bytes,
                caption=caption or None,
                reply_markup=reply_markup,
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("profile_card send_photo failed, fallback to text: %s", e)
            text = CallbackHandlers._welcome_html(player, username)
            try:
                await CallbackHandlers._callback_set_message(
                    target, text, reply_markup=reply_markup, parse_mode="HTML",
                )
            except Exception:
                pass
