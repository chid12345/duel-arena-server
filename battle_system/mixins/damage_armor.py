"""Броня и применение входящего урона."""

from __future__ import annotations

from typing import Dict

from config import *


class BattleDamageArmorMixin:
    def _armor_multiplier(self, defender: Dict) -> float:
        """Броня от выносливости (абсолютная формула, см. docs/BATTLE.md)."""
        lv = int(defender.get("level", PLAYER_START_LEVEL))
        stamina = stamina_stats_invested(int(defender.get("max_hp", PLAYER_START_MAX_HP)), lv)
        base_reduction = stamina / (stamina + ARMOR_STAMINA_K_ABS) if stamina > 0 else 0.0
        level_cap = min(ARMOR_ABSOLUTE_MAX, ARMOR_CAP_BASE + ARMOR_CAP_PER_LEVEL * lv)
        reduction = min(level_cap, base_reduction)
        return 1.0 - reduction

    def _apply_incoming_damage(self, raw: int, defender: Dict) -> int:
        m = self._armor_multiplier(defender)
        return max(1, int(raw * m))
