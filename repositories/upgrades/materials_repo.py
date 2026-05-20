"""CRUD для upgrade_materials. Шарды для апгрейдов: shard_T1..shard_T4.

Этап 4B редизайна. Используется через
- /api/upgrade/apply (4D): consume_shards перед попыткой апгрейда
- dismantle (4D): add_shards при разборке шмота
- WB rewards (4D): add_shards при победе в рейде топ-3
"""
from __future__ import annotations

from typing import Dict

_VALID_TIERS = ("T1", "T2", "T3", "T4")


def _mat_type_for_tier(tier: str) -> str:
    """T1 → 'shard_T1'. Защита от мусорного значения."""
    if str(tier) not in _VALID_TIERS:
        raise ValueError(f"Неизвестный тир: {tier!r}, ожидалось один из {_VALID_TIERS}")
    return f"shard_{tier}"


class MaterialsRepoMixin:

    def get_shards(self, user_id: int, tier: str) -> int:
        """Сколько шардов указанного тира у игрока."""
        mat = _mat_type_for_tier(tier)
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT qty FROM upgrade_materials WHERE user_id = ? AND mat_type = ?",
                (int(user_id), mat),
            )
            row = cur.fetchone()
            return int(row["qty"] or 0) if row else 0
        finally:
            conn.close()

    def get_all_shards(self, user_id: int) -> Dict[str, int]:
        """Все шарды игрока — {tier: qty} только с qty > 0."""
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT mat_type, qty FROM upgrade_materials WHERE user_id = ? AND qty > 0",
                (int(user_id),),
            )
            out: Dict[str, int] = {}
            for r in cur.fetchall():
                mt = str(r["mat_type"])
                if mt.startswith("shard_"):
                    out[mt[6:]] = int(r["qty"] or 0)
            return out
        finally:
            conn.close()

    def add_shards(self, user_id: int, tier: str, qty: int) -> None:
        """Добавить qty шардов тира. UPSERT (идемпотентно)."""
        if int(qty) <= 0:
            return
        mat = _mat_type_for_tier(tier)
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            # qty с обеих сторон квалифицируем: в PostgreSQL внутри ON CONFLICT
            # DO UPDATE голая ссылка `qty` неоднозначна (есть и в таблице, и в
            # псевдо-таблице excluded) → AmbiguousColumn. SQLite такую форму тоже
            # принимает, так что один SQL работает в обеих БД.
            cur.execute(
                """INSERT INTO upgrade_materials (user_id, mat_type, qty)
                   VALUES (?, ?, ?)
                   ON CONFLICT(user_id, mat_type)
                   DO UPDATE SET qty = upgrade_materials.qty + excluded.qty""",
                (int(user_id), mat, int(qty)),
            )
            conn.commit()
        finally:
            conn.close()

    def consume_shards(self, user_id: int, tier: str, qty: int) -> bool:
        """Атомарно списать qty шардов. False если недостаточно."""
        if int(qty) <= 0:
            return True
        mat = _mat_type_for_tier(tier)
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE upgrade_materials SET qty = qty - ? "
                "WHERE user_id = ? AND mat_type = ? AND qty >= ?",
                (int(qty), int(user_id), mat, int(qty)),
            )
            ok = cur.rowcount > 0
            conn.commit()
            return ok
        finally:
            conn.close()
