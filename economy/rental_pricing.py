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
# Курс Telegram Stars: 1$ ≈ 67⭐ (см. memory project_telegram_stars_usd_rate).
# Аренда $2 → 133⭐. Раньше было 100⭐ ($1.50 по курсу Telegram).
RENTAL_PRICE_STARS = 133
RENTAL_PRICE_USDT = "2.00"

# 🧪 ВРЕМЕННЫЙ ТЕСТОВЫЙ РЕЖИМ — для быстрой проверки авто-снятия аренды в UI.
# Если установлено в положительное число — `rent_item` использует ЭТО кол-во
# МИНУТ вместо RENTAL_DURATION_DAYS. ПОСЛЕ ТЕСТА вернуть в None!
# (см. memory: project_armor_slot_dual_source / project_wb_schedule паттерн)
RENTAL_DURATION_TEST_OVERRIDE_MINUTES: int | None = 2
