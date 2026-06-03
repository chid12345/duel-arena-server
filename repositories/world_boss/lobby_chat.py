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

# ─── Мат-фильтр ──────────────────────────────────────────────────────────
# Подход: НОРМАЛИЗАЦИЯ → проверка по словарю корней.
# Нормализация = лоуэркейс + перевод латиницы/цифр в похожие кириллические
# буквы + выкидывание любых разделителей (пробелы, точки, нижние подчёркивания).
# Так ловим обходы: «xуй», «6лядь», «б_л_я_д_ь», «бl@ть», «п.и.з.д.а».
#
# Старый фильтр (\b + 15 regex) пропускал почти всё — юзер прав. Здесь
# словарь корней (легко добавлять) + двойная проверка: по словам и по всему
# сообщению (ловит мат, разнесённый пробелами).

# Латиница → кириллица (визуально похожие). z→з ловит «пиZда».
# r→г специально для «pidor» (но не для «r» в середине слова — погрешность).
_LEET_MAP = str.maketrans({
    "a": "а", "b": "в", "c": "с", "e": "е", "h": "н", "k": "к",
    "m": "м", "o": "о", "p": "р", "t": "т", "x": "х", "y": "у",
    "u": "и", "i": "и", "n": "н", "z": "з",
    "0": "о", "3": "з", "4": "ч", "6": "б", "8": "в", "9": "д",
    "@": "а", "$": "с",
})


def _normalize(s: str) -> str:
    """Привести к виду, по которому ищем мат:
    lower → leet → ё→е (юзеры пишут «долбоеб» и «долбоёб») → только а-я.
    Без 'ё' в нормализованной форме упрощает словарь — храним только 'е'.
    """
    s = (s or "").lower().translate(_LEET_MAP)
    s = s.replace("ё", "е")
    return re.sub(r"[^а-я]+", "", s)


# Корни мат-слов. ВСЕ только через «е» (нормализатор схлопывает ё→е).
# Substring-match по нормализованной строке ловит все падежи/приставки/суффиксы.
_BAD_ROOTS = (
    # хуй
    "хуй", "хуя", "хуе", "хуи", "хуев",
    # пизда
    "пизд", "пздц",
    # бля / блядь
    "бля", "блят", "блядь", "блд",
    # еб / ёб (все формы: ебать, выеб, заеб, наеб, отъеб, съеб, уеб...)
    "еба", "ебу", "ебл", "ебн", "ебш", "выеб", "заеб",
    "наеб", "поеб", "съеб", "уеб", "доеб", "переб", "разъеб",
    "ебись", "ебнут", "ебанут",
    # сук
    "сук",
    # пидор / пидар / педр / педер
    "пидор", "пидар", "пидр", "педер", "педик",
    # мудак / мудила / мудоз
    "мудак", "мудил", "мудоз", "мудач",
    # залупа
    "залуп",
    # дрочить
    "дроч",
    # хер / херня / хрен
    "херн", "херов",
    # гондон
    "гондон", "гандон",
    # шлюха
    "шлюх",
    # мразь
    "мраз",
    # говно / гавно
    "говн", "гавн",
    # срать / ссать
    "срать", "ссать", "ссан", "сран",
    # манда
    "манд", "мандавошк",
    # нахуй / нихуя / охуеть / охуенно
    "нахуй", "нахер", "нихуя", "охуе", "охуи", "охуя", "охуен",
    # долбоёб → нормализуется в «долбоеб»
    "долбое", "долбоя", "долбае",
    # минетчик / отсос
    "минет", "отсос",
    # ёбаный / ебучий → «ебан» / «ебуч»
    "ебан", "ебуч",
    # пиздец / пиздатый
    "пиздец", "пиздат",
    # трах
    "трахн", "трахаю", "оттрах",
    # жопа (мягче, но просили — добавим)
    "жопа", "жопу",
    # сволочь / тварь
    "сволоч", "тварь",
    # урод
    "урод",
    # чмо
    "чмо", "чмыр",
    # козёл (как ругательство) → «козел»
    "козел", "козлин",
    # лох
    "лошар",
    # хач, чурка и пр. — национальное оскорбление
    "чурк", "хачик", "чурбан",
)


def _has_bad_root(normalized: str) -> bool:
    return any(root in normalized for root in _BAD_ROOTS)


def _mask_profanity(text: str) -> str:
    """Заменяет матерные слова на *** (3 звёздочки).

    Двойная проверка:
    1) По словам — нормализуем КАЖДОЕ слово, если содержит мат-корень →
       заменяем это слово целиком на ***. Сохраняет читаемость остального.
    2) Fallback — нормализуем ВСЁ сообщение (склеиваем без пробелов).
       Если так нашлось — мат был разнесён пробелами/точками между букв
       («б л я т ь»), per-word не поймал → весь текст заменяем на ***.
    """
    if not text:
        return text

    # Шаг 1: по словам. Разбиваем сохраняя разделители (пробелы/пунктуация).
    tokens = re.split(r"(\s+|[.,!?…\-—:;()«»\"'])", text)
    out_tokens = []
    masked_any = False
    for tok in tokens:
        if tok and _has_bad_root(_normalize(tok)):
            out_tokens.append("***")
            masked_any = True
        else:
            out_tokens.append(tok)
    masked = "".join(out_tokens)

    # Шаг 2: fallback. Нормализуем целиком (даже если per-word не сработал).
    if _has_bad_root(_normalize(text)) and not masked_any:
        return "***"

    return masked


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
