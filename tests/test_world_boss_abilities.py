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
    wb_crown_dmg_pct,
    wb_crown_labels,
    wb_enrage_profile,
    wb_periodic_aoe,
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


def test_card_features_live_flag_correct():
    feats = {f["name"]: f for f in wb_card_features("fire")}
    assert feats["Плавится ядро"]["live"] is True       # включена
    assert feats["Опаляющая аура"]["live"] is False     # «скоро»


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


def test_crown_labels_lich_75_and_50():
    lbl = wb_crown_labels("lich")
    assert lbl[BIT_75] == "Эпидемия"        # Заход 2b — включена
    assert lbl[BIT_50] == "Костяной доспех"
    assert lbl[BIT_25] is None


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


def test_periodic_aoe_other_types_and_start_zero():
    assert wb_periodic_aoe("lich", 0.20, 9) == 0.0     # у Лича периодики нет
    assert wb_periodic_aoe("lava", 0.10, 0) == 0.0     # на секунде 0 не бьём


def test_ability_meta_by_bit_and_key():
    by_bit = wb_ability_meta("fire", BIT_50)
    by_key = wb_ability_meta("fire", "t50")
    assert by_bit == by_key
    assert by_bit["name"] == "Плавится ядро"
    # неизвестный тип → пустой dict
    assert wb_ability_meta("nope", BIT_75) == {}
