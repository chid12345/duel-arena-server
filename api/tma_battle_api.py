"""Состояние боя и адаптация round_result для TMA API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from api.tma_player_api import _premium_fields


def _battle_state_api(user_id: int) -> Optional[dict]:
    """Состояние текущего боя для API (перспектива user_id)."""
    from battle_system import battle_system

    ctx = battle_system.get_battle_ui_context(user_id)
    if not ctx:
        return None

    bid = battle_system.battle_queue.get(user_id)
    b = battle_system.active_battles.get(bid) if bid else None
    is_p1 = b and b["player1"]["user_id"] == user_id if b else True
    is_pvp = b and not b.get("is_bot2") if b else False

    deadline_sec = None
    if b and b.get("next_turn_deadline"):
        left = (b["next_turn_deadline"] - datetime.now()).total_seconds()
        deadline_sec = max(0, int(left))

    opp_entity = None
    opp_is_bot = True
    if b:
        if is_p1:
            opp_entity = b.get("player2")
            opp_is_bot = b.get("is_bot2", True)
        else:
            opp_entity = b.get("player1")
            opp_is_bot = False
    opp_is_premium = False
    if opp_entity and not opp_is_bot:
        opp_is_premium = bool(_premium_fields(opp_entity).get("is_premium"))

    return {
        "battle_id": bid,
        "active": True,
        "is_pvp": is_pvp,
        "is_p1": is_p1,
        "mode": b.get("mode", "normal") if b else "normal",
        "round": ctx.get("round_num", 0),
        "my_hp": ctx.get("your_hp"),
        "my_max_hp": ctx.get("your_max"),
        "opp_hp": ctx.get("opp_hp"),
        "opp_max_hp": ctx.get("opp_max"),
        "opp_name": ctx.get("opponent_name"),
        "opp_level": ctx.get("opponent_level"),
        "opp_strength": ctx.get("opp_strength"),
        "opp_agility": ctx.get("opp_endurance"),
        "opp_intuition": ctx.get("opp_crit"),
        "opp_stamina": ctx.get("opp_stamina_invested", 0),
        "opp_rating": ctx.get("opp_rating", 1000),
        "opp_is_bot": opp_is_bot,
        "opp_is_premium": opp_is_premium,
        "pending_attack": ctx.get("pending_attack"),
        "pending_defense": ctx.get("pending_defense"),
        "waiting_opponent": ctx.get("waiting_opponent", False),
        "combat_log": (b.get("webapp_log") or b.get("combat_log_lines", []) if b else [])[-6:],
        "deadline_sec": deadline_sec,
    }


def _adapt_battle_result_for_user(result: dict, user_id: int) -> dict:
    """Адаптировать round_result под перспективу user_id (P1/P2)."""
    if not result:
        return {}
    winner_id = result.get("winner_id")
    if winner_id is None:
        return dict(result)
    p1_uid = result.get("pvp_p1_user_id")
    if p1_uid is None or user_id == p1_uid:
        r = dict(result)
        r["human_won"] = winner_id == user_id
        r["opponent_name"] = result.get("loser") if r["human_won"] else result.get("winner")
        return r
    r = dict(result)
    r["human_won"] = winner_id == user_id
    r["damage_to_opponent"] = result.get("damage_to_you")
    r["damage_to_you"] = result.get("damage_to_opponent")
    r["gold_reward"] = result.get("p2_gold_reward", 0)
    r["exp_reward"] = result.get("p2_exp_reward", 0)
    r["xp_boosted"] = result.get("p2_xp_boosted", False)
    r["streak_bonus_gold"] = result.get("p2_streak_bonus_gold", 0)
    r["win_streak"] = result.get("p2_win_streak", 0)
    r["level_up"] = result.get("p2_level_up", False)
    r["level_up_level"] = result.get("p2_level_up_level", None)
    r["opponent_name"] = result.get("loser") if r["human_won"] else result.get("winner")
    return r
