"""CRUD для armor_custom_mods и player_owned_armor (Вариант В, шаг 2/6).

armor_custom_mods — персональные модификаторы брони. Сейчас используется
только для legendary_usdt (armor_mythic4): +19 свободных статов, кастом-имя.

player_owned_armor — что куплено (аналог player_owned_weapons). Доступ для
надевания и для recovery платных покупок.

Не привязано к switch_class — это произойдёт в коммите 3 (когда switch_class
станет тонкой обёрткой над equip_item).
"""

from __future__ import annotations

from typing import Dict, List, Optional


class ArmorModsMixin:

    # ── player_owned_armor ────────────────────────────────────────────────────

    def add_owned_armor(self, user_id: int, item_id: str) -> None:
        """Добавить броню в арсенал (идемпотентно)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO player_owned_armor (user_id, item_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                (user_id, item_id),
            )
            conn.commit()
        finally:
            conn.close()

    def get_owned_armor(self, user_id: int) -> List[str]:
        """Список item_id брони в арсенале игрока."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT item_id FROM player_owned_armor WHERE user_id = ?",
                (user_id,),
            )
            return [r["item_id"] for r in cursor.fetchall()]
        finally:
            conn.close()

    def is_armor_owned(self, user_id: int, item_id: str) -> bool:
        """Проверка владения конкретной бронёй."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT 1 FROM player_owned_armor WHERE user_id = ? AND item_id = ? LIMIT 1",
                (user_id, item_id),
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()

    # ── armor_custom_mods (legendary_usdt: +19 статов и кастом-имя) ───────────

    def get_armor_custom_mods(self, user_id: int, item_id: str) -> Optional[Dict]:
        """Вернуть персональные модификаторы брони. None если их нет."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT str_bonus, agi_bonus, int_bonus, end_bonus,
                          custom_name, applied
                   FROM armor_custom_mods
                   WHERE user_id = ? AND item_id = ?""",
                (user_id, item_id),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "str_bonus": int(row["str_bonus"] or 0),
                "agi_bonus": int(row["agi_bonus"] or 0),
                "int_bonus": int(row["int_bonus"] or 0),
                "end_bonus": int(row["end_bonus"] or 0),
                "custom_name": row["custom_name"],
                "applied": bool(row["applied"]),
            }
        finally:
            conn.close()

    def upsert_armor_custom_mods(
        self,
        user_id: int,
        item_id: str,
        *,
        str_bonus: int = 0,
        agi_bonus: int = 0,
        int_bonus: int = 0,
        end_bonus: int = 0,
        custom_name: Optional[str] = None,
        applied: bool = False,
    ) -> None:
        """Создать или обновить персональные модификаторы брони."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO armor_custom_mods
                       (user_id, item_id, str_bonus, agi_bonus, int_bonus, end_bonus, custom_name, applied)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(user_id, item_id) DO UPDATE SET
                       str_bonus=excluded.str_bonus,
                       agi_bonus=excluded.agi_bonus,
                       int_bonus=excluded.int_bonus,
                       end_bonus=excluded.end_bonus,
                       custom_name=excluded.custom_name,
                       applied=excluded.applied""",
                (
                    user_id, item_id,
                    int(str_bonus), int(agi_bonus), int(int_bonus), int(end_bonus),
                    custom_name, 1 if applied else 0,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def reset_armor_custom_mods(self, user_id: int, item_id: str) -> None:
        """Сбросить статы брони (для USDT-сброса 5.99)."""
        self.upsert_armor_custom_mods(
            user_id, item_id,
            str_bonus=0, agi_bonus=0, int_bonus=0, end_bonus=0,
            custom_name=None, applied=False,
        )
