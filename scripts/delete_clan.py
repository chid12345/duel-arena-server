"""Админ-скрипт: полное удаление клана по тегу или имени.

Использование:
    python scripts/delete_clan.py --tag 111
    python scripts/delete_clan.py --name "Первый"
    python scripts/delete_clan.py --id 42

Удаляет: clans, clan_members, clan_messages, clan_join_requests,
clan_achievements, clan_history, clan_tasks, clan_wars (связанные),
обнуляет players.clan_id.

Нужен когда клан «завис» без живого лидера (старый аккаунт сброшен,
а clans.leader_id ссылается на несуществующего игрока).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import db  # noqa: E402


def find_clan(tag: str | None, name: str | None, clan_id: int | None) -> dict | None:
    conn = db.get_connection()
    cur = conn.cursor()
    try:
        if clan_id is not None:
            cur.execute("SELECT id, name, tag, leader_id FROM clans WHERE id = ?", (clan_id,))
        elif tag:
            cur.execute("SELECT id, name, tag, leader_id FROM clans WHERE UPPER(tag) = UPPER(?)", (tag,))
        elif name:
            cur.execute("SELECT id, name, tag, leader_id FROM clans WHERE LOWER(name) = LOWER(?)", (name,))
        else:
            return None
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", help="Тег клана (например: 111)")
    ap.add_argument("--name", help="Имя клана (например: Первый)")
    ap.add_argument("--id", type=int, help="ID клана")
    ap.add_argument("--yes", action="store_true", help="Без подтверждения")
    args = ap.parse_args()

    if not (args.tag or args.name or args.id):
        ap.error("Укажите --tag, --name или --id")

    clan = find_clan(args.tag, args.name, args.id)
    if not clan:
        print("❌ Клан не найден")
        return 1

    print(f"Найден клан: id={clan['id']}  [{clan['tag']}] {clan['name']}  leader_id={clan['leader_id']}")

    if not args.yes:
        ans = input("Удалить полностью? [yes/N] ").strip().lower()
        if ans not in ("yes", "y", "да"):
            print("Отменено.")
            return 0

    conn = db.get_connection()
    cur = conn.cursor()
    try:
        db._purge_clan_rows(cur, int(clan["id"]))
        conn.commit()
    finally:
        conn.close()

    print(f"✅ Клан [{clan['tag']}] {clan['name']} удалён полностью.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
