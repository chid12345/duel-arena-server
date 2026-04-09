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

class BattleExecuteAfkMixin:
    async def _execute_round_afk_human(self, battle_id: str) -> Dict:
        """Игрок не успел за TURN_ACTION_SECONDS: 0 урона по боту, бот бьёт без блока."""
        battle = self.active_battles[battle_id]
        battle['current_round'] += 1
        round_num = battle['current_round']
        player1 = battle['player1'].copy()
        player2 = battle['player2'].copy()
        p2_choices = self._get_bot_choice(player2, player1)
        battle['player2_choices'] = p2_choices
        p1_choices = {'attack': 'ТУЛОВИЩЕ', 'defense': 'ТУЛОВИЩЕ'}
        p1_damage = 0
        o1 = 'timeout'
        p2_damage, o2, _ = self._calculate_damage_detailed(
            player2,
            player1,
            p2_choices['attack'],
            p1_choices['defense'],
            defense_skips_block=True,
        )
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
            round_events=round_events,
        )
        battle['rounds'].append(battle_round)
        battle['player1']['current_hp'] = player1['current_hp']
        battle['player2']['current_hp'] = player2['current_hp']
        battle['player1_choices'] = {}
        battle['player2_choices'] = {}
        battle['pending_choices'] = {}

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

        res = {
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
        self.schedule_turn_timer(battle_id)
        return res
