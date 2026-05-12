"""Премиум-бонус: +25% к gold и XP. Единая точка применения.

Используется в источниках наград (бой, квесты, мировой босс),
чтобы UI-обещание «+25% XP / +25% Gold» соответствовало реальным числам.
Алмазы НЕ затрагиваются — бонус только на XP и Gold.
"""
from __future__ import annotations

from typing import Tuple

from config.progression_fmt import PREMIUM_XP_MULTIPLIER


def is_premium_active(db, user_id: int) -> bool:
    try:
        return bool(db.get_premium_status(int(user_id)).get("is_active"))
    except Exception:
        return False


def apply_premium_rewards(db, user_id: int, gold: int = 0, xp: int = 0) -> Tuple[int, int, bool]:
    """Вернуть (gold, xp, is_premium). Применяет ×1.25 если премиум активен."""
    if not is_premium_active(db, user_id):
        return int(gold), int(xp), False
    g = int(gold)
    x = int(xp)
    if g > 0:
        g = max(1, int(round(g * PREMIUM_XP_MULTIPLIER)))
    if x > 0:
        x = max(1, int(round(x * PREMIUM_XP_MULTIPLIER)))
    return g, x, True
