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
            p2_choices = self._get_bot_choice(player2, player1)
            battle['player2_choices'] = p2_choices
        
        # Проверяем AFK
        if not p1_choices:
            battle['player1_afk_count'] += 1
            p1_choices = {'attack': 'ТУЛОВИЩЕ', 'defense': 'ТУЛОВИЩЕ'}
            
            if battle['player1_afk_count'] >= AFK_ROUNDS_TO_DEFEAT:
                wid = player2.get('user_id') or player2.get('bot_id')
                return await self._end_battle_by_afk(battle_id, wid)
        
        if not p2_choices:
            battle['player2_afk_count'] += 1
            p2_choices = {'attack': 'ТУЛОВИЩЕ', 'defense': 'ТУЛОВИЩЕ'}
            
            if battle['player2_afk_count'] >= AFK_ROUNDS_TO_DEFEAT:
                return await self._end_battle_by_afk(battle_id, player1['user_id'])
        
        # Рассчитываем урон (детально — для текста размена + дебаффы на следующий раунд)
        p1_debuffs = battle.get('player1_debuffs', {}) or {}
        p2_debuffs = battle.get('player2_debuffs', {}) or {}
        p1_damage, o1, debuff_to_p2 = self._calculate_damage_detailed(
            player1,
            player2,
            p1_choices['attack'],
            p2_choices['defense'],
            defender_debuffs=p2_debuffs,
        )
        p2_damage, o2, debuff_to_p1 = self._calculate_damage_detailed(
            player2,
            player1,
            p2_choices['attack'],
            p1_choices['defense'],
            defender_debuffs=p1_debuffs,
        )
        # Дебаффы живут ровно 1 следующий раунд.
        battle['player1_debuffs'] = {}
        battle['player2_debuffs'] = {}
        if debuff_to_p1:
            battle['player1_debuffs'][debuff_to_p1] = True
        if debuff_to_p2:
            battle['player2_debuffs'][debuff_to_p2] = True
        
        # Применяем урон
        player1['current_hp'] = max(0, player1['current_hp'] - p2_damage)
        player2['current_hp'] = max(0, player2['current_hp'] - p1_damage)

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
        
        # Создаем запись раунда
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
        
        # Очищаем выборы для следующего раунда
        battle['player1_choices'] = {}
        battle['player2_choices'] = {}
        battle['pending_choices'] = {}
        
        # Проверяем окончание боя
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

        # Лимит раундов (тенк vs тенк, сверхдлинные бои)
        # Победитель — у кого больше HP. Если равно — победа p1 (игрок), честнее для PvB.
        if round_num >= MAX_BATTLE_ROUNDS:
            if player1['current_hp'] >= player2['current_hp']:
                limit_winner = player1['user_id']
            else:
                limit_winner = player2.get('user_id') or player2.get('bot_id')
            ex_limit = (
                f"⚔️ <b>Размен</b> · раунд {round_num}\n"
                f"<b>1)</b> Ваш удар в {p1_choices.get('attack', '?')} — "
                + self._hp_delta_text(p1_damage, o1, player2['current_hp'], player2['max_hp'])
                + f"\n<b>2)</b> {self.short_display_name(self._entity_name(player2))} "
                f"(ур. {int(player2.get('level', PLAYER_START_LEVEL))}) бьёт в "
                f"{p2_choices.get('attack', '?')} — "
                + self._hp_delta_text(p2_damage, o2, player1['current_hp'], player1['max_hp'])
                + f"\n\n⏳ <i>Раунд {MAX_BATTLE_ROUNDS} — бой остановлен по лимиту.</i>"
            )
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

