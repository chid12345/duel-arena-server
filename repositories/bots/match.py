"""Поиск соперника-бота."""

from __future__ import annotations

import random
from typing import Dict, Optional

from config import BOT_MATCH_LEVEL_RANGE_MAX, BOT_MATCH_LEVEL_STRICTNESS, MAX_LEVEL
from repositories.bots.personas import apply_persona_to_bot


class BotsMatchMixin:
    def find_suitable_opponent(self, player_level: int, is_bot_search: bool = True) -> Optional[Dict]:
        """Кольца ±0, ±1, ±2… от центра. Вес 1/(1+K·d²). Если пусто — создаётся бот.

        Каждый раз бот получает persona-статус (новичок/фармила/мажор/донатер)
        + виртуальную экипировку + индивидуальный разброс — это «живые задроты»,
        а не зеркало уровня игрока.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            if not is_bot_search:
                return None
            center = max(1, min(MAX_LEVEL, int(player_level)))
            rows = []
            for span in range(0, BOT_MATCH_LEVEL_RANGE_MAX + 1):
                lo = max(0, center - span)
                hi = min(MAX_LEVEL, center + span)
                cursor.execute("SELECT * FROM bots WHERE level BETWEEN ? AND ?", (lo, hi))
                rows = cursor.fetchall()
                if rows:
                    break
            if not rows:
                bot_t = self._generate_bot_data(center)
                self._insert_bot_row(cursor, bot_t)
                conn.commit()
                cursor.execute("SELECT * FROM bots WHERE name = ?", (bot_t[0],))
                row = cursor.fetchone()
                if not row:
                    return None
                bot = self._normalize_bot_dict(dict(row))
                return apply_persona_to_bot(bot, center)
            bots = [self._normalize_bot_dict(dict(r)) for r in rows]
            weights = [1.0 / (1.0 + BOT_MATCH_LEVEL_STRICTNESS * abs(int(b["level"]) - center) ** 2) for b in bots]
            chosen = random.choices(bots, weights=weights, k=1)[0]
            return apply_persona_to_bot(chosen, int(chosen.get("level", center)))
        finally:
            conn.close()
