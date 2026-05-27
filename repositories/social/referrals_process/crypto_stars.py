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
            cursor.execute("SELECT first_premium_at, referral_tier FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if row and row["first_premium_at"]:
                # Продление — только обновляем is_premium, без повторных наград
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
            now = datetime.utcnow().isoformat()
            reward_usdt = round(usdt_paid * pct / 100, 4)
            # Фиксируем первую покупку — чтобы игрок считался "платящим" в статистике
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
                "INSERT INTO referral_rewards (referrer_id, buyer_id, reward_type, percent, reward_usdt) VALUES (?, ?, 'crypto_premium', ?, ?)",
                (referrer_id, buyer_id, pct, reward_usdt),
            )
            conn.commit()
            out.update({"ok": True, "referrer_id": referrer_id, "reward_usdt": reward_usdt, "rank": rank, "percent": pct, "tier": tier})
            return out
        finally:
            conn.close()

    def reconcile_premium_referral(self, buyer_id: int) -> Dict[str, Any]:
        """Доплатить рефереру за Premium, КУПЛЕННЫЙ ДО появления реф-связи.

        Корень бага: комиссия считалась РОВНО в момент подтверждения оплаты и
        только если у покупателя УЖЕ был реферер. Если игрок зашёл по реф-ссылке
        ПОЗЖЕ покупки (или премиум выдал recovery-цикл, который реферала не звал) —
        комиссия терялась навсегда. Этот метод вызывается при регистрации реферала
        и при доставке премиума recovery/already_paid: если есть ОПЛАЧЕННЫЙ
        premium-инвойс, а комиссия ещё не выдана (first_premium_at пуст) —
        начисляет её задним числом. Идемпотентно: повторный вызов после успешной
        выплаты упрётся в guard first_premium_at внутри process_referral_crypto_premium.
        """
        out: Dict[str, Any] = {"ok": False}
        if not self.get_referrer_id(buyer_id):
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Если первая премиум-комиссия уже выдана — реконсилить нечего.
            cursor.execute("SELECT first_premium_at FROM players WHERE user_id = ?", (buyer_id,))
            prow = cursor.fetchone()
            if prow and prow["first_premium_at"]:
                return out
            # Самый свежий ОПЛАЧЕННЫЙ premium-инвойс этого покупателя (USDT).
            # % в LIKE — параметром (Postgres-совместимо).
            cursor.execute(
                "SELECT amount FROM crypto_invoices WHERE user_id = ? AND status = 'paid' "
                "AND UPPER(asset) = 'USDT' AND payload LIKE ? ORDER BY paid_at DESC LIMIT 1",
                (buyer_id, "%:premium:%"),
            )
            row = cursor.fetchone()
        finally:
            conn.close()
        if not row:
            return out
        try:
            usdt_paid = float(row["amount"] or 0)
        except (TypeError, ValueError):
            usdt_paid = 0.0
        if usdt_paid <= 0:
            return out
        return self.process_referral_crypto_premium(buyer_id, usdt_paid)

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
