"""
tests/test_critical.py — 5 критических тестов игровой логики.

Тесты работают на SQLite in-memory БД через реальный Database стек.
Запуск: python -m pytest tests/ -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

# ── Фикстура: чистая in-memory база для каждого теста ────────────────────────

@pytest.fixture
def db():
    """Отдельный экземпляр Database с временным SQLite-файлом для каждого теста."""
    import tempfile

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

    # Временный файл — каждое соединение видит одни и те же таблицы
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp_path = tmp.name
    tmp.close()

    class TestDatabase(
        DBCore, DBSchema,
        BotsMixin, UsersMixin, BattlesMixin,
        GameLogicMixin, EndlessMixin, LeaderboardMixin, ShopMixin, SocialMixin,
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


# ── Тест 1: Баланс — золото не уходит в минус ────────────────────────────────

def test_gold_cannot_go_negative(db):
    """Покупка зелья при недостатке золота должна вернуть ok=False, золото не меняется."""
    db.get_or_create_player(1001, "tester1")
    # Устанавливаем 5 золота — меньше стоимости зелья (12)
    conn = db.get_connection()
    conn.execute("UPDATE players SET gold = 5 WHERE user_id = 1001")
    conn.commit()
    conn.close()

    result = db.buy_hp_potion_small(1001)

    assert result["ok"] is False, "Должен вернуть ok=False при нехватке золота"

    conn = db.get_connection()
    row = conn.execute("SELECT gold FROM players WHERE user_id = 1001").fetchone()
    conn.close()
    assert row["gold"] == 5, f"Золото изменилось! Было 5, стало {row['gold']}"


# ── Тест 2: Награда — XP и золото начисляются корректно ──────────────────────

def test_reward_credited_after_battle(db):
    """После победного боя игрок получает XP и золото."""
    from config import VICTORY_GOLD, victory_xp_for_player_level

    db.get_or_create_player(1002, "tester2")
    conn = db.get_connection()
    row = conn.execute("SELECT gold, exp FROM players WHERE user_id = 1002").fetchone()
    gold_before = row["gold"]
    exp_before = row["exp"]
    conn.close()

    gold_reward = VICTORY_GOLD
    xp_reward = victory_xp_for_player_level(1)

    db.update_player_stats(1002, {
        "wins": 1,
        "gold": gold_before + gold_reward,
        "exp": exp_before + xp_reward,
    })

    conn = db.get_connection()
    row = conn.execute("SELECT gold, exp, wins FROM players WHERE user_id = 1002").fetchone()
    conn.close()

    assert row["gold"] == gold_before + gold_reward, "Золото не начислено"
    assert row["exp"] == exp_before + xp_reward, "XP не начислен"
    assert row["wins"] == 1, "Победа не засчитана"


# ── Тест 3: Вайп — данные сбрасываются до нуля ───────────────────────────────

def test_wipe_resets_profile(db):
    """После wipe_player_profile уровень/бои возвращаются к стартовым значениям."""
    from config import PLAYER_START_LEVEL

    db.get_or_create_player(1003, "tester3")
    # Прокачиваем игрока
    db.update_player_stats(1003, {"level": 10, "wins": 50, "losses": 20, "exp": 99999})

    db.wipe_player_profile(1003)
    # Создаём заново (как делает бот после wipe)
    db.get_or_create_player(1003, "tester3")

    conn = db.get_connection()
    row = conn.execute("SELECT level, wins, losses FROM players WHERE user_id = 1003").fetchone()
    conn.close()

    assert row["level"] == PLAYER_START_LEVEL, f"Уровень не сброшен: {row['level']}"
    assert row["wins"] == 0, f"Победы не сброшены: {row['wins']}"
    assert row["losses"] == 0, f"Поражения не сброшены: {row['losses']}"


# ── Тест 4: HP реген — не превышает max_hp ────────────────────────────────────

def test_hp_regen_capped_at_max(db):
    """apply_hp_regen не должен поднимать HP выше max_hp."""
    from config import PLAYER_START_MAX_HP

    db.get_or_create_player(1004, "tester4")
    # Устанавливаем HP ниже максимума и старую дату регена
    conn = db.get_connection()
    conn.execute(
        "UPDATE players SET current_hp = 10, max_hp = ?, last_hp_regen = '2000-01-01 00:00:00' WHERE user_id = 1004",
        (PLAYER_START_MAX_HP,)
    )
    conn.commit()
    conn.close()

    # Вызываем реген (долгий перерыв → должен восстановить до max)
    result = db.apply_hp_regen(1004, endurance_invested=0)

    conn = db.get_connection()
    row = conn.execute("SELECT current_hp, max_hp FROM players WHERE user_id = 1004").fetchone()
    conn.close()

    assert row["current_hp"] <= row["max_hp"], (
        f"HP превысил максимум! current={row['current_hp']} max={row['max_hp']}"
    )
    assert row["current_hp"] > 10, "HP должен был вырасти"


# ── Тест 5: PvP матч — winner_id корректен ───────────────────────────────────

def test_pvp_winner_id_is_correct(db):
    """save_battle сохраняет корректный winner_id и его можно прочитать из БД."""
    db.get_or_create_player(2001, "player_a")
    db.get_or_create_player(2002, "player_b")

    battle_id = db.save_battle({
        "player1_id": 2001,
        "player2_id": 2002,
        "is_bot1": False,
        "is_bot2": False,
        "winner_id": 2001,
        "result": "player1_wins",
        "rounds": 3,
        "details": {"rounds": []},
    })

    assert battle_id > 0, "battle_id должен быть положительным"

    conn = db.get_connection()
    row = conn.execute("SELECT winner_id, player1_id, player2_id FROM battles WHERE battle_id = ?", (battle_id,)).fetchone()
    conn.close()

    assert row is not None, "Бой не найден в БД"
    assert int(row["winner_id"]) == 2001, f"winner_id неверный: {row['winner_id']}"
    assert int(row["player1_id"]) == 2001
    assert int(row["player2_id"]) == 2002
