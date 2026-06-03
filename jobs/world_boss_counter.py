"""Ответка Мирового босса — выбор целей + применение урона (Закон 1/2).

Вынесено из jobs/world_boss_battle_tick.py (тот упёрся в лимит 200 строк).
План ответки по типам — config.world_boss.abilities.wb_counter_plan:
  Лич ≤75% бьёт 2 цели («Эпидемия»), Тень ≤75% — лидера («Слепая зона»).
Кулдаун (как часто) считают вызыватели через wb_counter_cooldown.

Серверный расчёт урона — анти-чит (клиент урон не шлёт).
"""
from __future__ import annotations

import json as _json
import logging
import random
import time as _time

from config.world_boss.abilities import (
    wb_counter_plan,
    wb_counter_str_mult,
    wb_death_heal_pct,
    wb_lifesteal_pct,
)
from repositories.world_boss.damage_calc import calc_boss_attack_damage

logger = logging.getLogger(__name__)


def _pick_mixed(top_alive: list, all_alive: list) -> dict | None:
    """60% — топ-5 по урону (драматизм), 40% — случайный из ВСЕХ живых
    (закрывает эксплойт «не бью → не получаю урон»). Нет живых → None."""
    if not all_alive and not top_alive:
        return None
    use_top = top_alive and random.random() < 0.6
    pool = top_alive if use_top else (all_alive or top_alive)
    return random.choice(pool) if pool else None


def _select_targets(top_alive: list, all_alive: list, plan: dict) -> list:
    """Список уникальных целей (1..N) по плану ответки."""
    n = max(1, int(plan.get("targets", 1)))
    mode = plan.get("mode", "mixed")
    chosen, seen = [], set()
    # Первая цель: top1 — лидер в 70% случаев (Слепая зона), иначе обычный микс.
    if mode == "top1" and top_alive:
        first = top_alive[0] if random.random() < 0.7 else _pick_mixed(top_alive, all_alive)
    else:
        first = _pick_mixed(top_alive, all_alive)
    if first:
        chosen.append(first); seen.add(int(first["user_id"]))
    # Доп. цели (Эпидемия): случайные живые без повторов.
    pool = [p for p in (all_alive or top_alive) if int(p["user_id"]) not in seen]
    while len(chosen) < n and pool:
        pick = random.choice(pool)
        chosen.append(pick); seen.add(int(pick["user_id"]))
        pool = [p for p in pool if int(p["user_id"]) not in seen]
    return chosen


def _apply_counter_to_user(db, spawn_id: int, user_id: int, stat_profile: dict,
                           boss_type: str = "", hp_pct: float = 1.0) -> None:
    """Применяет одну ответку босса к конкретному игроку (защита/свитки/щит/
    шипы/второе дыхание). Если увернулся/заблокировал — урона нет.
    Демон («Кровавый пир») лечится долей нанесённого урона (wb_lifesteal_pct)."""
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
    try:
        _active = _json.loads(ps.get("raid_scrolls_active") or "[]")
        if not isinstance(_active, list):
            _active = []
    except Exception:
        _active = []
    if not _active:
        _active = [s for s in (ps.get("raid_scroll_1"), ps.get("raid_scroll_2")) if s]
    dmg, dodged, _dbg = calc_boss_attack_damage(ps, stat_profile, scrolls=_active)
    if dodged:
        logger.debug("wb counter: uid=%s dodged/blocked", user_id)
        return
    # Щит игрока (-30% урона) если активен.
    try:
        if int(ps.get("shield_until_ms") or 0) > int(_time.time() * 1000):
            dmg = int(dmg * 0.7)
    except Exception:
        pass
    new_hp, is_dead = db.wb_apply_damage_to_player(spawn_id, user_id, dmg)
    # Вампиризм Демона («Кровавый пир»): лечится долей нанесённого урона.
    # Хорошая защита/уворот игрока (меньше dmg) = босс меньше лечится.
    ls = wb_lifesteal_pct(boss_type, hp_pct)
    if ls and dmg > 0:
        try:
            db.wb_heal_boss(spawn_id, max(1, int(dmg * ls)))
        except Exception:
            pass
    # Хил на смерть: Лич «Жатва» (≤25%), Демон «Жажда крови» (≤75%).
    if is_dead:
        try:
            dh = wb_death_heal_pct(boss_type, hp_pct)
            if dh > 0:
                db.wb_heal_boss_pct(spawn_id, dh)
        except Exception:
            pass
    # Шипы (reflect_pct, броня №1): % полученного урона → в HP босса.
    # Помогает рейду, но НЕ идёт в личный total_damage (нельзя фармить награду).
    if _eq_reflect and dmg > 0:
        try:
            db.apply_damage_to_boss(spawn_id, max(1, int(dmg * _eq_reflect / 100.0)))
        except Exception:
            pass
    logger.debug("wb counter: uid=%s dmg=%s → hp=%s dead=%s", user_id, dmg, new_hp, is_dead)
    # Set-bonus perk «Второе дыхание» (серебро 6/6) — раз в рейд, при HP < 30% +100 HP.
    try:
        if (_sb["perk_id"] == "second_wind"
                and not is_dead
                and not int(ps.get("sb_second_wind_used") or 0)):
            max_hp = max(1, int(ps.get("max_hp") or 1))
            if new_hp > 0 and new_hp / max_hp < 0.30:
                db.wb_apply_second_wind(spawn_id, user_id, heal=100)
                logger.info("wb counter: second_wind uid=%s +100hp", user_id)
    except Exception as e:
        logger.warning("wb counter: second_wind error uid=%s: %s", user_id, e)


def do_boss_counter_attack(db, spawn_id: int, stat_profile: dict,
                           boss_type: str = "", hp_pct: float = 1.0) -> None:
    """Ответка босса: выбирает цели по плану типа и бьёт каждую."""
    plan = wb_counter_plan(boss_type, hp_pct)
    # Сила ответки по типу: Лич «Армия мёртвых» (за павших), Голем «Раскол» (≤25%).
    profile = stat_profile
    try:
        dead = db.wb_count_dead(spawn_id) if boss_type == "lich" else 0
        mult = wb_counter_str_mult(boss_type, hp_pct, dead)
        if mult != 1.0:
            profile = dict(stat_profile)
            profile["str"] = round(float(profile.get("str", 1.0)) * mult, 3)
    except Exception:
        profile = stat_profile
    top = db.wb_get_top_alive(spawn_id, limit=5)
    all_alive = db.wb_get_any_alive(spawn_id)
    for target in _select_targets(top, all_alive, plan):
        _apply_counter_to_user(db, spawn_id, int(target["user_id"]), profile, boss_type, hp_pct)
