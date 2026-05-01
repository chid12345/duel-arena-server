"""Сериализация игрока и premium-поля для TMA API."""

from __future__ import annotations

from datetime import datetime

from config import (
    AGI_BONUS_PCT_PER_STEP,
    AGI_BONUS_STEP,
    CRIT_MAX_CHANCE,
    DIAMONDS_CLASSES,
    DODGE_MAX_CHANCE,
    FREE_CLASSES,
    GOLD_CLASSES,
    HP_REGEN_BASE_SECONDS,
    HP_REGEN_ENDURANCE_BONUS,
    INT_BONUS_PCT_PER_STEP,
    INT_BONUS_STEP,
    MAX_LEVEL,
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    PLAYER_START_MAX_HP,
    STAMINA_PER_FREE_STAT,
    STRENGTH_DAMAGE_FLAT_PER_LEVEL,
    STRENGTH_DAMAGE_POWER,
    STRENGTH_DAMAGE_SCALE,
    armor_reduction,
    exp_needed_for_next_level,
    stamina_stats_invested,
    total_free_stats_at_level,
)

from api.tma_avatar_bonus import AVATAR_BY_ID, _avatar_effective_bonus


def _premium_fields(player: dict) -> dict:
    """Вычислить поля Premium из данных игрока."""
    until_str = player.get("premium_until")
    if not until_str:
        return {"is_premium": False, "premium_until": None, "premium_days_left": 0}
    try:
        until = datetime.fromisoformat(until_str)
        if until <= datetime.utcnow():
            return {"is_premium": False, "premium_until": until_str, "premium_days_left": 0}
        days_left = max(0, (until - datetime.utcnow()).days)
        return {"is_premium": True, "premium_until": until_str, "premium_days_left": days_left}
    except Exception:
        return {"is_premium": False, "premium_until": None, "premium_days_left": 0}


