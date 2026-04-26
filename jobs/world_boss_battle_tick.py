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
import random
from datetime import datetime, timezone

import json

from config.world_boss_constants import (
    WB_CROWN_THRESHOLDS,
    WB_ENRAGE_MULT,
    is_vulnerability_window,
)
from repositories.world_boss.damage_calc import (
    BOSS_ATTACK_COOLDOWN_SEC,
    calc_boss_attack_damage,
)

logger = logging.getLogger(__name__)


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).replace("T", " ").split(".")[0]
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def _pick_target(top_alive: list, all_alive: list) -> dict | None:
    """Выбор цели: 60% — топ-5 по урону (драматизм), 40% — случайный из ВСЕХ
    живых (закрывает эксплойт 'не бью → не получаю урон').
    Если живых нет — None."""
    if not all_alive and not top_alive:
        return None
    use_top = top_alive and random.random() < 0.6
    pool = top_alive if use_top else (all_alive or top_alive)
    return random.choice(pool) if pool else None


def _do_boss_counter_attack(db, spawn_id: int, stat_profile: dict) -> None:
    """Ответка: 60% — топ-5 по урону, 40% — случайный из всех живых."""
    top = db.wb_get_top_alive(spawn_id, limit=5)
    all_alive = db.wb_get_any_alive(spawn_id)
    target = _pick_target(top, all_alive)
    if not target:
        return
    user_id = int(target["user_id"])
    ps = db.get_wb_player_state(spawn_id, user_id)
    if not ps or int(ps.get("is_dead") or 0):
        return
    dmg, dodged, _ = calc_boss_attack_damage(
        ps, stat_profile,
        scroll_1=ps.get("raid_scroll_1"),
        scroll_2=ps.get("raid_scroll_2"),
    )
    if dodged:
        logger.debug("wb battle: boss hit user=%s dodged", user_id)
        return
    new_hp, is_dead = db.wb_apply_damage_to_player(spawn_id, user_id, dmg)
    logger.debug(
        "wb battle: boss hit user=%s dmg=%s → hp=%s dead=%s",
        user_id, dmg, new_hp, is_dead,
    )


def _try_enrage_on_50(db, spawn_id: int, stat_profile: dict) -> dict | None:
    """Вместе с короной 50% переводим босса в stage=2 (ярость).
    Множим stat_profile на WB_ENRAGE_MULT → ответка усиливается.
    Идемпотентно (UPDATE ... WHERE stage<2).
    Возвращает новый профиль если ярость сработала, иначе None.
    """
    try:
        new_profile = {
            k: round(float(v) * WB_ENRAGE_MULT, 3)
            for k, v in (stat_profile or {}).items()
        }
        if db.wb_try_enrage(spawn_id, json.dumps(new_profile)):
            logger.info("wb battle: ⚡ ENRAGE spawn=%s profile→%s", spawn_id, new_profile)
            return new_profile
    except Exception as e:
        logger.warning("wb battle: enrage error spawn=%s: %s", spawn_id, e)
    return None


def _check_crown_strikes(db, spawn_id: int, current_hp: int, max_hp: int,
                         stat_profile: dict) -> dict:
    """Срабатывает 0/1/2/3 коронных ударов (атомарно, по одному за тик).
    На пороге 50% (flag_bit=0b010) дополнительно триггерит ярость (stage=2).
    Возвращает актуальный stat_profile (обновлённый если произошла ярость).
    """
    if max_hp <= 0:
        return stat_profile
    hp_pct = current_hp / max_hp
    for threshold_pct, dmg_pct, flag_bit, label in WB_CROWN_THRESHOLDS:
        if hp_pct <= threshold_pct and db.wb_try_trigger_crown(spawn_id, flag_bit):
            killed = db.wb_aoe_damage_all_alive(spawn_id, dmg_pct)
            logger.info(
                "wb battle: crown strike %s (dmg_pct=%.2f) — killed=%d",
                label, dmg_pct, len(killed),
            )
            if flag_bit == 0b010:
                enraged_profile = _try_enrage_on_50(db, spawn_id, stat_profile)
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

            # 1. Коронные удары — сначала, чтобы ярость обновила профиль до ответки.
            if current_hp > 0:
                stat_profile = _check_crown_strikes(db, spawn_id, current_hp, max_hp, stat_profile)

            # 2. Ответка: уже с актуальным профилем (с учётом возможной ярости).
            if db.wb_try_mark_boss_attacked(spawn_id, BOSS_ATTACK_COOLDOWN_SEC):
                _do_boss_counter_attack(db, spawn_id, stat_profile)

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

        # 4. WS-бродкаст подписчикам (работает даже без активного рейда — event=wb_idle).
        await wb_broadcast_tick(db)

    except Exception as e:
        logger.warning("world_boss_battle_tick: ошибка тика: %s", e)
