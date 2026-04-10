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
    @staticmethod
    def _outcome_compact(outcome: str, dmg: int) -> str:
        """Компактный маркер исхода для 2-строчного лога."""
        t = set((outcome or "").split("_"))
        if outcome == "timeout":
            return "⏱ пропуск"
        if "block" in t:
            return "🛡 блок"
        if "miss" in t:
            return "✕ мимо"
        if "dodge" in t:
            return "🌪 уклон"
        if dmg <= 0:
            return "0"
        parts = [f"<b>−{dmg}</b>"]
        if "pierce" in t and "crit" in t:
            parts.append("⚡💥крит-пробой")
        elif "crit" in t:
            parts.append("⚡крит")
        elif "double" in t:
            parts.append("⚔×2")
        if "guard" in t:
            parts.append("🧱погл")
        if "fortress" in t:
            parts.append("🛡∞")
        if "break" in t:
            parts.append("🪓пролом")
        return " ".join(parts)

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
        """2-строчный текст размена: строка 1 — твой удар, строка 2 — удар врага."""
        a1 = p1_choices['attack']
        a2 = p2_choices['attack']
        acc1 = html_escape(self._zone_accusative(a1))
        acc2 = html_escape(self._zone_accusative(a2))
        op_name = html_escape(opponent_name)
        olv = int(opponent_level)

        you_marker = self._outcome_compact(out1, d1)
        en_marker  = self._outcome_compact(out2, d2)

        line1 = f"⚔️ <b>Р{round_num}</b>  Вы → {acc1}: {you_marker}"
        line2 = f"💢 {op_name}(ур.{olv}) → {acc2}: {en_marker}"
        return f"{line1}\n{line2}"
