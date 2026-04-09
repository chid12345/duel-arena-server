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

class BattleCombatLogMixin:
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
