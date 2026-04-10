"""
Генерация карточки профиля игрока (PIL).
Возвращает bytes PNG для отправки фото в Telegram.
"""

from __future__ import annotations

from profile_card.generate import generate_profile_card

__all__ = ("generate_profile_card",)
