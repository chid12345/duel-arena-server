"""Premium через CryptoPay и Stars — USDT-комиссия рефереру.

Реконсиляция/бэкафилл живут в reconcile.py — здесь ТОЛЬКО мгновенная
обработка в момент платежа.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from config import (
    REFERRAL_PCT_SUB_RANK_1_10,
    REFERRAL_PCT_SUB_RANK_11_30,
    REFERRAL_PCT_SUB_RANK_31_PLUS,
)

# Реальный курс магазина: $1 ≈ 67⭐ (Premium 536⭐ = $8 → 0.01493). Раньше
# в коде стояло 0.013 — занижало комиссию за Stars-покупки на ~13%.
STAR_TO_USDT = 0.015


def _rank_to_pct(rank: int) -> int:
    if rank <= 10:
        return REFERRAL_PCT_SUB_RANK_1_10
    if rank <= 30:
        return REFERRAL_PCT_SUB_RANK_11_30
    return REFERRAL_PCT_SUB_RANK_31_PLUS


class SocialReferralCryptoStarsMixin:
    def process_referral_crypto_premium(
        self, buyer_id: int, usdt_paid: float, *, invoice_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Начислить рефереру USDT-комиссию за оплаченный реферой Premium (CryptoPay).
        Идемпотентность: guard first_premium_at (выставляется при первой выплате;
        повторный вызов возвращает renewal без оплаты).
        invoice_id — для трассировки/дедупликации в referral_rewards (опционально).
        """
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id:
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT first_premium_at, referral_tier FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if row and row["first_premium_at"]:
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
            pct = _rank_to_pct(rank)
            tier = "vip" if rank >= 31 else "early"
            now = datetime.utcnow().isoformat()
            reward_usdt = round(float(usdt_paid) * pct / 100, 4)
            cursor.execute(
                "UPDATE players SET is_premium = 1, first_premium_at = ?, referral_subscriber_rank = ?, referral_tier = ? WHERE user_id = ?",
                (now, rank, tier, buyer_id),
            )
            if reward_usdt > 0:
                cursor.execute(
                    "UPDATE players SET referral_usdt_balance = COALESCE(referral_usdt_balance, 0) + ? WHERE user_id = ?",
                    (reward_usdt, referrer_id),
                )
            cursor.execute(
                "INSERT INTO referral_rewards (referrer_id, buyer_id, reward_type, percent, reward_usdt, invoice_id) "
                "VALUES (?, ?, 'crypto_premium', ?, ?, ?)",
                (referrer_id, buyer_id, pct, reward_usdt, invoice_id),
            )
            conn.commit()
            out.update({"ok": True, "referrer_id": referrer_id, "reward_usdt": reward_usdt, "rank": rank, "percent": pct, "tier": tier})
            return out
        finally:
            conn.close()

    def process_referral_stars_premium(
        self, buyer_id: int, stars_paid: int, *, invoice_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Начислить рефереру USDT-комиссию за оплаченный реферой Premium (Stars).
        Stars пересчитываются в USDT по курсу 0.015 (магазинный).
        """
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
            pct = _rank_to_pct(rank)
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
                "INSERT INTO referral_rewards (referrer_id, buyer_id, reward_type, percent, base_stars, reward_usdt, invoice_id) "
                "VALUES (?, ?, 'stars_premium', ?, ?, ?, ?)",
                (referrer_id, buyer_id, pct, stars_paid, reward_usdt, invoice_id),
            )
            conn.commit()
            out.update({"ok": True, "referrer_id": referrer_id, "reward_usdt": reward_usdt, "rank": rank, "percent": pct})
            return out
        finally:
            conn.close()
