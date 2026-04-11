"""Страница /admin/purchases — все покупки USDT и Stars."""
from __future__ import annotations

import os
from typing import Any, Dict

from fastapi import APIRouter
from fastapi.responses import HTMLResponse


def _fmt_payload(payload: str) -> str:
    """Человекочитаемое описание покупки из payload."""
    if not payload:
        return "—"
    if ":usdt_scroll:" in payload:
        sid = payload.split(":usdt_scroll:", 1)[1].strip()
        return f"Свиток: {sid}"
    if ":premium:" in payload:
        return "👑 Premium"
    if ":full_reset:" in payload:
        return "🔄 Сброс прогресса"
    if ":avatar:" in payload:
        aid = payload.split(":avatar:", 1)[1].strip()
        return f"Образ: {aid}"
    if ":usdt_slot:" in payload:
        return "💠 USDT-образ"
    if ":usdt_reset:" in payload:
        cid = payload.split(":usdt_reset:", 1)[1].strip()
        return f"🔄 Сброс образа: {cid}"
    if ":diamonds:" in payload:
        d = payload.split(":diamonds:", 1)[1].strip()
        return f"💎 {d} алмазов"
    return payload


def _pkg_label(package_id: str, diamonds: int, stars: int) -> str:
    labels = {
        "d100": "100 💎", "d300": "300 💎", "d500": "500 💎",
        "premium": "👑 Premium",
    }
    return labels.get(package_id, f"{package_id} / {diamonds}💎 за {stars}⭐")


def register_admin_purchases(app: Any, db: Any) -> None:
    router = APIRouter()
    ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

    @router.get("/admin/purchases", response_class=HTMLResponse)
    async def admin_purchases(token: str = ""):
        if ADMIN_TOKEN and token != ADMIN_TOKEN:
            return HTMLResponse("<h2>403 Forbidden</h2><p>Неверный токен.</p>", status_code=403)

        usdt_rows = db.get_purchases_usdt(500)
        stars_rows = db.get_purchases_stars(500)

        # Суммарная статистика
        usdt_paid = [r for r in usdt_rows if r["status"] == "paid"]
        usdt_total = sum(float(r["amount"] or 0) for r in usdt_paid)
        stars_total = sum(int(r["stars"] or 0) for r in stars_rows)
        usdt_buyers = len({r["user_id"] for r in usdt_paid})
        stars_buyers = len({r["user_id"] for r in stars_rows})

        def usdt_row(r: Dict) -> str:
            status_color = {"paid": "#3cc864", "pending": "#ffc83c", "expired": "#888"}.get(r["status"], "#ccc")
            uname = r.get("username") or f'uid:{r["user_id"]}'
            item = _fmt_payload(r.get("payload") or "")
            paid_at = (r.get("paid_at") or "")[:16]
            created = (r.get("created_at") or "")[:16]
            return (
                f"<tr>"
                f"<td>{r['invoice_id']}</td>"
                f"<td>{uname}<br><small style='color:#888'>{r['user_id']}</small></td>"
                f"<td>{item}</td>"
                f"<td><b>{r['amount']} {r['asset']}</b></td>"
                f"<td style='color:{status_color}'>{r['status']}</td>"
                f"<td>{paid_at or '—'}</td>"
                f"<td style='color:#888'>{created}</td>"
                f"</tr>"
            )

        def stars_row(r: Dict) -> str:
            uname = r.get("username") or f'uid:{r["user_id"]}'
            label = _pkg_label(r["package_id"], int(r["diamonds"] or 0), int(r["stars"] or 0))
            return (
                f"<tr>"
                f"<td>{r['id']}</td>"
                f"<td>{uname}<br><small style='color:#888'>{r['user_id']}</small></td>"
                f"<td>{label}</td>"
                f"<td>{r['stars']} ⭐</td>"
                f"<td style='color:#b45aff'>{r['diamonds']} 💎</td>"
                f"<td>{(r.get('created_at') or '')[:16]}</td>"
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
  body {{ font-family: system-ui, sans-serif; background: #0e0d1a; color: #e0e0f0; padding: 16px; }}
  h1 {{ color: #ffc83c; margin-bottom: 16px; font-size: 22px; }}
  h2 {{ color: #c8a0ff; margin: 24px 0 10px; font-size: 16px; }}
  .stats {{ display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }}
  .stat {{ background: #1b1a30; border: 1px solid #3a3860; border-radius: 10px;
           padding: 12px 20px; min-width: 140px; }}
  .stat .val {{ font-size: 24px; font-weight: bold; color: #ffc83c; }}
  .stat .lbl {{ font-size: 11px; color: #8888aa; margin-top: 2px; }}
  .tabs {{ display: flex; gap: 8px; margin-bottom: 16px; }}
  .tab {{ padding: 8px 18px; border-radius: 8px; cursor: pointer; border: 1.5px solid #3a3860;
          background: #1b1a30; color: #aaa; font-size: 13px; user-select: none; }}
  .tab.active {{ background: #2a1f50; border-color: #c8a0ff; color: #f0f0fa; font-weight: bold; }}
  .section {{ display: none; }}
  .section.active {{ display: block; }}
  .search {{ width: 100%; max-width: 360px; padding: 8px 12px; border-radius: 8px;
             border: 1px solid #3a3860; background: #1b1a30; color: #e0e0f0;
             font-size: 13px; margin-bottom: 12px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
  th {{ background: #1b1a30; color: #9999cc; padding: 8px 10px; text-align: left;
        border-bottom: 1px solid #2a2850; position: sticky; top: 0; }}
  td {{ padding: 7px 10px; border-bottom: 1px solid #1e1d35; vertical-align: middle; }}
  tr:hover td {{ background: #1e1d35; }}
  .wrap {{ overflow-x: auto; border-radius: 10px; border: 1px solid #2a2850; }}
</style>
</head>
<body>
<h1>⚔️ Покупатели — Duel Arena</h1>

<div class="stats">
  <div class="stat"><div class="val">{usdt_total:.2f}</div><div class="lbl">USDT всего</div></div>
  <div class="stat"><div class="val">{len(usdt_paid)}</div><div class="lbl">USDT покупок</div></div>
  <div class="stat"><div class="val">{usdt_buyers}</div><div class="lbl">USDT покупателей</div></div>
  <div class="stat"><div class="val" style="color:#c8a0ff">{stars_total}</div><div class="lbl">⭐ Stars всего</div></div>
  <div class="stat"><div class="val" style="color:#c8a0ff">{len(stars_rows)}</div><div class="lbl">Stars покупок</div></div>
  <div class="stat"><div class="val" style="color:#c8a0ff">{stars_buyers}</div><div class="lbl">Stars покупателей</div></div>
</div>

<div class="tabs">
  <div class="tab active" onclick="switchTab('usdt',this)">💵 USDT ({len(usdt_rows)})</div>
  <div class="tab" onclick="switchTab('stars',this)">⭐ Stars ({len(stars_rows)})</div>
</div>

<section class="section active" id="sec-usdt">
  <input class="search" type="text" placeholder="Поиск по нику, uid, товару..." oninput="filterTable('tbl-usdt',this.value)">
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
  <input class="search" type="text" placeholder="Поиск по нику, uid, пакету..." oninput="filterTable('tbl-stars',this.value)">
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
