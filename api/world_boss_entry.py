"""Входной взнос в рейд Мирового босса.

Покрывает все три точки входа:
- register      — регистрация на следующий рейд из лобби / комнаты ожидания
- enter_active  — вход в уже идущий рейд (первые 2 мин)
Принцип: оплата один раз (50 золота), идемпотентна.
"""
from __future__ import annotations

import logging

from pydantic import BaseModel

log = logging.getLogger(__name__)

WB_ENTRY_FEE = 50  # золото за регистрацию (идёт в призовой фонд)


class RegisterBody(BaseModel):
    init_data: str


class EnterActiveBody(BaseModel):
    init_data: str


def _refresh_username(cur, uid: int, tg_user: dict) -> None:
    """Подтягиваем актуальный ник из Telegram, если в БД пусто.
    Не затирает уже сохранённое имя — апдейт только при NULL/'' в players.username."""
    uname = (tg_user.get("username") or tg_user.get("first_name") or "").strip()
    if not uname:
        return
    try:
        cur.execute(
            "UPDATE players SET username=? "
            "WHERE user_id=? AND (username IS NULL OR username='')",
            (uname[:64], uid),
        )
    except Exception:
        pass


async def world_boss_register_inner(body: RegisterBody, *, db, get_user_from_init_data) -> dict:
    """Регистрация на СЛЕДУЮЩИЙ рейд с оплатой входного взноса.
    Списывает WB_ENTRY_FEE золота немедленно — отмены нет.
    Если уже зарегистрирован — возвращает текущий статус без повторного списания."""
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])

    nxt = db.get_wb_next_scheduled()
    if not nxt:
        try:
            from jobs.world_boss_scheduler import _ensure_next_scheduled
            _ensure_next_scheduled(db)
            nxt = db.get_wb_next_scheduled()
        except Exception:
            pass
        if not nxt:
            return {"ok": False, "reason": "Не удалось запланировать рейд — попробуй позже"}

    spawn_id = int(nxt["spawn_id"])

    conn = db.get_connection()
    try:
        cur = conn.cursor()

        # Подтягиваем ник из Telegram (если в БД пусто), чтобы в ростере было имя
        _refresh_username(cur, uid, tg_user)

        # Уже зарегистрирован — ничего не делаем, просто возвращаем статус
        cur.execute(
            "SELECT 1 FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
            (spawn_id, uid),
        )
        if cur.fetchone():
            cur.execute(
                "SELECT COUNT(*) AS c FROM world_boss_registrations WHERE spawn_id=?",
                (spawn_id,),
            )
            count = int(cur.fetchone()["c"])
            cur.execute("SELECT gold FROM players WHERE user_id=?", (uid,))
            row = cur.fetchone()
            gold_left = int(row["gold"]) if row else 0
            conn.commit()
            return {"ok": True, "is_registered": True, "registrants_count": count,
                    "spawn_id": spawn_id, "gold_left": gold_left}

        # Атомарно списываем взнос (AND gold >= fee предотвращает уход в минус)
        cur.execute(
            "SELECT gold FROM players WHERE user_id=?", (uid,)
        )
        player = cur.fetchone()
        if not player:
            return {"ok": False, "reason": "Игрок не найден"}

        cur.execute(
            "UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?",
            (WB_ENTRY_FEE, uid, WB_ENTRY_FEE),
        )
        if cur.rowcount == 0:
            gold_have = int(player["gold"])
            return {"ok": False, "reason": f"Нужно {WB_ENTRY_FEE} золота (у тебя {gold_have})"}

        # Регистрируем в том же соединении
        cur.execute(
            "INSERT OR IGNORE INTO world_boss_registrations (spawn_id, user_id) VALUES (?,?)",
            (spawn_id, uid),
        )

        cur.execute("SELECT gold FROM players WHERE user_id=?", (uid,))
        gold_left = int(cur.fetchone()["gold"])

        cur.execute(
            "SELECT COUNT(*) AS c FROM world_boss_registrations WHERE spawn_id=?",
            (spawn_id,),
        )
        count = int(cur.fetchone()["c"])

        conn.commit()
    finally:
        conn.close()

    return {"ok": True, "is_registered": True, "registrants_count": count,
            "spawn_id": spawn_id, "gold_left": gold_left}


