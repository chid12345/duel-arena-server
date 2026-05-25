"""Проверки коллекционных цен на аватарки (2026-05-25).

Аватарка даёт ГОЛЫЕ статы без процентов/эффектов (в отличие от шмота
с def_pct/блоком/шипами) → стоит сильно дешевле эквивалентной брони
того же тира. Закрепляем ценовые «полки», чтобы случайно не уехало
обратно вверх.
"""
from config.avatar_catalog import AVATAR_CATALOG


def _by_tier(tier: str) -> list[dict]:
    return [a for a in AVATAR_CATALOG if a["tier"] == tier]


def test_gold_avatars_collectible_pricing():
    """Золотые аватарки — фиксированные ступени 500/700/900g, всего ≤10 000g за коллекцию."""
    gold = _by_tier("gold")
    assert len(gold) == 14, "Состав золотых аватарок не должен меняться без правки теста"
    allowed = {500, 700, 900}
    for a in gold:
        assert a["price"] in allowed, (
            f"Цена {a['id']}={a['price']}g не из {allowed} — "
            "новые аватарки идут по той же сетке (см. описание в avatar_catalog.py)"
        )
    total = sum(a["price"] for a in gold)
    assert total <= 10_000, f"Коллекция золота={total}g дороже 10 000g — игроку тяжело собрать всё"


def test_diamond_avatars_collectible_pricing():
    """Алмазные аватарки — ступени 20/30/40💎, ≤450💎 за всю коллекцию (epic-броня = 75💎)."""
    dia = _by_tier("diamond")
    assert len(dia) == 13, "Состав алмазных аватарок не должен меняться без правки теста"
    allowed = {20, 30, 40}
    for a in dia:
        assert a["price"] in allowed, (
            f"Цена {a['id']}={a['price']}💎 не из {allowed} — "
            "новые аватарки идут по той же сетке"
        )
    total = sum(a["price"] for a in dia)
    assert total <= 450, f"Коллекция алмазов={total}💎 дороже 450💎 — слишком дорого для коллекционирования"


def test_avatar_cheaper_than_equivalent_gear():
    """Аватарка не должна стоить дороже эквивалентной брони того же тира."""
    # epic-броня (armor2_dia*) = 75💎, аватарка-epic должна быть дешевле
    for a in _by_tier("diamond"):
        assert a["price"] < 75, (
            f"Алмазная аватарка {a['id']}={a['price']}💎 не дешевле epic-брони (75💎); "
            "аватарка слабее (голые статы, без процентов) — цена должна это отражать"
        )
    # rare-броня = 8000g, аватарка-rare должна быть СИЛЬНО дешевле
    for a in _by_tier("gold"):
        assert a["price"] < 2000, (
            f"Золотая аватарка {a['id']}={a['price']}g слишком дорогая (rare-броня=8000g, "
            "аватарка по статам ~четверть от брони — не должна быть выше ~2000g)"
        )
