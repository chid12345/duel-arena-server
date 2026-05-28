"""Бэкафилл реферальной комиссии задним числом.

process_referral_* срабатывают РОВНО в момент платежа. Если на тот момент
у покупателя не было реферера (зашёл по ссылке позже) или платёж довёз
recovery-цикл, который реферальную обработку не звал — комиссия терялась.
Эти функции идемпотентно доплачивают: запускаются при регистрации
реферала и через админ-команду /reconcile_refs.

Идемпотентность:
- premium: guard first_premium_at внутри process_referral_crypto_premium
  (первая выплата ставит флаг, повторный вызов возвращает renewal).
- shop: guard по invoice_id в referral_rewards (один инвойс = одна выплата).
"""

from __future__ import annotations

from typing import Any, Dict, List


class SocialReferralReconcileMixin:
    # ── PREMIUM ─────────────────────────────────────────────────────────────

    def reconcile_premium_referral(self, buyer_id: int) -> Dict[str, Any]:
        """Доплатить рефереру за Premium, КУПЛЕННЫЙ ДО появления реф-связи."""
        out: Dict[str, Any] = {"ok": False}
        if not self.get_referrer_id(buyer_id):
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT first_premium_at FROM players WHERE user_id = ?", (buyer_id,))
            prow = cursor.fetchone()
            if prow and prow["first_premium_at"]:
                return out
            cursor.execute(
                "SELECT invoice_id, amount FROM crypto_invoices WHERE user_id = ? AND status = 'paid' "
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
        return self.process_referral_crypto_premium(
            buyer_id, usdt_paid, invoice_id=int(row["invoice_id"])
        )

    def reconcile_all_premium_referrals(self) -> Dict[str, Any]:
        """Бэкафилл ПРЕМИУМ-комиссии по всем рефералам. Идемпотентно."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT referred_id FROM referrals")
            ids = [int(r["referred_id"]) for r in cursor.fetchall()]
        finally:
            conn.close()
        credited: List[Dict[str, Any]] = []
        total = 0.0
        for buyer_id in ids:
            res = self.reconcile_premium_referral(buyer_id)
            if res.get("ok") and res.get("reward_usdt"):
                rw = float(res["reward_usdt"])
                credited.append({"buyer_id": buyer_id, "referrer_id": res.get("referrer_id"), "reward_usdt": rw})
                total += rw
        return {"ok": True, "credited": credited, "count": len(credited), "total_usdt": round(total, 4)}

    # ── SHOP (алмазы / свитки / аватарки / экипировка за USDT) ──────────────

    def reconcile_all_shop_referrals(self) -> Dict[str, Any]:
        """Бэкафилл SHOP-комиссии по всем оплаченным USDT-инвойсам рефералов.
        Дедупликация по invoice_id (один инвойс = одна выплата).
        Stars-покупки сюда не входят (у них нет invoice_id; для прошлых Stars
        бэкафилл невозможен без отдельного отслеживания)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Все ОПЛАЧЕННЫЕ USDT-инвойсы рефералов, КРОМЕ premium (premium идёт
            # через свой бэкафилл). full_reset раньше исключался ошибочно — это
            # реальная оплата $12 за услугу, такая же как любая shop-покупка.
            cursor.execute(
                "SELECT c.invoice_id, c.user_id, c.amount FROM crypto_invoices c "
                "INNER JOIN referrals r ON r.referred_id = c.user_id "
                "WHERE c.status = 'paid' AND UPPER(c.asset) = 'USDT' "
                "AND c.payload NOT LIKE ?",
                ("%:premium:%",),
            )
            rows = [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()
        credited: List[Dict[str, Any]] = []
        total = 0.0
        for row in rows:
            try:
                amount = float(row["amount"] or 0)
            except (TypeError, ValueError):
                amount = 0.0
            if amount <= 0:
                continue
            res = self.process_referral_vip_shop_purchase(
                int(row["user_id"]),
                usdt=amount,
                invoice_id=int(row["invoice_id"]),
            )
            if res.get("ok") and res.get("reward_usdt"):
                rw = float(res["reward_usdt"])
                credited.append({
                    "buyer_id": int(row["user_id"]),
                    "referrer_id": res.get("referrer_id"),
                    "reward_usdt": rw,
                    "invoice_id": int(row["invoice_id"]),
                })
                total += rw
        return {"ok": True, "credited": credited, "count": len(credited), "total_usdt": round(total, 4)}

    # ── ДИАГНОСТИКА ─────────────────────────────────────────────────────────

    def referral_purchase_breakdown(self) -> Dict[str, Any]:
        """Сколько рефералов купили Premium vs алмазы за USDT — для отчёта команды."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT referred_id FROM referrals")
            ids = [int(r["referred_id"]) for r in cursor.fetchall()]
            with_premium = 0
            with_diamond = 0
            for buyer in ids:
                cursor.execute(
                    "SELECT payload FROM crypto_invoices WHERE user_id = ? AND status = 'paid' "
                    "AND UPPER(asset) = 'USDT'",
                    (buyer,),
                )
                payloads = [str(r["payload"] or "") for r in cursor.fetchall()]
                if any(":premium:" in p for p in payloads):
                    with_premium += 1
                if any((":diamonds:" in p or ":diamond_first:" in p) for p in payloads):
                    with_diamond += 1
            return {"total_refs": len(ids), "with_premium": with_premium, "with_diamond_usdt": with_diamond}
        finally:
            conn.close()
