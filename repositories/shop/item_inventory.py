"""Инвентарь игрока (player_inventory): купленные, ещё не применённые предметы."""

from __future__ import annotations

from typing import Any, Dict, List


class ShopItemInventoryMixin:
    def get_inventory(self, user_id: int) -> List[Dict[str, Any]]:
        """Список предметов в инвентаре."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT item_id, quantity FROM player_inventory WHERE user_id = ? ORDER BY item_id",
            (user_id,),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def has_item(self, user_id: int, item_id: str) -> bool:
        """Проверить наличие предмета в инвентаре."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT quantity FROM player_inventory WHERE user_id = ? AND item_id = ?",
            (user_id, item_id),
        )
        row = cursor.fetchone()
        conn.close()
        return row is not None and (row["quantity"] or 0) > 0

    def add_to_inventory(self, user_id: int, item_id: str, quantity: int = 1) -> None:
        """Добавить предмет (или увеличить количество)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ?",
            (user_id, item_id),
        )
        row = cursor.fetchone()
        if row:
            cursor.execute(
                "UPDATE player_inventory SET quantity = quantity + ? WHERE id = ?",
                (quantity, row["id"]),
            )
        else:
            cursor.execute(
                "INSERT INTO player_inventory (user_id, item_id, quantity) VALUES (?,?,?)",
                (user_id, item_id, quantity),
            )
        conn.commit()
        conn.close()

    def remove_from_inventory(self, user_id: int, item_id: str, quantity: int = 1) -> bool:
        """Убрать предмет (quantity). Возвращает False если не хватает."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, quantity FROM player_inventory WHERE user_id = ? AND item_id = ?",
            (user_id, item_id),
        )
        row = cursor.fetchone()
        if not row or (row["quantity"] or 0) < quantity:
            conn.close()
            return False
        new_qty = row["quantity"] - quantity
        if new_qty <= 0:
            cursor.execute("DELETE FROM player_inventory WHERE id = ?", (row["id"],))
        else:
            cursor.execute(
                "UPDATE player_inventory SET quantity = ? WHERE id = ?",
                (new_qty, row["id"]),
            )
        conn.commit()
        conn.close()
        return True

    def add_starter_kit(self, user_id: int) -> None:
        """Стартовый набор для нового игрока."""
        STARTER = [
            ("hp_small",     1),
            ("scroll_str_3", 1),
            ("xp_boost_5",   1),
        ]
        for item_id, qty in STARTER:
            existing = self.has_item(user_id, item_id)
            if not existing:
                self.add_to_inventory(user_id, item_id, qty)
