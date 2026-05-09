"""
economy/dump_diffs.py — аудит расхождений между текущими хардкод-цифрами
и формульными значениями балансной сетки.

Запуск:
    python -m economy.dump_diffs

Этап 1: только показывает дельты, ничего не меняет.
Этап 2 поправит источники под формулы.
"""

from __future__ import annotations

import json
import sys
from typing import Any

# Windows cp1251 не печатает юникод-символы — переключаем stdout на utf-8.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from economy import (
    diamond_to_gold,
    ev_for_box,
    get_anchor,
    load_economy,
    reward_for_task,
    star_to_diamond,
    usdt_to_diamond,
)

_DELTA_THRESHOLD = 0.25  # 25% — выше этого помечаем ⚠


def _delta(actual: float, expected: float) -> tuple[float, str]:
    """Вернуть относительную дельту и метку."""
    if expected == 0 and actual == 0:
        return 0.0, "OK"
    if expected == 0:
        return float("inf"), "⚠ ИНФ"
    rel = (actual - expected) / expected
    mark = "OK" if abs(rel) < _DELTA_THRESHOLD else ("⚠ ВЫШЕ" if rel > 0 else "⚠ НИЖЕ")
    return rel, mark


def audit_reward_table() -> list[dict[str, Any]]:
    """REWARD_TABLE из reward_calculator vs формула. Только валюта (gold/diamond)."""
    try:
        from reward_calculator import REWARD_TABLE
    except Exception as e:
        print(f"[skip] reward_calculator: {e}")
        return []

    rows: list[dict[str, Any]] = []
    print("\n=== ЗАДАНИЯ (валюта): текущие vs формула ===")
    print(f"{'freq':8s} {'diff':8s}  {'cur G':>6s} {'frm G':>6s} {'Δ%':>6s}  "
          f"{'cur D':>5s} {'frm D':>5s} {'Δ%':>6s}  flag")
    print("-" * 75)
    for (freq, diff), tup in sorted(REWARD_TABLE.items()):
        cg, cd = tup[0], tup[1]   # XP игнорируем (этап 5)
        fg, fd = reward_for_task(diff, freq)
        rg, mg = _delta(cg, fg)
        rd, md = _delta(cd, fd)
        flag = "⚠" if "⚠" in (mg + md) else "·"
        print(f"{freq:8s} {diff:8s}  {cg:6d} {fg:6d} {rg*100:>+5.0f}%  "
              f"{cd:5d} {fd:5d} {rd*100:>+5.0f}%  {flag}")
        rows.append({
            "freq": freq, "diff": diff,
            "current": {"gold": cg, "diamond": cd},
            "formula": {"gold": fg, "diamond": fd},
            "delta_pct": {"gold": rg, "diamond": rd},
        })
    return rows


def audit_currency_packs() -> None:
    """Проверка симметрии Stars/USDT пакетов диамантов.

    Telegram Stars обычно дешевле USDT (~1.5×) — это намеренная скидка канала,
    не баг. Поэтому сверяемся с фактическими пакетами через формулу.
    """
    print("\n=== ВАЛЮТНЫЕ ПАКЕТЫ: формульное число алмазов vs фактическое ===")
    packs = [
        ("100 💎", 150, 2.99, 100),
        ("300 💎", 390, 7.99, 300),
        ("500 💎", 650, 12.99, 500),
    ]
    for label, stars, usdt, actual_d in packs:
        d_from_stars = star_to_diamond(stars)
        d_from_usdt = usdt_to_diamond(usdt)
        s_match = abs(d_from_stars - actual_d) / actual_d < 0.05
        u_match = abs(d_from_usdt - actual_d) / actual_d < 0.05
        flag_s = "·" if s_match else "⚠"
        flag_u = "·" if u_match else "⚠"
        print(f"{label} (факт {actual_d:3d}): "
              f"{stars:4d} ⭐ → формула {d_from_stars:6.1f} 💎 {flag_s} | "
              f"{usdt:5.2f} USDT → формула {d_from_usdt:6.1f} 💎 {flag_u}")


def audit_box_common() -> None:
    """Эталонный аудит box_common (150 🪙) и box_rare (50 💎)."""
    print("\n=== ЯЩИКИ: house edge ===")
    for label, price_gold, jp_chance, jp_val in [
        ("box_common", 150, 0.08, 200),
        ("box_rare (50💎)", diamond_to_gold(50), 0.05, 1500),
        ("box_rare_c (80💎)", diamond_to_gold(80), 0.05, 3000),
    ]:
        rep = ev_for_box(price_gold, jackpot_chance=jp_chance, jackpot_value_gold=jp_val)
        flag = "⚠" if rep["jackpot_overflow_gold"] > 0 else "·"
        print(f"{label:20s} цена {rep['price_gold']:>6.0f} 🪙 | "
              f"EV {rep['total_ev_gold']:>6.0f} | "
              f"гарант {rep['guaranteed_gold']:>5.0f} | "
              f"jackpot pool {rep['jackpot_pool_gold']:>5.0f} | "
              f"факт jackpot EV {rep['actual_jackpot_ev_gold']:>5.0f} | "
              f"house edge {rep['house_edge_gold']:>5.0f} 🪙  {flag}")


def main() -> None:
    eco = load_economy()
    print(f"economy.json v{eco.get('version')}  PU_TO_GOLD={get_anchor('PU_TO_GOLD'):.0f}  "
          f"GOLD_TO_DIAMOND={get_anchor('GOLD_TO_DIAMOND'):.0f}")

    rows = audit_reward_table()
    audit_currency_packs()
    audit_box_common()

    warn = sum(1 for r in rows if any(abs(v) >= _DELTA_THRESHOLD
                                      for v in r["delta_pct"].values()
                                      if v != float("inf")))
    print(f"\n=== ИТОГ ===")
    print(f"Заданий с расхождением ≥{_DELTA_THRESHOLD*100:.0f}%: {warn} из {len(rows)}")
    print(f"Это аудит — Этап 1. Реальная правка цен → Этап 2.")


if __name__ == "__main__":
    main()
