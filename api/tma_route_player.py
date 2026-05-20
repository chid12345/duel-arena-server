"""Маршрут /api/player."""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

from fastapi import FastAPI

from api.tma_models import InitDataHeader

log = logging.getLogger(__name__)


def _fetch_equipment_parallel(db: Any, uid: int, current_class: str | None = None) -> tuple[dict, list, list, dict, dict | None]:
    """Три equipment-запроса выполняются параллельно. Возвращает (eq, weapons, stats, set_info).

    current_class — для подсчёта сет-бонуса в slot=armor (гардероб=броня).

    Унификация армора (этап 8.1): каждый слот обогащается полем
    `rental: {expires_at, seconds_left, days_left}`, если item_id в этом
    слоте сейчас арендован. Это позволяет 6 overlay-вкладкам показывать
    «🕐 Аренда · Nд» через общий RentalBadge без отдельных запросов.
    """
    from config.set_bonuses import resolve_active_set, bonuses_human, PERK_INFO

    def _eq():
        try:
            eq_raw = db.get_equipment(uid)
            set_info = resolve_active_set(eq_raw, current_class=current_class)
            if set_info:
                set_info = dict(set_info)
                set_info["bonuses_human"] = bonuses_human(set_info["bonuses"])
                if set_info.get("perk"):
                    set_info["perk_info"] = PERK_INFO.get(set_info["perk"], {})
            try:
                rental_by_item = {r["item_id"]: r for r in db.list_active_rentals(uid)}
            except Exception:
                rental_by_item = {}
            out = {}
            for slot, it in eq_raw.items():
                slot_data = {
                    "item_id": it["item_id"], "name": it["name"], "emoji": it["emoji"],
                    "rarity": it["rarity"], "desc": it.get("desc", ""),
                }
                r = rental_by_item.get(it["item_id"])
                if r:
                    sec = int(r.get("seconds_left", 0) or 0)
                    slot_data["rental"] = {
                        "expires_at": r.get("expires_at"),
                        "seconds_left": sec,
                        "days_left": max(1, (sec + 86399) // 86400),
                    }
                out[slot] = slot_data
            return out, set_info
        except Exception:
            return {}, None

    def _weapons():
        try:
            conn = db.get_connection()
            try:
                cur = conn.cursor()
                # Общая таблица: оружие = не-броня, броня = armor2_*.
                cur.execute("SELECT item_id FROM player_owned_weapons WHERE user_id = ? AND item_id NOT LIKE 'armor2_%'", (uid,))
                weapons = [r["item_id"] for r in cur.fetchall()]
                cur.execute("SELECT item_id FROM player_owned_weapons WHERE user_id = ? AND item_id LIKE 'armor2_%'", (uid,))
                armor2 = [r["item_id"] for r in cur.fetchall()]
                return weapons, armor2
            finally:
                conn.close()
        except Exception:
            return [], []

    def _stats():
        try:
            return db.get_equipment_stats(uid)
        except Exception:
            return {}

    with ThreadPoolExecutor(max_workers=3) as ex:
        f_eq, f_wp, f_st = ex.submit(_eq), ex.submit(_weapons), ex.submit(_stats)
        eq_data, set_info = f_eq.result()
        weapons, armors = f_wp.result()
        return eq_data, weapons, armors, f_st.result(), set_info


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

        # Новая чистая пассивка armor2_mythic4 — после apply применяется в бою
        # (damage.py для damage_pct/double_hit/crit_dmg_pct, damage_armor.py для armor_pct).
        try:
            usdt_passive = db.get_equipped_legendary_armor2_passive(uid)
        except Exception:
            usdt_passive = None

        cached = _cache_get(uid)
        # Если бонус аватара не применён — сбросить кэш, чтобы миграция отработала
        if cached is not None and not int(cached.get("avatar_bonus_applied", 0) or 0):
            _cache_invalidate(uid)
            cached = None
        # Если HP не на максимуме — кэш игнорируем: иначе реген застревает,
        # когда клиент дёргает /api/player чаще, чем _PLAYER_CACHE_TTL=20с
        # (профиль/табы/экипировка). При полном HP кэш работает как раньше.
        if cached is not None:
            try:
                _chp = int(cached.get("current_hp", 0) or 0)
                _mhp = int(cached.get("max_hp", 0) or 0)
                if _mhp > 0 and _chp < _mhp:
                    _cache_invalidate(uid)
                    cached = None
            except (ValueError, TypeError):
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
            equipment, owned_weapons, owned_armor2, eq_stats_cached, set_info = _fetch_equipment_parallel(
                db, uid, current_class=cached.get("current_class") or cached.get("warrior_type"))
            return {"ok": True, "player": _player_api(cached, combined_buffs=cb, eq_stats=eq_stats_cached), "equipment": equipment,
                    "owned_weapons": owned_weapons, "owned_armor2": owned_armor2,
                    "set_bonus": set_info, "shards": db.get_all_shards(uid),
                    "plus": db.get_all_item_plus(uid),
                    "active_rentals": db.list_active_rentals(uid),
                    "cached": True, "_sv": VERSION}

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
        equipment, owned_weapons, owned_armor2, eq_stats_fresh, set_info = _fetch_equipment_parallel(
            db, uid, current_class=player.get("current_class") or player.get("warrior_type"))
        return {
            "ok": True,
            "player": _player_api(player, combined_buffs=cb, eq_stats=eq_stats_fresh),
            "equipment": equipment,
            "owned_weapons": owned_weapons,
            "owned_armor2": owned_armor2,
            "set_bonus": set_info,
            "shards": db.get_all_shards(uid),
            "plus": db.get_all_item_plus(uid),
            "active_rentals": db.list_active_rentals(uid),
            "_sv": VERSION,
            "_db_hp": int(player.get("current_hp", 0)),
            "_db_mhp": int(player.get("max_hp", 0)),
            "_db_exp": int(player.get("exp", 0)),
        }
