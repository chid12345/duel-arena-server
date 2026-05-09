"""SeasonPassMixin — методы прогресса игрока в сезоне и батл-пассе."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from repositories.season_pass.config_loader import (
    get_current_season_config,
    get_points_per_level,
    get_pass_max_level,
)


class SeasonPassMixin:
    # ── Сезоны ─────────────────────────────────────────────────────────

    def get_active_bp_season(self) -> dict[str, Any] | None:
        """Текущий активный сезон, или None если нет."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id, name, theme, started_at, ends_at, is_active "
                "FROM bp_seasons WHERE is_active = ? ORDER BY started_at DESC LIMIT 1",
                (True if self._pg else 1,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return dict(row)
        finally:
            conn.close()

    def ensure_bp_season(self) -> dict[str, Any]:
        """Если активного сезона нет — создать из конфига. Возвращает словарь сезона."""
        season = self.get_active_bp_season()
        if season is not None:
            return season
        cfg = get_current_season_config()
        days = int(cfg.get("season_days", 90))
        ends_at = datetime.utcnow() + timedelta(days=days)
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            ph = "%s" if self._pg else "?"
            cursor.execute(
                f"INSERT INTO bp_seasons (name, theme, ends_at, is_active) "
                f"VALUES ({ph}, {ph}, {ph}, {ph})",
                (cfg.get("name", "Сезон"), cfg.get("theme", "fire"),
                 ends_at, True if self._pg else 1),
            )
            conn.commit()
        finally:
            conn.close()
        return self.get_active_bp_season()

    # ── Прогресс игрока ────────────────────────────────────────────────

    def get_bp_progress(self, user_id: int, season_id: int) -> dict[str, Any]:
        """Прогресс игрока в сезоне. Если строки нет — возвращаем default."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            ph = "%s" if self._pg else "?"
            cursor.execute(
                f"SELECT user_id, season_id, points, level, has_premium, premium_purchased_at "
                f"FROM bp_progress WHERE user_id = {ph} AND season_id = {ph}",
                (user_id, season_id),
            )
            row = cursor.fetchone()
            if not row:
                return {
                    "user_id": user_id, "season_id": season_id,
                    "points": 0, "level": 0,
                    "has_premium": False, "premium_purchased_at": None,
                }
            return dict(row)
        finally:
            conn.close()

    def add_bp_points(self, user_id: int, points: int) -> dict[str, Any]:
        """Начислить BP-очки игроку в активном сезоне.
        Автоматически пересчитывает уровень.
        Возвращает обновлённый прогресс или {} если активного сезона нет."""
        if points <= 0:
            return {}
        season = self.ensure_bp_season()
        season_id = int(season["id"])
        per_level = get_points_per_level()
        max_level = get_pass_max_level()
        current = self.get_bp_progress(user_id, season_id)
        new_points = current["points"] + int(points)
        new_level = min(max_level, new_points // per_level)
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            ph = "%s" if self._pg else "?"
            # UPSERT: SQLite через INSERT OR REPLACE, PG через ON CONFLICT
            if self._pg:
                cursor.execute(
                    "INSERT INTO bp_progress (user_id, season_id, points, level) "
                    "VALUES (%s, %s, %s, %s) "
                    "ON CONFLICT (user_id, season_id) DO UPDATE SET "
                    "points = EXCLUDED.points, level = EXCLUDED.level, "
                    "updated_at = CURRENT_TIMESTAMP",
                    (user_id, season_id, new_points, new_level),
                )
            else:
                cursor.execute(
                    "INSERT INTO bp_progress (user_id, season_id, points, level) "
                    "VALUES (?, ?, ?, ?) "
                    "ON CONFLICT (user_id, season_id) DO UPDATE SET "
                    "points = excluded.points, level = excluded.level, "
                    "updated_at = CURRENT_TIMESTAMP",
                    (user_id, season_id, new_points, new_level),
                )
            conn.commit()
        finally:
            conn.close()
        return {
            **current,
            "points": new_points,
            "level": new_level,
            "level_up": new_level > current["level"],
        }

    def activate_bp_premium(self, user_id: int) -> bool:
        """Установить has_premium=true в активном сезоне для игрока.
        Возвращает True если активировано (или уже было)."""
        season = self.ensure_bp_season()
        season_id = int(season["id"])
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            now = datetime.utcnow()
            true_val = True if self._pg else 1
            ph = "%s" if self._pg else "?"
            if self._pg:
                cursor.execute(
                    "INSERT INTO bp_progress (user_id, season_id, has_premium, premium_purchased_at) "
                    "VALUES (%s, %s, %s, %s) "
                    "ON CONFLICT (user_id, season_id) DO UPDATE SET "
                    "has_premium = EXCLUDED.has_premium, "
                    "premium_purchased_at = EXCLUDED.premium_purchased_at",
                    (user_id, season_id, true_val, now),
                )
            else:
                cursor.execute(
                    "INSERT INTO bp_progress (user_id, season_id, has_premium, premium_purchased_at) "
                    "VALUES (?, ?, ?, ?) "
                    "ON CONFLICT (user_id, season_id) DO UPDATE SET "
                    "has_premium = excluded.has_premium, "
                    "premium_purchased_at = excluded.premium_purchased_at",
                    (user_id, season_id, true_val, now),
                )
            conn.commit()
        finally:
            conn.close()
        return True
