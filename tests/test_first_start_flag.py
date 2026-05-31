"""
tests/test_first_start_flag.py — флаг "новичок" в get_or_create_player.

Транзиентное поле player["_is_new"] нужно /start handler'у, чтобы
показать киберпанк-приветствие ровно 1 раз. В БД не хранится.

Покрывает:
- первый вызов get_or_create_player → _is_new == True
- второй вызов того же user_id → _is_new == False (даже если ник изменился)
- разные user_id → каждый получает True на своём первом вызове
"""
from __future__ import annotations


def test_first_call_marks_new(db):
    """Первый вызов get_or_create_player для нового user_id ставит _is_new=True."""
    p = db.get_or_create_player(123456, "newbie")
    assert p["_is_new"] is True
    # Базовые поля тоже на месте — флаг не ломает контракт
    assert p["user_id"] == 123456
    assert p["level"] == 1


def test_second_call_marks_not_new(db):
    """Повторный вызов для того же user_id → _is_new=False."""
    db.get_or_create_player(7777, "alice")
    p2 = db.get_or_create_player(7777, "alice")
    assert p2["_is_new"] is False
    assert p2["user_id"] == 7777


def test_second_call_with_renamed_username_not_new(db):
    """Если ник изменился, игрок всё равно НЕ новичок — приветствие не должно
    показываться повторно."""
    db.get_or_create_player(555, "old_nick")
    p2 = db.get_or_create_player(555, "new_nick")
    assert p2["_is_new"] is False
    # Ник обновился, как и было раньше
    assert p2["username"] == "new_nick"


def test_two_different_users_both_get_new_flag(db):
    """Разные user_id независимы — каждый получает свой _is_new=True на первом."""
    p1 = db.get_or_create_player(1001, "a")
    p2 = db.get_or_create_player(1002, "b")
    assert p1["_is_new"] is True
    assert p2["_is_new"] is True


def test_flag_not_persisted_in_db(db):
    """_is_new — транзиент, не сохраняется в БД-строке."""
    db.get_or_create_player(42, "x")
    conn = db.get_connection()
    row = conn.execute("SELECT * FROM players WHERE user_id = ?", (42,)).fetchone()
    conn.close()
    # В БД такого столбца НЕТ — это поле живёт только в dict из метода
    assert "_is_new" not in dict(row)
