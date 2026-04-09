"""Словарь результата обычного завершения боя (для end_battle_rewards_and_finish)."""

from __future__ import annotations

from typing import Any, Dict, Optional

from config import DEFEAT_GOLD


def build_battle_ended_result(
    bs: Any,
    *,
    winner: Dict,
    loser: Dict,
    winner_id: Any,
    is_winner_p1: bool,
    n_rounds: int,
    winner_dmg: int,
    loser_dmg: int,
    gold_reward: int,
    exp_reward: int,
    loser_exp: int,
    xp_boosted: bool,
    winner_locked: bool,
    loser_locked: bool,
    winner_user_id: Optional[int],
    new_win_streak: int,
    streak_bonus_gold: int,
    did_level: bool,
    level_up_level: Optional[int],
    is_test: bool,
    elo_delta_w: int,
    elo_delta_l: int,
    duration_ms: int,
    exchange_text: str,
    combat_log_html: str,
    player1: Dict,
    player2: Dict,
    battle: Dict,
    battle_mode: str,
    mode_meta: Dict,
    pvp_repeat_factor: Any,
    titan_progress: Optional[Dict],
    endless_progress: Optional[Dict],
) -> Dict[str, Any]:
    return {
        "status": "battle_ended",
        "winner": bs._entity_name(winner),
        "loser": bs._entity_name(loser),
        "winner_id": winner_id,
        "human_won": is_winner_p1,
        "rounds": n_rounds,
        "damage_to_opponent": winner_dmg if is_winner_p1 else loser_dmg,
        "damage_to_you": loser_dmg if is_winner_p1 else winner_dmg,
        "gold_reward": (gold_reward if is_winner_p1 else DEFEAT_GOLD) if not winner_locked else 0,
        "exp_reward": (exp_reward if is_winner_p1 else loser_exp)
        if not (winner_locked if is_winner_p1 else loser_locked)
        else 0,
        "xp_boosted": xp_boosted and is_winner_p1,
        "streak_bonus_gold": (streak_bonus_gold if is_winner_p1 else 0) if not winner_locked else 0,
        "win_streak": new_win_streak if is_winner_p1 and winner_user_id and not winner_locked else 0,
        "rating_change": 0 if is_test else (elo_delta_w if is_winner_p1 else elo_delta_l),
        "level_up": (bool(did_level) and not winner_locked) if not is_test else False,
        "level_up_level": level_up_level if not is_test else None,
        "duration_ms": duration_ms,
        "exchange_text": exchange_text,
        "combat_log_html": combat_log_html,
        "is_test_battle": is_test,
        "p2_gold_reward": (DEFEAT_GOLD if is_winner_p1 else gold_reward) if not loser_locked else 0,
        "p2_exp_reward": 0
        if (is_winner_p1 and loser_locked) or (not is_winner_p1 and winner_locked)
        else (loser_exp if is_winner_p1 else exp_reward),
        "p2_xp_boosted": False if is_winner_p1 else xp_boosted,
        "p2_streak_bonus_gold": 0 if is_winner_p1 or loser_locked else streak_bonus_gold,
        "p2_win_streak": 0 if is_winner_p1 else (new_win_streak if winner_user_id else 0),
        "p2_level_up": (bool(did_level) if not is_winner_p1 else False) if not is_test else False,
        "p2_level_up_level": (level_up_level if not is_winner_p1 else None) if not is_test else None,
        "pvp_p1_user_id": player1["user_id"] if not battle["is_bot2"] else None,
        "pvp_p2_user_id": player2.get("user_id") if not battle["is_bot2"] else None,
        "pvp_p1_ui_message": dict(battle["ui_message"]) if not battle["is_bot2"] and battle.get("ui_message") else None,
        "pvp_p2_ui_message": dict(battle["ui_message_p2"]) if not battle["is_bot2"] and battle.get("ui_message_p2") else None,
        "mode": battle_mode,
        "mode_meta": mode_meta,
        "pvp_repeat_factor": pvp_repeat_factor,
        "titan_progress": titan_progress,
        "endless_progress": endless_progress,
    }
