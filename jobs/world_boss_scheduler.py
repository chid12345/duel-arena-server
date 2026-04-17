"""Планировщик рейдов Мирового босса (см. docs/WORLD_BOSS.md).

Тик каждую минуту:
1. Обеспечить `scheduled` запись на ближайший слот (00/04/08/12/16/20 UTC).
2. Если scheduled_at наступило → стартовать (scheduled → active), пересчитать HP.
3. Если active и истекло 10 мин ИЛИ HP=0 → закрыть, начислить награды.
"""
from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta, timezone

from config.world_boss_constants import (
    WB_BOSS_NAMES,
    WB_DURATION_SEC,
    WB_ONLINE_WINDOW_MIN,
    calc_boss_hp,
    next_spawn_time_utc,
)
from config.world_boss import roll_boss_type
from repositories.world_boss.damage_calc import roll_boss_stat_profile

logger = logging.getLogger(__name__)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_ts(value) -> datetime:
    """Парс TIMESTAMP из SQLite в UTC."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).replace("T", " ").split(".")[0]
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def _ensure_next_scheduled(db) -> None:
    """Создаёт запись на следующий слот, если её нет."""
    nxt = db.get_wb_next_scheduled()
    if nxt:
        return
    active = db.get_wb_active_spawn()
    if active:
        return  # пока активный идёт, следующий создадим после закрытия
    scheduled_at = next_spawn_time_utc(_now_utc())
    btype = roll_boss_type()
    # Имя — из пула типа (если есть), иначе общий список WB_BOSS_NAMES.
    pool = btype.get("name_pool") or WB_BOSS_NAMES
    boss_name = random.choice(pool)
    stat_profile = roll_boss_stat_profile(base=btype.get("stat_profile_base"))
    # HP поставим минимальный-прогнозный, при старте пересчитаем под онлайн.
    db.create_wb_spawn(
        scheduled_at=scheduled_at.strftime("%Y-%m-%d %H:%M:%S"),
        boss_name=boss_name,
        stat_profile=stat_profile,
        max_hp=calc_boss_hp(0),
        boss_type=btype.get("type", "universal"),
    )
    logger.info(
        "world_boss_scheduler: запланирован '%s %s' (%s) на %s",
        btype.get("emoji", ""), boss_name, btype.get("type"),
        scheduled_at.isoformat(),
    )


def _start_due_spawn(db) -> None:
    """Если scheduled_at <= now — стартуем рейд."""
    nxt = db.get_wb_next_scheduled()
    if not nxt:
        return
    try:
        sched_at = _parse_ts(nxt["scheduled_at"])
    except Exception as e:
        logger.warning("world_boss_scheduler: bad scheduled_at=%r: %s",
                       nxt.get("scheduled_at"), e)
        return
    if sched_at > _now_utc():
        return  # ещё не пора
    online = db.wb_count_online_players(window_minutes=WB_ONLINE_WINDOW_MIN)
    max_hp = calc_boss_hp(online)
    db.start_wb_spawn(
        spawn_id=int(nxt["spawn_id"]),
        online_at_start=online,
        max_hp=max_hp,
    )
    logger.info(
        "world_boss_scheduler: стартовал рейд '%s' id=%s, online=%s, HP=%s",
        nxt.get("boss_name"), nxt["spawn_id"], online, max_hp,
    )


def _finish_expired_or_dead_spawn(db) -> None:
    """Закрывает активный рейд если прошло 10 мин ИЛИ HP=0."""
    active = db.get_wb_active_spawn()
    if not active:
        return
    hp = int(active.get("current_hp", 0))
    try:
        started_at = _parse_ts(active["started_at"])
    except Exception:
        started_at = _now_utc() - timedelta(seconds=WB_DURATION_SEC + 1)

    expired = (_now_utc() - started_at).total_seconds() >= WB_DURATION_SEC
    is_dead = hp <= 0
    if not (expired or is_dead):
        return

    spawn_id = int(active["spawn_id"])
    is_victory = is_dead
    top = db.get_wb_top_damagers(spawn_id, limit=1)
    top_uid = int(top[0]["user_id"]) if top else None
    last_hit_uid = db.get_wb_last_hitter(spawn_id) if is_victory else None
    participants = db.get_wb_participants_count(spawn_id)

    db.finish_wb_spawn(
        spawn_id=spawn_id,
        is_victory=is_victory,
        participants=participants,
        last_hit_uid=last_hit_uid,
        top_damage_uid=top_uid,
    )
    logger.info(
        "world_boss_scheduler: закрыт рейд id=%s, victory=%s, participants=%s, top=%s, last=%s",
        spawn_id, is_victory, participants, top_uid, last_hit_uid,
    )
    # Рассчёт и выдача наград всем участникам (идемпотентно по spawn_id+user_id).
    try:
        from repositories.world_boss.rewards_calc import compute_and_create_rewards
        created = compute_and_create_rewards(db, spawn_id, is_victory)
        logger.info("world_boss_scheduler: награды рейда id=%s — создано/найдено %d",
                    spawn_id, created)
    except Exception as e:
        logger.warning("world_boss_scheduler: ошибка расчёта наград spawn=%s: %s",
                       spawn_id, e)


async def world_boss_scheduler_job(context) -> None:  # noqa: ARG001
    """Основной тик планировщика (запускается раз в 60 сек из main.py)."""
    from database import db
    try:
        _finish_expired_or_dead_spawn(db)
        _start_due_spawn(db)
        _ensure_next_scheduled(db)
    except Exception as e:
        logger.warning("world_boss_scheduler: ошибка тика: %s", e)
