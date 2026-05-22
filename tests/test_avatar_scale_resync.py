"""
tests/test_avatar_scale_resync.py — масштаб бонуса аватара доезжает в бой.

Этап 7 аудита: платные образы дают +1 к Сила/Ловк/Инту за каждые 20 ур.
(макс +3). Раньше масштаб запекался один раз при экипировке и при прокачке
в бой НЕ доезжал (витрина показывала +3, в бою было +0). resync_avatar_scale
досчитывает дельту масштаба до текущего уровня по avatar_bonus_level.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _setup(db, uid, *, level, avatar_id, abl, base=50):
    """Создать игрока с заданными уровнем/образом/avatar_bonus_level и
    одинаковыми str/end/crit = base (масштаб условно «запечён» на ур. abl)."""
    db.get_or_create_player(uid, "t")
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        """UPDATE players SET level = ?, equipped_avatar_id = ?, avatar_bonus_level = ?,
               strength = ?, endurance = ?, crit = ?, avatar_bonus_applied = 1
           WHERE user_id = ?""",
        (level, avatar_id, abl, base, base, base, uid),
    )
    conn.commit()
    conn.close()


def _read(db, uid):
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT strength, endurance, crit, avatar_bonus_level FROM players WHERE user_id = ?",
        (uid,),
    )
    r = cur.fetchone()
    conn.close()
    return r


def test_resync_adds_scale_delta_on_levelup(db):
    """Золотой образ, запечён на 25 ур. (scale 1), сейчас 45 ур. (scale 2):
    resync добавляет +1 к str/end/crit и обновляет avatar_bonus_level."""
    _setup(db, 1001, level=45, avatar_id="gold_vanguard", abl=25, base=50)
    db.resync_avatar_scale(1001)
    r = _read(db, 1001)
    assert r["strength"] == 51, f"ожидали +1 силы, стало {r['strength']}"
    assert r["endurance"] == 51
    assert r["crit"] == 51
    assert r["avatar_bonus_level"] == 45


def test_resync_lazy_init_no_stat_change(db):
    """avatar_bonus_level=0 (только что добавленная колонка) — инициализируем
    текущим уровнем БЕЗ изменения статов (защита от задвоения)."""
    _setup(db, 1002, level=60, avatar_id="gold_vanguard", abl=0, base=50)
    db.resync_avatar_scale(1002)
    r = _read(db, 1002)
    assert r["strength"] == 50, "статы не должны меняться при ленивой инициализации"
    assert r["endurance"] == 50 and r["crit"] == 50
    assert r["avatar_bonus_level"] == 60


def test_resync_noop_same_level(db):
    """avatar_bonus_level == текущий уровень — ничего не меняем."""
    _setup(db, 1003, level=40, avatar_id="gold_vanguard", abl=40, base=50)
    db.resync_avatar_scale(1003)
    r = _read(db, 1003)
    assert (r["strength"], r["endurance"], r["crit"]) == (50, 50, 50)


def test_resync_base_avatar_no_scale(db):
    """Бесплатный (base) образ масштаб НЕ получает — даже при разнице уровней
    дельта 0 (только avatar_bonus_level обновляется)."""
    _setup(db, 1004, level=60, avatar_id="base_tank", abl=20, base=50)
    db.resync_avatar_scale(1004)
    r = _read(db, 1004)
    assert (r["strength"], r["endurance"], r["crit"]) == (50, 50, 50)
    assert r["avatar_bonus_level"] == 60


def test_resync_caps_at_max_bonus(db):
    """Масштаб капится на +3: с 60 (scale 3) до 80 (scale 3) дельта 0."""
    _setup(db, 1005, level=80, avatar_id="gold_vanguard", abl=60, base=50)
    db.resync_avatar_scale(1005)
    r = _read(db, 1005)
    assert (r["strength"], r["endurance"], r["crit"]) == (50, 50, 50)
    assert r["avatar_bonus_level"] == 80
