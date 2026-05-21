"""tests/test_sudden_death.py — бой без лимита раундов + «внезапная смерть».

С раунда SUDDEN_DEATH_ROUND отключается лечение, поэтому даже бой двух
«лекарей» (огромный реген) гарантированно заканчивается нокаутом, а не висит
вечно. Также проверяем, что старого жёсткого лимита в 30 раундов больше нет.
"""
from __future__ import annotations

import asyncio

from config import MAX_BATTLE_ROUNDS, SUDDEN_DEATH_ROUND


def test_round_limits_sane():
    assert SUDDEN_DEATH_ROUND == 60
    assert MAX_BATTLE_ROUNDS == 200
    assert SUDDEN_DEATH_ROUND < MAX_BATTLE_ROUNDS


def _player(uid: int) -> dict:
    # Низкий урон + ОГРОМНЫЙ реген сапог: до внезапной смерти никто не умирает.
    return {
        "user_id": uid, "level": 10, "strength": 10, "endurance": 10, "crit": 3,
        "max_hp": 600, "current_hp": 600, "username": f"sd{uid}",
        "wins": 0, "losses": 0, "gold": 0, "exp": 0, "rating": 1000,
        "win_streak": 0, "free_stats": 0, "diamonds": 0, "exp_milestones": 0,
        "warrior_type": "default", "_eq_regen_bonus": 5000,
    }


def test_sudden_death_ends_endless_regen_battle(db):
    """Бой двух мощных «лекарей» обязан закончиться нокаутом и уйти за старый лимит 30."""
    from battle_system import BattleSystem

    class _SimBS(BattleSystem):
        def schedule_turn_timer(self, battle_id):
            return None

    bs = _SimBS()
    p1, p2 = _player(950001), _player(950002)

    async def run():
        await bs.start_battle(p1, p2, is_bot2=True, is_test_battle=True)
        uid = p1["user_id"]
        last = None
        for _ in range(MAX_BATTLE_ROUNDS + 10):
            r = await bs.submit_auto_round(uid)
            if r.get("error"):
                break
            last = r
            if r.get("status") in ("battle_ended", "battle_ended_afk"):
                break
        return last

    res = asyncio.run(run())
    assert res is not None
    assert res.get("status") in ("battle_ended", "battle_ended_afk"), (
        f"Бой должен закончиться нокаутом, а не зависнуть: {res.get('status')}"
    )
    rounds = int(res.get("rounds") or 0)
    # До внезапной смерти (60) реген держит обоих живыми → бой ушёл далеко за старый лимит 30.
    assert rounds > 30, f"Старого лимита 30 раундов быть не должно (rounds={rounds})"
    # И при этом завершился в пределах аварийного предохранителя.
    assert rounds <= MAX_BATTLE_ROUNDS, f"rounds={rounds} превысил предохранитель"
