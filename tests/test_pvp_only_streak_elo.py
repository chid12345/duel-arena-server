"""tests/test_pvp_only_streak_elo.py — серия побед и ELO считаются только в PvP.

После правки 2026-05-29 справка «Рейтинг (ELO)» обещает:
- «За бои с ботами рейтинг НЕ меняется» → PvE-победа = 0 ELO.
- «Качай через PvP. Серия из 5 побед = +30 бонусом.» → PvE не растит серию,
  бонус +30 капает только за каждую 5-ю PvP-победу подряд.

Покрытие чистых помощников из battle_system/end_battle_finalize.py.
"""
from __future__ import annotations

from battle_system.end_battle_finalize import (
    compute_elo_deltas,
    compute_player_win_streak,
    player_win_streak_after_loss,
)
from config import STREAK_BONUS_EVERY, STREAK_BONUS_GOLD


# ---------- Серия побед ----------


def test_pvp_win_increments_streak():
    """PvP-победа: +1 к серии, без бонуса если не кратно 5."""
    new, bonus = compute_player_win_streak(prev_streak=2, is_pvp_win=True)
    assert new == 3
    assert bonus == 0


def test_pvp_fifth_win_pays_streak_bonus():
    """5-я PvP-победа подряд → +30 золота бонусом."""
    new, bonus = compute_player_win_streak(prev_streak=4, is_pvp_win=True)
    assert new == 5
    assert bonus == STREAK_BONUS_GOLD == 30


def test_pvp_tenth_win_pays_streak_bonus_again():
    """Каждая кратная STREAK_BONUS_EVERY победа платит бонус."""
    new, bonus = compute_player_win_streak(prev_streak=9, is_pvp_win=True)
    assert new == 10
    assert bonus == STREAK_BONUS_GOLD


def test_pve_win_does_not_touch_streak():
    """Победа над ботом серию не растит и бонус не платит."""
    new, bonus = compute_player_win_streak(prev_streak=4, is_pvp_win=False)
    assert new == 4, "PvE-победа не должна инкрементить серию"
    assert bonus == 0


def test_pve_win_does_not_pay_bonus_at_multiple_of_five():
    """Даже если текущая серия = 5, PvE-победа не платит +30."""
    new, bonus = compute_player_win_streak(prev_streak=5, is_pvp_win=False)
    assert new == 5
    assert bonus == 0


def test_pvp_loss_resets_streak():
    """Поражение от живого игрока обнуляет серию."""
    assert player_win_streak_after_loss(prev_streak=4, is_pvp_loss=True) == 0


def test_pve_loss_keeps_streak():
    """Поражение от бота серию не трогает."""
    assert player_win_streak_after_loss(prev_streak=4, is_pvp_loss=False) == 4


def test_streak_bonus_constant_is_5_and_30():
    """Регрессия чисел из справки: 5 побед = +30."""
    assert STREAK_BONUS_EVERY == 5
    assert STREAK_BONUS_GOLD == 30


# ---------- ELO ----------


def test_pvp_equal_ratings_gives_symmetric_delta():
    """Равный рейтинг 1000 vs 1000: победитель +16, проигравший −16 (K=32)."""
    dw, dl = compute_elo_deltas(is_pvp=True, battle_mode="normal",
                                winner_rating=1000, loser_rating=1000)
    assert dw == 16
    assert dl == -16


def test_pve_win_gives_zero_elo():
    """PvE: победа над ботом не меняет рейтинг."""
    dw, dl = compute_elo_deltas(is_pvp=False, battle_mode="normal",
                                winner_rating=1000, loser_rating=1000)
    assert dw == 0
    assert dl == 0


def test_titan_mode_gives_zero_elo_even_in_pvp():
    """Режим titan не влияет на ELO даже в PvP."""
    dw, dl = compute_elo_deltas(is_pvp=True, battle_mode="titan",
                                winner_rating=1000, loser_rating=1000)
    assert dw == 0
    assert dl == 0


def test_endless_mode_gives_zero_elo_even_in_pvp():
    """Режим endless (Натиск) не влияет на ELO даже в PvP."""
    dw, dl = compute_elo_deltas(is_pvp=True, battle_mode="endless",
                                winner_rating=1000, loser_rating=1000)
    assert dw == 0
    assert dl == 0


def test_pvp_underdog_wins_more_elo():
    """Победа слабого над сильным даёт больше ELO."""
    dw_under, _ = compute_elo_deltas(is_pvp=True, battle_mode="normal",
                                     winner_rating=800, loser_rating=1200)
    dw_fav, _ = compute_elo_deltas(is_pvp=True, battle_mode="normal",
                                   winner_rating=1200, loser_rating=800)
    assert dw_under > dw_fav, "Победа слабого должна давать больше ELO, чем сильного"
