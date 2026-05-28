"""Реферальная комиссия за shop-покупки (алмазы/свитки/аватарки/etc.)
за реальные деньги (USDT или Stars).

Единая шкала по рангу (с v2.23.33, решение игрока):
- 1-10 платящих → 5%
- 11-30      → 7%
- 31+ (VIP)  → 10%

Раньше тут был жёсткий VIP-гейт (платили только при referral_tier == 'vip',
все остальные получали 0). По итогам аудита решено убрать гейт и платить
всем рефереррам по той же лестнице, что и за Premium — единая, понятная
шкала, без путаницы «за алмазы платят только избранным».

Курс Stars→USDT исправлен с 0.013 на 0.015 (= реальный курс магазина
1$ = 67⭐ из CRYPTO/STARS_PACKAGES; раньше 0.013 занижал на ~13%).

Имя функции/типа награды оставлены как 'vip_shop' для совместимости со старой
схемой referral_rewards и существующими вызовами в платёжных хэндлерах.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from config import (
    REFERRAL_PCT_SUB_RANK_1_10,
    REFERRAL_PCT_SUB_RANK_11_30,
    REFERRAL_PCT_SUB_RANK_31_PLUS,
)

# Курс Stars→USDT по магазину: $1 ≈ 67⭐ (см. PREMIUM_SUBSCRIPTION_STARS = 536 за $8).
STAR_TO_USDT = 0.015


def _rank_to_pct(rank: int) -> int:
    if rank <= 10:
        return REFERRAL_PCT_SUB_RANK_1_10
    if rank <= 30:
        return REFERRAL_PCT_SUB_RANK_11_30
    return REFERRAL_PCT_SUB_RANK_31_PLUS


class SocialReferralVipShopMixin:
    def process_referral_vip_shop_purchase(
        self,
        buyer_id: int,
        *,
        stars: int = 0,
        usdt: float = 0.0,
        invoice_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Начислить рефереру USDT-комиссию со shop-покупки реферала.

        Ставка по рангу платящих рефералов реферера (5/7/10%).
        Stars пересчитываются в USDT по курсу 0.015 (магазинный).
        invoice_id — для дедупликации при бэкафилле (если задан, повторный
        вызов с тем же invoice_id ничего не платит).
        """
        out: Dict[str, Any] = {"ok": False}
        referrer_id = self.get_referrer_id(buyer_id)
        if not referrer_id:
            return out
        if stars <= 0 and usdt <= 0.0:
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Дедупликация по invoice_id: если за этот инвойс комиссия уже выплачена — выходим.
            if invoice_id is not None:
                cursor.execute(
                    "SELECT 1 FROM referral_rewards WHERE referrer_id = ? AND invoice_id = ? LIMIT 1",
                    (referrer_id, invoice_id),
                )
                if cursor.fetchone():
                    return out
            # Ранг реферера = сколько у него платящих (премиум-) рефералов.
            # Минимум 1: даже без премиум-рефералов первая покупка идёт по ставке 1-10.
            cursor.execute(
                "SELECT COUNT(*) AS c FROM referrals r INNER JOIN players p ON p.user_id = r.referred_id "
                "WHERE r.referrer_id = ? AND p.first_premium_at IS NOT NULL",
                (referrer_id,),
            )
            rank = max(1, int(cursor.fetchone()["c"]))
            pct = _rank_to_pct(rank)
            base_usdt = stars * STAR_TO_USDT + float(usdt)
            reward_usdt = round(base_usdt * pct / 100, 4)
            if reward_usdt <= 0:
                return out
            cursor.execute(
                "UPDATE players SET referral_usdt_balance = COALESCE(referral_usdt_balance, 0) + ? WHERE user_id = ?",
                (reward_usdt, referrer_id),
            )
            cursor.execute(
                "INSERT INTO referral_rewards "
                "(referrer_id, buyer_id, reward_type, percent, base_stars, reward_usdt, invoice_id) "
                "VALUES (?, ?, 'vip_shop', ?, ?, ?, ?)",
                (referrer_id, buyer_id, pct, stars, reward_usdt, invoice_id),
            )
            conn.commit()
            out.update({
                "ok": True,
                "referrer_id": referrer_id,
                "reward_usdt": reward_usdt,
                "rank": rank,
                "percent": pct,
            })
            return out
        finally:
            conn.close()
