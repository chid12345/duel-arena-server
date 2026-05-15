"""
economy/level_pricing.py — цена и доступность предметов с учётом уровня игрока.

Соединяет:
- economy/formulas.price_for_item — базовая формула по power_score × rarity × tier
- economy/curves.is_tier_unlocked — разблокировка тира по уровню игрока

Этап 3A редизайна. Используется этапами 3B (каталог) и 3C (магазин).

Каталог предмета должен иметь поля:
    - "power_score" (float) — балл силы предмета
    - "rarity" (str) — common / rare / epic / legendary
    - "tier" (str) — T1 / T2 / T3 / T4
    - "currency" (str, optional) — gold / diamond / star / usdt (default "gold")
    - "recommended_level" (int, optional) — на каком уровне ожидается;
      используется только для UI («рекомендован с N ур»), не влияет на цену.
"""
from __future__ import annotations

from typing import Any

from economy.curves import is_tier_unlocked, tier_unlocked_at
from economy.formulas import price_for_item

# Алиас рарности: в каталоге шмота исторически "mythic" — это топ-редкость.
# В economy.json/rarity_mult её нет (там common/rare/epic/legendary). Маппим
# "mythic" → "legendary" для расчёта формулы. Стат-эффекты в бою не меняются.
_RARITY_ALIAS = {"mythic": "legendary"}


def shop_price(item: dict, currency: str | None = None) -> int:
    """Цена предмета для магазина.

    Берёт power_score, rarity, tier из item. Тип валюты — аргумент currency,
    либо item["currency"] (default "gold"). Возвращает целое число.

    Raises:
        KeyError если в item нет обязательных полей power_score/rarity/tier.
    """
    for key in ("power_score", "rarity", "tier"):
        if key not in item:
            raise KeyError(f"item: нет обязательного поля {key!r}")
    cur = currency or item.get("currency", "gold")
    rarity = str(item["rarity"])
    rarity = _RARITY_ALIAS.get(rarity, rarity)
    return price_for_item(
        float(item["power_score"]),
        rarity=rarity,
        tier=str(item["tier"]),
        currency=str(cur),
    )


def can_purchase(player_level: int, item: dict) -> tuple[bool, str]:
    """Проверить, может ли игрок купить предмет.

    Возвращает (можно, причина-если-нет). Сейчас единственное правило —
    тир разблокирован по уровню (T1 с 1, T2 с 20, T3 с 45, T4 с 65).
    """
    tier = item.get("tier")
    if not tier:
        return False, "У предмета не задан tier"
    if not is_tier_unlocked(int(player_level), str(tier)):
        return False, f"Нужен уровень для {tier}"
    return True, ""


def visible_in_shop_for_level(items: dict[str, dict], player_level: int) -> dict[str, dict]:
    """Отфильтровать каталог: оставить только те предметы, чей tier разблокирован.

    Удобно для бэка, отдающего магазин клиенту: новичок не видит T4-шмот,
    ветеран видит всё. Уровень разблокировок берётся из config/balance_curve.json.
    """
    pl = int(player_level)
    max_tier_unlocked = tier_unlocked_at(pl)
    _ORDER = ("T1", "T2", "T3", "T4")
    cap = _ORDER.index(max_tier_unlocked)
    out: dict[str, dict] = {}
    for iid, it in items.items():
        t = it.get("tier")
        if t and t in _ORDER and _ORDER.index(t) <= cap:
            out[iid] = it
        elif not t:
            # Предметы без tier (legacy) — показываем всем
            out[iid] = it
    return out


def fill_prices_for_level(items: dict[str, Any], player_level: int) -> dict[str, dict]:
    """Вернуть копию каталога с подставленными ценами через формулу.

    Для совместимости: каждому item добавляется поле "price_calc" (gold для default
    валюты) и "locked" (bool — заблокирован ли тиром). Не модифицирует исходник.
    """
    pl = int(player_level)
    out: dict[str, dict] = {}
    for iid, it in items.items():
        copy = dict(it)
        if "power_score" in copy and "rarity" in copy and "tier" in copy:
            try:
                copy["price_calc"] = shop_price(copy)
            except (KeyError, ValueError):
                copy["price_calc"] = None
            copy["locked"] = not is_tier_unlocked(pl, copy["tier"])
        else:
            copy["price_calc"] = None
            copy["locked"] = False
        out[iid] = copy
    return out
