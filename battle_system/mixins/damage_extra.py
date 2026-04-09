"""Обёртка урона, события раунда, AI бота."""

from __future__ import annotations

import random
from typing import Dict, List

from config import *


class BattleDamageExtraMixin:
    def _calculate_damage(self, attacker: Dict, defender: Dict, attack_zone: str, defense_zone: str) -> int:
        d, _, _ = self._calculate_damage_detailed(attacker, defender, attack_zone, defense_zone, False)
        return d

    def _generate_round_events(self, p1_choices: Dict, p2_choices: Dict, p1_damage: int, p2_damage: int) -> List[str]:
        events = []
        if p1_damage == 0:
            if p1_choices["attack"] == p2_choices["defense"]:
                events.append("🛡️ Игрок 1: Атака заблокирована!")
            else:
                if random.random() < MISS_CHANCE:
                    events.append("✕ Игрок 1: Промах!")
                else:
                    events.append("🌪️ Игрок 1: Уклонился противник!")
        else:
            if p1_damage >= self._get_expected_damage() * 2:
                events.append(f"💥 Игрок 1: КРИТИЧЕСКИЙ УДАР! ({p1_damage} урона)")
            else:
                events.append(f"⚔️ Игрок 1: Попадание! ({p1_damage} урона)")

        if p2_damage == 0:
            if p2_choices["attack"] == p1_choices["defense"]:
                events.append("🛡️ Игрок 2: Атака заблокирована!")
            else:
                if random.random() < MISS_CHANCE:
                    events.append("✕ Игрок 2: Промах!")
                else:
                    events.append("🌪️ Игрок 2: Уклонился противник!")
        else:
            if p2_damage >= self._get_expected_damage() * 2:
                events.append(f"💥 Игрок 2: КРИТИЧЕСКИЙ УДАР! ({p2_damage} урона)")
            else:
                events.append(f"⚔️ Игрок 2: Попадание! ({p2_damage} урона)")

        return events

    def _get_expected_damage(self) -> int:
        return 15

    def _get_bot_choice(self, bot: Dict, opponent: Dict) -> Dict:
        bot_type = bot.get("ai_pattern", "balanced")
        if bot_type == "aggressive":
            attack = random.choices(["ГОЛОВА", "ТУЛОВИЩЕ", "НОГИ"], weights=[0.5, 0.3, 0.2])[0]
            defense = random.choices(["ГОЛОВА", "ТУЛОВИЩЕ", "НОГИ"], weights=[0.2, 0.4, 0.4])[0]
        elif bot_type == "defensive":
            attack = random.choices(["ГОЛОВА", "ТУЛОВИЩЕ", "НОГИ"], weights=[0.3, 0.4, 0.3])[0]
            defense = random.choices(["ГОЛОВА", "ТУЛОВИЩЕ", "НОГИ"], weights=[0.5, 0.3, 0.2])[0]
        else:
            attack = random.choice(ATTACK_ZONES)
            defense = random.choice(ATTACK_ZONES)
        if random.random() < 0.1:
            attack = random.choice(ATTACK_ZONES)
        return {"attack": attack, "defense": defense}
