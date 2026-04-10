"""Первый Premium покупателя и награда рефереру (алмазы)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from config import (
    REFERRAL_PCT_SUB_RANK_1_10,
    REFERRAL_PCT_SUB_RANK_11_30,
    REFERRAL_PCT_SUB_RANK_31_PLUS,
)


class SocialReferralFirstPremiumMixin:
    def process_referral_first_premium(self, buyer_id: int, stars_paid: int) -> Dict[str, Any]:
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT first_premium_at FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if row and row["first_premium_at"]:
                cursor.execute("UPDATE players SET is_premium = 1 WHERE user_id = ?", (buyer_id,))
            else:
                cursor.execute(
                    "UPDATE players SET is_premium = 1, first_premium_at = ? WHERE user_id = ?",
                    (datetime.utcnow().isoformat(), buyer_id),
                )
            conn.commit()
            conn.close()
            out["ok"] = True
            out["no_referrer"] = True
            out["renewal"] = bool(row and row["first_premium_at"])
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT first_premium_at, referral_tier FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if not row:
                return out
            if row["first_premium_at"]:
                cursor.execute("UPDATE players SET is_premium = 1 WHERE user_id = ?", (buyer_id,))
                conn.commit()
                out["ok"] = True
                out["renewal"] = True
                return out
            cursor.execute(
                "SELECT COUNT(*) AS c FROM referrals r INNER JOIN players p ON p.user_id = r.referred_id "
                "WHERE r.referrer_id = ? AND p.first_premium_at IS NOT NULL",
                (referrer_id,),
            )
            rank = int(cursor.fetchone()["c"]) + 1
            pct = (
                REFERRAL_PCT_SUB_RANK_1_10
                if rank <= 10
                else (REFERRAL_PCT_SUB_RANK_11_30 if rank <= 30 else REFERRAL_PCT_SUB_RANK_31_PLUS)
            )
            tier = "vip" if rank >= 31 else "early"
            reward_d = int(stars_paid * pct / 100)
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "UPDATE players SET first_premium_at = ?, referral_subscriber_rank = ?, referral_tier = ?, is_premium = 1 WHERE user_id = ?",
                (now, rank, tier, buyer_id),
            )
            if reward_d > 0:
                cursor.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (reward_d, referrer_id))
            cursor.execute(
                "INSERT INTO referral_rewards (referrer_id, buyer_id, reward_type, percent, base_stars, reward_diamonds) "
                "VALUES (?, ?, 'first_premium', ?, ?, ?)",
                (referrer_id, buyer_id, pct, stars_paid, reward_d),
            )
            conn.commit()
            out.update(
                {"ok": True, "referrer_id": referrer_id, "reward_diamonds": reward_d, "rank": rank, "percent": pct}
            )
            return out
        finally:
            conn.close()
