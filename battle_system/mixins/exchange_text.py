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

class BattleExchangeMixin:
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
