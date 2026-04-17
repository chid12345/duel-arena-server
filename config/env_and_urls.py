"""
Конфигурация Duel Arena Bot
Портативный сервер для быстрых PvP боев
"""

import os
import sys

def _load_env_local():
    """Подхватить .env.local, если переменные не заданы в системе (удобно при запуске python main.py)."""
    _root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(_root, ".env.local")
    if not os.path.isfile(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key, value = key.strip(), value.strip()
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        pass

_load_env_local()

from progression_loader import (
    exp_needed_for_next_level,
    victory_xp_for_player_level,
    intermediate_ap_steps_for_level,
    max_level_from_table,
    gold_when_reaching_level,
    hp_when_reaching_level,
    stats_when_reaching_level,
    diamonds_when_reaching_level,
    get_table,
)

# Токен бота - установить через переменную окружения
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Игровая версия для UI (бот / mini app) — один источник истины в version.py
from version import GAME_VERSION

from config.class_bundles import *

# Публичный HTTPS URL Mini App (без завершающего слэша), например https://your-app.onrender.com
# Нужен для кнопки Web App в боте и регистрации в BotFather.
# Если WEBAPP_PUBLIC_URL не задан — подставляем типичные URL хостингов (чтобы кнопка не пропадала после деплоя).
def _webapp_public_url() -> str:
    u = (os.getenv("WEBAPP_PUBLIC_URL") or "").strip().rstrip("/")
    render_ext = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")

    if not u:
        if render_ext:
            u = render_ext
        else:
            fly = (os.getenv("FLY_APP_NAME") or "").strip()
            if fly:
                u = f"https://{fly}.fly.dev"
            else:
                rwy = (os.getenv("RAILWAY_PUBLIC_DOMAIN") or "").strip().rstrip("/")
                if rwy:
                    u = rwy if rwy.startswith("http") else f"https://{rwy}"
    elif render_ext:
        # Авто-коррекция: если WEBAPP_PUBLIC_URL указывает на другой хост (например, -2 сервис),
        # а сам сервис знает свой URL через RENDER_EXTERNAL_URL — используем собственный URL.
        u_base = u.split("?")[0]
        if u_base != render_ext:
            import logging as _log
            _log.getLogger(__name__).warning(
                "WEBAPP_PUBLIC_URL (%s) != RENDER_EXTERNAL_URL (%s) — using own service URL",
                u_base, render_ext,
            )
            u = render_ext

    # Добавляем ?v=GAME_VERSION для сброса кэша WebView при деплое.
    # Не используем timestamp — URL кнопки меню не должен меняться при рестарте бота.
    ver = (
        (os.getenv("WEBAPP_URL_VERSION") or "").strip()
        or (os.getenv("RENDER_GIT_COMMIT") or "").strip()[:8]
        or GAME_VERSION
    )
    if u and ver:
        base = u.split("?")[0]
        u = f"{base}?v={ver}"
    return u or ""


WEBAPP_PUBLIC_URL = _webapp_public_url()


def _wb_announce_chat_id() -> int:
    """Chat ID общего чата для анонсов Мирового босса (за 5 мин до рейда).
    Если не задан — анонс не шлём.
    """
    raw = (os.getenv("WB_ANNOUNCE_CHAT_ID") or "").strip()
    if not raw:
        return 0
    try:
        return int(raw)
    except ValueError:
        return 0


WB_ANNOUNCE_CHAT_ID = _wb_announce_chat_id()
