"""Поиск боя и выбор зон (TMA)."""

from __future__ import annotations

from typing import Any, Callable

from fastapi import FastAPI

from api.tma_route_battle_flow.battle_choice import register_battle_choice_route
from api.tma_route_battle_flow.battle_find import register_find_battle_route


def register_tma_battle_flow_routes(
    app: FastAPI,
    *,
    db: Any,
    battle_system: Any,
    get_user_from_init_data: Callable[[str], dict],
    _rl_check: Callable[..., None],
    _battle_state_api: Callable[[int], dict | None],
    _adapt_battle_result_for_user: Callable[[dict, int], dict],
    _cache_invalidate: Callable[[int], None],
    PLAYER_START_MAX_HP: int,
    PLAYER_START_LEVEL: int,
    HP_MIN_BATTLE_PCT: int,
    HP_REGEN_BASE_SECONDS: int,
    HP_REGEN_ENDURANCE_BONUS: float,
    stamina_stats_invested: Callable[..., int],
) -> None:
    register_find_battle_route(
        app,
        db=db,
        battle_system=battle_system,
        get_user_from_init_data=get_user_from_init_data,
        _rl_check=_rl_check,
        _battle_state_api=_battle_state_api,
        PLAYER_START_MAX_HP=PLAYER_START_MAX_HP,
        PLAYER_START_LEVEL=PLAYER_START_LEVEL,
        HP_MIN_BATTLE_PCT=HP_MIN_BATTLE_PCT,
        HP_REGEN_BASE_SECONDS=HP_REGEN_BASE_SECONDS,
        HP_REGEN_ENDURANCE_BONUS=HP_REGEN_ENDURANCE_BONUS,
        stamina_stats_invested=stamina_stats_invested,
    )
    register_battle_choice_route(
        app,
        db=db,
        battle_system=battle_system,
        get_user_from_init_data=get_user_from_init_data,
        _rl_check=_rl_check,
        _battle_state_api=_battle_state_api,
        _adapt_battle_result_for_user=_adapt_battle_result_for_user,
        _cache_invalidate=_cache_invalidate,
    )
