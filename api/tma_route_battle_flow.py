"""Поиск боя и выбор зон (TMA)."""

from __future__ import annotations

from typing import Any, Callable

from fastapi import FastAPI

from api.tma_infra import manager
from api.tma_models import BattleChoiceBody, FindBattleBody


def register_tma_battle_flow_routes(
    app: FastAPI,
    *,
    db: Any,
    battle_system: Any,
    get_user_from_init_data: Callable[[str], dict],
    _rl_check: Callable[..., None],
    _battle_state_api: Callable[[int], dict | None],
    _adapt_battle_result_for_user: Callable[[dict, int], dict],
    PLAYER_START_MAX_HP: int,
    PLAYER_START_LEVEL: int,
    HP_MIN_BATTLE_PCT: int,
    HP_REGEN_BASE_SECONDS: int,
    HP_REGEN_ENDURANCE_BONUS: float,
    stamina_stats_invested: Callable[..., int],
) -> None:
    @app.post("/api/battle/find")
    async def find_battle(body: FindBattleBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "battle_find", max_hits=5, window_sec=15)
        username = tg_user.get("username") or ""

        player = db.get_or_create_player(uid, username)

        if battle_system.get_battle_status(uid):
            state = _battle_state_api(uid)
            return {"ok": True, "status": "already_in_battle", "battle": state}

        mhp = int(player.get("max_hp", PLAYER_START_MAX_HP))
        chp = int(player.get("current_hp", mhp))
        if chp < int(mhp * HP_MIN_BATTLE_PCT):
            inv = stamina_stats_invested(mhp, player.get("level", 1))
            mult = 1.0 + inv * HP_REGEN_ENDURANCE_BONUS
            hp_needed = int(mhp * HP_MIN_BATTLE_PCT) - chp
            secs = int(hp_needed / max(0.001, mhp / HP_REGEN_BASE_SECONDS * mult))
            return {
                "ok": False,
                "reason": "low_hp",
                "regen_seconds": secs,
                "current_hp": chp,
                "min_hp": int(mhp * HP_MIN_BATTLE_PCT),
            }

        if not body.prefer_bot:
            pvp_entry = db.pvp_find_opponent(uid, int(player.get("level", PLAYER_START_LEVEL)))
            if pvp_entry:
                opp_uid = pvp_entry["user_id"]
                db.pvp_dequeue(opp_uid)
                opp_player = db.get_or_create_player(opp_uid, "")
                battle_id = await battle_system.start_battle(player, opp_player, is_bot2=False)
                b = battle_system.active_battles.get(battle_id)
                if b:
                    b["_tma_p1"] = True

                await manager.send(
                    opp_uid,
                    {"event": "battle_started", "battle": _battle_state_api(opp_uid)},
                )

                return {"ok": True, "status": "pvp_started", "battle": _battle_state_api(uid)}

            if body.queue_only:
                db.pvp_enqueue(uid, int(player.get("level", PLAYER_START_LEVEL)), chat_id=0, message_id=None)
                return {"ok": True, "status": "queued"}

        opponent = db.find_suitable_opponent(player["level"])
        if not opponent:
            return {"ok": False, "reason": "no_opponent"}

        completed = player.get("wins", 0) + player.get("losses", 0)
        if completed < 3:
            opponent = battle_system.apply_onboarding_bot(opponent)

        battle_id = await battle_system.start_battle(player, opponent, is_bot2=True)
        return {"ok": True, "status": "bot_started", "battle": _battle_state_api(uid)}

    @app.post("/api/battle/choice")
    async def battle_choice(body: BattleChoiceBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "battle_choice", max_hits=15, window_sec=10)

        ZONE_MAP = {
            "HEAD": "ГОЛОВА",
            "TORSO": "ТУЛОВИЩЕ",
            "LEGS": "НОГИ",
        }
        atk = ZONE_MAP.get(body.attack.upper(), "ТУЛОВИЩЕ")
        dfn = ZONE_MAP.get(body.defense.upper(), "ТУЛОВИЩЕ")

        result = await battle_system.make_choice(uid, atk, dfn)

        bid = battle_system.battle_queue.get(uid)
        b = battle_system.active_battles.get(bid) if bid else None
        is_pvp = b and not b.get("is_bot2") if b else False

        if result.get("status") == "round_completed":
            state_p1 = _battle_state_api(uid)
            await manager.send(uid, {"event": "round_result", "battle": state_p1, "result": result})
            if is_pvp and b:
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
                    "human_won": human_won,
                    "afk_loss": is_afk and not human_won,
                    "mode": mine.get("mode", "normal"),
                    "mode_meta": mine.get("mode_meta") or {},
                    "titan_progress": mine.get("titan_progress"),
                    "endless_progress": mine.get("endless_progress"),
                    "result": {
                        "gold": mine.get("gold_reward", 0) if human_won else 0,
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
            if is_pvp and b:
                opp_uid = (b["player2"] if b["player1"]["user_id"] == uid else b["player1"]).get("user_id")
                if opp_uid:
                    opp = _adapt_battle_result_for_user(result, opp_uid)
                    opp_won = bool(opp.get("human_won", winner_id == opp_uid))
                    await manager.send(
                        opp_uid,
                        {
                            "event": "battle_ended",
                            "human_won": opp_won,
                            "afk_loss": is_afk and not opp_won,
                            "mode": opp.get("mode", "normal"),
                            "mode_meta": opp.get("mode_meta") or {},
                            "titan_progress": opp.get("titan_progress"),
                            "result": {
                                "gold": opp.get("gold_reward", 0) if opp_won else 0,
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
                    "gold": mine.get("gold_reward", 0) if human_won else 0,
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
