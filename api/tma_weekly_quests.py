"""Еженедельные квесты для TMA (статус и награды)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from database import db
from reward_calculator import calc_reward


def _iso_week_key() -> str:
    y, w, _ = datetime.utcnow().isocalendar()
    return f"{int(y)}-W{int(w):02d}"


def _weekly_quests_status(uid: int) -> Dict[str, Any]:
    week_key = _iso_week_key()
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        if db._pg:
            cursor.execute(
                """
                SELECT SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) AS wins
                FROM battles
                WHERE is_bot2 = FALSE
                  AND (player1_id = ? OR player2_id = ?)
                  AND created_at >= date_trunc('week', now())
                """,
                (uid, uid, uid),
            )
        else:
            cursor.execute(
                """
                SELECT SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) AS wins
                FROM battles
                WHERE is_bot2 = 0
                  AND (player1_id = ? OR player2_id = ?)
                  AND date(created_at) >= date('now', 'weekday 1', '-7 days')
                """,
                (uid, uid, uid),
            )
        row = cursor.fetchone() or {}
        pvp_wins = int(row.get("wins") or 0)
    finally:
        conn.close()

    titan = db.get_titan_progress(uid)
    weekly_floor = int(titan.get("weekly_best_floor", 0))
    streak = int((db.get_or_create_player(uid, "") or {}).get("win_streak", 0))
    week_key = _iso_week_key()
    endless_weekly = db.endless_get_weekly_progress(uid, week_key)
    endless_weekly_wins = endless_weekly["weekly_wins"]
    endless_weekly_wave = endless_weekly["best_wave"]
    defs = [
        {
            "key": "weekly_pvp_wins_10",
            "cur": pvp_wins,
            "max": 10,
            "difficulty": "medium",
            "frequency": "weekly",
            "label": "⚔️ Охотник на игроков",
            "desc": "Настоящая слава — только в бою с живым противником. Победите 10 реальных игроков в PvP за эту неделю.",
        },
        {
            "key": "weekly_titan_floor_5",
            "cur": weekly_floor,
            "max": 5,
            "difficulty": "hard",
            "frequency": "weekly",
            "label": "🏰 Покоритель Башни",
            "desc": "Башня Титанов стоит веками. Поднимитесь до 5-го этажа и докажите, что вы достойны звания Титана.",
        },
        {
            "key": "weekly_streak_5",
            "cur": streak,
            "max": 5,
            "difficulty": "medium",
            "frequency": "weekly",
            "label": "🔥 Полоса победы",
            "desc": "Пять побед подряд — это характер, не удача. Соберите серию из 5 побед без единого поражения.",
        },
        {
            "key": "weekly_endless_wins_10",
            "cur": endless_weekly_wins,
            "max": 10,
            "difficulty": "hard",
            "frequency": "weekly",
            "label": "💀 Мясорубка Натиска",
            "desc": "Они идут волна за волной и не знают страха. Уничтожьте 10 врагов в режиме Натиск.",
        },
        {
            "key": "weekly_endless_wave_5",
            "cur": endless_weekly_wave,
            "max": 5,
            "difficulty": "epic",
            "frequency": "weekly",
            "label": "🌊 До пятой волны",
            "desc": "Немногие видели пятую волну Натиска — и пережили её. Доберитесь до 5-й волны.",
        },
    ]
    quests = []
    for q in defs:
        done = int(q["cur"]) >= int(q["max"])
        claimed = db.has_weekly_claim(uid, week_key, q["key"])
        gold, diamonds, xp = calc_reward(q["difficulty"], q["frequency"])
        quests.append(
            {
                "key": q["key"],
                "label": q["label"],
                "desc": q["desc"],
                "current": int(q["cur"]),
                "target": int(q["max"]),
                "is_completed": bool(done),
                "reward_claimed": bool(claimed),
                "reward_gold": gold,
                "reward_diamonds": diamonds,
                "reward_xp": xp,
            }
        )
    return {"week_key": week_key, "quests": quests}
