"""Эфемерное состояние Мирового босса в памяти процесса (Закон 2).

Решение пользователя: хранить in-memory, без новой колонки/миграции.
Сбрасывается при рестарте сервера — для 10-минутного рейда это допустимо.
Ключ — (spawn_id, user_id).

- Огонь «Опаляющая аура»: стаки ожога (каждый удар босса по игроку усиливает
  следующий удар по нему же).
- Паук «Паутина»: лидер опутан → его кулдаун удара удвоен на время.
"""
from __future__ import annotations

import time

_BURN_DECAY_SEC = 12      # стаки спадают, если по игроку давно не били
_BURN_MAX = 5             # потолок стаков
_BURN_PER_STACK = 0.08    # +8% к урону ответки за стак

_FRENZY_DMG_MULT = 1.30   # Демон «Жажда крови»: +30% к ответке после смерти
_FRENZY_SEC = 6           # длительность ярости

_burn: dict = {}     # (spawn_id, uid) -> (stacks, last_ts)
_web: dict = {}      # (spawn_id, uid) -> web_until_ms
_frenzy: dict = {}   # spawn_id -> frenzy_until_ms (Демон «Жажда крови»)


def burn_apply_and_bump(spawn_id: int, uid: int) -> float:
    """Множитель к урону ответки по ТЕКУЩИМ стакам ожога, затем +1 стак.
    Если по игроку давно не били — стаки сгорают."""
    now = time.time()
    key = (int(spawn_id), int(uid))
    stacks, ts = _burn.get(key, (0, now))
    if now - ts > _BURN_DECAY_SEC:
        stacks = 0
    mult = 1.0 + _BURN_PER_STACK * stacks
    _burn[key] = (min(_BURN_MAX, stacks + 1), now)
    if len(_burn) > 4000:
        _prune_burn(now)
    return round(mult, 3)


def set_web(spawn_id: int, uid: int, until_ms: int) -> None:
    """Опутать игрока паутиной до until_ms (мс)."""
    _web[(int(spawn_id), int(uid))] = int(until_ms)
    if len(_web) > 4000:
        _web.clear()


def is_webbed(spawn_id: int, uid: int, now_ms: int) -> bool:
    """В паутине ли игрок сейчас (кулдаун удвоен)."""
    return _web.get((int(spawn_id), int(uid)), 0) > int(now_ms)


def trigger_frenzy(spawn_id: int, now_ms: int) -> None:
    """Демон «Жажда крови»: разъярить на _FRENZY_SEC после смерти игрока."""
    _frenzy[int(spawn_id)] = int(now_ms) + _FRENZY_SEC * 1000
    if len(_frenzy) > 4000:
        _frenzy.clear()


def frenzy_dmg_mult(spawn_id: int, now_ms: int) -> float:
    """Множитель к урону ответки, если босс в ярости сейчас (иначе 1.0)."""
    return _FRENZY_DMG_MULT if _frenzy.get(int(spawn_id), 0) > int(now_ms) else 1.0


def _prune_burn(now: float) -> None:
    stale = [k for k, (s, t) in _burn.items() if now - t > 60]
    for k in stale:
        _burn.pop(k, None)
