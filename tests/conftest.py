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
    from repositories.equipment import ArmorModsMixin, EquipmentMixin
    from repositories.season_pass import SeasonPassMixin, SeasonPassClaimMixin
    from repositories.upgrades import UpgradesMixin
    from repositories.rentals import RentalsMixin

    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp_path = tmp.name
    tmp.close()

    class TestDatabase(
        DBCore, DBSchema,
        BotsMixin, UsersMixin, BattlesMixin,
        GameLogicMixin, EndlessMixin, LeaderboardMixin,
        ShopMixin, SocialMixin, AvatarsMixin, InventoryMixin,
        QuestsMixin, WorldBossMixin, EquipmentMixin, ArmorModsMixin,
        SeasonPassMixin, SeasonPassClaimMixin, UpgradesMixin,
        RentalsMixin,
    ):
        def __init__(self):
            self._pg = False
            self._db_path = tmp_path
            self.init_database()

        def get_connection(self):
            import sqlite3
            # timeout=5 — спасает от "database is locked" когда внутренний код
            # открывает новый connection во время уже запущенной транзакции
            # (например, log_metric_event внутри process_weekly_leaderboard_payouts).
            conn = sqlite3.connect(self._db_path, check_same_thread=False, timeout=5.0)
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

def get_player_row(db, user_id: int) -> dict:
    """Прочитать игрока из БД (публичного db.get_player() нет — только прямой SELECT)."""
    conn = db.get_connection()
    row = conn.execute("SELECT * FROM players WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def set_player_fields(db, user_id: int, **fields) -> None:
    """Прямой UPDATE players по нужным полям. Помогает готовить состояние для теста."""
    if not fields:
        return
    sets = ", ".join(f"{k} = ?" for k in fields)
    vals = list(fields.values()) + [user_id]
    conn = db.get_connection()
    conn.execute(f"UPDATE players SET {sets} WHERE user_id = ?", vals)
    conn.commit()
    conn.close()
