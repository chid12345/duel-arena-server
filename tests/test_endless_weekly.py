"""Недельные очки Натиска — накопление через ON CONFLICT (этап: фикс AmbiguousColumn).

Регрессия: голые имена столбцов (`weekly_wins`, `best_wave_this_week`) в
ON CONFLICT DO UPDATE неоднозначны в PostgreSQL → второй+ заход за неделю
молча не прибавлялся. Здесь проверяем накопление на SQLite (поведение едино
после квалификации столбцов через имя таблицы).
"""
from __future__ import annotations

from db_core import iso_week_key_utc


def test_endless_weekly_wins_accumulate(db):
    """2 победы за неделю → weekly_wins=2, best_wave = максимум из заходов."""
    db.get_or_create_player(7001, "e")
    db.endless_quest_on_win(7001, wave=5)
    db.endless_quest_on_win(7001, wave=3)

    prog = db.endless_get_weekly_progress(7001, iso_week_key_utc())
    assert prog["weekly_wins"] == 2
    assert prog["best_wave"] == 5  # MAX(5, 3)


def test_endless_weekly_best_wave_keeps_max(db):
    """Меньшая волна не понижает рекорд недели."""
    db.get_or_create_player(7002, "e")
    db.endless_quest_on_win(7002, wave=8)
    db.endless_quest_on_win(7002, wave=2)

    prog = db.endless_get_weekly_progress(7002, iso_week_key_utc())
    assert prog["weekly_wins"] == 2
    assert prog["best_wave"] == 8
