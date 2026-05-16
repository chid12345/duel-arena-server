"""CRUD для item_upgrades. Хранит +N и статистику попыток на (user_id, item_id).

Этап 4B редизайна. Используется битвой (4C) — учёт +N в статах,
и API (4D) — попытка апгрейда.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict


class UpgradeRepoMixin:

    def get_item_plus(self, user_id: int, item_id: str) -> int:
        """Текущий уровень апгрейда предмета (+N). 0 если нет записи."""
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT plus_level FROM item_upgrades WHERE user_id = ? AND item_id = ?",
                (int(user_id), str(item_id)),
            )
            row = cur.fetchone()
            if not row:
                return 0
            return int(row["plus_level"] or 0)
        finally:
            conn.close()

    def get_all_item_plus(self, user_id: int) -> Dict[str, int]:
        """Все +N игрока — {item_id: plus_level}. Только записи с plus > 0."""
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT item_id, plus_level FROM item_upgrades WHERE user_id = ? AND plus_level > 0",
                (int(user_id),),
            )
            return {str(r["item_id"]): int(r["plus_level"]) for r in cur.fetchall()}
        finally:
            conn.close()

    def record_upgrade_attempt(
        self,
        user_id: int,
        item_id: str,
        gold_cost: int,
        shards_cost: int,
        success: bool,
    ) -> int:
        """Записать попытку апгрейда. При успехе +1 к plus_level.
        Возвращает новый plus_level. Идемпотентно через UPSERT.

        gold/shards уже списаны вызывающим (через consume_shards / UPDATE players).
        Эта функция только обновляет item_upgrades.
        """
        now = datetime.utcnow().isoformat()
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            # UPSERT: если строки нет — создаём с plus_level=0, attempts=1, далее +1 при успехе.
            cur.execute(
                """INSERT INTO item_upgrades
                   (user_id, item_id, plus_level, gold_invested, shards_invested,
                    attempts, fails, updated_at)
                   VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                   ON CONFLICT(user_id, item_id) DO UPDATE SET
                     plus_level = plus_level + ?,
                     gold_invested = gold_invested + ?,
                     shards_invested = shards_invested + ?,
                     attempts = attempts + 1,
                     fails = fails + ?,
                     updated_at = ?""",
                (
                    int(user_id), str(item_id),
                    1 if success else 0,
                    int(gold_cost), int(shards_cost),
                    0 if success else 1, now,
                    1 if success else 0,
                    int(gold_cost), int(shards_cost),
                    0 if success else 1, now,
                ),
            )
            conn.commit()
            cur.execute(
                "SELECT plus_level FROM item_upgrades WHERE user_id = ? AND item_id = ?",
                (int(user_id), str(item_id)),
            )
            row = cur.fetchone()
            return int(row["plus_level"] or 0) if row else 0
        finally:
            conn.close()

    def reset_item_plus(self, user_id: int, item_id: str) -> None:
        """Сбросить +N для предмета (например при разборке). Удаляет запись."""
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM item_upgrades WHERE user_id = ? AND item_id = ?",
                (int(user_id), str(item_id)),
            )
            conn.commit()
        finally:
            conn.close()
