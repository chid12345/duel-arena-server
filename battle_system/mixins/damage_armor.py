"""Броня и применение входящего урона."""

from __future__ import annotations

from typing import Dict

from config import *


class BattleDamageArmorMixin:
    def _armor_multiplier(self, defender: Dict) -> float:
        """Броня от выносливости — та же сравнительная формула, что у уворота и крита."""
        lv = int(defender.get("level", PLAYER_START_LEVEL))
        vyn = stamina_stats_invested(int(defender.get("max_hp", PLAYER_START_MAX_HP)), lv)
        reduction = armor_reduction(vyn, lv)
        return 1.0 - reduction

    def _apply_incoming_damage(self, raw: int, defender: Dict) -> int:
        m = self._armor_multiplier(defender)
        # USDT пассивка: броня +4%
        if (defender.get("usdt_passive_type") or "").strip() == "armor_pct":
            m = max(0.0, m - 0.04)
        # Баф брони из свитка (может быть отрицательным у берсерка)
        buff_armor = defender.get("_buff_armor_pct", 0)
        if buff_armor:
            m = max(0.0, m - buff_armor / 100.0)
        # Модификаторы брони по типу воина
        wt = (defender.get("warrior_type") or "default")
        if wt == "agile":
            m = min(1.0, m + 0.10)   # Теневой Вихрь -10% броня (трейдофф за уклон)
        # Спецэффект Gold: паладин -3% входящего урона
        if (defender.get("current_class") or "").strip() == "paladin_gold":
            m = max(0.0, m - 0.03)
        # Бонус брони от экипировки
        eq_def = float(defender.get("_eq_def_pct", 0) or 0)
        if eq_def:
            m = max(0.0, m - eq_def)
        return max(1, int(raw * m))
