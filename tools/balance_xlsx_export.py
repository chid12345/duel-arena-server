"""
tools/balance_xlsx_export.py — генератор балансной таблицы Duel Arena.

Единый источник правды для кривых по уровням. Запускается вручную или в CI:
    python -m tools.balance_xlsx_export

Производит два артефакта с одинаковыми числами:
    1. Калькулятор_экономики_игры.xlsx — для геймдиза (визуализация)
    2. config/balance_curve.json       — для runtime (читается economy/curves.py)

Анкер — в CONFIG ниже. Меняй здесь, потом запускай скрипт. Этап 1 редизайна.
xlsx-вывод — в tools/_balance_xlsx_writer.py (Закон 2 — отдельный «дом»).
"""
from __future__ import annotations

import json
from pathlib import Path

from tools._balance_xlsx_writer import write_xlsx

# ── АНКЕР: меняй здесь, потом перезапусти скрипт ─────────────────────────────

CONFIG = {
    "days_to_max_level": 90,
    "pu_per_day": 1.5,
    "max_level": 80,
    "tier_thresholds": {"T1": 1, "T2": 20, "T3": 45, "T4": 65},
    "pvp_brackets": [
        {"id": 0, "min": 1,  "max": 10, "xp_base": 60,  "gold_base": 18},
        {"id": 1, "min": 11, "max": 25, "xp_base": 120, "gold_base": 28},
        {"id": 2, "min": 26, "max": 50, "xp_base": 220, "gold_base": 42},
        {"id": 3, "min": 51, "max": 80, "xp_base": 360, "gold_base": 60},
    ],
    "premium_effects": {
        "xp_buff": 1.25,
        "gold_buff": 1.25,
        "inventory_extra_slots": 20,
        "wb_cooldown_reduction_pct": 50,
        "extra_daily_quests": 1,
    },
    "upgrades": {
        "max_plus_per_tier": {"T1": 5, "T2": 8, "T3": 10, "T4": 12},
        "stat_step_pct": 0.08,
        "fail_chance_start": 6,
    },
    "sets": [
        {"id": "predator", "name": "Хищник",  "emoji": "🐍"},
        {"id": "bastion",  "name": "Бастион", "emoji": "🛡"},
        {"id": "berserk",  "name": "Берсерк", "emoji": "⚔"},
        {"id": "ghost",    "name": "Призрак", "emoji": "👻"},
        {"id": "mage",     "name": "Маг",     "emoji": "🔮"},
        {"id": "regent",   "name": "Регент",  "emoji": "👑"},
    ],
}

ROOT = Path(__file__).resolve().parent.parent
PROG_PATH = ROOT / "progression_100_levels_v4" / "progression.json"
JSON_OUT = ROOT / "config" / "balance_curve.json"
XLSX_OUT = ROOT / "Калькулятор_экономики_игры.xlsx"


# ── Расчёты ─────────────────────────────────────────────────────────────────

def load_progression() -> dict:
    return json.loads(PROG_PATH.read_text(encoding="utf-8"))


def tier_unlocked_at(level: int) -> str:
    th = CONFIG["tier_thresholds"]
    if level >= th["T4"]: return "T4"
    if level >= th["T3"]: return "T3"
    if level >= th["T2"]: return "T2"
    return "T1"


def tiers_available_at(level: int) -> list[str]:
    return [t for t in ("T1", "T2", "T3", "T4")
            if level >= CONFIG["tier_thresholds"][t]]


def pvp_bracket_at(level: int) -> int:
    for b in CONFIG["pvp_brackets"]:
        if b["min"] <= level <= b["max"]:
            return b["id"]
    return CONFIG["pvp_brackets"][-1]["id"]


def _gold_per_pu_for_bracket(bracket_id: int, wins_per_pu: int = 12) -> int:
    return wins_per_pu * CONFIG["pvp_brackets"][bracket_id]["gold_base"]


def build_by_level(prog: dict) -> tuple[list[dict], float]:
    xp_to_next = prog["xp_to_next"]
    stats_on_reach = prog.get("stats_on_reach", [0] * CONFIG["max_level"])
    max_level = CONFIG["max_level"]

    total_xp_to_max = sum(xp_to_next[:max_level - 1])
    pu_total = CONFIG["days_to_max_level"] * CONFIG["pu_per_day"]
    xp_per_pu = total_xp_to_max / pu_total if pu_total > 0 else 1.0

    xp_cum, power_cum = 0, 0
    rows = []
    for lvl in range(1, max_level + 1):
        idx = lvl - 1
        power_cum += int(stats_on_reach[idx]) if idx < len(stats_on_reach) else 0
        days_to_reach = (round(xp_cum / (CONFIG["pu_per_day"] * xp_per_pu), 2)
                         if xp_per_pu > 0 else 0.0)
        bracket = pvp_bracket_at(lvl)
        rows.append({
            "level": lvl,
            "xp_to_next": xp_to_next[idx] if idx < len(xp_to_next) else 0,
            "xp_cum": xp_cum,
            "power": power_cum,
            "days_to_reach": days_to_reach,
            "tier_unlock": tier_unlocked_at(lvl),
            "tiers_available": tiers_available_at(lvl),
            "pvp_bracket": bracket,
            "gold_per_pu": _gold_per_pu_for_bracket(bracket),
        })
        if idx < len(xp_to_next):
            xp_cum += xp_to_next[idx]

    return rows, xp_per_pu


def build_payload(prog: dict) -> dict:
    rows, xp_per_pu = build_by_level(prog)
    return {
        "version": 1,
        "_comment": "Сгенерирован tools/balance_xlsx_export.py. Не редактировать руками.",
        "anchor": {
            "days_to_max_level": CONFIG["days_to_max_level"],
            "pu_per_day": CONFIG["pu_per_day"],
            "max_level": CONFIG["max_level"],
            "xp_per_pu_avg": round(xp_per_pu, 2),
        },
        "tier_thresholds": CONFIG["tier_thresholds"],
        "pvp_brackets": CONFIG["pvp_brackets"],
        "premium_effects": CONFIG["premium_effects"],
        "upgrades": CONFIG["upgrades"],
        "sets": CONFIG["sets"],
        "by_level": rows,
    }


# ── CLI ──────────────────────────────────────────────────────────────────────

def main() -> int:
    prog = load_progression()
    payload = build_payload(prog)
    JSON_OUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_xlsx(payload, XLSX_OUT)
    print(f"JSON: {JSON_OUT}")
    print(f"XLSX: {XLSX_OUT}")
    print(f"Calibration: {CONFIG['days_to_max_level']} days * "
          f"{CONFIG['pu_per_day']} PU = {payload['anchor']['xp_per_pu_avg']} XP/PU")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
