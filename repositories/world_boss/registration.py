"""Mixin: регистрация игрока на рейд (до старта).

Таблица world_boss_registrations связана со spawn_id запланированного (scheduled) спавна.
После старта рейда записи остаются — не мешают, не удаляются.
"""
from __future__ import annotations

import logging
from typing import Dict, Any

log = logging.getLogger(__name__)


class WorldBossRegistrationMixin:

    def wb_register(self, spawn_id: int, user_id: int) -> bool:
        """Зарегистрировать игрока на рейд. Возвращает True если запись новая."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        if cur.fetchone():
            conn.close()
            return False
        cur.execute(
            "INSERT OR IGNORE INTO world_boss_registrations (spawn_id, user_id) VALUES (?,?)",
            (int(spawn_id), int(user_id)),
        )
        conn.commit()
        conn.close()
        return True

    def wb_unregister(self, spawn_id: int, user_id: int) -> bool:
        """Отменить регистрацию. Возвращает True если запись была."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        changed = cur.rowcount > 0
        conn.commit()
        conn.close()
        return changed

    def wb_is_registered(self, spawn_id: int, user_id: int) -> bool:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        found = cur.fetchone() is not None
        conn.close()
        return found

    def wb_registration_count(self, spawn_id: int) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        # AS c — иначе на Postgres (dict_row) row['count'], на SQLite row[0].
        # С алиасом обе БД отдают строку с ключом 'c'.
        cur.execute(
            "SELECT COUNT(*) AS c FROM world_boss_registrations WHERE spawn_id=?",
            (int(spawn_id),),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return 0
        try:
            return int(row["c"])
        except (KeyError, TypeError):
            return int(row[0])  # fallback для SQLite если row — tuple
