"""Пулы скинов ботов по статусу.

31 PNG в webapp/bot_skins/ (id 1..33 минус 6 и 19). Делим на 4 пула — у каждой
персоны свой набор «внешки», чтобы игрок визуально различал статус ещё до
открытия карточки. Грозные скины (стихийные боссы) — донатерам/мажорам;
обычные — новичкам/фармилам.
"""

from __future__ import annotations

import random
from typing import List


# Боссовые/стихийные скины (по SPECIAL в bot_skin_picker.js + жуткие модели).
# Видя такого — игрок понимает: «это серьёзно».
ELITE_SKINS: List[int] = [3, 10, 15, 16, 20, 30]

# Грозные, но не топовые — мажорам.
MAJOR_SKINS: List[int] = [4, 5, 7, 8, 11, 12, 13, 14, 17, 18, 22]

# Средний пул — фармилам (нейтральные модели).
FARMER_SKINS: List[int] = [21, 23, 24, 25, 27, 28, 29]

# Простые скины — новичкам.
NOVICE_SKINS: List[int] = [1, 2, 9, 26, 31, 32, 33]


PERSONA_SKIN_POOLS = {
    "novice":  NOVICE_SKINS,
    "farmer":  FARMER_SKINS,
    "major":   MAJOR_SKINS,
    "donator": ELITE_SKINS,
}


def pick_skin_for_persona(persona: str,
                          rng: random.Random | None = None) -> int | None:
    """Выбрать id скина из пула статуса. Если пул пуст — None (фронт сам подберёт)."""
    r = rng or random
    pool = PERSONA_SKIN_POOLS.get(persona)
    if not pool:
        return None
    return r.choice(pool)
