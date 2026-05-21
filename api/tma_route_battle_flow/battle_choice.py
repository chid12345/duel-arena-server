"""POST /api/battle/choice — зоны атаки/защиты и исход раунда."""

from __future__ import annotations

from typing import Any, Callable

from fastapi import FastAPI

from api.tma_infra import manager
from api.tma_models import BattleChoiceBody
from api.tma_route_battle_flow._battle_outcome import deliver_battle_outcome


def register_battle_choice_route(
    app: FastAPI,
    *,
    db: Any,
    battle_system: Any,
    get_user_from_init_data: Callable[[str], dict],
    _rl_check: Callable[..., None],
    _battle_state_api: Callable[[int], dict | None],
    _adapt_battle_result_for_user: Callable[[dict, int], dict],
    _cache_invalidate: Callable[[int], None],
) -> None:
    @app.post("/api/battle/choice")
    async def battle_choice(body: BattleChoiceBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "battle_choice", max_hits=35, window_sec=60)

        if not manager.validate_session(uid, body.session_key):
            return {"ok": False, "error": "Игра открыта на другом устройстве. Обновите страницу."}

        ZONE_MAP = {
            "HEAD": "ГОЛОВА",
            "TORSO": "ТУЛОВИЩЕ",
            "LEGS": "НОГИ",
        }
        atk = ZONE_MAP.get(body.attack.upper(), "ТУЛОВИЩЕ")
        dfn = ZONE_MAP.get(body.defense.upper(), "ТУЛОВИЩЕ")

        result = await battle_system.make_choice(uid, atk, dfn)
        return await deliver_battle_outcome(
            result, uid,
            db=db,
            battle_system=battle_system,
            _battle_state_api=_battle_state_api,
            _adapt_battle_result_for_user=_adapt_battle_result_for_user,
            _cache_invalidate=_cache_invalidate,
        )
