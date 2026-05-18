"""CRUD для player_equipment + суммарные бонусы к бою."""

from __future__ import annotations

from typing import Dict, Optional

from db_schema.equipment_catalog import get_item, get_item_stats, SLOT_ARMOR, SLOT_RING1, SLOT_RING2
from db_schema.equipment_items.armor import ARMOR, legacy_class_to_armor_item_id
from economy.curves import is_tier_unlocked


def _armor_item_to_legacy_class(item_id: str) -> tuple[str | None, str | None]:
    """Возвращает (legacy_class_id, class_type) для armor item_id.

    Нужно battle_system: damage.py / damage_armor.py / set_perks.py читают
    `players.current_class` для перков (берсеркер +12%, страж -3% урона и т.п.).
    Унификация armor: класс синхронизируется автоматически из надетого armor item.
    """
    meta = ARMOR.get(item_id) or {}
    legacy = meta.get("legacy_class_id")
    if not legacy:
        return None, None
    # currency определяет class_type (для current_class_type в battle_system).
    currency = (meta.get("currency") or "").strip()
    type_map = {"gold": "gold", "diamond": "diamonds", "star": "mythic", "usdt": "usdt"}
    class_type = type_map.get(currency)
    # free-классы помечены currency="gold", но цена 800g и legacy_class_id=*_free
    if legacy.endswith("_free"):
        class_type = "free"
    return legacy, class_type


