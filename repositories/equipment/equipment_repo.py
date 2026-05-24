"""CRUD для player_equipment + суммарные бонусы к бою.

Старый armor (slot='armor') снесён под корень — со всеми ветками про
armor_owned_set, current_class sync, armor_custom_mods, legacy_class_id.
Новый чистый слот «БРОНЯ» в разработке.
"""

from __future__ import annotations

from typing import Dict, Optional

from db_schema.equipment_catalog import get_item, get_item_stats, SLOT_RING1, SLOT_RING2
from economy.curves import is_tier_unlocked


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
        есть активная аренда. Истёкшие mythic-аренды авто-снимаются здесь.
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
        owned_armor2_set: set[str] | None = None
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
                # armor2 владеется через player_owned_armor2 (отдельная таблица),
                # остальные слоты — через player_owned_weapons.
                if slot == "armor2":
                    if owned_armor2_set is None:
                        owned_armor2_set = set(self.get_owned_armor2(user_id))
                    if item_id not in owned_armor2_set and item_id not in rental_set:
                        expired_slots.append(slot)
                        continue
                else:
                    if owned_set is None:
                        owned_set = set(self.get_owned_weapons(user_id))
                    if item_id not in owned_set and item_id not in rental_set:
                        expired_slots.append(slot)
                        continue
            result[slot] = {"item_id": item_id, **item}

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
        """Суммарные бонусы от всей экипировки. С учётом уровня вещи +N.

        Каждый предмет с plus_level > 0 усиливается через plus_stats_for
        (целые статы +2%/ур, проценты мягче). Базовые статы — из get_item_stats.
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
            "body_def_pct",   # зональная защита тела (броня armor2)
            "reflect_pct",    # шипы — отражение урона (броня №1)
            "block_chance",   # глухой блок — шанс погасить удар (броня №2)
        )
        total: Dict[str, float] = {f: 0.0 if "pct" in f else 0 for f in _STAT_FIELDS}

        # armor2_mythic4: подмешиваем +19 свободных статов из armor2_custom_mods.
        # Применяется ТОЛЬКО если игрок зафиксировал сборку (applied=1).
        armor2_mods: dict | None = None
        armor2_item = equipped.get("armor2")
        if armor2_item and armor2_item.get("item_id") == "armor2_mythic4":
            try:
                armor2_mods = self.get_armor2_custom_mods(user_id, "armor2_mythic4")
            except Exception:
                armor2_mods = None

        for slot, item in equipped.items():
            item_id = item["item_id"]
            base_stats = get_item_stats(item_id)
            plus = int(all_plus.get(item_id, 0))
            # tier берём из item (get_equipment отдаёт полный каталог), т.к.
            # get_item_stats возвращает только статы без tier.
            stats = plus_stats_for(base_stats, plus, tier=item.get("tier")) if plus > 0 else base_stats
            if slot == "armor2" and armor2_mods and armor2_mods.get("applied"):
                stats = dict(stats)
                stats["str_bonus"] = int(stats.get("str_bonus", 0)) + int(armor2_mods.get("str_bonus", 0))
                stats["agi_bonus"] = int(stats.get("agi_bonus", 0)) + int(armor2_mods.get("agi_bonus", 0))
                stats["intu_bonus"] = int(stats.get("intu_bonus", 0)) + int(armor2_mods.get("int_bonus", 0))
                # end_bonus (выносливость) → hp_bonus ×2 (stamina per stat)
                stats["hp_bonus"] = int(stats.get("hp_bonus", 0)) + int(armor2_mods.get("end_bonus", 0)) * 2
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
        """Список item_id экипировки игрока БЕЗ брони (оружие/шлем/щит/ноги/кольцо).
        Броня (armor2_*) живёт в той же таблице, но отдаётся через get_owned_armor2."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Паттерн параметром (не литералом) — иначе '%' ломает psycopg на Postgres.
            cursor.execute(
                "SELECT item_id FROM player_owned_weapons WHERE user_id = ? AND item_id NOT LIKE ?",
                (user_id, "armor2%"),
            )
            return [r["item_id"] for r in cursor.fetchall()]
        finally:
            conn.close()

    def remove_owned_weapon(self, user_id: int, item_id: str) -> bool:
        """Удалить оружие/шлем/щит/ботинки/кольцо из арсенала (при разборке).
        Возвращает True если строка была удалена."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM player_owned_weapons WHERE user_id = ? AND item_id = ?",
                (user_id, item_id),
            )
            affected = cursor.rowcount
            conn.commit()
            return affected > 0
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
