"""Действия игрока в рейде: применить свиток, воскрешение, забрать награду, напоминалка."""
from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel

from api.tma_infra import get_user_lock

log = logging.getLogger(__name__)

# hp_pct для свитков воскрешения (должен совпадать с SHOP_CATALOG).
RESURRECTION_HP_PCT = {
    "res_30": 0.30,
    "res_60": 0.60,
    "res_100": 1.00,
}


class UseScrollBody(BaseModel):
    init_data: str
    scroll_name: str
    slot: Optional[int] = None  # 1|2|None(auto)


class ResurrectBody(BaseModel):
    init_data: str
    scroll_id: str  # res_30|res_60|res_100


class ClaimRewardBody(BaseModel):
    init_data: str
    reward_id: int


class ReminderToggleBody(BaseModel):
    init_data: str
    enabled: bool


class AutoBotToggleBody(BaseModel):
    init_data: str
    enabled: bool


class ShieldBody(BaseModel):
    init_data: str


class RegisterBody(BaseModel):
    init_data: str


class EnterActiveBody(BaseModel):
    init_data: str


async def world_boss_use_scroll_inner(body: UseScrollBody, *, db, get_user_from_init_data) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    async with get_user_lock(uid):
        return db.wb_apply_raid_scroll(
            user_id=uid, scroll_name=body.scroll_name, slot=body.slot
        )


async def world_boss_resurrect_inner(body: ResurrectBody, *, db, get_user_from_init_data) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    hp_pct = RESURRECTION_HP_PCT.get(body.scroll_id)
    if hp_pct is None:
        return {"ok": False, "reason": "Неизвестный свиток воскрешения"}

    async with get_user_lock(uid):
        active = db.get_wb_active_spawn()
        if not active:
            return {"ok": False, "reason": "Нет активного рейда"}
        spawn_id = int(active["spawn_id"])
        ps = db.get_wb_player_state(spawn_id, uid)
        if not ps:
            return {"ok": False, "reason": "Вы не в рейде"}
        if not int(ps.get("is_dead") or 0):
            return {"ok": False, "reason": "Вы живы — свиток не нужен"}
        if not db.has_item(uid, body.scroll_id):
            return {"ok": False, "reason": "Нет заряда свитка в инвентаре"}

        if not db.remove_from_inventory(uid, body.scroll_id, quantity=1):
            return {"ok": False, "reason": "Не удалось списать свиток"}
        new_hp = db.wb_resurrect_player(spawn_id, uid, hp_pct)
        if new_hp is None:
            # Откат
            db.add_to_inventory(uid, body.scroll_id, quantity=1, bump_unseen=False)
            return {"ok": False, "reason": "Не удалось воскреснуть"}

        return {
            "ok": True,
            "scroll_id": body.scroll_id,
            "hp_pct": hp_pct,
            "new_hp": new_hp,
            "max_hp": int(ps.get("max_hp") or 100),
        }


async def world_boss_claim_reward_inner(body: ClaimRewardBody, *, db, get_user_from_init_data) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    async with get_user_lock(uid):
        row = db.claim_wb_reward(reward_id=int(body.reward_id), user_id=uid)
        if not row:
            return {"ok": False, "reason": "Награда уже забрана или недоступна"}
        gold = int(row.get("gold") or 0)
        exp = int(row.get("exp") or 0)
        diamonds = int(row.get("diamonds") or 0)
        if gold or exp or diamonds:
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute(
                "UPDATE players SET gold = gold + ?, exp = exp + ?, diamonds = diamonds + ? "
                "WHERE user_id = ?",
                (gold, exp, diamonds, uid),
            )
            conn.commit()
            conn.close()
        chest = row.get("chest_type")
        chest_added = False
        chest_error = None
        if chest:
            try:
                db.add_to_inventory(uid, chest, quantity=1)
                chest_added = True
                log.info("claim_reward: chest %s added to uid=%s", chest, uid)
            except Exception as e:
                chest_error = str(e)
                log.warning("claim_reward: FAILED add chest %s to uid=%s: %s", chest, uid, e)
                # Повторная попытка с новым соединением
                try:
                    db.add_to_inventory(uid, chest, quantity=1)
                    chest_added = True
                    log.info("claim_reward: chest %s added to uid=%s (retry ok)", chest, uid)
                    chest_error = None
                except Exception as e2:
                    log.warning("claim_reward: retry FAILED chest %s uid=%s: %s", chest, uid, e2)
                    chest_error = str(e2)
        return {
            "ok": True, "reward_id": int(body.reward_id),
            "gold": gold, "exp": exp, "diamonds": diamonds,
            "chest_type": chest,
            "chest_added": chest_added,
            "chest_error": chest_error,
            "contribution_pct": float(row.get("contribution_pct") or 0.0),
            "is_victory": bool(row.get("is_victory")),
        }


