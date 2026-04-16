"""Фоновая очистка боёв без реплея.

Удаляет записи из `battles`, у которых в `battle_data` нет `webapp_log` —
это старые строки, сохранённые ещё до появления фичи реплея. В UI они всё
равно скрыты, но занимают место в БД. Чистим пачкой, чтобы не блокировать
HTTP-обработчики.
"""

from __future__ import annotations

import logging

from repositories.battles.read import _parse_battle_data

logger = logging.getLogger(__name__)


# Сколько боёв максимум проверяем за один проход (чтобы не читать всю таблицу).
CLEANUP_SCAN_BATCH = 500


async def battles_cleanup_job(context) -> None:  # noqa: ARG001 — API JobQueue
    """Одна итерация чистки: найти до CLEANUP_SCAN_BATCH самых старых записей
    без webapp_log и удалить их. При следующей итерации возьмёт следующую порцию.
    """
    from database import db

    try:
        removed = _cleanup_once(db, batch=CLEANUP_SCAN_BATCH)
    except Exception as e:
        logger.warning("battles_cleanup: ошибка итерации: %s", e)
        return
    if removed:
        logger.info("battles_cleanup: удалено %s боёв без реплея", removed)


def _cleanup_once(db, *, batch: int) -> int:
    """Одна пачка: читаем N старейших записей, сносим те, где нет webapp_log.
    Возвращает количество удалённых записей.
    """
    conn = db.get_connection()
    cursor = conn.cursor()
    # Берём самые старые — у них максимум шансов быть в старом формате.
    cursor.execute(
        "SELECT battle_id, battle_data FROM battles "
        "ORDER BY created_at ASC, battle_id ASC LIMIT ?"
        if not db._pg else
        "SELECT battle_id, battle_data FROM battles "
        "ORDER BY created_at ASC, battle_id ASC LIMIT %s",
        (int(batch),),
    )
    rows = cursor.fetchall() or []
    to_delete = []
    for r in rows:
        d = dict(r) if hasattr(r, "keys") else {}
        details = _parse_battle_data(d.get("battle_data"))
        wl = details.get("webapp_log") if isinstance(details, dict) else None
        if not (isinstance(wl, list) and wl):
            to_delete.append(int(d.get("battle_id") or 0))
    to_delete = [bid for bid in to_delete if bid > 0]
    if not to_delete:
        conn.close()
        return 0
    ph = "%s" if db._pg else "?"
    placeholders = ",".join([ph] * len(to_delete))
    cursor.execute(f"DELETE FROM battles WHERE battle_id IN ({placeholders})", tuple(to_delete))
    conn.commit()
    conn.close()
    return len(to_delete)
