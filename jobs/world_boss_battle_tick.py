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
    # Set-bonus: def_pct снижает входящий урон, perk second_wind — после удара.
    # Поштучная защита экипировки: def_pct (щит/шлем/броня №4) + body_def_pct (броня,
    # босс бьёт в корпус) снижают ответку; block_chance — шанс погасить; reflect_pct
    # (шипы брони №1) — отражает урон боссу.
    _sb = {"def_pct": 0.0, "perk_id": None}
    _eq_reflect = 0.0
    try:
        from config.set_bonuses import get_wb_set_data
        player = db.get_or_create_player(user_id, "")
        equipped = db.get_equipment(user_id)
        _sb = get_wb_set_data(equipped, player.get("current_class") or player.get("warrior_type"))
        eq = db.get_equipment_stats(user_id) or {}
        ps = dict(ps)
        if _sb["def_pct"]:
            ps["_eq_def_pct_set"] = _sb["def_pct"]
        ps["_eq_def_pct_item"] = float(eq.get("def_pct", 0.0) or 0.0) + float(eq.get("body_def_pct", 0.0) or 0.0)
        ps["_eq_block_chance"] = float(eq.get("block_chance", 0) or 0)
        _eq_reflect = float(eq.get("reflect_pct", 0) or 0)
    except Exception:
        pass
    # Активные свитки: JSON-список (новая модель «до 5»), фолбэк на slot_1/2.
    import json as _json_bt
    try:
        _active_bt = _json_bt.loads(ps.get("raid_scrolls_active") or "[]")
        if not isinstance(_active_bt, list): _active_bt = []
    except Exception:
        _active_bt = []
    if not _active_bt:
        _legacy_bt = [ps.get("raid_scroll_1"), ps.get("raid_scroll_2")]
        _active_bt = [s for s in _legacy_bt if s]
    dmg, dodged, _dbg_atk = calc_boss_attack_damage(
        ps, stat_profile,
        scrolls=_active_bt,
    )
    if dodged:
        logger.debug("wb battle: boss hit user=%s dodged/blocked", user_id)
        return
    # Щит игрока (-30% урона) если активен.
    try:
        import time as _time
        shield_until = int(ps.get("shield_until_ms") or 0)
        if shield_until > int(_time.time() * 1000):
            dmg = int(dmg * 0.7)
            logger.debug("wb battle: shield active uid=%s dmg→%s", user_id, dmg)
    except Exception:
        pass
    new_hp, is_dead = db.wb_apply_damage_to_player(spawn_id, user_id, dmg)
    # Шипы (reflect_pct, броня №1): отражаем % полученного урона в HP босса.
    # Помогает рейду, но НЕ идёт в личный total_damage (чтобы не фармить награду).
    if _eq_reflect and dmg > 0:
        try:
            db.apply_damage_to_boss(spawn_id, max(1, int(dmg * _eq_reflect / 100.0)))
        except Exception:
            pass
    logger.debug(
        "wb battle: boss hit user=%s dmg=%s → hp=%s dead=%s",
        user_id, dmg, new_hp, is_dead,
    )
    # Set-bonus perk: «Второе дыхание» (серебро 6/6) — раз в рейд, при HP < 30% +100 HP.
    try:
        if (_sb["perk_id"] == "second_wind"
            and not is_dead
            and not int(ps.get("sb_second_wind_used") or 0)):
            max_hp = max(1, int(ps.get("max_hp") or 1))
            if new_hp > 0 and new_hp / max_hp < 0.30:
                db.wb_apply_second_wind(spawn_id, user_id, heal=100)
                logger.info("wb battle: second_wind triggered uid=%s +100hp", user_id)
    except Exception as e:
        logger.warning("wb battle: second_wind error uid=%s: %s", user_id, e)


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
