"""AUTO: фрагмент бывшего battle_system.py — не править руками без сверки с логикой боя."""
from __future__ import annotations

import asyncio
import logging
import random
import time
from html import escape as html_escape
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from config import *
from database import db

from battle_system.models import BattleRound, BattleResult

logger = logging.getLogger(__name__)

class BattleExecuteMixin:
    async def _execute_round(self, battle_id: str) -> Dict:
        """Выполнить раунд боя"""
        battle = self.active_battles[battle_id]
        battle['current_round'] += 1
        round_num = battle['current_round']

        player1 = battle['player1'].copy()
        player2 = battle['player2'].copy()

        # Получаем выборы
        p1_choices = battle['player1_choices']
        p2_choices = battle['player2_choices']

        # Если второй игрок - бот, делаем выбор за него
        if battle['is_bot2'] and not p2_choices:
            # AI-память: храним историю защит игрока в battle dict (живёт между раундами).
            # Бот-«стратег» читает паттерн и бьёт мимо предсказуемой защиты.
            player2["_opp_def_history"] = battle.setdefault("_bot_opp_def_history", [])
            if battle.get('rounds'):
                _last = getattr(battle['rounds'][-1], 'player1_defense', None)
                if _last:
                    player1["_last_defense_zone"] = _last
            p2_choices = self._get_bot_choice(player2, player1)
            battle['player2_choices'] = p2_choices

        # Дефолтный выбор если игрок не успел (AFK-счёт ведёт timer.py через player*_consecutive_afk)
        if not p1_choices:
            p1_choices = {'attack': 'ТУЛОВИЩЕ', 'defense': 'ТУЛОВИЩЕ'}
        if not p2_choices:
            p2_choices = {'attack': 'ТУЛОВИЩЕ', 'defense': 'ТУЛОВИЩЕ'}

        # Снимаем копии выборов: если раунд упадёт, choices будут очищены в finally
        p1_choices = dict(p1_choices)
        p2_choices = dict(p2_choices)
        
        try:
            # Рассчитываем урон (детально — для текста размена + дебаффы на следующий раунд)
            p1_debuffs = battle.get('player1_debuffs', {}) or {}
            p2_debuffs = battle.get('player2_debuffs', {}) or {}
            if p2_debuffs.get('legs'):
                player2['_debuff_legs'] = True
            if p1_debuffs.get('legs'):
                player1['_debuff_legs'] = True
            p1_damage, o1, debuff_to_p2 = self._calculate_damage_detailed(
                player1,
                player2,
                p1_choices['attack'],
                p2_choices['defense'],
            )
            p2_damage, o2, debuff_to_p1 = self._calculate_damage_detailed(
                player2,
                player1,
                p2_choices['attack'],
                p1_choices['defense'],
            )
            battle['player1_debuffs'] = {}
            battle['player2_debuffs'] = {}
            if debuff_to_p1:
                battle['player1_debuffs'][debuff_to_p1] = True
            if debuff_to_p2:
                battle['player2_debuffs'][debuff_to_p2] = True

            player1['current_hp'] = max(0, player1['current_hp'] - p2_damage)
            player2['current_hp'] = max(0, player2['current_hp'] - p1_damage)
            # Регенерация от сапог (regen_bonus HP за раунд, только живым)
            p1_regen = int(battle['player1'].get('_eq_regen_bonus', 0))
            if p1_regen > 0 and player1['current_hp'] > 0:
                player1['current_hp'] = min(player1['max_hp'], player1['current_hp'] + p1_regen)
            p2_regen = int(battle['player2'].get('_eq_regen_bonus', 0))
            if p2_regen > 0 and player2['current_hp'] > 0:
                player2['current_hp'] = min(player2['max_hp'], player2['current_hp'] + p2_regen)

            self._append_combat_log_round(
                battle,
                round_num,
                p1_choices,
                p2_choices,
                p1_damage,
                p2_damage,
                o1,
                o2,
                player1['current_hp'],
                player2['current_hp'],
                player1['max_hp'],
                player2['max_hp'],
            )
            battle['next_turn_deadline'] = datetime.now() + timedelta(seconds=TURN_ACTION_SECONDS)

            round_events = self._generate_round_events(p1_choices, p2_choices, p1_damage, p2_damage)

            battle_round = BattleRound(
                round_number=round_num,
                player1_attack=p1_choices['attack'],
                player1_defense=p1_choices['defense'],
                player2_attack=p2_choices['attack'],
                player2_defense=p2_choices['defense'],
                player1_damage=p1_damage,
                player2_damage=p2_damage,
                player1_hp_before=battle['player1']['current_hp'],
                player2_hp_before=battle['player2']['current_hp'],
                player1_hp_after=player1['current_hp'],
                player2_hp_after=player2['current_hp'],
                round_events=round_events
            )

            battle['rounds'].append(battle_round)
            battle['player1']['current_hp'] = player1['current_hp']
            battle['player2']['current_hp'] = player2['current_hp']

            if player1['current_hp'] <= 0 or player2['current_hp'] <= 0:
                if player2['current_hp'] <= 0:
                    winner_id = player1['user_id']
                else:
                    winner_id = player2.get('user_id') or player2.get('bot_id')
                ex = self._format_exchange_text(
                    p1_choices,
                    p2_choices,
                    p1_damage,
                    p2_damage,
                    o1,
                    o2,
                    round_num,
                    self.short_display_name(self._entity_name(player2)),
                    int(player2.get('level', PLAYER_START_LEVEL)),
                )
                return await self._end_battle(battle_id, winner_id, ex)

            if round_num >= MAX_BATTLE_ROUNDS:
                if player1['current_hp'] >= player2['current_hp']:
                    limit_winner = player1['user_id']
                else:
                    limit_winner = player2.get('user_id') or player2.get('bot_id')
                ex_limit = self._format_exchange_text(
                    p1_choices,
                    p2_choices,
                    p1_damage,
                    p2_damage,
                    o1,
                    o2,
                    round_num,
                    self.short_display_name(self._entity_name(player2)),
                    int(player2.get('level', PLAYER_START_LEVEL)),
                ) + f"\n\n⏳ <i>Раунд {MAX_BATTLE_ROUNDS} — бой остановлен по лимиту.</i>"
                return await self._end_battle(battle_id, limit_winner, ex_limit)

            return {
                'status': 'round_completed',
                'round': round_num,
                'player1_hp': player1['current_hp'],
                'player2_hp': player2['current_hp'],
                'player1_damage': p1_damage,
                'player2_damage': p2_damage,
                'events': round_events,
                'combat_log_html': '\n\n'.join(battle.get('combat_log_lines', [])),
                'exchange_text': self._format_exchange_text(
                    p1_choices,
                    p2_choices,
                    p1_damage,
                    p2_damage,
                    o1,
                    o2,
                    round_num,
                    self.short_display_name(self._entity_name(player2)),
                    int(player2.get('level', PLAYER_START_LEVEL)),
                ),
            }
        finally:
            # Гарантированная очистка: без неё при исключении choices остаются заполненными,
            # и бой зависает ("Ход уже отправлен — ждите противника").
            br = self.active_battles.get(battle_id)
            if br:
                br['player1_choices'] = {}
                br['player2_choices'] = {}
                br['pending_choices'] = {}

