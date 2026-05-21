"""tests/test_session_grace.py — сессия мини-аппа: grace для предыдущего ключа.

На ОДНОМ устройстве при реконнекте WS ключ сессии ротируется. Без grace ход со
«старым» ключом ложно падал с «открыта на другом устройстве» и вешал бой.
Старый ключ должен оставаться валидным короткое время после ротации.
"""
from __future__ import annotations

import asyncio
import time

from api.tma_infra import ConnectionManager


class _FakeWS:
    def __init__(self):
        self.sent = []

    async def send_json(self, data):
        self.sent.append(data)

    async def close(self, code=1000):
        pass


def test_validate_current_and_prev_key_within_grace():
    m = ConnectionManager()
    m._session_keys[1] = "K1"
    m._prev_keys[1] = ("K1", time.time() + 25)
    m._session_keys[1] = "K2"
    assert m.validate_session(1, "K2") is True          # текущий
    assert m.validate_session(1, "K1") is True           # предыдущий в пределах grace
    assert m.validate_session(1, "BOGUS") is False        # чужой
    assert m.validate_session(1, None) is True            # старый клиент без токена


def test_prev_key_invalid_after_grace():
    m = ConnectionManager()
    m._session_keys[1] = "K2"
    m._prev_keys[1] = ("K0", time.time() - 1)  # grace истёк
    assert m.validate_session(1, "K0") is False


def test_connect_rotates_key_but_keeps_prev_valid():
    m = ConnectionManager()

    async def run():
        k1 = await m.connect(1, _FakeWS())
        k2 = await m.connect(1, _FakeWS())  # реконнект → ротация ключа
        return k1, k2

    k1, k2 = asyncio.run(run())
    assert k1 and k2 and k1 != k2
    assert m.validate_session(1, k2) is True   # новый ключ
    assert m.validate_session(1, k1) is True   # старый ещё валиден (grace) — бой не упадёт
