"""
tests/test_bot_ai.py — «умные» боты-стратеги.

Покрывает:
- стратег блокирует самый ЧАСТЫЙ удар игрока (читает атаку),
- стратег бьёт в самую ОТКРЫТУЮ зону (где игрок реже защищается),
- при низком HP игрока стратег добивает в слабую защиту,
- простой бот (balanced) паттерны НЕ читает (низкие уровни остаются лёгкими).

Тесты статистические: гоняем много ходов и проверяем долю «умных» выборов
(порог взят с большим запасом ниже теоретического, чтобы не было flaky).
"""
from __future__ import annotations

from battle_system import battle_system

ZONES = ["ГОЛОВА", "ТУЛОВИЩЕ", "НОГИ"]
N = 500


def _run(bot, opp):
    a = {z: 0 for z in ZONES}
    d = {z: 0 for z in ZONES}
    for _ in range(N):
        ch = battle_system._get_bot_choice(dict(bot), dict(opp))
        a[ch["attack"]] += 1
        d[ch["defense"]] += 1
    return a, d


def test_strategist_blocks_most_common_attack():
    """Стратег ставит блок туда, куда игрок чаще всего бьёт."""
    bot = {"ai_pattern": "strategist", "current_hp": 1000, "max_hp": 1000}
    opp = {"current_hp": 1000, "max_hp": 1000,
           "_atk_history": ["ГОЛОВА"] * 8, "_def_history": []}
    _a, d = _run(bot, opp)
    assert d["ГОЛОВА"] / N > 0.55, f"Стратег должен блокировать частый удар, получили {d}"


def test_strategist_attacks_least_defended():
    """Стратег бьёт туда, где игрок защищается реже всего (ТУЛОВИЩЕ тут не защищают)."""
    bot = {"ai_pattern": "strategist", "current_hp": 1000, "max_hp": 1000}
    opp = {"current_hp": 1000, "max_hp": 1000,
           "_atk_history": [], "_def_history": ["ГОЛОВА", "ГОЛОВА", "ГОЛОВА", "НОГИ", "НОГИ"]}
    a, _d = _run(bot, opp)
    assert a["ТУЛОВИЩЕ"] / N > 0.45, f"Стратег должен бить в открытую зону, получили {a}"


def test_strategist_finishes_low_hp_enemy():
    """Игрок при смерти → стратег добивает в самую слабую защиту (почти всегда туда)."""
    bot = {"ai_pattern": "strategist", "current_hp": 900, "max_hp": 1000}
    opp = {"current_hp": 150, "max_hp": 1000,  # ~15% HP
           "_atk_history": [], "_def_history": ["ГОЛОВА", "ГОЛОВА", "НОГИ"]}  # ТУЛОВИЩЕ открыто
    a, _d = _run(bot, opp)
    assert a["ТУЛОВИЩЕ"] / N > 0.6, f"Добивание должно идти в открытую зону, получили {a}"


def test_dumb_bot_ignores_patterns():
    """Простой бот (balanced) не читает паттерны — низкие уровни остаются лёгкими."""
    bot = {"ai_pattern": "balanced", "current_hp": 1000, "max_hp": 1000}
    opp = {"current_hp": 1000, "max_hp": 1000,
           "_atk_history": ["ГОЛОВА"] * 8, "_def_history": ["ГОЛОВА"] * 8}
    _a, d = _run(bot, opp)
    # Если бы читал — блок ГОЛОВА был бы доминирующим. У тупого ~равномерно (~0.33).
    assert d["ГОЛОВА"] / N < 0.5, f"Простой бот не должен читать паттерны, получили {d}"


def test_bot_choice_returns_valid_zones():
    """Любой ход бота — валидные зоны (защита от мусора в формуле урона)."""
    bot = {"ai_pattern": "strategist", "current_hp": 500, "max_hp": 1000}
    opp = {"current_hp": 500, "max_hp": 1000, "_atk_history": [], "_def_history": []}
    ch = battle_system._get_bot_choice(bot, opp)
    assert ch["attack"] in ZONES and ch["defense"] in ZONES
