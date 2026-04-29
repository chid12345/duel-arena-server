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
        """Выбор хода бота. Учитывает ai_pattern + историю последних защит игрока (память на 2 хода).

        «Стратег» (мажор/донатер): если игрок 2 раза подряд защищал зону X —
        в 60% случаев бьёт в одну из ДВУХ других зон (читает паттерн).
        """
        bot_type = bot.get("ai_pattern", "balanced")
        # История последних защит игрока живёт в bot dict (мутируется каждый ход)
        hist = bot.setdefault("_opp_def_history", [])
        opp_last_def = opponent.get("_last_defense_zone")
        if opp_last_def:
            hist.append(opp_last_def)
            if len(hist) > 3:
                hist.pop(0)

        zones = ["ГОЛОВА", "ТУЛОВИЩЕ", "НОГИ"]
        # Базовый выбор по архетипу
        if bot_type == "aggressive":
            attack = random.choices(zones, weights=[0.5, 0.3, 0.2])[0]
            defense = random.choices(zones, weights=[0.2, 0.4, 0.4])[0]
        elif bot_type == "defensive":
            attack = random.choices(zones, weights=[0.3, 0.4, 0.3])[0]
            defense = random.choices(zones, weights=[0.5, 0.3, 0.2])[0]
        elif bot_type == "strategist":
            # Стратег чаще атакует туда, где НЕ была защита игрока
            avoid = hist[-1] if hist else None
            opts = [z for z in zones if z != avoid] or zones
            attack = random.choice(opts)
            defense = random.choices(zones, weights=[0.4, 0.4, 0.2])[0]
        else:
            attack = random.choice(zones)
            defense = random.choice(zones)

        # Память: 2 одинаковых защиты подряд → читаем паттерн (60% бьём в другие)
        if len(hist) >= 2 and hist[-1] == hist[-2]:
            if random.random() < 0.60:
                others = [z for z in zones if z != hist[-1]]
                attack = random.choice(others)

        if random.random() < 0.10:
            attack = random.choice(zones)
        return {"attack": attack, "defense": defense}
