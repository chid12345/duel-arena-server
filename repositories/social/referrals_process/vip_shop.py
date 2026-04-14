"""VIP-покупки за реальные деньги (Stars / USDT) — доля рефереру в USDT."""

from __future__ import annotations

from typing import Any, Dict

from config import REFERRAL_PCT_VIP_ALL_SHOP

STAR_TO_USDT = 0.013


class SocialReferralVipShopMixin:
    def process_referral_vip_shop_purchase(
        self, buyer_id: int, *, stars: int = 0, usdt: float = 0.0
    ) -> Dict[str, Any]:
        """10% USDT рефереру, если покупатель — VIP-реферал (31-й платящий и дальше).
        Считаются только реальные деньги: Stars (→ USDT по 0.013) и USDT напрямую.
        Золото и алмазы (игровая валюта) — не считаются.
        """
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id:
            return out
        if stars <= 0 and usdt <= 0.0:
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT referral_tier FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if not row or row["referral_tier"] != "vip":
                return out
            pct = REFERRAL_PCT_VIP_ALL_SHOP
            reward_usdt = round((stars * STAR_TO_USDT + usdt) * pct / 100, 4)
            if reward_usdt <= 0:
                return out
            cursor.execute(
                "UPDATE players SET referral_usdt_balance = COALESCE(referral_usdt_balance, 0) + ? WHERE user_id = ?",
                (reward_usdt, referrer_id),
            )
            cursor.execute(
                "INSERT INTO referral_rewards "
                "(referrer_id, buyer_id, reward_type, percent, base_stars, reward_usdt) "
                "VALUES (?, ?, 'vip_shop', ?, ?, ?)",
                (referrer_id, buyer_id, pct, stars, reward_usdt),
            )
            conn.commit()
            out.update({"ok": True, "referrer_id": referrer_id, "reward_usdt": reward_usdt})
            return out
        finally:
            conn.close()
