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


def test_mat_filter_covers_many_words(db):
    """Расширенный список — должны ловиться все основные русские маты
    в разных формах: падежи, приставки, суффиксы."""
    _seed_schema(db)
    cases = [
        # (вход, что НЕ должно остаться)
        ("иди нахуй", "нахуй"),
        ("вот пиздец", "пиздец"),
        ("ты мудак конченый", "мудак"),
        ("гондон штопаный", "гондон"),
        ("шлюха ты", "шлюх"),
        ("охуенно играешь", "охуен"),
        ("пидор тут?", "пидор"),
        ("сука как заебало", "сук"),
        ("дрочер несчастный", "дроч"),
        ("долбоёб ты", "долбое"),
    ]
    for i, (text, forbidden) in enumerate(cases, start=10):
        ok, _id, _why = db.lobby_chat_send(i, "u", text)
        assert ok is True, f"Не записалось: {text!r}"
    msgs = db.lobby_chat_get_since(0)
    assert len(msgs) == len(cases)
    for m, (orig, forbidden) in zip(msgs, cases):
        msg = m["message"].lower()
        assert "***" in msg, f"Не замаскировалось: {orig!r} → {m['message']!r}"
        assert forbidden not in msg, f"Мат прошёл: {orig!r} → {m['message']!r}"


def test_mat_filter_blocks_obfuscation(db):
    """Обходы через латиницу, цифры и разделители — должны ловиться.
    Раньше «xуй», «6лядь», «б л я т ь» проходили насквозь."""
    _seed_schema(db)
    obfuscated = [
        "xуй",          # латинская x
        "6лядь",        # цифра 6 вместо б
        "п и з д а",    # пробелы между букв (fallback на полное сообщение)
        "б.л.я.т.ь",    # точки между букв
        "пиZда",        # латинская Z (не маппится, но 'пизда' всё равно в leet)
        "h@x@l",        # не мат — не должно срабатывать
    ]
    expect_masked = [True, True, True, True, True, False]
    for i, txt in enumerate(obfuscated, start=100):
        db.lobby_chat_send(i, "u", txt)
    msgs = db.lobby_chat_get_since(0)
    assert len(msgs) == len(obfuscated)
    for m, txt, should_mask in zip(msgs, obfuscated, expect_masked):
        if should_mask:
            assert "***" in m["message"], f"Обход прошёл: {txt!r} → {m['message']!r}"
        else:
            assert "***" not in m["message"], f"Ложное срабатывание: {txt!r} → {m['message']!r}"


def test_mat_filter_does_not_eat_clean_words(db):
    """Чистые слова с подстроками типа «склад», «классные», «бляха» (хм...) —
    проверяем что обычная речь не ломается."""
    _seed_schema(db)
    clean = [
        "склад на втором этаже",
        "классные ребята",
        "пиздец как круто",   # ВНИМАНИЕ: это мат, должен замаскироваться
        "Спасибо за игру!",
        "Гладиатор тут?",
        "Кто идёт сегодня вечером в рейд",
    ]
    expect_masked_idx = {2}  # только «пиздец как круто»
    for i, txt in enumerate(clean, start=200):
        db.lobby_chat_send(i, "u", txt)
    msgs = db.lobby_chat_get_since(0)
    for idx, (m, orig) in enumerate(zip(msgs, clean)):
        if idx in expect_masked_idx:
            assert "***" in m["message"], f"Должен был замаскироваться: {orig!r}"
        else:
            assert "***" not in m["message"], f"Чистое слово замаскировалось: {orig!r} → {m['message']!r}"


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
