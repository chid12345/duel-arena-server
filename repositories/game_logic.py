"""
repositories/game_logic.py — Башня Титанов.

Остальные механики вынесены в отдельные файлы:
  endless.py    — Натиск (волны, попытки, квесты, топ)
  leaderboard.py — PvP/Titan топы, недельные выплаты, weekly_claims
  shop.py       — магазин, сезоны, Battle Pass
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from db_core import iso_week_key_utc


class GameLogicMixin:
    """Mixin: Башня Титанов."""

    # ── Башня Титанов ─────────────────────────────────────────────────────────

    def get_titan_progress(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Пробуем с run_active (после миграции); при ошибке — без него
            try:
                cursor.execute(
                    "SELECT user_id, best_floor, current_floor, weekly_best_floor, weekly_best_at, COALESCE(run_active, 0) AS run_active FROM titan_progress WHERE user_id = ?",
                    (user_id,),
                )
            except Exception:
                try:
                    conn.rollback()
                except Exception:
                    pass
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT user_id, best_floor, current_floor, weekly_best_floor, weekly_best_at FROM titan_progress WHERE user_id = ?",
                    (user_id,),
                )
            row = cursor.fetchone()
            if not row:
                try:
                    cursor.execute(
                        "INSERT INTO titan_progress (user_id, best_floor, current_floor, weekly_best_floor, weekly_best_at, run_active) VALUES (?, 0, 1, 0, 0, 0)",
                        (user_id,),
                    )
                except Exception:
                    cursor.execute(
                        "INSERT INTO titan_progress (user_id, best_floor, current_floor, weekly_best_floor, weekly_best_at) VALUES (?, 0, 1, 0, 0)",
                        (user_id,),
                    )
                conn.commit()
                return {"user_id": user_id, "best_floor": 0, "current_floor": 1, "weekly_best_floor": 0, "weekly_best_at": 0, "run_active": 0}
            result = dict(row)
            result.setdefault("run_active", 0)
            return result
        finally:
            conn.close()

    def titan_on_win(self, user_id: int, floor: int) -> Dict[str, Any]:
        import logging
        _log = logging.getLogger(__name__)
        now_ts = int(time.time())
        floor_i = max(1, int(floor))
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            prog = self.get_titan_progress(user_id)
            best_floor = max(int(prog.get("best_floor", 0)), floor_i)
            current_floor = max(int(prog.get("current_floor", 1)), floor_i + 1)
            weekly_best = int(prog.get("weekly_best_floor", 0))
            weekly_at = int(prog.get("weekly_best_at", 0))
            if floor_i > weekly_best:
                weekly_best = floor_i
                weekly_at = now_ts
            cursor.execute(
                "UPDATE titan_progress SET best_floor = ?, current_floor = ?, weekly_best_floor = ?, weekly_best_at = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                (best_floor, current_floor, weekly_best, weekly_at, user_id),
            )
            conn.commit()
            try:
                self.record_titan_weekly_floor(user_id, floor_i, now_ts)
            except Exception as ex:
                _log.warning("record_titan_weekly_floor uid=%s: %s", user_id, ex)
            return {"best_floor": best_floor, "current_floor": current_floor, "weekly_best_floor": weekly_best, "weekly_best_at": weekly_at}
        finally:
            conn.close()

    def titan_on_loss(self, user_id: int, floor: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            prog = self.get_titan_progress(user_id)
            next_floor = max(1, int(floor))
            try:
                cursor.execute(
                    "UPDATE titan_progress SET current_floor = ?, run_active = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                    (next_floor, user_id),
                )
            except Exception:
                try:
                    conn.rollback()
                except Exception:
                    pass
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE titan_progress SET current_floor = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                    (next_floor, user_id),
                )
            conn.commit()
            prog["current_floor"] = next_floor
            prog["run_active"] = 0
            return dict(prog)
        finally:
            conn.close()

    def titan_set_run_active(self, user_id: int, value: int) -> None:
        """Установить флаг активной сессии Башни (1 = в заходе, 0 = завершён)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE titan_progress SET run_active = ? WHERE user_id = ?",
                (int(value), user_id),
            )
            conn.commit()
        except Exception:
            pass  # Колонка ещё не добавлена миграцией — игнорируем
        finally:
            conn.close()

    def get_titan_weekly_top(self, limit: int = 50, week_key: Optional[str] = None) -> List[Dict]:
        wk = week_key if week_key is not None else iso_week_key_utc()
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT s.user_id, p.username, s.max_floor AS weekly_best_floor, s.best_at AS weekly_best_at "
                "FROM titan_weekly_scores s JOIN players p ON p.user_id = s.user_id "
                "WHERE s.week_key = ? AND s.max_floor > 0 ORDER BY s.max_floor DESC, s.best_at ASC LIMIT ?",
                (wk, int(limit)),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def record_titan_weekly_floor(self, user_id: int, floor: int, ts: Optional[int] = None) -> None:
        ts_i = int(ts if ts is not None else time.time())
        wk = iso_week_key_utc(float(ts_i))
        floor_i = max(1, int(floor))
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT max_floor, best_at FROM titan_weekly_scores WHERE user_id = ? AND week_key = ?",
                (int(user_id), wk),
            )
            row = cursor.fetchone()
            if not row:
                cursor.execute(
                    "INSERT INTO titan_weekly_scores (user_id, week_key, max_floor, best_at) VALUES (?, ?, ?, ?)",
                    (int(user_id), wk, floor_i, ts_i),
                )
            else:
                mf = int(row["max_floor"] or 0)
                ba = int(row["best_at"] or 0)
                if floor_i > mf or (floor_i == mf and ts_i < ba):
                    cursor.execute(
                        "UPDATE titan_weekly_scores SET max_floor = ?, best_at = ? WHERE user_id = ? AND week_key = ?",
                        (floor_i, ts_i, int(user_id), wk),
                    )
            conn.commit()
        finally:
            conn.close()
