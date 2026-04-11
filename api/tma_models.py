"""Pydantic-схемы тел TMA API."""

from pydantic import BaseModel


class InitDataHeader(BaseModel):
    init_data: str


class BattleChoiceBody(BaseModel):
    init_data: str
    attack: str  # HEAD / TORSO / LEGS
    defense: str


class FindBattleBody(BaseModel):
    init_data: str
    queue_only: bool = False
    prefer_bot: bool = False


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


class ChallengeCancelBody(BaseModel):
    init_data: str
    challenge_id: int
