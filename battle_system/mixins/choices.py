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

class BattleChoicesMixin:
    async def make_choice(self, user_id: int, attack: str, defense: str) -> Dict:
        """Сделать выбор атаки и защиты"""
        if user_id not in self.battle_queue:
            return {'error': 'Вы не в бою'}
        
        battle_id = self.battle_queue[user_id]
        battle = self.active_battles.get(battle_id)
        
        if not battle or not battle['battle_active']:
            return {'error': 'Бой не найден или завершен'}
        
        # Определяем номер игрока
        if battle['player1']['user_id'] == user_id:
            if battle['player1_choices']:
                return {'status': 'duplicate_choice', 'message': 'Выбор уже принят в этом раунде'}
            self.cancel_turn_timer(battle)
            battle['player1_consecutive_afk'] = 0
            battle['player1_choices'] = {'attack': attack, 'defense': defense}
            player_num = 1
        elif battle['player2'].get('user_id') == user_id:
            if battle['player2_choices']:
                return {'status': 'duplicate_choice', 'message': 'Выбор уже принят в этом раунде'}
            battle['player2_choices'] = {'attack': attack, 'defense': defense}
            player_num = 2
        else:
            return {'error': 'Игрок не найден в бою'}
        
        # Если оба игрока сделали выбор или бот - выполняем раунд
        if (battle['player1_choices'] and battle['player2_choices']) or \
           (battle['is_bot2'] and battle['player1_choices']):
            result = await self._execute_round(battle_id)
            br = self.active_battles.get(battle_id)
            if result.get('status') == 'round_completed' and br and br.get('battle_active'):
                self.schedule_turn_timer(battle_id)
            return result
        
        return {'status': 'choice_made', 'waiting_opponent': True}

    async def _consume_expired_turn_if_needed(self, user_id: int) -> Optional[Dict]:
        """Если срок хода истёк, а JobQueue/asyncio не сработали — пропуск при следующем действии."""
        battle_id = self.battle_queue.get(user_id)
        if not battle_id:
            return None
        battle = self.active_battles.get(battle_id)
        if not battle or not battle.get('battle_active') or not battle.get('is_bot2'):
            return None
        if battle['player1']['user_id'] != user_id:
            return None
        if battle.get('player1_choices'):
            return None
        dl = battle.get('next_turn_deadline')
        if not dl or datetime.now() <= dl:
            return None
        serial = battle.get('turn_serial')
        if serial is None:
            return None
        self.cancel_turn_timer(battle)
        return await self.process_turn_timeout(battle_id, serial)

    async def submit_zone_choice(self, user_id: int, choice_type: str, zone: str) -> Dict:
        """Принять частичный выбор (атака/защита), защититься от дублей и выполнить раунд."""
        # Кнопки в Telegram: attack_* / defend_* (не defense)
        if choice_type == 'defend':
            choice_type = 'defense'

        expired = await self._consume_expired_turn_if_needed(user_id)
        if expired:
            return {'status': 'choices_submitted', 'result': expired}

        if user_id not in self.battle_queue:
            return {'error': 'Вы не в бою'}

        battle_id = self.battle_queue[user_id]
        battle = self.active_battles.get(battle_id)
        if not battle or not battle['battle_active']:
            return {'error': 'Бой не найден или завершен'}

        if choice_type not in ("attack", "defense"):
            return {'error': 'Неверный тип выбора'}

        round_number = battle['current_round'] + 1
        pending = battle['pending_choices'].get(user_id)
        if not pending or pending.get('round') != round_number:
            pending = {'round': round_number, 'attack': None, 'defense': None}
            battle['pending_choices'][user_id] = pending

        if pending.get(choice_type) is not None:
            return {'status': 'duplicate_component', 'choice_type': choice_type}

        pending[choice_type] = self._normalize_zone(zone)

        if pending['attack'] and pending['defense']:
            result = await self.make_choice(user_id, pending['attack'], pending['defense'])
            return {'status': 'choices_submitted', 'result': result}

        return {
            'status': 'partial_choice_saved',
            'missing': 'defense' if not pending['defense'] else 'attack',
            'pending_attack': self._zone_to_ui_key(pending.get('attack')),
            'pending_defense': self._zone_to_ui_key(pending.get('defense')),
        }

    @staticmethod
    def _zone_to_ui_key(zone: Optional[str]) -> Optional[str]:
        if not zone:
            return None
        return {'ГОЛОВА': 'HEAD', 'ТУЛОВИЩЕ': 'TORSO', 'НОГИ': 'LEGS'}.get(zone)

    async def submit_auto_round(self, user_id: int) -> Dict:
        """Случайные атака и защита; добирает только недостающее из частичного выбора."""
        if user_id not in self.battle_queue:
            return {'error': 'Вы не в бою'}

        battle_id = self.battle_queue[user_id]
        battle = self.active_battles.get(battle_id)
        if not battle or not battle['battle_active']:
            return {'error': 'Бой не найден или завершен'}

        expired = await self._consume_expired_turn_if_needed(user_id)
        if expired:
            return expired

        is_p1 = battle['player1']['user_id'] == user_id
        is_p2 = battle['player2'].get('user_id') == user_id
        if not is_p1 and not is_p2:
            return {'error': 'Игрок не найден в бою'}

        if is_p1 and battle['player1_choices']:
            return {'error': 'Ход уже отправлен — ждите противника'}
        if is_p2 and battle['player2_choices']:
            return {'error': 'Ход уже отправлен — ждите противника'}

        round_number = battle['current_round'] + 1
        pending = battle['pending_choices'].get(user_id)
        if not pending or pending.get('round') != round_number:
            pending = {'round': round_number, 'attack': None, 'defense': None}
            battle['pending_choices'][user_id] = pending

        zones = ('ГОЛОВА', 'ТУЛОВИЩЕ', 'НОГИ')
        if pending.get('attack') is None:
            pending['attack'] = random.choice(zones)
        if pending.get('defense') is None:
            pending['defense'] = random.choice(zones)

        return await self.make_choice(user_id, pending['attack'], pending['defense'])
