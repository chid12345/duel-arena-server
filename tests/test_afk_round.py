"""tests/test_afk_round.py — наказание за пропуск хода (Вариант А), PvE и PvP.

Пропустил ход → бьёшь на 0, получаешь ЧИСТЫЙ удар без блока/уклона, контрудара нет.
3 пропуска подряд = поражение. Работает для любого из двоих и в PvP.
"""
from __future__ import annotations

import asyncio

from config import AFK_ROUNDS_TO_DEFEAT


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


def test_pvp_p2_silent_takes_clean_hit_and_strike(db):
    bs = _bs()

    async def run():
        bid = await bs.start_battle(_player(810001), _player(810002), is_bot2=False, is_test_battle=True)
        b = bs.active_battles[bid]
        b['player1_choices'] = {'attack': 'ГОЛОВА', 'defense': 'ТУЛОВИЩЕ'}
        b['player2_choices'] = {}  # P2 молчит
        hp1, hp2 = b['player1']['current_hp'], b['player2']['current_hp']
        await bs.process_turn_timeout(bid, b['turn_serial'])
        return bs.active_battles.get(bid), hp1, hp2

    b, hp1, hp2 = asyncio.run(run())
    assert b is not None
    assert b['player2']['current_hp'] < hp2, "молчун получает чистый удар"
    assert b['player1']['current_hp'] == hp1, "активный игрок урона не получает (контрудара нет)"
    assert b['player2_consecutive_afk'] == 1
    assert b['player1_consecutive_afk'] == 0


def test_pvp_both_silent_no_damage_both_strike(db):
    bs = _bs()

    async def run():
        bid = await bs.start_battle(_player(820001), _player(820002), is_bot2=False, is_test_battle=True)
        b = bs.active_battles[bid]
        b['player1_choices'] = {}
        b['player2_choices'] = {}
        hp1, hp2 = b['player1']['current_hp'], b['player2']['current_hp']
        await bs.process_turn_timeout(bid, b['turn_serial'])
        return bs.active_battles.get(bid), hp1, hp2

    b, hp1, hp2 = asyncio.run(run())
    assert b['player1']['current_hp'] == hp1 and b['player2']['current_hp'] == hp2, "оба молчат — урона нет"
    assert b['player1_consecutive_afk'] == 1 and b['player2_consecutive_afk'] == 1


def test_pvp_three_strikes_loses(db):
    bs = _bs()

    async def run():
        bid = await bs.start_battle(_player(830001), _player(830002), is_bot2=False, is_test_battle=True)
        last = None
        for _ in range(AFK_ROUNDS_TO_DEFEAT):
            b = bs.active_battles.get(bid)
            if not b:
                break
            b['player1_choices'] = {}  # P1 молчит каждый раунд
            b['player2_choices'] = {'attack': 'ТУЛОВИЩЕ', 'defense': 'ТУЛОВИЩЕ'}
            last = await bs.process_turn_timeout(bid, b['turn_serial'])
        return bid, last

    bid, last = asyncio.run(run())
    assert bid not in bs.active_battles, "после 3 пропусков бой завершается"
    assert last and last.get('status') in ('battle_ended', 'battle_ended_afk')


def test_pve_p1_silent_takes_hit_deals_zero(db):
    bs = _bs()

    async def run():
        bot = _player(840002)
        bot['bot_id'] = 840002
        bid = await bs.start_battle(_player(840001), bot, is_bot2=True, is_test_battle=True)
        b = bs.active_battles[bid]
        b['player1_choices'] = {}  # игрок молчит
        hp_bot, hp_p1 = b['player2']['current_hp'], b['player1']['current_hp']
        await bs.process_turn_timeout(bid, b['turn_serial'])
        return bs.active_battles.get(bid), hp_bot, hp_p1

    b, hp_bot, hp_p1 = asyncio.run(run())
    assert b is not None
    assert b['player2']['current_hp'] == hp_bot, "бот урона не получает — игрок бил на 0"
    assert b['player1']['current_hp'] < hp_p1, "игрок получает чистый удар от бота"
    assert b['player1_consecutive_afk'] == 1
