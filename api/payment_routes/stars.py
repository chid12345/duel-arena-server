from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from api.payment_routes.models import StarsConfirmBody, StarsInvoiceBody

logger = logging.getLogger(__name__)


def register_stars_routes(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    manager = ctx["manager"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    _send_tg_message = ctx["_send_tg_message"]
    _notify_paid_full_reset = ctx["_notify_paid_full_reset"]
    STARS_PACKAGES = ctx["STARS_PACKAGES"]
    STARS_SCROLL_PACKAGES = ctx["STARS_SCROLL_PACKAGES"]
    BOT_TOKEN = ctx["BOT_TOKEN"]
    PREMIUM_XP_BONUS_PERCENT = ctx["PREMIUM_XP_BONUS_PERCENT"]

    def _find_stars_scroll(package_id: str):
        return next((p for p in STARS_SCROLL_PACKAGES if p["id"] == package_id), None)

    @router.post("/api/shop/stars_confirm")
    async def stars_confirm(body: StarsConfirmBody):
        try:
            return await _stars_confirm_inner(body)
        except HTTPException as e:
            return {"ok": False, "reason": e.detail}
        except Exception as e:
            logger.error("stars_confirm unhandled: %s", e)
            return {"ok": False, "reason": f"Ошибка сервера: {type(e).__name__}"}

    async def _stars_confirm_inner(body: StarsConfirmBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])

        # Свиток/ящик за Stars
        scroll_pkg = _find_stars_scroll(body.package_id)
        if scroll_pkg:
            scroll_id = scroll_pkg["scroll_id"]
            scroll_stars = scroll_pkg["stars"]
            # Проверяем что Telegram действительно подтвердил оплату
            if not db.check_stars_bot_payment(uid, f"scroll:{scroll_id}"):
                logger.warning("stars_confirm scroll not_verified uid=%s pkg=%s", uid, body.package_id)
                fresh = db.get_or_create_player(uid, "")
                return {"ok": False, "reason": "not_verified", "player": _player_api(dict(fresh))}
            # Дедуп: выдаём только один раз через mini app
            if db.mark_stars_tma_delivered(uid, f"scroll:{scroll_id}", scroll_stars):
                db.add_to_inventory(uid, scroll_id)
                try:
                    _vs = db.process_referral_vip_shop_purchase(uid, stars=scroll_stars)
                    if _vs.get("ok") and _vs.get("reward_usdt"):
                        await _send_tg_message(_vs["referrer_id"], f"💰 <b>Реферальный бонус!</b>\nВаш приглашённый купил свиток за Stars.\n<b>+{_vs['reward_usdt']:.4f} USDT</b> ({_vs.get('percent', 0)}% ранг {_vs.get('rank', 1)})\n\n⚔️ Duel Arena")
                except Exception as _ve:
                    logger.error("vip_shop scroll stars uid=%s: %s", uid, _ve)
                is_box = scroll_id.startswith("box_")
                label = scroll_pkg["label"]
                kind = "Ящик" if is_box else "Свиток"
                await _send_tg_message(uid, f"📜 <b>{kind} получен!</b>\n{label}\n\nОткройте «Герой → Моё → Особые» ⚔️ Duel Arena")
            await manager.send(uid, {"event": "scroll_received", "scroll_id": scroll_id, "source": "stars"})
            fresh = db.get_or_create_player(uid, "")
            return {"ok": True, "scroll_received": True, "scroll_id": scroll_id, "player": _player_api(dict(fresh))}

        pkg = next((p for p in STARS_PACKAGES if p["id"] == body.package_id), None)
        if not pkg:
            return {"ok": False, "reason": "Пакет не найден"}

        diamonds = pkg["diamonds"]
        stars = pkg["stars"]

        # Для всех типов требуем подтверждение от Telegram-бота (anti-exploit)
        bot_key = body.package_id  # "premium", "d100", "full_reset" и т.д.
        if not db.check_stars_bot_payment(uid, bot_key):
            logger.warning("stars_confirm not_verified uid=%s pkg=%s", uid, body.package_id)
            fresh = db.get_or_create_player(uid, "")
            return {"ok": False, "reason": "not_verified", "player": _player_api(dict(fresh))}

        if pkg.get("full_reset"):
            # Сброс ВСЕГДА запускаем при подтверждённом bot-платеже
            # (check_stars_bot_payment выше). wipe идемпотентен, поэтому
            # повторный запуск безопасен. Раньше mark_stars_tma_delivered
            # с окном 15 мин по package_id блокировал второй сброс в течение
            # тех же 15 мин (фронт получал profile_reset=True, но в БД
            # ничего не менялось → премиум/вещи оставались). Запись в
            # stars_payments остаётся для аудита, но не гейтит wipe.
            db.mark_stars_tma_delivered(uid, bot_key, stars)
            await _notify_paid_full_reset(uid)
            fresh = db.get_or_create_player(uid, "")
            return {"ok": True, "profile_reset": True, "player": _player_api(dict(fresh))}

        if pkg.get("first_purchase"):
            # Анти-эксплойт уже проверен выше (check_stars_bot_payment). Начисление
            # идемпотентно: mark_* ставит флаг пакета атомарно, поэтому если бот
            # уже выдал (этот же платёж) — credited=False, и это НЕ ошибка.
            credited = db.mark_diamond_first_purchased(uid, diamonds)
            await manager.send(uid, {"event": "diamonds_credited", "diamonds": diamonds, "source": "stars_first"})
            if credited:
                await _send_tg_message(uid,
                    f"💎 <b>+{diamonds} алмазов зачислено!</b>\n"
                    "🔥 Скидка первой покупки использована.\n\n"
                    "⚔️ Duel Arena")
            fresh = db.get_or_create_player(uid, "")
            return {
                "ok": True,
                "diamonds_added": diamonds if credited else 0,
                "already_credited": not credited,
                "player": _player_api(dict(fresh)),
            }

        is_premium = pkg["id"] == "premium"
        if is_premium:
            prem = db.get_premium_status(uid)
            if prem["is_active"]:
                fresh = db.get_or_create_player(uid, "")
                return {"ok": False, "reason": f"Premium уже активен ещё {prem['days_left']} дн.", "player": _player_api(dict(fresh))}
            prem_result = db.activate_premium(uid, days=21)
            bonus_d = prem_result.get("bonus_diamonds", 0)
            days_left = prem_result.get("days_left", 21)
            try:
                ref_res = db.process_referral_stars_premium(uid, stars)
                if ref_res.get("ok"):
                    await _send_tg_message(
                        ref_res["referrer_id"],
                        f"💰 <b>Реферальный бонус!</b>\n"
                        f"Ваш приглашённый купил Premium за Telegram Stars.\n"
                        f"<b>+{ref_res['reward_usdt']:.4f} USDT</b> добавлено на ваш баланс.\n"
                        f"Выведите через раздел «Рефералка» в игре.\n\n"
                        f"⚔️ Duel Arena",
                    )
            except Exception as e:
                logger.error("process_referral_stars_premium error: %s", e)
            await manager.send(uid, {"event": "premium_activated", "days_left": days_left, "bonus_diamonds": bonus_d, "source": "stars"})
            bonus_txt = f"\n💎 Бонус при покупке: <b>+{bonus_d} алмазов</b>" if bonus_d > 0 else ""
            await _send_tg_message(
                uid,
                f"👑 <b>Premium подписка активирована!</b>\n"
                f"Срок действия: <b>{days_left} дней</b>{bonus_txt}\n"
                f"📈 Опыт и золото за бои: <b>+{PREMIUM_XP_BONUS_PERCENT}%</b>\n\n"
                f"Спасибо за покупку! ⚔️ Duel Arena",
            )
            fresh = db.get_or_create_player(uid, "")
            return {
                "ok": True,
                "diamonds_added": bonus_d,
                "premium_activated": True,
                "premium_days_left": days_left,
                "bonus_diamonds": bonus_d,
                "player": _player_api(dict(fresh)),
            }

        result = db.confirm_stars_payment(uid, body.package_id, diamonds, stars)
        try:
            _vs = db.process_referral_vip_shop_purchase(uid, stars=stars)
            if _vs.get("ok") and _vs.get("reward_usdt"):
                await _send_tg_message(_vs["referrer_id"], f"💰 <b>Реферальный бонус!</b>\nВаш приглашённый купил <b>{diamonds}</b> 💎 за Stars.\n<b>+{_vs['reward_usdt']:.4f} USDT</b> ({_vs.get('percent', 0)}% ранг {_vs.get('rank', 1)})\n\n⚔️ Duel Arena")
        except Exception as _ve:
            logger.error("vip_shop diamonds stars uid=%s: %s", uid, _ve)
        if result.get("ok") and diamonds > 0:
            await manager.send(uid, {"event": "diamonds_credited", "diamonds": diamonds, "source": "stars"})
            await _send_tg_message(uid, f"💎 <b>+{diamonds} алмазов зачислено!</b>\nОплата через Telegram Stars подтверждена.\n\n⚔️ Duel Arena")
        fresh = db.get_or_create_player(uid, "")
        return {
            "ok": True,
            "diamonds_added": diamonds,
            "already_credited": result.get("reason") == "already_credited",
            "player": _player_api(dict(fresh)),
        }

    @router.post("/api/shop/stars_invoice")
    async def stars_invoice(body: StarsInvoiceBody):
        try:
            return await _stars_invoice_inner(body)
        except HTTPException as e:
            return {"ok": False, "reason": e.detail}
        except Exception as e:
            logger.error("stars_invoice unhandled: %s", e)
            return {"ok": False, "reason": f"Ошибка сервера: {type(e).__name__}"}

    async def _stars_invoice_inner(body: StarsInvoiceBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен (нет BOT_TOKEN)"}

        # Свиток/ящик за Stars
        scroll_pkg = _find_stars_scroll(body.package_id)
        if scroll_pkg:
            stars = scroll_pkg["stars"]
            scroll_id = scroll_pkg["scroll_id"]
            is_box = scroll_id.startswith("box_")
            payload = f"stars_scroll:{scroll_id}"
            title = scroll_pkg["label"]
            desc = f"{'Эпический ящик' if is_box else 'Боевой свиток'} в Duel Arena"
            import httpx
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink",
                        json={"title": title, "description": desc, "payload": payload, "currency": "XTR", "prices": [{"label": title, "amount": stars}]},
                    )
                    data = resp.json()
                if data.get("ok"):
                    return {"ok": True, "invoice_url": data["result"]}
                logger.error("createInvoiceLink scroll error: %s", data)
                return {"ok": False, "reason": "Telegram отклонил запрос"}
            except Exception as e:
                logger.error("Stars scroll invoice HTTP error: %s", e)
                return {"ok": False, "reason": "Ошибка соединения с Telegram"}

        pkg = next((p for p in STARS_PACKAGES if p["id"] == body.package_id), None)
        if not pkg:
            return {"ok": False, "reason": "Пакет не найден"}

        stars_amount = int(pkg["stars"])  # может быть переопределён скидкой ниже
        if pkg.get("full_reset"):
            payload = "stars_full_reset"
            title = "Сброс прогресса"
            desc = "Полный сброс до новичка (вещи, образы, Premium тоже). Останутся золото, алмазы, клан, рефералы и USDT за рефералов"
        elif pkg.get("first_purchase"):
            if not db.is_diamond_first_available(uid):
                fresh = db.get_or_create_player(uid, "")
                return {"ok": False, "reason": "Скидка первой покупки уже использована.", "player": _player_api(dict(fresh))}
            payload = f"diamond_first_{pkg['diamonds']}"
            title = f"{pkg['diamonds']} алмазов · первая покупка"
            desc = f"{pkg['diamonds']} 💎 алмазов со скидкой первой покупки · Duel Arena"
        elif pkg["id"] == "premium":
            payload = "premium_sub"
            # Скидка 50% на ПЕРВУЮ покупку Premium (этап 9, как у алмазов).
            # Цена считается на сервере при создании инвойса — фронт не может
            # подделать. Одноразово: после активации premium_until заполнен.
            if db.is_premium_first_available(uid):
                stars_amount = int(pkg["stars"]) // 2
                title = "Premium −50% (первый раз)"
                desc = f"Duel Arena Premium со скидкой 50%: +{PREMIUM_XP_BONUS_PERCENT}% опыта/золота, ящик, премиум-награды пасса"
            else:
                title = "Premium подписка"
                desc = f"Duel Arena Premium: +{PREMIUM_XP_BONUS_PERCENT}% опыта/золота и прочие бонусы"
        else:
            payload = f"diamonds_{pkg['diamonds']}"
            title = f"{pkg['diamonds']} алмазов"
            desc = f"{pkg['diamonds']} 💎 алмазов в Duel Arena"

        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink",
                    json={
                        "title": title,
                        "description": desc,
                        "payload": payload,
                        "currency": "XTR",
                        "prices": [{"label": title, "amount": stars_amount}],
                    },
                )
                data = resp.json()
            if data.get("ok"):
                return {"ok": True, "invoice_url": data["result"]}
            logger.error("createInvoiceLink error: %s", data)
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("Stars invoice HTTP error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения с Telegram"}
