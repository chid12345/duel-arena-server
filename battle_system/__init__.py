"""Система боёв Duel Arena (пакет)."""
from battle_system.models import BattleRound, BattleResult

from battle_system.mixins.state import BattleStateMixin
from battle_system.mixins.start import BattleStartMixin
from battle_system.mixins.timer import BattleTimerMixin
from battle_system.mixins.choices import BattleChoicesMixin
from battle_system.mixins.execute import BattleExecuteMixin
from battle_system.mixins.execute_afk import BattleExecuteAfkMixin
from battle_system.mixins.combat_log import BattleCombatLogMixin
from battle_system.mixins.exchange_text import BattleExchangeMixin
from battle_system.mixins.damage import BattleDamageMixin
from battle_system.mixins.damage_armor import BattleDamageArmorMixin
from battle_system.mixins.damage_extra import BattleDamageExtraMixin
from battle_system.mixins.end_battle import BattleEndBattleMixin
from battle_system.mixins.persist import BattlePersistMixin
from battle_system.mixins.afk_end import BattleAfkEndMixin
from battle_system.mixins.progression import BattleProgressionMixin
from battle_system.mixins.ui_context import BattleUiContextMixin

class BattleSystem(
    BattleStateMixin,
    BattleStartMixin,
    BattleTimerMixin,
    BattleChoicesMixin,
    BattleExecuteMixin,
    BattleExecuteAfkMixin,
    BattleCombatLogMixin,
    BattleExchangeMixin,
    BattleDamageArmorMixin,
    BattleDamageMixin,
    BattleDamageExtraMixin,
    BattleEndBattleMixin,
    BattlePersistMixin,
    BattleAfkEndMixin,
    BattleProgressionMixin,
    BattleUiContextMixin,
):
    """Управление боями (композиция миксинов)."""

    pass


battle_system = BattleSystem()

__all__ = ["BattleSystem", "battle_system", "BattleRound", "BattleResult"]
