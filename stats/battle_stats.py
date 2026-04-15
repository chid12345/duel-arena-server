"""
Лёгкий сборщик статистики боёв для анализа баланса классов.

Запись: fire-and-forget через run_in_executor — не блокирует бой.
Чтение: только по запросу (admin/отчёт).

Типы боёв (battle_type):
  'pvp'      — PvP между игроками
  'pve'      — бой с ботом
  'endless'  — Натиск
  'titan'    — Башня Титанов
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

_log = logging.getLogger(__name__)

# Маппинг режима боя → battle_type для статистики
_MODE_MAP: Dict[str, str] = {
    "normal": "pve",
    "endless": "endless",
    "titan": "titan",
}


def _battle_type_from_mode(mode: str, is_bot2: bool) -> str:
    if not is_bot2:
        return "pvp"
    return _MODE_MAP.get(mode or "normal", "pve")


def _write_stat(
    db: Any,
    battle_type: str,
    winner_wtype: str,
    loser_wtype: str,
    winner_uid: Optional[int],
    loser_uid: Optional[int],
    turns: int,
) -> None:
    """Синхронная запись одной строки. Вызывается через executor."""
    try:
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO battle_stats
               (battle_type, winner_wtype, loser_wtype, winner_uid, loser_uid, turns)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (battle_type, winner_wtype or "default", loser_wtype or "default",
             winner_uid, loser_uid, turns),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        _log.debug("battle_stats write error: %s", exc)


def log_battle(
    loop: Any,
    db: Any,
    mode: str,
    is_bot2: bool,
    winner_wtype: str,
    loser_wtype: str,
    winner_uid: Optional[int] = None,
    loser_uid: Optional[int] = None,
    turns: int = 0,
) -> None:
    """Fire-and-forget: запускает запись статистики без ожидания результата."""
    battle_type = _battle_type_from_mode(mode, is_bot2)
    try:
        loop.run_in_executor(
            None, _write_stat, db, battle_type,
            winner_wtype, loser_wtype, winner_uid, loser_uid, turns,
        )
    except Exception as exc:
        _log.debug("battle_stats schedule error: %s", exc)


def get_report(db: Any, days: int = 7) -> Dict[str, Any]:
    """
    Отчёт по балансу за последние N дней.
    Возвращает словарь: {battle_type: [{winner_wtype, loser_wtype, count, win_rate_pct}]}
    """
    since = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    result: Dict[str, Any] = {}
    try:
        conn = db.get_connection()
        cur = conn.cursor()

        # Итого боёв по типу
        cur.execute(
            """SELECT battle_type, COUNT(*) as total
               FROM battle_stats WHERE created_at >= ?
               GROUP BY battle_type""",
            (since,),
        )
        totals = {row[0]: row[1] for row in cur.fetchall()}

        # Победы по классу внутри каждого типа боя
        cur.execute(
            """SELECT battle_type, winner_wtype, loser_wtype, COUNT(*) as cnt
               FROM battle_stats WHERE created_at >= ?
               GROUP BY battle_type, winner_wtype, loser_wtype
               ORDER BY battle_type, cnt DESC""",
            (since,),
        )
        rows = cur.fetchall()
        conn.close()

        for row in rows:
            bt, ww, lw, cnt = row[0], row[1], row[2], row[3]
            total = totals.get(bt, 1)
            if bt not in result:
                result[bt] = []
            result[bt].append({
                "winner": ww,
                "loser": lw,
                "count": cnt,
                "win_rate_pct": round(cnt / total * 100, 1),
            })

        result["_meta"] = {"days": days, "since": since, "totals": totals}
    except Exception as exc:
        _log.warning("battle_stats get_report error: %s", exc)
        result["_error"] = str(exc)

    return result
