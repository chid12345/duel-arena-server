"""
economy/audit_xp.py — аудит расхождений между progression.json и xp_formulas.

Сравнивает фактические массивы xp_per_win/xp_to_next с формулой.
Показывает где формула близка к реальности, где — нет.

Запуск:
    python -m economy.audit_xp
"""

from __future__ import annotations

import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from economy.xp_formulas import (
    apply_premium_xp,
    load_xp_economy,
    xp_for_task,
    xp_per_loss,
    xp_per_win,
    xp_to_next,
)

_DELTA_THRESHOLD = 0.10  # 10% — для XP норма строже чем для цен


def _delta_pct(actual: float, expected: float) -> float:
    if expected == 0:
        return 0.0
    return (actual - expected) / expected


def audit_progression() -> dict:
    """Сравнить formula vs progression.json."""
    try:
        from progression_loader.accessors import _PROGRESSION
    except Exception as e:
        print(f"[ошибка] не удалось импортировать progression: {e}")
        return {"levels": []}

    actual_win = _PROGRESSION.get("xp_per_win", [])
    actual_next = _PROGRESSION.get("xp_to_next", [])
    max_level = int(_PROGRESSION.get("max_level", 80))

    print(f"\n=== ОПЫТ: progression.json vs формула xp_economy.json ===")
    print(f"max_level: {max_level}")
    print(f"\n{'lv':>3s}  {'факт win':>9s} {'frm win':>8s} {'Δ%':>6s}  "
          f"{'факт next':>10s} {'frm next':>9s} {'Δ%':>6s}  flag")
    print("-" * 75)

    levels_out = []
    warn = 0
    show_set = set(range(1, 11))
    show_set.update([15, 20, 30, 40, 50, 60, 70, 80, max_level])
    show_levels = sorted(lv for lv in show_set if 1 <= lv <= max_level)
    for lv in show_levels:
        idx = lv - 1
        a_win = actual_win[idx] if idx < len(actual_win) else 0
        f_win = xp_per_win(lv)
        d_win = _delta_pct(a_win, f_win)
        a_next = actual_next[idx] if idx < len(actual_next) else 0
        f_next = xp_to_next(lv)
        d_next = _delta_pct(a_next, f_next)
        flag = "·"
        if abs(d_win) >= _DELTA_THRESHOLD or abs(d_next) >= _DELTA_THRESHOLD:
            flag = "⚠"; warn += 1
        print(f"{lv:>3d}  {a_win:>9d} {f_win:>8d} {d_win*100:>+5.0f}%  "
              f"{a_next:>10d} {f_next:>9d} {d_next*100:>+5.0f}%  {flag}")
        levels_out.append({
            "level": lv,
            "actual_win": a_win, "formula_win": f_win,
            "actual_next": a_next, "formula_next": f_next,
        })

    print(f"\nС расхождением ≥{_DELTA_THRESHOLD*100:.0f}%: {warn} из {len(show_levels)}")
    return {"levels": levels_out, "warn_count": warn}


def audit_quest_xp() -> dict:
    """Сравнить XP-награды квестов из reward_calculator с формулой xp_for_task."""
    try:
        from reward_calculator import REWARD_TABLE
    except Exception as e:
        print(f"[skip] reward_calculator: {e}")
        return {"quests": []}

    print(f"\n=== XP КВЕСТОВ: reward_calculator vs xp_formulas ===")
    print(f"{'freq':>6s} {'diff':>6s}  {'факт':>5s} {'формула':>7s}  Δ%   flag")
    print("-" * 50)
    rows = []
    for (freq, diff), tup in sorted(REWARD_TABLE.items()):
        actual_xp = tup[2]
        formula_xp = xp_for_task(diff, freq)
        rel = _delta_pct(actual_xp, formula_xp)
        flag = "·" if abs(rel) < _DELTA_THRESHOLD else "⚠"
        print(f"{freq:>6s} {diff:>6s}  {actual_xp:>5d} {formula_xp:>7d}  "
              f"{rel*100:>+4.0f}% {flag}")
        rows.append({
            "freq": freq, "diff": diff,
            "actual": actual_xp, "formula": formula_xp,
        })
    return {"quests": rows}


def main() -> None:
    eco = load_xp_economy()
    print(f"xp_economy.json v{eco.get('version')}  PREMIUM_XP_BUFF={eco['anchor']['PREMIUM_XP_BUFF']}")
    audit_progression()
    audit_quest_xp()
    print(f"\n=== Премиум-проверка ===")
    print(f"100 XP с премиум → {apply_premium_xp(100)} XP")


if __name__ == "__main__":
    main()
