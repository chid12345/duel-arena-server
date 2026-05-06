"""GET /admin/battle-stats — отчёт по балансу классов за N дней."""
from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from stats.battle_stats import get_report


def register_stats_routes(app: Any, db: Any) -> None:
    router = APIRouter()
    ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

    @router.get("/admin/battle-stats", response_class=HTMLResponse)
    async def battle_stats_report(token: str = "", days: int = 7):
        # Если ADMIN_TOKEN не задан — закрываем доступ полностью.
        # Иначе любой бы дёргал /admin/battle-stats без токена.
        if not ADMIN_TOKEN or token != ADMIN_TOKEN:
            return HTMLResponse("<h2>403 Forbidden</h2>", status_code=403)
        if days < 1 or days > 90:
            days = 7

        report = get_report(db, days=days)
        meta = report.pop("_meta", {})
        error = report.pop("_error", None)

        TYPE_LABELS = {"pvp": "PvP", "pve": "Бот", "endless": "Натиск", "titan": "Башня Титанов"}
        WTYPE_LABELS = {"tank": "Берсерк", "agile": "Тень", "crit": "Хаос-Рыцарь", "default": "Без класса"}

        rows_html = ""
        for btype in ("pvp", "pve", "endless", "titan"):
            entries = report.get(btype, [])
            if not entries:
                continue
            total = meta.get("totals", {}).get(btype, 0)
            label = TYPE_LABELS.get(btype, btype)
            rows_html += f"<tr><td colspan='4' style='background:#1e293b;color:#94a3b8;padding:8px 12px;font-weight:bold'>{label} — {total} боёв</td></tr>\n"
            for e in entries:
                w = WTYPE_LABELS.get(e["winner"], e["winner"])
                l = WTYPE_LABELS.get(e["loser"], e["loser"])
                pct = e["win_rate_pct"]
                bar_w = int(pct * 2)
                color = "#22c55e" if pct >= 40 else "#ef4444"
                rows_html += (
                    f"<tr>"
                    f"<td>{w}</td><td>{l}</td><td>{e['count']}</td>"
                    f"<td><div style='background:{color};width:{bar_w}px;height:14px;border-radius:3px;display:inline-block'></div>"
                    f" {pct}%</td>"
                    f"</tr>\n"
                )

        if error:
            rows_html = f"<tr><td colspan='4' style='color:#ef4444'>Ошибка: {error}</td></tr>"

        html = f"""<!DOCTYPE html>
<html><head><meta charset='utf-8'>
<title>Battle Stats — Duel Arena</title>
<style>
  body {{font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:20px}}
  h1 {{color:#f8fafc;margin-bottom:4px}} p {{color:#94a3b8;margin-top:0}}
  table {{border-collapse:collapse;width:100%;max-width:800px;margin-top:16px}}
  th {{background:#1e293b;color:#94a3b8;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase}}
  td {{padding:8px 12px;border-bottom:1px solid #1e293b;font-size:14px}}
  tr:hover td {{background:#1e293b20}}
  .nav {{margin-bottom:16px}}
  .nav a {{color:#60a5fa;margin-right:12px;text-decoration:none}}
</style>
</head><body>
<h1>Баланс классов</h1>
<p>За последние {days} дней · с {meta.get('since','?')[:10]}</p>
<div class='nav'>
  <a href='?token={token}&days=7'>7 дней</a>
  <a href='?token={token}&days=14'>14 дней</a>
  <a href='?token={token}&days=30'>30 дней</a>
</div>
<table>
  <thead><tr><th>Победитель</th><th>Проигравший</th><th>Боёв</th><th>% от типа</th></tr></thead>
  <tbody>{rows_html}</tbody>
</table>
</body></html>"""
        return HTMLResponse(html)

    app.include_router(router)
