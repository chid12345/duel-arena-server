"""
tests/test_bot_set_gear.py — буст высокоуровневых ботов: полный сет + защита брони.

Покрывает находки правки «боты слабые на больших уровнях»:
- Фикс A: бот получает защитные статы брони (body_def/block/reflect),
  которые раньше терялись (карточка брони была «для вида»).
- B: мажор/донатер с 45 уровня носят ПОЛНЫЙ комплект одного архетипа (6/6)
  и получают сет-бонус + перк — как топ-игрок.
"""
from __future__ import annotations

import random

import repositories.bots.personas as P
from db_schema.equipment_catalog import EQUIPMENT_CATALOG
from repositories.bots.persona_gear import (
    SLOTS_FOR_BOT,
    _accumulate_eq_stats,
    pick_gear_for_persona,
)
from repositories.bots.persona_set import (
    SET_GEAR_MIN_LEVEL,
    apply_set_bonus_to_bot,
    pick_matched_set,
)


def _set_id(iid: str) -> str | None:
    return EQUIPMENT_CATALOG.get(iid, {}).get("set_id")


# ── Фикс A: защита брони доходит до бота ──────────────────────────────────────

def test_bot_gets_armor_body_defense():
    """Любой бот в броне получает зональную защиту тела (раньше терялась = 0)."""
    items = {"armor2": "armor2_dia1"}  # эпик-броня: body_def 9%, reflect 10
    stats = _accumulate_eq_stats(items)
    assert stats["_eq_body_def_pct"] > 0, "защита тела брони должна доходить до бота"
    assert stats["_eq_reflect_pct"] > 0, "шипы брони должны доходить до бота"


def test_bot_gets_armor_block_chance():
    """Броня с глухим блоком даёт боту шанс погасить удар."""
    items = {"armor2": "armor2_dia2"}  # epic: block_chance 8
    stats = _accumulate_eq_stats(items)
    assert stats["_eq_block_chance"] == 8


# ── B: полный сет одного архетипа ─────────────────────────────────────────────

def test_matched_set_is_full_and_uniform():
    """pick_matched_set одевает все 6 слотов вещами ОДНОГО архетипа."""
    for allow_mythic in (True, False):
        for seed in range(20):
            items = pick_matched_set(random.Random(seed), allow_mythic=allow_mythic)
            assert set(items.keys()) == set(SLOTS_FOR_BOT), f"не все слоты: {items}"
            sids = {_set_id(iid) for iid in items.values()}
            assert len(sids) == 1 and None not in sids, f"сет разнородный: {sids}"


def test_donator_set_reaches_mythic():
    """Донатер-сет содержит мифик-вещи (мажор — нет, потолок epic)."""
    rar = lambda iid: EQUIPMENT_CATALOG.get(iid, {}).get("rarity")
    saw_mythic = False
    for seed in range(20):
        items = pick_matched_set(random.Random(seed), allow_mythic=True)
        if any(rar(iid) == "mythic" for iid in items.values()):
            saw_mythic = True
            break
    assert saw_mythic, "донатер должен получать мифик-вещи в сете"


def test_full_set_grants_perk_and_bonus():
    """Полный сет 6/6 даёт боту перк (_set_perk_id) и поднимает боевые статы."""
    items = pick_matched_set(random.Random(3), allow_mythic=True)
    bot = {"max_hp": 1000, "current_hp": 1000, "crit": 20,
           "_eq_atk_pct": 0, "_eq_def_pct": 0.0}
    apply_set_bonus_to_bot(bot, items)
    assert bot.get("_set_perk_id"), "полный комплект должен дать перк"
    boosted = (bot["max_hp"] > 1000 or bot["_eq_atk_pct"] > 0
               or bot["crit"] > 20 or bot["_eq_def_pct"] > 0)
    assert boosted, "сет-бонус должен поднять хотя бы один боевой стат"


def test_high_level_rich_persona_wears_set():
    """Мажор/донатер с SET_GEAR_MIN_LEVEL одеты в единый сет (а не вразнобой)."""
    lv = max(SET_GEAR_MIN_LEVEL, 70)
    for persona in ("major", "donator"):
        items, _ = pick_gear_for_persona(persona, lv, random.Random(1))
        sids = {_set_id(iid) for iid in items.values()}
        assert len(sids) == 1, f"{persona} на ур.{lv} должен носить один сет, получил {sids}"


def test_low_level_rich_persona_no_forced_set():
    """До SET_GEAR_MIN_LEVEL сет не навязывается (молодого игрока не давим)."""
    lv = SET_GEAR_MIN_LEVEL - 5
    # на низком уровне гардероб смешанный → сет из одного архетипа маловероятен
    uniform_count = 0
    for seed in range(20):
        items, _ = pick_gear_for_persona("donator", lv, random.Random(seed))
        if len({_set_id(iid) for iid in items.values()}) == 1:
            uniform_count += 1
    assert uniform_count < 20, "на низком уровне не должно быть гарантированного единого сета"


def test_bot_via_persona_gets_perk_at_high_level(monkeypatch):
    """Через apply_persona_to_bot: топ-донатер получает перк и защиту брони."""
    monkeypatch.setattr(P, "pick_persona", lambda *a, **k: "donator")
    bot = {"bot_id": 1, "name": "X_Y_z", "level": 70, "strength": 100,
           "endurance": 80, "crit": 30, "max_hp": 1200, "current_hp": 1200}
    out = P.apply_persona_to_bot(bot, 70, random.Random(2))
    assert out.get("_set_perk_id"), "топ-донатер должен иметь перк сета 6/6"
    assert float(out.get("_eq_body_def_pct", 0)) > 0, "должна быть защита тела от брони"
