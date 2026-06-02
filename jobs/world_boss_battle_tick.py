"""Боевой тик Мирового босса (каждую секунду пока рейд активен).

Делает 3 вещи:
1. Ответка босса — раз в 6 сек по случайному из топ-5 по урону (живых).
2. Коронные удары — когда HP падает ниже 75% / 50% / 25%, каждый ровно 1 раз.
3. (Окно уязвимости x3 — просто индикатор, вычисляется на ходу по elapsed.)

Никаких side-effect'ов наружу: записи в БД + лог.
WS-бродкаст живых игроков отдельным каналом (Шаг 1.9).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import json

from config.world_boss_constants import (
    WB_CROWN_THRESHOLDS,
    is_vulnerability_window,
)
from config.world_boss.abilities import (
    wb_counter_cooldown,
    wb_crown_dmg_pct,
    wb_enrage_profile,
    wb_periodic_aoe,
)
from repositories.world_boss.damage_calc import BOSS_ATTACK_COOLDOWN_SEC
from jobs.world_boss_counter import do_boss_counter_attack

logger = logging.getLogger(__name__)


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).replace("T", " ").split(".")[0]
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def _try_enrage_on_50(db, spawn_id: int, stat_profile: dict, boss_type: str = "") -> dict | None:
    """Вместе с короной 50% переводим босса в stage=2 (ярость).
    У каждого типа своя ярость (config.world_boss.abilities.wb_enrage_profile):
    Огонь/Лава бьют сильнее по str, Паук уходит в agi, Лич — в защиту и т.д.
    Неизвестный тип → ×1.2 по всем (старое поведение).
    Идемпотентно (UPDATE ... WHERE stage<2).
    Возвращает новый профиль если ярость сработала, иначе None.
    """
    try:
        new_profile = wb_enrage_profile(boss_type, stat_profile)
        if db.wb_try_enrage(spawn_id, json.dumps(new_profile)):
            logger.info("wb battle: ⚡ ENRAGE spawn=%s profile→%s", spawn_id, new_profile)
            return new_profile
    except Exception as e:
        logger.warning("wb battle: enrage error spawn=%s: %s", spawn_id, e)
    return None


def _check_crown_strikes(db, spawn_id: int, current_hp: int, max_hp: int,
                         stat_profile: dict, boss_type: str = "") -> dict:
    """Срабатывает 0/1/2/3 коронных ударов (атомарно, по одному за тик).
    Сила удара — своя у каждого типа (wb_crown_dmg_pct), напр. Голем на 50%
    бьёт −10% вместо −5%, Огонь на 75% −5% вместо −3%.
    На пороге 50% (flag_bit=0b010) дополнительно триггерит ярость (stage=2).
    Возвращает актуальный stat_profile (обновлённый если произошла ярость).
    """
    if max_hp <= 0:
        return stat_profile
    hp_pct = current_hp / max_hp
    for threshold_pct, dmg_pct, flag_bit, label in WB_CROWN_THRESHOLDS:
        if hp_pct <= threshold_pct and db.wb_try_trigger_crown(spawn_id, flag_bit):
            dmg_pct = wb_crown_dmg_pct(boss_type, flag_bit, dmg_pct)
            killed = db.wb_aoe_damage_all_alive(spawn_id, dmg_pct)
            logger.info(
                "wb battle: crown strike %s (%s, dmg_pct=%.2f) — killed=%d",
                label, boss_type or "universal", dmg_pct, len(killed),
            )
            if flag_bit == 0b010:
                enraged_profile = _try_enrage_on_50(db, spawn_id, stat_profile, boss_type)
                if enraged_profile:
                    stat_profile = enraged_profile
    return stat_profile


async def world_boss_battle_tick_job(context) -> None:  # noqa: ARG001
    """Один тик боя (1 сек). Быстро, без IO наружу."""
    from api.world_boss_ws import wb_broadcast_tick
    from database import db
    try:
        active = db.get_wb_active_spawn()
        if active:
            spawn_id = int(active["spawn_id"])
            current_hp = int(active.get("current_hp") or 0)
            max_hp = int(active.get("max_hp") or 0)
            stat_profile = active.get("stat_profile") or {}
            boss_type = active.get("boss_type") or ""

            # 1. Коронные удары — сначала, чтобы ярость обновила профиль до ответки.
            if current_hp > 0:
                stat_profile = _check_crown_strikes(db, spawn_id, current_hp, max_hp, stat_profile, boss_type)

            # 2. Ответка: профиль актуальный (с яростью); цели/частота зависят от
            # типа и HP (Лич 2 цели, Тень — лидер и чаще).
            hp_pct = (current_hp / max_hp) if max_hp > 0 else 1.0
            cooldown = wb_counter_cooldown(boss_type, hp_pct, BOSS_ATTACK_COOLDOWN_SEC)
            if db.wb_try_mark_boss_attacked(spawn_id, cooldown):
                do_boss_counter_attack(db, spawn_id, stat_profile, boss_type, hp_pct)

            # 3. Vulnerability window — чисто для лога (эффект применяется при ударе игрока).
            try:
                started_at = _parse_ts(active["started_at"])
                elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
                if is_vulnerability_window(elapsed) and int(elapsed) % 10 == 0:
                    logger.debug("wb battle: vulnerability window OPEN (elapsed=%ds)", int(elapsed))
            except Exception:
                pass

            # 3.5. Авто-боты бьют раз в 10 сек (по elapsed).
            try:
                if int(elapsed) % 10 == 0 and current_hp > 0:
                    total_bot_dmg = db.wb_auto_bots_strike(spawn_id)
                    if total_bot_dmg:
                        logger.debug("wb battle: auto-bots dealt %s dmg", total_bot_dmg)
            except Exception as e:
                logger.warning("wb battle: auto-bots tick error: %s", e)

            # 3.6. Периодический AoE по типу (извержения Лавы / сверхнова Огня).
            # ТОЛЬКО здесь (JOB раз/сек), НЕ в WS — иначе двойной AoE.
            try:
                aoe_pct = wb_periodic_aoe(boss_type, hp_pct, elapsed)
                if aoe_pct > 0 and current_hp > 0:
                    killed = db.wb_aoe_damage_all_alive(spawn_id, aoe_pct)
                    if killed:
                        logger.debug("wb battle: periodic AoE %.3f — killed=%d", aoe_pct, len(killed))
            except Exception as e:
                logger.warning("wb battle: periodic AoE error: %s", e)

        # 4. WS-бродкаст подписчикам (работает даже без активного рейда — event=wb_idle).
        await wb_broadcast_tick(db)

    except Exception as e:
        logger.warning("world_boss_battle_tick: ошибка тика: %s", e)
