"""Админ-скрипт: диагностика и полное удаление кланов.

Использование:
    python scripts/delete_clan.py --list                 # все кланы в БД
    python scripts/delete_clan.py --tag 111 --yes        # удалить по тегу
    python scripts/delete_clan.py --name "Первый" --yes  # по имени
    python scripts/delete_clan.py --id 42 --yes          # по id

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


def list_clans() -> None:
    conn = db.get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT c.id, c.name, c.tag, c.leader_id, "
            "(SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as cnt "
            "FROM clans c ORDER BY c.id"
        )
        rows = cur.fetchall()
    finally:
        conn.close()
    using_pg = bool(getattr(db, "_pg", False))
    print(f"БД: {'PostgreSQL' if using_pg else 'SQLite'}  ·  кланов: {len(rows)}")
    if not rows:
        print("(пусто)")
        return
    for r in rows:
        print(f"  id={r['id']:<4} [{r['tag']:<4}] {r['name']:<24} leader_id={r['leader_id']}  members={r['cnt']}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="Показать все кланы")
    ap.add_argument("--tag", help="Тег клана (например: 111)")
    ap.add_argument("--name", help="Имя клана (например: Первый)")
    ap.add_argument("--id", type=int, help="ID клана")
    ap.add_argument("--yes", action="store_true", help="Без подтверждения")
    args = ap.parse_args()

    if args.list:
        list_clans()
        return 0

    if not (args.tag or args.name or args.id):
        ap.error("Укажите --list, --tag, --name или --id")

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