class EquipmentMixin:

    def _can_use_tier(self, user_id: int, item_tier: Optional[str]) -> bool:
        """Серверная проверка tier-разблокировки. None tier → пропускаем (legacy)."""
        if not item_tier:
            return True
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT level FROM players WHERE user_id = ?", (user_id,))
            row = cur.fetchone()
            player_level = int(row["level"] or 1) if row else 1
        finally:
            conn.close()
        return is_tier_unlocked(player_level, str(item_tier))

    def get_equipment(self, user_id: int) -> Dict[str, Dict]:
        """Возвращает {slot: {item_id, ...item_data}} для всех надетых слотов.

        Этап 8: mythic-предметы доступны только если куплены или у игрока
        есть активная аренда. Истёкшие mythic-аренды авто-снимаются здесь —
        get_equipment вызывается в каждом рендере профиля и в бою.

        Унификация armor (шаг 3/6): если в player_equipment нет armor, но
        в players.current_class есть значение — собираем armor синтетически
        через маппинг legacy_class_id → item_id. Это позволяет consumer-коду
        видеть armor как обычный 6-й слот до полного перехода на equip_item.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT slot, item_id FROM player_equipment WHERE user_id = ?",
            (user_id,),
        )
        rows = cursor.fetchall()
        result: Dict[str, Dict] = {}
        expired_slots: list[str] = []
        owned_set: set[str] | None = None
        armor_owned_set: set[str] | None = None
        rental_set: set[str] | None = None

        def _ensure_rental_set():
            nonlocal rental_set
            if rental_set is None:
                rental_set = {r["item_id"] for r in self.list_active_rentals(user_id)}
            return rental_set

        for row in rows:
            slot, item_id = row["slot"], row["item_id"]
            item = get_item(item_id)
            if not item:
                continue
            if item.get("rarity") == "mythic":
                _ensure_rental_set()
                if slot == SLOT_ARMOR:
                    if armor_owned_set is None:
                        armor_owned_set = set(self.get_owned_armor(user_id))
                    if item_id not in armor_owned_set and item_id not in rental_set:
                        expired_slots.append(slot)
                        continue
                else:
                    if owned_set is None:
                        owned_set = set(self.get_owned_weapons(user_id))
                    if item_id not in owned_set and item_id not in rental_set:
                        expired_slots.append(slot)
                        continue
            result[slot] = {"item_id": item_id, **item}

        # Fallback armor: если в player_equipment нет — собираем из current_class
        if SLOT_ARMOR not in result:
            cursor.execute(
                "SELECT current_class FROM players WHERE user_id = ?", (user_id,),
            )
            crow = cursor.fetchone()
            cur_class = crow["current_class"] if crow else None
            item_id = legacy_class_to_armor_item_id(cur_class)
            if item_id:
                item = get_item(item_id)
                if item:
                    # mythic-чек тоже работает для fallback
                    skip = False
                    if item.get("rarity") == "mythic":
                        _ensure_rental_set()
                        if armor_owned_set is None:
                            armor_owned_set = set(self.get_owned_armor(user_id))
                        if item_id not in armor_owned_set and item_id not in rental_set:
                            skip = True
                    if not skip:
                        result[SLOT_ARMOR] = {"item_id": item_id, **item}

        conn.close()
        for s in expired_slots:
            self.unequip_item(user_id, s)
        return result

    def equip_item(self, user_id: int, slot: str, item_id: str, force: bool = False) -> bool:
        """Надеть предмет в слот (UPSERT). Для кольца — по умолчанию заполняет ring1, потом ring2.
        force=True — писать точно в переданный slot без ring-логики (для платных покупок Stars/USDT:
        мини-апп показывает только ring1, и купленное кольцо должно туда и попадать).

        Этап 3E: tier-проверка по уровню игрока. force=True пропускает блок —
        Stars/USDT-покупки уже оплачены, отказывать нельзя. Бот/TMA обычная
        покупка → блок работает.
        """
        # Серверная защита tier-блокировки (этап 3E)
        item_meta = get_item(item_id) or {}
        if not force and not self._can_use_tier(user_id, item_meta.get("tier")):
            return False

        target_slot = slot if force else self._resolve_ring_slot(user_id, slot, item_id)
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
        # Платные покупки (force=True, slot=ring1) — снимаем legacy ring2, если остался.
        # UI профиля рендерит только ring1; дубль в ring2 даёт фантомные статы.
        if force and target_slot == SLOT_RING1:
            cursor.execute(
                "DELETE FROM player_equipment WHERE user_id = ? AND slot = ?",
                (user_id, SLOT_RING2),
            )
        # Унификация armor: синхронизируем `players.current_class` с надетой
        # бронёй. Это нужно battle_system (damage.py:64, damage_armor.py:32,
        # set_perks.py:59) — перки берсеркера/стража/драконьего рыцаря читают
        # current_class. Сделав auto-sync здесь, мы убираем зависимость от
        # legacy purchase_class/switch_class — они больше не вызываются для
        # обычных мифик-брони, только для legendary_usdt (armor_mythic4).
        if target_slot == SLOT_ARMOR:
            legacy_cls, class_type = _armor_item_to_legacy_class(item_id)
            if legacy_cls:
                cursor.execute(
                    "UPDATE players SET current_class = ?, current_class_type = ? WHERE user_id = ?",
                    (legacy_cls, class_type or "", user_id),
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
        # Унификация armor: при снятии брони обнуляем «класс», иначе перки
        # берсеркера/стража продолжат действовать на голого игрока.
        if slot == SLOT_ARMOR:
            cursor.execute(
                "UPDATE players SET current_class = NULL, current_class_type = NULL WHERE user_id = ?",
                (user_id,),
            )
        conn.commit()
        conn.close()
        return affected > 0

    def get_equipment_stats(self, user_id: int) -> Dict[str, float]:
        """Суммарные бонусы от всей экипировки. С учётом +N апгрейдов (этап 4C).

        Каждый предмет с plus_level > 0 даёт умноженные статы:
        stat × (1 + 0.08 × plus). Применяется к каждому стату независимо.
        Базовые статы — из get_item_stats (db_schema/equipment_catalog).
        """
        from economy.upgrades_formulas import plus_stats_for

        equipped = self.get_equipment(user_id)
        # +N для каждого предмета (если методы есть — этап 4B загружен)
        all_plus = self.get_all_item_plus(user_id) if hasattr(self, "get_all_item_plus") else {}

        _STAT_FIELDS = (
            "atk_bonus", "def_pct", "hp_bonus", "crit_bonus", "pen_pct",
            "dodge_bonus", "regen_bonus", "lifesteal_pct", "crit_resist_pct",
            "str_bonus", "agi_bonus", "intu_bonus", "double_pct",
            "gold_pct", "xp_pct", "accuracy", "anti_dodge_pct",
            "silence_pct", "slow_pct", "regen_speed_pct",
        )
        total: Dict[str, float] = {f: 0.0 if "pct" in f else 0 for f in _STAT_FIELDS}

        # Унификация armor (этап 7): для USDT-кастомки (armor_mythic4)
        # подмешиваем индивидуальные модификаторы из armor_custom_mods.
        # Это +19 свободных статов, распределённых игроком.
        armor_mods: dict | None = None
        if SLOT_ARMOR in equipped and equipped[SLOT_ARMOR].get("item_id") == "armor_mythic4":
            try:
                armor_mods = self.get_armor_custom_mods(user_id, "armor_mythic4")
            except Exception:
                armor_mods = None

        for slot, item in equipped.items():
            item_id = item["item_id"]
            base_stats = get_item_stats(item_id)
            plus = int(all_plus.get(item_id, 0))
            stats = plus_stats_for(base_stats, plus) if plus > 0 else base_stats
            # Подмешиваем USDT-кастомизацию к armor_mythic4
            if slot == SLOT_ARMOR and armor_mods and armor_mods.get("applied"):
                stats = dict(stats)
                stats["str_bonus"] = int(stats.get("str_bonus", 0)) + int(armor_mods.get("str_bonus", 0))
                stats["agi_bonus"] = int(stats.get("agi_bonus", 0)) + int(armor_mods.get("agi_bonus", 0))
                stats["intu_bonus"] = int(stats.get("intu_bonus", 0)) + int(armor_mods.get("int_bonus", 0))
                # end_bonus в armor_custom_mods → hp_bonus (×2 stamina per stat)
                stats["hp_bonus"] = int(stats.get("hp_bonus", 0)) + int(armor_mods.get("end_bonus", 0)) * 2
            for f in _STAT_FIELDS:
                val = stats.get(f, 0)
                if not isinstance(val, (int, float)):
                    continue
                if "pct" in f:
                    total[f] = float(total[f]) + float(val)
                else:
                    total[f] = int(total[f]) + int(val)
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