async def world_boss_reminder_toggle_inner(body: ReminderToggleBody, *, db, get_user_from_init_data) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    db.set_wb_reminder_opt_in(uid, bool(body.enabled))
    return {"ok": True, "enabled": bool(body.enabled)}


async def world_boss_shield_inner(body: ShieldBody, *, db, get_user_from_init_data) -> dict:
    """Активирует щит игрока на 2 секунды (-30% входящего урона).
    Серверный CD 8 сек проверяется на основе предыдущего shield_until_ms."""
    import time
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    active = db.get_wb_active_spawn()
    if not active:
        return {"ok": False, "reason": "Нет активного рейда"}
    spawn_id = int(active["spawn_id"])
    ps = db.get_wb_player_state(spawn_id, uid)
    if not ps:
        return {"ok": False, "reason": "Сначала ударь босса хотя бы раз"}
    now_ms = int(time.time() * 1000)
    prev_until = int(ps.get("shield_until_ms") or 0)
    # CD 8 сек: щит снова можно активировать через 8 сек после прошлого start
    # (т.е. through 6 сек после окончания 2-сек активной фазы).
    prev_start = prev_until - 2000
    if now_ms - prev_start < 8000:
        wait = (8000 - (now_ms - prev_start)) // 1000 + 1
        return {"ok": False, "reason": f"Перезарядка ещё {wait} сек"}
    end_ms = db.wb_activate_shield(spawn_id, uid, duration_ms=2000)
    return {"ok": True, "shield_until_ms": end_ms, "duration_ms": 2000}


async def world_boss_auto_bot_toggle_inner(body: AutoBotToggleBody, *, db, get_user_from_init_data) -> dict:
    """Тогл «авто-бой из лобби» — бот зайдёт в рейд если игрок офлайн.
    Записывается в players.wb_auto_bot_pending. Сбрасывается при старте рейда."""
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    enabled = bool(body.enabled)
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE players SET wb_auto_bot_pending=? WHERE user_id=?",
        (1 if enabled else 0, uid),
    )
    conn.commit()
    conn.close()
    return {"ok": True, "enabled": enabled}


WB_ENTRY_FEE = 50  # золото за регистрацию (идёт в призовой фонд)


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
    cur = conn.cursor()

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
        conn.close()
        return {"ok": True, "is_registered": True, "registrants_count": count,
                "spawn_id": spawn_id, "gold_left": gold_left}

    # Атомарно списываем взнос (AND gold >= fee предотвращает уход в минус)
    cur.execute(
        "SELECT gold FROM players WHERE user_id=?", (uid,)
    )
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
    conn.close()

    return {"ok": True, "is_registered": True, "registrants_count": count,
            "spawn_id": spawn_id, "gold_left": gold_left}


async def world_boss_enter_active_inner(body: EnterActiveBody, *, db, get_user_from_init_data) -> dict:
    """Оплата входа в АКТИВНЫЙ рейд (в первые 2 мин). Если уже зарегистрирован — бесплатно."""
    from datetime import datetime, timezone
    from config.world_boss_constants import WB_LATE_JOIN_WINDOW_SEC

    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])

    active = db.get_wb_active()
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

    # Уже зарегистрирован (платил раньше) — пропускаем бесплатно
    cur.execute(
        "SELECT 1 FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
        (spawn_id, uid),
    )
    if cur.fetchone():
        cur.execute("SELECT gold FROM players WHERE user_id=?", (uid,))
        row = cur.fetchone()
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
