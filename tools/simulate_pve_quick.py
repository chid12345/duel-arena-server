"""Быстрая симуляция PvE без БД: синтетический игрок vs синтетический бот.

Запуск: python tools/simulate_pve_quick.py
"""
from __future__ import annotations

import asyncio
import random
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    PLAYER_START_STRENGTH, PLAYER_START_ENDURANCE, PLAYER_START_CRIT,
    PLAYER_START_MAX_HP, PLAYER_START_FREE_STATS, STAMINA_PER_FREE_STAT,
    ONBOARDING_BOT_STAT_MULT,
)
from repositories.bots.stats import BotsStatsMixin


class _StatsHelper(BotsStatsMixin):
    pass


def make_player(level: int, build: str = "balanced",
                warrior_type: str = "default", gear: str = "none") -> dict:
    """Игрок со статами по билду, опционально с warrior_type и экипировкой."""
    helper = _StatsHelper()
    s, e, c, hp = helper._compute_bot_stats_for_level(level)
    if build == "balanced":
        pass
    elif build == "tank":
        e = e + s // 2
        hp = hp + (s // 2) * STAMINA_PER_FREE_STAT
        s = max(1, s - s // 2)
    elif build == "brute":
        s = s + e // 2
        e = max(1, e - e // 2)
    elif build == "crit":
        c = c + (s + e) // 3
        s = max(1, s - s // 4)
    p = {
        "user_id": 900_000 + level,
        "level": level,
        "strength": s,
        "endurance": e,
        "crit": c,
        "max_hp": hp,
        "current_hp": hp,
        "username": f"P_lv{level}_{build}_{warrior_type}_{gear}",
        "wins": 0, "losses": 0, "gold": 0, "exp": 0, "rating": 1000,
        "win_streak": 0, "free_stats": 0, "diamonds": 0, "exp_milestones": 0,
        "warrior_type": warrior_type,
    }
    # Экипировка: реальные суммы из db_schema/equipment_catalog по полному сету (6 слотов).
    if gear == "common":
        p["_eq_atk_bonus"] = 8
        p["_eq_def_pct"]   = 0.05
        p["max_hp"]       += 90; p["current_hp"] = p["max_hp"]
        p["_eq_dodge_bonus"] = 3
        p["strength"]     += 2
        p["_eq_accuracy"] = 3
    elif gear == "rare":
        p["_eq_atk_bonus"] = 38
        p["_eq_def_pct"]   = 0.11
        p["max_hp"]       += 80; p["current_hp"] = p["max_hp"]
        p["crit"]         += 5
        p["_eq_dodge_bonus"] = 7
        p["strength"]     += 1; p["endurance"] += 1; p["crit"] += 1
        p["_eq_accuracy"] = 7
    elif gear == "epic":
        p["_eq_atk_bonus"] = 70
        p["_eq_def_pct"]   = 0.20
        p["max_hp"]       += 180; p["current_hp"] = p["max_hp"]
        p["crit"]         += 10
        p["_eq_dodge_bonus"] = 13
        p["strength"]     += 2; p["endurance"] += 2; p["crit"] += 2
        p["_eq_accuracy"] = 12
    elif gear == "mythic":
        p["_eq_atk_bonus"] = 87
        p["_eq_def_pct"]   = 0.24
        p["_eq_pen_pct"]   = 0.03
        p["max_hp"]       += 320; p["current_hp"] = p["max_hp"]
        p["crit"]         += 10
        p["_eq_dodge_bonus"] = 16
        p["_eq_regen_bonus"] = 22
        p["strength"]     += 4; p["endurance"] += 4; p["crit"] += 4
        p["_eq_accuracy"] = 18
    return p


def make_bot(level: int, weak: bool = False) -> dict:
    helper = _StatsHelper()
    s, e, c, hp = helper._compute_bot_stats_for_level(level)
    bot = {
        "bot_id": 700_000 + level,
        "level": level,
        "strength": s,
        "endurance": e,
        "crit": c,
        "max_hp": hp,
        "current_hp": hp,
        "name": f"Bot_lv{level}",
        "ai_pattern": random.choice(("aggressive", "defensive", "balanced")),
        "bot_type": "novice",
    }
    if weak:
        m = ONBOARDING_BOT_STAT_MULT
        bot["max_hp"]   = max(30, int(bot["max_hp"]   * m))
        bot["current_hp"] = bot["max_hp"]
        bot["strength"]  = max(5, int(bot["strength"]  * m))
        bot["endurance"] = max(5, int(bot["endurance"] * m))
        bot["crit"]      = max(1, int((bot["crit"] or 1) * m))
    return bot


async def run_simulation(player_level: int, build: str, weak_bot: bool, n: int = 300,
                         warrior_type: str = "default", gear: str = "none"):
    from battle_system import BattleSystem

    class SimBattleSystem(BattleSystem):
        def schedule_turn_timer(self, battle_id):
            return None

    bs = SimBattleSystem()
    wins = 0
    rounds_total = 0
    dmg_to_opp_total = 0
    dmg_to_you_total = 0
    afk_losses = 0
    valid = 0

    for _ in range(n):
        p = make_player(player_level, build, warrior_type=warrior_type, gear=gear)
        b = make_bot(player_level, weak=weak_bot)
        try:
            await bs.start_battle(p, b, is_bot2=True, is_test_battle=True)
        except Exception as ex:
            print(f"start_battle err: {ex}")
            continue
        uid = p["user_id"]
        for _ in range(600):
            r = await bs.submit_auto_round(uid)
            if r.get("error"):
                break
            st = r.get("status")
            if st in ("battle_ended", "battle_ended_afk"):
                valid += 1
                if r.get("human_won"):
                    wins += 1
                if st == "battle_ended_afk":
                    afk_losses += 1
                rounds_total += int(r.get("rounds") or 0)
                dmg_to_opp_total += int(r.get("damage_to_opponent") or 0)
                dmg_to_you_total += int(r.get("damage_to_you") or 0)
                break

    if valid == 0:
        return None
    return {
        "level": player_level,
        "build": build,
        "weak_bot": weak_bot,
        "n": valid,
        "win_rate": 100.0 * wins / valid,
        "avg_rounds": rounds_total / valid,
        "avg_dmg_opp": dmg_to_opp_total / valid,
        "avg_dmg_you": dmg_to_you_total / valid,
        "afk_losses": afk_losses,
    }


async def main():
    random.seed(42)
    # (lv, build, weak_bot, warrior_type, gear, label)
    cases = [
        (1, "balanced", True,  "default", "none",   "Онбординг Lv1"),
        (1, "balanced", False, "default", "none",   "Голый Lv1"),
        (10, "balanced", False, "default", "none",  "Голый Lv10 balanced"),
        (50, "balanced", False, "default", "none",  "Голый Lv50 balanced"),
        # Влияние класса воина на одинаковом билде
        (10, "balanced", False, "tank",    "none",  "Lv10 + Берсерк"),
        (10, "balanced", False, "agile",   "none",  "Lv10 + Тен.Вихрь"),
        (10, "balanced", False, "crit",    "none",  "Lv10 + Хаос-Рыц."),
        # Влияние снаряжения (один билд, разная экипировка)
        (10, "balanced", False, "default", "common", "Lv10 + common сет"),
        (10, "balanced", False, "default", "rare",  "Lv10 + редкий сет"),
        (10, "balanced", False, "default", "epic",  "Lv10 + эпик сет"),
        (10, "balanced", False, "default", "mythic","Lv10 + мифик сет"),
        (50, "balanced", False, "default", "epic",  "Lv50 + эпик сет"),
        (50, "balanced", False, "default", "mythic","Lv50 + мифик сет"),
        # Билды без типа vs со своим типом
        (10, "tank",  False, "default", "none",  "Lv10 END-билд голый"),
        (10, "brute", False, "tank",    "none",  "Lv10 STR-билд+Берс"),
        (10, "crit",  False, "crit",    "none",  "Lv10 CRT-билд+Хаос"),
    ]
    print(f"{'Сценарий':<28} {'win':>6} {'раунды':>7} {'dmg-opp':>8} {'dmg-you':>8}")
    print("-" * 60)
    for lv, build, weak, wt, gear, label in cases:
        res = await run_simulation(lv, build, weak, n=200, warrior_type=wt, gear=gear)
        if res:
            print(f"{label:<28} {res['win_rate']:5.1f}% {res['avg_rounds']:6.2f}  "
                  f"{res['avg_dmg_opp']:5.0f}  {res['avg_dmg_you']:5.0f}")


if __name__ == "__main__":
    asyncio.run(main())
