"""Детальный расчёт урона (крит, блок, мимо, уклон)."""

from __future__ import annotations

import random
from typing import Dict, Tuple

from config import *


class BattleDamageMixin:
    def _safe_int_field(self, player: Dict, key: str, default: int = 0) -> int:
        try:
            v = player.get(key, default)
            return int(v) if v is not None else default
        except (TypeError, ValueError):
            return default

    def _safe_crit_stat(self, player: Dict, key: str, default: int = 0) -> int:
        v = self._safe_int_field(player, key, default)
        return max(0, min(100, v))

    def _calculate_damage_detailed(
        self, attacker: Dict, defender: Dict, attack_zone: str, defense_zone: str, is_afk: bool = False
    ) -> Tuple[int, str, str]:
        """Возвращает (урон, outcome, reason) для лога боя."""
        if attack_zone == defense_zone:
            return 0, "blocked", "block"

        if random.random() < MISS_CHANCE:
            return 0, "missed", "miss"

        if random.random() < DODGE_CHANCE:
            return 0, "dodged", "dodge"

        base_damage = random.randint(MIN_DAMAGE, MAX_DAMAGE)
        strength = self._safe_int_field(attacker, "strength", PLAYER_START_STRENGTH)
        strength_bonus = int(strength * STRENGTH_DAMAGE_MULTIPLIER)
        damage = base_damage + strength_bonus

        crit_chance = self._safe_crit_stat(attacker, "crit_chance", 0)
        crit_damage = self._safe_crit_stat(attacker, "crit_damage", 0)

        # USDT пассивка: крит урон +8%
        usdt_passive = (attacker.get("usdt_passive_type") or "").strip()
        if usdt_passive == "crit_dmg_pct":
            crit_damage = min(100, crit_damage + 8)

        is_crit = random.random() < (crit_chance / 100.0)
        if is_crit:
            damage = int(damage * (1.0 + crit_damage / 100.0))

        # USDT пассивка: урон +8%
        if usdt_passive == "damage_pct":
            damage = int(damage * 1.08)
        # USDT пассивка: 8% шанс двойного удара
        elif usdt_passive == "double_hit" and random.random() < 0.08:
            damage = damage * 2

        damage = self._apply_incoming_damage(damage, defender)

        if is_afk:
            damage = max(1, int(damage * AFK_DAMAGE_MULTIPLIER))

        return damage, "hit", "crit" if is_crit else "normal"
