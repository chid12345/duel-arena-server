"""CRUD для брони armor2 и armor2_custom_mods.

2026_05_20 — КОНЕЦ ДУАЛИЗМА: броня живёт в ОБЩЕЙ таблице player_owned_weapons
(как все 5 слотов: оружие/шлем/щит/ноги/кольцо), а не в отдельной
player_owned_armor2. id брони (armor2_*) не конфликтуют с остальными
(weapon_*/helmet_*/…), поэтому фильтруем по префиксу armor2_%. Это убирает
повторяющиеся баги «операция для всех предметов забыла про броню» (сброс,
выдача и т.п.).
- player_owned_weapons (item_id LIKE 'armor2_%') — что куплено.
- armor2_custom_mods — только для armor2_mythic4 (+19 свободных статов,
  выбор пассивки, кастомное имя). Остаётся отдельной — это спец-поля 1 предмета.

НЕТ синхронизации с players.current_class, mirror-таблиц или legacy_class_id.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

# Боевые пассивки (combat-модификаторы, не статы)
_VALID_PASSIVES = ("damage_pct", "double_hit", "crit_dmg_pct", "armor_pct")
# Куда можно вкладывать +19 свободных статов
_VALID_STATS = ("strength", "agility", "intuition", "stamina")
_STAT_COL = {
    "strength":  "str_bonus",
    "agility":   "agi_bonus",
    "intuition": "int_bonus",
    "stamina":   "end_bonus",
}
LEGENDARY_ARMOR2_ITEM_ID = "armor2_mythic4"
LEGENDARY_FREE_STATS_TOTAL = 19
_USDT_MAX_NAME_LEN = 50


class Armor2ModsMixin:

    # ── броня в общей таблице player_owned_weapons (item_id LIKE 'armor2_%') ─────

    def add_owned_armor2(self, user_id: int, item_id: str) -> None:
        """Добавить броню в арсенал (идемпотентно). Общая таблица со всеми слотами."""
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

    def get_owned_armor2(self, user_id: int) -> List[str]:
        """Список item_id брони игрока (только armor2_*, из общей таблицы)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Паттерн идёт ПАРАМЕТРОМ, не литералом: иначе на Postgres psycopg
            # принимает '%' за плейсхолдер и запрос падает (на SQLite ок).
            # 'armor2%' (без '_') — все id брони начинаются с armor2, чужих нет.
            cursor.execute(
                "SELECT item_id FROM player_owned_weapons WHERE user_id = ? AND item_id LIKE ?",
                (user_id, "armor2%"),
            )
            return [r["item_id"] for r in cursor.fetchall()]
        finally:
            conn.close()

    def remove_owned_armor2(self, user_id: int, item_id: str) -> bool:
        """Удалить броню из арсенала (при разборке). Для armor2_mythic4 заодно
        стирает персональные модификаторы (armor2_custom_mods), иначе при повторной
        покупке всплыли бы старые +19 статов. Возвращает True если что-то удалено."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM player_owned_weapons WHERE user_id = ? AND item_id = ?",
                (user_id, item_id),
            )
            affected = cursor.rowcount
            if item_id == LEGENDARY_ARMOR2_ITEM_ID:
                cursor.execute(
                    "DELETE FROM armor2_custom_mods WHERE user_id = ? AND item_id = ?",
                    (user_id, item_id),
                )
            conn.commit()
            return affected > 0
        finally:
            conn.close()

    def is_armor2_owned(self, user_id: int, item_id: str) -> bool:
        """Проверка владения конкретной бронёй."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT 1 FROM player_owned_weapons WHERE user_id = ? AND item_id = ? LIMIT 1",
                (user_id, item_id),
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()

    # ── armor2_custom_mods (armor2_mythic4: +19 статов и кастом-имя) ──────────

    def get_armor2_custom_mods(self, user_id: int, item_id: str) -> Optional[Dict]:
        """Вернуть персональные модификаторы брони. None если их нет."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT str_bonus, agi_bonus, int_bonus, end_bonus,
                          custom_name, applied, free_stats_left, passive_type
                   FROM armor2_custom_mods
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

    # ── Legendary armor2_mythic4 — публичный API ──────────────────────────────

    def create_legendary_armor2(self, user_id: int, custom_name: Optional[str] = None) -> Tuple[bool, str]:
        """Создать armor2_mythic4 с пулом +19 свободных статов.

        ВАЖНО: add_owned_armor2 вызывается ВСЕГДА в начале — чтобы после
        оплаты $11.99 USDT/⭐800 запись в player_owned_armor2 гарантированно
        появилась, даже если armor2_custom_mods уже есть (рассогласование
        после прерванной доставки). Этот баг был у старого armor — там
        ранний выход «уже создан» оставлял арсенал пустым.
        """
        self.add_owned_armor2(user_id, LEGENDARY_ARMOR2_ITEM_ID)
        existing = self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID)
        if existing is not None:
            return False, "Легендарный слот уже создан"
        name = (custom_name or "Легендарный слот").strip()[:_USDT_MAX_NAME_LEN] or "Легендарный слот"
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO armor2_custom_mods
                       (user_id, item_id, str_bonus, agi_bonus, int_bonus, end_bonus,
                        custom_name, applied, free_stats_left, passive_type)
                   VALUES (?, ?, 0, 0, 0, 0, ?, 0, ?, NULL)""",
                (user_id, LEGENDARY_ARMOR2_ITEM_ID, name, LEGENDARY_FREE_STATS_TOTAL),
            )
            conn.commit()
            return True, "Легендарный слот создан"
        finally:
            conn.close()

    def has_legendary_armor2(self, user_id: int) -> bool:
        return self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID) is not None

    def train_legendary_armor2_stat(self, user_id: int, stat: str) -> Tuple[bool, str, Optional[Dict]]:
        """+1 в стат, -1 из пула. Заблокировано после apply_legendary_armor2_stats."""
        if stat not in _VALID_STATS:
            return False, f"Неверный стат: {stat}", None
        data = self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID)
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
                f"UPDATE armor2_custom_mods SET {col}={col}+1, free_stats_left=free_stats_left-1 "
                "WHERE user_id=? AND item_id=?",
                (user_id, LEGENDARY_ARMOR2_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Стат увеличен", self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID)

    def untrain_legendary_armor2_stat(self, user_id: int, stat: str) -> Tuple[bool, str, Optional[Dict]]:
        """-1 из стата, +1 в пул. Заблокировано после apply_legendary_armor2_stats."""
        if stat not in _VALID_STATS:
            return False, f"Неверный стат: {stat}", None
        data = self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID)
        if not data:
            return False, "Легендарный слот не создан", None
        if data["applied"]:
            return False, "Сборка сохранена — нужен сброс перед изменениями", data
        col_key = _STAT_COL[stat]
        if int(data.get(col_key, 0)) <= 0:
            return False, "Нечего снимать", data
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                f"UPDATE armor2_custom_mods SET {col_key}={col_key}-1, free_stats_left=free_stats_left+1 "
                "WHERE user_id=? AND item_id=?",
                (user_id, LEGENDARY_ARMOR2_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Стат уменьшен", self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID)

    def set_legendary_armor2_passive(self, user_id: int, passive_type: Optional[str]) -> Tuple[bool, str, Optional[Dict]]:
        """Установить/снять боевую пассивку. Заблокировано после apply."""
        pt = (passive_type or "").strip() or None
        if pt and pt not in _VALID_PASSIVES:
            return False, f"Неверный тип пассивки: {pt}", None
        data = self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID)
        if not data:
            return False, "Легендарный слот не создан", None
        if data["applied"]:
            return False, "Сборка сохранена — нужен сброс перед изменениями", data
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE armor2_custom_mods SET passive_type=? WHERE user_id=? AND item_id=?",
                (pt, user_id, LEGENDARY_ARMOR2_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Пассивка обновлена", self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID)

    def apply_legendary_armor2_stats(self, user_id: int) -> Tuple[bool, str, Optional[Dict]]:
        """Зафиксировать сборку: applied=1. Все +19 очков должны быть распределены,
        пассивка выбрана. После — изменения заблокированы до reset_legendary_armor2."""
        data = self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID)
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
                "UPDATE armor2_custom_mods SET applied=1 WHERE user_id=? AND item_id=?",
                (user_id, LEGENDARY_ARMOR2_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Сборка сохранена", self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID)

    def reset_legendary_armor2(self, user_id: int) -> Tuple[bool, str]:
        """Полный сброс сборки (для USDT-сброса 5.99). Очки возвращаются в пул."""
        if not self.has_legendary_armor2(user_id):
            return False, "Легендарный слот не создан"
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """UPDATE armor2_custom_mods SET
                   str_bonus=0, agi_bonus=0, int_bonus=0, end_bonus=0,
                   custom_name=NULL, applied=0,
                   free_stats_left=?, passive_type=NULL
                   WHERE user_id=? AND item_id=?""",
                (LEGENDARY_FREE_STATS_TOTAL, user_id, LEGENDARY_ARMOR2_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Сборка сброшена"

    def set_legendary_armor2_name(self, user_id: int, name: str) -> Tuple[bool, str]:
        """Изменить кастомное имя слота."""
        n = (name or "").strip()[:_USDT_MAX_NAME_LEN]
        if not n:
            return False, "Имя не может быть пустым"
        if not self.has_legendary_armor2(user_id):
            return False, "Легендарный слот не создан"
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE armor2_custom_mods SET custom_name=? WHERE user_id=? AND item_id=?",
                (n, user_id, LEGENDARY_ARMOR2_ITEM_ID),
            )
            conn.commit()
        finally:
            conn.close()
        return True, "Имя обновлено"

    def get_equipped_legendary_armor2_passive(self, user_id: int) -> str:
        """passive_type надетой legendary armor2 (для battle_system). '' если не надета или не сохранена."""
        try:
            eq = self.get_equipment(int(user_id))
        except Exception:
            return ""
        armor2 = (eq or {}).get("armor2") if eq else None
        if not armor2 or armor2.get("item_id") != LEGENDARY_ARMOR2_ITEM_ID:
            return ""
        data = self.get_armor2_custom_mods(user_id, LEGENDARY_ARMOR2_ITEM_ID)
        if not data or not data.get("applied"):
            return ""
        return data.get("passive_type") or ""