def _player_api(player: dict, combined_buffs: dict = None, eq_stats: dict = None) -> dict:
    """Сериализовать игрока для API."""
    lv = int(player.get("level", 1))
    mhp = int(player.get("max_hp", PLAYER_START_MAX_HP))
    chp = int(player.get("current_hp", mhp))
    s = int(player.get("strength", 3))
    agi = int(player.get("endurance", 3))
    intu = int(player.get("crit", PLAYER_START_CRIT))
    # Эффективные статы с учётом активных баффов (свитки/зелья) для производных
    _cb = combined_buffs or {}
    _s = s + int(_cb.get("strength", 0))
    _agi = agi + int(_cb.get("endurance", 0))  # endurance buff → ловкость/уворот в бою
    _intu = intu + int(_cb.get("crit", 0))
    # Стат-бонусы экипировки (щит) применяем до расчёта dmg/dodge/crit
    _eq_early = eq_stats or {}
    _eq_str  = int(_eq_early.get("str_bonus", 0) or 0)
    _eq_agi  = int(_eq_early.get("agi_bonus", 0) or 0)
    _eq_intu = int(_eq_early.get("intu_bonus", 0) or 0)
    _s    += _eq_str
    _agi  += _eq_agi
    _intu += _eq_intu
    vyn = stamina_stats_invested(mhp, lv)
    _vyn = vyn + int(_cb.get("stamina", 0))  # stamina buff → симулирует вложения → +броня
    tf = total_free_stats_at_level(lv)

    avg_agi = max(1, PLAYER_START_ENDURANCE + tf // 4)
    avg_intu = max(1, PLAYER_START_CRIT + tf // 4)
    agi_inv = max(0, _agi - PLAYER_START_ENDURANCE)
    int_inv = max(0, _intu - PLAYER_START_CRIT)
    _dodge_base = min(
        DODGE_MAX_CHANCE,
        _agi / (_agi + avg_agi) * DODGE_MAX_CHANCE + (agi_inv // AGI_BONUS_STEP) * AGI_BONUS_PCT_PER_STEP,
    )
    dodge_p = int(_dodge_base * 100)
    crit_p = int(
        min(
            CRIT_MAX_CHANCE,
            _intu / (_intu + avg_intu) * CRIT_MAX_CHANCE + (int_inv // INT_BONUS_STEP) * INT_BONUS_PCT_PER_STEP,
        )
        * 100
    )
    armor_p = round(armor_reduction(_vyn, lv) * 100, 1)
    dmg = max(5, int(STRENGTH_DAMAGE_FLAT_PER_LEVEL * lv + STRENGTH_DAMAGE_SCALE * (_s**STRENGTH_DAMAGE_POWER)))
    _eff_mhp = mhp + int(_cb.get("hp_bonus", 0)) + int(_cb.get("stamina", 0)) * STAMINA_PER_FREE_STAT

    # Воин-тип меняет отображаемые статы (синхрон с damage.py)
    _wt = (player.get("warrior_type") or "default").split("_")[0]
    if _wt == "tank":
        dmg     = int(dmg * 1.12)   # +12% (было 1.15)
        dodge_p = max(0, dodge_p - 8)
    elif _wt == "agile":
        dodge_p = min(50, dodge_p + 8)
        armor_p = round(armor_p * 0.90, 1)
    elif _wt == "crit":
        crit_p   = min(50, crit_p + 5)  # +5% (было +8%)
        _eff_mhp = max(1, int(_eff_mhp * 0.90))

    # Бонусы экипировки (поверх воин-типа, синхрон с battle_system/mixins/start.py)
    _eq = eq_stats or {}
    _eq_atk  = int(_eq.get("atk_bonus", 0) or 0)
    _eq_def  = float(_eq.get("def_pct", 0.0) or 0.0)
    _eq_hp   = int(_eq.get("hp_bonus", 0) or 0)
    _eq_crit = int(_eq.get("crit_bonus", 0) or 0)
    _eq_pen      = float(_eq.get("pen_pct", 0.0) or 0.0)
    _eq_dodge    = int(_eq.get("dodge_bonus", 0) or 0)
    _eq_regen    = int(_eq.get("regen_bonus", 0) or 0)
    _eq_lifesteal = int(_eq.get("lifesteal_pct", 0) or 0)
    _eq_crit_resist = int(_eq.get("crit_resist_pct", 0) or 0)
    _eq_double = int(_eq_early.get("double_pct", 0) or 0)
    _eq_gold   = int(_eq_early.get("gold_pct", 0) or 0)
    _eq_xp     = int(_eq_early.get("xp_pct", 0) or 0)
    _eq_accuracy    = int(_eq_early.get("accuracy", 0) or 0)
    _eq_anti_dodge  = int(_eq_early.get("anti_dodge_pct", 0) or 0)
    _eq_silence     = int(_eq_early.get("silence_pct", 0) or 0)
    _eq_slow        = int(_eq_early.get("slow_pct", 0) or 0)
    _eq_regen_speed = int(_eq_early.get("regen_speed_pct", 0) or 0)
    # _eq_str/agi/intu уже определены выше (ранняя фаза)
    if _eq_atk:  dmg       = dmg + _eq_atk
    if _eq_hp:   _eff_mhp  = _eff_mhp + _eq_hp

    # Снаряга = постоянный HP-бонус (в отличие от зелий — всегда надета).
    # Добавляем eq-бонус к current_hp и max_hp для отображения, чтобы во всех
    # экранах (Профиль / Герой / Бой) было одно и то же число.
    # Реген в DB идёт до base max_hp — разница current→max всегда одинакова.
    _base_eq_mhp = mhp + _eq_hp          # 1411 + 138 = 1549
    _display_chp = min(_base_eq_mhp, chp + _eq_hp)
    if _eq_def:  armor_p   = min(95.0, round(armor_p + _eq_def * 100, 1))
    if _eq_dodge: dodge_p  = int(min(DODGE_MAX_CHANCE * 100, dodge_p + _eq_dodge))
    if _eq_crit:
        _intu_eq = _intu + _eq_crit
        _int_inv_eq = max(0, _intu_eq - PLAYER_START_CRIT)
        crit_p_eq = int(min(CRIT_MAX_CHANCE, _intu_eq / (_intu_eq + avg_intu) * CRIT_MAX_CHANCE + (_int_inv_eq // INT_BONUS_STEP) * INT_BONUS_PCT_PER_STEP) * 100)
        crit_p = min(50, crit_p + max(0, crit_p_eq - crit_p))

    need_xp = exp_needed_for_next_level(lv)

    title = (player.get("display_title") or "").strip()
    avatar_id = (player.get("equipped_avatar_id") or "base_neutral").strip()
    avatar = AVATAR_BY_ID.get(avatar_id) or {}
    _ab = int(player.get("avatar_bonus_applied", 0) or 0)

    # Бонус аватара (вшит в DB только при _ab=1)
    if _ab:
        avb = _avatar_effective_bonus(lv, avatar_id)
        avt_str  = int(avb.get("strength", 0))
        avt_agi  = int(avb.get("endurance", 0))
        avt_intu = int(avb.get("crit", 0))
        avt_sta  = int(avb.get("hp_flat", 0) or 0) // max(1, int(STAMINA_PER_FREE_STAT))
    else:
        avt_str = avt_agi = avt_intu = avt_sta = 0

    cls_id = (player.get("current_class") or "").strip()
    cls_type = (player.get("current_class_type") or "").strip()
    class_info = None
    if cls_type in ("free", "gold", "diamonds"):
        if cls_type == "free":
            class_info = FREE_CLASSES.get(cls_id)
        elif cls_type == "gold":
            class_info = GOLD_CLASSES.get(cls_id)
        else:
            class_info = DIAMONDS_CLASSES.get(cls_id)

    # Бонусы класса (всегда вшиты в DB при экипировке класса)
    cls_str_b  = int(class_info.get("bonus_strength",  0) or 0) if class_info else 0
    cls_agi_b  = int(class_info.get("bonus_agility",   0) or 0) if class_info else 0
    cls_intu_b = int(class_info.get("bonus_intuition", 0) or 0) if class_info else 0
    cls_sta_b  = int(class_info.get("bonus_endurance", 0) or 0) if class_info else 0

    # Итоговые бонусы для отображения = аватар (если вшит) + класс + экипировка
    bonus_strength  = avt_str  + cls_str_b
    bonus_agility   = avt_agi  + cls_agi_b
    bonus_intuition = avt_intu + cls_intu_b
    bonus_stamina   = avt_sta  + cls_sta_b

    # База = DB минус всё вшитое (аватар + класс) → чистые вложения игрока
    base_strength  = max(1, s   - cls_str_b  - avt_str)
    base_agility   = max(1, agi - cls_agi_b  - avt_agi)
    base_intuition = max(1, intu - cls_intu_b - avt_intu)
    base_stamina   = max(0, vyn - cls_sta_b  - avt_sta)
    return {
        "user_id": player.get("user_id"),
        "username": player.get("username") or "Боец",
        "display_title": title or None,
        "level": lv,
        "exp": int(player.get("exp", 0)),
        "exp_needed": need_xp,
        "strength": s,
        "agility": agi,
        "intuition": intu,
        "stamina": vyn + PLAYER_START_ENDURANCE,
        "strength_effective": _s,
        "agility_effective": _agi,
        "intuition_effective": _intu,
        "stamina_effective": _vyn + PLAYER_START_ENDURANCE,
        "max_hp_effective": _eff_mhp,
        "max_hp": _base_eq_mhp,
        "current_hp": _display_chp,
        "gold": int(player.get("gold", 0)),
        "diamonds": int(player.get("diamonds", 0)),
        "wins": int(player.get("wins", 0)),
        "losses": int(player.get("losses", 0)),
        "rating": int(player.get("rating", 1000)),
        "free_stats": int(player.get("free_stats", 0)),
        "win_streak": int(player.get("win_streak", 0)),
        "dmg": dmg,
        "dodge_pct": dodge_p,
        "crit_pct": crit_p,
        "armor_pct": armor_p,
        "hp_pct": int(_display_chp / max(1, _base_eq_mhp) * 100),
        "xp_pct": int(int(player.get("exp", 0)) / max(1, need_xp) * 100) if need_xp > 0 else 100,
        "max_level": lv >= MAX_LEVEL,
        "equipped_avatar_id": avatar_id,
        "avatar_tier": avatar.get("tier", "base"),
        "avatar_name": avatar.get("name"),
        "avatar_badge": avatar.get("badge"),
        "stats_base": {
            "strength": base_strength,
            "agility": base_agility,
            "intuition": base_intuition,
            "stamina": base_stamina,
        },
        "stats_bonus_total": {
            "strength":  bonus_strength + _eq_str,
            "agility":   bonus_agility  + _eq_agi,
            "intuition": bonus_intuition + _eq_intu,
            "stamina":   bonus_stamina,
        },
        "regen_per_min": round(
            mhp / HP_REGEN_BASE_SECONDS * (1.0 + max(0, vyn) * HP_REGEN_ENDURANCE_BONUS) * 60
            * (1.0 + _eq_regen_speed / 100.0),
            1,
        ),
        "regen_secs_to_full": (
            0
            if _display_chp >= _base_eq_mhp
            else int(
                (_base_eq_mhp - _display_chp)
                / max(
                    0.001,
                    mhp / HP_REGEN_BASE_SECONDS * (1.0 + max(0, vyn) * HP_REGEN_ENDURANCE_BONUS)
                    * (1.0 + _eq_regen_speed / 100.0),
                )
            )
        ),
        "warrior_type": (player.get("warrior_type") or "default"),
        "inventory_unseen": int(player.get("inventory_unseen", 0) or 0),
        "eq_stats": {
            "atk_bonus":    _eq_atk,
            "def_pct":      round(_eq_def * 100, 1),
            "hp_bonus":     _eq_hp,
            "crit_bonus":   _eq_crit,
            "pen_pct":      round(_eq_pen * 100, 1),
            "dodge_bonus":  _eq_dodge,
            "regen_bonus":  _eq_regen,
            "lifesteal_pct":   _eq_lifesteal,
            "crit_resist_pct": _eq_crit_resist,
            "str_bonus":  _eq_str,
            "agi_bonus":  _eq_agi,
            "intu_bonus": _eq_intu,
            "double_pct": _eq_double,
            "gold_pct":   _eq_gold,
            "xp_pct":     _eq_xp,
            "accuracy":        _eq_accuracy,
            "anti_dodge_pct":  _eq_anti_dodge,
            "silence_pct":     _eq_silence,
            "slow_pct":        _eq_slow,
            "regen_speed_pct": _eq_regen_speed,
        },
        **_premium_fields(player),
    }
