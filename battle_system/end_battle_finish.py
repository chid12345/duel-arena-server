"""Вторая половина _end_battle: статы, титан/натиск, результат, очистка памяти."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict

from config import STREAK_BONUS_EVERY, STREAK_BONUS_GOLD

from battle_system.end_battle_finish_modes import run_titan_endless_progress
from battle_system.end_battle_finish_result import build_battle_ended_result

logger = logging.getLogger(__name__)


async def end_battle_rewards_and_finish(bs: Any, ctx: Dict[str, Any]) -> Dict[str, Any]:
    loop = ctx["loop"]
    battle_id = ctx["battle_id"]
    winner_id = ctx["winner_id"]
    exchange_text = ctx["exchange_text"]
    battle = ctx["battle"]
    duration_ms = ctx["duration_ms"]
    player1 = ctx["player1"]
    player2 = ctx["player2"]
    is_winner_p1 = ctx["is_winner_p1"]
    winner = ctx["winner"]
    loser = ctx["loser"]
    winner_user_id, loser_user_id = ctx["winner_user_id"], ctx["loser_user_id"]
    is_test = ctx["is_test"]
    battle_mode = ctx["battle_mode"]
    mode_meta = ctx["mode_meta"]
    winner_live = ctx["winner_live"]
    loser_live = ctx["loser_live"]
    xp_boosted = ctx["xp_boosted"]
    pvp_repeat_factor = ctx["pvp_repeat_factor"]
    winner_locked = ctx["winner_locked"]
    loser_locked = ctx["loser_locked"]
    winner_dmg = ctx["winner_dmg"]
    loser_dmg = ctx["loser_dmg"]
    gold_reward = ctx["gold_reward"]
    exp_reward = ctx["exp_reward"]
    loser_exp = ctx["loser_exp"]
    combat_log_html = ctx["combat_log_html"]
    elo_delta_w = ctx["elo_delta_w"]
    elo_delta_l = ctx["elo_delta_l"]

    streak_bonus_gold = 0
    new_win_streak = 0
    did_level = False
    level_up_level = None

    winner_stats = None
    if not is_test and winner_user_id is not None and not winner_locked:
        new_win_streak = winner_live.get("win_streak", 0) + 1
        total_gold = winner_live.get("gold", 0) + gold_reward
        if new_win_streak > 0 and new_win_streak % STREAK_BONUS_EVERY == 0:
            streak_bonus_gold = STREAK_BONUS_GOLD
            total_gold += streak_bonus_gold
        pl = dict(winner_live)
        pl["gold"] = total_gold
        exp_patch, did_level = bs._exp_progression_updates(pl, exp_reward, max_level_ups=1)
        if did_level:
            level_up_level = exp_patch["level"]
        winner_stats = {
            "wins": winner_live.get("wins", 0) + 1,
            "gold": exp_patch["gold"],
            "diamonds": exp_patch["diamonds"],
            "exp": exp_patch["exp"],
            "level": exp_patch["level"],
            "free_stats": exp_patch["free_stats"],
            "exp_milestones": exp_patch["exp_milestones"],
            "max_hp": exp_patch["max_hp"],
            "current_hp": exp_patch["current_hp"],
            "rating": int(winner_live.get("rating", 1000)) + elo_delta_w,
            "win_streak": new_win_streak,
        }

    defeat_gold = 0 if is_test else max(1, int(gold_reward * 0.10))

    loser_stats = None
    if not is_test and loser_user_id is not None and not loser_locked:
        loser_pl = dict(loser_live)
        loser_pl["gold"] = loser_pl.get("gold", 0) + defeat_gold
        loser_exp_patch, _ = bs._exp_progression_updates(loser_pl, loser_exp, max_level_ups=1)
        loser_stats = {
            "losses": loser_live.get("losses", 0) + 1,
            "win_streak": 0,
            "current_hp": max(0, int(loser.get("current_hp", 0))),
            "rating": max(100, int(loser_live.get("rating", 1000)) + elo_delta_l),
            "exp": loser_exp_patch["exp"],
            "exp_milestones": loser_exp_patch["exp_milestones"],
            "free_stats": loser_exp_patch["free_stats"],
            "level": loser_exp_patch["level"],
            "max_hp": loser_exp_patch["max_hp"],
            "gold": loser_exp_patch["gold"],
            "diamonds": loser_exp_patch["diamonds"],
        }

    titan_progress, endless_progress = await run_titan_endless_progress(
        loop,
        is_test=is_test,
        battle_mode=battle_mode,
        mode_meta=mode_meta,
        player1=player1,
        is_winner_p1=is_winner_p1,
        winner_locked=winner_locked,
        loser_locked=loser_locked,
        winner_stats=winner_stats,
    )

    n_rounds = len(battle["rounds"])
    battle_data = {
        "player1_id": player1["user_id"],
        "player2_id": player2.get("user_id") or player2.get("bot_id"),
        "is_bot1": battle["is_bot1"],
        "is_bot2": battle["is_bot2"],
        "winner_id": winner_id,
        "result": "victory" if is_winner_p1 else "defeat",
        "rounds": n_rounds,
        "details": {
            "rounds": [vars(r) for r in battle["rounds"]],
            "battle_log": battle["battle_log"],
            "mode": battle_mode,
            "mode_meta": mode_meta,
        },
    }

    result = build_battle_ended_result(
        bs,
        winner=winner,
        loser=loser,
        winner_id=winner_id,
        is_winner_p1=is_winner_p1,
        n_rounds=n_rounds,
        winner_dmg=winner_dmg,
        loser_dmg=loser_dmg,
        gold_reward=gold_reward,
        defeat_gold=defeat_gold,
        exp_reward=exp_reward,
        loser_exp=loser_exp,
        xp_boosted=xp_boosted,
        winner_locked=winner_locked,
        loser_locked=loser_locked,
        winner_user_id=winner_user_id,
        new_win_streak=new_win_streak,
        streak_bonus_gold=streak_bonus_gold,
        did_level=did_level,
        level_up_level=level_up_level,
        is_test=is_test,
        elo_delta_w=elo_delta_w,
        elo_delta_l=elo_delta_l,
        duration_ms=duration_ms,
        exchange_text=exchange_text,
        combat_log_html=combat_log_html,
        player1=player1,
        player2=player2,
        battle=battle,
        battle_mode=battle_mode,
        mode_meta=mode_meta,
        pvp_repeat_factor=pvp_repeat_factor,
        titan_progress=titan_progress,
        endless_progress=endless_progress,
    )

    if battle.get("is_bot2") and player1.get("user_id") is not None:
        bs.remember_battle_end_ui(player1["user_id"], result)
    elif not battle.get("is_bot2"):
        if player1.get("user_id") is not None:
            bs.remember_battle_end_ui(player1["user_id"], result)
        if player2.get("user_id") is not None:
            bs.remember_battle_end_ui(player2["user_id"], result)

    if player1["user_id"] in bs.battle_queue:
        del bs.battle_queue[player1["user_id"]]
    if not battle["is_bot2"] and player2.get("user_id") in bs.battle_queue:
        del bs.battle_queue[player2["user_id"]]
    del bs.active_battles[battle_id]

    event_name = "battle_test_ended" if is_test else "battle_ended"
    logger.info("event=%s winner_id=%s rounds=%s duration_ms=%s", event_name, winner_id, n_rounds, duration_ms)
    asyncio.create_task(
        bs._persist_battle_writes(
            winner_user_id,
            loser_user_id,
            winner_stats,
            loser_stats,
            winner_locked,
            loser_locked,
            battle_data,
            battle_mode,
            is_test,
            winner_id,
            n_rounds,
            duration_ms,
        )
    )

    return result
