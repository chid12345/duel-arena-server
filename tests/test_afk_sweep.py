"""tests/test_afk_sweep.py — фоновый свипер зависших боёв мини-аппа.

Свипер засчитывает пропуск хода server-side (фикс зависания PvP при закрытом
приложении). Telegram-бои (ui_message задан) не трогает; свежие бои (дедлайн в
будущем) не трогает.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

from jobs.afk_sweep import afk_sweep_once


def _bs():
    from battle_system import BattleSystem

    class SimBS(BattleSystem):
        def schedule_turn_timer(self, battle_id):
            return None

    return SimBS()


def _player(uid, hp=10000):
    return {
        "user_id": uid, "level": 10, "strength": 20, "endurance": 10, "crit": 5,
        "max_hp": hp, "current_hp": hp, "username": f"u{uid}",
        "wins": 0, "losses": 0, "gold": 0, "exp": 0, "rating": 1000,
        "win_streak": 0, "free_stats": 0, "diamonds": 0, "exp_milestones": 0,
        "warrior_type": "default",
    }


def test_sweep_processes_expired_tma_battle(db):
    bs = _bs()

    async def run():
        bid = await bs.start_battle(_player(910001), _player(910002), is_bot2=False, is_test_battle=True)
        b = bs.active_battles[bid]
        b['player1_choices'] = {'attack': 'ГОЛОВА', 'defense': 'ТУЛОВИЩЕ'}
        b['player2_choices'] = {}  # P2 закрыл приложение
        b['next_turn_deadline'] = datetime.now() - timedelta(seconds=30)
        n = await afk_sweep_once(bs)
        return n, bs.active_battles.get(bid)

    n, b = asyncio.run(run())
    assert n == 1, "свипер должен обработать просроченный TMA-бой"
    assert b is not None and b['player2_consecutive_afk'] == 1


def test_sweep_skips_telegram_battle(db):
    bs = _bs()

    async def run():
        bid = await bs.start_battle(_player(920001), _player(920002), is_bot2=False, is_test_battle=True)
        b = bs.active_battles[bid]
        b['ui_message'] = {'chat_id': 1, 'message_id': 2}  # это Telegram-бой
        b['player2_choices'] = {}
        b['next_turn_deadline'] = datetime.now() - timedelta(seconds=30)
        return await afk_sweep_once(bs), bs.active_battles.get(bid)

    n, b = asyncio.run(run())
    assert n == 0, "Telegram-бои свипер не трогает"
    assert b['player1_consecutive_afk'] == 0 and b['player2_consecutive_afk'] == 0


def test_sweep_skips_fresh_battle(db):
    bs = _bs()

    async def run():
        bid = await bs.start_battle(_player(930001), _player(930002), is_bot2=False, is_test_battle=True)
        b = bs.active_battles[bid]
        b['player2_choices'] = {}
        b['next_turn_deadline'] = datetime.now() + timedelta(seconds=15)  # свежий ход
        return await afk_sweep_once(bs)

    n = asyncio.run(run())
    assert n == 0, "свежие бои (дедлайн в будущем) свипер не трогает"
