"""Переключение активного класса.

Унификация armor (этап 7): delta-модель статов отключена. Раньше класс
напрямую менял players.strength/endurance/crit/max_hp. Теперь armor — это
обычный предмет в EQUIPMENT_CATALOG, и его статы (str_bonus/agi_bonus/
intu_bonus/hp_bonus) суммируются в get_equipment_stats и применяются в
бою через battle_system/mixins/start.py, как у helmet/weapon/shield/etc.

switch_class по-прежнему:
- Обновляет players.current_class (UI-маркер совместимости)
- UPDATE user_inventory.equipped (legacy таблица, остаётся до полной выпилки)
- Dual-write в player_equipment(slot='armor') + player_owned_armor
- Синхронизация armor_custom_mods для USDT-кастомок

НО НЕ применяет delta к players.strength/endurance/crit/max_hp —
статы приходят через unified equipment-путь.
"""

from __future__ import annotations

from typing import Tuple

from db_schema.equipment_items.armor import legacy_class_to_armor_item_id


class InventorySwitchMixin:
    def switch_class(self, user_id: int, class_id: str) -> Tuple[bool, str]:
        """Переключиться на другой класс (включая Легендарный слоты).

        После унификации armor (этап 7) статы не применяются delta —
        они идут через get_equipment_stats как у обычных предметов.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        try:
            cursor.execute(
                "SELECT class_type FROM user_inventory WHERE user_id = ? AND class_id = ? LIMIT 1",
                (user_id, class_id),
            )
            owned_row = cursor.fetchone()
            if not owned_row:
                return False, "У вас нет этого класса"
            target_type = (self._row_get(owned_row, "class_type") or "").strip()

            class_info = self.get_class_info(class_id) if target_type != "usdt" else None
            if target_type != "usdt" and not class_info:
                return False, "Класс не найден"

            self._remove_legacy_avatar_bonus_with_cursor(cursor, user_id)

            # Обновляем инвентарь и current_class (UI-маркер)
            cursor.execute("UPDATE user_inventory SET equipped = FALSE WHERE user_id = ?", (user_id,))
            cursor.execute(
                "UPDATE user_inventory SET equipped = TRUE WHERE user_id = ? AND class_id = ?",
                (user_id, class_id),
            )
            cursor.execute(
                "UPDATE players SET current_class = ?, current_class_type = ? WHERE user_id = ?",
                (class_id, target_type, user_id),
            )

            # Унификация armor: dual-write в новые таблицы. Это запись брони
            # в player_equipment(slot='armor') — далее get_equipment_stats
            # автоматом применит str_bonus/agi_bonus/intu_bonus/hp_bonus из
            # каталога armor.py к статам игрока в бою.
            self._mirror_armor_to_unified_tables(cursor, user_id, class_id, target_type)

            conn.commit()
            return True, f"Переключен на класс '{class_info['name'] if class_info else 'USDT слот'}'"

        except Exception as e:
            conn.rollback()
            return False, f"Ошибка переключения: {str(e)}"
        finally:
            conn.close()

    def _apply_stat_delta_to_player(self, cursor, user_id: int,
                                    d_str: int, d_end: int, d_crit: int, d_hp: int) -> None:
        """NO-OP после унификации armor (этап 7).

        Раньше применял delta к players.strength/endurance/crit/max_hp.
        Теперь статы брони идут через get_equipment_stats как у обычного
        предмета. USDT-кастомка хранит +19 свободных статов в
        armor_custom_mods, которые подмешиваются в get_equipment_stats.

        Метод-заглушка оставлен ради обратной совместимости consumers
        (usdt.py, usdt_apply_passive.py). При полной выпилке legacy
        стека (отдельный этап) будет удалён.
        """
        return

    def _usdt_stat_vector(self, cursor, user_id: int, class_info) -> dict:
        """NO-OP после унификации armor (этап 7).

        Возвращает нулевой вектор — все статы USDT-кастомки идут через
        armor_custom_mods → get_equipment_stats.
        """
        return {"strength": 0, "endurance": 0, "crit": 0, "max_hp": 0}

    def _mirror_armor_to_unified_tables(self, cursor, user_id: int, class_id: str, class_type: str) -> None:
        """Dual-write в новые armor-таблицы после UPDATE players.current_class.

        - player_owned_armor — гарантируем владение item_id
        - player_equipment(slot='armor') — текущая надетая броня для
          get_equipment_stats / UI
        - armor_custom_mods (только для USDT) — синхронизируем saved-поля
          и custom_name для legendary_usdt (+19 свободных статов)
        """
        item_id = legacy_class_to_armor_item_id(class_id)
        if not item_id:
            return
        cursor.execute(
            "INSERT INTO player_owned_armor (user_id, item_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
            (user_id, item_id),
        )
        cursor.execute(
            """INSERT INTO player_equipment (user_id, slot, item_id)
               VALUES (?, 'armor', ?)
               ON CONFLICT(user_id, slot) DO UPDATE SET item_id=excluded.item_id, equipped_at=CURRENT_TIMESTAMP""",
            (user_id, item_id),
        )
        if class_type == "usdt":
            cursor.execute(
                """SELECT strength_saved, agility_saved, intuition_saved, endurance_saved,
                          custom_name, stats_applied
                   FROM user_inventory WHERE user_id=? AND class_id=?""",
                (user_id, class_id),
            )
            row = cursor.fetchone()
            if row is not None:
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
                        int(self._row_get(row, "strength_saved", 0) or 0),
                        int(self._row_get(row, "agility_saved", 0) or 0),
                        int(self._row_get(row, "intuition_saved", 0) or 0),
                        int(self._row_get(row, "endurance_saved", 0) or 0),
                        self._row_get(row, "custom_name"),
                        1 if bool(self._row_get(row, "stats_applied", False)) else 0,
                    ),
                )
