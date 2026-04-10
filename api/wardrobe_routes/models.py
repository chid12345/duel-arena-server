from __future__ import annotations

from pydantic import BaseModel


class InitDataHeader(BaseModel):
    init_data: str


class WardrobeBuyBody(BaseModel):
    init_data: str
    class_id: str


class WardrobeEquipBody(BaseModel):
    init_data: str
    class_id: str


class USDTBody(BaseModel):
    init_data: str
    class_id: str


class USDTNameBody(BaseModel):
    init_data: str
    class_id: str
    custom_name: str
