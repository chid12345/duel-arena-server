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


def make_player(level: int, build: str = "balanced") -> dict:
    """Игрок со стартовыми статами + распределением свободных по билду."""
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
    return {
        "user_id": 900_000 + level,
        "level": level,
        "strength": s,
        "endurance": e,
        "crit": c,
        "max_hp": hp,
        "current_hp": hp,
        "username": f"P_lv{level}_{build}",
        "wins": 0, "losses": 0, "gold": 0, "exp": 0, "rating": 1000,
        "win_streak": 0, "free_stats": 0, "diamonds": 0, "exp_milestones": 0,
    }


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


async def run_simulation(player_level: int, build: str, weak_bot: bool, n: int = 300):
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
        p = make_player(player_level, build)
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
    cases = [
        (1, "balanced", True),    # онбординг (первые 5 боев)
        (1, "balanced", False),   # после онбординга
        (5, "balanced", False),
        (10, "balanced", False),
        (30, "balanced", False),
        (50, "balanced", False),
        (100, "balanced", False),
        (10, "tank", False),
        (10, "brute", False),
    ]
    results = []
    for lv, build, weak in cases:
        res = await run_simulation(lv, build, weak, n=200)
        if res:
            results.append(res)
            tag = "ослабленный" if weak else "обычный"
            print(f"Lv{lv:>3} {build:>9} bot={tag:>11}: "
                  f"win={res['win_rate']:5.1f}% "
                  f"rounds={res['avg_rounds']:5.2f} "
                  f"dmg_opp={res['avg_dmg_opp']:6.1f} "
                  f"dmg_you={res['avg_dmg_you']:6.1f} "
                  f"afk_loss={res['afk_losses']}")
    return results


if __name__ == "__main__":
    asyncio.run(main())
