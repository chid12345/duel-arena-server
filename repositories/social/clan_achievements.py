"""Достижения клана: разблокируются по wins (100/500/1000)
и/или season_score / clan_xp. Записываются в clan_achievements
один раз (UNIQUE по clan_id + key).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# Список достижений: ключ → (название, описание, иконка, поле, порог)
CLAN_ACHIEVEMENTS = [
    # Победы клана
    ("wins_100",   "100 побед",   "Сотня боёв позади",       "🥉", "wins", 100),
    ("wins_500",   "500 побед",   "Грозная сила",            "🥈", "wins", 500),
    ("wins_1000",  "1000 побед",  "Легенда арены",           "🥇", "wins", 1000),
    # Очки сезона (одно достижение за активный сезон)
    ("season_50",  "50 очков сезона", "Активный клан",       "🏆", "season_score", 50),
    # Уровень клана
    ("level_5",    "Уровень 5",   "Клан крепчает",           "⚔️", "level", 5),
    ("level_10",   "Уровень 10",  "Опытный клан",            "💠", "level", 10),
]


class SocialClanAchMixin:

    def check_clan_achievements(self, clan_id: int) -> List[str]:
        """Проверить и записать новые достижения. Возвращает список ключей,
        которые разблокированы ИМЕННО СЕЙЧАС (для уведомлений)."""
        if not clan_id:
            return []
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT wins, COALESCE(season_score,0) as season_score, "
            "COALESCE(level,1) as level FROM clans WHERE id = ?",
            (int(clan_id),),
        )
        row = cursor.fetchone()
        if not row:
            conn.close()
            return []
        cur_vals = {"wins": int(row["wins"] or 0),
                    "season_score": int(row["season_score"] or 0),
                    "level": int(row["level"] or 1)}
        # Уже разблокированные
        cursor.execute(
            "SELECT achievement_key FROM clan_achievements WHERE clan_id = ?",
            (int(clan_id),),
        )
        unlocked = {r["achievement_key"] for r in cursor.fetchall()}
        new_keys: List[str] = []
        for key, _name, _desc, _icon, field, threshold in CLAN_ACHIEVEMENTS:
            if key in unlocked:
                continue
            if cur_vals.get(field, 0) >= threshold:
                try:
                    if self._pg:
                        cursor.execute(
                            "INSERT INTO clan_achievements (clan_id, achievement_key) "
                            "VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (int(clan_id), key),
                        )
                    else:
                        cursor.execute(
                            "INSERT OR IGNORE INTO clan_achievements (clan_id, achievement_key) "
                            "VALUES (?, ?)",
                            (int(clan_id), key),
                        )
                    cursor.execute(
                        "INSERT INTO clan_history (clan_id, event_type, actor_id, actor_name, extra) "
                        "VALUES (?, 'achievement', 0, '', ?)",
                        (int(clan_id), key),
                    )
                    new_keys.append(key)
                except Exception as e:
                    logger.warning("achievement insert failed: %s", e)
        if new_keys:
            conn.commit()
        conn.close()
        return new_keys

    def get_clan_achievements(self, clan_id: int) -> List[Dict[str, Any]]:
        """Список всех достижений клана (с unlocked-флагом)."""
        if not clan_id:
            return []
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT achievement_key, unlocked_at FROM clan_achievements WHERE clan_id = ?",
            (int(clan_id),),
        )
        unlocked = {r["achievement_key"]: r["unlocked_at"] for r in cursor.fetchall()}
        conn.close()
        out = []
        for key, name, desc, icon, _field, threshold in CLAN_ACHIEVEMENTS:
            out.append({
                "key": key,
                "name": name,
                "description": desc,
                "icon": icon,
                "threshold": threshold,
                "unlocked": key in unlocked,
                "unlocked_at": unlocked.get(key),
            })
        return out
