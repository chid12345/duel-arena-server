"""
tests/test_full_reset_wipe.py — кнопка «Сброс прогресса» (полный сброс до новичка).

Новое правило: остаются ТОЛЬКО золото, алмазы, клан, рефералы и USDT-баланс за
рефералов. Всё остальное (уровень, статы, вещи, образы, Premium, расходники,
апгрейды, экипировка, аренды, достижения) — сносится.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _setup_rich_player(db, uid):
    """Наполняет профиль игрока «всем подряд» перед сбросом."""
    db.get_or_create_player(uid, "rich")
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        """UPDATE players SET level=50, wins=100, exp=99999,
           gold=5000, diamonds=300, clan_id=7,
           referral_usdt_balance=12.5, premium_until='2099-01-01',
           equipped_avatar_id='elite_emperor', avatar_bonus_applied=1,
           inventory_unseen=4
           WHERE user_id=?""",
        (uid,),
    )
    cur.execute("INSERT INTO player_owned_weapons (user_id, item_id) VALUES (?, ?)", (uid, "sword_epic"))
    cur.execute("INSERT INTO player_inventory (user_id, item_id, quantity) VALUES (?, ?, ?)", (uid, "scroll_str_3", 5))
    cur.execute("INSERT INTO item_upgrades (user_id, item_id, plus_level) VALUES (?, ?, ?)", (uid, "sword_epic", 4))
    cur.execute("INSERT INTO player_equipment (user_id, slot, item_id) VALUES (?, ?, ?)", (uid, "weapon", "sword_epic"))
    cur.execute("INSERT INTO user_avatar_unlocks (user_id, avatar_id, source) VALUES (?, ?, ?)", (uid, "elite_emperor", "shop"))
    cur.execute("INSERT INTO achievements (user_id, achievement_name) VALUES (?, ?)", (uid, "first_blood"))
    cur.execute(
        "INSERT INTO equipment_rentals (user_id, item_id, expires_at) VALUES (?, ?, ?)",
        (uid, "mythic_sword", "2099-01-01T00:00:00"),
    )
    cur.execute(
        "INSERT INTO referrals (referral_code, referrer_id, referred_id) VALUES (?, ?, ?)",
        ("ABC123", uid, uid + 1),
    )
    conn.commit()
    conn.close()


def _count(db, table, uid):
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) AS c FROM {table} WHERE user_id = ?", (uid,))
    n = cur.fetchone()["c"]
    conn.close()
    return n


def _player(db, uid):
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM players WHERE user_id = ?", (uid,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def test_full_reset_keeps_only_wallet_clan_referrals(db):
    """Happy path: после сброса остаются деньги/клан/рефералы/USDT, прогресс — нет."""
    uid = 7001
    _setup_rich_player(db, uid)
    db.wipe_player_profile(uid, keep_wallet_clan_and_referrals=True)
    p = _player(db, uid)

    # Сохраняется
    assert int(p["gold"]) == 5000, "золото должно остаться"
    assert int(p["diamonds"]) == 300, "алмазы должны остаться"
    assert int(p["clan_id"]) == 7, "клан должен остаться"
    assert float(p["referral_usdt_balance"]) == 12.5, "USDT за рефералов должен остаться"
    conn = db.get_connection()
    refs = conn.execute("SELECT COUNT(*) AS c FROM referrals WHERE referrer_id = ?", (uid,)).fetchone()["c"]
    conn.close()
    assert refs == 1, "рефералы (referrer_id) должны остаться"

    # Сбрасывается
    assert int(p["level"]) == 1, "уровень → 1"
    assert int(p["wins"]) == 0, "победы → 0"
    assert p["premium_until"] is None, "Premium должен сняться"
    assert p["equipped_avatar_id"] == "default_start", "образ → стартовый"
    assert int(p["avatar_bonus_applied"]) == 0, "бонус образа сброшен"
    assert int(p["inventory_unseen"]) == 0, "счётчик новых покупок сброшен"
    assert _count(db, "player_owned_weapons", uid) == 0, "купленные вещи удалены"
    assert _count(db, "player_inventory", uid) == 0, "расходники удалены"
    assert _count(db, "item_upgrades", uid) == 0, "апгрейды (+N) удалены"
    assert _count(db, "player_equipment", uid) == 0, "экипировка снята"
    assert _count(db, "user_avatar_unlocks", uid) == 0, "образы удалены"
    assert _count(db, "achievements", uid) == 0, "достижения удалены"
    assert _count(db, "equipment_rentals", uid) == 0, "аренды удалены"


def test_full_reset_no_owned_content_still_ok(db):
    """Граничный: игрок без купленного контента — сброс не падает, кошелёк цел."""
    uid = 7002
    db.get_or_create_player(uid, "fresh")
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE players SET gold=42, diamonds=3, level=10 WHERE user_id=?", (uid,))
    conn.commit()
    conn.close()
    db.wipe_player_profile(uid, keep_wallet_clan_and_referrals=True)
    p = _player(db, uid)
    assert int(p["gold"]) == 42, "золото сохранилось"
    assert int(p["diamonds"]) == 3, "алмазы сохранились"
    assert int(p["level"]) == 1, "уровень сброшен"


def test_full_account_delete_removes_player(db):
    """keep=False (админский полный снос аккаунта) — строка игрока удаляется."""
    uid = 7003
    _setup_rich_player(db, uid)
    db.wipe_player_profile(uid)  # keep_wallet_clan_and_referrals=False по умолчанию
    assert _player(db, uid) is None, "профиль игрока должен быть удалён целиком"
