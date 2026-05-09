"""
economy/xp_formulas.py — формулы опыта (XP).

Параллельно с progression.json: progression остаётся источником правды для
живого боя, эти формулы — для аудита и будущей калибровки.

Анкер-числа в config/xp_economy.json. Меняешь — пересчитываются формулы XP.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_CACHED: dict[str, Any] | None = None


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def xp_economy_path() -> Path:
    return _project_root() / "config" / "xp_economy.json"


def load_xp_economy(force: bool = False) -> dict[str, Any]:
    global _CACHED
    if _CACHED is not None and not force:
        return _CACHED
    with xp_economy_path().open("r", encoding="utf-8") as f:
        data = json.load(f)
    _CACHED = data
    return data


def get_xp_anchor(key: str) -> float:
    return float(load_xp_economy()["anchor"][key])


# ── XP за победу ─────────────────────────────────────────────────────────────

def xp_per_win(level: int) -> int:
    """Формульный XP за победу на уровне `level`.

    Формула из комментария progression.json:
        max(BASE, START + (level/100)^POWER * RATE)
    где BASE=80, START=70, POWER=1.5, RATE=180 — настраиваются в anchor.
    """
    anchor = load_xp_economy()["anchor"]
    base = anchor["XP_BASE_WIN"]
    start = anchor["XP_GROWTH_START"]
    rate = anchor["XP_GROWTH_RATE"]
    power = anchor["XP_GROWTH_POWER"]
    lv = max(1, int(level))
    return int(max(base, start + (lv / 100.0) ** power * rate))


def xp_per_loss(level: int) -> int:
    """XP за поражение — доля от победы."""
    fraction = get_xp_anchor("XP_DEFEAT_FRACTION")
    return int(xp_per_win(level) * fraction)


# ── XP до следующего уровня ──────────────────────────────────────────────────

def xp_to_next(level: int) -> int:
    """Сколько XP нужно набрать на уровне `level`, чтобы перейти на (level+1).

    Piecewise-линейная формула:
        base + level*lin + max(0, level-break1)*break1_bonus + max(0, level-break2)*break2_bonus
    """
    anchor = load_xp_economy()["anchor"]
    base = anchor["XP_TO_NEXT_BASE"]
    lin = anchor["XP_TO_NEXT_LIN"]
    b1 = int(anchor["XP_TO_NEXT_BREAK1"])
    b2 = int(anchor["XP_TO_NEXT_BREAK2"])
    bonus1 = anchor["XP_TO_NEXT_BREAK1_BONUS"]
    bonus2 = anchor["XP_TO_NEXT_BREAK2_BONUS"]
    lv = max(1, int(level))
    return int(base + lv * lin + max(0, lv - b1) * bonus1 + max(0, lv - b2) * bonus2)


# ── XP за квесты ─────────────────────────────────────────────────────────────

def xp_for_task(difficulty: str, frequency: str) -> int:
    """XP-награда за квест. Используется как параллельная формула."""
    eco = load_xp_economy()
    per_pu = float(eco["task_xp_per_pu"].get(difficulty, 0.0))
    mult = float(eco["task_freq_mult"].get(frequency, 1.0))
    return int(per_pu * mult)


# ── Премиум-буст ─────────────────────────────────────────────────────────────

def apply_premium_xp(xp: float) -> int:
    return int(xp * get_xp_anchor("PREMIUM_XP_BUFF"))


def reset_xp_cache() -> None:
    """Сброс кэша после правки xp_economy.json."""
    global _CACHED
    _CACHED = None


if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    print("=== XP формулы ===")
    print("Уровень | XP за победу | XP до следующего")
    for lv in (1, 10, 30, 50, 70, 80):
        print(f"{lv:7d} | {xp_per_win(lv):12d} | {xp_to_next(lv):16d}")
    print(f"\nXP за квесты:")
    for f in ("daily", "weekly", "once"):
        for d in ("easy", "medium", "hard", "epic"):
            print(f"  {f:6s} {d:6s} → {xp_for_task(d, f)}")
