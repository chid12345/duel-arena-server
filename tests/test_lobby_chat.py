"""
tests/test_lobby_chat.py — чат зала ожидания рейда.

Покрывает (8 кейсов):
- send happy path → ok, msg_id, текст сохранён
- send empty (только пробелы) → reason='empty'
- send too long (>200 chars) → reason='too_long'
- mat-фильтр маскирует на ***
- get_since: возвращает только сообщения с id > since
- get_since: пустой результат когда нет новых
- lobby_chat_clear удаляет все сообщения
- lobby_chat_last_ts возвращает последний ts отправки
"""
from __future__ import annotations

import time


def _seed_schema(db):
    """Создаём таблицу world_boss_lobby_chat на чистой БД."""
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        """CREATE TABLE IF NOT EXISTS world_boss_lobby_chat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            message TEXT NOT NULL,
            ts INTEGER NOT NULL
        )"""
    )
    conn.commit()
    conn.close()


def test_send_happy_path(db):
    """Валидное сообщение → ok=True, msg_id>0, текст сохранён."""
    _seed_schema(db)
    ok, msg_id, why = db.lobby_chat_send(123, "alice", "Привет, как дела?")
    assert ok is True
    assert msg_id > 0
    assert why == "ok"
    msgs = db.lobby_chat_get_since(0)
    assert len(msgs) == 1
    assert msgs[0]["user_id"] == 123
    assert msgs[0]["username"] == "alice"
    assert msgs[0]["message"] == "Привет, как дела?"


def test_send_empty_after_strip_rejected(db):
    """Пустая строка / только пробелы → 'empty'."""
    _seed_schema(db)
    ok, _id, why = db.lobby_chat_send(1, "u", "   ")
    assert ok is False
    assert why == "empty"


def test_send_too_long_rejected(db):
    """>200 символов → 'too_long'."""
    _seed_schema(db)
    long_text = "а" * 201
    ok, _id, why = db.lobby_chat_send(1, "u", long_text)
    assert ok is False
    assert why == "too_long"


def test_mat_filter_masks_to_stars(db):
    """Мат заменяется на ***."""
    _seed_schema(db)
    ok, _id, _why = db.lobby_chat_send(1, "u", "ты бля молодец")
    assert ok is True
    msgs = db.lobby_chat_get_since(0)
    assert "***" in msgs[0]["message"]
    assert "бля" not in msgs[0]["message"]


def test_get_since_filters_old(db):
    """get_since возвращает только сообщения с id > since."""
    _seed_schema(db)
    _, id1, _ = db.lobby_chat_send(1, "a", "msg1")
    _, id2, _ = db.lobby_chat_send(1, "a", "msg2")
    _, id3, _ = db.lobby_chat_send(1, "a", "msg3")
    new_ones = db.lobby_chat_get_since(id1)
    ids = [m["id"] for m in new_ones]
    assert ids == [id2, id3]


def test_get_since_empty_when_nothing_new(db):
    """get_since с большим id → пустой список."""
    _seed_schema(db)
    db.lobby_chat_send(1, "a", "msg1")
    msgs = db.lobby_chat_get_since(999999)
    assert msgs == []


def test_clear_removes_all(db):
    """clear() удаляет все сообщения."""
    _seed_schema(db)
    db.lobby_chat_send(1, "a", "msg1")
    db.lobby_chat_send(2, "b", "msg2")
    deleted = db.lobby_chat_clear()
    assert deleted == 2
    assert db.lobby_chat_get_since(0) == []


def test_last_ts_returns_latest(db):
    """lobby_chat_last_ts возвращает ts последнего сообщения юзера."""
    _seed_schema(db)
    before = int(time.time())
    db.lobby_chat_send(42, "u", "msg1")
    after = int(time.time())
    ts = db.lobby_chat_last_ts(42)
    assert before <= ts <= after
    # Другой юзер — 0
    assert db.lobby_chat_last_ts(999) == 0
