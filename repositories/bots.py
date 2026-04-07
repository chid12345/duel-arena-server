"""
repositories/bots.py — боты: генерация, ребаланс, поиск оппонента.
"""

from __future__ import annotations

import random
import uuid
from typing import Any, Dict, Optional, Tuple

from config import (
    BOT_COUNT_BY_LEVEL,
    BOT_MATCH_LEVEL_RANGE_MAX,
    BOT_MATCH_LEVEL_STRICTNESS,
    BOT_NAMES,
    BOT_PREFIXES,
    MAX_LEVEL,
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    PLAYER_START_FREE_STATS,
    PLAYER_START_MAX_HP,
    PLAYER_START_STRENGTH,
    STAMINA_PER_FREE_STAT,
    TARGET_BOT_POPULATION,
)


class BotsMixin:
    """Mixin: генерация и управление ботами."""

    def _compute_bot_stats_for_level(self, level: int) -> Tuple[int, int, int, int]:
        from progression_loader import stats_when_reaching_level, hp_when_reaching_level, intermediate_ap_steps_for_level
        lv = max(1, min(MAX_LEVEL, int(level)))
        total_free = PLAYER_START_FREE_STATS
        auto_hp = 0
        for l in range(1, lv + 1):
            total_free += stats_when_reaching_level(l)
            auto_hp += hp_when_reaching_level(l)
            if l < lv:
                total_free += intermediate_ap_steps_for_level(l)

        arch = random.choice(("balanced", "brute", "skirmisher", "tank", "intuition"))
        weights = {
            "balanced":   (2, 2, 2, 2),
            "brute":      (4, 1, 1, 2),
            "skirmisher": (1, 4, 1, 2),
            "tank":       (1, 1, 1, 5),
            "intuition":  (1, 1, 4, 2),
        }
        ws, we, wc, wh = weights[arch]
        total_w = ws + we + wc + wh
        jitter = random.randint(-(total_free * 15 // 100), total_free * 15 // 100)
        tf = max(0, total_free + jitter)
        pts_s = (tf * ws) // total_w
        pts_e = (tf * we) // total_w
        pts_c = (tf * wc) // total_w
        pts_h = tf - pts_s - pts_e - pts_c

        s  = max(1, PLAYER_START_STRENGTH + pts_s)
        e  = max(1, PLAYER_START_ENDURANCE + pts_e)
        c  = max(1, PLAYER_START_CRIT + pts_c)
        hp = max(PLAYER_START_MAX_HP, PLAYER_START_MAX_HP + auto_hp + pts_h * STAMINA_PER_FREE_STAT)
        return s, e, c, hp

    def _generate_bot_data(self, level: int):
        level = max(1, min(MAX_LEVEL, int(level)))
        if level <= 10:
            bot_type = "novice"
            prefix = random.choice(BOT_PREFIXES["novice"])
        elif level <= 30:
            bot_type = "warrior"
            prefix = random.choice(BOT_PREFIXES["warrior"])
        elif level <= 50:
            bot_type = "master"
            prefix = random.choice(BOT_PREFIXES["master"])
        else:
            bot_type = "legend"
            prefix = random.choice(BOT_PREFIXES["legend"])
        name = f"{prefix}_{random.choice(BOT_NAMES)}_{uuid.uuid4().hex[:8]}"
        strength, endurance, crit, max_hp = self._compute_bot_stats_for_level(level)
        ai_pattern = random.choice(("aggressive", "defensive", "balanced"))
        return (name, level, strength, endurance, crit, max_hp, max_hp, bot_type, ai_pattern)

    def _insert_bot_row(self, cursor, bot_tuple: Tuple[Any, ...]) -> None:
        cursor.execute(
            "INSERT OR IGNORE INTO bots "
            "(name, level, strength, endurance, crit, max_hp, current_hp, bot_type, ai_pattern) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            bot_tuple,
        )

    @staticmethod
    def _normalize_bot_dict(row_dict: Dict) -> Dict:
        d = dict(row_dict)
        if d.get("crit") is None:
            d["crit"] = PLAYER_START_CRIT
        return d

    def _random_bot_level_above_10(self) -> int:
        hi = min(100, int(MAX_LEVEL))
        lo = 11
        if hi < lo:
            return max(1, min(10, int(MAX_LEVEL)))
        r = random.random()
        if r < 0.50:
            return random.randint(lo, min(30, hi))
        if r < 0.80:
            a, b = max(lo, 31), min(50, hi)
            return random.randint(a, b) if a <= b else random.randint(lo, hi)
        a, b = max(lo, 51), hi
        return random.randint(a, b) if a <= b else random.randint(lo, hi)

    def rebalance_all_bots(self, conn=None) -> None:
        """Пересчитать статы всех ботов по кривой уровня."""
        own_conn = conn is None
        if own_conn:
            conn = self.get_connection()
        cursor = conn.cursor()
        batch_commit = 60 if self._pg else 10**9
        n_done = 0
        try:
            cursor.execute("SELECT bot_id, level FROM bots")
            rows = cursor.fetchall()
            for row in rows:
                bid = int(row["bot_id"])
                lvl = int(row["level"])
                s, e, c, hp = self._compute_bot_stats_for_level(lvl)
                cursor.execute(
                    "UPDATE bots SET strength = ?, endurance = ?, crit = ?, max_hp = ?, current_hp = ? WHERE bot_id = ?",
                    (s, e, c, hp, hp, bid),
                )
                n_done += 1
                if self._pg and n_done % batch_commit == 0:
                    conn.commit()
            conn.commit()
        finally:
            if own_conn:
                conn.close()

    def create_initial_bots(self, conn=None):
        """Дополнить популяцию по таблице BOT_COUNT_BY_LEVEL, затем до TARGET_BOT_POPULATION."""
        own_conn = conn is None
        if own_conn:
            conn = self.get_connection()
        cursor = conn.cursor()
        batch_commit_every = 80
        inserted = 0
        try:
            for level, want in sorted(BOT_COUNT_BY_LEVEL.items()):
                cursor.execute("SELECT COUNT(*) AS cnt FROM bots WHERE level = ?", (level,))
                have = int(cursor.fetchone()["cnt"])
                need = max(0, int(want) - have)
                for _ in range(need):
                    bot_data = self._generate_bot_data(level)
                    self._insert_bot_row(cursor, bot_data)
                    inserted += 1
                    if inserted % batch_commit_every == 0:
                        conn.commit()

            cursor.execute("SELECT COUNT(*) AS cnt FROM bots")
            total = int(cursor.fetchone()["cnt"])
            extra_slots = max(0, int(TARGET_BOT_POPULATION) - total)
            for _ in range(extra_slots):
                level = self._random_bot_level_above_10()
                self._insert_bot_row(cursor, self._generate_bot_data(level))
                inserted += 1
                if inserted % batch_commit_every == 0:
                    conn.commit()
            conn.commit()
        finally:
            if own_conn:
                conn.close()

    def find_suitable_opponent(self, player_level: int, is_bot_search: bool = True) -> Optional[Dict]:
        """Кольца ±0, ±1, ±2… от центра. Вес 1/(1+K·d²). Если пусто — создаётся бот."""
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
                return self._normalize_bot_dict(dict(row)) if row else None
            bots = [self._normalize_bot_dict(dict(r)) for r in rows]
            weights = [1.0 / (1.0 + BOT_MATCH_LEVEL_STRICTNESS * abs(int(b["level"]) - center) ** 2) for b in bots]
            return random.choices(bots, weights=weights, k=1)[0]
        finally:
            conn.close()
