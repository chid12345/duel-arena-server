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
    wb_crown_dmg_pct,
    wb_enrage_profile,
    wb_live_features,
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


# ── Test 5: live-фишки для карточки/Справки ───────────────────────────────────

def test_live_features_returns_only_live_fire():
    names = [f["name"] for f in wb_live_features("fire")]
    assert "Плавится ядро" in names         # t50 — включена
    assert "Тепловая волна" in names        # t75 — включена
    assert "Опаляющая аура" not in names    # пассивка ещё не live


def test_live_features_sorted_by_hp_desc():
    feats = wb_live_features("fire")
    hps = [f["hp"] for f in feats]
    assert hps == sorted(hps, reverse=True)


def test_live_features_every_boss_has_50pct_after_zahod1():
    for t in ("lich", "shadow", "fire", "poison", "spider", "lava", "demon"):
        feats = wb_live_features(t)
        assert any(f["hp"] == 50 for f in feats), f"{t}: нет live-фишки на 50%"


def test_live_features_unknown_type_empty():
    assert wb_live_features("nope") == []


def test_ability_meta_by_bit_and_key():
    by_bit = wb_ability_meta("fire", BIT_50)
    by_key = wb_ability_meta("fire", "t50")
    assert by_bit == by_key
    assert by_bit["name"] == "Плавится ядро"
    # неизвестный тип → пустой dict
    assert wb_ability_meta("nope", BIT_75) == {}
