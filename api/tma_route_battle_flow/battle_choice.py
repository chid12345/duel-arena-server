"""POST /api/battle/choice — зоны атаки/защиты и исход раунда."""

from __future__ import annotations

from typing import Any, Callable

from fastapi import FastAPI

from api.tma_infra import manager
from api.tma_models import BattleChoiceBody


def register_battle_choice_route(
    app: FastAPI,
    *,
    db: Any,
    battle_system: Any,
    get_user_from_init_data: Callable[[str], dict],
    _rl_check: Callable[..., None],
    _battle_state_api: Callable[[int], dict | None],
    _adapt_battle_result_for_user: Callable[[dict, int], dict],
) -> None:
    @app.post("/api/battle/choice")
    async def battle_choice(body: BattleChoiceBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "battle_choice", max_hits=35, window_sec=60)

        ZONE_MAP = {
            "HEAD": "ГОЛОВА",
            "TORSO": "ТУЛОВИЩЕ",
            "LEGS": "НОГИ",
        }
        atk = ZONE_MAP.get(body.attack.upper(), "ТУЛОВИЩЕ")
        dfn = ZONE_MAP.get(body.defense.upper(), "ТУЛОВИЩЕ")

        result = await battle_system.make_choice(uid, atk, dfn)

        # Для round_completed — бой ещё активен, можно читать из памяти.
        # Для battle_ended — бой уже удалён из active_battles/battle_queue,
        # поэтому is_pvp определяем из полей результата, а не из battle dict.
        bid = battle_system.battle_queue.get(uid)
        b = battle_system.active_battles.get(bid) if bid else None
        is_pvp_active = b and not b.get("is_bot2") if b else False

        if result.get("status") == "round_completed":
            state_p1 = _battle_state_api(uid)
            await manager.send(uid, {"event": "round_result", "battle": state_p1, "result": result})
            if is_pvp_active and b:
                opp_uid = (b["player2"] if b["player1"]["user_id"] == uid else b["player1"]).get("user_id")
                if opp_uid:
                    state_p2 = _battle_state_api(opp_uid)
                    await manager.send(opp_uid, {"event": "round_result", "battle": state_p2, "result": result})
            return {"ok": True, "status": "round_completed", "battle": state_p1}

        if result.get("status") in ("battle_ended", "battle_ended_afk"):
            mine = _adapt_battle_result_for_user(result, uid)
            winner_id = mine.get("winner_id")
            human_won = bool(mine.get("human_won", winner_id == uid))
            is_afk = result.get("status") == "battle_ended_afk"
            await manager.send(
                uid,
                {
                    "event": "battle_ended",
                    "battle_id": mine.get("battle_id", ""),
                    "human_won": human_won,
                    "afk_loss": is_afk and not human_won,
                    "mode": mine.get("mode", "normal"),
                    "mode_meta": mine.get("mode_meta") or {},
                    "titan_progress": mine.get("titan_progress"),
                    "endless_progress": mine.get("endless_progress"),
                    "result": {
                        "gold": mine.get("gold_reward", 0),
                        "exp": mine.get("exp_reward", 0),
                        "damage": mine.get("damage_to_opponent", 0),
                        "level_up": mine.get("level_up", False) if human_won else False,
                        "rounds": mine.get("rounds", 0),
                        "rating_change": mine.get("rating_change", 0),
                        "pvp_repeat_factor": mine.get("pvp_repeat_factor", 1.0),
                    },
                },
            )
            if human_won:
                try:
                    qs = db.get_daily_quest_status(uid)
                    if qs.get("is_completed") and not qs.get("reward_claimed"):
                        await manager.send(uid, {"event": "quest_complete"})
                except Exception:
                    pass
            # Определяем оппонента из результата (бой уже удалён из памяти после battle_ended).
            pvp_p1_uid = result.get("pvp_p1_user_id")
            pvp_p2_uid = result.get("pvp_p2_user_id")
            if pvp_p1_uid is not None and pvp_p2_uid is not None:
                opp_uid = pvp_p2_uid if uid == pvp_p1_uid else pvp_p1_uid
                if opp_uid and opp_uid != uid:
                    opp = _adapt_battle_result_for_user(result, opp_uid)
                    opp_won = bool(opp.get("human_won", winner_id == opp_uid))
                    await manager.send(
                        opp_uid,
                        {
                            "event": "battle_ended",
                            "battle_id": opp.get("battle_id", ""),
                            "human_won": opp_won,
                            "afk_loss": is_afk and not opp_won,
                            "mode": opp.get("mode", "normal"),
                            "mode_meta": opp.get("mode_meta") or {},
                            "titan_progress": opp.get("titan_progress"),
                            "result": {
                                "gold": opp.get("gold_reward", 0),
                                "exp": opp.get("exp_reward", 0),
                                "damage": opp.get("damage_to_opponent", 0),
                                "level_up": opp.get("level_up", False) if opp_won else False,
                                "rounds": opp.get("rounds", 0),
                                "rating_change": opp.get("rating_change", 0),
                                "pvp_repeat_factor": opp.get("pvp_repeat_factor", 1.0),
                            },
                        },
                    )
            return {
                "ok": True,
                "status": "battle_ended",
                "human_won": human_won,
                "afk_loss": is_afk and not human_won,
                "mode": mine.get("mode", "normal"),
                "mode_meta": mine.get("mode_meta") or {},
                "titan_progress": mine.get("titan_progress"),
                "endless_progress": mine.get("endless_progress"),
                "result": {
                    "gold": mine.get("gold_reward", 0),
                    "exp": mine.get("exp_reward", 0),
                    "damage": mine.get("damage_to_opponent", 0),
                    "level_up": mine.get("level_up", False) if human_won else False,
                    "rounds": mine.get("rounds", 0),
                    "streak_bonus": mine.get("streak_bonus_gold", 0) if human_won else 0,
                    "win_streak": mine.get("win_streak", 0) if human_won else 0,
                    "rating_change": mine.get("rating_change", 0),
                    "pvp_repeat_factor": mine.get("pvp_repeat_factor", 1.0),
                },
            }

        if result.get("status") == "choice_made":
            return {"ok": True, "status": "waiting_opponent"}

        return {"ok": True, "status": result.get("status"), "result": result}
