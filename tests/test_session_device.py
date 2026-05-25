"""
tests/test_session_device.py — сторож одной сессии по device_id.

Баг: WS-сессия отличалась только по user_id, поэтому переподключение на ТОМ ЖЕ
устройстве (Telegram свернул/развернул, моргнула сеть) выглядело как «второе
устройство» → ложный баннер «Игра открыта на другом устройстве».
Фикс: у каждого устройства стабильный device_id. То же устройство — молча,
ход всегда валиден; реальное второе устройство — кик с сообщением.
"""
from __future__ import annotations

import asyncio

from api.tma_infra import ConnectionManager


class FakeWS:
    def __init__(self):
        self.sent = []
        self.closed = False

    async def send_json(self, data):
        self.sent.append(data)

    async def close(self, code=1000):
        self.closed = True


def test_same_device_move_valid_despite_key_churn():
    """Ход с ТОГО ЖЕ устройства валиден даже с неправильным ключом сессии."""
    m = ConnectionManager()
    asyncio.run(m.connect(1, FakeWS(), "devA"))
    assert m.validate_session(1, "wrong-key", "devA") is True
    # другое устройство с неправильным ключом — отклоняется
    assert m.validate_session(1, "wrong-key", "devB") is False


def test_key_still_works_without_device():
    """Старый клиент без device_id: валидация по ключу как раньше."""
    m = ConnectionManager()
    key = asyncio.run(m.connect(1, FakeWS(), None))
    assert m.validate_session(1, key, None) is True
    assert m.validate_session(1, None, None) is True  # клиент ещё без токена


def test_same_device_reconnect_is_silent():
    """То же устройство переподключилось → старый сокет закрыт БЕЗ kicked-сообщения."""
    m = ConnectionManager()
    ws1, ws2 = FakeWS(), FakeWS()

    async def run():
        await m.connect(1, ws1, "devA")
        await m.connect(1, ws2, "devA")
    asyncio.run(run())
    assert ws1.closed is True
    assert not any(s.get("event") == "kicked" for s in ws1.sent), "своё устройство не должно получать kicked"


def test_different_device_kicks_old_with_message():
    """Реальное второе устройство → старое получает kicked с сообщением."""
    m = ConnectionManager()
    ws1, ws2 = FakeWS(), FakeWS()

    async def run():
        await m.connect(1, ws1, "devA")
        await m.connect(1, ws2, "devB")
    asyncio.run(run())
    assert any(s.get("event") == "kicked" for s in ws1.sent), "второе устройство должно вытеснить первое"


def test_same_device_not_rejected_by_protection_window():
    """Своё устройство не отклоняется 30с-защитой (в отличие от чужого после кика)."""
    m = ConnectionManager()
    ws1, ws2, ws3 = FakeWS(), FakeWS(), FakeWS()

    async def run():
        await m.connect(1, ws1, "devA")       # первое
        await m.connect(1, ws2, "devB")       # второе устройство → защита 30с
        k = await m.connect(1, ws3, "devB")   # то же «второе» переподключилось — должно пройти
        return k
    key = asyncio.run(run())
    assert key is not None, "своё устройство не должно отклоняться защитным окном"
