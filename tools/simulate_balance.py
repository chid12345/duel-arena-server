#!/usr/bin/env python3
"""
Монте-Карло симуляция боёв «игрок vs бот» для оценки баланса (без Telegram).

Запуск из корня проекта:
  python simulate_balance.py -n 500
  python simulate_balance.py -n 1000 --player-level 10 --bot-level 12 --seed 42
  python simulate_balance.py -n 2000 -o reports/balance_01.txt

Игрок и бот ходят случайно (как кнопка «Авто ход»). Итоги: доля побед, средние раунды и урон.
Флаг -o/--output — записать тот же отчёт в файл (UTF-8).
"""

from __future__ import annotations

import argparse
import asyncio
import os
import random
import sys
from datetime import datetime
from typing import List, Optional

# Корень проекта в PYTHONPATH
ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from config import BASE_ENDURANCE, BASE_HP, BASE_STRENGTH, MAX_LEVEL, PLAYER_START_CRIT

# Инициализация БД при импорте
from database import db  # noqa: F401
from battle_system import BattleSystem


class SimBattleSystem(BattleSystem):
    """Без таймеров asyncio — только логика раундов."""

    def schedule_turn_timer(self, battle_id: str) -> None:
        return None


def build_synthetic_player(level: int, user_id: int, rng: random.Random) -> dict:
    """Статы в духе генерации ботов: детерминированно от rng (один раз на прогон)."""
    total_stats = BASE_STRENGTH + BASE_ENDURANCE + (level * 6)
    strength = BASE_STRENGTH + rng.randint(level * 2, level * 3)
    endurance = BASE_ENDURANCE + (total_stats - BASE_STRENGTH - strength)
    max_hp = BASE_HP + (level * 10)
    crit = max(PLAYER_START_CRIT, PLAYER_START_CRIT + level // 3)
    return {
        'user_id': user_id,
        'level': level,
        'strength': strength,
        'endurance': endurance,
        'crit': crit,
        'max_hp': max_hp,
        'current_hp': max_hp,
        'username': 'SimPlayer',
        'wins': 0,
        'losses': 0,
        'gold': 0,
        'exp': 0,
        'rating': 1000,
        'win_streak': 0,
        'free_stats': 0,
        'diamonds': 0,
        'exp_milestones': 0,
    }


def fetch_bot(level_center: int) -> Optional[dict]:
    """Бот из БД: сначала обычный подбор, иначе случайный из окна уровня."""
    b = db.find_suitable_opponent(level_center)
    if b:
        return dict(b)
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        lo = max(1, level_center - 5)
        hi = min(MAX_LEVEL, level_center + 5)
        cur.execute(
            'SELECT * FROM bots WHERE level BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 1',
            (lo, hi),
        )
        row = cur.fetchone()
        if row:
            return dict(row)
        cur.execute('SELECT * FROM bots ORDER BY RANDOM() LIMIT 1')
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


async def run_one_battle(bs: SimBattleSystem, player: dict, bot: dict) -> dict:
    """Один бой: случайные атака/защита каждый раунд (как автоход)."""
    p = {**player, 'current_hp': player['max_hp']}
    b = {**bot, 'current_hp': bot['max_hp']}
    await bs.start_battle(p, b, is_bot2=True, is_test_battle=True)
    uid = p['user_id']
    for _ in range(600):
        r = await bs.submit_auto_round(uid)
        if r.get('error'):
            raise RuntimeError(r['error'])
        st = r.get('status')
        if st == 'battle_ended':
            return r
        if st == 'battle_ended_afk':
            return r
        if st != 'round_completed':
            raise RuntimeError(f'Неожиданный ответ боя: {r}')
    raise RuntimeError('Слишком много раундов (защита от зацикливания)')


def _build_report_lines(
    valid: int,
    player_level: int,
    bot_level: Optional[int],
    seed: Optional[int],
    wins: int,
    sum_rounds: int,
    sum_d_opp: int,
    sum_d_you: int,
) -> List[str]:
    bot_desc = str(bot_level) if bot_level is not None else 'как у игрока'
    lines = [
        f'Дата: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
        f'Команда: {" ".join(sys.argv)}',
        '',
        f'Боёв: {valid}  (ур. игрока {player_level}, цель подбора бота: {bot_desc})',
    ]
    if seed is not None:
        lines.append(f'seed: {seed}')
    lines.extend(
        [
            f'Побед игрока: {100.0 * wins / valid:.1f}% ({wins}/{valid})',
            f'Среднее раундов: {sum_rounds / valid:.2f}',
            f'Средний урон по врагу за бой: {sum_d_opp / valid:.1f} HP',
            f'Средний урон по вам за бой: {sum_d_you / valid:.1f} HP',
        ]
    )
    return lines


async def run_monte_carlo(
    n: int,
    player_level: int,
    bot_level: Optional[int],
    seed: Optional[int],
    output_path: Optional[str],
) -> None:
    rng = random.Random(seed)
    sim_uid = 900_000_001
    player_base = build_synthetic_player(player_level, sim_uid, rng)

    wins = 0
    sum_rounds = 0
    sum_d_opp = 0
    sum_d_you = 0
    valid = 0

    bs = SimBattleSystem()

    for i in range(n):
        p = {**player_base, 'current_hp': player_base['max_hp']}
        target_lv = bot_level if bot_level is not None else player_level
        bot = fetch_bot(target_lv)
        if not bot:
            print('В базе нет ботов. Запустите бота хотя бы раз, чтобы создалась таблица bots.')
            return

        r = await run_one_battle(bs, p, bot)
        valid += 1
        if r.get('human_won'):
            wins += 1
        rnd = int(r.get('rounds') or 0)
        sum_rounds += rnd
        sum_d_opp += int(r.get('damage_to_opponent') or 0)
        sum_d_you += int(r.get('damage_to_you') or 0)

    if valid == 0:
        return

    report_lines = _build_report_lines(
        valid, player_level, bot_level, seed, wins, sum_rounds, sum_d_opp, sum_d_you
    )
    report_text = '\n'.join(report_lines)
    print(report_text)

    if output_path:
        out = (
            output_path
            if os.path.isabs(output_path)
            else os.path.join(ROOT, output_path)
        )
        parent = os.path.dirname(out)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(out, 'w', encoding='utf-8', newline='\n') as f:
            f.write(report_text + '\n')
        print(f'\nОтчёт записан: {out}')


def main() -> None:
    ap = argparse.ArgumentParser(description='Симуляция баланса: игрок vs бот (случайные ходы).')
    ap.add_argument('-n', '--battles', type=int, default=500, help='Число боёв (по умолчанию 500)')
    ap.add_argument('--player-level', type=int, default=5, help='Уровень синтетического игрока')
    ap.add_argument('--bot-level', type=int, default=None, help='Центр подбора бота (по умолчанию = уровень игрока)')
    ap.add_argument('--seed', type=int, default=None, help='Seed RNG для воспроизводимости')
    ap.add_argument(
        '-o',
        '--output',
        type=str,
        default=None,
        metavar='FILE',
        help='Сохранить отчёт в файл (UTF-8); путь относительно папки проекта, если не абсолютный',
    )
    args = ap.parse_args()

    if args.battles < 1:
        ap.error('Число боёв должно быть >= 1')
    if not (1 <= args.player_level <= MAX_LEVEL):
        ap.error(f'Уровень игрока 1..{MAX_LEVEL}')
    if args.bot_level is not None and not (1 <= args.bot_level <= MAX_LEVEL):
        ap.error(f'Уровень бота 1..{MAX_LEVEL}')

    asyncio.run(
        run_monte_carlo(
            n=args.battles,
            player_level=args.player_level,
            bot_level=args.bot_level,
            seed=args.seed,
            output_path=args.output,
        )
    )


if __name__ == '__main__':
    main()
