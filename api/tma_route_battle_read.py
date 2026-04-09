"""Состояние боя, последний результат, топ PvP (TMA)."""

from __future__ import annotations

from typing import Any, Callable

from fastapi import FastAPI

from api.tma_weekly_quests import _iso_week_key


def register_tma_battle_read_routes(
    app: FastAPI,
    *,
    db: Any,
    battle_system: Any,
    get_user_from_init_data: Callable[[str], dict],
    _battle_state_api: Callable[[int], dict | None],
    _adapt_battle_result_for_user: Callable[[dict, int], dict],
    _player_api: Callable[[dict], dict],
    _cache_invalidate: Callable[[int], None],
) -> None:
    @app.get("/api/battle/state")
    async def battle_state(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        state = _battle_state_api(uid)
        if state:
            return {"ok": True, "active": True, **state}
        return {"ok": True, "active": False}

    @app.get("/api/battle/last_result")
    async def battle_last_result(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        snap = battle_system.pop_battle_end_ui(uid)
        if not snap:
            player = db.get_or_create_player(uid, "")
            return {"ok": False, "reason": "no_recent_result", "player": _player_api(dict(player))}
        mine = _adapt_battle_result_for_user(snap, uid)
        human_won = bool(mine.get("human_won", mine.get("winner_id") == uid))
        afk_loss = mine.get("status") == "battle_ended_afk" and not human_won
        _cache_invalidate(uid)
        player = db.get_or_create_player(uid, "")
        return {
            "ok": True,
            "human_won": human_won,
            "afk_loss": afk_loss,
            "mode": mine.get("mode", "normal"),
            "mode_meta": mine.get("mode_meta") or {},
            "titan_progress": mine.get("titan_progress"),
            "result": {
                "gold": mine.get("gold_reward", 0) if human_won else 0,
                "exp": mine.get("exp_reward", 0),
                "level_up": mine.get("level_up", False) if human_won else False,
                "rounds": mine.get("rounds", 0),
                "streak_bonus": mine.get("streak_bonus_gold", 0) if human_won else 0,
                "win_streak": mine.get("win_streak", 0) if human_won else 0,
                "pvp_repeat_factor": mine.get("pvp_repeat_factor", 1.0),
            },
            "player": _player_api(dict(player)),
        }

    @app.get("/api/pvp/top")
    async def pvp_top(limit: int = 30):
        rows = db.get_pvp_weekly_top(limit=min(100, max(5, int(limit))))
        elo_top = db.get_pvp_elo_top(limit=20)
        rewards = [
            {"rank": 1, "diamonds": 120, "title": "Легенда PvP"},
            {"rank": 2, "diamonds": 80, "title": "Мастер PvP"},
            {"rank": 3, "diamonds": 50, "title": "Герой арены"},
            {"rank": "4-10", "diamonds": 20, "title": "Участник топа"},
        ]
        return {"ok": True, "week_key": _iso_week_key(), "leaders": rows, "elo_top": elo_top, "rewards": rewards}
