"""Сборщик payload для GET /api/world_boss/state.

Читает всё нужное для UI вкладки «⚔️ Босс» одним вызовом:
активный спавн + следующий + последний завершённый + состояние игрока
в рейде + инвентарь (рейд-свитки, свитки воскрешения) + незабранные
награды + история 5 последних рейдов.

Законы 1/9: вынесено из `world_boss_routes.py`, чтобы роутер занимался
только регистрацией эндпоинтов, а сборка payload — отдельный модуль.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

import logging

from config.world_boss_constants import WB_DURATION_SEC, WB_PREP_SEC, is_vulnerability_window
from config.world_boss import get_boss_type as _get_boss_type

_log = logging.getLogger(__name__)


def _warn_if_null(row: dict, field: str, ctx: str):
    """Возвращает значение поля; логирует warning если оно None (сигнал о порче БД)."""
    val = row.get(field)
    if val is None:
        _log.warning("wb_state: %s.%s is NULL (spawn_id=%s) — fallback to universal",
                     ctx, field, row.get("spawn_id"))
    return val


_RAID_SCROLL_IDS = ("damage_25", "power_10", "defense_20", "dodge_10", "crit_10")
_RES_SCROLL_IDS = ("res_30", "res_60", "res_100")


def _parse_ts(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).replace("T", " ").split(".")[0]
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def build_wb_state_payload(db, uid: int) -> Dict[str, Any]:
    """Состояние рейда и игрока для UI (читается при входе на вкладку + polling fallback)."""
    active = db.get_wb_active_spawn()
    next_sched = db.get_wb_next_scheduled()
    last = db.get_wb_last_finished()
    player_state = None
    seconds_left = None
    vulnerable = False

    if active:
        spawn_id = int(active["spawn_id"])
        try:
            started_at = _parse_ts(active["started_at"])
            elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
            seconds_left = max(0, int(WB_DURATION_SEC - elapsed))
            vulnerable = is_vulnerability_window(elapsed)
        except Exception:
            pass
        ps = db.get_wb_player_state(spawn_id, uid)
        if ps:
            player_state = {
                "current_hp": int(ps.get("current_hp") or 0),
                "max_hp": int(ps.get("max_hp") or 100),
                "is_dead": bool(int(ps.get("is_dead") or 0)),
                "total_damage": int(ps.get("total_damage") or 0),
                "hits_count": int(ps.get("hits_count") or 0),
                "raid_scroll_1": ps.get("raid_scroll_1"),
                "raid_scroll_2": ps.get("raid_scroll_2"),
            }

    prep_seconds_left = 0
    seconds_until_raid = None
    is_registered = False
    registrants_count = 0
    if not active and next_sched:
        try:
            sched_at = _parse_ts(next_sched["scheduled_at"])
            until_start = (sched_at - datetime.now(timezone.utc)).total_seconds()
            seconds_until_raid = max(0, int(until_start))
            if 0 < until_start <= WB_PREP_SEC:
                prep_seconds_left = int(until_start)
            next_spawn_id = int(next_sched["spawn_id"])
            is_registered = db.wb_is_registered(next_spawn_id, uid)
            registrants_count = db.wb_registration_count(next_spawn_id)
        except Exception:
            pass
    elif active:
        # Если рейд уже идёт — проверяем регистрацию против активного спавна,
        # чтобы UI всё ещё показывал «ты участвуешь».
        try:
            active_spawn_id = int(active["spawn_id"])
            is_registered = db.wb_is_registered(active_spawn_id, uid)
            registrants_count = db.wb_registration_count(active_spawn_id)
        except Exception:
            pass

    recent = db.get_wb_recent_finished_with_user(uid, limit=5)
    inv_rows = db.get_inventory(uid)
    inv = {r["item_id"]: int(r["quantity"]) for r in inv_rows}
    raid_scrolls_inv = {sid: inv.get(sid, 0) for sid in _RAID_SCROLL_IDS}
    res_scrolls_inv = {sid: inv.get(sid, 0) for sid in _RES_SCROLL_IDS}
    try:
        unclaimed = db.get_wb_unclaimed_rewards(uid)
    except Exception as _e:
        _log.warning("get_wb_unclaimed_rewards uid=%s: %s", uid, _e)
        unclaimed = []
    player_row = db.get_or_create_player(uid, "")
    reminder_opt_in = bool(int(player_row.get("wb_reminder_opt_in") or 0))
    auto_bot_pending = bool(int(player_row.get("wb_auto_bot_pending") or 0))
    # Премиум-статус нужен фронту: кнопка АВТО в бою — премиум-фича.
    try:
        is_premium = bool(db.get_premium_status(uid).get("is_active"))
    except Exception:
        is_premium = False

    return {
        "ok": True,
        "is_premium": is_premium,
        "prep_seconds_left": prep_seconds_left,
        "seconds_until_raid": seconds_until_raid,
        "is_registered": is_registered,
        "registrants_count": registrants_count,
        "active": (lambda _bt: {
            "spawn_id": int(active["spawn_id"]),
            "boss_name": active.get("boss_name"),
            "boss_type": _bt.get("type"),
            "boss_emoji": _bt.get("emoji"),
            "boss_type_label": _bt.get("label"),
            "boss_bg_hex": int(_bt.get("bg_tint_hex") or 0x4a3a5a),
            "boss_sprite": _bt.get("sprite", "boss_lich.png"),
            "boss_glow": _bt.get("glow_color", "#9b30ff"),
            "current_hp": int(active.get("current_hp") or 0),
            "max_hp": int(active.get("max_hp") or 0),
            "stat_profile": active.get("stat_profile") or {},
            "seconds_left": seconds_left,
            "vulnerable": vulnerable,
            "crown_flags": int(active.get("crown_flags") or 0),
            "stage": int(active.get("stage") or 1),
        })(_get_boss_type(_warn_if_null(active, "boss_type", "active_spawn"))) if active else None,
        "next_scheduled": (lambda _bt: {
            "spawn_id": int(next_sched["spawn_id"]),
            "scheduled_at": next_sched.get("scheduled_at"),
            "boss_name": next_sched.get("boss_name"),
            "boss_type": _bt.get("type"),
            "boss_emoji": _bt.get("emoji"),
            "boss_type_label": _bt.get("label"),
        })(_get_boss_type(next_sched.get("boss_type"))) if next_sched else None,
        "last_finished": {
            "spawn_id": int(last.get("spawn_id")),
            "boss_name": last.get("boss_name"),
            "status": last.get("status"),
            "ended_at": last.get("ended_at"),
        } if last else None,
        "recent_raids": [
            (lambda _bt: {
                "spawn_id": int(r["spawn_id"]),
                "boss_name": r.get("boss_name"),
                "boss_emoji": _bt.get("emoji"),
                "status": r.get("status"),
                "ended_at": r.get("ended_at"),
                "contribution_pct": float(r.get("contribution_pct") or 0.0),
                "gold": int(r.get("gold") or 0),
                "exp": int(r.get("exp") or 0),
                "diamonds": int(r.get("diamonds") or 0),
                "chest_type": r.get("chest_type"),
            })(_get_boss_type(r.get("boss_type"))) for r in recent
        ],
        "player_state": player_state,
        "raid_scrolls_inv": raid_scrolls_inv,
        "res_scrolls_inv": res_scrolls_inv,
        "reminder_opt_in": reminder_opt_in,
        "auto_bot_pending": auto_bot_pending,
        "unclaimed_rewards": [
            (lambda _bt: {
                "reward_id": int(r["reward_id"]),
                "spawn_id": int(r["spawn_id"]),
                "boss_name": r.get("boss_name"),
                "boss_type": _bt.get("type"),
                "boss_emoji": _bt.get("emoji"),
                "boss_type_label": _bt.get("label"),
                "gold": int(r.get("gold") or 0),
                "exp": int(r.get("exp") or 0),
                "diamonds": int(r.get("diamonds") or 0),
                "chest_type": r.get("chest_type"),
                "contribution_pct": float(r.get("contribution_pct") or 0.0),
                "is_victory": bool(r.get("is_victory")),
                "total_damage": int(r.get("total_damage") or 0),
            })(_get_boss_type(r.get("boss_type"))) for r in unclaimed
        ],
    }
