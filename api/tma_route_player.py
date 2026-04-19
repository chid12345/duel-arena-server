"""Маршрут /api/player."""

from __future__ import annotations

import logging
from typing import Any, Callable

from fastapi import FastAPI

from api.tma_models import InitDataHeader

log = logging.getLogger(__name__)


def register_tma_player_route(
    app: FastAPI,
    *,
    db: Any,
    get_user_from_init_data: Callable[[str], dict],
    _rl_check: Callable[..., None],
    _cache_get: Callable[[int], dict | None],
    _cache_set: Callable[[int, dict], None],
    _cache_invalidate: Callable[[int], None],
    _buffs_cache_get: Callable[[int], dict | None],
    _buffs_cache_set: Callable[[int, dict], None],
    _player_api: Callable[[dict], dict],
    PLAYER_START_MAX_HP: int,
    PLAYER_START_LEVEL: int,
    PLAYER_START_STRENGTH: int,
    PLAYER_START_ENDURANCE: int,
    PLAYER_START_CRIT: int,
    stamina_stats_invested: Callable[..., int],
    expected_max_hp_from_level: Callable[[int], int],
) -> None:
    from version import VERSION
    @app.post("/api/player")
    def get_player(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "player", max_hits=20, window_sec=10)
        username = tg_user.get("username") or tg_user.get("first_name") or ""

        usdt_passive = db.get_equipped_usdt_passive(uid)

        cached = _cache_get(uid)
        # Если бонус аватара не применён — сбросить кэш, чтобы миграция отработала
        if cached is not None and not int(cached.get("avatar_bonus_applied", 0) or 0):
            _cache_invalidate(uid)
            cached = None
        if cached is not None:
            # Бафы кешируем отдельно — 1 DB-запрос на 30 сек вместо каждого вызова
            cb = _buffs_cache_get(uid)
            if cb is None:
                cb = db.get_combined_buffs(uid)
                _buffs_cache_set(uid, cb)
            if usdt_passive:
                cached = dict(cached)
                cached["usdt_passive_type"] = usdt_passive
            try:
                eq_raw = db.get_equipment(uid)
                equipment = {
                    slot: {"item_id": it["item_id"], "name": it["name"], "emoji": it["emoji"],
                           "rarity": it["rarity"], "desc": it.get("desc", "")}
                    for slot, it in eq_raw.items()
                }
            except Exception:
                equipment = {}
            return {"ok": True, "player": _player_api(cached, combined_buffs=cb), "equipment": equipment, "cached": True, "_sv": VERSION}

        player = db.get_or_create_player(uid, username)

        # Миграция бонуса аватара: если ещё не применён — применить сейчас
        if not int(player.get("avatar_bonus_applied", 0) or 0):
            try:
                db.ensure_avatar_bonus_applied(uid)
                _cache_invalidate(uid)
                player = db.get_or_create_player(uid, username)
            except Exception as exc:
                log.warning("avatar bonus apply failed uid=%s: %s", uid, exc)

        inv = stamina_stats_invested(player.get("max_hp", PLAYER_START_MAX_HP), player.get("level", 1))
        regen = db.apply_hp_regen_from_player(player, inv)
        if regen:
            player = dict(player)
            player["current_hp"] = regen["current_hp"]

        try:
            lv = int(player.get("level", 1) or 1)
            exp_hp = int(expected_max_hp_from_level(lv))
            if (
                int(player.get("strength", PLAYER_START_STRENGTH) or PLAYER_START_STRENGTH) < int(PLAYER_START_STRENGTH)
                or int(player.get("endurance", PLAYER_START_ENDURANCE) or PLAYER_START_ENDURANCE)
                < int(PLAYER_START_ENDURANCE)
                or int(player.get("crit", PLAYER_START_CRIT) or PLAYER_START_CRIT) < int(PLAYER_START_CRIT)
                or int(player.get("max_hp", exp_hp) or exp_hp) < exp_hp
            ):
                db.resync_player_stats(uid)
                _cache_invalidate(uid)
                player = db.get_or_create_player(uid, username)
        except Exception:
            pass

        # Resync: если XP накопился без пересчёта уровня — пересчитать сейчас
        try:
            from config import exp_needed_for_next_level
            p_exp = int(player.get("exp", 0) or 0)
            p_lv = int(player.get("level", 1) or 1)
            if p_exp >= exp_needed_for_next_level(p_lv) and p_lv < 100:
                r = db.grant_exp_with_levelup(uid, 0)
                if r.get("leveled"):
                    _cache_invalidate(uid)
                    player = db.get_or_create_player(uid, username)
        except Exception:
            pass

        cb = db.get_combined_buffs(uid)
        _cache_set(uid, player)
        _buffs_cache_set(uid, cb)
        if usdt_passive:
            player = dict(player)
            player["usdt_passive_type"] = usdt_passive
        try:
            eq_raw = db.get_equipment(uid)
            equipment = {
                slot: {"item_id": it["item_id"], "name": it["name"], "emoji": it["emoji"],
                       "rarity": it["rarity"], "desc": it.get("desc", "")}
                for slot, it in eq_raw.items()
            }
        except Exception:
            equipment = {}
        return {
            "ok": True,
            "player": _player_api(player, combined_buffs=cb),
            "equipment": equipment,
            "_sv": VERSION,
            "_db_hp": int(player.get("current_hp", 0)),
            "_db_mhp": int(player.get("max_hp", 0)),
            "_db_exp": int(player.get("exp", 0)),
        }
