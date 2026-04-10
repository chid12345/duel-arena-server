"""Данные прогрессии из progression.json и вспомогательные расчёты."""

from __future__ import annotations

import json
from pathlib import Path

_PKG = Path(__file__).resolve().parent
_JSON = _PKG.parent / "progression_100_levels_v4" / "progression.json"
p = json.load(open(_JSON, encoding="utf-8"))
XP_NEED = p["xp_to_next"]
XP_WIN = p["xp_per_win"]
STEPS = p["steps_per_level"]
STATS_ON = p["stats_on_reach"]
HP_ON = p["hp_on_reach"]
GOLD_ON = p["gold_on_reach"]

WIN_RATE = 0.42
MIN_PER_BATTLE = 2.0
PREM_MULT = 1.30

ZONES = {
    (1, 4): ("Новичок", "4472C4"),
    (5, 10): ("Боец", "70AD47"),
    (11, 22): ("Солдат", "FFC000"),
    (23, 40): ("Ветеран", "FF7F00"),
    (41, 65): ("Элита", "C00000"),
    (66, 85): ("Легенда", "7030A0"),
    (86, 100): ("Мастер", "1F1F1F"),
}
SPECIAL = {
    5: "Разблокировка рейтинга новичков",
    10: "Звание «Солдат» + ранговые бои",
    20: "Открывается лига Ветеранов",
    40: "Звание «Ветеран»",
    50: "Открывается Элитная лига",
    65: "Звание «Элита»",
    75: "Открывается лига Легенд",
    85: "Звание «Легенда»",
    99: "Последний рывок к мастерству",
    100: "🏆 МАСТЕР — максимальный уровень",
}


def zone_label(lv: int) -> str:
    for (lo, hi), (name, _) in ZONES.items():
        if lo <= lv <= hi:
            return name
    return ""


def zone_color(lv: int) -> str:
    for (lo, hi), (_, color) in ZONES.items():
        if lo <= lv <= hi:
            return color
    return "FFFFFF"


def ap_thresholds(need: int, steps: int) -> list[int]:
    return [(need * k) // (steps + 1) for k in range(1, steps + 1)]


def wins_to(xp: float, avg_xp_win: float) -> float:
    return xp / avg_xp_win if avg_xp_win > 0 else 0


def battles_to(xp: float, avg_xp_win: float) -> float:
    return wins_to(xp, avg_xp_win) / WIN_RATE if WIN_RATE > 0 else 0


def fmt_time(battles: float) -> str:
    mins = battles * MIN_PER_BATTLE
    h = int(mins // 60)
    m = int(mins % 60)
    if h == 0:
        return f"{m} мин"
    return f"{h}ч {m}м"


cum_xp = [0] * 101
for i in range(99):
    cum_xp[i + 2] = cum_xp[i + 1] + XP_NEED[i]
