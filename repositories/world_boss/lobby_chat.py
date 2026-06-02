"""Чат зала ожидания рейда Мирового Босса.

Контракт:
- send_message(user_id, username, text) → (ok, msg_id, reason)
  - text > 200 chars → reason='too_long'
  - cooldown < 2 sec для этого user → reason='cooldown'
  - мат → автозамена *** в тексте перед записью
  - пустой текст после очистки → reason='empty'
- get_messages_since(last_id, limit) → list[dict]
- clear() — вызывается из start_wb_spawn (бой начался — чат конец)

Видимость управляется на стороне API (только зарегистрированные на текущий
рейд могут читать/писать).
"""
from __future__ import annotations

import logging
import re
import time
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)

# Лимит символов в одном сообщении
MAX_MSG_LEN = 200
# Кулдаун между сообщениями от одного юзера (сек)
COOLDOWN_SEC = 2
# Сколько сообщений отдаём в одном get_messages_since
DEFAULT_LIMIT = 50

# Базовый мат-фильтр (русский, наиболее частое). Случай-нечувствительно,
# с пограничным \b чтобы не задевать «классные», «склад» и т.п.
# Заменяется на ***. Список можно расширять — храним прямо тут для простоты.
_BAD_WORDS = [
    r"бл[яе][аеуыюо]*", r"бля[аеуыюо]*", r"еб[аеуыёо]+", r"еб[нл]?[ауы]?+",
    r"ху[йёяюе][ваеуыюо]*", r"пизд[ауеиоё][аеуыюо]*",
    r"п[иеёо]?здец", r"сук[аиоу]+", r"мраз[иьаеу]+",
    r"п[еёе]д[ао]?раст\w*", r"г[ао]нд[оо]н\w*",
    r"шлюх[ауые]?", r"уеб[аоиыеюя]*", r"уёб\w*",
    r"м[ао]нд[аыи]\w*", r"за?ебал\w*", r"нах(?:уй|уя)\w*",
]
_BAD_PATTERN = re.compile(
    r"\b(?:" + "|".join(_BAD_WORDS) + r")\b",
    re.IGNORECASE | re.UNICODE,
)


def _mask_profanity(text: str) -> str:
    """Заменяет совпадения мат-слов на *** (длина 3) — не выдаёт сколько букв."""
    return _BAD_PATTERN.sub("***", text)


class WorldBossLobbyChatMixin:
    """Миксин для Database. Только SQL — никакой бизнес-логики выше."""

    def lobby_chat_last_ts(self, user_id: int) -> int:
        """Последний ts отправки сообщения этим юзером. 0 если ничего не было."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT MAX(ts) AS m FROM world_boss_lobby_chat WHERE user_id = ?",
            (int(user_id),),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["m"] or 0) if row else 0

    def lobby_chat_send(self, user_id: int, username: str, text: str) -> Tuple[bool, int, str]:
        """
        Записать сообщение. Возвращает (ok, msg_id, reason).
        Проверки длины/кулдауна/пустоты выше — здесь чистый insert.
        Мат-фильтр применяется ВСЕГДА.
        """
        clean = _mask_profanity((text or "").strip())
        if not clean:
            return False, 0, "empty"
        if len(clean) > MAX_MSG_LEN:
            return False, 0, "too_long"

        ts = int(time.time())
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO world_boss_lobby_chat (user_id, username, message, ts) VALUES (?, ?, ?, ?)",
            (int(user_id), str(username or "Воин"), clean, ts),
        )
        msg_id = int(cur.lastrowid) if hasattr(cur, "lastrowid") and cur.lastrowid else 0
        if not msg_id:
            cur.execute("SELECT MAX(id) AS m FROM world_boss_lobby_chat")
            row = cur.fetchone()
            msg_id = int(row["m"]) if row else 0
        conn.commit()
        conn.close()
        return True, msg_id, "ok"

    def lobby_chat_get_since(self, last_id: int = 0, limit: int = DEFAULT_LIMIT) -> List[Dict]:
        """Сообщения с id > last_id, по возрастанию id, до limit штук."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, user_id, username, message, ts FROM world_boss_lobby_chat "
            "WHERE id > ? ORDER BY id ASC LIMIT ?",
            (int(last_id), int(limit)),
        )
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    def lobby_chat_clear(self) -> int:
        """Удалить все сообщения. Возвращает кол-во удалённых."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM world_boss_lobby_chat")
        deleted = cur.rowcount or 0
        conn.commit()
        conn.close()
        if deleted:
            logger.info("lobby_chat_clear: удалено %d сообщений", deleted)
        return deleted
