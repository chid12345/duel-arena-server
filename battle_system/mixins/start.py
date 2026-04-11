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

        # Применяем активные бафы из player_buffs к статам игроков
        self._apply_player_buffs_to_stats(player1)
        if not is_bot2:
            self._apply_player_buffs_to_stats(p2_store)

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
        # Сброс старого результата: защита от polling-фантомов (pop_battle_end_ui вернёт None)
        self.clear_battle_end_ui(player1['user_id'])
        if not is_bot2:
            self.battle_queue[player2['user_id']] = battle_id
            self.clear_battle_end_ui(player2['user_id'])
        
        return battle_id

    def _apply_player_buffs_to_stats(self, player: dict) -> None:
        """Применить активные бафы к статам игрока перед боем (мутирует dict)."""
        uid = player.get("user_id")
        if not uid:
            return
        try:
            combined = db.get_combined_buffs(int(uid))
        except Exception:
            return
        if not combined:
            return
        player["strength"]  = max(1, int(player.get("strength",  PLAYER_START_STRENGTH)) + combined.get("strength",  0))
        player["crit"]      = max(0, int(player.get("crit",      PLAYER_START_CRIT))     + combined.get("crit",      0))
        # endurance buff → ловкость/уворот (player["endurance"]) + армор из stamp_invested
        end_bonus = combined.get("endurance", 0)
        if end_bonus:
            player["endurance"] = max(1, int(player.get("endurance", PLAYER_START_ENDURANCE)) + end_bonus)
        # stamina buff → +HP и +броня (симулирует реальные вложения в стат)
        stam_bonus = combined.get("stamina", 0)
        if stam_bonus:
            hp_add = stam_bonus * STAMINA_PER_FREE_STAT
            old_max = max(1, int(player.get("max_hp", PLAYER_START_MAX_HP)))
            old_cur = int(player.get("current_hp", old_max))
            player["max_hp"]     = old_max + hp_add
            player["current_hp"] = min(player["max_hp"], old_cur + hp_add)
            # Прирост брони как от реальных вложений
            lv  = max(1, int(player.get("level", 1)))
            vyn = stamina_stats_invested(old_max, lv)
            armor_delta = armor_reduction(vyn + stam_bonus, lv) - armor_reduction(vyn, lv)
            combined = dict(combined)
            combined["armor_pct"] = combined.get("armor_pct", 0) + round(armor_delta * 100, 1)
        # hp_bonus → прямой бонус HP в бой
        hp_bonus = combined.get("hp_bonus", 0)
        if hp_bonus:
            old_max = max(1, int(player.get("max_hp", PLAYER_START_MAX_HP)))
            old_cur = int(player.get("current_hp", old_max))
            player["max_hp"]     = old_max + hp_bonus
            player["current_hp"] = min(player["max_hp"], old_cur + hp_bonus)
        # Боевые pct-модификаторы добавляем как поля в dict (damage.py их читает)
        player["_buff_armor_pct"]    = combined.get("armor_pct",    0)
        player["_buff_dodge_pct"]    = combined.get("dodge_pct",    0)
        player["_buff_double_pct"]   = combined.get("double_pct",   0)
        player["_buff_accuracy"]     = combined.get("accuracy",     0)
        player["_buff_lifesteal_pct"] = combined.get("lifesteal_pct", 0)

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
