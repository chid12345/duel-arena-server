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

class BattleStartMixin:
    async def start_battle(
        self,
        player1: Dict,
        player2: Dict,
        is_bot2: bool = False,
        is_test_battle: bool = False,
        mode: str = "normal",
        mode_meta: Optional[Dict] = None,
    ) -> str:
        """Начать новый бой. is_test_battle: без наград, БД и квестов — для проверки баланса."""
        p1_id = self._entity_id(player1)
        p2_id = self._entity_id(player2)
        battle_id = f"{p1_id}_{p2_id}_{datetime.now().timestamp()}"

        p2_store = dict(player2) if is_bot2 else player2
        if is_bot2:
            p2_store["crit"] = self._safe_crit_stat(p2_store, "crit", PLAYER_START_CRIT)
        
        battle_data = {
            'battle_id': battle_id,
            'player1': player1,
            'player2': p2_store,
            'is_bot1': False,
            'is_bot2': is_bot2,
            'is_test_battle': is_test_battle,
            'mode': mode or "normal",
            'mode_meta': dict(mode_meta or {}),
            'current_round': 0,
            'player1_afk_count': 0,
            'player2_afk_count': 0,
            'player1_consecutive_afk': 0,
            'player2_consecutive_afk': 0,
            'turn_serial': 0,
            'ui_message': None,
            'ui_message_p2': None,   # {chat_id, message_id} для P2 в PvP
            'rounds': [],
            'battle_log': [],
            'combat_log_lines': [],
            'webapp_log': [],
            'next_turn_deadline': datetime.now() + timedelta(seconds=TURN_ACTION_SECONDS),
            'player1_choices': {},
            'player2_choices': {},
            'pending_choices': {},  # {user_id: {'round': int, 'attack': str|None, 'defense': str|None}}
            'player1_debuffs': {},  # активные дебаффы на игрока 1 (обновляются каждый раунд)
            'player2_debuffs': {},  # активные дебаффы на игрока 2
            'battle_active': True,
            'started_at': datetime.now(),
            'ui_message_prefix': '',
            'turn_timer_task': None,
        }
        
        self.active_battles[battle_id] = battle_data
        self.battle_queue[player1['user_id']] = battle_id
        if not is_bot2:
            self.battle_queue[player2['user_id']] = battle_id
        
        return battle_id

    def set_battle_ui_message(self, user_id: int, chat_id: int, message_id: int) -> None:
        """Сообщение с клавиатурой боя — для таймера и обновления без callback."""
        bid = self.battle_queue.get(user_id)
        if not bid:
            return
        b = self.active_battles.get(bid)
        if not b:
            return
        b['ui_message'] = {'chat_id': chat_id, 'message_id': message_id}

    def set_battle_p2_ui_message(self, user_id: int, chat_id: int, message_id: int) -> None:
        """Сообщение P2 в PvP — для обновления без callback."""
        bid = self.battle_queue.get(user_id)
        if not bid:
            return
        b = self.active_battles.get(bid)
        if not b:
            return
        b['ui_message_p2'] = {'chat_id': chat_id, 'message_id': message_id}
