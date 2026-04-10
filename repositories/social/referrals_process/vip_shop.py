"""VIP-покупки в магазине — доля рефереру."""

from __future__ import annotations

from typing import Any, Dict

from config import REFERRAL_PCT_VIP_ALL_SHOP


class SocialReferralVipShopMixin:
    def process_referral_vip_shop_purchase(
        self, buyer_id: int, *, stars: int = 0, gold: int = 0, diamonds: int = 0
    ) -> Dict[str, Any]:
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id or (stars <= 0 and gold <= 0 and diamonds <= 0):
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT referral_tier FROM players WHERE user_id = ?", (buyer_id,))
        row = cursor.fetchone()
        if not row or row["referral_tier"] != "vip":
            conn.close()
            return out
        pct = REFERRAL_PCT_VIP_ALL_SHOP
        reward_d = int(stars * pct / 100) + int(diamonds * pct / 100)
        reward_g = int(gold * pct / 100)
        try:
            if reward_d > 0:
                cursor.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (reward_d, referrer_id))
            if reward_g > 0:
                cursor.execute("UPDATE players SET gold = gold + ? WHERE user_id = ?", (reward_g, referrer_id))
            if reward_d > 0 or reward_g > 0:
                cursor.execute(
                    "INSERT INTO referral_rewards (referrer_id, buyer_id, reward_type, percent, base_stars, base_gold, base_diamonds, reward_diamonds, reward_gold) "
                    "VALUES (?, ?, 'vip_shop', ?, ?, ?, ?, ?, ?)",
                    (referrer_id, buyer_id, pct, stars, gold, diamonds, reward_d, reward_g),
                )
            conn.commit()
            out.update({"ok": True, "referrer_id": referrer_id, "reward_diamonds": reward_d, "reward_gold": reward_g})
            return out
        finally:
            conn.close()
