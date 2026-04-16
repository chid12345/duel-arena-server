from __future__ import annotations

from pydantic import BaseModel


class ClanCreateBody(BaseModel):
    init_data: str
    name: str
    tag: str
    emblem: str = "neutral"
    description: str = ""
    min_level: int = 1
    closed: int = 0


class ClanJoinBody(BaseModel):
    init_data: str
    clan_id: int


class ClanLeaveBody(BaseModel):
    init_data: str


class ClanChatSendBody(BaseModel):
    init_data: str
    message: str


class ClanTransferBody(BaseModel):
    init_data: str
    new_leader_id: int


class ClanKickBody(BaseModel):
    init_data: str
    target_user_id: int


class ClanDisbandBody(BaseModel):
    init_data: str


class ClanJoinReqBody(BaseModel):
    init_data: str
    clan_id: int


class ClanJoinReqDecideBody(BaseModel):
    init_data: str
    request_id: int


class ClanMetaBody(BaseModel):
    init_data: str
    description: str | None = None
    emblem: str | None = None
    min_level: int | None = None
    closed: int | None = None


class ReferralWithdrawBody(BaseModel):
    init_data: str
