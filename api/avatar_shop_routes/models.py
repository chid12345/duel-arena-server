from __future__ import annotations

from pydantic import BaseModel


class AvatarBody(BaseModel):
    init_data: str
    avatar_id: str


class EliteAvatarBody(BaseModel):
    init_data: str


class EliteBuildActivateBody(BaseModel):
    init_data: str
    build_id: str


class EliteBuildAllocateBody(BaseModel):
    init_data: str
    build_id: str
    alloc_strength: int = 0
    alloc_endurance: int = 0
    alloc_crit: int = 0
    alloc_stamina: int = 0
