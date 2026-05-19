"""Пакет с данными предметов экипировки. Разбит по слотам (Закон 1, ≤200 строк/файл).

Этап 3B — чистый перенос данных из db_schema/equipment_catalog.py.
Этап 5B — здесь же применяется детерминированный маппинг set_id к
каждому предмету по его item_id (см. _default_set_id).
"""
from __future__ import annotations

from db_schema.equipment_items.armor2 import ARMOR2
from db_schema.equipment_items.boots import BOOTS
from db_schema.equipment_items.helmets import HELMETS
from db_schema.equipment_items.rings import RINGS
from db_schema.equipment_items.shields import SHIELDS
from db_schema.equipment_items.swords_legacy import SWORDS_LEGACY

# ── Маппинг set_id (этап 5B редизайна) ───────────────────────────────────────
# Распределение по item_id: каждый слот (16 предметов) получает все 6
# архетипов с приоритетом 3-3-3-3-2-2.
#
#   позиции 0..3 (rarity=free):    predator, bastion, berserk, ghost
#   позиции 4..7 (rarity=gold):    mage, regent, predator, bastion
#   позиции 8..11 (rarity=dia):    berserk, ghost, mage, regent
#   позиции 12..15 (rarity=mythic): predator, bastion, berserk, ghost
#
# Итого по слоту: predator 3, bastion 3, berserk 3, ghost 3, mage 2, regent 2.
# Mage/regent реже — это «специализированные» сеты, требуют более точного
# подбора. Полный комплект 6 предметов одного архетипа собирается из разных
# редкостей (свобода стиля важнее редкости).

_SET_RING: tuple[str, ...] = (
    "predator", "bastion", "berserk", "ghost",        # *_free1..4
    "mage", "regent", "predator", "bastion",          # *_gold1..4
    "berserk", "ghost", "mage", "regent",             # *_dia1..4
    "predator", "bastion", "berserk", "ghost",        # *_mythic1..4
)

_RARITY_OFFSET: dict[str, int] = {
    "free": 0, "gold": 4, "dia": 8, "diamond": 8, "mythic": 12,
}

# Порядок типов оружия (item_id вида '<type>_<rarity>' без числа):
# sword=0, axe=1, club=2, gs=3 — даёт позицию-в-редкости для _SET_RING.
_WEAPON_TYPE_ORDER: tuple[str, ...] = ("sword", "axe", "club", "gs")


def _default_set_id(item_id: str) -> str | None:
    """Маппинг item_id → set_id (этап 5B).

    Поддерживаемые форматы:
    - '<slot>_<rarity><num>': 'helmet_free1' → 'predator', 'ring_dia3' → 'mage'
    - '<type>_<rarity>' для weapons: 'sword_free' → 'predator',
      'axe_gold' → 'regent', 'gs_mythic' → 'ghost'

    Возвращает None для legacy (sword_iron, sword_steel, sword_chaos) и
    непарсируемых id.
    """
    if not isinstance(item_id, str) or "_" not in item_id:
        return None
    last = item_id.rsplit("_", 1)[-1]
    # Длинные префиксы первыми: 'diamond' раньше 'dia', чтобы 'sword_diamond'
    # не ловился как 'dia' + num='mond'.
    for rarity in ("mythic", "diamond", "gold", "free", "dia"):
        if not last.startswith(rarity):
            continue
        offset = _RARITY_OFFSET[rarity]
        num_str = last[len(rarity):]
        if num_str == "":
            # weapon-формат: '<type>_<rarity>' (sword_free, axe_gold, ...)
            wtype = item_id[:-(len(rarity) + 1)]  # отрезаем '_<rarity>'
            if wtype in _WEAPON_TYPE_ORDER:
                wpos = _WEAPON_TYPE_ORDER.index(wtype)
                return _SET_RING[offset + wpos]
            return None
        try:
            num = int(num_str) - 1
        except ValueError:
            return None
        if not 0 <= num <= 3:
            return None
        return _SET_RING[offset + num]
    return None


def _apply_set_ids(items: dict[str, dict]) -> dict[str, dict]:
    """Добавить set_id каждому предмету (не мутирует исходник)."""
    out: dict[str, dict] = {}
    for iid, item in items.items():
        if "set_id" in item:
            out[iid] = item  # уже задан вручную — не трогаем
            continue
        sid = _default_set_id(iid)
        if sid:
            out[iid] = {**item, "set_id": sid}
        else:
            out[iid] = item
    return out


def all_equipment_items() -> dict[str, dict]:
    """Собрать словарь {item_id: item_dict} из всех модулей слотов + set_id."""
    raw: dict[str, dict] = {}
    raw.update(SWORDS_LEGACY)
    raw.update(HELMETS)
    raw.update(SHIELDS)
    raw.update(RINGS)
    raw.update(BOOTS)
    raw.update(ARMOR2)
    return _apply_set_ids(raw)


__all__ = [
    "all_equipment_items", "SWORDS_LEGACY", "HELMETS", "SHIELDS", "RINGS", "BOOTS", "ARMOR2",
    "_default_set_id",
]
