"""Вторая половина _end_battle: статы, титан/натиск, результат, очистка памяти."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict

from config import STREAK_BONUS_EVERY, STREAK_BONUS_GOLD

from battle_system.end_battle_finalize import (
    cleanup_queue_and_active, invalidate_tma_cache, log_stat, remember_ui,
    update_bot_win_streak,
)
from battle_system.end_battle_finish_modes import run_titan_endless_progress
from battle_system.end_battle_finish_result import build_battle_ended_result
from repositories.social.clan_bonus import apply_clan_win_bonus

logger = logging.getLogger(__name__)


async def end_battle_rewards_and_finish(bs: Any, ctx: Dict[str, Any]) -> Dict[str, Any]:
    loop, battle_id, winner_id = ctx["loop"], ctx["battle_id"], ctx["winner_id"]
    exchange_text, battle, duration_ms = ctx["exchange_text"], ctx["battle"], ctx["duration_ms"]
    player1, player2, is_winner_p1 = ctx["player1"], ctx["player2"], ctx["is_winner_p1"]
    winner, loser = ctx["winner"], ctx["loser"]
    winner_user_id, loser_user_id = ctx["winner_user_id"], ctx["loser_user_id"]
    is_test, battle_mode, mode_meta = ctx["is_test"], ctx["battle_mode"], ctx["mode_meta"]
    winner_live, loser_live = ctx["winner_live"], ctx["loser_live"]
    xp_boosted, pvp_repeat_factor = ctx["xp_boosted"], ctx["pvp_repeat_factor"]
    winner_locked, loser_locked = ctx["winner_locked"], ctx["loser_locked"]
    winner_dmg, loser_dmg = ctx["winner_dmg"], ctx["loser_dmg"]
    gold_reward, exp_reward, loser_exp = ctx["gold_reward"], ctx["exp_reward"], ctx["loser_exp"]
    combat_log_html = ctx["combat_log_html"]
    elo_delta_w, elo_delta_l = ctx["elo_delta_w"], ctx["elo_delta_l"]

    streak_bonus_gold = 0
    new_win_streak = 0
    did_level = False
    level_up_level = None

    winner_stats = None
    if not is_test and winner_user_id is not None and not winner_locked:
        new_win_streak = winner_live.get("win_streak", 0) + 1
        # Бафф клана: +5% к золоту победителю + bump activity + clan progress
        from database import db as _db
        gold_reward = apply_clan_win_bonus(_db, winner_user_id, gold_reward)
        total_gold = winner_live.get("gold", 0) + gold_reward
        if new_win_streak > 0 and new_win_streak % STREAK_BONUS_EVERY == 0:
            streak_bonus_gold = STREAK_BONUS_GOLD
            total_gold += streak_bonus_gold
        pl = dict(winner_live)
        pl["gold"] = total_gold
        exp_patch, did_level = bs._exp_progression_updates(pl, exp_reward, max_level_ups=1)
        if did_level:
            level_up_level = exp_patch["level"]
        # HP победителя: при левелапе — полное восстановление, иначе — боевое HP
        battle_hp = max(0, int(winner.get("current_hp", 0)))
        winner_hp = exp_patch["current_hp"] if did_level else min(battle_hp, exp_patch["max_hp"])
        logger.info(
            "winner_hp_calc uid=%s battle_hp=%s max_hp=%s did_level=%s → winner_hp=%s exp_reward=%s",
            winner_user_id, battle_hp, exp_patch["max_hp"], did_level, winner_hp, exp_reward,
        )
        winner_stats = {
            "wins": winner_live.get("wins", 0) + 1,
            "gold": exp_patch["gold"],
            "diamonds": exp_patch["diamonds"],
            "exp": exp_patch["exp"],
            "level": exp_patch["level"],
            "free_stats": exp_patch["free_stats"],
            "exp_milestones": exp_patch["exp_milestones"],
            "max_hp": exp_patch["max_hp"],
            "current_hp": winner_hp,
            "rating": int(winner_live.get("rating", 1000)) + elo_delta_w,
            "win_streak": new_win_streak,
        }

    defeat_gold = 0 if is_test else max(1, int(gold_reward * 0.10))

    loser_stats = None
    loser_did_level = False
    if not is_test and loser_user_id is not None and not loser_locked:
        loser_pl = dict(loser_live)
        loser_pl["gold"] = max(0, loser_pl.get("gold", 0) + defeat_gold)
        loser_exp_patch, loser_did_level = bs._exp_progression_updates(loser_pl, loser_exp, max_level_ups=1)
        # HP проигравшего: при левелапе — полное восстановление, иначе — боевое HP
        loser_battle_hp = max(0, int(loser.get("current_hp", 0)))
        loser_hp = loser_exp_patch["current_hp"] if loser_did_level else loser_battle_hp
        loser_stats = {
            "losses": loser_live.get("losses", 0) + 1,
            "win_streak": 0,
            "current_hp": loser_hp,
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
            "webapp_log": list(battle.get("webapp_log", [])),
            "mode": battle_mode,
            "mode_meta": mode_meta,
            "opponent_names": {
                "p1": bs._entity_name(battle["player1"]),
                "p2": bs._entity_name(battle["player2"]),
            },
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

    result["battle_id"] = battle_id  # нужен фронтенду для защиты от "старых" WS-событий

    remember_ui(bs, battle, player1, player2, result)
    # PvE: серия побед бота — для надписи «🔥 N подряд» в карточке.
    update_bot_win_streak(battle, bot_won=not is_winner_p1)
    cleanup_queue_and_active(bs, battle, battle_id, player1, player2)
    log_stat(loop, is_test=is_test, battle=battle, winner=winner, loser=loser,
             winner_user_id=winner_user_id, loser_user_id=loser_user_id,
             battle_mode=battle_mode, n_rounds=n_rounds)

    event_name = "battle_test_ended" if is_test else "battle_ended"
    logger.info("event=%s winner_id=%s rounds=%s duration_ms=%s", event_name, winner_id, n_rounds, duration_ms)
    # await вместо fire-and-forget: БД обновляется ДО ответа пользователю,
    # иначе профиль показывает старые данные (XP/уровень не сохранялись вовремя).
    await bs._persist_battle_writes(
        winner_user_id, loser_user_id, winner_stats, loser_stats,
        winner_locked, loser_locked, battle_data, battle_mode,
        is_test, winner_id, n_rounds, duration_ms,
    )

    invalidate_tma_cache(winner_user_id, loser_user_id)
    return result
