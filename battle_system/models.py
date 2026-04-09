"""Модели данных боя."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List

@dataclass
class BattleRound:
    """Данные раунда боя"""
    round_number: int
    player1_attack: str
    player1_defense: str
    player2_attack: str
    player2_defense: str
    player1_damage: int
    player2_damage: int
    player1_hp_before: int
    player2_hp_before: int
    player1_hp_after: int
    player2_hp_after: int
    round_events: List[str]

@dataclass
class BattleResult:
    """Результат боя"""
    winner_id: int
    loser_id: int
    rounds_played: int
    battle_log: List[str]
    rounds: List[BattleRound]
    gold_reward: int
    exp_reward: int
    rating_change: int
