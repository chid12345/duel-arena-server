"""Сборка payload «комнаты ожидания» (gather) для GET /api/world_boss/state.

Открывается за `WB_GATHER_OPEN_SEC` до старта рейда. Содержит ростер
зарегистрированных игроков с ник/уровень/статами, чтобы фронт показал
«кто будет в бою». Если основной JOIN-запрос не вернул данные —
делаем per-user fallback, чтобы карточки всё равно отображались.

Закон 1/9: вынесено из `world_boss_state.py` отдельным домом, чтобы
основной сборщик payload не разрастался выше 200 строк.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

_log = logging.getLogger(__name__)


def _fallback_name(uid: int) -> str:
    """Дефолтное имя 'Воин #1234' (последние 4 цифры uid) — уникально и читаемо."""
    return f"Воин #{abs(int(uid)) % 10000:04d}"


def _row_to_player(uid: int, row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    row = row or {}
    return {
        "user_id": int(uid),
        "name": row.get("username") or _fallback_name(uid),
        "level": int(row.get("level") or 1),
        "strength": int(row.get("strength") or 10),
        "max_hp": int(row.get("max_hp") or 100),
    }


def _fetch_registered_uids(db, spawn_id: int, dbg: dict) -> List[int]:
    """Только список user_id из world_boss_registrations (без JOIN)."""
    try:
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id FROM world_boss_registrations WHERE spawn_id=? "
            "ORDER BY created_at ASC LIMIT 100",
            (int(spawn_id),),
        )
        rows = cur.fetchall()
        dbg["fetch_uids_rowcount"] = len(rows)
        uids = [int(r["user_id"]) for r in rows]
        conn.close()
        return uids
    except Exception as e:
        dbg["fetch_uids_error"] = f"{type(e).__name__}: {e}"
        _log.warning("gather _fetch_registered_uids spawn=%s: %s", spawn_id, e)
        return []


def _fetch_player_row(db, uid: int) -> Optional[Dict[str, Any]]:
    """Per-user запрос статов из players (фолбэк, если JOIN провалился)."""
    try:
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT username, level, strength, max_hp FROM players WHERE user_id=?",
            (int(uid),),
        )
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        _log.warning("gather _fetch_player_row uid=%s: %s", uid, e)
        return None


def build_gather_payload(db, spawn_id: int, registrants_count: int,
                         seconds_left: int) -> Dict[str, Any]:
    """Возвращает dict для поля `gather` в /state.

    Стратегия:
    1. Основной путь — `wb_list_registered_with_info` (JOIN + сортировка по дате).
    2. Если пусто, но регистрации есть — per-user добор статов из players.
    3. Если совсем не вышло — анонимные плашки 'Воин #0001'..., чтобы счётчик
       'В БОЮ N' не врал относительно списка.
    """
    dbg: Dict[str, Any] = {"spawn_id": int(spawn_id), "regs_count": int(registrants_count)}
    players: List[Dict[str, Any]] = []
    try:
        _raw = db.wb_list_registered_with_info(spawn_id, limit=100)
        dbg["main_query_rows"] = len(_raw or [])
        if _raw:
            dbg["main_query_first"] = {
                "user_id": _raw[0].get("user_id"),
                "username_present": bool(_raw[0].get("username")),
            }
        players = [_row_to_player(int(r["user_id"]), r) for r in _raw]
    except Exception as _ge:
        dbg["main_query_error"] = f"{type(_ge).__name__}: {_ge}"
        _log.warning("gather players error spawn=%s: %s", spawn_id, _ge)

    if not players and registrants_count > 0:
        dbg["used_fallback_uids"] = True
        uids = _fetch_registered_uids(db, spawn_id, dbg)
        if uids:
            players = [_row_to_player(uid_, _fetch_player_row(db, uid_))
                       for uid_ in uids]
        else:
            dbg["used_anon_placeholders"] = True
            players = [
                {"user_id": 0, "name": _fallback_name(i + 1), "level": 1,
                 "strength": 10, "max_hp": 100}
                for i in range(registrants_count)
            ]

    return {
        "is_open": True,
        "seconds_left": int(seconds_left),
        "players": players,
        "count": registrants_count,
        "_debug": dbg,  # ВРЕМЕННО: видно во фронте, удалить после фикса
    }
