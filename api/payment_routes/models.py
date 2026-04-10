from __future__ import annotations

from pydantic import BaseModel


class StarsConfirmBody(BaseModel):
    init_data: str
    package_id: str


class StarsInvoiceBody(BaseModel):
    init_data: str
    package_id: str


class CryptoInvoiceBody(BaseModel):
    init_data: str
    package_id: str
    asset: str = "USDT"
