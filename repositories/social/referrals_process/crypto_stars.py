"""Premium через CryptoPay и Stars — USDT рефереру."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from config import (
    REFERRAL_PCT_SUB_RANK_1_10,
    REFERRAL_PCT_SUB_RANK_11_30,
    REFERRAL_PCT_SUB_RANK_31_PLUS,
)


class SocialReferralCryptoStarsMixin:
    def process_referral_crypto_premium(self, buyer_id: int, usdt_paid: float) -> Dict[str, Any]:
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id:
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT first_premium_at FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if row and row["first_premium_at"]:
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
            reward_usdt = round(usdt_paid * pct / 100, 4)
            if reward_usdt > 0:
                cursor.execute(
                    "UPDATE players SET referral_usdt_balance = COALESCE(referral_usdt_balance, 0) + ? WHERE user_id = ?",
                    (reward_usdt, referrer_id),
                )
            cursor.execute(
                "INSERT INTO referral_rewards (referrer_id, buyer_id, reward_type, percent, reward_usdt) VALUES (?, ?, 'crypto_premium', ?, ?)",
                (referrer_id, buyer_id, pct, reward_usdt),
            )
            conn.commit()
            out.update({"ok": True, "referrer_id": referrer_id, "reward_usdt": reward_usdt, "rank": rank, "percent": pct})
            return out
        finally:
            conn.close()

    def process_referral_stars_premium(self, buyer_id: int, stars_paid: int) -> Dict[str, Any]:
        STAR_TO_USDT = 0.013
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id:
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT first_premium_at FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if row and row["first_premium_at"]:
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
            reward_usdt = round(stars_paid * STAR_TO_USDT * pct / 100, 4)
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "UPDATE players SET first_premium_at = ?, referral_subscriber_rank = ?, referral_tier = ? WHERE user_id = ?",
                (now, rank, tier, buyer_id),
            )
            if reward_usdt > 0:
                cursor.execute(
                    "UPDATE players SET referral_usdt_balance = COALESCE(referral_usdt_balance,0) + ? WHERE user_id = ?",
                    (reward_usdt, referrer_id),
                )
            cursor.execute(
                "INSERT INTO referral_rewards (referrer_id, buyer_id, reward_type, percent, base_stars, reward_usdt) VALUES (?, ?, 'stars_premium', ?, ?, ?)",
                (referrer_id, buyer_id, pct, stars_paid, reward_usdt),
            )
            conn.commit()
            out.update({"ok": True, "referrer_id": referrer_id, "reward_usdt": reward_usdt, "rank": rank, "percent": pct})
            return out
        finally:
            conn.close()
