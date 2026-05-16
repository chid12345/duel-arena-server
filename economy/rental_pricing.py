"""Аренда mythic-снаряжения: цена и срок (Этап 8 редизайна).

MVP: 1 тариф — 7 дней за 50% от полной mythic-цены в Stars.
Срок и доля настраиваются здесь (один источник истины).

Покупка vs аренда:
- Покупка — навсегда, полная цена, попадает в player_owned_weapons.
- Аренда — 7 дней, 50% цены, попадает в equipment_rentals.
  Истёкшая аренда → авто-снятие в equipment_repo.get_equipment.
"""
from __future__ import annotations

RENTAL_DURATION_DAYS = 7
RENTAL_PRICE_PCT = 0.5  # 50% от полной mythic-цены


def rental_stars_price(full_price_stars: int) -> int:
    """Цена аренды в Stars: round(full × 0.5). Минимум 1."""
    return max(1, int(round(int(full_price_stars) * RENTAL_PRICE_PCT)))
