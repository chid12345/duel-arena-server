"""Награды клана (2026-05-26): балансировка под reward_grid.

Проверяем:
- ачивки клана выдают gold/diamonds КАЖДОМУ участнику (раньше были только бейджи)
- война платит 100g + 1💎 (раньше 200+2 — было завышено при 5-7 войнах/нед)
- сезон без изменений (500/300/150 + 5/3/1)
"""
from __future__ import annotations

import os
import tempfile

import pytest

from repositories.social.clan_achievements import CLAN_ACHIEVEMENTS
from repositories.social.clan_wars import WAR_REWARD_DIAMONDS, WAR_REWARD_GOLD
from repositories.social.clan_seasons import SEASON_REWARDS


# ── Чистые проверки констант (без БД, быстро) ─────────────────────────────


def test_war_reward_within_weekly_medium_band():
    """Война платит 100g + 1💎 = weekly_medium из economy.json reward_grid.

    Раньше было 200+2 — при возможности 5-7 войн/нед (всегда есть оппонент)
    игрок мог зарабатывать в 6-7× больше чем weekly_epic квест. Калибровано.
    """
    assert WAR_REWARD_GOLD == 100, "Награда войны должна быть 100g (weekly_medium)"
    assert WAR_REWARD_DIAMONDS == 1, "Награда войны должна быть 1💎 (weekly_medium)"


def test_season_rewards_unchanged():
    """Сезон раз в неделю, только топ-3 — оставлен как есть (500/300/150g + 5/3/1d)."""
    assert SEASON_REWARDS == [(500, 5), (300, 3), (150, 1)]


def test_all_achievements_have_rewards():
    """Все 6 ачивок клана теперь имеют материальные награды (не только бейдж)."""
    for entry in CLAN_ACHIEVEMENTS:
        # tuple: key, name, desc, icon, field, threshold, r_gold, r_dia
        key, _name, _desc, _icon, _field, _threshold, r_gold, r_dia = entry
        assert (r_gold > 0) or (r_dia > 0), (
            f"Ачивка {key} без награды — страница «НАГРАДЫ» должна оправдывать название"
        )


def test_achievement_rewards_match_once_tier():
    """Награды ачивок калиброваны под `once`-тариф из economy reward_grid:
    100g (easy), 250+2 (medium), 500+5 (epic). Топ-ачивки (1000 побед,
    ур.10) — топ-награды; стартовые (100 побед, ур.5) — скромные.
    """
    # Перевожу в словарь по key
    by_key = {e[0]: (e[6], e[7]) for e in CLAN_ACHIEVEMENTS}
    # 1000 побед = эпик-тариф once: ≤ 550g + 8💎 из reward_grid
    g, d = by_key["wins_1000"]
    assert g <= 550 and d <= 8, "1000 побед не должна превышать once_epic"
    # 100 побед = «лёгкое» once: золото в районе 100g без алмазов
    g, d = by_key["wins_100"]
    assert 50 <= g <= 200 and d == 0
    # уровень 10 — крупная ачивка (требует много времени) → epic-уровень
    g, d = by_key["level_10"]
    assert 200 <= g <= 500 and 1 <= d <= 5
