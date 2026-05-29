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
    effective_elo_ratings,
    is_pvp_battle,
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


# ---------- Замаскированный PvP-фоллбек (Этап 9) ----------


def test_real_pvp_is_pvp():
    """Живой PvP-бой: is_bot2=False → PvP."""
    assert is_pvp_battle({"is_bot2": False}) is True


def test_plain_pve_is_not_pvp():
    """Обычный бой с ботом (ручной выбор) — PvE."""
    assert is_pvp_battle({"is_bot2": True}) is False


def test_disguised_fallback_counts_as_pvp():
    """Замаскированный фоллбек (Этап 9): is_bot2=True, но _disguise_as_pvp=True.
    Игрок видит «человека» — должен получать PvP-награды."""
    battle = {"is_bot2": True, "_disguise_as_pvp": True}
    assert is_pvp_battle(battle) is True


def test_disguised_fallback_gives_pvp_streak_and_bonus():
    """В замаскированном PvP серия растёт, бонус +30 капает."""
    battle = {"is_bot2": True, "_disguise_as_pvp": True}
    new, bonus = compute_player_win_streak(
        prev_streak=4, is_pvp_win=is_pvp_battle(battle),
    )
    assert new == 5
    assert bonus == STREAK_BONUS_GOLD


def test_effective_elo_ratings_disguised_uses_human_rating_for_both():
    """В замаскированном PvP у бота нет рейтинга — берём рейтинг живого
    игрока с обеих сторон, ELO ±16 как у равных."""
    battle = {"is_bot2": True, "_disguise_as_pvp": True}
    # Человек выиграл: winner_user_id=42, loser — бот без user_id и rating.
    w, l = effective_elo_ratings(
        battle,
        winner_live={"rating": 1200},
        loser_live={},  # бот, нет rating
        winner_user_id=42,
        loser_user_id=None,
    )
    assert w == 1200 and l == 1200


def test_effective_elo_ratings_disguised_bot_winner():
    """Если бот выиграл замаскированный PvP, берём рейтинг проигравшего человека."""
    battle = {"is_bot2": True, "_disguise_as_pvp": True}
    w, l = effective_elo_ratings(
        battle,
        winner_live={},  # бот победил, нет rating
        loser_live={"rating": 1500},
        winner_user_id=None,
        loser_user_id=42,
    )
    assert w == 1500 and l == 1500


def test_effective_elo_ratings_real_pvp_uses_actual_ratings():
    """Живой PvP: берём фактические рейтинги обоих."""
    battle = {"is_bot2": False}
    w, l = effective_elo_ratings(
        battle,
        winner_live={"rating": 1100},
        loser_live={"rating": 950},
        winner_user_id=10,
        loser_user_id=20,
    )
    assert w == 1100 and l == 950


def test_pvp_underdog_wins_more_elo():
    """Победа слабого над сильным даёт больше ELO."""
    dw_under, _ = compute_elo_deltas(is_pvp=True, battle_mode="normal",
                                     winner_rating=800, loser_rating=1200)
    dw_fav, _ = compute_elo_deltas(is_pvp=True, battle_mode="normal",
                                   winner_rating=1200, loser_rating=800)
    assert dw_under > dw_fav, "Победа слабого должна давать больше ELO, чем сильного"
