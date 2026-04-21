"""Регистрация встроенных HTTP-маршрутов TMA (профиль + бой)."""

from __future__ import annotations

from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from api.tma_battle_api import _adapt_battle_result_for_user, _battle_state_api
from api.tma_infra import _buffs_cache_get, _buffs_cache_set, _cache_get, _cache_invalidate, _cache_set, _rl_check
from api.tma_notify import _send_tg_message
from api.tma_player_api import _player_api
from api.tma_route_battle_flow import register_tma_battle_flow_routes
from api.tma_route_battle_queue import register_tma_battle_queue_routes
from api.tma_route_battle_read import register_tma_battle_read_routes
from api.tma_route_player import register_tma_player_route
from api.equipment_routes import register_equipment_routes
from api.weapon_payment_routes import register_weapon_payment_routes
from api.helmet_payment_routes import register_helmet_payment_routes
from api.boots_payment_routes import register_boots_payment_routes
from api.shield_payment_routes import register_shield_payment_routes

from battle_system import battle_system
from config import (
    HP_MIN_BATTLE_PCT,
    HP_REGEN_BASE_SECONDS,
    HP_REGEN_ENDURANCE_BONUS,
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    PLAYER_START_LEVEL,
    PLAYER_START_MAX_HP,
    PLAYER_START_STRENGTH,
    expected_max_hp_from_level,
    stamina_stats_invested,
)
from database import db


def wire_tma_inline_routes(app: FastAPI) -> None:
    register_equipment_routes(app)
    register_weapon_payment_routes(app)
    register_helmet_payment_routes(app)
    register_boots_payment_routes(app)
    register_shield_payment_routes(app)
    register_tma_player_route(
        app,
        db=db,
        get_user_from_init_data=get_user_from_init_data,
        _rl_check=_rl_check,
        _cache_get=_cache_get,
        _cache_set=_cache_set,
        _cache_invalidate=_cache_invalidate,
        _buffs_cache_get=_buffs_cache_get,
        _buffs_cache_set=_buffs_cache_set,
        _player_api=_player_api,
        PLAYER_START_MAX_HP=PLAYER_START_MAX_HP,
        PLAYER_START_LEVEL=PLAYER_START_LEVEL,
        PLAYER_START_STRENGTH=PLAYER_START_STRENGTH,
        PLAYER_START_ENDURANCE=PLAYER_START_ENDURANCE,
        PLAYER_START_CRIT=PLAYER_START_CRIT,
        stamina_stats_invested=stamina_stats_invested,
        expected_max_hp_from_level=expected_max_hp_from_level,
    )
    register_tma_battle_flow_routes(
        app,
        db=db,
        battle_system=battle_system,
        get_user_from_init_data=get_user_from_init_data,
        _rl_check=_rl_check,
        _battle_state_api=_battle_state_api,
        _adapt_battle_result_for_user=_adapt_battle_result_for_user,
        _cache_invalidate=_cache_invalidate,
        PLAYER_START_MAX_HP=PLAYER_START_MAX_HP,
        PLAYER_START_LEVEL=PLAYER_START_LEVEL,
        HP_MIN_BATTLE_PCT=HP_MIN_BATTLE_PCT,
        HP_REGEN_BASE_SECONDS=HP_REGEN_BASE_SECONDS,
        HP_REGEN_ENDURANCE_BONUS=HP_REGEN_ENDURANCE_BONUS,
        stamina_stats_invested=stamina_stats_invested,
    )
    register_tma_battle_queue_routes(
        app,
        db=db,
        battle_system=battle_system,
        get_user_from_init_data=get_user_from_init_data,
        _rl_check=_rl_check,
        _send_tg_message=_send_tg_message,
        _battle_state_api=_battle_state_api,
        PLAYER_START_MAX_HP=PLAYER_START_MAX_HP,
        HP_MIN_BATTLE_PCT=HP_MIN_BATTLE_PCT,
    )
    register_tma_battle_read_routes(
        app,
        db=db,
        battle_system=battle_system,
        get_user_from_init_data=get_user_from_init_data,
        _battle_state_api=_battle_state_api,
        _adapt_battle_result_for_user=_adapt_battle_result_for_user,
        _player_api=_player_api,
        _cache_invalidate=_cache_invalidate,
    )
