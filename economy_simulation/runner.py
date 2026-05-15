"""Один прогон симуляции экономики: N дней по профилю.

Использует РЕАЛЬНЫЕ источники чисел:
    reward_calculator.REWARD_TABLE — daily/weekly quests
    LOGIN_STREAK_SETS              — стрик входа
    ACHIEVEMENT_DEFS               — ачивки
    db_core.week_utils             — топ-награды башни
    config/economy.json (anchor)   — PVP_*, DAILY_BONUS_GOLD, PREMIUM_*, POST_CAP_XP_TO_GOLD
    config.exp_needed_for_next_level + MAX_LEVEL — рост уровня

XP за бой: усреднение из progression-таблицы (без реального боя).
"""

from __future__ import annotations

import random
from typing import Any

from reward_calculator import calc_reward
from repositories.quests.definitions_tasks import (
    DAILY_QUEST_DEFS, WEEKLY_EXTRA_DEFS, LOGIN_STREAK_SETS,
)
from repositories.quests.definitions_achieve import ACHIEVEMENT_DEFS
from db_core.week_utils import weekly_titan_rank_reward
from config import MAX_LEVEL, exp_needed_for_next_level
from economy import get_anchor


def _xp_for_battle(level: int, won: bool) -> int:
    """Грубая модель XP за один бой. Растёт от уровня (как need-кривая)."""
    base = max(20, level * 4)
    return int(base * (1.0 if won else 0.4))


def _claim_one_quest_set(rng: random.Random, defs: list[dict], rate: float
                        ) -> tuple[int, int, int]:
    """Прокликать долю rate из набора квестов. Возвращает (gold, dia, xp)."""
    g = d = x = 0
    for q in defs:
        if rng.random() < rate:
            qg, qd, qx = calc_reward(q["difficulty"], q["frequency"])
            g += qg; d += qd; x += qx
    return g, d, x


def _apply_xp_and_levelup(state: dict, xp_add: int, post_cap_rate: float
                         ) -> int:
    """Эмулирует grant_exp_with_levelup без БД. Возвращает xp_to_gold bonus."""
    state["xp_buffer"] = int(state.get("xp_buffer", 0)) + int(xp_add)
    while state["level"] < MAX_LEVEL:
        need = exp_needed_for_next_level(state["level"])
        if need <= 0 or state["xp_buffer"] < need:
            break
        state["xp_buffer"] -= need
        state["level"] += 1
    xp_to_gold = 0
    if state["level"] >= MAX_LEVEL and state["xp_buffer"] > 0:
        xp_to_gold = int(state["xp_buffer"] * post_cap_rate)
        state["xp_buffer"] = 0
    return xp_to_gold


def _simulate_day(profile: dict, state: dict, day_idx: int,
                  rng: random.Random, anchors: dict[str, float]) -> dict[str, int]:
    """Один день игрока. Обновляет state, возвращает прирост за день."""
    gold = 0
    diamonds = 0
    xp = 0

    # 1. Daily-бонус
    gold += int(anchors["DAILY_BONUS_GOLD"])

    # 2. Стрик входа: если залогинился сегодня
    if rng.random() < profile["streak_login_rate"]:
        sd = state["streak_day"] + 1
        if sd > 7:
            sd = 1
            state["week_set"] = (state["week_set"] + 1) % 4
        state["streak_day"] = sd
        reward = LOGIN_STREAK_SETS[state["week_set"]][sd - 1]
        gold += int(reward.get("gold") or 0)
        diamonds += int(reward.get("diamonds") or 0)
        xp += int(reward.get("xp") or 0)

    # 3. PvP-бои
    n_battles = rng.randint(profile["battles_per_day"][0], profile["battles_per_day"][1])
    pvp_gold = pvp_xp = 0
    for _ in range(n_battles):
        if rng.random() < profile["winrate"]:
            pvp_gold += int(anchors["PVP_WIN_GOLD"])
            pvp_xp += _xp_for_battle(state["level"], True)
        else:
            pvp_gold += int(anchors["PVP_DEFEAT_GOLD"])
            pvp_xp += _xp_for_battle(state["level"], False)
    # Премиум-бонус +25% применяется ТОЛЬКО к наградам за бои (не за квесты).
    if profile["premium"]:
        pvp_gold = int(pvp_gold * anchors["PREMIUM_GOLD_BUFF"])
        pvp_xp = int(pvp_xp * anchors["PREMIUM_XP_BUFF"])
    gold += pvp_gold
    xp += pvp_xp

    # 4. Daily-квесты — clean per-quest probability
    dg, dd, dx = _claim_one_quest_set(rng, DAILY_QUEST_DEFS, profile["daily_quest_rate"])
    gold += dg; diamonds += dd; xp += dx

    # 5. Weekly-квесты — клеймятся в конце недели (day 7)
    if state["streak_day"] == 7:
        wg, wd, wx = _claim_one_quest_set(rng, WEEKLY_EXTRA_DEFS, profile["weekly_quest_rate"])
        gold += wg; diamonds += wd; xp += wx
        # Топ-награда башни (если профиль в топе)
        if profile["tower_rank"]:
            td, tg, _ = weekly_titan_rank_reward(profile["tower_rank"])
            gold += tg; diamonds += td

    # 6. Ачивки — медленный прогресс, в среднем N тиров в неделю
    if rng.random() < profile["ach_tiers_per_week"] / 7:
        ach = rng.choice(ACHIEVEMENT_DEFS)
        next_tier_idx = state["ach_progress"].get(ach["key"], 0)
        if next_tier_idx < len(ach["tiers"]):
            t = ach["tiers"][next_tier_idx]
            gold += int(t["gold"]); diamonds += int(t["diamonds"]); xp += int(t["xp"])
            state["ach_progress"][ach["key"]] = next_tier_idx + 1

    # 7. XP→level + post-cap конвертация
    xp_to_gold = _apply_xp_and_levelup(state, xp, anchors["POST_CAP_XP_TO_GOLD"])
    gold += xp_to_gold

    return {
        "gold": gold, "xp": xp, "diamonds": diamonds,
        "xp_to_gold": xp_to_gold, "level": state["level"],
    }


def simulate_one_run(profile: dict, days: int, rng: random.Random,
                     anchors: dict[str, float]) -> list[dict[str, int]]:
    """Один прогон симуляции N дней. Возвращает массив дневных приростов."""
    state: dict[str, Any] = {
        "level": profile["level"],
        "xp_buffer": 0,
        "streak_day": 0,
        "week_set": 0,
        "ach_progress": {},
    }
    return [_simulate_day(profile, state, i, rng, anchors) for i in range(days)]
