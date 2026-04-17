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

from config.world_boss_constants import (
    WB_CROWN_THRESHOLDS,
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


def _pick_target(top_alive: list) -> dict | None:
    """Случайный из топ-5 живых (рандом равномерный)."""
    if not top_alive:
        return None
    return random.choice(top_alive)


def _do_boss_counter_attack(db, spawn_id: int, stat_profile: dict) -> None:
    """Ответка: берём топ-5 живых, бьём случайного на 8% его HP."""
    top = db.wb_get_top_alive(spawn_id, limit=5)
    target = _pick_target(top)
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


def _check_crown_strikes(db, spawn_id: int, current_hp: int, max_hp: int) -> None:
    """Срабатывает 0/1/2/3 коронных ударов (атомарно, по одному за тик)."""
    if max_hp <= 0:
        return
    hp_pct = current_hp / max_hp
    for threshold_pct, dmg_pct, flag_bit, label in WB_CROWN_THRESHOLDS:
        if hp_pct <= threshold_pct and db.wb_try_trigger_crown(spawn_id, flag_bit):
            killed = db.wb_aoe_damage_all_alive(spawn_id, dmg_pct)
            logger.info(
                "wb battle: crown strike %s (dmg_pct=%.2f) — killed=%d",
                label, dmg_pct, len(killed),
            )


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

            # 1. Ответка: пытаемся «занять» слот ответки (раз в 6 сек).
            if db.wb_try_mark_boss_attacked(spawn_id, BOSS_ATTACK_COOLDOWN_SEC):
                _do_boss_counter_attack(db, spawn_id, stat_profile)

            # 2. Коронные удары — по текущему HP.
            if current_hp > 0:
                _check_crown_strikes(db, spawn_id, current_hp, max_hp)

            # 3. Vulnerability window — чисто для лога (эффект применяется при ударе игрока).
            try:
                started_at = _parse_ts(active["started_at"])
                elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
                if is_vulnerability_window(elapsed) and int(elapsed) % 10 == 0:
                    logger.debug("wb battle: vulnerability window OPEN (elapsed=%ds)", int(elapsed))
            except Exception:
                pass

        # 4. WS-бродкаст подписчикам (работает даже без активного рейда — event=wb_idle).
        await wb_broadcast_tick(db)

    except Exception as e:
        logger.warning("world_boss_battle_tick: ошибка тика: %s", e)
