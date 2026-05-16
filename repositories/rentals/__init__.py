"""Аренда mythic-снаряжения за Stars (Этап 8 редизайна)."""

from __future__ import annotations

from repositories.rentals.rental_repo import RentalRepoMixin


class RentalsMixin(RentalRepoMixin):
    """Mixin: все операции с арендой mythic."""
