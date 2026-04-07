"""
repositories/social.py — кланы, клановый чат, реферальная система,
Stars/CryptoPay платежи, выплаты рефереров.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


class SocialMixin:
    """Mixin: кланы, рефералы, платежи."""

    CLAN_CREATE_COST_GOLD = 200
    WITHDRAW_MIN_USDT  = 5.0
    WITHDRAW_COOLDOWN  = 86400  # 24 часа

    # ── Кланы ─────────────────────────────────────────────────────────────────

    def create_clan(self, leader_id: int, name: str, tag: str) -> Dict[str, Any]:
        tag = tag.upper()[:4]
        if len(name) < 3 or len(name) > 20:
            return {"ok": False, "reason": "Имя клана: 3–20 символов"}
        if len(tag) < 2 or len(tag) > 4:
            return {"ok": False, "reason": "Тег клана: 2–4 символа"}
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (leader_id,))
        row = cursor.fetchone()
        if row and row["clan_id"]:
            conn.close(); return {"ok": False, "reason": "Вы уже состоите в клане"}
        cursor.execute("SELECT gold FROM players WHERE user_id = ?", (leader_id,))
        gold_row = cursor.fetchone()
        if not gold_row or gold_row["gold"] < self.CLAN_CREATE_COST_GOLD:
            conn.close(); return {"ok": False, "reason": f"Нужно {self.CLAN_CREATE_COST_GOLD} золота"}
        try:
            if self._pg:
                cursor.execute(
                    "INSERT INTO clans (name, tag, leader_id) VALUES (%s, %s, %s) RETURNING id",
                    (name, tag, leader_id),
                )
                clan_id = int(cursor.fetchone()["id"])
            else:
                cursor.execute("INSERT INTO clans (name, tag, leader_id) VALUES (?, ?, ?)", (name, tag, leader_id))
                clan_id = int(cursor.lastrowid)
            cursor.execute("INSERT INTO clan_members (user_id, clan_id, role) VALUES (?, ?, 'leader')", (leader_id, clan_id))
            cursor.execute("UPDATE players SET gold = gold - ?, clan_id = ? WHERE user_id = ?", (self.CLAN_CREATE_COST_GOLD, clan_id, leader_id))
            conn.commit()
            return {"ok": True, "clan_id": clan_id, "name": name, "tag": tag}
        except Exception:
            conn.rollback()
            return {"ok": False, "reason": "Клан с таким именем или тегом уже существует"}
        finally:
            conn.close()

    def join_clan(self, user_id: int, clan_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row and row["clan_id"]:
            conn.close(); return {"ok": False, "reason": "Вы уже состоите в клане"}
        cursor.execute("SELECT id, name FROM clans WHERE id = ?", (clan_id,))
        clan = cursor.fetchone()
        if not clan:
            conn.close(); return {"ok": False, "reason": "Клан не найден"}
        cursor.execute("SELECT COUNT(*) as cnt FROM clan_members WHERE clan_id = ?", (clan_id,))
        if cursor.fetchone()["cnt"] >= 20:
            conn.close(); return {"ok": False, "reason": "Клан полон (макс. 20 человек)"}
        cursor.execute("INSERT INTO clan_members (user_id, clan_id) VALUES (?, ?)", (user_id, clan_id))
        cursor.execute("UPDATE players SET clan_id = ? WHERE user_id = ?", (clan_id, user_id))
        conn.commit(); conn.close()
        return {"ok": True, "clan_name": clan["name"]}

    def leave_clan(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or not row["clan_id"]:
            conn.close(); return {"ok": False, "reason": "Вы не в клане"}
        clan_id = row["clan_id"]
        cursor.execute("SELECT leader_id FROM clans WHERE id = ?", (clan_id,))
        clan = cursor.fetchone()
        if clan and clan["leader_id"] == user_id:
            conn.close(); return {"ok": False, "reason": "Лидер не может покинуть клан. Сначала передайте лидерство."}
        cursor.execute("DELETE FROM clan_members WHERE user_id = ?", (user_id,))
        cursor.execute("UPDATE players SET clan_id = NULL WHERE user_id = ?", (user_id,))
        conn.commit(); conn.close()
        return {"ok": True}

    def get_clan_info(self, clan_id: int) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clans WHERE id = ?", (clan_id,))
        clan = cursor.fetchone()
        if not clan:
            conn.close(); return None
        cursor.execute(
            "SELECT cm.user_id, cm.role, p.username, p.level, p.wins FROM clan_members cm "
            "JOIN players p ON p.user_id = cm.user_id WHERE cm.clan_id = ? ORDER BY cm.role DESC, p.wins DESC",
            (clan_id,),
        )
        members = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return {"clan": dict(clan), "members": members}

    def search_clans(self, query_str: str, limit: int = 5) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT c.id, c.name, c.tag, c.level, c.wins, "
            "(SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count "
            "FROM clans c WHERE c.name LIKE ? OR c.tag LIKE ? ORDER BY c.wins DESC LIMIT ?",
            (f"%{query_str}%", f"%{query_str}%", limit),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def transfer_clan_leader(self, leader_id: int, new_leader_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id FROM clans WHERE leader_id = ?", (leader_id,))
            clan_row = cursor.fetchone()
            if not clan_row:
                return {"ok": False, "reason": "Вы не являетесь лидером клана"}
            clan_id = clan_row["id"]
            if new_leader_id == leader_id:
                return {"ok": False, "reason": "Вы уже являетесь лидером"}
            cursor.execute("SELECT user_id FROM clan_members WHERE user_id = ? AND clan_id = ?", (new_leader_id, clan_id))
            if not cursor.fetchone():
                return {"ok": False, "reason": "Игрок не является участником вашего клана"}
            cursor.execute("UPDATE clans SET leader_id = ? WHERE id = ?", (new_leader_id, clan_id))
            cursor.execute("UPDATE clan_members SET role = 'leader' WHERE user_id = ? AND clan_id = ?", (new_leader_id, clan_id))
            cursor.execute("UPDATE clan_members SET role = 'member' WHERE user_id = ? AND clan_id = ?", (leader_id, clan_id))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    def send_clan_message(self, clan_id: int, user_id: int, username: str, message: str) -> bool:
        message = (message or "").strip()[:200]
        if not message:
            return False
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT 1 FROM clan_members WHERE user_id = ? AND clan_id = ?", (user_id, clan_id))
            if not cursor.fetchone():
                return False
            cursor.execute(
                "INSERT INTO clan_messages (clan_id, user_id, username, message) VALUES (?, ?, ?, ?)",
                (clan_id, user_id, username, message),
            )
            conn.commit()
            return True
        finally:
            conn.close()

    def get_clan_messages(self, clan_id: int, limit: int = 40) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id, user_id, username, message, strftime('%H:%M', created_at) AS time_str "
                "FROM clan_messages WHERE clan_id = ? ORDER BY created_at DESC LIMIT ?",
                (clan_id, int(limit)),
            )
            rows = cursor.fetchall()
            return [dict(r) for r in reversed(rows)]
        finally:
            conn.close()

    # ── Реферальная система ───────────────────────────────────────────────────

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
            "SELECT COALESCE(SUM(reward_diamonds), 0) AS d, COALESCE(SUM(reward_gold), 0) AS g, COALESCE(SUM(reward_usdt), 0) AS u "
            "FROM referral_rewards WHERE referrer_id = ?",
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
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT user_id FROM players WHERE referral_code = ?", (referral_code,))
            referrer_row = cursor.fetchone()
            if not referrer_row:
                return False, None
            referrer_id = referrer_row["user_id"]
            if referrer_id == new_user_id:
                return False, None
            cursor.execute("SELECT referred_by FROM players WHERE user_id = ?", (new_user_id,))
            rb = cursor.fetchone()
            if rb and rb["referred_by"]:
                return False, None
            cursor.execute("SELECT 1 FROM referrals WHERE referred_id = ?", (new_user_id,))
            if cursor.fetchone():
                return False, None
            cursor.execute(
                "INSERT OR IGNORE INTO referrals (referral_code, referrer_id, referred_id) VALUES (?, ?, ?)",
                (referral_code, referrer_id, new_user_id),
            )
            cursor.execute("UPDATE players SET referred_by = ? WHERE user_id = ?", (referral_code, new_user_id))
            conn.commit()
            return True, int(referrer_id)
        finally:
            conn.close()

    def request_referral_withdrawal(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COALESCE(referral_usdt_balance, 0) AS bal, username, last_withdrawal_at FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                return {"ok": False, "reason": "Игрок не найден"}
            balance = round(float(row["bal"]), 4)
            if balance < self.WITHDRAW_MIN_USDT:
                return {"ok": False, "reason": f"Минимум для вывода: ${self.WITHDRAW_MIN_USDT:.0f} USDT (у вас ${balance:.2f})", "balance": balance}
            if row["last_withdrawal_at"]:
                try:
                    elapsed = (datetime.utcnow() - datetime.fromisoformat(str(row["last_withdrawal_at"]))).total_seconds()
                    if elapsed < self.WITHDRAW_COOLDOWN:
                        remaining_h = max(1, int((self.WITHDRAW_COOLDOWN - elapsed) / 3600) + 1)
                        return {"ok": False, "reason": f"Следующий вывод через {remaining_h}ч (раз в сутки)", "cooldown_hours": remaining_h}
                except Exception:
                    pass
            return {"ok": True, "amount": balance, "username": row["username"] or ""}
        finally:
            conn.close()

    def confirm_referral_withdrawal(self, user_id: int, amount: float) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "UPDATE players SET referral_usdt_balance = MAX(0, COALESCE(referral_usdt_balance,0) - ?), last_withdrawal_at = ? WHERE user_id = ?",
                (amount, now, user_id),
            )
            cursor.execute(
                "INSERT INTO referral_withdrawals (user_id, amount, status, processed_at) VALUES (?, ?, 'completed', ?)",
                (user_id, amount, now),
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    def process_referral_first_premium(self, buyer_id: int, stars_paid: int) -> Dict[str, Any]:
        from config import REFERRAL_PCT_SUB_RANK_1_10, REFERRAL_PCT_SUB_RANK_11_30, REFERRAL_PCT_SUB_RANK_31_PLUS
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id:
            conn = self.get_connection(); cursor = conn.cursor()
            cursor.execute("SELECT first_premium_at FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if row and row["first_premium_at"]:
                cursor.execute("UPDATE players SET is_premium = 1 WHERE user_id = ?", (buyer_id,))
            else:
                cursor.execute("UPDATE players SET is_premium = 1, first_premium_at = ? WHERE user_id = ?", (datetime.utcnow().isoformat(), buyer_id))
            conn.commit(); conn.close()
            out["ok"] = True; out["no_referrer"] = True; out["renewal"] = bool(row and row["first_premium_at"])
            return out
        conn = self.get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("SELECT first_premium_at, referral_tier FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if not row: return out
            if row["first_premium_at"]:
                cursor.execute("UPDATE players SET is_premium = 1 WHERE user_id = ?", (buyer_id,))
                conn.commit(); out["ok"] = True; out["renewal"] = True; return out
            cursor.execute(
                "SELECT COUNT(*) AS c FROM referrals r INNER JOIN players p ON p.user_id = r.referred_id "
                "WHERE r.referrer_id = ? AND p.first_premium_at IS NOT NULL",
                (referrer_id,),
            )
            rank = int(cursor.fetchone()["c"]) + 1
            pct = REFERRAL_PCT_SUB_RANK_1_10 if rank <= 10 else (REFERRAL_PCT_SUB_RANK_11_30 if rank <= 30 else REFERRAL_PCT_SUB_RANK_31_PLUS)
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
                "INSERT INTO referral_rewards (referrer_id, buyer_id, reward_type, percent, base_stars, reward_diamonds) VALUES (?, ?, 'first_premium', ?, ?, ?)",
                (referrer_id, buyer_id, pct, stars_paid, reward_d),
            )
            conn.commit()
            out.update({"ok": True, "referrer_id": referrer_id, "reward_diamonds": reward_d, "rank": rank, "percent": pct})
            return out
        finally:
            conn.close()

    def process_referral_vip_shop_purchase(self, buyer_id: int, *, stars: int = 0, gold: int = 0, diamonds: int = 0) -> Dict[str, Any]:
        from config import REFERRAL_PCT_VIP_ALL_SHOP
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id or (stars <= 0 and gold <= 0 and diamonds <= 0):
            return out
        conn = self.get_connection(); cursor = conn.cursor()
        cursor.execute("SELECT referral_tier FROM players WHERE user_id = ?", (buyer_id,))
        row = cursor.fetchone()
        if not row or row["referral_tier"] != "vip":
            conn.close(); return out
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
                    "INSERT INTO referral_rewards (referrer_id, buyer_id, reward_type, percent, base_stars, base_gold, base_diamonds, reward_diamonds, reward_gold) VALUES (?, ?, 'vip_shop', ?, ?, ?, ?, ?, ?)",
                    (referrer_id, buyer_id, pct, stars, gold, diamonds, reward_d, reward_g),
                )
            conn.commit()
            out.update({"ok": True, "referrer_id": referrer_id, "reward_diamonds": reward_d, "reward_gold": reward_g})
            return out
        finally:
            conn.close()

    def process_referral_crypto_premium(self, buyer_id: int, usdt_paid: float) -> Dict[str, Any]:
        from config import REFERRAL_PCT_SUB_RANK_1_10, REFERRAL_PCT_SUB_RANK_11_30, REFERRAL_PCT_SUB_RANK_31_PLUS
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id: return out
        conn = self.get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("SELECT first_premium_at FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if row and row["first_premium_at"]: return out
            cursor.execute(
                "SELECT COUNT(*) AS c FROM referrals r INNER JOIN players p ON p.user_id = r.referred_id "
                "WHERE r.referrer_id = ? AND p.first_premium_at IS NOT NULL",
                (referrer_id,),
            )
            rank = int(cursor.fetchone()["c"]) + 1
            pct = REFERRAL_PCT_SUB_RANK_1_10 if rank <= 10 else (REFERRAL_PCT_SUB_RANK_11_30 if rank <= 30 else REFERRAL_PCT_SUB_RANK_31_PLUS)
            reward_usdt = round(usdt_paid * pct / 100, 4)
            if reward_usdt > 0:
                cursor.execute("UPDATE players SET referral_usdt_balance = COALESCE(referral_usdt_balance, 0) + ? WHERE user_id = ?", (reward_usdt, referrer_id))
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
        from config import REFERRAL_PCT_SUB_RANK_1_10, REFERRAL_PCT_SUB_RANK_11_30, REFERRAL_PCT_SUB_RANK_31_PLUS
        STAR_TO_USDT = 0.013
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id: return out
        conn = self.get_connection(); cursor = conn.cursor()
        try:
            cursor.execute("SELECT first_premium_at FROM players WHERE user_id = ?", (buyer_id,))
            row = cursor.fetchone()
            if row and row["first_premium_at"]: return out
            cursor.execute(
                "SELECT COUNT(*) AS c FROM referrals r INNER JOIN players p ON p.user_id = r.referred_id "
                "WHERE r.referrer_id = ? AND p.first_premium_at IS NOT NULL",
                (referrer_id,),
            )
            rank = int(cursor.fetchone()["c"]) + 1
            pct = REFERRAL_PCT_SUB_RANK_1_10 if rank <= 10 else (REFERRAL_PCT_SUB_RANK_11_30 if rank <= 30 else REFERRAL_PCT_SUB_RANK_31_PLUS)
            tier = "vip" if rank >= 31 else "early"
            reward_usdt = round(stars_paid * STAR_TO_USDT * pct / 100, 4)
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "UPDATE players SET first_premium_at = ?, referral_subscriber_rank = ?, referral_tier = ? WHERE user_id = ?",
                (now, rank, tier, buyer_id),
            )
            if reward_usdt > 0:
                cursor.execute("UPDATE players SET referral_usdt_balance = COALESCE(referral_usdt_balance,0) + ? WHERE user_id = ?", (reward_usdt, referrer_id))
            cursor.execute(
                "INSERT INTO referral_rewards (referrer_id, buyer_id, reward_type, percent, base_stars, reward_usdt) VALUES (?, ?, 'stars_premium', ?, ?, ?)",
                (referrer_id, buyer_id, pct, stars_paid, reward_usdt),
            )
            conn.commit()
            out.update({"ok": True, "referrer_id": referrer_id, "reward_usdt": reward_usdt, "rank": rank, "percent": pct})
            return out
        finally:
            conn.close()

    # ── Telegram Stars и CryptoPay ────────────────────────────────────────────

    def confirm_stars_payment(self, user_id: int, package_id: str, diamonds: int, stars: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id FROM stars_payments WHERE user_id = ? AND package_id = ? AND created_at > datetime('now', '-5 minutes')",
                (user_id, package_id),
            )
            if cursor.fetchone():
                return {"ok": False, "reason": "already_credited"}
            if diamonds > 0:
                cursor.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (diamonds, user_id))
            cursor.execute(
                "INSERT INTO stars_payments (user_id, package_id, diamonds, stars, source) VALUES (?, ?, ?, ?, 'tma')",
                (user_id, package_id, diamonds, stars),
            )
            conn.commit()
            return {"ok": True, "diamonds": diamonds}
        finally:
            conn.close()

    def create_crypto_invoice(self, user_id: int, invoice_id: int, diamonds: int, asset: str, amount: str) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT OR IGNORE INTO crypto_invoices (invoice_id, user_id, diamonds, asset, amount, status) VALUES (?, ?, ?, ?, ?, 'pending')",
                (invoice_id, user_id, diamonds, asset.upper(), amount),
            )
            conn.commit()
        finally:
            conn.close()

    def confirm_crypto_invoice(self, invoice_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, diamonds, asset, amount, status FROM crypto_invoices WHERE invoice_id = ?",
                (invoice_id,),
            )
            row = cursor.fetchone()
            if not row: return {"ok": False, "reason": "invoice_not_found"}
            if row["status"] == "paid": return {"ok": False, "reason": "already_paid"}
            if row["status"] != "pending": return {"ok": False, "reason": f"wrong_status:{row['status']}"}
            user_id = int(row["user_id"]); diamonds = int(row["diamonds"])
            cursor.execute(
                "UPDATE crypto_invoices SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE invoice_id = ? AND status = 'pending'",
                (invoice_id,),
            )
            if cursor.rowcount == 0:
                conn.commit(); return {"ok": False, "reason": "already_paid"}
            cursor.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (diamonds, user_id))
            conn.commit()
            return {"ok": True, "user_id": user_id, "diamonds": diamonds, "asset": str(row["asset"] or "TON"), "amount": str(row["amount"] or "0")}
        finally:
            conn.close()

    def get_pending_crypto_invoices_older_than(self, seconds: int) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT invoice_id, user_id, diamonds, asset, amount, created_at FROM crypto_invoices "
                "WHERE status = 'pending' AND created_at < datetime('now', ? || ' seconds') ORDER BY created_at ASC LIMIT 50",
                (f"-{seconds}",),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()
