"""
Регистрация всех фоновых задач (JobQueue) в одном месте.

Импорты конкретных job-функций — ленивые, чтобы не тянуть тяжёлые модули
на старте и сохранять прежний порядок инициализации.
"""
import logging
from datetime import time as dt_time
from telegram.ext import Application

logger = logging.getLogger(__name__)


def register_jobs(application: Application) -> None:
    """Регистрирует daily и repeating jobs. Вызывается из post_init."""

    # Daily: напоминание о бонусе в 12:00
    from jobs.daily_bonus_reminder import daily_bonus_reminder
    application.job_queue.run_daily(
        daily_bonus_reminder,
        time=dt_time(hour=12, minute=0),
        name="daily_bonus_reminder",
    )

    # PvP-очередь — чистка устаревших (раз в 2 мин)
    from jobs.pvp_clear_stale import pvp_clear_stale_job
    application.job_queue.run_repeating(
        pvp_clear_stale_job, interval=120, first=120,
        name="pvp_clear_stale",
    )

    # HP-уведомления (раз в 90 сек)
    from jobs.hp_full_notify import hp_full_notify_job
    application.job_queue.run_repeating(
        hp_full_notify_job, interval=90, first=90,
        name="hp_full_notify",
    )

    # Очистка боёв без реплея — раз в час, пачками.
    from jobs.battles_cleanup import battles_cleanup_job
    application.job_queue.run_repeating(
        battles_cleanup_job, interval=3600, first=60,
        name="battles_cleanup",
    )

    # Авто-кик неактивных участников клана (30+ дней без боя), раз в сутки.
    from jobs.clan_inactive_kick import clan_inactive_kick_job
    application.job_queue.run_repeating(
        clan_inactive_kick_job, interval=86400, first=300,
        name="clan_inactive_kick",
    )

    # Ротация сезона клана (7д) — раз в час: закрывает просроченный + новый.
    from jobs.clan_season_rotate import clan_season_rotate_job
    application.job_queue.run_repeating(
        clan_season_rotate_job, interval=3600, first=120,
        name="clan_season_rotate",
    )

    # Ротация сезона батл-пасса (90 дней) — раз в час.
    from jobs.bp_season_rotate import bp_season_rotate_job
    application.job_queue.run_repeating(
        bp_season_rotate_job, interval=3600, first=180,
        name="bp_season_rotate",
    )

    # Мировой босс — тик раз в 10 сек (расписание 10 мин).
    from jobs.world_boss_scheduler import world_boss_scheduler_job
    application.job_queue.run_repeating(
        world_boss_scheduler_job, interval=10, first=5,
        name="world_boss_scheduler",
    )

    # Мировой босс — анонс в общий чат за 5 мин до рейда (раз в 60 сек, идемпотентно).
    from jobs.world_boss_announce import world_boss_announce_5min_job
    application.job_queue.run_repeating(
        world_boss_announce_5min_job, interval=60, first=45,
        name="world_boss_announce_5min",
    )

    # Мировой босс — индивидуальные пуши подписчикам за 5 мин до рейда.
    from jobs.world_boss_remind import world_boss_reminder_push_job
    application.job_queue.run_repeating(
        world_boss_reminder_push_job, interval=60, first=50,
        name="world_boss_reminder_push",
    )

    # Финализация клан-войн (24ч ends_at) — раз в 10 минут
    from jobs.clan_wars_finalize import clan_wars_finalize_job
    application.job_queue.run_repeating(
        clan_wars_finalize_job, interval=600, first=180,
        name="clan_wars_finalize",
    )

    # Авто-healing кланов (мёртвый лидер → передача или роспуск), раз в сутки.
    from jobs.clan_heal import clan_heal_job
    application.job_queue.run_repeating(
        clan_heal_job, interval=86400, first=600,
        name="clan_heal",
    )
