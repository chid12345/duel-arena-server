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

class BattleStateMixin:
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
        """Пока у игрока меньше ONBOARDING_BATTLES_EASY завершённых боёв — бот слабее (урон и пул HP).

        Раньше использовалось max(5,...) — на Lv1 бот с STR=4 «усиливался» до STR=5.
        Теперь умножаем без подъёма до пола — новичок получает реально слабого противника.
        """
        b = dict(bot)
        m = ONBOARDING_BOT_STAT_MULT
        b["max_hp"] = max(30, int(b.get("max_hp", 100) * m))
        b["current_hp"] = b["max_hp"]
        b["strength"] = max(1, int(b.get("strength", 10) * m))
        b["endurance"] = max(1, int(b.get("endurance", 10) * m))
        c0 = b.get("crit") or PLAYER_START_CRIT
        b["crit"] = max(1, int(int(c0) * m))
        return b


