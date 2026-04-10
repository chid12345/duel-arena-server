"""ISO-неделя UTC и награды за место в недельных топах."""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple


def iso_week_key_utc(ts: Optional[float] = None) -> str:
    """Ключ ISO-недели по UTC, как в API (2026-W15)."""
    t = time.time() if ts is None else float(ts)
    dt = datetime.fromtimestamp(t, tz=timezone.utc)
    y, w, _ = dt.isocalendar()
    return f"{int(y)}-W{int(w):02d}"


def prev_iso_week_bounds_utc() -> Tuple[str, datetime, datetime]:
    """Прошлая ISO-неделя: (week_key, start включительно, end исключительно), UTC naive для SQL."""
    now = datetime.now(timezone.utc)
    d = now.date()
    monday = datetime(d.year, d.month, d.day, tzinfo=timezone.utc) - timedelta(days=d.weekday())
    week_start_cur = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start_prev = week_start_cur - timedelta(days=7)
    week_end_prev = week_start_cur
    y, w, _ = week_start_prev.date().isocalendar()
    key = f"{int(y)}-W{int(w):02d}"
    start_naive = week_start_prev.replace(tzinfo=None)
    end_naive = week_end_prev.replace(tzinfo=None)
    return key, start_naive, end_naive


def weekly_pvp_rank_reward(rank: int) -> Tuple[int, str]:
    """Возвращает (diamonds, title)."""
    if rank == 1:
        return 120, "Легенда PvP"
    if rank == 2:
        return 80, "Мастер PvP"
    if rank == 3:
        return 50, "Герой арены"
    if 4 <= rank <= 10:
        return 20, "Участник топа"
    return 0, ""


def weekly_titan_rank_reward(rank: int) -> Tuple[int, int, str]:
    """Возвращает (diamonds, gold, title)."""
    if rank == 1:
        return 150, 400, "Покоритель Титанов"
    if rank == 2:
        return 90, 250, "Гроза Башни"
    if rank == 3:
        return 60, 150, "Титаноборец"
    if 4 <= rank <= 10:
        return 25, 60, "Штурмовик Башни"
    return 0, 0, ""


def weekly_natisk_rank_reward(rank: int) -> Tuple[int, int, str]:
    """Возвращает (diamonds, gold, title)."""
    if rank == 1:
        return 100, 300, "Покоритель Волн"
    if rank == 2:
        return 60, 200, "Штормовой боец"
    if rank == 3:
        return 40, 100, "Волновой боец"
    if 4 <= rank <= 10:
        return 15, 50, "Участник натиска"
    return 0, 0, ""
