"""tests/test_world_boss_abilities.py — способности 7 боссов (Заход 1).

Покрывают чистый движок config/world_boss/abilities.py:
1) Своя ярость на 50% у каждого типа (str/agi/int множители).
2) Неизвестный тип → старое поведение ×1.2 по всем (back-compat).
3) Свои числа коронных ударов (Огонь 75%, Голем 50%), дефолт для остальных.
4) Реестр: 7 боссов × (passive + t75 + t50 + t25), у каждого name/desc/stage.

Запуск: python -m pytest tests/test_world_boss_abilities.py -v
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.world_boss.abilities import (  # noqa: E402
    BIT_25,
    BIT_50,
    BIT_75,
    WB_ABILITIES,
    wb_ability_meta,
    wb_card_features,
    wb_counter_cooldown,
    wb_counter_plan,
    wb_counter_str_mult,
    wb_crown_dmg_pct,
    wb_crown_labels,
    wb_death_heal_pct,
    wb_enrage_profile,
    wb_is_vuln_window,
    wb_lifesteal_pct,
    wb_periodic_aoe,
    wb_player_dmg_mult,
    wb_str_death_mult,
)


# ── Test 1: своя ярость по типам ──────────────────────────────────────────────

def test_enrage_fire_boosts_only_str():
    base = {"str": 1.0, "agi": 1.0, "int": 1.0}
    out = wb_enrage_profile("fire", base)
    assert out["str"] == 1.3
    assert out["agi"] == 1.0 and out["int"] == 1.0


def test_enrage_spider_boosts_agi():
    out = wb_enrage_profile("spider", {"str": 1.0, "agi": 1.0, "int": 1.0})
    assert out["agi"] == 1.4
    assert out["str"] == 1.0


def test_enrage_lava_is_heaviest_str():
    out = wb_enrage_profile("lava", {"str": 1.0, "agi": 1.0, "int": 1.0})
    assert out["str"] == 1.4


def test_enrage_lich_goes_defensive_agi():
    out = wb_enrage_profile("lich", {"str": 1.0, "agi": 1.0, "int": 1.0})
    assert out["agi"] == 1.25
    assert out["str"] == 1.0


# ── Test 2: неизвестный тип = старое поведение ×1.2 по всем ───────────────────

def test_enrage_unknown_type_is_legacy_all_x12():
    out = wb_enrage_profile("universal", {"str": 1.0, "agi": 1.0, "int": 1.0})
    assert out["str"] == 1.2 and out["agi"] == 1.2 and out["int"] == 1.2
    # пустой/None тоже даёт дефолт
    out2 = wb_enrage_profile("", {"str": 2.0, "agi": 1.0, "int": 1.0})
    assert out2["str"] == 2.4


def test_enrage_preserves_extra_keys():
    out = wb_enrage_profile("fire", {"str": 1.0, "agi": 1.0, "int": 1.0, "def": 5})
    assert out["def"] == 5


# ── Test 3: свои числа корон ──────────────────────────────────────────────────

def test_crown_fire_75_is_stronger():
    # дефолт на 75% = 0.03, у Огня — 0.05
    assert wb_crown_dmg_pct("fire", BIT_75, 0.03) == 0.05


def test_crown_poison_50_is_double():
    # дефолт на 50% = 0.05, у Голема (poison) — 0.10
    assert wb_crown_dmg_pct("poison", BIT_50, 0.05) == 0.10


def test_crown_default_when_no_override():
    # у Лича своих чисел корон нет → возвращается дефолт
    assert wb_crown_dmg_pct("lich", BIT_25, 0.08) == 0.08
    assert wb_crown_dmg_pct("unknown", BIT_75, 0.03) == 0.03


# ── Test 4: реестр способностей полон ─────────────────────────────────────────

def test_registry_has_7_bosses_each_with_4_abilities():
    assert len(WB_ABILITIES) == 7
    for boss_type, abilities in WB_ABILITIES.items():
        for key in ("passive", "t75", "t50", "t25"):
            meta = abilities.get(key)
            assert meta, f"{boss_type}: нет способности {key}"
            assert meta.get("name"), f"{boss_type}.{key}: нет name"
            assert meta.get("desc"), f"{boss_type}.{key}: нет desc"
            assert meta.get("stage") in (2, 3), f"{boss_type}.{key}: stage не 2/3"
            assert isinstance(meta.get("live"), bool), f"{boss_type}.{key}: live не bool"


# ── Test 5: фишки для карточки (весь набор + флаг live) ───────────────────────

def test_card_features_returns_all_four():
    feats = wb_card_features("fire")
    assert len(feats) == 4                       # пассивка + 3 порога
    names = [f["name"] for f in feats]
    assert "Опаляющая аура" in names             # пассивка тоже показывается
    assert "Плавится ядро" in names


def test_card_features_live_flag_is_bool_and_fire_done():
    feats = {f["name"]: f for f in wb_card_features("fire")}
    # Заход 3 завершён — у Огня все 4 фишки включены (в т.ч. ожоги).
    assert feats["Плавится ядро"]["live"] is True
    assert feats["Опаляющая аура"]["live"] is True
    assert all(isinstance(f["live"], bool) for f in wb_card_features("fire"))


def test_card_features_passive_hp_none_first():
    feats = wb_card_features("lich")
    assert feats[0]["hp"] is None                # пассивка первой, «Всегда»
    assert feats[0]["name"] == "Армия мёртвых"


def test_card_features_every_boss_has_live_50pct():
    for t in ("lich", "shadow", "fire", "poison", "spider", "lava", "demon"):
        feats = wb_card_features(t)
        assert any(f["hp"] == 50 and f["live"] for f in feats), f"{t}: нет live 50%"


def test_card_features_unknown_type_empty():
    assert wb_card_features("nope") == []


# ── Test 6: подписи порогов для тостов (только live) ──────────────────────────

def test_crown_labels_fire_all_live():
    lbl = wb_crown_labels("fire")
    assert lbl[BIT_75] == "Тепловая волна"   # включена
    assert lbl[BIT_50] == "Плавится ядро"    # включена
    assert lbl[BIT_25] == "Сверхновая"       # включена (Заход 2 — сверхнова)


def test_crown_labels_lich_all_live():
    lbl = wb_crown_labels("lich")
    assert lbl[BIT_75] == "Эпидемия"
    assert lbl[BIT_50] == "Костяной доспех"
    assert lbl[BIT_25] == "Жатва"           # Заход 3 — хил на смерть включён


def test_crown_labels_unknown_all_none():
    lbl = wb_crown_labels("nope")
    assert lbl[BIT_75] is None and lbl[BIT_50] is None and lbl[BIT_25] is None


# ── Test 7: план ответки по типам (Заход 2b) ──────────────────────────────────

def test_counter_plan_lich_two_targets_below_75():
    assert wb_counter_plan("lich", 0.74)["targets"] == 2
    assert wb_counter_plan("lich", 0.80)["targets"] == 1   # выше 75% — обычная


def test_counter_plan_shadow_top1_below_75():
    assert wb_counter_plan("shadow", 0.70)["mode"] == "top1"
    assert wb_counter_plan("shadow", 0.90)["mode"] == "mixed"


def test_counter_plan_default_single_mixed():
    p = wb_counter_plan("fire", 0.40)
    assert p["targets"] == 1 and p["mode"] == "mixed"


def test_counter_cooldown_shadow_faster_below_50():
    assert wb_counter_cooldown("shadow", 0.49, 6) == 4   # Танец теней
    assert wb_counter_cooldown("shadow", 0.60, 6) == 6
    assert wb_counter_cooldown("lich", 0.20, 6) == 6


def test_select_targets_counts():
    from jobs.world_boss_counter import _select_targets
    top = [{"user_id": 1}, {"user_id": 2}, {"user_id": 3}]
    allv = [{"user_id": 1}, {"user_id": 2}, {"user_id": 3}, {"user_id": 4}]
    # Лич ≤75% → 2 разные цели
    two = _select_targets(top, allv, {"targets": 2, "mode": "mixed"})
    assert len(two) == 2 and len({t["user_id"] for t in two}) == 2
    # обычный → 1 цель
    one = _select_targets(top, allv, {"targets": 1, "mode": "mixed"})
    assert len(one) == 1
    # нет живых → пусто
    assert _select_targets([], [], {"targets": 2, "mode": "mixed"}) == []


# ── Test 8: периодический AoE (извержения Лавы / сверхнова Огня) ──────────────

def test_periodic_aoe_lava_escalates_by_hp():
    # Толчки (фон, >75%): каждые 30 сек
    assert wb_periodic_aoe("lava", 0.90, 30) == 0.015
    assert wb_periodic_aoe("lava", 0.90, 29) == 0.0
    # Извержение (≤75%): каждые 18 сек, сильнее
    assert wb_periodic_aoe("lava", 0.60, 18) == 0.02
    # Каскад (≤25%): каждые 9 сек, ещё сильнее
    assert wb_periodic_aoe("lava", 0.20, 9) == 0.025


def test_periodic_aoe_fire_supernova_only_below_25():
    assert wb_periodic_aoe("fire", 0.20, 4) == 0.015   # сверхнова — тик
    assert wb_periodic_aoe("fire", 0.20, 5) == 0.0     # не тик
    assert wb_periodic_aoe("fire", 0.50, 4) == 0.0     # выше 25% — нет


def test_periodic_aoe_spider_swarm_below_25():
    assert wb_periodic_aoe("spider", 0.20, 10) == 0.02  # Полчище — рой
    assert wb_periodic_aoe("spider", 0.50, 10) == 0.0   # выше 25% — нет


# ── Test 12: Паук «Сеть ловушек» (темп окна) + эфемерный статус ──────────────

def test_vuln_window_spider_tempo():
    assert wb_is_vuln_window("spider", 0.60, 41) is True   # ≤75%: 3с каждые 40
    assert wb_is_vuln_window("spider", 0.60, 43) is False
    assert wb_is_vuln_window("fire", 0.50, 61) is True      # дефолт: 5с каждые 60
    assert wb_is_vuln_window("fire", 0.50, 10) is False
    assert wb_is_vuln_window("spider", 0.90, 61) is True    # Паук >75% — дефолт


def test_burn_stacks_escalate():
    from jobs.world_boss_status import burn_apply_and_bump, _burn
    _burn.clear()
    assert burn_apply_and_bump(999, 111) == 1.0    # 0 стаков
    assert burn_apply_and_bump(999, 111) == 1.08   # 1 стак
    assert burn_apply_and_bump(999, 111) == 1.16   # 2 стака


def test_web_set_and_expire():
    from jobs.world_boss_status import set_web, is_webbed, _web
    _web.clear()
    assert not is_webbed(999, 222, 1000)
    set_web(999, 222, 5000)
    assert is_webbed(999, 222, 4000)       # ещё в паутине
    assert not is_webbed(999, 222, 6000)   # истекла


def test_vuln_window_shadow_burst_after_phase():
    # фаза 0-3 (÷2, НЕ окно), бурст 4-6 (×3), дальше обычное время
    assert wb_is_vuln_window("shadow", 0.90, 2) is False    # в тени — не окно
    assert wb_is_vuln_window("shadow", 0.90, 5) is True     # бурст сразу после тени
    assert wb_is_vuln_window("shadow", 0.90, 10) is False
    assert wb_is_vuln_window("shadow", 0.20, 18) is True    # ≤25%: цикл 14, 18%14=4 — бурст


def test_demon_frenzy_trigger_and_expire():
    from jobs.world_boss_status import trigger_frenzy, frenzy_dmg_mult, _frenzy
    _frenzy.clear()
    assert frenzy_dmg_mult(777, 1000) == 1.0   # ярости нет
    trigger_frenzy(777, 1000)                   # +6 сек → до 7000 мс
    assert frenzy_dmg_mult(777, 4000) == 1.3   # в ярости — ответка +30%
    assert frenzy_dmg_mult(777, 8000) == 1.0   # истекла


def test_periodic_aoe_other_types_and_start_zero():
    assert wb_periodic_aoe("lich", 0.20, 9) == 0.0     # у Лича периодики нет
    assert wb_periodic_aoe("lava", 0.10, 0) == 0.0     # на секунде 0 не бьём


# ── Test 9: вампиризм Демона ──────────────────────────────────────────────────

def test_lifesteal_demon_scales_with_hp():
    assert wb_lifesteal_pct("demon", 0.80) == 0.30   # Кровавый пир (пассив)
    assert wb_lifesteal_pct("demon", 0.50) == 0.50   # Кровавая ярость ≤50%
    assert wb_lifesteal_pct("demon", 0.20) == 0.50
    assert wb_lifesteal_pct("fire", 0.40) == 0.0     # не демон — нет вампиризма


# ── Test 10: Лич «Армия мёртвых» ──────────────────────────────────────────────

def test_str_death_mult_lich_scales_and_caps():
    assert wb_str_death_mult("lich", 0) == 1.0       # нет смертей — без бонуса
    assert wb_str_death_mult("lich", 5) == 1.15      # +3% × 5
    assert wb_str_death_mult("lich", 20) == 1.30     # кап +30% (10 смертей)
    assert wb_str_death_mult("demon", 5) == 1.0      # только Лич


# ── Test 11: хил на смерть / броня-фазы / сила раскола ────────────────────────

def test_death_heal_pct_by_type_and_threshold():
    assert wb_death_heal_pct("lich", 0.20) == 0.03   # Жатва ≤25%
    assert wb_death_heal_pct("lich", 0.40) == 0.0    # выше 25% — нет
    assert wb_death_heal_pct("demon", 0.70) == 0.02  # Жажда крови ≤75%
    assert wb_death_heal_pct("demon", 0.80) == 0.0
    assert wb_death_heal_pct("fire", 0.10) == 0.0


def test_player_dmg_mult_golem_armor_and_crit_bypass():
    assert wb_player_dmg_mult("poison", 0.90, False) == round(1 / 1.3, 3)  # Каменная кожа
    assert wb_player_dmg_mult("poison", 0.90, True) == 1.0                 # крит сквозь
    assert wb_player_dmg_mult("poison", 0.50, False) == round(1 / 1.15, 3) # Трещины
    assert wb_player_dmg_mult("poison", 0.20, False) == 1.0               # Раскол — брони нет


def test_player_dmg_mult_demon_bleed_below_25():
    assert wb_player_dmg_mult("demon", 0.20, False) == 1.1   # Кровопускание +10%
    assert wb_player_dmg_mult("demon", 0.50, False) == 1.0   # выше 25% — нет


def test_player_dmg_mult_shadow_phase():
    # фаза: 4 сек каждые 20 — на e=1 в фазе (÷2), на e=10 нет
    assert wb_player_dmg_mult("shadow", 0.90, False, 1) == 0.5
    assert wb_player_dmg_mult("shadow", 0.90, False, 10) == 1.0
    assert wb_player_dmg_mult("shadow", 0.90, False, 0) == 1.0   # секунда 0 — не фаза


def test_counter_str_mult_golem_raskol():
    assert wb_counter_str_mult("poison", 0.20, 0) == 1.6   # Раскол ≤25%
    assert wb_counter_str_mult("poison", 0.40, 0) == 1.0
    assert wb_counter_str_mult("lich", 1.0, 5) == 1.15     # делегирует Армии мёртвых


def test_ability_meta_by_bit_and_key():
    by_bit = wb_ability_meta("fire", BIT_50)
    by_key = wb_ability_meta("fire", "t50")
    assert by_bit == by_key
    assert by_bit["name"] == "Плавится ядро"
    # неизвестный тип → пустой dict
    assert wb_ability_meta("nope", BIT_75) == {}
