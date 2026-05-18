from __future__ import annotations

from pydantic import BaseModel


class InitDataHeader(BaseModel):
    init_data: str


# Унификация armor: legendary_usdt теперь одна единственная USDT-кастомка
# (armor_mythic4). Endpoints больше не принимают class_id — там всегда mythic4.

class USDTNameBody(BaseModel):
    init_data: str
    custom_name: str


class USDTTrainBody(BaseModel):
    init_data: str
    stat: str


class USDTPassiveBody(BaseModel):
    init_data: str
    passive_type: str
