"""Реферальные коды, регистрация, статистика."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


class SocialReferralCoreMixin:
    """Коды, связи, счётчики рефералов."""

    def get_referral_code(self, user_id: int) -> str:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT referral_code FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        code = row["referral_code"] if row else None
        if not code:
            code = f"ref_{uuid.uuid4().hex[:10]}"
            cursor.execute("UPDATE players SET referral_code = ? WHERE user_id = ?", (code, user_id))
            conn.commit()
        conn.close()
        return code

    def get_referrer_id(self, referred_id: int) -> Optional[int]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT referrer_id FROM referrals WHERE referred_id = ?", (referred_id,))
        row = cursor.fetchone()
        conn.close()
        return int(row["referrer_id"]) if row else None

    def get_referral_stats(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM referrals WHERE referrer_id = ?", (user_id,))
        invited_count = cursor.fetchone()["cnt"]
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM referrals r INNER JOIN players p ON p.user_id = r.referred_id "
            "WHERE r.referrer_id = ? AND p.first_premium_at IS NOT NULL",
            (user_id,),
        )
        paying_subscribers = cursor.fetchone()["cnt"]
        cursor.execute(
            "SELECT COALESCE(SUM(reward_diamonds), 0) AS d, COALESCE(SUM(reward_gold), 0) AS g, "
            "COALESCE(SUM(reward_usdt), 0) AS u FROM referral_rewards WHERE referrer_id = ?",
            (user_id,),
        )
        rw = cursor.fetchone()
        cursor.execute(
            "SELECT COALESCE(referral_usdt_balance, 0) AS bal, last_withdrawal_at FROM players WHERE user_id = ?",
            (user_id,),
        )
        bal_row = cursor.fetchone()
        conn.close()
        balance = round(float(bal_row["bal"] if bal_row else 0), 4)
        cooldown_hours = 0
        last_wd = bal_row["last_withdrawal_at"] if bal_row else None
        if last_wd:
            try:
                last_dt = datetime.fromisoformat(str(last_wd))
                elapsed = (datetime.utcnow() - last_dt).total_seconds()
                if elapsed < 86400:
                    cooldown_hours = max(1, int((86400 - elapsed) / 3600) + 1)
            except Exception:
                pass
        return {
            "invited_count": invited_count,
            "paying_subscribers": paying_subscribers,
            "total_reward_diamonds": int(rw["d"] or 0),
            "total_reward_gold": int(rw["g"] or 0),
            "total_reward_usdt": round(float(rw["u"] or 0), 4),
            "usdt_balance": balance,
            "can_withdraw": balance >= 5.0 and cooldown_hours == 0,
            "cooldown_hours": cooldown_hours,
        }

    def get_recent_referrals(self, referrer_id: int, limit: int = 3) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT r.referred_id, p.username FROM referrals r INNER JOIN players p ON p.user_id = r.referred_id "
            "WHERE r.referrer_id = ? ORDER BY r.created_at DESC LIMIT ?",
            (referrer_id, int(limit)),
        )
        rows = cursor.fetchall()
        conn.close()
        return [{"referred_id": int(row["referred_id"]), "username": (row["username"] or "").strip()} for row in rows]

    def register_referral(self, new_user_id: int, referral_code: str) -> Tuple[bool, Optional[int]]:
        import logging as _log
        _logger = _log.getLogger(__name__)
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT user_id FROM players WHERE referral_code = ?", (referral_code,))
            referrer_row = cursor.fetchone()
            if not referrer_row:
                _logger.info("register_referral: code not found uid=%s code=%s", new_user_id, referral_code)
                return False, None
            referrer_id = referrer_row["user_id"]
            if referrer_id == new_user_id:
                return False, None
            cursor.execute("SELECT referred_by FROM players WHERE user_id = ?", (new_user_id,))
            rb = cursor.fetchone()
            if rb and rb["referred_by"]:
                _logger.info("register_referral: already referred uid=%s", new_user_id)
                return False, None
            cursor.execute("SELECT 1 FROM referrals WHERE referred_id = ?", (new_user_id,))
            if cursor.fetchone():
                _logger.info("register_referral: already in table uid=%s", new_user_id)
                return False, None
            # plain INSERT — без OR IGNORE, чтобы не зависеть от UNIQUE constraint в PG
            try:
                cursor.execute(
                    "INSERT INTO referrals (referral_code, referrer_id, referred_id) VALUES (?, ?, ?)",
                    (referral_code, referrer_id, new_user_id),
                )
                cursor.execute(
                    "UPDATE players SET referred_by = ? WHERE user_id = ?",
                    (referral_code, new_user_id),
                )
                conn.commit()
            except Exception as _e:
                _logger.error("register_referral INSERT failed uid=%s code=%s: %s", new_user_id, referral_code, _e)
                try:
                    conn.rollback()
                except Exception:
                    pass
                return False, None
            return True, int(referrer_id)
        finally:
            conn.close()
