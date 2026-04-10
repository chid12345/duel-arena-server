"""Ядро: синтетический игрок, бот из БД, один бой."""

from __future__ import annotations

import random
from typing import Optional

from config import BASE_ENDURANCE, BASE_HP, BASE_STRENGTH, MAX_LEVEL, PLAYER_START_CRIT

from battle_system import BattleSystem
from database import db


class SimBattleSystem(BattleSystem):
    """Без таймеров asyncio — только логика раундов."""

    def schedule_turn_timer(self, battle_id: str) -> None:
        return None


def build_synthetic_player(level: int, user_id: int, rng: random.Random) -> dict:
    total_stats = BASE_STRENGTH + BASE_ENDURANCE + (level * 6)
    strength = BASE_STRENGTH + rng.randint(level * 2, level * 3)
    endurance = BASE_ENDURANCE + (total_stats - BASE_STRENGTH - strength)
    max_hp = BASE_HP + (level * 10)
    crit = max(PLAYER_START_CRIT, PLAYER_START_CRIT + level // 3)
    return {
        "user_id": user_id,
        "level": level,
        "strength": strength,
        "endurance": endurance,
        "crit": crit,
        "max_hp": max_hp,
        "current_hp": max_hp,
        "username": "SimPlayer",
        "wins": 0,
        "losses": 0,
        "gold": 0,
        "exp": 0,
        "rating": 1000,
        "win_streak": 0,
        "free_stats": 0,
        "diamonds": 0,
        "exp_milestones": 0,
    }


def fetch_bot(level_center: int) -> Optional[dict]:
    b = db.find_suitable_opponent(level_center)
    if b:
        return dict(b)
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        lo = max(1, level_center - 5)
        hi = min(MAX_LEVEL, level_center + 5)
        cur.execute(
            "SELECT * FROM bots WHERE level BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 1",
            (lo, hi),
        )
        row = cur.fetchone()
        if row:
            return dict(row)
        cur.execute("SELECT * FROM bots ORDER BY RANDOM() LIMIT 1")
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


async def run_one_battle(bs: SimBattleSystem, player: dict, bot: dict) -> dict:
    p = {**player, "current_hp": player["max_hp"]}
    b = {**bot, "current_hp": bot["max_hp"]}
    await bs.start_battle(p, b, is_bot2=True, is_test_battle=True)
    uid = p["user_id"]
    for _ in range(600):
        r = await bs.submit_auto_round(uid)
        if r.get("error"):
            raise RuntimeError(r["error"])
        st = r.get("status")
        if st == "battle_ended":
            return r
        if st == "battle_ended_afk":
            return r
        if st != "round_completed":
            raise RuntimeError(f"Неожиданный ответ боя: {r}")
    raise RuntimeError("Слишком много раундов (защита от зацикливания)")
