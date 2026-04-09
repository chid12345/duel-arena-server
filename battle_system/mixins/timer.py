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

class BattleTimerMixin:
    def cancel_turn_timer(self, battle: Dict) -> None:
        t = battle.get('turn_timer_task')
        if t:
            try:
                t.cancel()
            except Exception:
                pass
            battle['turn_timer_task'] = None

    async def _turn_timer_fire(self, battle_id: str, serial: int) -> None:
        """По истечении TURN_ACTION_SECONDS — пропуск хода и обновление сообщения боя."""
        from bot_handlers import CallbackHandlers

        try:
            await asyncio.sleep(TURN_ACTION_SECONDS)
        except asyncio.CancelledError:
            raise

        battle_before = self.active_battles.get(battle_id)
        if not battle_before or not battle_before.get('battle_active'):
            return
        um = battle_before.get('ui_message')
        um_p2 = battle_before.get('ui_message_p2')
        uid = battle_before['player1']['user_id']
        is_pvp = not battle_before.get('is_bot2')

        res = await self.process_turn_timeout(battle_id, serial)
        if not res:
            return
        if not self._bot:
            return

        # Конец боя удаляет active_battles — нельзя брать ui_message после process_turn_timeout
        if res.get('status') in ('battle_ended', 'battle_ended_afk'):
            if not um:
                logger.warning("turn_timer: battle ended but ui_message missing battle_id=%s", battle_id)
                return
            await CallbackHandlers.dispatch_round_result_from_job(
                self._bot, um['chat_id'], um['message_id'], uid, res,
            )
            # PvP: уведомить P2
            if is_pvp and um_p2:
                await CallbackHandlers._pvp_push_other(self._bot, uid, res)
            return

        battle_after = self.active_battles.get(battle_id)
        if not battle_after or not battle_after.get('battle_active'):
            return
        um2 = battle_after.get('ui_message')
        if not um2:
            return
        await CallbackHandlers.dispatch_round_result_from_job(
            self._bot, um2['chat_id'], um2['message_id'], uid, res,
        )
        # PvP: уведомить P2
        if is_pvp:
            await CallbackHandlers._pvp_push_other(self._bot, uid, res)

    def schedule_turn_timer(self, battle_id: str) -> None:
        """Таймер на ход (человек vs бот или PvP). Asyncio — работает без JobQueue/APScheduler."""
        battle = self.active_battles.get(battle_id)
        if not battle or not battle.get('battle_active'):
            return
        if not self._bot:
            logger.warning("Battle turn timer skipped: battle_system.attach() not called")
            return
        self.cancel_turn_timer(battle)
        um = battle.get('ui_message')
        if not um:
            return
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            logger.warning("Battle turn timer: no running event loop")
            return
        battle['turn_serial'] = battle.get('turn_serial', 0) + 1
        serial = battle['turn_serial']
        battle['next_turn_deadline'] = datetime.now() + timedelta(seconds=TURN_ACTION_SECONDS)
        battle['turn_timer_task'] = loop.create_task(self._turn_timer_fire(battle_id, serial))

    async def process_turn_timeout(self, battle_id: str, serial: int) -> Optional[Dict]:
        """Пропуск хода: без ответа за TURN_ACTION_SECONDS."""
        battle = self.active_battles.get(battle_id)
        if not battle or not battle.get('battle_active'):
            return None
        if battle.get('turn_serial') != serial:
            return None

        if battle.get('is_bot2'):
            # Бот: только P1 может пропустить
            if battle.get('player1_choices'):
                return None
            battle['player1_consecutive_afk'] = battle.get('player1_consecutive_afk', 0) + 1
            bot_wid = battle['player2'].get('user_id') or battle['player2'].get('bot_id')
            if battle['player1_consecutive_afk'] >= AFK_ROUNDS_TO_DEFEAT:
                self.cancel_turn_timer(battle)
                return await self._end_battle_by_afk(battle_id, bot_wid)
            return await self._execute_round_afk_human(battle_id)
        else:
            # PvP: проверяем обоих
            p1_ok = bool(battle.get('player1_choices'))
            p2_ok = bool(battle.get('player2_choices'))
            if p1_ok and p2_ok:
                return None  # оба успели — раунд должен был уже выполниться
            if not p1_ok:
                battle['player1_consecutive_afk'] = battle.get('player1_consecutive_afk', 0) + 1
            else:
                battle['player1_consecutive_afk'] = 0
            if not p2_ok:
                battle['player2_consecutive_afk'] = battle.get('player2_consecutive_afk', 0) + 1
            else:
                battle['player2_consecutive_afk'] = 0
            p2 = battle['player2']
            if battle.get('player1_consecutive_afk', 0) >= AFK_ROUNDS_TO_DEFEAT:
                self.cancel_turn_timer(battle)
                return await self._end_battle_by_afk(battle_id, p2['user_id'])
            if battle.get('player2_consecutive_afk', 0) >= AFK_ROUNDS_TO_DEFEAT:
                self.cancel_turn_timer(battle)
                return await self._end_battle_by_afk(battle_id, battle['player1']['user_id'])
            return await self._execute_round(battle_id)
