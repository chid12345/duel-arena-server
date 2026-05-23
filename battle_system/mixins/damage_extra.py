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
        """Выбор хода бота.

        Простые боты (novice/farmer → aggressive/defensive/balanced) — почти
        случайны: низкие уровни остаются лёгкими. «Стратег» (мажор/донатер,
        высокие уровни) — умный: читает паттерны игрока и реагирует на HP
        (см. _strategist_choice). ~20% случайности — стратега можно переиграть.
        """
        bot_type = bot.get("ai_pattern", "balanced")
        zones = ["ГОЛОВА", "ТУЛОВИЩЕ", "НОГИ"]

        # Базовый выбор по архетипу (фон + поведение простых ботов)
        if bot_type == "aggressive":
            attack = random.choices(zones, weights=[0.5, 0.3, 0.2])[0]
            defense = random.choices(zones, weights=[0.2, 0.4, 0.4])[0]
        elif bot_type == "defensive":
            attack = random.choices(zones, weights=[0.3, 0.4, 0.3])[0]
            defense = random.choices(zones, weights=[0.5, 0.3, 0.2])[0]
        else:
            attack = random.choice(zones)
            defense = random.choice(zones)

        if bot_type == "strategist":
            attack, defense = self._strategist_choice(bot, opponent, zones, attack, defense)
        elif random.random() < 0.10:
            # Лёгкий шум для простых ботов (как было)
            attack = random.choice(zones)

        return {"attack": attack, "defense": defense}

    def _strategist_choice(self, bot: Dict, opponent: Dict, zones: List[str],
                           attack: str, defense: str):
        """Умный ход стратега: чтение паттернов игрока + реакция на HP.

        ~80% решений «умные», ~20% — фоновая случайность (база attack/defense).
        АТАКА: бьём туда, где игрок защищается РЕЖЕ всего; если у игрока мало HP —
        добиваем в самую открытую зону. ЗАЩИТА: блок самого ЧАСТОГО удара игрока;
        при своём низком HP блокируем почти всегда (выживание).
        """
        SMART_P = 0.80

        def _hp_pct(d):
            mh = max(1, int(d.get("max_hp", 1) or 1))
            return max(0.0, min(1.0, int(d.get("current_hp", mh) or mh) / mh))

        bot_hp = _hp_pct(bot)
        opp_hp = _hp_pct(opponent)

        atk_hist = [z for z in (opponent.get("_atk_history") or []) if z in zones]
        def_hist = [z for z in (opponent.get("_def_history") or []) if z in zones]
        af = {z: atk_hist.count(z) for z in zones}
        df = {z: def_hist.count(z) for z in zones}
        most_atk = max(zones, key=lambda z: af[z]) if atk_hist else None

        # АТАКА — по тому, как игрок ЗАЩИЩАЕТСЯ (бьём в самую открытую зону)
        if def_hist and random.random() < SMART_P:
            ranked = sorted(zones, key=lambda z: df[z])  # [реже всего защищает, ..., чаще всего]
            if opp_hp <= 0.30 and bot_hp >= opp_hp:
                attack = ranked[0]                       # добивание — точно в слабую защиту
            else:
                attack = ranked[0] if random.random() < 0.70 else ranked[1]

        # ЗАЩИТА — блок самого частого удара игрока; при низком HP — почти всегда
        block_p = 0.90 if bot_hp <= 0.30 else SMART_P
        if most_atk and random.random() < block_p:
            defense = most_atk

        return attack, defense
