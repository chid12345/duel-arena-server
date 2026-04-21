"""CRUD для player_equipment + суммарные бонусы к бою."""

from __future__ import annotations

from typing import Dict, Optional

from db_schema.equipment_catalog import get_item, get_item_stats, SLOT_RING1, SLOT_RING2


class EquipmentMixin:

    def get_equipment(self, user_id: int) -> Dict[str, Dict]:
        """Возвращает {slot: {item_id, ...item_data}} для всех слотов игрока."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT slot, item_id FROM player_equipment WHERE user_id = ?",
            (user_id,),
        )
        rows = cursor.fetchall()
        conn.close()
        result: Dict[str, Dict] = {}
        for row in rows:
            slot, item_id = row["slot"], row["item_id"]
            item = get_item(item_id)
            if item:
                result[slot] = {"item_id": item_id, **item}
        return result

    def equip_item(self, user_id: int, slot: str, item_id: str) -> bool:
        """Надеть предмет в слот (UPSERT). Для кольца — заполняет ring1, потом ring2."""
        target_slot = self._resolve_ring_slot(user_id, slot, item_id)
        if target_slot is None:
            return False
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO player_equipment (user_id, slot, item_id)
               VALUES (?, ?, ?)
               ON CONFLICT(user_id, slot) DO UPDATE SET item_id=excluded.item_id, equipped_at=CURRENT_TIMESTAMP""",
            (user_id, target_slot, item_id),
        )
        conn.commit()
        conn.close()
        return True

    def unequip_item(self, user_id: int, slot: str) -> bool:
        """Снять предмет из слота."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM player_equipment WHERE user_id = ? AND slot = ?",
            (user_id, slot),
        )
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0

    def get_equipment_stats(self, user_id: int) -> Dict[str, float]:
        """Суммарные бонусы от всей экипировки."""
        equipped = self.get_equipment(user_id)
        total = {"atk_bonus": 0, "def_pct": 0.0, "hp_bonus": 0, "crit_bonus": 0, "pen_pct": 0.0}
        for slot, item in equipped.items():
            stats = get_item_stats(item["item_id"])
            total["atk_bonus"]  += stats["atk_bonus"]
            total["def_pct"]    += stats["def_pct"]
            total["hp_bonus"]   += stats["hp_bonus"]
            total["crit_bonus"] += stats["crit_bonus"]
            total["pen_pct"]    += stats.get("pen_pct", 0.0)
        return total

    def add_owned_weapon(self, user_id: int, item_id: str) -> None:
        """Добавляет оружие в player_owned_weapons (идемпотентно)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO player_owned_weapons (user_id, item_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                (user_id, item_id),
            )
            conn.commit()
        finally:
            conn.close()

    def get_owned_weapons(self, user_id: int):
        """Возвращает список item_id оружия в арсенале."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT item_id FROM player_owned_weapons WHERE user_id = ?", (user_id,))
            return [r["item_id"] for r in cursor.fetchall()]
        finally:
            conn.close()

    def _resolve_ring_slot(self, user_id: int, slot: str, item_id: str) -> Optional[str]:
        """Для кольца: ring1 если свободен, иначе ring2. Для остальных — слот напрямую."""
        if slot not in (SLOT_RING1, SLOT_RING2):
            return slot
        equipped = self.get_equipment(user_id)
        if SLOT_RING1 not in equipped:
            return SLOT_RING1
        if equipped.get(SLOT_RING1, {}).get("item_id") == item_id:
            return SLOT_RING1
        return SLOT_RING2
