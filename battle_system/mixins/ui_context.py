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

class BattleUiContextMixin:
    def get_battle_status(self, user_id: int) -> Optional[Dict]:
        """Получить статус текущего боя"""
        if user_id not in self.battle_queue:
            return None
        
        battle_id = self.battle_queue[user_id]
        battle = self.active_battles.get(battle_id)
        
        if not battle:
            return None
        
        return {
            'battle_id': battle_id,
            'current_round': battle['current_round'],
            'player1': battle['player1'],
            'player2': battle['player2'],
            'is_bot2': battle['is_bot2'],
            'rounds': battle['rounds']
        }

    def get_battle_ui_context(self, user_id: int) -> Optional[Dict]:
        """Данные для экрана боя: ник противника, HP, частичный выбор, ожидание PvP."""
        if user_id not in self.battle_queue:
            return None
        battle_id = self.battle_queue[user_id]
        battle = self.active_battles.get(battle_id)
        if not battle or not battle['battle_active']:
            return None
        p1, p2 = battle['player1'], battle['player2']
        is_p1 = p1.get('user_id') == user_id
        is_p2 = p2.get('user_id') == user_id
        if not is_p1 and not is_p2:
            return None
        you, opp = (p1, p2) if is_p1 else (p2, p1)
        rnd = battle['current_round'] + 1
        pd = battle['pending_choices'].get(user_id)
        if pd and pd.get('round') != rnd:
            pd = None
        my_done = bool(battle['player1_choices'] if is_p1 else battle['player2_choices'])
        their_done = bool(battle['player2_choices'] if is_p1 else battle['player1_choices'])
        waiting = my_done and not their_done and not battle['is_bot2']
        turn_line = ""
        deadline = battle.get('next_turn_deadline')
        if deadline:
            left = max(0, int((deadline - datetime.now()).total_seconds()))
            turn_line = f"⏱️ ~{left} сек до пропуска хода"
        you_stamina_iv = 0
        if you.get('user_id') is not None:
            you_stamina_iv = stamina_stats_invested(
                int(you.get('max_hp', PLAYER_START_MAX_HP)),
                int(you.get('level', PLAYER_START_LEVEL)),
            )
        opp_stamina_iv = stamina_stats_invested(
            int(opp.get('max_hp', PLAYER_START_MAX_HP)),
            int(opp.get('level', PLAYER_START_LEVEL)),
        )
        return {
            'opponent_name': self.short_display_name(self._entity_name(opp)),
            'opponent_level': int(opp.get('level', PLAYER_START_LEVEL)),
            'opp_strength': self._safe_int_field(opp, 'strength', BASE_STRENGTH),
            'opp_endurance': self._safe_int_field(opp, 'endurance', BASE_ENDURANCE),
            'opp_crit': self._safe_crit_stat(opp, PLAYER_START_CRIT),
            'opp_stamina_invested': opp_stamina_iv,
            'opp_max_hp': int(opp.get('max_hp', PLAYER_START_MAX_HP)),
            'opp_rating': int(opp.get('rating', 1000)),
            'you_name': self._entity_name(you),
            'round_num': rnd,
            'your_stamina_invested': you_stamina_iv,
            'your_hp': you['current_hp'],
            'your_max': you['max_hp'],
            'opp_hp': opp['current_hp'],
            'opp_max': opp['max_hp'],
            'pending_attack': self._zone_to_ui_key(pd.get('attack')) if pd else None,
            'pending_defense': self._zone_to_ui_key(pd.get('defense')) if pd else None,
            'waiting_opponent': waiting,
            'turn_timer_line': turn_line,
        }
