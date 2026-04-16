"""Чтение истории боёв и реплеев."""

from __future__ import annotations

import ast
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def _parse_battle_data(raw: Any) -> Dict[str, Any]:
    """battle_data хранится как JSON (новые записи) или str(dict) (старые).
    Возвращает пустой dict, если распарсить не удалось.
    """
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    s = str(raw).strip()
    if not s:
        return {}
    try:
        return json.loads(s)
    except Exception:
        pass
    try:
        val = ast.literal_eval(s)
        return val if isinstance(val, dict) else {}
    except Exception:
        return {}


class BattlesReadMixin:
    def get_recent_battles(self, user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Список последних боёв игрока (player1 или player2), от новых к старым.
        Фильтр: только бои, у которых реально есть сохранённый webapp_log
        (старые бои до деплоя этой фичи — без реплея — не показываем).
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        ph = "%s" if self._pg else "?"
        # Берём с запасом (×3), потом фильтруем — чтобы при удалении «пустых» всё равно
        # вернуть до `limit` валидных карточек.
        cap = min(200, max(int(limit) * 3, int(limit)))
        cursor.execute(
            f"SELECT battle_id, player1_id, player2_id, is_bot1, is_bot2, "
            f"winner_id, battle_result, rounds_played, battle_data, created_at "
            f"FROM battles WHERE player1_id = {ph} OR player2_id = {ph} "
            f"ORDER BY created_at DESC, battle_id DESC LIMIT {cap}",
            (user_id, user_id),
        )
        rows = cursor.fetchall() or []
        conn.close()
        out: List[Dict[str, Any]] = []
        for r in rows:
            d = dict(r) if hasattr(r, "keys") else {}
            if not d:
                continue
            details = _parse_battle_data(d.get("battle_data"))
            webapp_log = details.get("webapp_log") or []
            if not isinstance(webapp_log, list) or not webapp_log:
                continue  # нет реплея — в список не включаем
            p1 = d.get("player1_id")
            is_p1 = (p1 == user_id)
            opp_id = d.get("player2_id") if is_p1 else d.get("player1_id")
            opp_is_bot = bool(d.get("is_bot2") if is_p1 else d.get("is_bot1"))
            won = (d.get("winner_id") == user_id)
            out.append({
                "battle_id": int(d.get("battle_id", 0)),
                "won": won,
                "result": d.get("battle_result") or "",
                "rounds": int(d.get("rounds_played") or 0),
                "opp_id": opp_id,
                "opp_is_bot": opp_is_bot,
                "created_at": str(d.get("created_at") or ""),
            })
            if len(out) >= int(limit):
                break
        return out

    def get_battle_replay(self, battle_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Полный реплей боя для игрока. Возвращает None, если бой не найден
        ИЛИ игрок не был его участником (защита от подбора чужих боёв).
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        ph = "%s" if self._pg else "?"
        cursor.execute(
            f"SELECT battle_id, player1_id, player2_id, is_bot1, is_bot2, "
            f"winner_id, battle_result, rounds_played, battle_data, created_at "
            f"FROM battles WHERE battle_id = {ph}",
            (int(battle_id),),
        )
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row) if hasattr(row, "keys") else {}
        p1 = d.get("player1_id")
        p2 = d.get("player2_id")
        if user_id != p1 and user_id != p2:
            return None  # чужой бой — не отдаём
        details = _parse_battle_data(d.get("battle_data"))
        webapp_log = details.get("webapp_log") or []
        if not isinstance(webapp_log, list):
            webapp_log = []
        opp_names = details.get("opponent_names") or {}
        is_p1 = (p1 == user_id)
        opp_name = opp_names.get("p2") if is_p1 else opp_names.get("p1")
        return {
            "battle_id": int(d.get("battle_id", 0)),
            "won": (d.get("winner_id") == user_id),
            "result": d.get("battle_result") or "",
            "rounds": int(d.get("rounds_played") or 0),
            "opp_name": opp_name or "",
            "is_p1": is_p1,
            "created_at": str(d.get("created_at") or ""),
            "webapp_log": [str(x) for x in webapp_log],
            "mode": details.get("mode") or "normal",
        }
