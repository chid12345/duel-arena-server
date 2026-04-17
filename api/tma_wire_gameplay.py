"""Регистрация роутов игрового цикла для TMA.

Содержит подключение: social, progression, titan_training, endless. Выделено
из `tma_wire_features.py` по Закону 1 — геймплейные активности в одном доме.
"""
from __future__ import annotations

from fastapi import FastAPI

from api.endless_routes import register_endless_routes
from api.progression_routes import register_progression_routes
from api.social_routes import register_social_routes
from api.titan_training_routes import register_titan_training_routes

from api.tma_auth import get_user_from_init_data
from api.tma_battle_api import _battle_state_api
from api.tma_bots import _endless_bot_for_wave, _titan_boss_for_floor
from api.tma_catalogs import CRYPTOPAY_API_BASE
from api.tma_infra import _cache_invalidate, _cache_set, _rl_check
from api.tma_notify import _send_tg_message
from api.tma_player_api import _player_api, _premium_fields
from api.tma_weekly_quests import _iso_week_key, _weekly_quests_status

from battle_system import battle_system
from config import (
    CRYPTOPAY_TOKEN,
    HP_MIN_BATTLE_PCT,
    PLAYER_START_CRIT,
    PLAYER_START_MAX_HP,
    stamina_stats_invested,
)
from database import db


def wire_gameplay_routes(app: FastAPI) -> None:
    """Регистрирует роуты соц-функций, прогрессии, титанов и бесконечного режима."""
    register_social_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "_rl_check": _rl_check,
            "_send_tg_message": _send_tg_message,
            "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
            "CRYPTOPAY_API_BASE": CRYPTOPAY_API_BASE,
        },
    )
    register_progression_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "_cache_invalidate": _cache_invalidate,
            "_weekly_quests_status": _weekly_quests_status,
        },
    )
    register_titan_training_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "battle_system": battle_system,
            "_battle_state_api": _battle_state_api,
            "_titan_boss_for_floor": _titan_boss_for_floor,
            "_player_api": _player_api,
            "_cache_invalidate": _cache_invalidate,
            "_cache_set": _cache_set,
            "_rl_check": _rl_check,
            "stamina_stats_invested": stamina_stats_invested,
            "_iso_week_key": _iso_week_key,
            "PLAYER_START_MAX_HP": PLAYER_START_MAX_HP,
            "PLAYER_START_CRIT": PLAYER_START_CRIT,
            "HP_MIN_BATTLE_PCT": HP_MIN_BATTLE_PCT,
        },
    )
    register_endless_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "_premium_fields": _premium_fields,
            "_iso_week_key": _iso_week_key,
            "_endless_bot_for_wave": _endless_bot_for_wave,
            "battle_system": battle_system,
            "_battle_state_api": _battle_state_api,
        },
    )
