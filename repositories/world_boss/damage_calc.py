"""Расчёт урона в рейде (чистые функции, без БД).

Все расчёты делаются **на сервере** — клиент не шлёт урон, только триггер «бью».
Это анти-чит.
"""
from __future__ import annotations

import random
from typing import Any, Dict, Optional, Tuple

# Множители рейд-свитков (docs/WORLD_BOSS.md).
RAID_SCROLL_EFFECTS = {
    "damage_25":  {"damage_mult": 1.25},
    "defense_20": {"defense_mult": 1.20},
    "dodge_10":   {"dodge_bonus": 0.10},
    "power_10":   {"damage_mult": 1.10},  # стак с damage_25
    "crit_10":    {"crit_chance_bonus": 0.10},
}

VULNERABILITY_WINDOW_MULT = 3.0
CRIT_MULT_DEFAULT = 1.5

# Ответка босса.
BOSS_ATTACK_COOLDOWN_SEC = 6
BOSS_ATTACK_PCT_HP = 0.08

# Анти-чит: минимальный интервал между ударами игрока (мс).
PLAYER_HIT_COOLDOWN_MS = 300


def _collect_raid_mults(scroll_1: Optional[str], scroll_2: Optional[str]) -> Dict[str, float]:
    mults = {"damage_mult": 1.0, "defense_mult": 1.0, "dodge_bonus": 0.0, "crit_chance_bonus": 0.0}
    for s in (scroll_1, scroll_2):
        eff = RAID_SCROLL_EFFECTS.get(s or "", {})
        if "damage_mult" in eff:
            mults["damage_mult"] *= eff["damage_mult"]
        if "defense_mult" in eff:
            mults["defense_mult"] *= eff["defense_mult"]
        if "dodge_bonus" in eff:
            mults["dodge_bonus"] += eff["dodge_bonus"]
        if "crit_chance_bonus" in eff:
            mults["crit_chance_bonus"] += eff["crit_chance_bonus"]
    return mults


def calc_player_damage_to_boss(
    player_stats: Dict[str, Any],
    boss_stat_profile: Dict[str, float],
    scroll_1: Optional[str] = None,
    scroll_2: Optional[str] = None,
    is_vulnerability_window: bool = False,
    rng: Optional[random.Random] = None,
) -> Tuple[int, bool, Dict[str, Any]]:
    """Считает урон игрока по боссу.
    Возвращает (damage, is_crit, debug).
    """
    rng = rng or random
    base = max(1, int(player_stats.get("strength", 10)))
    crit_base = float(player_stats.get("crit_chance", 0.05))

    mults = _collect_raid_mults(scroll_1, scroll_2)
    crit_chance = min(0.9, crit_base + mults["crit_chance_bonus"])
    is_crit = rng.random() < crit_chance

    # Босс гасит часть урона ловкостью (из stat_profile).
    boss_agi = float(boss_stat_profile.get("agi", 1.0))
    dmg = base * mults["damage_mult"] / max(0.5, boss_agi)
    if is_crit:
        dmg *= CRIT_MULT_DEFAULT
    if is_vulnerability_window:
        dmg *= VULNERABILITY_WINDOW_MULT

    dmg_int = max(1, int(dmg))
    return (dmg_int, is_crit, {
        "base": base,
        "dmg_mult": mults["damage_mult"],
        "crit": is_crit,
        "vuln": is_vulnerability_window,
        "boss_agi": boss_agi,
    })


def calc_boss_attack_damage(
    player_state: Dict[str, Any],
    boss_stat_profile: Dict[str, float],
    scroll_1: Optional[str] = None,
    scroll_2: Optional[str] = None,
    rng: Optional[random.Random] = None,
) -> Tuple[int, bool, Dict[str, Any]]:
    """Считает урон босса по игроку (ответка каждые 6 сек).
    Возвращает (damage, is_dodged, debug).
    Если игрок увернулся — damage=0, is_dodged=True.
    """
    rng = rng or random
    max_hp = int(player_state.get("max_hp", 100))
    mults = _collect_raid_mults(scroll_1, scroll_2)

    # Уворот от ответки.
    dodge_base = float(player_state.get("dodge_chance", 0.05))
    dodge = min(0.8, dodge_base + mults["dodge_bonus"])
    if rng.random() < dodge:
        return (0, True, {"dodged": True, "dodge_chance": dodge})

    boss_str = float(boss_stat_profile.get("str", 1.0))
    raw = BOSS_ATTACK_PCT_HP * max_hp * boss_str
    mitigated = raw / mults["defense_mult"]
    dmg = max(1, int(mitigated))
    return (dmg, False, {
        "raw": raw, "defense_mult": mults["defense_mult"],
        "boss_str": boss_str,
    })


def roll_boss_stat_profile(
    rng: Optional[random.Random] = None,
    base: Optional[Dict[str, float]] = None,
) -> Dict[str, float]:
    """Рандом ±10% по 3 статам, умноженный на базовый профиль типа (если задан).

    Без base — сбалансированный universal (совместимо со старым вызовом).
    С base (например fire {str:1.15, int:0.85}) — рандом вокруг него:
    итоговый str ≈ 1.15 × uniform(0.9,1.1).
    """
    rng = rng or random
    b = base or {"str": 1.0, "agi": 1.0, "int": 1.0}
    return {
        "str": round(float(b.get("str", 1.0)) * rng.uniform(0.9, 1.1), 3),
        "agi": round(float(b.get("agi", 1.0)) * rng.uniform(0.9, 1.1), 3),
        "int": round(float(b.get("int", 1.0)) * rng.uniform(0.9, 1.1), 3),
    }
