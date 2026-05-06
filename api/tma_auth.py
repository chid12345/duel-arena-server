"""Проверка Telegram initData для Mini App."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import urllib.parse
from typing import Dict, Optional

from fastapi import HTTPException

from config import BOT_TOKEN

logger = logging.getLogger(__name__)


def _verify_telegram_init_data(init_data: str) -> Optional[Dict]:
    """
    Проверяет подпись Telegram initData (HMAC-SHA256).
    Возвращает распарсенные данные или None если подпись неверна.
    """
    if not BOT_TOKEN:
        # Без BOT_TOKEN HMAC проверить невозможно. В проде это означает
        # «любой может ходить как любой uid» — поэтому пускаем без подписи
        # ТОЛЬКО если явно разрешено в env (ALLOW_UNSIGNED_TMA=1, локалка).
        if os.getenv("ALLOW_UNSIGNED_TMA", "") != "1":
            logger.error("BOT_TOKEN не задан — TMA auth отключён, пропускаю запрос")
            return None
        try:
            parsed = dict(urllib.parse.parse_qsl(init_data, strict_parsing=False))
            user_str = parsed.get("user", "{}")
            parsed["_user"] = json.loads(urllib.parse.unquote(user_str))
            return parsed
        except Exception:
            return None

    try:
        parsed = dict(urllib.parse.parse_qsl(init_data, strict_parsing=False))
        hash_received = parsed.pop("hash", "")
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected_hash, hash_received):
            return None

        user_str = parsed.get("user", "{}")
        parsed["_user"] = json.loads(urllib.parse.unquote(user_str))
        return parsed
    except Exception as e:
        logger.warning("initData verify error: %s", e)
        return None


def get_user_from_init_data(init_data: str) -> Dict:
    data = _verify_telegram_init_data(init_data)
    if not data:
        raise HTTPException(status_code=401, detail="Invalid Telegram auth")
    return data["_user"]
