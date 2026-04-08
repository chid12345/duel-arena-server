"""
FastAPI сервер для Duel Arena TMA (Telegram Mini App).
Шарит database.py и battle_system.py с Telegram-ботом.

Локально: uvicorn api_server:app --host 0.0.0.0 --port 8000
Прод: см. Dockerfile + scripts/start_web_and_bot.sh и DEPLOY_TMA.md
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from api.avatar_shop_routes import register_avatar_shop_routes
from api.endless_routes import register_endless_routes
from api.payment_routes import register_payment_routes
from api.progression_routes import register_progression_routes
from api.shop_routes import register_shop_routes
from api.social_routes import register_social_routes
from api.system_realtime_routes import register_system_realtime_routes
from api.titan_training_routes import register_titan_training_routes

# Подтягиваем существующие модули игры
from config import (
    BOT_TOKEN, PLAYER_START_LEVEL, PLAYER_START_MAX_HP, PLAYER_START_CRIT,
    stamina_stats_invested, total_free_stats_at_level,
    DODGE_MAX_CHANCE, CRIT_MAX_CHANCE,
    ARMOR_STAMINA_K_ABS, ARMOR_CAP_BASE, ARMOR_CAP_PER_LEVEL, ARMOR_ABSOLUTE_MAX,
    STRENGTH_DAMAGE_FLAT_PER_LEVEL, STRENGTH_DAMAGE_SCALE, STRENGTH_DAMAGE_POWER,
    AGI_BONUS_STEP, AGI_BONUS_PCT_PER_STEP,
    INT_BONUS_STEP, INT_BONUS_PCT_PER_STEP,
    PLAYER_START_ENDURANCE, PLAYER_START_CRIT,
    HP_MIN_BATTLE_PCT, HP_REGEN_BASE_SECONDS, HP_REGEN_ENDURANCE_BONUS,
    MAX_LEVEL, exp_needed_for_next_level, format_exp_progress,
    VICTORY_GOLD, CRYPTOPAY_TOKEN, CRYPTOPAY_TESTNET, PREMIUM_SUBSCRIPTION_STARS,
    PREMIUM_XP_BONUS_PERCENT, FULL_RESET_CRYPTO_USDT,
    AVATAR_CATALOG, ELITE_AVATAR_ID, ELITE_AVATAR_STARS, ELITE_AVATAR_USDT,
)
from database import db
from battle_system import battle_system
from reward_calculator import calc_reward

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Duel Arena TMA API", version="1.0")

# ─── Rate Limiter ─────────────────────────────────────────────────────────────
class _RateLimiter:
    """Простой in-memory rate limiter по ключу (uid:endpoint)."""
    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = {}

    def check(self, key: str, max_hits: int, window_sec: int) -> bool:
        """True = запрос разрешён, False = превышен лимит."""
        now = time.monotonic()
        hits = self._hits.get(key)
        if hits is None:
            self._hits[key] = [now]
            return True
        cutoff = now - window_sec
        # удаляем устаревшие записи
        while hits and hits[0] < cutoff:
            hits.pop(0)
        if len(hits) >= max_hits:
            return False
        hits.append(now)
        return True

    def cleanup(self) -> None:
        """Удаляет пустые/неактивные ключи (вызывается периодически)."""
        now = time.monotonic()
        self._hits = {k: v for k, v in self._hits.items() if v and v[-1] > now - 300}

_rl = _RateLimiter()

def _rl_check(uid: int, endpoint: str, max_hits: int, window_sec: int) -> None:
    """Бросает HTTPException 429 если лимит превышен."""
    if not _rl.check(f"{uid}:{endpoint}", max_hits, window_sec):
        raise HTTPException(status_code=429, detail="Слишком много запросов, подожди немного")

# ─── Кэш профиля игрока ───────────────────────────────────────────────────────
# Хранит (player_dict, timestamp). TTL = 3 сек.
# Инвалидируется после любой записи (тренировка, квест, сброс, бой).
_PLAYER_CACHE_TTL = 3.0
_player_cache: dict[int, tuple[dict, float]] = {}


def _cache_get(uid: int) -> dict | None:
    entry = _player_cache.get(uid)
    if entry and (time.monotonic() - entry[1]) < _PLAYER_CACHE_TTL:
        return entry[0]
    return None


def _cache_set(uid: int, player: dict) -> None:
    _player_cache[uid] = (dict(player), time.monotonic())


def _cache_invalidate(uid: int) -> None:
    _player_cache.pop(uid, None)

# Игровая версия для UI (экран «Ещё»). При любом деплое с изменениями кода — +0.01 (1.06 → 1.07).
GAME_VERSION = "1.66"

# Технический хэш сборки (для кэш-бастинга URL, не показывается игрокам).
APP_BUILD_VERSION = (
    (os.getenv("WEBAPP_URL_VERSION") or "").strip()
    or (os.getenv("RENDER_GIT_COMMIT") or "").strip()[:8]
    or "dev"
)

# Диагностика: предупреждаем если WEBAPP_PUBLIC_URL указывает на другой хост чем сам сервис.
_self_host = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
_webapp_host = (os.getenv("WEBAPP_PUBLIC_URL") or "").strip().rstrip("/").split("?")[0]
if _self_host and _webapp_host and _self_host != _webapp_host:
    logger.warning(
        "⚠️  WEBAPP_PUBLIC_URL (%s) differs from RENDER_EXTERNAL_URL (%s)! "
        "Mini App will open on a DIFFERENT service → API calls will fail. "
        "Fix: set WEBAPP_PUBLIC_URL=%s in Render env vars.",
        _webapp_host, _self_host, _self_host,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
# GZip-сжатие для JS/CSS/JSON (≥1 KB) — уменьшает трафик на ~70%
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def smart_cache(request: Request, call_next):
    """
    Умное кэширование статики:
    - index.html / корень: no-store (всегда свежий, содержит build-версию)
    - *.js?v=HASH, *.css?v=HASH: кэш на 1 год (версия в URL гарантирует свежесть после деплоя)
    - картинки, иконки: кэш на 7 дней
    - API / WebSocket: без изменений
    """
    response = await call_next(request)
    path = request.url.path.lower()
    has_version = bool(request.query_params.get("v") or request.query_params.get("bv"))

    if request.method != "GET":
        return response

    # HTML и корень — никогда не кэшируем
    if path == "/" or path.endswith(".html"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    # JS/CSS с версией — кэш на 1 год (immutable)
    elif has_version and path.endswith((".js", ".css")):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

    # Картинки/иконки — кэш 7 дней
    elif path.endswith((".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".gif")):
        response.headers["Cache-Control"] = "public, max-age=604800"

    return response

# ─── WebSocket менеджер ──────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.connections[user_id] = ws

    def disconnect(self, user_id: int):
        self.connections.pop(user_id, None)

    async def send(self, user_id: int, data: dict):
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(user_id)

    def is_online(self, user_id: int) -> bool:
        return int(user_id) in self.connections

    async def broadcast_battle(self, battle: dict, payload: dict):
        p1_uid = battle["player1"]["user_id"]
        p2_uid = battle["player2"].get("user_id")
        await self.send(p1_uid, payload)
        if p2_uid:
            await self.send(p2_uid, payload)


manager = ConnectionManager()
AVATAR_BY_ID = {a["id"]: dict(a) for a in AVATAR_CATALOG}


async def _send_tg_message(chat_id: int, text: str, parse_mode: str = "HTML") -> None:
    """Отправить сообщение пользователю через Bot API (fire-and-forget)."""
    if not BOT_TOKEN:
        return
    import httpx
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            )
    except Exception as e:
        logger.warning("_send_tg_message failed: %s", e)


async def _notify_paid_full_reset(uid: int) -> None:
    """Сброс прогресса после оплаты USDT: золото, алмазы, клан и рефералка сохраняются."""
    try:
        battle_system.force_abandon_battle(uid)
    except Exception as e:
        logger.warning("force_abandon before full reset uid=%s: %s", uid, e)
    db.wipe_player_profile(uid, keep_wallet_clan_and_referrals=True)
    battle_system.mark_profile_reset(uid, ttl_seconds=600)
    _cache_invalidate(uid)
    db.get_or_create_player(uid, "")
    db.log_metric_event("paid_full_reset", uid, value=1)
    try:
        await manager.send(uid, {"event": "profile_reset", "source": "cryptopay_usdt"})
    except Exception as e:
        logger.warning("ws profile_reset uid=%s: %s", uid, e)
    await _send_tg_message(
        uid,
        "🔄 <b>Прогресс сброшен</b>\n"
        "Оплата USDT получена. Уровень и бои — с нуля; <b>золото, алмазы, клан и реферальная программа</b> сохранены.\n"
        "Откройте /start или Mini App.\n\n"
        "⚔️ Duel Arena",
    )


# ─── Авторизация через Telegram initData ────────────────────────────────────

def _verify_telegram_init_data(init_data: str) -> Optional[Dict]:
    """
    Проверяет подпись Telegram initData (HMAC-SHA256).
    Возвращает распарсенные данные или None если подпись неверна.
    """
    if not BOT_TOKEN:
        # Dev-режим без токена: принимаем всё
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
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
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


# ─── Pydantic schemas ────────────────────────────────────────────────────────

class InitDataHeader(BaseModel):
    init_data: str


class BattleChoiceBody(BaseModel):
    init_data: str
    attack: str    # HEAD / TORSO / LEGS
    defense: str


class FindBattleBody(BaseModel):
    init_data: str
    queue_only: bool = False   # True = join PvP queue, don't fall back to bot
    prefer_bot: bool = False   # True = skip PvP, start bot immediately

class ChallengeSendBody(BaseModel):
    init_data: str
    nickname: str

class ChallengeRespondBody(BaseModel):
    init_data: str
    challenge_id: int
    accept: bool

class ChallengeCancelBody(BaseModel):
    init_data: str
    challenge_id: int

# ─── Вспомогательные функции ─────────────────────────────────────────────────

def _player_api(player: dict) -> dict:
    """Сериализовать игрока для API."""
    lv  = int(player.get("level", 1))
    mhp = int(player.get("max_hp", PLAYER_START_MAX_HP))
    chp = int(player.get("current_hp", mhp))
    s   = int(player.get("strength", 3))
    agi = int(player.get("endurance", 3))
    intu = int(player.get("crit", PLAYER_START_CRIT))
    vyn  = stamina_stats_invested(mhp, lv)
    tf   = total_free_stats_at_level(lv)

    avg_agi  = max(1, PLAYER_START_ENDURANCE + tf // 4)
    avg_intu = max(1, PLAYER_START_CRIT + tf // 4)
    agi_inv  = max(0, agi - PLAYER_START_ENDURANCE)
    int_inv  = max(0, intu - PLAYER_START_CRIT)
    dodge_p = int(min(DODGE_MAX_CHANCE,
        agi / (agi + avg_agi) * DODGE_MAX_CHANCE
        + (agi_inv // AGI_BONUS_STEP) * AGI_BONUS_PCT_PER_STEP
    ) * 100)
    crit_p  = int(min(CRIT_MAX_CHANCE,
        intu / (intu + avg_intu) * CRIT_MAX_CHANCE
        + (int_inv // INT_BONUS_STEP) * INT_BONUS_PCT_PER_STEP
    ) * 100)
    armor_base = vyn / (vyn + ARMOR_STAMINA_K_ABS) if vyn > 0 else 0.0
    armor_cap  = min(ARMOR_ABSOLUTE_MAX, ARMOR_CAP_BASE + ARMOR_CAP_PER_LEVEL * lv)
    armor_p    = int(min(armor_cap, armor_base) * 100)
    dmg     = max(5, int(STRENGTH_DAMAGE_FLAT_PER_LEVEL * lv + STRENGTH_DAMAGE_SCALE * (s ** STRENGTH_DAMAGE_POWER)))

    need_xp = exp_needed_for_next_level(lv)

    title = (player.get("display_title") or "").strip()
    avatar_id = (player.get("equipped_avatar_id") or "base_neutral").strip()
    avatar = AVATAR_BY_ID.get(avatar_id) or {}
    return {
        "user_id": player.get("user_id"),
        "username": player.get("username") or "Боец",
        "display_title": title or None,
        "level": lv,
        "exp": int(player.get("exp", 0)),
        "exp_needed": need_xp,
        "strength": s,
        "agility": agi,
        "intuition": intu,
        "stamina": vyn,
        "max_hp": mhp,
        "current_hp": chp,
        "gold": int(player.get("gold", 0)),
        "diamonds": int(player.get("diamonds", 0)),
        "wins": int(player.get("wins", 0)),
        "losses": int(player.get("losses", 0)),
        "rating": int(player.get("rating", 1000)),
        "free_stats": int(player.get("free_stats", 0)),
        "win_streak": int(player.get("win_streak", 0)),
        "dmg": dmg,
        "dodge_pct": dodge_p,
        "crit_pct": crit_p,
        "armor_pct": armor_p,
        "hp_pct": int(chp / max(1, mhp) * 100),
        "xp_pct": int(int(player.get("exp", 0)) / max(1, need_xp) * 100) if need_xp > 0 else 100,
        "max_level": lv >= MAX_LEVEL,
        "equipped_avatar_id": avatar_id,
        "avatar_name": avatar.get("name"),
        "avatar_badge": avatar.get("badge"),
        # Реген HP — для таймера в TMA
        "regen_per_min": round(
            mhp / HP_REGEN_BASE_SECONDS
            * (1.0 + max(0, vyn) * HP_REGEN_ENDURANCE_BONUS)
            * 60, 1
        ),
        "regen_secs_to_full": (
            0 if chp >= mhp else
            int((mhp - chp) / max(0.001,
                mhp / HP_REGEN_BASE_SECONDS
                * (1.0 + max(0, vyn) * HP_REGEN_ENDURANCE_BONUS)
            ))
        ),
        # Premium подписка
        **_premium_fields(player),
    }


def _premium_fields(player: dict) -> dict:
    """Вычислить поля Premium из данных игрока."""
    from datetime import datetime
    until_str = player.get("premium_until")
    if not until_str:
        return {"is_premium": False, "premium_until": None, "premium_days_left": 0}
    try:
        until = datetime.fromisoformat(until_str)
        if until <= datetime.utcnow():
            return {"is_premium": False, "premium_until": until_str, "premium_days_left": 0}
        days_left = max(0, (until - datetime.utcnow()).days)
        return {"is_premium": True, "premium_until": until_str, "premium_days_left": days_left}
    except Exception:
        return {"is_premium": False, "premium_until": None, "premium_days_left": 0}


def _battle_state_api(user_id: int) -> Optional[dict]:
    """Состояние текущего боя для API (перспектива user_id)."""
    ctx = battle_system.get_battle_ui_context(user_id)
    if not ctx:
        return None

    bid  = battle_system.battle_queue.get(user_id)
    b    = battle_system.active_battles.get(bid) if bid else None
    is_p1 = b and b["player1"]["user_id"] == user_id if b else True
    is_pvp = b and not b.get("is_bot2") if b else False

    # Секунд до конца хода (из deadline в battle)
    deadline_sec = None
    if b and b.get("next_turn_deadline"):
        from datetime import datetime
        left = (b["next_turn_deadline"] - datetime.now()).total_seconds()
        deadline_sec = max(0, int(left))

    # Данные соперника для карточки
    opp_entity = None
    opp_is_bot = True
    if b:
        if is_p1:
            opp_entity = b.get("player2")
            opp_is_bot = b.get("is_bot2", True)
        else:
            opp_entity = b.get("player1")
            opp_is_bot = False
    opp_is_premium = False
    if opp_entity and not opp_is_bot:
        opp_is_premium = bool(_premium_fields(opp_entity).get("is_premium"))

    return {
        "battle_id": bid,
        "active": True,
        "is_pvp": is_pvp,
        "is_p1": is_p1,
        "mode": b.get("mode", "normal") if b else "normal",
        "round": ctx.get("round_num", 0),
        "my_hp": ctx.get("your_hp"),
        "my_max_hp": ctx.get("your_max"),
        "opp_hp": ctx.get("opp_hp"),
        "opp_max_hp": ctx.get("opp_max"),
        "opp_name": ctx.get("opponent_name"),
        "opp_level": ctx.get("opponent_level"),
        "opp_strength": ctx.get("opp_strength"),
        "opp_agility": ctx.get("opp_endurance"),
        "opp_intuition": ctx.get("opp_crit"),
        "opp_stamina": ctx.get("opp_stamina_invested", 0),
        "opp_rating": ctx.get("opp_rating", 1000),
        "opp_is_bot": opp_is_bot,
        "opp_is_premium": opp_is_premium,
        "pending_attack": ctx.get("pending_attack"),
        "pending_defense": ctx.get("pending_defense"),
        "waiting_opponent": ctx.get("waiting_opponent", False),
        # webapp_log — короткие однострочные записи ≤33 символа для DOM-лога
        # Fallback на combat_log_lines для старых боёв без webapp_log
        "combat_log": (b.get("webapp_log") or b.get("combat_log_lines", []) if b else [])[-6:],
        "deadline_sec": deadline_sec,
    }


def _adapt_battle_result_for_user(result: dict, user_id: int) -> dict:
    """Адаптировать round_result под перспективу user_id (P1/P2)."""
    if not result:
        return {}
    winner_id = result.get("winner_id")
    if winner_id is None:
        return dict(result)
    p1_uid = result.get("pvp_p1_user_id")
    # Для PvB и для P1 в PvP данные уже в нужной перспективе.
    if p1_uid is None or user_id == p1_uid:
        r = dict(result)
        r["human_won"] = (winner_id == user_id)
        return r
    # user_id — P2: используем p2-поля, подготовленные battle_system.
    r = dict(result)
    r["human_won"] = (winner_id == user_id)
    r["damage_to_opponent"] = result.get("damage_to_you")
    r["damage_to_you"] = result.get("damage_to_opponent")
    r["gold_reward"] = result.get("p2_gold_reward", 0)
    r["exp_reward"] = result.get("p2_exp_reward", 0)
    r["xp_boosted"] = result.get("p2_xp_boosted", False)
    r["streak_bonus_gold"] = result.get("p2_streak_bonus_gold", 0)
    r["win_streak"] = result.get("p2_win_streak", 0)
    r["level_up"] = result.get("p2_level_up", False)
    r["level_up_level"] = result.get("p2_level_up_level", None)
    return r


def _iso_week_key() -> str:
    y, w, _ = datetime.utcnow().isocalendar()
    return f"{int(y)}-W{int(w):02d}"


def _titan_boss_for_floor(floor: int, player: Dict[str, Any]) -> Dict[str, Any]:
    fl = max(1, int(floor))
    lvl = int(player.get("level", 1))
    base_lvl = max(1, lvl + (fl - 1) // 2)
    hp_scale = 1.0 + min(3.5, fl * 0.14)
    str_scale = 1.0 + min(2.4, fl * 0.09)
    end_scale = 1.0 + min(2.8, fl * 0.10)
    crit_bonus = min(22, fl // 2)
    names = [
        "Страж Руин", "Костяной Колосс", "Пепельный Воитель", "Ледяной Палач",
        "Громовой Вестник", "Темный Титан", "Владыка Башни",
    ]
    nick = names[(fl - 1) % len(names)]
    p_max_hp = int(player.get("max_hp", PLAYER_START_MAX_HP))
    p_str = int(player.get("strength", 10))
    p_end = int(player.get("endurance", 10))
    p_crit = int(player.get("crit", PLAYER_START_CRIT))
    max_hp = max(140, int(round(p_max_hp * hp_scale)))
    strength = max(8, int(round(p_str * str_scale)))
    endurance = max(8, int(round(p_end * end_scale)))
    crit = max(PLAYER_START_CRIT, p_crit + crit_bonus)
    return {
        "bot_id": 900000 + fl,
        "name": f"🗿 {nick} [{fl}]",
        "level": base_lvl,
        "strength": strength,
        "endurance": endurance,
        "crit": crit,
        "max_hp": max_hp,
        "current_hp": max_hp,
        "bot_type": "titan_boss",
        "ai_pattern": "adaptive",
    }


def _endless_bot_for_wave(wave: int) -> Dict[str, Any]:
    """Генератор бота для режима Натиск.

    Кривая сложности:
      Волны 1-3  — очень лёгкие (str≈2-4, crit=1, hp≈48-74)  → любой новичок проходит
      Волны 4-7  — лёгкие     (str≈5-7, crit=2, hp≈87-126) → чуть посложнее
      Волны 8-15 — средние    (str≈8-13, crit=3-5, hp≈139-230) → нужно вложение в статы
      Волны 16+  — жёсткие    (str≈15+, crit=6+, hp≈243+) → для прокачанных
    """
    WAVE_NAMES = [
        (1,  3,  "Зелёный новобранец"),
        (4,  6,  "Уличный боец"),
        (7,  10, "Опытный головорез"),
        (11, 15, "Боевой ветеран"),
        (16, 20, "Закалённый гладиатор"),
        (21, 30, "Элитный убийца"),
        (31, 40, "Тёмный рыцарь"),
        (41, 50, "Демон Арены"),
        (51, 99, "Легендарный Берсерк"),
    ]
    name = "Легендарный Берсерк"
    for lo, hi, n in WAVE_NAMES:
        if lo <= wave <= hi:
            name = n
            break
    # Новая плавная кривая: волна 1 значительно слабее игрока-новичка (str≈10, end≈10, crit≈3)
    strength  = max(2,  2  + int(wave * 0.75))   # w1=2  w5=5  w10=9  w20=17
    endurance = max(2,  2  + int(wave * 0.50))   # w1=2  w5=4  w10=7  w20=12
    crit      = max(1,  1  + int(wave * 0.35))   # w1=1  w5=2  w10=4  w20=8
    max_hp    = max(35, 35 + wave * 13)           # w1=48 w5=100 w10=165 w20=295
    level     = max(1,  1  + int(wave * 0.55))   # w1=1  w5=3  w10=6  w20=12
    return {
        "bot_id":    800000 + wave,
        "name":      f"[{wave}] {name}",
        "level":     level,
        "strength":  strength,
        "endurance": endurance,
        "crit":      crit,
        "max_hp":    max_hp,
        "current_hp": max_hp,
        "is_premium": False,
    }


def _weekly_quests_status(uid: int) -> Dict[str, Any]:
    week_key = _iso_week_key()
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        if db._pg:
            cursor.execute(
                """
                SELECT SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) AS wins
                FROM battles
                WHERE is_bot2 = FALSE
                  AND (player1_id = ? OR player2_id = ?)
                  AND created_at >= date_trunc('week', now())
                """,
                (uid, uid, uid),
            )
        else:
            cursor.execute(
                """
                SELECT SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) AS wins
                FROM battles
                WHERE is_bot2 = 0
                  AND (player1_id = ? OR player2_id = ?)
                  AND date(created_at) >= date('now', 'weekday 1', '-7 days')
                """,
                (uid, uid, uid),
            )
        row = cursor.fetchone() or {}
        pvp_wins = int(row.get("wins") or 0)
    finally:
        conn.close()

    titan = db.get_titan_progress(uid)
    weekly_floor = int(titan.get("weekly_best_floor", 0))
    streak = int((db.get_or_create_player(uid, "") or {}).get("win_streak", 0))
    week_key = _iso_week_key()
    endless_weekly = db.endless_get_weekly_progress(uid, week_key)
    endless_weekly_wins = endless_weekly["weekly_wins"]
    endless_weekly_wave = endless_weekly["best_wave"]
    # difficulty (сложность) + frequency (частота) → авторасчёт через reward_calculator (таблица)
    defs = [
        {
            "key": "weekly_pvp_wins_10", "cur": pvp_wins, "max": 10,
            "difficulty": "medium", "frequency": "weekly",
            "label": "⚔️ Охотник на игроков",
            "desc": "Настоящая слава — только в бою с живым противником. Победите 10 реальных игроков в PvP за эту неделю.",
        },
        {
            "key": "weekly_titan_floor_5", "cur": weekly_floor, "max": 5,
            "difficulty": "hard", "frequency": "weekly",
            "label": "🏰 Покоритель Башни",
            "desc": "Башня Титанов стоит веками. Поднимитесь до 5-го этажа и докажите, что вы достойны звания Титана.",
        },
        {
            "key": "weekly_streak_5", "cur": streak, "max": 5,
            "difficulty": "medium", "frequency": "weekly",
            "label": "🔥 Полоса победы",
            "desc": "Пять побед подряд — это характер, не удача. Соберите серию из 5 побед без единого поражения.",
        },
        {
            "key": "weekly_endless_wins_10", "cur": endless_weekly_wins, "max": 10,
            "difficulty": "hard", "frequency": "weekly",
            "label": "💀 Мясорубка Натиска",
            "desc": "Они идут волна за волной и не знают страха. Уничтожьте 10 врагов в режиме Натиск.",
        },
        {
            "key": "weekly_endless_wave_5", "cur": endless_weekly_wave, "max": 5,
            "difficulty": "epic", "frequency": "weekly",
            "label": "🌊 До пятой волны",
            "desc": "Немногие видели пятую волну Натиска — и пережили её. Доберитесь до 5-й волны.",
        },
    ]
    quests = []
    for q in defs:
        done = int(q["cur"]) >= int(q["max"])
        claimed = db.has_weekly_claim(uid, week_key, q["key"])
        gold, diamonds, xp = calc_reward(q["difficulty"], q["frequency"])
        quests.append({
            "key": q["key"],
            "label": q["label"],
            "desc": q["desc"],
            "current": int(q["cur"]),
            "target": int(q["max"]),
            "is_completed": bool(done),
            "reward_claimed": bool(claimed),
            "reward_gold": gold,
            "reward_diamonds": diamonds,
            "reward_xp": xp,
        })
    return {"week_key": week_key, "quests": quests}


# ─── Маршруты API ────────────────────────────────────────────────────────────

@app.post("/api/player")
async def get_player(body: InitDataHeader):
    tg_user = get_user_from_init_data(body.init_data)
    uid      = int(tg_user["id"])
    _rl_check(uid, "player", max_hits=20, window_sec=10)
    username = tg_user.get("username") or tg_user.get("first_name") or ""

    cached = _cache_get(uid)
    if cached is not None:
        return {"ok": True, "player": _player_api(cached), "cached": True}

    player = db.get_or_create_player(uid, username)
    inv = stamina_stats_invested(player.get("max_hp", PLAYER_START_MAX_HP), player.get("level", 1))
    # Используем данные уже загруженного игрока — экономим 1 лишний SELECT
    regen = db.apply_hp_regen_from_player(player, inv)
    if regen:
        player = dict(player)
        player["current_hp"] = regen["current_hp"]

    _cache_set(uid, player)
    return {"ok": True, "player": _player_api(player)}


@app.post("/api/battle/find")
async def find_battle(body: FindBattleBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid      = int(tg_user["id"])
    _rl_check(uid, "battle_find", max_hits=5, window_sec=15)
    username = tg_user.get("username") or ""

    player = db.get_or_create_player(uid, username)

    # Уже в бою?
    if battle_system.get_battle_status(uid):
        state = _battle_state_api(uid)
        return {"ok": True, "status": "already_in_battle", "battle": state}

    # HP check
    mhp = int(player.get("max_hp", PLAYER_START_MAX_HP))
    chp = int(player.get("current_hp", mhp))
    if chp < int(mhp * HP_MIN_BATTLE_PCT):
        inv = stamina_stats_invested(mhp, player.get("level", 1))
        mult = 1.0 + inv * HP_REGEN_ENDURANCE_BONUS
        hp_needed = int(mhp * HP_MIN_BATTLE_PCT) - chp
        secs = int(hp_needed / max(0.001, mhp / HP_REGEN_BASE_SECONDS * mult))
        return {"ok": False, "reason": "low_hp", "regen_seconds": secs, "current_hp": chp, "min_hp": int(mhp * HP_MIN_BATTLE_PCT)}

    # PvP поиск (если не prefer_bot)
    if not body.prefer_bot:
        pvp_entry = db.pvp_find_opponent(uid, int(player.get("level", PLAYER_START_LEVEL)))
        if pvp_entry:
            opp_uid = pvp_entry["user_id"]
            db.pvp_dequeue(opp_uid)
            opp_player = db.get_or_create_player(opp_uid, "")
            battle_id = await battle_system.start_battle(player, opp_player, is_bot2=False)
            b = battle_system.active_battles.get(battle_id)
            if b:
                b["_tma_p1"] = True  # маркер — запущен из TMA

            # Уведомить P2 по WebSocket
            await manager.send(opp_uid, {
                "event": "battle_started",
                "battle": _battle_state_api(opp_uid),
            })

            return {
                "ok": True,
                "status": "pvp_started",
                "battle": _battle_state_api(uid),
            }

        # Режим очереди: встаём ждать, не падаем на бота
        if body.queue_only:
            db.pvp_enqueue(uid, int(player.get("level", PLAYER_START_LEVEL)), chat_id=0, message_id=None)
            return {"ok": True, "status": "queued"}

    # Бот
    opponent = db.find_suitable_opponent(player["level"])
    if not opponent:
        return {"ok": False, "reason": "no_opponent"}

    completed = player.get("wins", 0) + player.get("losses", 0)
    if completed < 3:
        opponent = battle_system.apply_onboarding_bot(opponent)

    battle_id = await battle_system.start_battle(player, opponent, is_bot2=True)
    return {
        "ok": True,
        "status": "bot_started",
        "battle": _battle_state_api(uid),
    }


@app.post("/api/battle/choice")
async def battle_choice(body: BattleChoiceBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    _rl_check(uid, "battle_choice", max_hits=15, window_sec=10)

    ZONE_MAP = {
        "HEAD": "ГОЛОВА",
        "TORSO": "ТУЛОВИЩЕ",
        "LEGS": "НОГИ",
    }
    atk = ZONE_MAP.get(body.attack.upper(), "ТУЛОВИЩЕ")
    dfn = ZONE_MAP.get(body.defense.upper(), "ТУЛОВИЩЕ")

    result = await battle_system.make_choice(uid, atk, dfn)

    # Найти battle и оппонента
    bid = battle_system.battle_queue.get(uid)
    b   = battle_system.active_battles.get(bid) if bid else None
    is_pvp = b and not b.get("is_bot2") if b else False

    if result.get("status") == "round_completed":
        state_p1 = _battle_state_api(uid)
        await manager.send(uid, {"event": "round_result", "battle": state_p1, "result": result})
        if is_pvp and b:
            opp_uid = (b["player2"] if b["player1"]["user_id"] == uid else b["player1"]).get("user_id")
            if opp_uid:
                state_p2 = _battle_state_api(opp_uid)
                await manager.send(opp_uid, {"event": "round_result", "battle": state_p2, "result": result})
        return {"ok": True, "status": "round_completed", "battle": state_p1}

    if result.get("status") in ("battle_ended", "battle_ended_afk"):
        mine = _adapt_battle_result_for_user(result, uid)
        winner_id = mine.get("winner_id")
        human_won = bool(mine.get("human_won", winner_id == uid))
        is_afk    = result.get("status") == "battle_ended_afk"
        await manager.send(uid, {
            "event":     "battle_ended",
            "human_won": human_won,
            "afk_loss":  is_afk and not human_won,
            "mode": mine.get("mode", "normal"),
            "mode_meta": mine.get("mode_meta") or {},
            "titan_progress": mine.get("titan_progress"),
            "endless_progress": mine.get("endless_progress"),
            "result": {
                "gold":          mine.get("gold_reward", 0) if human_won else 0,
                "exp":           mine.get("exp_reward",  0),
                "damage":        mine.get("damage_to_opponent", 0),
                "level_up":      mine.get("level_up", False) if human_won else False,
                "rounds":        mine.get("rounds", 0),
                "rating_change": mine.get("rating_change", 0),
                "pvp_repeat_factor": mine.get("pvp_repeat_factor", 1.0),
            }
        })
        # Проверяем: возможно квест только что выполнился
        if human_won:
            try:
                qs = db.get_daily_quest_status(uid)
                if qs.get("is_completed") and not qs.get("reward_claimed"):
                    await manager.send(uid, {"event": "quest_complete"})
            except Exception:
                pass
        if is_pvp and b:
            opp_uid = (b["player2"] if b["player1"]["user_id"] == uid else b["player1"]).get("user_id")
            if opp_uid:
                opp = _adapt_battle_result_for_user(result, opp_uid)
                opp_won = bool(opp.get("human_won", winner_id == opp_uid))
                await manager.send(opp_uid, {
                    "event":     "battle_ended",
                    "human_won": opp_won,
                    "afk_loss":  is_afk and not opp_won,
                    "mode": opp.get("mode", "normal"),
                    "mode_meta": opp.get("mode_meta") or {},
                    "titan_progress": opp.get("titan_progress"),
                    "result": {
                        "gold":          opp.get("gold_reward", 0) if opp_won else 0,
                        "exp":           opp.get("exp_reward",  0),
                        "damage":        opp.get("damage_to_opponent", 0),
                        "level_up":      opp.get("level_up", False) if opp_won else False,
                        "rounds":        opp.get("rounds", 0),
                        "rating_change": opp.get("rating_change", 0),
                        "pvp_repeat_factor": opp.get("pvp_repeat_factor", 1.0),
                    }
                })
        return {
            "ok":        True,
            "status":    "battle_ended",
            "human_won": human_won,
            "afk_loss":  is_afk and not human_won,
            "mode": mine.get("mode", "normal"),
            "mode_meta": mine.get("mode_meta") or {},
            "titan_progress": mine.get("titan_progress"),
            "endless_progress": mine.get("endless_progress"),
            "result": {
                "gold":          mine.get("gold_reward", 0) if human_won else 0,
                "exp":           mine.get("exp_reward",  0),
                "damage":        mine.get("damage_to_opponent", 0),
                "level_up":      mine.get("level_up", False) if human_won else False,
                "rounds":        mine.get("rounds", 0),
                "streak_bonus":  mine.get("streak_bonus_gold", 0) if human_won else 0,
                "win_streak":    mine.get("win_streak", 0) if human_won else 0,
                "rating_change": mine.get("rating_change", 0),
                "pvp_repeat_factor": mine.get("pvp_repeat_factor", 1.0),
            },
        }

    if result.get("status") == "choice_made":
        return {"ok": True, "status": "waiting_opponent"}

    return {"ok": True, "status": result.get("status"), "result": result}


@app.post("/api/battle/queue")
async def join_queue(body: InitDataHeader):
    """Встать в PvP очередь."""
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    player  = db.get_or_create_player(uid, "")
    db.pvp_enqueue(uid, int(player.get("level", 1)), chat_id=0, message_id=None)
    return {"ok": True, "status": "queued"}


@app.post("/api/battle/cancel_queue")
async def cancel_queue(body: InitDataHeader):
    tg_user = get_user_from_init_data(body.init_data)
    uid     = int(tg_user["id"])
    db.pvp_dequeue(uid)
    return {"ok": True}


@app.post("/api/battle/challenge/send")
async def send_challenge(body: ChallengeSendBody):
    """Отправить персональный PvP-вызов по нику (@name)."""
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    _rl_check(uid, "challenge_send", max_hits=3, window_sec=30)
    my_username = tg_user.get("username") or tg_user.get("first_name") or f"User{uid}"
    me = db.get_or_create_player(uid, my_username)
    if battle_system.get_battle_status(uid):
        return {"ok": False, "reason": "already_in_battle"}

    mhp = int(me.get("max_hp", PLAYER_START_MAX_HP))
    chp = int(me.get("current_hp", mhp))
    min_hp = int(mhp * HP_MIN_BATTLE_PCT)
    if chp < min_hp:
        return {"ok": False, "reason": "low_hp"}

    candidates = db.search_players_by_username(body.nickname, limit=5)
    if not candidates:
        return {"ok": False, "reason": "target_not_found"}
    norm = (body.nickname or "").strip().lstrip("@").lower()
    exact = next((c for c in candidates if (c.get("username") or "").lower() == norm), None)
    target = exact or (candidates[0] if len(candidates) == 1 else None)
    if target is None:
        return {
            "ok": False,
            "reason": "multiple_candidates",
            "candidates": [
                {
                    "user_id": int(c["user_id"]),
                    "username": c.get("username") or f"User{c['user_id']}",
                    "level": int(c.get("level") or 1),
                    "rating": int(c.get("rating") or 1000),
                }
                for c in candidates
            ],
        }
    target_uid = int(target["user_id"])
    if target_uid == uid:
        return {"ok": False, "reason": "cannot_challenge_self"}
    if not manager.is_online(target_uid):
        return {"ok": False, "reason": "target_offline"}
    if battle_system.get_battle_status(target_uid):
        return {"ok": False, "reason": "target_busy"}

    target_mhp = int(target.get("max_hp", PLAYER_START_MAX_HP))
    target_chp = int(target.get("current_hp", target_mhp))
    if target_chp < int(target_mhp * HP_MIN_BATTLE_PCT):
        return {"ok": False, "reason": "target_low_hp"}

    ch = db.create_pvp_challenge(uid, target_uid, ttl_seconds=300)
    if not ch.get("ok"):
        return {"ok": False, "reason": ch.get("reason", "challenge_failed")}

    await manager.send(
        target_uid,
        {
            "event": "challenge_incoming",
            "challenge": {
                "id": ch["challenge_id"],
                "from_user_id": uid,
                "from_username": me.get("username") or my_username,
                "from_level": int(me.get("level", 1)),
                "from_rating": int(me.get("rating", 1000)),
                "expires_at": ch["expires_at"],
            },
        },
    )
    # Пуш в Telegram-чат (если есть chat_id), чтобы не пропустить вызов
    try:
        target_chat_id = db.get_player_chat_id(target_uid)
        if target_chat_id:
            chall_name = me.get("username") or my_username
            await _send_tg_message(
                int(target_chat_id),
                (
                    "⚔️ <b>Новый PvP-вызов</b>\n\n"
                    f"Игрок @{chall_name} бросил тебе вызов.\n"
                    "Открой мини-приложение и прими/отклони."
                ),
            )
    except Exception as e:
        logger.warning("challenge tg notify failed: %s", e)
    return {"ok": True, "status": "challenge_sent", "challenge_id": ch["challenge_id"], "expires_at": ch["expires_at"]}


@app.get("/api/battle/challenge/pending")
async def pending_challenge(init_data: str):
    """Входящий персональный вызов (если есть)."""
    tg_user = get_user_from_init_data(init_data)
    uid = int(tg_user["id"])
    row = db.get_incoming_pvp_challenge(uid)
    if not row:
        return {"ok": True, "pending": False}
    return {
        "ok": True,
        "pending": True,
        "challenge": {
            "id": int(row["id"]),
            "from_user_id": int(row["challenger_id"]),
            "from_username": row.get("challenger_username") or "Боец",
            "from_level": int(row.get("challenger_level") or 1),
            "from_rating": int(row.get("challenger_rating") or 1000),
            "expires_at": int(row.get("expires_at") or 0),
        },
    }


@app.get("/api/battle/challenge/outgoing")
async def outgoing_challenges(init_data: str):
    tg_user = get_user_from_init_data(init_data)
    uid = int(tg_user["id"])
    rows = db.get_outgoing_pvp_challenges(uid, limit=12)
    return {"ok": True, "challenges": rows}


@app.post("/api/battle/challenge/cancel")
async def cancel_challenge(body: ChallengeCancelBody):
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    ok = db.cancel_pvp_challenge(body.challenge_id, uid)
    return {"ok": bool(ok)}


@app.post("/api/battle/challenge/respond")
async def respond_challenge(body: ChallengeRespondBody):
    """Ответить на персональный вызов по нику: accept/decline."""
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    resp = db.respond_pvp_challenge(int(body.challenge_id), uid, bool(body.accept))
    if not resp:
        return {"ok": False, "reason": "challenge_not_found_or_expired"}

    challenger_id = int(resp["challenger_id"])
    target_id = int(resp["target_id"])
    if not body.accept:
        await manager.send(challenger_id, {"event": "challenge_declined", "by_user_id": target_id})
        return {"ok": True, "status": "declined"}

    if battle_system.get_battle_status(challenger_id) or battle_system.get_battle_status(target_id):
        return {"ok": False, "reason": "already_in_battle"}
    if not manager.is_online(challenger_id):
        return {"ok": False, "reason": "challenger_offline"}

    ch_player = db.get_or_create_player(challenger_id, "")
    tg_player = db.get_or_create_player(target_id, tg_user.get("username") or tg_user.get("first_name") or "")
    # Если кто-то в очереди — выходим из неё перед прямым матчем
    db.pvp_dequeue(challenger_id)
    db.pvp_dequeue(target_id)

    bid = await battle_system.start_battle(ch_player, tg_player, is_bot2=False)
    b = battle_system.active_battles.get(bid)
    if b:
        b["_tma_p1"] = True
    await manager.send(challenger_id, {"event": "battle_started", "battle": _battle_state_api(challenger_id)})
    return {"ok": True, "status": "accepted", "battle": _battle_state_api(target_id)}


@app.get("/api/battle/state")
async def battle_state(init_data: str):
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])
    state   = _battle_state_api(uid)
    if state:
        return {"ok": True, "active": True,  **state}
    return     {"ok": True, "active": False}


@app.get("/api/battle/last_result")
async def battle_last_result(init_data: str):
    """Последний результат завершённого боя (polling-fallback, корректная перспектива)."""
    tg_user = get_user_from_init_data(init_data)
    uid     = int(tg_user["id"])
    snap = battle_system.pop_battle_end_ui(uid)
    if not snap:
        player = db.get_or_create_player(uid, "")
        return {
            "ok": False,
            "reason": "no_recent_result",
            "player": _player_api(dict(player)),
        }
    mine = _adapt_battle_result_for_user(snap, uid)
    human_won = bool(mine.get("human_won", mine.get("winner_id") == uid))
    afk_loss = mine.get("status") == "battle_ended_afk" and not human_won
    _cache_invalidate(uid)  # Бой закончен — данные игрока изменились
    player = db.get_or_create_player(uid, "")
    return {
        "ok": True,
        "human_won": human_won,
        "afk_loss": afk_loss,
        "mode": mine.get("mode", "normal"),
        "mode_meta": mine.get("mode_meta") or {},
        "titan_progress": mine.get("titan_progress"),
        "result": {
            "gold": mine.get("gold_reward", 0) if human_won else 0,
            "exp": mine.get("exp_reward", 0),
            "level_up": mine.get("level_up", False) if human_won else False,
            "rounds": mine.get("rounds", 0),
            "streak_bonus": mine.get("streak_bonus_gold", 0) if human_won else 0,
            "win_streak": mine.get("win_streak", 0) if human_won else 0,
            "pvp_repeat_factor": mine.get("pvp_repeat_factor", 1.0),
        },
        "player": _player_api(dict(player)),
    }


@app.get("/api/pvp/top")
async def pvp_top(limit: int = 30):
    rows    = db.get_pvp_weekly_top(limit=min(100, max(5, int(limit))))
    elo_top = db.get_pvp_elo_top(limit=20)
    rewards = [
        {"rank": 1, "diamonds": 120, "title": "Легенда PvP"},
        {"rank": 2, "diamonds": 80, "title": "Мастер PvP"},
        {"rank": 3, "diamonds": 50, "title": "Герой арены"},
        {"rank": "4-10", "diamonds": 20, "title": "Участник топа"},
    ]
    return {"ok": True, "week_key": _iso_week_key(), "leaders": rows, "elo_top": elo_top, "rewards": rewards}


# ─── Рефералка ───────────────────────────────────────────────────────────────

# ─── Магазин ─────────────────────────────────────────────────────────────────

# Каталог товаров — единый источник истины для фронта и бэка
SHOP_CATALOG = {
    "hp_small":   {"name": "Малое зелье HP",     "price": 12,  "currency": "gold",     "icon": "🧪", "tab": "potions"},
    "hp_full":    {"name": "Большое зелье HP",    "price": 30,  "currency": "gold",     "icon": "⚗️", "tab": "potions"},
    "xp_boost":   {"name": "Буст XP ×1.5 (5боёв)","price": 100, "currency": "gold",    "icon": "💊", "tab": "potions"},
    "stat_reset": {"name": "Сброс статов",        "price": 50,  "currency": "diamonds", "icon": "🔄", "tab": "special"},
}


# ─── Монетизация: Stars + CryptoPay ─────────────────────────────────────────

# Пакеты алмазов за Telegram Stars (боевые цены)
STARS_PACKAGES = [
    {"id": "d100",    "diamonds": 100, "stars": 150, "label": "100 💎"},
    {"id": "d300",    "diamonds": 300, "stars": 390, "label": "300 💎"},
    {"id": "d500",    "diamonds": 500, "stars": 650, "label": "500 💎"},
    {"id": "premium", "diamonds": 0,   "stars": PREMIUM_SUBSCRIPTION_STARS, "label": "👑 Premium"},
]

ELITE_AVATAR_STARS_PACKAGE = {
    "id": "elite_avatar",
    "avatar_id": ELITE_AVATAR_ID,
    "label": "👑 Элитный образ",
    "stars": int(ELITE_AVATAR_STARS),
}

# Пакеты за криптовалюту (CryptoPay)
CRYPTO_PACKAGES = [
    {"id": "cd100",     "diamonds": 100, "label": "100 💎",          "usdt": "2.99"},
    {"id": "cd300",     "diamonds": 300, "label": "300 💎",          "usdt": "7.99"},
    {"id": "cd500",     "diamonds": 500, "label": "500 💎",          "usdt": "12.99"},
    {"id": "cdpremium", "diamonds": 0,   "label": "👑 Premium",      "usdt": "8.00", "premium": True},
    {
        "id": "cdfullreset",
        "diamonds": 0,
        "label": "🔄 Сброс прогресса",
        "hint": "Уровень и бои с нуля; золото, 💎, клан и рефералка сохраняются",
        "usdt": FULL_RESET_CRYPTO_USDT,
        "full_reset": True,
        "usdt_only": True,
    },
]
ELITE_AVATAR_CRYPTO_PACKAGE = {
    "id": "cd_elite_avatar",
    "avatar_id": ELITE_AVATAR_ID,
    "label": "👑 Элитный образ",
    "usdt": str(ELITE_AVATAR_USDT),
}

CRYPTOPAY_API_BASE = (
    "https://testnet-pay.crypt.bot/api" if CRYPTOPAY_TESTNET
    else "https://pay.crypt.bot/api"
)

# Роуты образов вынесены в отдельный модуль.
register_avatar_shop_routes(
    app,
    {
        "db": db,
        "get_user_from_init_data": get_user_from_init_data,
        "_player_api": _player_api,
        "_cache_invalidate": _cache_invalidate,
        "_rl_check": _rl_check,
        "ELITE_AVATAR_ID": ELITE_AVATAR_ID,
        "ELITE_AVATAR_STARS": ELITE_AVATAR_STARS,
        "ELITE_AVATAR_USDT": ELITE_AVATAR_USDT,
        "BOT_TOKEN": BOT_TOKEN,
        "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
        "CRYPTOPAY_API_BASE": CRYPTOPAY_API_BASE,
    },
)
register_shop_routes(
    app,
    {
        "db": db,
        "get_user_from_init_data": get_user_from_init_data,
        "_rl_check": _rl_check,
        "PREMIUM_SUBSCRIPTION_STARS": PREMIUM_SUBSCRIPTION_STARS,
        "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
        "SHOP_CATALOG": SHOP_CATALOG,
        "STARS_PACKAGES": STARS_PACKAGES,
        "CRYPTO_PACKAGES": CRYPTO_PACKAGES,
        "ELITE_AVATAR_STARS_PACKAGE": ELITE_AVATAR_STARS_PACKAGE,
        "ELITE_AVATAR_CRYPTO_PACKAGE": ELITE_AVATAR_CRYPTO_PACKAGE,
    },
)
register_payment_routes(
    app,
    {
        "db": db,
        "manager": manager,
        "get_user_from_init_data": get_user_from_init_data,
        "_player_api": _player_api,
        "_send_tg_message": _send_tg_message,
        "_notify_paid_full_reset": _notify_paid_full_reset,
        "_rl_check": _rl_check,
        "STARS_PACKAGES": STARS_PACKAGES,
        "CRYPTO_PACKAGES": CRYPTO_PACKAGES,
        "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
        "CRYPTOPAY_API_BASE": CRYPTOPAY_API_BASE,
        "BOT_TOKEN": BOT_TOKEN,
        "PREMIUM_XP_BONUS_PERCENT": PREMIUM_XP_BONUS_PERCENT,
    },
)
register_social_routes(
    app,
    {
        "db": db,
        "get_user_from_init_data": get_user_from_init_data,
        "_rl_check": _rl_check,
        "_send_tg_message": _send_tg_message,
        "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
        "CRYPTOPAY_API_BASE": CRYPTOPAY_API_BASE,
    },
)
register_progression_routes(
    app,
    {
        "db": db,
        "get_user_from_init_data": get_user_from_init_data,
        "_cache_invalidate": _cache_invalidate,
        "_weekly_quests_status": _weekly_quests_status,
    },
)
register_titan_training_routes(
    app,
    {
        "db": db,
        "get_user_from_init_data": get_user_from_init_data,
        "battle_system": battle_system,
        "_battle_state_api": _battle_state_api,
        "_titan_boss_for_floor": _titan_boss_for_floor,
        "_player_api": _player_api,
        "_cache_invalidate": _cache_invalidate,
        "_cache_set": _cache_set,
        "_rl_check": _rl_check,
        "stamina_stats_invested": stamina_stats_invested,
        "_iso_week_key": _iso_week_key,
        "PLAYER_START_MAX_HP": PLAYER_START_MAX_HP,
        "PLAYER_START_CRIT": PLAYER_START_CRIT,
        "HP_MIN_BATTLE_PCT": HP_MIN_BATTLE_PCT,
    },
)
register_endless_routes(
    app,
    {
        "db": db,
        "get_user_from_init_data": get_user_from_init_data,
        "_premium_fields": _premium_fields,
        "_iso_week_key": _iso_week_key,
        "_endless_bot_for_wave": _endless_bot_for_wave,
        "battle_system": battle_system,
        "_battle_state_api": _battle_state_api,
    },
)
register_system_realtime_routes(
    app,
    {
        "db": db,
        "manager": manager,
        "get_user_from_init_data": get_user_from_init_data,
        "_player_api": _player_api,
        "APP_BUILD_VERSION": APP_BUILD_VERSION,
        "GAME_VERSION": GAME_VERSION,
        "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
        "CRYPTOPAY_API_BASE": CRYPTOPAY_API_BASE,
    },
)


# Платежные маршруты вынесены в отдельный модуль.


# ─── Статика (webapp/) ───────────────────────────────────────────────────────

# ─── Keepalive (Render free tier) ───────────────────────────────────────────
# Render free tier засыпает через 15 мин без входящего HTTP-трафика.
# Пингуем собственный /api/health каждые 10 мин — сервис остаётся живым.

async def _run_weekly_leaderboard_payouts() -> None:
    """Автоначисление наград за прошлую неделю (PvP + Башня), уведомления в Telegram."""
    try:
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, db.process_weekly_leaderboard_payouts)
        for uid in res.get("invalidate_uids") or []:
            _cache_invalidate(int(uid))
        for msg in res.get("telegram") or []:
            cid = msg.get("chat_id")
            if cid:
                await _send_tg_message(int(cid), msg.get("text") or "")
        pp, tt = int(res.get("pvp_paid") or 0), int(res.get("titan_paid") or 0)
        if pp > 0 or tt > 0:
            logger.info(
                "weekly leaderboard payouts week=%s pvp_slots=%s titan_slots=%s",
                res.get("week_key"),
                pp,
                tt,
            )
    except Exception as exc:
        logger.warning("weekly leaderboard payouts failed: %s", exc)


async def _keepalive_loop(health_url: str) -> None:
    await asyncio.sleep(120)  # Даём сервису полностью стартовать
    while True:
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: urllib.request.urlopen(health_url, timeout=15),
            )
            logger.info("keepalive ping ok → %s", health_url)
        except Exception as exc:
            logger.debug("keepalive ping failed: %s", exc)
        _rl.cleanup()  # Чистим устаревшие ключи rate limiter
        await _run_weekly_leaderboard_payouts()
        await asyncio.sleep(600)  # Раз в 10 минут


@app.on_event("startup")
async def _start_keepalive() -> None:
    asyncio.create_task(_run_weekly_leaderboard_payouts())
    render_url = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
    if render_url:
        asyncio.create_task(_keepalive_loop(f"{render_url}/api/health"))
        logger.info("keepalive task started → %s/api/health (every 10 min)", render_url)


# ─── Статика (webapp/) ───────────────────────────────────────────────────────

webapp_dir = os.path.join(os.path.dirname(__file__), "webapp")

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def serve_index():
    """
    Отдаём index.html с принудительными no-cache заголовками.
    Файл уже пропатчен start_web_and_bot.sh: __BUILD_VERSION__ → реальный хэш коммита.
    """
    html_path = os.path.join(webapp_dir, "index.html")
    try:
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="index.html not found")
    no_cache = {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
    }
    return HTMLResponse(content=html, headers=no_cache)


if os.path.isdir(webapp_dir):
    app.mount("/", StaticFiles(directory=webapp_dir, html=True), name="webapp")
