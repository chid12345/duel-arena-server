"""CRUD для item_upgrades (система апгрейдов v2, без шардов).

Хранит уровень вещи +N и потраченное на (user_id, item_id), плюс счётчик
бесплатных «удачных» апгрейдов (free_used) — лимит казино на вещь.
Читается боем (equipment_repo.get_equipment_stats) и API апгрейда.
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict


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

    def get_item_free_used(self, user_id: int, item_id: str) -> int:
        """Сколько бесплатных «удачных» апгрейдов уже сработало на этой вещи."""
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT free_used FROM item_upgrades WHERE user_id = ? AND item_id = ?",
                (int(user_id), str(item_id)),
            )
            row = cur.fetchone()
            return int(row["free_used"] or 0) if row else 0
        finally:
            conn.close()

    def record_upgrade(
        self,
        user_id: int,
        item_id: str,
        gold_spent: int = 0,
        diamonds_spent: int = 0,
        was_free: bool = False,
    ) -> int:
        """Записать успешный апгрейд: +1 к plus_level. Возвращает новый plus_level.

        Деньги уже списаны вызывающим — здесь только обновляем item_upgrades.
        Идемпотентно через UPSERT. Голые имена столбцов в DO UPDATE неоднозначны
        в PostgreSQL (есть и в таблице, и в excluded) → квалифицируем обе стороны.
        """
        now = datetime.utcnow().isoformat()
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO item_upgrades
                   (user_id, item_id, plus_level, gold_invested, diamonds_invested,
                    free_used, updated_at)
                   VALUES (?, ?, 1, ?, ?, ?, ?)
                   ON CONFLICT(user_id, item_id) DO UPDATE SET
                     plus_level = item_upgrades.plus_level + 1,
                     gold_invested = item_upgrades.gold_invested + excluded.gold_invested,
                     diamonds_invested = item_upgrades.diamonds_invested + excluded.diamonds_invested,
                     free_used = item_upgrades.free_used + excluded.free_used,
                     updated_at = excluded.updated_at""",
                (
                    int(user_id), str(item_id),
                    int(gold_spent), int(diamonds_spent),
                    1 if was_free else 0, now,
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
