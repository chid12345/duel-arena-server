"""
tests/conftest.py — общие фикстуры для всех тестов.

Фикстура `db` собирает Database из всех миксинов (как в database.py),
но использует временный SQLite-файл, изолированный для каждого теста.

Фикстура `seed` — autouse, фиксирует random.seed(42) перед каждым тестом
(нужно для стабильных тестов боя, использующих random.random()).

Запуск: python -m pytest tests/ -v
"""
from __future__ import annotations

import os
import sys
import tempfile
import random

import pytest

# Корень проекта в sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(autouse=True)
def _seed_random():
    """Перед каждым тестом фиксируем seed — для стабильных тестов боя."""
    random.seed(42)
    yield


@pytest.fixture
def db():
    """Database со ВСЕМИ миксинами (как в database.py). Отдельный SQLite-файл на тест."""
    original = os.environ.get("DATABASE_URL")
    os.environ.pop("DATABASE_URL", None)

    from db_core import DBCore
    from db_schema import DBSchema
    from repositories.users import UsersMixin
    from repositories.bots import BotsMixin
    from repositories.battles import BattlesMixin
    from repositories.game_logic import GameLogicMixin
    from repositories.endless import EndlessMixin
    from repositories.leaderboard import LeaderboardMixin
    from repositories.shop import ShopMixin
    from repositories.social import SocialMixin
    from repositories.avatars import AvatarsMixin
    from repositories.inventory import InventoryMixin
    from repositories.quests import QuestsMixin
    from repositories.world_boss import WorldBossMixin
    from repositories.equipment import EquipmentMixin
    from repositories.season_pass import SeasonPassMixin, SeasonPassClaimMixin

    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp_path = tmp.name
    tmp.close()

    class TestDatabase(
        DBCore, DBSchema,
        BotsMixin, UsersMixin, BattlesMixin,
        GameLogicMixin, EndlessMixin, LeaderboardMixin,
        ShopMixin, SocialMixin, AvatarsMixin, InventoryMixin,
        QuestsMixin, WorldBossMixin, EquipmentMixin,
        SeasonPassMixin, SeasonPassClaimMixin,
    ):
        def __init__(self):
            self._pg = False
            self._db_path = tmp_path
            self.init_database()

        def get_connection(self):
            import sqlite3
            conn = sqlite3.connect(self._db_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")
            return conn

    instance = TestDatabase()
    yield instance

    if original is not None:
        os.environ["DATABASE_URL"] = original
    try:
        os.unlink(tmp_path)
    except OSError:
        pass


# ── Хелперы (используются как обычные функции из db-фикстуры) ─────────────────

def make_player(db, user_id: int, username: str = None, *,
                gold: int = None, diamonds: int = None,
                level: int = None, exp: int = None,
                strength: int = None, endurance: int = None, crit: int = None,
                max_hp: int = None, current_hp: int = None,
                premium_until: str = None) -> dict:
    """Создаёт игрока и опционально проставляет нужные поля одним UPDATE.

    Использование в тесте:
        from tests.conftest import make_player
        make_player(db, 1001, gold=500, level=10)
    """
    db.get_or_create_player(user_id, username or f"u{user_id}")
    fields = {
        "gold": gold, "diamonds": diamonds,
        "level": level, "exp": exp,
        "strength": strength, "endurance": endurance, "crit": crit,
        "max_hp": max_hp, "current_hp": current_hp,
        "premium_until": premium_until,
    }
    updates = {k: v for k, v in fields.items() if v is not None}
    if not updates:
        return db.get_player(user_id)
    sets = ", ".join(f"{k} = ?" for k in updates)
    vals = list(updates.values()) + [user_id]
    conn = db.get_connection()
    conn.execute(f"UPDATE players SET {sets} WHERE user_id = ?", vals)
    conn.commit()
    conn.close()
    return db.get_player(user_id)
