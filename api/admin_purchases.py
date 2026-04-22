"""Страница /admin/purchases — все покупки USDT и Stars."""
from __future__ import annotations

import asyncio
import os
from typing import Any, Dict

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from api.admin_purchases_helpers import _fmt_payload, _pkg_label


def register_admin_purchases(app: Any, db: Any) -> None:
    router = APIRouter()
    ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

    @router.get("/admin/purchases", response_class=HTMLResponse)
    async def admin_purchases(token: str = ""):
        if ADMIN_TOKEN and token != ADMIN_TOKEN:
            return HTMLResponse("<h2>403 Forbidden</h2><p>Неверный токен.</p>", status_code=403)

        usdt_rows, stars_rows = await asyncio.gather(
            asyncio.to_thread(db.get_purchases_usdt, 500),
            asyncio.to_thread(db.get_purchases_stars, 500),
        )

        # Суммарная статистика
        usdt_paid = [r for r in usdt_rows if r["status"] == "paid"]
        usdt_total = sum(float(r["amount"] or 0) for r in usdt_paid)
        stars_total = sum(int(r["stars"] or 0) for r in stars_rows)
        usdt_buyers = len({r["user_id"] for r in usdt_paid})
        stars_buyers = len({r["user_id"] for r in stars_rows})

        def usdt_row(r: Dict) -> str:
            status = r["status"]
            badge_cls = {"paid": "badge-paid", "pending": "badge-pending", "expired": "badge-expired"}.get(status, "badge-expired")
            status_ru = {"paid": "✅ Оплачен", "pending": "⏳ Ожидает", "expired": "❌ Истёк"}.get(status, status)
            uname = r.get("username") or "—"
            uid = r["user_id"]
            item = _fmt_payload(r.get("payload") or "")
            paid_at = (r.get("paid_at") or "—")[:16]
            created = (r.get("created_at") or "—")[:16]
            return (
                f"<tr>"
                f"<td style='color:#334488;font-weight:600'>{r['invoice_id']}</td>"
                f"<td><b>{uname}</b><br><small>{uid}</small></td>"
                f"<td>{item}</td>"
                f"<td style='font-weight:700;color:#1a3ccc'>{r['amount']} {r['asset']}</td>"
                f"<td><span class='badge {badge_cls}'>{status_ru}</span></td>"
                f"<td>{paid_at}</td>"
                f"<td><small>{created}</small></td>"
                f"</tr>"
            )

        def stars_row(r: Dict) -> str:
            uname = r.get("username") or "—"
            uid = r["user_id"]
            label = _pkg_label(r["package_id"], int(r["diamonds"] or 0), int(r["stars"] or 0))
            diamonds = int(r["diamonds"] or 0)
            stars = int(r["stars"] or 0)
            created = (r.get("created_at") or "—")[:16]
            return (
                f"<tr>"
                f"<td style='color:#334488;font-weight:600'>{r['id']}</td>"
                f"<td><b>{uname}</b><br><small>{uid}</small></td>"
                f"<td>{label}</td>"
                f"<td style='font-weight:700;color:#7c3aed'>{stars} ⭐</td>"
                f"<td style='font-weight:700;color:#1a3ccc'>{diamonds} 💎</td>"
                f"<td><small>{created}</small></td>"
                f"</tr>"
            )

        usdt_tbody = "\n".join(usdt_row(r) for r in usdt_rows)
        stars_tbody = "\n".join(stars_row(r) for r in stars_rows)

        html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Покупатели — Duel Arena</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: system-ui, sans-serif; background: #f0f4ff; color: #1a1a3a; padding: 20px; }}
  h1 {{ color: #1a3ccc; margin-bottom: 18px; font-size: 22px; font-weight: 700; }}
  .stats {{ display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }}
  .stat {{ background: #fff; border: 1px solid #c8d4f8; border-radius: 12px;
           padding: 14px 22px; min-width: 140px; box-shadow: 0 2px 6px rgba(30,60,200,.07); }}
  .stat .val {{ font-size: 26px; font-weight: 800; color: #1a3ccc; }}
  .stat .val.stars {{ color: #7c3aed; }}
  .stat .lbl {{ font-size: 11px; color: #6677aa; margin-top: 3px; }}
  .tabs {{ display: flex; gap: 8px; margin-bottom: 16px; }}
  .tab {{ padding: 9px 22px; border-radius: 9px; cursor: pointer;
          border: 2px solid #c8d4f8; background: #fff;
          color: #5566aa; font-size: 13px; font-weight: 600; user-select: none;
          transition: all .15s; }}
  .tab:hover {{ border-color: #1a3ccc; color: #1a3ccc; }}
  .tab.active {{ background: #1a3ccc; border-color: #1a3ccc; color: #fff; }}
  .section {{ display: none; }}
  .section.active {{ display: block; }}
  .search {{ width: 100%; max-width: 380px; padding: 9px 14px; border-radius: 9px;
             border: 1.5px solid #c8d4f8; background: #fff; color: #1a1a3a;
             font-size: 13px; margin-bottom: 12px; outline: none; }}
  .search:focus {{ border-color: #1a3ccc; }}
  .wrap {{ overflow-x: auto; border-radius: 12px; border: 1px solid #c8d4f8;
           box-shadow: 0 2px 8px rgba(30,60,200,.06); background: #fff; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
  th {{ background: #e8eeff; color: #334488; padding: 10px 12px; text-align: left;
        border-bottom: 2px solid #c8d4f8; position: sticky; top: 0; font-weight: 700; }}
  td {{ padding: 8px 12px; border-bottom: 1px solid #eef1fb; vertical-align: middle; color: #1a1a3a; }}
  tr:last-child td {{ border-bottom: none; }}
  tr:hover td {{ background: #f4f7ff; }}
  .badge {{ display: inline-block; padding: 2px 9px; border-radius: 6px;
            font-size: 11px; font-weight: 700; letter-spacing: .3px; }}
  .badge-paid {{ background: #d1fae5; color: #065f46; }}
  .badge-pending {{ background: #fef3c7; color: #92400e; }}
  .badge-expired {{ background: #f3f4f6; color: #6b7280; }}
  small {{ color: #8899bb; }}
</style>
</head>
<body>
<h1>⚔️ Покупатели — Duel Arena</h1>

<div class="stats">
  <div class="stat"><div class="val">{usdt_total:.2f}</div><div class="lbl">USDT всего</div></div>
  <div class="stat"><div class="val">{len(usdt_paid)}</div><div class="lbl">USDT покупок</div></div>
  <div class="stat"><div class="val">{usdt_buyers}</div><div class="lbl">USDT покупателей</div></div>
  <div class="stat"><div class="val stars">{stars_total}</div><div class="lbl">⭐ Stars всего</div></div>
  <div class="stat"><div class="val stars">{len(stars_rows)}</div><div class="lbl">Stars покупок</div></div>
  <div class="stat"><div class="val stars">{stars_buyers}</div><div class="lbl">Stars покупателей</div></div>
</div>

<div class="tabs">
  <div class="tab active" onclick="switchTab('usdt',this)">💵 USDT ({len(usdt_rows)})</div>
  <div class="tab" onclick="switchTab('stars',this)">⭐ Stars ({len(stars_rows)})</div>
</div>

<section class="section active" id="sec-usdt">
  <input class="search" type="text" placeholder="🔍 Поиск по нику, uid, товару..." oninput="filterTable('tbl-usdt',this.value)">
  <div class="wrap">
  <table id="tbl-usdt">
    <thead><tr>
      <th>Invoice</th><th>Игрок</th><th>Товар</th><th>Сумма</th><th>Статус</th><th>Оплачен</th><th>Создан</th>
    </tr></thead>
    <tbody>{usdt_tbody}</tbody>
  </table>
  </div>
</section>

<section class="section" id="sec-stars">
  <input class="search" type="text" placeholder="🔍 Поиск по нику, uid, пакету..." oninput="filterTable('tbl-stars',this.value)">
  <div class="wrap">
  <table id="tbl-stars">
    <thead><tr>
      <th>#</th><th>Игрок</th><th>Пакет</th><th>Stars</th><th>Алмазы</th><th>Дата</th>
    </tr></thead>
    <tbody>{stars_tbody}</tbody>
  </table>
  </div>
</section>

<script>
function switchTab(id, el) {{
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('sec-' + id).classList.add('active');
}}
function filterTable(tblId, q) {{
  const rows = document.querySelectorAll('#' + tblId + ' tbody tr');
  const lq = q.toLowerCase();
  rows.forEach(r => {{
    r.style.display = r.textContent.toLowerCase().includes(lq) ? '' : 'none';
  }});
}}
</script>
</body>
</html>"""
        return HTMLResponse(html)

    app.include_router(router)
