"""Аренда mythic-снаряжения: цена и срок (Этап 8 редизайна).

MVP: 1 тариф — 7 дней. Фиксированная цена для всех mythic:
- Stars: 100⭐ (≈$2)
- USDT:  $2.00

Стратегия: низкий порог входа = больше попыток = больше LTV в долгой.
Аренда возобновляется → стабильный поток платежей вместо разового.

Покупка vs аренда:
- Покупка — навсегда, полная цена (~590⭐ / $11.99), → player_owned_weapons.
- Аренда — 7 дней, 100⭐ / $2, → equipment_rentals.
  Истёкшая аренда → авто-снятие в equipment_repo.get_equipment.
"""
from __future__ import annotations

RENTAL_DURATION_DAYS = 7
RENTAL_PRICE_STARS = 100
RENTAL_PRICE_USDT = "2.00"
