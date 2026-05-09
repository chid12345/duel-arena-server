"""
economy/audit_shop.py — аудит цен магазина.

Сравнивает фактические цены SHOP_CATALOG с формульными (по rarity/tier/power
из config/shop_tags.json). Помечает ⚠ при расхождении ≥25%.

Запуск:
    python -m economy.audit_shop

Только аудит — цены не правит. Решение «править ли» — за пользователем.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from economy import (
    diamond_to_gold,
    get_anchor,
    gold_to_diamond,
    price_for_item,
    star_to_diamond,
    usdt_to_diamond,
)

_DELTA_THRESHOLD = 0.25


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def load_shop_tags() -> dict[str, Any]:
    path = _project_root() / "config" / "shop_tags.json"
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("items", {})


def shop_currency_to_formula(currency: str) -> str:
    """SHOP_CATALOG.currency → currency для price_for_item.
    'diamonds' → 'diamond', 'gold' → 'gold'."""
    return "diamond" if currency == "diamonds" else currency


def fmt_price(value: int, currency: str) -> str:
    sym = "🪙" if currency == "gold" else "💎" if currency == "diamonds" else currency
    return f"{value}{sym}"


def main() -> None:
    try:
        from api.tma_catalogs import SHOP_CATALOG
    except Exception as e:
        print(f"[ошибка] не получилось импортировать SHOP_CATALOG: {e}")
        return

    tags = load_shop_tags()
    print(f"economy.json PU_TO_GOLD={get_anchor('PU_TO_GOLD'):.0f}  "
          f"GOLD_TO_DIAMOND={get_anchor('GOLD_TO_DIAMOND'):.0f}")
    print(f"shop_tags.json: {len(tags)} тэгов · SHOP_CATALOG: {len(SHOP_CATALOG)} предметов")

    # Сгруппировать по tab
    by_tab: dict[str, list[tuple[str, dict, dict | None]]] = {}
    untagged: list[str] = []
    for item_id, item in SHOP_CATALOG.items():
        tab = item.get("tab", "?")
        tag = tags.get(item_id)
        if tag is None and item.get("price", 0) > 0:
            untagged.append(item_id)
        by_tab.setdefault(tab, []).append((item_id, item, tag))

    # Печать по табам
    warn_count = 0
    total_count = 0
    for tab in sorted(by_tab.keys()):
        items = by_tab[tab]
        print(f"\n=== TAB: {tab} ({len(items)} предметов) ===")
        print(f"{'item_id':22s} {'rar':10s} {'T':3s} {'pow':>4s}  "
              f"{'факт':>10s} {'формула':>12s}  {'Δ%':>6s}  flag  comment")
        print("-" * 110)
        for item_id, item, tag in sorted(items):
            price = item.get("price", 0)
            curr = item.get("currency", "?")
            if price == 0 or tag is None:
                why = "free/drop" if price == 0 else "no tag"
                print(f"{item_id:22s} {'-':10s} {'-':3s} {'-':>4s}  "
                      f"{'—':>10s} {'—':>12s}  {'—':>6s}  ·    {why}")
                continue
            total_count += 1
            f_curr = shop_currency_to_formula(curr)
            formula_price = price_for_item(tag["power"], tag["rarity"], tag["tier"], currency=f_curr)
            rel = (price - formula_price) / formula_price if formula_price > 0 else 0.0
            mark = "OK" if abs(rel) < _DELTA_THRESHOLD else ("ВЫШЕ" if rel > 0 else "НИЖЕ")
            flag = "·" if mark == "OK" else "⚠"
            if flag == "⚠":
                warn_count += 1
            actual_str = fmt_price(price, curr)
            formula_str = fmt_price(formula_price, curr)
            print(f"{item_id:22s} {tag['rarity']:10s} {tag['tier']:3s} {tag['power']:>4d}  "
                  f"{actual_str:>10s} {formula_str:>12s}  {rel*100:>+5.0f}%  {flag}    "
                  f"{tag.get('comment', '')[:35]}")

    print(f"\n=== ИТОГ ===")
    print(f"Цен с расхождением ≥{_DELTA_THRESHOLD*100:.0f}%: {warn_count} из {total_count}")
    if untagged:
        print(f"Без тэга (нужно добавить в shop_tags.json): {len(untagged)}")
        for item_id in untagged[:10]:
            print(f"  · {item_id}")

    # Формульные цены пакетов алмазов
    print("\n=== ВАЛЮТНЫЕ ПАКЕТЫ (справка) ===")
    for stars, dia in [(150, 100), (390, 300), (650, 500)]:
        print(f"{stars} ⭐ → {star_to_diamond(stars):.1f} 💎 (факт {dia})")
    for usdt, dia in [(2.99, 100), (7.99, 300), (12.99, 500)]:
        print(f"{usdt} USDT → {usdt_to_diamond(usdt):.1f} 💎 (факт {dia})")


if __name__ == "__main__":
    main()
