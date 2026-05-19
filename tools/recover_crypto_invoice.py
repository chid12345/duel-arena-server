"""Восстановление потерянного USDT-платежа (CryptoPay).

Использование:
  python tools/recover_crypto_invoice.py <invoice_id>          # recover one
  python tools/recover_crypto_invoice.py --user 12345          # list user's stuck
  python tools/recover_crypto_invoice.py --list                # list ALL stuck

После фикса webhook (commit d06d6d2) этот скрипт нужен ТОЛЬКО для уже
потерянных платежей. Безопасен: дублирующих выдач не сделает.

Защита от дубля:
- confirm_crypto_invoice — идемпотентно (UPDATE WHERE status='pending')
- purchase_class — идемпотентно ("уже есть")
- mark_items_delivered — после успешной выдачи, чтобы повторный запуск
  не выдавал повторно.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys

# Запуск из проекта или из tools/: гарантируем, что корень проекта в sys.path
_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from database import db

try:
    import httpx
    from config import CRYPTOPAY_TOKEN
    from api.tma_catalogs import CRYPTOPAY_API_BASE
except Exception:
    httpx = None
    CRYPTOPAY_TOKEN = ""
    CRYPTOPAY_API_BASE = ""

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("recover")


def _parse_payload(payload: str) -> dict:
    """Парсит CryptoPay-payload в структуру действий (зеркало webhook-логики)."""
    out = {
        "is_premium":      ":premium:" in payload,
        "is_full_reset":   ":full_reset:" in payload,
    }
    out["usdt_scroll_id"] = payload.split(":usdt_scroll:", 1)[1].strip() if ":usdt_scroll:" in payload else None
    out["weapon_equip_id"] = payload.split(":weapon_equip:", 1)[1].strip() if ":weapon_equip:" in payload else None
    out["shield_equip_id"] = payload.split(":shield_equip:", 1)[1].strip() if ":shield_equip:" in payload else None
    out["helmet_equip_id"] = payload.split(":helmet_equip:", 1)[1].strip() if ":helmet_equip:" in payload else None
    out["boots_equip_id"]  = payload.split(":boots_equip:",  1)[1].strip() if ":boots_equip:"  in payload else None
    out["ring_equip_id"]   = payload.split(":ring_equip:",   1)[1].strip() if ":ring_equip:"   in payload else None
    out["avatar_id"]       = payload.split(":avatar:", 1)[1].strip() if ":avatar:" in payload else None
    # Этап 8: аренда mythic
    out["rental_item_id"]  = payload.split(":rental:", 1)[1].strip() if ":rental:" in payload else None
    return out


def _deliver(uid: int, invoice_id: int, payload: str, diamonds: int) -> str:
    """Доставляет содержимое invoice по типу payload. Возвращает 'тип' выдачи.

    Старый armor (:armor_equip:, :armor_class:, :usdt_slot:) снесён под корень.
    """
    p = _parse_payload(payload)

    # armor2_equip — отдельная таблица player_owned_armor2
    armor2_equip_id = payload.split(":armor2_equip:", 1)[1].strip() if ":armor2_equip:" in payload else None
    if armor2_equip_id:
        db.equip_item(uid, "armor2", armor2_equip_id, force=True)
        db.add_owned_armor2(uid, armor2_equip_id)
        return f"equip:armor2:{armor2_equip_id}"

    # Equip-предметы (weapon/shield/helmet/boots/ring) за USDT
    equip_map = [
        ("weapon", p["weapon_equip_id"]), ("shield", p["shield_equip_id"]),
        ("belt",   p["helmet_equip_id"]), ("boots",  p["boots_equip_id"]),
        ("ring1",  p["ring_equip_id"]),
    ]
    for slot, item_id in equip_map:
        if item_id:
            db.equip_item(uid, slot, item_id, force=True)
            db.add_owned_weapon(uid, item_id)
            return f"equip:{slot}:{item_id}"

    # Этап 8: аренда mythic за USDT (rental:{item_id}) — rent_item + equip
    if p.get("rental_item_id"):
        from api.payment_routes.rental_deliver import deliver_rental
        ok = deliver_rental(db, uid, p["rental_item_id"])
        return f"rental:{p['rental_item_id']}:{ok}"

    if p["usdt_scroll_id"]:
        db.add_to_inventory(uid, p["usdt_scroll_id"])
        return f"scroll:{p['usdt_scroll_id']}"

    if p["is_premium"]:
        result = db.activate_premium(uid, days=21)
        return f"premium:{result.get('days_left')}d"

    if p["is_full_reset"]:
        return "full_reset:flagged"  # handler doesn't auto-reset; admin uses notify path

    if p["avatar_id"]:
        u = db.unlock_avatar(uid, p["avatar_id"], source="usdt")
        return f"avatar:{p['avatar_id']}:{u.get('ok')}"

    if diamonds > 0:
        db.add_diamonds(uid, diamonds)
        return f"diamonds:+{diamonds}"

    return "unknown_payload"


def verify_paid_on_cryptopay(invoice_id: int) -> tuple[bool, str]:
    """Запрашивает у CryptoPay API статус инвойса.
    Возвращает (is_paid, status_string). При любой ошибке is_paid=False.
    """
    if not httpx or not CRYPTOPAY_TOKEN or not CRYPTOPAY_API_BASE:
        return False, "cryptopay_not_configured"
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                f"{CRYPTOPAY_API_BASE}/getInvoices",
                headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                params={"invoice_ids": str(invoice_id)},
            )
            data = resp.json()
        if not data.get("ok"):
            return False, "cryptopay_api_error"
        items = data.get("result", {}).get("items", [])
        if not items:
            return False, "invoice_not_found"
        status = items[0].get("status") or ""
        return (status == "paid"), status
    except Exception as e:
        log.warning("verify_paid_on_cryptopay invoice=%s err=%s", invoice_id, e)
        return False, f"error:{e}"


def recover_one(invoice_id: int) -> dict:
    """Восстанавливает выдачу по конкретному invoice_id.

    Безопасность:
    - status='paid' + items_delivered=0 → доставить (точно потерянный).
    - status='pending' → запросить CryptoPay; если там 'paid' → подтвердить и доставить;
      если не paid → пропустить (никакой бесплатной халявы).
    - items_delivered=1 → пропустить (уже доставлено).
    """
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM crypto_invoices WHERE invoice_id = ?", (invoice_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return {"ok": False, "reason": "invoice not found"}
    row = dict(row)
    if int(row.get("items_delivered") or 0):
        return {"ok": False, "reason": "already delivered"}

    status = (row.get("status") or "").strip()
    if status != "paid":
        # Сверяемся с CryptoPay — был ли инвойс реально оплачен
        is_paid, cp_status = verify_paid_on_cryptopay(int(invoice_id))
        if not is_paid:
            return {"ok": False, "reason": f"not paid on CryptoPay (status={cp_status})"}
        # Подтверждаем в нашей БД
        r = db.confirm_crypto_invoice(int(invoice_id), first_purchase_col=None)
        log.info("confirm result for invoice=%s: %s", invoice_id, r)
        if not r.get("ok"):
            return {"ok": False, "reason": "confirm failed"}

    uid = int(row["user_id"])
    payload = row.get("payload") or ""
    diamonds = int(row.get("diamonds") or 0)
    try:
        kind = _deliver(uid, invoice_id, payload, diamonds)
        db.mark_items_delivered(int(invoice_id))
        log.info("recovered invoice=%s uid=%s kind=%s", invoice_id, uid, kind)
        return {"ok": True, "invoice_id": invoice_id, "user_id": uid, "kind": kind}
    except Exception as e:
        log.exception("recover failed invoice=%s: %s", invoice_id, e)
        return {"ok": False, "reason": str(e)}


def dismiss_user_stuck(user_id: int) -> int:
    """Помечает ВСЕ застрявшие инвойсы пользователя как доставленные БЕЗ выдачи предметов.
    Используется для очистки списка тестовых платежей. Возвращает кол-во помеченных.
    """
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE crypto_invoices SET items_delivered = 1 "
        "WHERE user_id = ? AND items_delivered = 0",
        (int(user_id),),
    )
    affected = cur.rowcount
    conn.commit()
    conn.close()
    return affected


def list_stuck(user_id: int | None = None) -> list[dict]:
    """Списки застрявших платежей (paid или pending без выдачи)."""
    conn = db.get_connection()
    cur = conn.cursor()
    if user_id:
        cur.execute(
            "SELECT * FROM crypto_invoices WHERE user_id = ? AND items_delivered = 0 ORDER BY created_at DESC",
            (user_id,),
        )
    else:
        cur.execute(
            "SELECT * FROM crypto_invoices WHERE items_delivered = 0 ORDER BY created_at DESC LIMIT 200",
        )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("invoice_id", nargs="?", type=int)
    ap.add_argument("--user", type=int, help="show stuck for this user_id")
    ap.add_argument("--list", action="store_true", help="show all stuck (max 200)")
    args = ap.parse_args()

    if args.list or args.user:
        rows = list_stuck(args.user)
        if not rows:
            print("Нет застрявших платежей.")
            return 0
        print(f"Найдено {len(rows)} застрявших платежей:")
        for r in rows:
            print(f"  invoice={r['invoice_id']} uid={r['user_id']} status={r['status']} "
                  f"amount={r['amount']}{r['asset']} payload={r['payload'][:60]}")
        return 0

    if not args.invoice_id:
        ap.print_help()
        return 1

    res = recover_one(args.invoice_id)
    print(res)
    return 0 if res.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