async def world_boss_unregister_inner(body: RegisterBody, *, db, get_user_from_init_data) -> dict:
    """Снять регистрацию со СЛЕДУЮЩЕГО рейда + вернуть взнос (50 🪙).
    Если рейд уже active (стартовал) — отмена закрыта (бой идёт).
    Идемпотентно: если не был зарегистрирован — ok без денежных операций."""
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])

    nxt = db.get_wb_next_scheduled()
    if not nxt:
        return {"ok": False, "reason": "Нет запланированного рейда"}
    spawn_id = int(nxt["spawn_id"])

    # Если этот же spawn уже active — отмена закрыта (бой начался)
    active = db.get_wb_active_spawn()
    if active and int(active.get("spawn_id") or 0) == spawn_id:
        return {"ok": False, "reason": "Рейд уже идёт — отмена невозможна"}

    conn = db.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
            (spawn_id, uid),
        )
        was_registered = cur.rowcount > 0
        if was_registered:
            # Возвращаем взнос обратно (обратная операция к register)
            cur.execute(
                "UPDATE players SET gold = gold + ? WHERE user_id = ?",
                (WB_ENTRY_FEE, uid),
            )
        cur.execute("SELECT gold FROM players WHERE user_id=?", (uid,))
        row = cur.fetchone()
        gold_left = int(row["gold"]) if row else 0
        cur.execute(
            "SELECT COUNT(*) AS c FROM world_boss_registrations WHERE spawn_id=?",
            (spawn_id,),
        )
        count = int(cur.fetchone()["c"])
        conn.commit()
    finally:
        conn.close()

    return {
        "ok": True,
        "was_registered": was_registered,
        "refunded": WB_ENTRY_FEE if was_registered else 0,
        "registrants_count": count,
        "gold_left": gold_left,
        "spawn_id": spawn_id,
    }


async def world_boss_enter_active_inner(body: EnterActiveBody, *, db, get_user_from_init_data) -> dict:
    """Оплата входа в АКТИВНЫЙ рейд (в первые 2 мин). Если уже зарегистрирован — бесплатно."""
    from datetime import datetime, timezone
    from config.world_boss_constants import WB_LATE_JOIN_WINDOW_SEC

    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])

    active = db.get_wb_active_spawn()
    if not active:
        return {"ok": False, "reason": "Нет активного рейда"}

    spawn_id = int(active["spawn_id"])

    # Проверка окна входа
    try:
        from api.world_boss_hit import _parse_ts
        started_at = _parse_ts(active["started_at"])
        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    except Exception:
        elapsed = 0
    if elapsed > WB_LATE_JOIN_WINDOW_SEC:
        return {"ok": False, "reason": "Вход закрыт — заходить можно только в первые 2 минуты"}

    conn = db.get_connection()
    cur = conn.cursor()

    # Подтягиваем ник из Telegram (если в БД пусто), чтобы в ростере было имя
    _refresh_username(cur, uid, tg_user)

    # Уже зарегистрирован (платил раньше) — пропускаем бесплатно
    cur.execute(
        "SELECT 1 FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
        (spawn_id, uid),
    )
    if cur.fetchone():
        cur.execute("SELECT gold FROM players WHERE user_id=?", (uid,))
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"ok": True, "already_paid": True, "gold_left": int(row["gold"]) if row else 0}

    # Новый игрок — списываем взнос
    cur.execute("SELECT gold FROM players WHERE user_id=?", (uid,))
    player = cur.fetchone()
    if not player:
        conn.close()
        return {"ok": False, "reason": "Игрок не найден"}

    cur.execute(
        "UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?",
        (WB_ENTRY_FEE, uid, WB_ENTRY_FEE),
    )
    if cur.rowcount == 0:
        gold_have = int(player["gold"])
        conn.close()
        return {"ok": False, "reason": f"Нужно {WB_ENTRY_FEE} золота (у тебя {gold_have})"}

    cur.execute(
        "INSERT OR IGNORE INTO world_boss_registrations (spawn_id, user_id) VALUES (?,?)",
        (spawn_id, uid),
    )
    cur.execute("SELECT gold FROM players WHERE user_id=?", (uid,))
    gold_left = int(cur.fetchone()["gold"])
    conn.commit()
    conn.close()

    return {"ok": True, "already_paid": False, "gold_left": gold_left}
