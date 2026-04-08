"""
Система боев для Duel Arena
Логика боев, расчет урона, обработка раундов
"""

import random
import asyncio
import logging
import time
from html import escape as html_escape
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta

from config import *
from database import db

logger = logging.getLogger(__name__)

@dataclass
class BattleRound:
    """Данные раунда боя"""
    round_number: int
    player1_attack: str
    player1_defense: str
    player2_attack: str
    player2_defense: str
    player1_damage: int
    player2_damage: int
    player1_hp_before: int
    player2_hp_before: int
    player1_hp_after: int
    player2_hp_after: int
    round_events: List[str]

@dataclass
class BattleResult:
    """Результат боя"""
    winner_id: int
    loser_id: int
    rounds_played: int
    battle_log: List[str]
    rounds: List[BattleRound]
    gold_reward: int
    exp_reward: int
    rating_change: int

class BattleSystem:
    """Класс для управления боями"""
    
    def __init__(self):
        self.active_battles = {}  # {battle_id: battle_data}
        self.battle_queue = {}    # {user_id: battle_data}
        self._bot = None  # telegram.Bot из attach() — для таймера и обновления UI
        self._profile_reset_locks: Dict[int, float] = {}  # user_id -> monotonic expire
        # Кратковременный снимок итога боя (игрок vs бот), если Telegram не успел обновить сообщение
        self._last_battle_end_ui: Dict[int, Tuple[float, Dict[str, Any]]] = {}

    def remember_battle_end_ui(self, user_id: int, round_result: Dict[str, Any]) -> None:
        """Сохранить итог для «Обновить» / /start, если Telegram не показал итог в старом сообщении (~15 мин)."""
        if user_id is None:
            return
        # Дольше, чтобы успеть нажать «Обновить» после сбоя доставки в Telegram
        self._last_battle_end_ui[user_id] = (time.monotonic() + 900.0, dict(round_result))

    def peek_battle_end_ui(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Посмотреть сохранённый итог без удаления (для «Обновить» до успешной доставки)."""
        t = self._last_battle_end_ui.get(user_id)
        if not t:
            return None
        exp, data = t
        if time.monotonic() > exp:
            self._last_battle_end_ui.pop(user_id, None)
            return None
        return dict(data)

    def pop_battle_end_ui(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Забрать сохранённый итог боя (одноразово)."""
        t = self._last_battle_end_ui.pop(user_id, None)
        if not t:
            return None
        exp, data = t
        if time.monotonic() > exp:
            return None
        return data

    def clear_battle_end_ui(self, user_id: int) -> None:
        """Убрать снимок после успешного обновления сообщения в Telegram."""
        self._last_battle_end_ui.pop(user_id, None)

    def mark_profile_reset(self, user_id: int, ttl_seconds: int = 120) -> None:
        """Временная блокировка учёта старых боёв после сброса профиля."""
        if user_id is None:
            return
        self._profile_reset_locks[int(user_id)] = time.monotonic() + max(1, int(ttl_seconds))

    def _is_profile_reset_locked(self, user_id: Optional[int]) -> bool:
        if user_id is None:
            return False
        uid = int(user_id)
        exp = self._profile_reset_locks.get(uid)
        if not exp:
            return False
        if time.monotonic() > exp:
            self._profile_reset_locks.pop(uid, None)
            return False
        return True

    @staticmethod
    def _is_stale_after_profile_reset(player_live: Dict[str, Any], battle_started_at: datetime) -> bool:
        """Если профиль был сброшен после старта боя — его результат применять нельзя."""
        try:
            reset_ts = int(player_live.get("profile_reset_ts") or 0)
        except Exception:
            reset_ts = 0
        if reset_ts <= 0:
            return False
        return float(reset_ts) > float(battle_started_at.timestamp())

    def force_abandon_battle(self, user_id: int) -> bool:
        """
        Убрать активный бой из памяти без записи в БД (зависший UI / сброс).
        Возвращает True, если что-то было очищено.
        """
        battle_id = self.battle_queue.get(user_id)
        if not battle_id:
            self.clear_battle_end_ui(user_id)
            return False
        cleaned = False
        battle = self.active_battles.get(battle_id)
        if battle:
            self.cancel_turn_timer(battle)
            p1 = battle['player1']['user_id']
            p2 = battle['player2'].get('user_id')
            for uid in (p1, p2):
                if uid is not None and uid in self.battle_queue:
                    del self.battle_queue[uid]
            self.active_battles.pop(battle_id, None)
            cleaned = True
        else:
            stale_uids = [u for u, bid in list(self.battle_queue.items()) if bid == battle_id]
            for u in stale_uids:
                del self.battle_queue[u]
            cleaned = bool(stale_uids)
        self.clear_battle_end_ui(user_id)
        if cleaned:
            db.log_metric_event('battle_abandon_forced', user_id)
        return cleaned

    def attach(self, application) -> None:
        """Вызвать из post_init: бот для таймера хода (asyncio, без JobQueue/APScheduler)."""
        self._bot = application.bot

    @staticmethod
    def _normalize_zone(zone: str) -> str:
        """Привести код зоны из callback к игровому формату."""
        zone_map = {
            "HEAD": "ГОЛОВА",
            "TORSO": "ТУЛОВИЩЕ",
            "LEGS": "НОГИ",
            "ГОЛОВА": "ГОЛОВА",
            "ТУЛОВИЩЕ": "ТУЛОВИЩЕ",
            "НОГИ": "НОГИ",
        }
        return zone_map.get(zone, zone)

    @staticmethod
    def _entity_id(entity: Dict) -> str:
        """Безопасный идентификатор участника боя (игрок или бот)."""
        if entity.get("user_id") is not None:
            return str(entity["user_id"])
        if entity.get("bot_id") is not None:
            return f"bot_{entity['bot_id']}"
        return f"entity_{entity.get('name', 'unknown')}"

    @staticmethod
    def _battle_damage_totals(battle: Dict) -> Tuple[int, int]:
        """Суммарный урон p1→p2 и p2→p1 по завершённым раундам (для итога экрана)."""
        s1 = 0
        s2 = 0
        for r in battle.get('rounds') or []:
            s1 += int(getattr(r, 'player1_damage', 0) or 0)
            s2 += int(getattr(r, 'player2_damage', 0) or 0)
        return s1, s2

    @staticmethod
    def _entity_name(entity: Dict) -> str:
        return entity.get("username") or entity.get("name") or "Unknown"

    @staticmethod
    def short_display_name(name: Optional[str], max_len: Optional[int] = None) -> str:
        """Короткий ник для боя (без длинного мусора в Telegram)."""
        m = max_len if max_len is not None else DISPLAY_NAME_MAX_LEN
        s = (name or "").strip() or "Враг"
        if len(s) <= m:
            return s
        return s[: m - 1] + "…"

    @staticmethod
    def apply_onboarding_bot(bot: Dict) -> Dict:
        """Пока у игрока меньше ONBOARDING_BATTLES_EASY завершённых боёв — бот слабее (урон и пул HP)."""
        b = dict(bot)
        m = ONBOARDING_BOT_STAT_MULT
        b["max_hp"] = max(30, int(b.get("max_hp", 100) * m))
        b["current_hp"] = b["max_hp"]
        b["strength"] = max(5, int(b.get("strength", 10) * m))
        b["endurance"] = max(5, int(b.get("endurance", 10) * m))
        c0 = b.get("crit") or PLAYER_START_CRIT
        b["crit"] = max(1, int(int(c0) * m))
        return b

    @staticmethod
    def _safe_int_field(entity: Dict, key: str, default: int) -> int:
        """Поле из сущности боя: NULL в БД даёт None в dict — не путать с «нет ключа»."""
        v = entity.get(key)
        if v is None:
            return int(default)
        return int(v)

    @staticmethod
    def _safe_crit_stat(entity: Dict, default: int = PLAYER_START_CRIT) -> int:
        """Крит бота/игрока для UI и расчёта шанса."""
        return max(0, BattleSystem._safe_int_field(entity, "crit", default))
    
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
            p2_store["crit"] = self._safe_crit_stat(p2_store, PLAYER_START_CRIT)
        
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
        p2_damage, o2 = self._calculate_damage_detailed(
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
    
    @staticmethod
    def _zone_label(zone: str) -> str:
        return {'ГОЛОВА': 'голова', 'ТУЛОВИЩЕ': 'тело', 'НОГИ': 'ноги'}.get(zone, zone)

    @staticmethod
    def _zone_block_phrase(zone: str) -> str:
        """«блок по ногам» и т.п."""
        return {'ГОЛОВА': 'голове', 'ТУЛОВИЩЕ': 'телу', 'НОГИ': 'ногам'}.get(zone, zone)

    @staticmethod
    def _zone_accusative(zone: str) -> str:
        """«в голову», «в тело», «в ноги»."""
        return {'ГОЛОВА': 'голову', 'ТУЛОВИЩЕ': 'тело', 'НОГИ': 'ноги'}.get(zone, zone)

    @staticmethod
    def _zone_po_prepositional(zone: str) -> str:
        """«по голове», «по телу», «по ногам» — для короткого лога."""
        return {'ГОЛОВА': 'по голове', 'ТУЛОВИЩЕ': 'по телу', 'НОГИ': 'по ногам'}.get(zone, zone)

    @staticmethod
    def _combat_log_numbers_html(
        damage: int,
        outcome: str,
        hp_cur: int,
        hp_max: int,
    ) -> str:
        """
        Фрагмент для <code> в логе боя. Исход outcome — из _calculate_damage_detailed.

        При 0 урона не пишем «−0»:
          блок → «🛡️ блок · cur/max», мимо → «✕ мимо · …», уклон → «🌪️ уклон · …».
        При уроне > 0: «−N cur/max» (пул выносливости), крит — суффикс « ⚡».
        """
        tokens = set((outcome or "").split("_"))
        if damage > 0:
            crit = " ⚡" if "crit" in tokens else ""
            dbl = " ⚔️x2" if "double" in tokens else ""
            guard = " 🧱" if "guard" in tokens else ""
            fortress = " 🛡️∞" if "fortress" in tokens else ""
            brk = " 🪓" if "break" in tokens else ""
            return f"−{damage} {hp_cur}/{hp_max}{crit}{dbl}{guard}{fortress}{brk}"
        if "block" in tokens:
            return f"🛡️ блок · {hp_cur}/{hp_max}"
        if "miss" in tokens:
            return f"✕ мимо · {hp_cur}/{hp_max}"
        if "dodge" in tokens:
            return f"🌪️ уклон · {hp_cur}/{hp_max}"
        return f"— {hp_cur}/{hp_max}"

    def _append_combat_log_round(
        self,
        battle: Dict,
        round_num: int,
        p1_choices: Dict,
        p2_choices: Dict,
        p1_damage: int,
        p2_damage: int,
        out1: str,
        out2: str,
        hp1_after: int,
        hp2_after: int,
        hp1_max: int,
        hp2_max: int,
    ) -> None:
        """Короткий лог; урон и HP в <code> — в Telegram читается жирнее (фон у цифр)."""
        def _effect_icons(outcome: str) -> List[str]:
            t = set((outcome or "").split("_"))
            icons: List[str] = []
            # Порядок важен: сперва offensive проки, потом defensive.
            if "break" in t:
                icons.append("🪓")
            if "pierce" in t:
                icons.append("💥")
            if "crit" in t:
                icons.append("⚡")
            if "double" in t:
                icons.append("⚔️x2")
            if "guard" in t:
                icons.append("🧱")
            if "fortress" in t:
                icons.append("🛡️∞")
            return icons

        battle.setdefault('combat_log_lines', [])
        battle.setdefault('webapp_log', [])
        if out1 == 'timeout':
            z1 = "⏱️ пропуск хода"
        else:
            z1 = html_escape(self._zone_po_prepositional(p1_choices['attack']))
        z2 = html_escape(self._zone_po_prepositional(p2_choices['attack']))
        en = html_escape(self.short_display_name(self._entity_name(battle['player2'])))
        frag1 = self._combat_log_numbers_html(p1_damage, out1, hp2_after, hp2_max)
        frag2 = self._combat_log_numbers_html(p2_damage, out2, hp1_after, hp1_max)
        line = (
            f"<b>Раунд {round_num}</b>\n"
            f"<b>Ваш удар</b> {z1} <code>{frag1}</code>\n"
            f"<b>{en}</b> {z2} <code>{frag2}</code>"
        )
        icons = _effect_icons(out1) + _effect_icons(out2)
        # Убираем дубли, сохраняя порядок появления.
        uniq_icons = list(dict.fromkeys(icons))
        if uniq_icons:
            line += f"\n<i>Эффекты раунда:</i> {' '.join(uniq_icons)}"
        battle['combat_log_lines'].append(line)

        # ── WebApp-лог: одна строка ≤33 символа ─────────────────────
        battle['webapp_log'].append(
            self._webapp_log_line(round_num, out1, out2, p1_damage, p2_damage)
        )

    @staticmethod
    def _webapp_log_line(
        round_num: int,
        out1: str,
        out2: str,
        dmg1: int,
        dmg2: int,
    ) -> str:
        """
        Одна строка для WebApp DOM-лога, ≤33 символа.

        Формат: «Р{N} Вы {маркер1} · Враг {маркер2}»
        Маркеры:
          −{N}    — нанесли урон
          −{N}⚡  — крит
          −{N}💥  — пробой
          💨      — уворот (их)
          🛡       — блок (их)
          ✕       — мимо
          ⏱       — тайм-аут
        """
        def _marker(outcome: str, dmg: int) -> str:
            t = set((outcome or "").split("_"))
            if outcome == "timeout":
                return "⏱"
            if "dodge" in t:
                return "💨"
            if "block" in t:
                return "🛡"
            if "miss" in t:
                return "✕"
            if dmg <= 0:
                return "—"
            suffix = ""
            if "crit" in t and "pierce" in t:
                suffix = "⚡💥"
            elif "crit" in t:
                suffix = "⚡"
            elif "double" in t:
                suffix = "×2"
            elif "break" in t:
                suffix = "🪓"
            return f"−{dmg}{suffix}"

        m1 = _marker(out1, dmg1)
        m2 = _marker(out2, dmg2)
        return f"Р{round_num} Вы {m1} · Враг {m2}"

    def _format_exchange_text(
        self,
        p1_choices: Dict,
        p2_choices: Dict,
        d1: int,
        d2: int,
        out1: str,
        out2: str,
        round_num: int,
        opponent_name: str,
        opponent_level: int = 1,
    ) -> str:
        """Текст размена для игрока 1: кто куда ударил и итог по урону."""
        a1, d1def = p1_choices['attack'], p1_choices['defense']
        a2, d2def = p2_choices['attack'], p2_choices['defense']
        bp2 = html_escape(self._zone_block_phrase(d2def))
        bp1 = html_escape(self._zone_block_phrase(d1def))
        acc1 = html_escape(self._zone_accusative(a1))
        acc2 = html_escape(self._zone_accusative(a2))
        op_name = html_escape(opponent_name)
        t1 = set((out1 or "").split("_"))
        t2 = set((out2 or "").split("_"))

        if 'block' in t1:
            line_you = f"0 урона (блок соперника по {bp2})"
        elif 'miss' in t1:
            line_you = "0 (мимо)"
        elif 'dodge' in t1:
            line_you = "0 (🌪️ соперник увернулся)"
        elif 'pierce' in t1 and 'crit' in t1:
            line_you = f"🔴 <b>{d1}</b> урона (⚡крит-пробой блока)"
        elif 'fortress' in t1:
            line_you = f"{d1} урона (🛡️ абсолютная стойка: входящий удар почти полностью поглощён)"
        elif 'guard' in t1 and 'crit' in t1 and 'double' in t1:
            line_you = f"🔴 <b>{d1}</b> урона (🧱 поглощение + ⚡крит + второй удар)"
        elif 'guard' in t1 and 'crit' in t1:
            line_you = f"🔴 <b>{d1}</b> урона (🧱 поглощение + ⚡крит)"
        elif 'guard' in t1 and 'double' in t1:
            line_you = f"{d1} урона (🧱 поглощение + ⚔️ второй удар)"
        elif 'guard' in t1:
            line_you = f"{d1} урона (🧱 поглощение)"
        elif 'crit' in t1 and 'double' in t1:
            line_you = f"🔴 <b>{d1}</b> урона (⚡крит + второй удар)"
        elif 'crit' in t1:
            line_you = f"🔴 <b>{d1}</b> урона (⚡крит)"
        elif 'double' in t1:
            line_you = f"{d1} урона (⚔️ второй удар)"
        elif 'partial' in t1:
            line_you = f"{d1} урона (частичный блок)"
        else:
            line_you = f"{d1} урона"
        if 'break' in t1:
            line_you += " (🪓 пролом брони)"

        if 'block' in t2:
            line_en = f"0 урона (ваш блок по {bp1})"
        elif 'miss' in t2:
            line_en = "0 (мимо по вам)"
        elif 'dodge' in t2:
            line_en = "0 (🌪️ вы увернулись)"
        elif 'pierce' in t2 and 'crit' in t2:
            line_en = f"🔴 <b>{d2}</b> урона по вам (⚡крит-пробой блока)"
        elif 'fortress' in t2:
            line_en = f"{d2} урона по вам (🛡️ абсолютная стойка: входящий удар почти полностью поглощён)"
        elif 'guard' in t2 and 'crit' in t2 and 'double' in t2:
            line_en = f"🔴 <b>{d2}</b> урона по вам (🧱 поглощение + ⚡крит + второй удар)"
        elif 'guard' in t2 and 'crit' in t2:
            line_en = f"🔴 <b>{d2}</b> урона по вам (🧱 поглощение + ⚡крит)"
        elif 'guard' in t2 and 'double' in t2:
            line_en = f"{d2} урона по вам (🧱 поглощение + ⚔️ второй удар)"
        elif 'guard' in t2:
            line_en = f"{d2} урона по вам (🧱 поглощение)"
        elif 'crit' in t2 and 'double' in t2:
            line_en = f"🔴 <b>{d2}</b> урона по вам (⚡крит + второй удар)"
        elif 'crit' in t2:
            line_en = f"🔴 <b>{d2}</b> урона по вам (⚡крит)"
        elif 'double' in t2:
            line_en = f"{d2} урона по вам (⚔️ второй удар)"
        elif 'partial' in t2:
            line_en = f"{d2} урона по вам (частичный блок)"
        else:
            line_en = f"{d2} урона по вам"
        if 'break' in t2:
            line_en += " (🪓 пролом брони)"

        olv = int(opponent_level)
        if out1 == 'timeout':
            return (
                f"⚔️ <b>Размен</b> · раунд {round_num}\n"
                f"<b>1)</b> ⏱️ Вы не сделали ход вовремя — урон по врагу 0\n"
                f"<b>2)</b> {op_name} (ур. {olv}) бьёт в {acc2} — {line_en}"
            )
        return (
            f"⚔️ <b>Размен</b> · раунд {round_num}\n"
            f"<b>1)</b> Ваш удар в {acc1} — {line_you}\n"
            f"<b>2)</b> {op_name} (ур. {olv}) бьёт в {acc2} — {line_en}"
        )

    def _armor_multiplier(self, defender: Dict) -> float:
        """Броня от Выносливости — абсолютная формула (не % от пула!).

        base = invested / (invested + ARMOR_STAMINA_K_ABS)
        level_cap = ARMOR_CAP_BASE + ARMOR_CAP_PER_LEVEL * lv  (растёт с уровнем)
        reduction = min(level_cap, base)

        Прогрессия для heavy-tank (80% статов в вын):
          Ур.3→~2%  Ур.10→~6%  Ур.25→~15%  Ур.50→~25%  Ур.75→~35%  Ур.100→45%
        Потолок НИКОГДА не достигается раньше ~ур.100 при любом вложении."""
        lv = int(defender.get('level', PLAYER_START_LEVEL))
        stamina = stamina_stats_invested(
            int(defender.get('max_hp', PLAYER_START_MAX_HP)), lv
        )
        base_reduction = stamina / (stamina + ARMOR_STAMINA_K_ABS) if stamina > 0 else 0.0
        level_cap = min(ARMOR_ABSOLUTE_MAX, ARMOR_CAP_BASE + ARMOR_CAP_PER_LEVEL * lv)
        reduction = min(level_cap, base_reduction)
        return 1.0 - reduction

    def _apply_incoming_damage(self, raw: int, defender: Dict) -> int:
        m = self._armor_multiplier(defender)
        return max(1, int(raw * m))

    def _calculate_damage_detailed(
        self,
        attacker: Dict,
        defender: Dict,
        attack_zone: str,
        defense_zone: str,
        defense_skips_block: bool = False,
        defender_debuffs: Optional[Dict] = None,
    ) -> Tuple[int, str, Optional[str]]:
        """
        Урон, исход и дебафф:
        block | miss | dodge | partial | crit | crit_pierce | double | crit_double |
        guard | guard_crit | guard_double | guard_crit_double | fortress | hit

        Формула урона (убывающая отдача):
          base = FLAT_PER_LEVEL*lv + SCALE * str^POWER
          → зональный множитель: ГОЛОВА ×1.3, НОГИ ×0.75
          → кап обычного удара = 45% max_hp защитника
          → крит удваивает базу ДО капа → может превысить кап (спецудар)
          → затем броня от выносливости (0–45%)

        Дебаффы:
          - Удар в НОГИ (не заблокирован, не уклонились) → 'legs_debuff' в следующем раунде
            ослабляет уклон жертвы на ZONE_LEGS_DODGE_PENALTY
          - defender_debuffs — дебаффы текущего раунда (от удара прошлого раунда):
            'legs_debuff' → −ZONE_LEGS_DODGE_PENALTY к шансу уклона защитника

        Возвращает: (урон, исход, дебафф_для_следующего_раунда)
          дебафф None = нет эффекта; 'legs_debuff' = жертва получила дебафф ног
        """
        if defender_debuffs is None:
            defender_debuffs = {}

        atk_str = max(1, int(attacker.get('strength', BASE_STRENGTH)))
        atk_lv  = max(1, int(attacker.get('level', PLAYER_START_LEVEL)))
        # Убывающая отдача: flat_per_level * lv + scale * str^power
        # Примеры при SCALE=4, POWER=0.75:
        #   str=5  (lv1  сбаланс.): 0.3+17=~17    str=540 (lv100 сбаланс.): 30+433=~463
        #   str=8  (lv1  full-STR): 0.3+21=~21    str=1078(lv100 full-STR): 30+728=~758
        flat_part = STRENGTH_DAMAGE_FLAT_PER_LEVEL * atk_lv
        pow_part  = STRENGTH_DAMAGE_SCALE * (atk_str ** STRENGTH_DAMAGE_POWER)
        base_damage = max(5, int(flat_part + pow_part))

        # Кап обычного удара: не более 45% от макс. HP защитника.
        # Крит и частичный блок модифицируют базу позже — крит может превысить кап.
        def_max_hp = max(10, int(defender.get('max_hp', PLAYER_START_MAX_HP)))
        hit_cap = max(10, int(def_max_hp * STRENGTH_DAMAGE_MAX_PCT))
        base_damage = min(base_damage, hit_cap)

        level_diff = atk_lv - max(1, int(defender.get('level', PLAYER_START_LEVEL)))
        if level_diff >= 3:
            base_damage = int(base_damage * 1.1)
        elif level_diff <= -3:
            base_damage = int(base_damage * 0.8)

        # Зональный множитель (применяется до проверки блока — блок всё равно даёт 0)
        zone_debuff_type: Optional[str] = None
        if attack_zone == 'ГОЛОВА':
            base_damage = int(base_damage * ZONE_HEAD_MULT)
        elif attack_zone == 'НОГИ':
            base_damage = int(base_damage * ZONE_LEGS_MULT)
            zone_debuff_type = 'legs_debuff'
        base_damage = max(5, base_damage)

        defender_uid = defender.get('user_id')
        def_improvements = db.get_player_improvements(defender_uid) if defender_uid else {}
        attacker_uid = attacker.get('user_id')
        atk_improvements = db.get_player_improvements(attacker_uid) if attacker_uid else {}

        # Крит-шанс считаем заранее: нужен для фичи «крит может пробить полный блок».
        atk_int = self._safe_crit_stat(attacker, PLAYER_START_CRIT)
        def_int = self._safe_crit_stat(defender, PLAYER_START_CRIT)
        total_int = max(1, atk_int + def_int)
        int_invested = max(0, atk_int - PLAYER_START_CRIT)
        imp_crit = atk_improvements.get('critical_strike', 0) * 0.02
        crit_chance = (atk_int / total_int) * CRIT_MAX_CHANCE
        crit_chance += (int_invested // INT_BONUS_STEP) * INT_BONUS_PCT_PER_STEP
        crit_chance += imp_crit
        def_int_invested = max(0, def_int - PLAYER_START_CRIT)
        def_int_crit_protection = (def_int_invested // INT_BONUS_STEP) * INT_BONUS_PCT_PER_STEP
        crit_chance = max(0.01, crit_chance - def_int_crit_protection)
        crit_chance = min(CRIT_MAX_CHANCE, crit_chance)

        if not defense_skips_block and attack_zone == defense_zone:
            # Фича Int-билда: редкий пробой полного блока критом.
            if random.random() < crit_chance and random.random() < CRIT_BLOCK_PIERCE_CHANCE:
                pierced = int(base_damage * 2 * CRIT_BLOCK_PIERCE_DAMAGE_MULT)
                attack_bonus = atk_improvements.get('attack_power', 0) * 0.05
                pierced = int(pierced * (1 + attack_bonus))
                pierced = self._apply_incoming_damage(pierced, defender)
                return max(1, pierced), 'crit_pierce', None
            return 0, 'block', None  # блок — дебафф не применяется

        if random.random() < MISS_CHANCE:
            return 0, 'miss', None

        # Уворот: сравнительный + абсолютный бонус за вложения в ловкость
        def_ag = max(1, int(defender.get('endurance', BASE_ENDURANCE)))
        atk_ag = max(1, int(attacker.get('endurance', BASE_ENDURANCE)))
        dodge_chance = (def_ag / (def_ag + atk_ag)) * DODGE_MAX_CHANCE
        # Плоский бонус: каждые AGI_BONUS_STEP вложенных очков → +AGI_BONUS_PCT_PER_STEP
        agi_invested = max(0, def_ag - PLAYER_START_ENDURANCE)
        dodge_chance += (agi_invested // AGI_BONUS_STEP) * AGI_BONUS_PCT_PER_STEP
        dodge_chance += def_improvements.get('dodge', 0) * 0.02
        # Дебафф от удара в ноги прошлого раунда → −ZONE_LEGS_DODGE_PENALTY к уклону
        if defender_debuffs.get('legs_debuff'):
            dodge_chance = max(0.0, dodge_chance - ZONE_LEGS_DODGE_PENALTY)
        dodge_chance = min(DODGE_MAX_CHANCE, dodge_chance)

        if random.random() < dodge_chance:
            return 0, 'dodge', None  # уклонился — дебафф не применяется

        partial = False
        if random.random() < PARTIAL_BLOCK_CHANCE:
            base_damage = int(base_damage * 0.7)
            partial = True

        # Крит (Интуиция): сравнительный + абсолютный бонус атакующего − защита защитника
        is_crit = random.random() < crit_chance
        if is_crit:
            base_damage *= 2

        # Фича Agi-билда: шанс второго удара в тот же размен.
        atk_ag = max(1, int(attacker.get('endurance', BASE_ENDURANCE)))
        atk_agi_invested = max(0, atk_ag - PLAYER_START_ENDURANCE)
        dbl_chance = min(
            DODGE_DOUBLE_STRIKE_MAX_CHANCE,
            (atk_agi_invested // DODGE_DOUBLE_STRIKE_STEP) * DODGE_DOUBLE_STRIKE_PCT_PER_STEP,
        )
        is_double = random.random() < dbl_chance
        if is_double:
            base_damage += max(1, int(base_damage * DODGE_DOUBLE_STRIKE_DAMAGE_MULT))

        attack_bonus = atk_improvements.get('attack_power', 0) * 0.05
        base_damage = int(base_damage * (1 + attack_bonus))

        # Фича силы: «пролом брони» — игнорируем часть брони цели.
        atk_strength_invested = max(0, atk_str - PLAYER_START_STRENGTH)
        armor_break_chance = min(
            STRENGTH_ARMOR_BREAK_MAX_CHANCE,
            (atk_strength_invested // STRENGTH_ARMOR_BREAK_STEP) * STRENGTH_ARMOR_BREAK_PCT_PER_STEP,
        )
        armor_break_triggered = False
        if random.random() < armor_break_chance:
            armor_break_triggered = True
            armor_reduction = max(0.0, 1.0 - self._armor_multiplier(defender))
            effective_reduction = armor_reduction * (1.0 - STRENGTH_ARMOR_BREAK_IGNORE_PCT)
            base_damage = max(1, int(base_damage * (1.0 - effective_reduction)))
        else:
            base_damage = self._apply_incoming_damage(base_damage, defender)

        # Фича танка: шанс поглотить 50% входящего урона (после брони).
        guard_triggered = False
        def_stamina_invested = stamina_stats_invested(
            int(defender.get("max_hp", PLAYER_START_MAX_HP)),
            int(defender.get("level", PLAYER_START_LEVEL)),
        )
        guard_chance = min(
            TANK_GUARD_MAX_CHANCE,
            (def_stamina_invested // TANK_GUARD_STEP) * TANK_GUARD_PCT_PER_STEP,
        )
        if random.random() < guard_chance:
            base_damage = max(1, int(base_damage * TANK_GUARD_DAMAGE_MULT))
            guard_triggered = True

        # Силовой танк (сила + HP): редкая «абсолютная стойка» — любой входящий удар = 1.
        def_strength_invested = max(0, int(defender.get("strength", PLAYER_START_STRENGTH)) - PLAYER_START_STRENGTH)
        fortress_score = def_strength_invested + def_stamina_invested
        fortress_chance = min(
            FORTRESS_GUARD_MAX_CHANCE,
            (fortress_score // FORTRESS_GUARD_STEP) * FORTRESS_GUARD_PCT_PER_STEP,
        )
        if random.random() < fortress_chance:
            return 1, "fortress", zone_debuff_type

        if guard_triggered and is_crit and is_double:
            outcome = "guard_crit_double"
        elif guard_triggered and is_crit:
            outcome = "guard_crit"
        elif guard_triggered and is_double:
            outcome = "guard_double"
        elif guard_triggered:
            outcome = "guard"
        elif is_crit and is_double:
            outcome = "crit_double"
        elif is_crit:
            outcome = "crit"
        elif is_double:
            outcome = "double"
        elif partial:
            outcome = "partial"
        else:
            outcome = "hit"
        if armor_break_triggered:
            outcome = f"break_{outcome}"
        return base_damage, outcome, zone_debuff_type

    def _calculate_damage(self, attacker: Dict, defender: Dict, attack_zone: str, defense_zone: str) -> int:
        """Совместимость: только число урона."""
        d, _, _ = self._calculate_damage_detailed(attacker, defender, attack_zone, defense_zone, False)
        return d
    
    def _generate_round_events(self, p1_choices: Dict, p2_choices: Dict, p1_damage: int, p2_damage: int) -> List[str]:
        """Сгенерировать события раунда"""
        events = []
        
        # События для игрока 1
        if p1_damage == 0:
            if p1_choices['attack'] == p2_choices['defense']:
                events.append(f"🛡️ Игрок 1: Атака заблокирована!")
            else:
                if random.random() < MISS_CHANCE:
                    events.append(f"❌ Игрок 1: Промах!")
                else:
                    events.append(f"💨 Игрок 1: Уклонился противник!")
        else:
            if p1_damage >= self._get_expected_damage() * 2:
                events.append(f"💥 Игрок 1: КРИТИЧЕСКИЙ УДАР! ({p1_damage} урона)")
            else:
                events.append(f"⚔️ Игрок 1: Попадание! ({p1_damage} урона)")
        
        # События для игрока 2
        if p2_damage == 0:
            if p2_choices['attack'] == p1_choices['defense']:
                events.append(f"🛡️ Игрок 2: Атака заблокирована!")
            else:
                if random.random() < MISS_CHANCE:
                    events.append(f"❌ Игрок 2: Промах!")
                else:
                    events.append(f"💨 Игрок 2: Уклонился противник!")
        else:
            if p2_damage >= self._get_expected_damage() * 2:
                events.append(f"💥 Игрок 2: КРИТИЧЕСКИЙ УДАР! ({p2_damage} урона)")
            else:
                events.append(f"⚔️ Игрок 2: Попадание! ({p2_damage} урона)")
        
        return events
    
    def _get_expected_damage(self) -> int:
        """Получить ожидаемый урон для определения критов"""
        return 15  # Средний ожидаемый урон
    
    def _get_bot_choice(self, bot: Dict, opponent: Dict) -> Dict:
        """Получить выбор бота на основе """
        bot_type = bot.get('ai_pattern', 'balanced')
        
        # Анализируем стиль противника (упрощенно)
        aggression = random.random()
        
        if bot_type == 'aggressive':
            # Агрессивный бот чаще атакует голову
            attack = random.choices(['ГОЛОВА', 'ТУЛОВИЩЕ', 'НОГИ'], weights=[0.5, 0.3, 0.2])[0]
            defense = random.choices(['ГОЛОВА', 'ТУЛОВИЩЕ', 'НОГИ'], weights=[0.2, 0.4, 0.4])[0]
        elif bot_type == 'defensive':
            # Защитный бот чаще защищает голову
            attack = random.choices(['ГОЛОВА', 'ТУЛОВИЩЕ', 'НОГИ'], weights=[0.3, 0.4, 0.3])[0]
            defense = random.choices(['ГОЛОВА', 'ТУЛОВИЩЕ', 'НОГИ'], weights=[0.5, 0.3, 0.2])[0]
        else:
            # Сбалансированный бот
            attack = random.choice(ATTACK_ZONES)
            defense = random.choice(ATTACK_ZONES)
        
        # Добавляем случайность для реалистичности
        if random.random() < 0.1:  # 10% случайная ошибка
            attack = random.choice(ATTACK_ZONES)
        
        return {'attack': attack, 'defense': defense}
    
    async def _end_battle(
        self, battle_id: str, winner_id: int, exchange_text: Optional[str] = None
    ) -> Dict:
        """Завершить бой.
        Все DB-читалки — параллельно через run_in_executor.
        Все DB-записи — фоновой задачей после возврата результата.
        """
        import asyncio
        loop = asyncio.get_event_loop()

        battle = self.active_battles[battle_id]
        self.cancel_turn_timer(battle)
        battle['battle_active'] = False
        duration_ms = int((datetime.now() - battle['started_at']).total_seconds() * 1000)

        player1 = battle['player1']
        player2 = battle['player2']

        is_winner_p1   = winner_id == player1['user_id']
        winner         = player1 if is_winner_p1 else player2
        loser          = player2 if is_winner_p1 else player1
        winner_user_id = winner.get('user_id')
        loser_user_id  = loser.get('user_id')
        is_test        = battle.get('is_test_battle', False)
        battle_mode    = battle.get("mode", "normal")
        mode_meta      = dict(battle.get("mode_meta") or {})

        winner_live   = dict(winner)
        loser_live    = dict(loser)
        xp_boosted    = False
        prem_w_active = False
        prem_l_active = False
        pvp_repeat_factor = 1.0

        if not is_test:
            # ── Параллельные DB-читалки ──────────────────────────────────
            # Оцениваем base_exp по снэпшоту (для consume_xp_boost_charge)
            p1_dmg_snap, p2_dmg_snap = self._battle_damage_totals(battle)
            w_dmg_snap   = p1_dmg_snap if is_winner_p1 else p2_dmg_snap
            snap_level   = int(winner.get('level', PLAYER_START_LEVEL))
            snap_opp_hp  = max(1, int(loser.get('max_hp', PLAYER_START_MAX_HP)))
            snap_dmg_r   = min(1.0, max(0.4, w_dmg_snap / snap_opp_hp))
            snap_base_exp = max(1, int(victory_xp_for_player_level(snap_level) * snap_dmg_r))

            futs: dict = {}
            if winner_user_id is not None:
                futs['winner'] = loop.run_in_executor(
                    None, db.get_or_create_player,
                    winner_user_id, winner.get("username") or ""
                )
            if loser_user_id is not None:
                futs['loser'] = loop.run_in_executor(
                    None, db.get_or_create_player,
                    loser_user_id, loser.get("username") or ""
                )
            if winner_user_id is not None:
                futs['prem_w'] = loop.run_in_executor(
                    None, db.get_premium_status, winner_user_id
                )
            if loser_user_id is not None and not battle.get("is_bot2"):
                futs['prem_l'] = loop.run_in_executor(
                    None, db.get_premium_status, loser_user_id
                )
            if winner_user_id is not None and snap_base_exp > 0:
                futs['xp_boost'] = loop.run_in_executor(
                    None, db.consume_xp_boost_charge, winner_user_id
                )
            if not battle.get("is_bot2"):
                futs['pvp_cnt'] = loop.run_in_executor(
                    None, db.get_recent_pvp_duel_count,
                    player1["user_id"], player2["user_id"], 24
                )

            if futs:
                vals = await asyncio.gather(*futs.values(), return_exceptions=True)
                done = dict(zip(futs.keys(), vals))
                if 'winner' in done and not isinstance(done['winner'], Exception):
                    winner_live = done['winner']
                if 'loser' in done and not isinstance(done['loser'], Exception):
                    loser_live = done['loser']
                if 'prem_w' in done and not isinstance(done['prem_w'], Exception):
                    prem_w_active = bool(done['prem_w'].get("is_active"))
                if 'prem_l' in done and not isinstance(done['prem_l'], Exception):
                    prem_l_active = bool(done['prem_l'].get("is_active"))
                if 'xp_boost' in done and not isinstance(done['xp_boost'], Exception):
                    xp_boosted = bool(done['xp_boost'])
                if 'pvp_cnt' in done and not isinstance(done['pvp_cnt'], Exception):
                    cnt = done['pvp_cnt']
                    if cnt >= 6:   pvp_repeat_factor = 0.2
                    elif cnt >= 3: pvp_repeat_factor = 0.5

        winner_locked = (
            self._is_profile_reset_locked(winner_user_id)
            or self._is_stale_after_profile_reset(winner_live, battle["started_at"])
        )
        loser_locked = (
            self._is_profile_reset_locked(loser_user_id)
            or self._is_stale_after_profile_reset(loser_live, battle["started_at"])
        )

        # ── Урон за бой ──────────────────────────────────────────────
        p1_total_dmg, p2_total_dmg = self._battle_damage_totals(battle)
        winner_dmg  = p1_total_dmg if is_winner_p1 else p2_total_dmg
        loser_dmg   = p2_total_dmg if is_winner_p1 else p1_total_dmg
        opp_max_hp  = max(1, int(loser.get('max_hp', PLAYER_START_MAX_HP)))
        your_max_hp = max(1, int(winner.get('max_hp', PLAYER_START_MAX_HP)))

        # ── Награды ──────────────────────────────────────────────────
        gold_reward  = 0 if is_test else (VICTORY_GOLD if not battle['is_bot2'] else int(VICTORY_GOLD * 0.8))
        winner_level = int(winner_live.get('level', PLAYER_START_LEVEL))
        loser_level  = int(loser_live.get('level', PLAYER_START_LEVEL))
        level_diff   = winner_level - loser_level
        level_mult   = max(0.3, 1.0 - level_diff * 0.15)
        dmg_ratio    = min(1.0, max(0.4, winner_dmg / opp_max_hp))
        base_exp = 0 if is_test else max(
            1, int(victory_xp_for_player_level(winner_level) * level_mult * dmg_ratio)
        )

        loser_if_won_diff = loser_level - winner_level
        loser_if_won_mult = max(0.3, 1.0 - loser_if_won_diff * 0.15)
        loser_if_won_dmg  = min(1.0, max(0.4, loser_dmg / your_max_hp))
        hypothetical_loser_win = 0 if is_test else int(
            victory_xp_for_player_level(loser_level) * loser_if_won_mult * loser_if_won_dmg
        )
        loser_exp = 0 if is_test else int(hypothetical_loser_win * DEFEAT_XP_AS_WIN_FRACTION)

        exp_reward = int(base_exp * 1.5) if xp_boosted else base_exp
        if not is_test and prem_w_active and exp_reward > 0:
            exp_reward = max(1, int(round(exp_reward * PREMIUM_XP_MULTIPLIER)))
        if not is_test and prem_l_active and loser_exp > 0:
            loser_exp = max(0, int(round(loser_exp * PREMIUM_XP_MULTIPLIER)))

        if not is_test and not battle.get("is_bot2"):
            gold_reward = int(round(gold_reward * 1.30 * pvp_repeat_factor))
            exp_reward  = int(round(exp_reward  * 1.30 * pvp_repeat_factor))
        if battle_mode == "titan":
            floor = max(1, int(mode_meta.get("floor", 1)))
            gold_reward = 0 if is_test else int(12 + floor * 5)
            exp_reward  = 0 if is_test else max(1, int(round(base_exp * (1.0 + min(1.0, floor * 0.06)))))
        if battle_mode == "endless":
            wave = max(1, int(mode_meta.get("wave", 1)))
            gold_reward = 0 if is_test else int(8 + wave * 4)
            exp_reward  = 0   # Натиск — не для прокачки, XP не начисляется
            loser_exp   = 0   # и за поражение тоже

        combat_log_html = '\n\n'.join(battle.get('combat_log_lines', []))
        streak_bonus_gold = 0
        new_win_streak    = 0
        did_level         = False
        level_up_level    = None

        # ── ELO ───────────────────────────────────────────────────
        _is_pvp = not battle.get("is_bot2")
        if not is_test and _is_pvp and battle_mode not in ("titan", "endless"):
            # Полноценный ELO для PvP боёв
            _elo_k = 32
            _r_w   = int(winner_live.get('rating', 1000))
            _r_l   = int(loser_live.get('rating', 1000))
            _e_w   = 1.0 / (1.0 + 10.0 ** ((_r_l - _r_w) / 400.0))
            _e_l   = 1.0 - _e_w
            elo_delta_w = max(1, round(_elo_k * (1.0 - _e_w)))
            elo_delta_l = min(-1, round(_elo_k * (0.0 - _e_l)))
        elif not is_test and not _is_pvp and battle_mode not in ("titan", "endless"):
            # Бот: небольшой фиксированный бонус
            elo_delta_w = 5
            elo_delta_l = 0
        else:
            # Titan/Endless или тест: рейтинг не меняется
            elo_delta_w = 0
            elo_delta_l = 0

        winner_stats = None
        if not is_test and winner_user_id is not None and not winner_locked:
            new_win_streak = winner_live.get('win_streak', 0) + 1
            total_gold = winner_live.get('gold', 0) + gold_reward
            if new_win_streak > 0 and new_win_streak % STREAK_BONUS_EVERY == 0:
                streak_bonus_gold = STREAK_BONUS_GOLD
                total_gold += streak_bonus_gold
            pl = dict(winner_live)
            pl['gold'] = total_gold
            exp_patch, did_level = self._exp_progression_updates(pl, exp_reward, max_level_ups=1)
            if did_level:
                level_up_level = exp_patch['level']
            winner_stats = {
                'wins':           winner_live.get('wins', 0) + 1,
                'gold':           exp_patch['gold'],
                'diamonds':       exp_patch['diamonds'],
                'exp':            exp_patch['exp'],
                'level':          exp_patch['level'],
                'free_stats':     exp_patch['free_stats'],
                'exp_milestones': exp_patch['exp_milestones'],
                'max_hp':         exp_patch['max_hp'],
                'current_hp':     exp_patch['current_hp'],
                'rating':         int(winner_live.get('rating', 1000)) + elo_delta_w,
                'win_streak':     new_win_streak,
            }

        loser_stats = None
        if not is_test and loser_user_id is not None and not loser_locked:
            loser_stats = {
                'losses':     loser_live.get('losses', 0) + 1,
                'win_streak': 0,
                'current_hp': max(0, int(loser.get('current_hp', 0))),
                'rating':     max(100, int(loser_live.get('rating', 1000)) + elo_delta_l),
            }
            if loser_exp > 0:
                loser_pl = dict(loser_live)
                loser_exp_patch, _ = self._exp_progression_updates(loser_pl, loser_exp, max_level_ups=1)
                loser_stats.update({
                    'exp':            loser_exp_patch['exp'],
                    'exp_milestones': loser_exp_patch['exp_milestones'],
                    'free_stats':     loser_exp_patch['free_stats'],
                    'level':          loser_exp_patch['level'],
                    'max_hp':         loser_exp_patch['max_hp'],
                    'gold':           loser_exp_patch['gold'],
                    'diamonds':       loser_exp_patch['diamonds'],
                })

        # ── Titan progress (нужен в результате — выполняем до return) ─
        titan_progress = None
        if not is_test and battle_mode == "titan" and player1.get("user_id") is not None:
            floor = max(1, int(mode_meta.get("floor", 1)))
            try:
                if is_winner_p1 and not winner_locked:
                    titan_progress = await loop.run_in_executor(
                        None, db.titan_on_win, player1["user_id"], floor
                    )
                elif not is_winner_p1 and not loser_locked:
                    titan_progress = await loop.run_in_executor(
                        None, db.titan_on_loss, player1["user_id"], floor
                    )
            except Exception as _te:
                logger.warning("titan_progress error: %s", _te)

        # ── Endless progress (Натиск) ─────────────────────────────
        endless_progress = None
        if not is_test and battle_mode == "endless" and player1.get("user_id") is not None:
            wave = max(1, int(mode_meta.get("wave", 1)))
            try:
                if is_winner_p1 and not winner_locked:
                    # HP left after this fight (from winner stats)
                    hp_left = int(winner_stats.get('current_hp', 0)) if winner_stats else 0
                    # Every 5 waves: +10% max_hp heal
                    max_hp = int(player1.get('max_hp', 100))
                    if wave % 5 == 0:
                        heal = max(1, int(max_hp * 0.10))
                        hp_left = min(max_hp, hp_left + heal)
                        if winner_stats:
                            winner_stats['current_hp'] = hp_left
                    endless_progress = await loop.run_in_executor(
                        None, db.endless_on_win, player1["user_id"], wave, hp_left
                    )
                    # Обновляем квест-счётчики Натиска и Battle Pass
                    try:
                        await loop.run_in_executor(
                            None, db.endless_quest_on_win, player1["user_id"], wave
                        )
                        await loop.run_in_executor(
                            None, db.update_battle_pass_endless, player1["user_id"]
                        )
                    except Exception as _qe:
                        logger.warning("endless_quest_on_win error: %s", _qe)
                elif not is_winner_p1 and not loser_locked:
                    endless_progress = await loop.run_in_executor(
                        None, db.endless_on_loss, player1["user_id"], wave
                    )
            except Exception as _ee:
                logger.warning("endless_progress error: %s", _ee)

        # ── Захватываем данные боя до удаления из памяти ─────────────
        n_rounds    = len(battle['rounds'])
        battle_data = {
            'player1_id': player1['user_id'],
            'player2_id': player2.get('user_id') or player2.get('bot_id'),
            'is_bot1':   battle['is_bot1'],
            'is_bot2':   battle['is_bot2'],
            'winner_id': winner_id,
            'result':    'victory' if is_winner_p1 else 'defeat',
            'rounds':    n_rounds,
            'details': {
                'rounds':     [vars(r) for r in battle['rounds']],
                'battle_log': battle['battle_log'],
                'mode':       battle_mode,
                'mode_meta':  mode_meta,
            }
        }

        result = {
            'status': 'battle_ended',
            'winner': self._entity_name(winner),
            'loser':  self._entity_name(loser),
            'winner_id': winner_id,
            'human_won': is_winner_p1,
            'rounds':    n_rounds,
            'damage_to_opponent': winner_dmg if is_winner_p1 else loser_dmg,
            'damage_to_you':      loser_dmg  if is_winner_p1 else winner_dmg,
            'gold_reward':        (gold_reward if is_winner_p1 else DEFEAT_GOLD) if not winner_locked else 0,
            'exp_reward':         (exp_reward if is_winner_p1 else loser_exp)
                                  if not (winner_locked if is_winner_p1 else loser_locked) else 0,
            'xp_boosted':         xp_boosted and is_winner_p1,
            'streak_bonus_gold':  (streak_bonus_gold if is_winner_p1 else 0) if not winner_locked else 0,
            'win_streak':         new_win_streak if is_winner_p1 and winner_user_id and not winner_locked else 0,
            'rating_change':      0 if is_test else (elo_delta_w if is_winner_p1 else elo_delta_l),
            'level_up':           (bool(did_level) and not winner_locked) if not is_test else False,
            'level_up_level':     level_up_level if not is_test else None,
            'duration_ms':        duration_ms,
            'exchange_text':      exchange_text,
            'combat_log_html':    combat_log_html,
            'is_test_battle':     is_test,
            'p2_gold_reward':     (DEFEAT_GOLD if is_winner_p1 else gold_reward) if not loser_locked else 0,
            'p2_exp_reward':      0 if (is_winner_p1 and loser_locked) or (not is_winner_p1 and winner_locked)
                                  else (loser_exp if is_winner_p1 else exp_reward),
            'p2_xp_boosted':      False if is_winner_p1 else xp_boosted,
            'p2_streak_bonus_gold': 0 if is_winner_p1 or loser_locked else streak_bonus_gold,
            'p2_win_streak':      0 if is_winner_p1 else (new_win_streak if winner_user_id else 0),
            'p2_level_up':        (bool(did_level) if not is_winner_p1 else False) if not is_test else False,
            'p2_level_up_level':  (level_up_level if not is_winner_p1 else None) if not is_test else None,
            'pvp_p1_user_id':     player1['user_id'] if not battle['is_bot2'] else None,
            'pvp_p2_user_id':     player2.get('user_id') if not battle['is_bot2'] else None,
            'pvp_p1_ui_message':  dict(battle['ui_message'])    if not battle['is_bot2'] and battle.get('ui_message')    else None,
            'pvp_p2_ui_message':  dict(battle['ui_message_p2']) if not battle['is_bot2'] and battle.get('ui_message_p2') else None,
            'mode':              battle_mode,
            'mode_meta':         mode_meta,
            'pvp_repeat_factor': pvp_repeat_factor,
            'titan_progress':    titan_progress,
            'endless_progress':  endless_progress,
        }

        if battle.get('is_bot2') and player1.get('user_id') is not None:
            self.remember_battle_end_ui(player1['user_id'], result)
        elif not battle.get('is_bot2'):
            if player1.get('user_id') is not None:
                self.remember_battle_end_ui(player1['user_id'], result)
            if player2.get('user_id') is not None:
                self.remember_battle_end_ui(player2['user_id'], result)

        # ── Очищаем бой из памяти ─────────────────────────────────────
        if player1['user_id'] in self.battle_queue:
            del self.battle_queue[player1['user_id']]
        if not battle['is_bot2'] and player2.get('user_id') in self.battle_queue:
            del self.battle_queue[player2['user_id']]
        del self.active_battles[battle_id]

        # ── Все DB-записи — в фоне, не блокируем ответ ───────────────
        event_name = 'battle_test_ended' if is_test else 'battle_ended'
        logger.info("event=%s winner_id=%s rounds=%s duration_ms=%s", event_name, winner_id, n_rounds, duration_ms)
        asyncio.create_task(self._persist_battle_writes(
            winner_user_id, loser_user_id,
            winner_stats, loser_stats,
            winner_locked, loser_locked,
            battle_data, battle_mode, is_test,
            winner_id, n_rounds, duration_ms,
        ))

        return result

    async def _persist_battle_writes(
        self,
        winner_uid: Optional[int], loser_uid: Optional[int],
        winner_stats: Optional[dict], loser_stats: Optional[dict],
        winner_locked: bool, loser_locked: bool,
        battle_data: dict, battle_mode: str, is_test: bool,
        winner_id: int, n_rounds: int, duration_ms: int,
    ) -> None:
        """Фоновая запись результатов боя в БД (параллельно)."""
        import asyncio
        loop = asyncio.get_event_loop()
        tasks = []
        event_name = 'battle_test_ended' if is_test else 'battle_ended'

        if not is_test:
            if winner_uid is not None and winner_stats is not None:
                tasks.append(loop.run_in_executor(None, db.update_player_stats, winner_uid, winner_stats))
                tasks.append(loop.run_in_executor(None, db.update_daily_quest_progress, winner_uid, True))
                if battle_mode != "titan":
                    tasks.append(loop.run_in_executor(None, db.update_season_stats, winner_uid, True))
                tasks.append(loop.run_in_executor(None, db.update_battle_pass, winner_uid, True))
            if loser_uid is not None and loser_stats is not None:
                tasks.append(loop.run_in_executor(None, db.update_player_stats, loser_uid, loser_stats))
                tasks.append(loop.run_in_executor(None, db.update_daily_quest_progress, loser_uid, False))
                if battle_mode != "titan":
                    tasks.append(loop.run_in_executor(None, db.update_season_stats, loser_uid, False))
                tasks.append(loop.run_in_executor(None, db.update_battle_pass, loser_uid, False))
            if not (winner_locked or loser_locked):
                tasks.append(loop.run_in_executor(None, db.save_battle, battle_data))

        tasks.append(loop.run_in_executor(None, db.log_metric_event, event_name, winner_id, n_rounds, duration_ms))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, Exception):
                logger.error("battle_persist error: %s", r)
    
    async def _end_battle_by_afk(self, battle_id: str, winner_id: int) -> Dict:
        """Завершить бой по AFK (параллельные читалки + фоновые записи)."""
        import asyncio
        loop = asyncio.get_event_loop()

        battle = self.active_battles[battle_id]
        self.cancel_turn_timer(battle)
        battle['battle_active'] = False
        duration_ms = int((datetime.now() - battle['started_at']).total_seconds() * 1000)

        player1 = battle['player1']
        player2 = battle['player2']

        winner = player1 if winner_id == player1['user_id'] else player2
        loser  = player2 if winner_id == player1['user_id'] else player1
        winner_user_id = winner.get('user_id')
        loser_user_id  = loser.get('user_id')
        is_test     = battle.get('is_test_battle', False)
        battle_mode = battle.get("mode", "normal")
        mode_meta   = dict(battle.get("mode_meta") or {})

        winner_live = dict(winner)
        loser_live  = dict(loser)
        if not is_test:
            futs = {}
            if winner_user_id is not None:
                futs['winner'] = loop.run_in_executor(
                    None, db.get_or_create_player, winner_user_id, winner.get("username") or ""
                )
            if loser_user_id is not None:
                futs['loser'] = loop.run_in_executor(
                    None, db.get_or_create_player, loser_user_id, loser.get("username") or ""
                )
            if futs:
                vals = await asyncio.gather(*futs.values(), return_exceptions=True)
                done = dict(zip(futs.keys(), vals))
                if 'winner' in done and not isinstance(done['winner'], Exception):
                    winner_live = done['winner']
                if 'loser' in done and not isinstance(done['loser'], Exception):
                    loser_live = done['loser']

        winner_locked = self._is_profile_reset_locked(winner_user_id) or self._is_stale_after_profile_reset(winner_live, battle["started_at"])
        loser_locked  = self._is_profile_reset_locked(loser_user_id)  or self._is_stale_after_profile_reset(loser_live,  battle["started_at"])

        # Меньшие награды за победу по AFK (в тестовом бою не начисляются)
        gold_reward = 0 if is_test else (VICTORY_GOLD // 2)
        # Половина табличного XP за победу (как обычная победа, но из той же xp_per_win)
        bx = victory_xp_for_player_level(int(winner_live.get('level', PLAYER_START_LEVEL)))
        exp_reward = 0 if is_test else (max(1, bx // 2) if bx else 0)
        did_level_afk = False
        level_up_level = None

        # Обновляем статистику
        streak_bonus_afk = 0
        new_ws_afk = 0
        winner_stats    = None
        loser_stats     = None
        afk_elo_delta_l = 0
        if not is_test and winner_user_id is not None and not winner_locked:
            new_ws_afk = winner_live.get('win_streak', 0) + 1
            total_g = winner_live.get('gold', 0) + gold_reward
            if new_ws_afk > 0 and new_ws_afk % STREAK_BONUS_EVERY == 0:
                streak_bonus_afk = STREAK_BONUS_GOLD
                total_g += streak_bonus_afk
            pl = dict(winner_live)
            pl['gold'] = total_g
            exp_patch, did_level_afk = self._exp_progression_updates(pl, exp_reward, max_level_ups=1)
            if did_level_afk:
                level_up_level = exp_patch['level']
            _is_pvp_afk = not battle.get("is_bot2")
            if _is_pvp_afk and battle_mode != "titan":
                _elo_k2 = 32
                _r_w2   = int(winner_live.get('rating', 1000))
                _r_l2   = int(loser_live.get('rating', 1000))
                _e_w2   = 1.0 / (1.0 + 10.0 ** ((_r_l2 - _r_w2) / 400.0))
                _e_l2   = 1.0 - _e_w2
                afk_elo_delta_w = max(1, round(_elo_k2 * (1.0 - _e_w2)))
                afk_elo_delta_l = min(-1, round(_elo_k2 * (0.0 - _e_l2)))
            else:
                afk_elo_delta_w = 0 if battle_mode == "titan" else 5
                afk_elo_delta_l = 0
            winner_stats = {
                'wins':           winner_live.get('wins', 0) + 1,
                'gold':           exp_patch['gold'],
                'exp':            exp_patch['exp'],
                'level':          exp_patch['level'],
                'free_stats':     exp_patch['free_stats'],
                'exp_milestones': exp_patch['exp_milestones'],
                'max_hp':         exp_patch['max_hp'],
                'current_hp':     int(exp_patch['max_hp']) if battle.get('is_bot2') else exp_patch['current_hp'],
                'rating':         int(winner_live.get('rating', 1000)) + afk_elo_delta_w,
                'win_streak':     new_ws_afk,
            }

        if not is_test and loser_user_id is not None and not loser_locked:
            loser_stats = {
                'losses': loser_live.get('losses', 0) + 1,
                'win_streak': 0,
                'rating': max(100, int(loser_live.get('rating', 1000)) + (afk_elo_delta_l if not is_test else 0)),
            }
            if battle.get('is_bot2'):
                loser_stats['current_hp'] = int(loser.get('max_hp', PLAYER_START_MAX_HP))

        # Titan progress (нужен в результате)
        titan_progress = None
        if not is_test and battle_mode == "titan" and player1.get("user_id") is not None:
            floor = max(1, int(mode_meta.get("floor", 1)))
            try:
                if winner_id == player1["user_id"] and not winner_locked:
                    titan_progress = await loop.run_in_executor(None, db.titan_on_win, player1["user_id"], floor)
                elif winner_id != player1["user_id"] and not loser_locked:
                    titan_progress = await loop.run_in_executor(None, db.titan_on_loss, player1["user_id"], floor)
            except Exception as _te:
                logger.warning("titan_progress afk error: %s", _te)

        n_rounds   = len(battle['rounds'])
        battle_data = {
            'player1_id': player1['user_id'],
            'player2_id': player2.get('user_id') or player2.get('bot_id'),
            'is_bot1':   battle['is_bot1'],
            'is_bot2':   battle['is_bot2'],
            'winner_id': winner_id,
            'result':    'afk_defeat',
            'rounds':    n_rounds,
            'details':   {'reason': 'AFK defeat', 'mode': battle_mode, 'mode_meta': mode_meta}
        }

        human_won = winner_id == player1['user_id']
        combat_log_html = '\n\n'.join(battle.get('combat_log_lines', []))
        dmg_to_opp, dmg_to_you = self._battle_damage_totals(battle)
        result = {
            'status': 'battle_ended_afk',
            'winner': self._entity_name(winner),
            'loser': self._entity_name(loser),
            'winner_id': winner_id,
            'human_won': human_won,
            'reason': 'Противник неактивен (3 пропуска)',
            'rounds': len(battle['rounds']),
            'damage_to_opponent': dmg_to_opp,
            'damage_to_you': dmg_to_you,
            'gold_reward': (gold_reward if human_won else DEFEAT_GOLD) if not winner_locked else 0,
            'exp_reward': (exp_reward if human_won else 0) if not winner_locked else 0,
            'level_up': bool(did_level_afk) if not is_test else False,
            'level_up_level': level_up_level if not is_test else None,
            'duration_ms': duration_ms,
            'combat_log_html': combat_log_html,
            'is_test_battle': is_test,
            # P2-centric поля (PvP)
            'p2_gold_reward': DEFEAT_GOLD if human_won else gold_reward,
            'p2_exp_reward': 0 if human_won else exp_reward,
            'p2_xp_boosted': False,
            'p2_streak_bonus_gold': 0,
            'p2_win_streak': 0 if human_won else (winner.get('win_streak', 0) + 1 if not is_test else 0),
            'p2_level_up': (bool(did_level_afk) if not human_won else False) if not is_test else False,
            'p2_level_up_level': (level_up_level if not human_won else None) if not is_test else None,
            'pvp_p1_user_id': player1['user_id'] if not battle['is_bot2'] else None,
            'pvp_p2_user_id': player2.get('user_id') if not battle['is_bot2'] else None,
            'pvp_p1_ui_message': dict(battle['ui_message']) if not battle['is_bot2'] and battle.get('ui_message') else None,
            'pvp_p2_ui_message': dict(battle['ui_message_p2']) if not battle['is_bot2'] and battle.get('ui_message_p2') else None,
            'mode': battle_mode,
            'mode_meta': mode_meta,
            'titan_progress': titan_progress,
        }
        if battle.get('is_bot2') and player1.get('user_id') is not None:
            self.remember_battle_end_ui(player1['user_id'], result)
        elif not battle.get('is_bot2'):
            if player1.get('user_id') is not None:
                self.remember_battle_end_ui(player1['user_id'], result)
            if player2.get('user_id') is not None:
                self.remember_battle_end_ui(player2['user_id'], result)

        # Очищаем память
        if player1['user_id'] in self.battle_queue:
            del self.battle_queue[player1['user_id']]
        if not battle['is_bot2'] and player2.get('user_id') in self.battle_queue:
            del self.battle_queue[player2['user_id']]
        del self.active_battles[battle_id]

        # Фоновые DB-записи
        event_name = 'battle_test_ended_afk' if is_test else 'battle_ended_afk'
        logger.info("event=%s winner_id=%s rounds=%s duration_ms=%s", event_name, winner_id, n_rounds, duration_ms)
        asyncio.create_task(self._persist_battle_writes(
            winner_user_id, loser_user_id,
            winner_stats, loser_stats,
            winner_locked, loser_locked,
            battle_data, battle_mode, is_test,
            winner_id, n_rounds, duration_ms,
        ))

        return result

    def _exp_progression_updates(self, player: Dict, exp_gained: int, max_level_ups: int = 1) -> Tuple[Dict, bool]:
        """
        Начислить опыт: промежуточные +1 стат по «апам» из таблицы (пороги need*k/steps),
        ап уровня — награды из progression.json. exp_milestones — битовая маска пройденных апов на текущей полоске.
        Сигнальные уровни (каждые 10): доп. статы + золото + алмазы из diamonds_on_reach.
        """
        exp = int(player.get('exp', 0)) + int(exp_gained)
        level = max(1, int(player.get('level', PLAYER_START_LEVEL)))
        mask = int(player.get('exp_milestones', 0) or 0)
        free_stats = int(player.get('free_stats', 0) or 0)
        gold = int(player.get('gold', 0) or 0)
        diamonds = int(player.get('diamonds', 0) or 0)
        max_hp = int(player.get('max_hp', PLAYER_START_MAX_HP))
        current_hp = int(player.get('current_hp', max_hp))

        leveled = False
        gained_levels = 0
        while level < MAX_LEVEL:
            need = exp_needed_for_next_level(level)
            if need <= 0:
                break
            steps = intermediate_ap_steps_for_level(level)
            if steps < 1:
                steps = 1
            for k in range(1, steps + 1):
                # Ап на полоске должен выдаваться до апа уровня (по таблице XP на 1 ап).
                thr = (need * k) // (steps + 1)
                if thr <= 0:
                    continue
                bit = 1 << (k - 1)
                if bit > 255:
                    break
                if exp >= thr and not (mask & bit):
                    free_stats += 1
                    mask |= bit
            if exp < need:
                break
            if gained_levels >= max(1, int(max_level_ups)):
                # Защита от аномалий (дубли итогов/гонки): максимум +N уровней за один бой.
                exp = min(exp, max(0, need - 1))
                break
            exp -= need
            level += 1
            gained_levels += 1
            leveled = True
            mask = 0
            gold     += gold_when_reaching_level(level)
            max_hp   += hp_when_reaching_level(level)
            current_hp = max_hp
            free_stats += stats_when_reaching_level(level)
            diamonds += diamonds_when_reaching_level(level)  # 0 на обычных, >0 на сигнальных (×10)

        return (
            {
                'exp':            exp,
                'level':          level,
                'exp_milestones': mask,
                'free_stats':     free_stats,
                'gold':           gold,
                'diamonds':       diamonds,
                'max_hp':         max_hp,
                'current_hp':     current_hp,
            },
            leveled,
        )
    
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

# Глобальный экземпляр системы боев
battle_system = BattleSystem()
