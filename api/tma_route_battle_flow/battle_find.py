"""POST /api/battle/find — PVP очередь или бот."""

from __future__ import annotations

from typing import Any, Callable

from fastapi import FastAPI

from api.tma_infra import manager
from api.tma_models import FindBattleBody


def register_find_battle_route(
    app: FastAPI,
    *,
    db: Any,
    battle_system: Any,
    get_user_from_init_data: Callable[[str], dict],
    _rl_check: Callable[..., None],
    _battle_state_api: Callable[[int], dict | None],
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
