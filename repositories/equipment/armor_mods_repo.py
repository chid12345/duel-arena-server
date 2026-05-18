"""CRUD для armor_custom_mods и player_owned_armor.

armor_custom_mods — персональные модификаторы брони, используется ТОЛЬКО для
armor_mythic4 (legendary_usdt): +19 свободных статов, выбор пассивки, кастом-имя.
После сноса legacy class-системы эта таблица — единственный источник истины
для USDT-кастомки (вместо user_inventory).

player_owned_armor — что куплено (аналог player_owned_weapons). Доступ для
надевания и для recovery платных покупок.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

# Боевые пассивки (combat-модификаторы, не статы). Применяются в battle_system.
_VALID_PASSIVES = ("damage_pct", "double_hit", "crit_dmg_pct", "armor_pct")
# Куда можно вкладывать +19 свободных статов
_VALID_STATS = ("strength", "agility", "intuition", "stamina")
_STAT_COL = {
    "strength":  "str_bonus",
    "agility":   "agi_bonus",
    "intuition": "int_bonus",
    "stamina":   "end_bonus",
}
LEGENDARY_USDT_ITEM_ID = "armor_mythic4"
LEGENDARY_FREE_STATS_TOTAL = 19
_USDT_MAX_NAME_LEN = 50


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
                          custom_name, applied, free_stats_left, passive_type
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
                "free_stats_left": int(row["free_stats_left"] or 0),
                "passive_type": (row["passive_type"] or "").strip() or None,
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
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO armor_custom_mods
                       (user_id, item_id, str_bonus, agi_bonus, int_bonus, end_bonus,
                        custom_name, applied, free_stats_left, passive_type)
                   VALUES (?, ?, 0, 0, 0, 0, NULL, 0, ?, NULL)
                   ON CONFLICT(user_id, item_id) DO UPDATE SET
                       str_bonus=0, agi_bonus=0, int_bonus=0, end_bonus=0,
                       custom_name=NULL, applied=0,
                       free_stats_left=excluded.free_stats_left, passive_type=NULL""",
                (user_id, item_id, LEGENDARY_FREE_STATS_TOTAL),
            )
            conn.commit()
        finally:
            conn.close()

    # ─── Legendary USDT (armor_mythic4) — публичный API ────────────────────────

    def create_legendary_armor(self, user_id: int, custom_name: Optional[str] = None) -> Tuple[bool, str]:
        """Создать USDT-кастомку (armor_mythic4) с пулом +19 свободных статов.

        Идемпотентно: если уже есть armor_custom_mods запись — возвращает (False, "уже есть").
        Не вызывает equip_item — это решение игрока в UI.
        """
        existing = self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)
        if existing is not None:
            return False, "Легендарный слот уже создан"
        name = (custom_name or "Легендарный слот").strip()[:_USDT_MAX_NAME_LEN] or "Легендарный слот"
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO player_owned_armor (user_id, item_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                (user_id, LEGENDARY_USDT_ITEM_ID),
            )
            cursor.execute(
                """INSERT INTO armor_custom_mods
                       (user_id, item_id, str_bonus, agi_bonus, int_bonus, end_bonus,
                        custom_name, applied, free_stats_left, passive_type)
                   VALUES (?, ?, 0, 0, 0, 0, ?, 0, ?, NULL)""",
                (user_id, LEGENDARY_USDT_ITEM_ID, name, LEGENDARY_FREE_STATS_TOTAL),
            )
            conn.commit()
            return True, "Легендарный слот создан"
        finally:
            conn.close()

    def has_legendary_armor(self, user_id: int) -> bool:
        return self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID) is not None

    def train_legendary_stat(self, user_id: int, stat: str) -> Tuple[bool, str, Optional[Dict]]:
        """+1 в стат, -1 из пула. Заблокировано после apply_legendary_stats."""
        if stat not in _VALID_STATS:
            return False, f"Неверный стат: {stat}", None
        data = self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)
        if not data:
            return False, "Легендарный слот не создан", None
        if data["applied"]:
            return False, "Сборка сохранена — нужен сброс перед изменениями", data
        if data["free_stats_left"] <= 0:
            return False, "Нет свободных очков", data
        col = _STAT_COL[stat]
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                f"UPDATE armor_custom_mods SET {col}={col}+1, free_stats_left=free_stats_left-1 "
                "WHERE user_id=? AND item_id=?",
                (user_id, LEGENDARY_USDT_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Стат увеличен", self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)

    def untrain_legendary_stat(self, user_id: int, stat: str) -> Tuple[bool, str, Optional[Dict]]:
        """-1 из стата, +1 в пул. Заблокировано после apply_legendary_stats."""
        if stat not in _VALID_STATS:
            return False, f"Неверный стат: {stat}", None
        data = self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)
        if not data:
            return False, "Легендарный слот не создан", None
        if data["applied"]:
            return False, "Сборка сохранена — нужен сброс перед изменениями", data
        col_key = {"strength": "str_bonus", "agility": "agi_bonus",
                   "intuition": "int_bonus", "stamina": "end_bonus"}[stat]
        if int(data.get(col_key, 0)) <= 0:
            return False, "Нечего снимать", data
        col = _STAT_COL[stat]
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                f"UPDATE armor_custom_mods SET {col}={col}-1, free_stats_left=free_stats_left+1 "
                "WHERE user_id=? AND item_id=?",
                (user_id, LEGENDARY_USDT_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Стат уменьшен", self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)

    def set_legendary_passive(self, user_id: int, passive_type: Optional[str]) -> Tuple[bool, str, Optional[Dict]]:
        """Установить/снять боевую пассивку. Заблокировано после apply_legendary_stats."""
        pt = (passive_type or "").strip() or None
        if pt and pt not in _VALID_PASSIVES:
            return False, f"Неверный тип пассивки: {pt}", None
        data = self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)
        if not data:
            return False, "Легендарный слот не создан", None
        if data["applied"]:
            return False, "Сборка сохранена — нужен сброс перед изменениями", data
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE armor_custom_mods SET passive_type=? WHERE user_id=? AND item_id=?",
                (pt, user_id, LEGENDARY_USDT_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Пассивка обновлена", self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)

    def apply_legendary_stats(self, user_id: int) -> Tuple[bool, str, Optional[Dict]]:
        """Зафиксировать сборку: applied=1. Все +19 очков должны быть распределены,
        пассивка выбрана. После — изменения заблокированы до reset_legendary."""
        data = self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)
        if not data:
            return False, "Легендарный слот не создан", None
        if data["applied"]:
            return False, "Сборка уже сохранена", data
        if data["free_stats_left"] > 0:
            return False, f"Распредели все очки — осталось {data['free_stats_left']}", data
        if not data.get("passive_type"):
            return False, "Выбери пассивный бонус перед сохранением", data
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE armor_custom_mods SET applied=1 WHERE user_id=? AND item_id=?",
                (user_id, LEGENDARY_USDT_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Сборка сохранена", self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)

    def reset_legendary(self, user_id: int) -> Tuple[bool, str]:
        """Полный сброс сборки (для USDT-сброса 5.99). Очки возвращаются в пул."""
        if not self.has_legendary_armor(user_id):
            return False, "Легендарный слот не создан"
        self.reset_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)
        return True, "Сборка сброшена"

    def set_legendary_name(self, user_id: int, name: str) -> Tuple[bool, str]:
        """Изменить кастомное имя слота."""
        n = (name or "").strip()[:_USDT_MAX_NAME_LEN]
        if not n:
            return False, "Имя не может быть пустым"
        if not self.has_legendary_armor(user_id):
            return False, "Легендарный слот не создан"
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE armor_custom_mods SET custom_name=? WHERE user_id=? AND item_id=?",
                (n, user_id, LEGENDARY_USDT_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Имя обновлено"

    def get_equipped_legendary_passive(self, user_id: int) -> str:
        """passive_type надетой legendary brony (для battle_system). '' если не надета или не сохранена."""
        try:
            eq = self.get_equipment(int(user_id))
        except Exception:
            return ""
        armor = (eq or {}).get("armor") if eq else None
        if not armor or armor.get("item_id") != LEGENDARY_USDT_ITEM_ID:
            return ""
        data = self.get_armor_custom_mods(user_id, LEGENDARY_USDT_ITEM_ID)
        if not data or not data.get("applied"):
            return ""
        return data.get("passive_type") or ""
