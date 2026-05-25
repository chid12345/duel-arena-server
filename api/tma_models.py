"""Pydantic-схемы тел TMA API."""

from pydantic import BaseModel


class InitDataHeader(BaseModel):
    init_data: str


class BattleChoiceBody(BaseModel):
    init_data: str
    attack: str  # HEAD / TORSO / LEGS
    defense: str
    session_key: str | None = None
    device_id: str | None = None


class BattleTimeoutBody(BaseModel):
    """Игрок не успел сходить за отведённое время — честный пропуск (без случайного хода)."""
    init_data: str
    session_key: str | None = None
    device_id: str | None = None


class FindBattleBody(BaseModel):
    init_data: str
    queue_only: bool = False
    prefer_bot: bool = False
    # Этап 9: auto-fallback из PvP-очереди в бой с ботом (≥30 сек без живого
    # соперника). Бот выбирается из брекета игрока, но в карточке выглядит
    # как PvP-игрок (opp_is_bot=false, persona скрыта).
    disguise_as_pvp: bool = False


class ChallengeSendBody(BaseModel):
    init_data: str
    nickname: str


class ChallengeRespondBody(BaseModel):
    init_data: str
    challenge_id: int
    accept: bool


class ShopBuyBody(BaseModel):
    init_data: str
    item_id: str


class ShopApplyBody(BaseModel):
    init_data: str
    item_id: str
    replace: bool = False  # True → заменить активный свиток


class InitDataOnlyBody(BaseModel):
    """Универсальное тело для endpoints, которым нужен только init_data
    (бесплатные действия: ежедневный ящик, claim, refresh и т.п.)."""
    init_data: str


class ChallengeCancelBody(BaseModel):
    init_data: str
    challenge_id: int
