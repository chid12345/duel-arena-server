"""
api/admin_balance.py — endpoints админ-панели балансной сетки.

Маршруты:
  GET  /api/admin/balance/config  — текущий economy.json + shop_tags
  POST /api/admin/balance/config  — обновить anchor/price_factor/reward_grid
  GET  /api/admin/balance/audit   — отчёт расхождений (JSON)

Защита: только telegram_id из ADMIN_USER_IDS.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from api.tma_auth import get_user_from_init_data
from config.battle_constants import ADMIN_USER_IDS
from economy import load_economy
from economy.loader import economy_source_path

logger = logging.getLogger(__name__)


def _admin_token() -> str:
    """Постоянный токен для прямого доступа к админ-панели из браузера (без Telegram).
    Задаётся в env ADMIN_BALANCE_TOKEN. Если пусто — браузерный режим выключен."""
    return (os.getenv("ADMIN_BALANCE_TOKEN") or "").strip()


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _shop_tags_path() -> Path:
    return _project_root() / "config" / "shop_tags.json"


def _check_admin(init_data: str = "", token: str = "") -> int:
    """Авторизация: либо Telegram initData (uid в ADMIN_USER_IDS), либо токен из env.
    Возвращает uid (0 если по токену). Иначе HTTPException."""
    if token:
        expected = _admin_token()
        if not expected:
            raise HTTPException(status_code=503, detail="ADMIN_BALANCE_TOKEN не задан в env")
        if token != expected:
            raise HTTPException(status_code=403, detail="Неверный токен")
        return 0  # uid=0 для токена (не привязан к конкретному игроку)
    if init_data:
        user = get_user_from_init_data(init_data)
        uid = int(user["id"])
        if not ADMIN_USER_IDS:
            raise HTTPException(status_code=503, detail="ADMIN_USER_IDS не настроен в env")
        if uid not in ADMIN_USER_IDS:
            raise HTTPException(status_code=403, detail="Доступ запрещён (не админ)")
        return uid
    raise HTTPException(status_code=401, detail="Нужен init_data или token")


class ConfigQuery(BaseModel):
    init_data: str = ""
    token: str = ""


class ConfigUpdate(BaseModel):
    init_data: str = ""
    token: str = ""
    anchor: dict | None = None
    price_factor: dict | None = None
    reward_grid: dict | None = None
    rarity_mult: dict | None = None
    tier_mult: dict | None = None


_ALLOWED_ANCHOR_KEYS = {
    "PU_TO_GOLD", "GOLD_TO_DIAMOND", "STAR_TO_DIAMOND", "USDT_TO_DIAMOND",
    "PVP_WIN_GOLD", "PVP_DEFEAT_GOLD", "DAILY_BONUS_GOLD",
    "PREMIUM_GOLD_BUFF", "PREMIUM_XP_BUFF", "PREMIUM_DROP_BUFF",
    "BOX_EV_RATIO", "BOX_JACKPOT_BUDGET",
}


def _validate_update(payload: ConfigUpdate, current: dict) -> dict:
    """Безопасное применение правок поверх текущего economy.json. Возвращает новый dict."""
    new_data = json.loads(json.dumps(current))  # deep copy без import
    if payload.anchor:
        for k, v in payload.anchor.items():
            if k not in _ALLOWED_ANCHOR_KEYS:
                raise HTTPException(status_code=400, detail=f"Неизвестный ключ anchor: {k}")
            if not isinstance(v, (int, float)) or v < 0:
                raise HTTPException(status_code=400, detail=f"anchor/{k}: ожидалось число ≥0")
            new_data["anchor"][k] = float(v)
    if payload.price_factor:
        for k in ("gold", "diamond", "star", "usdt"):
            if k in payload.price_factor:
                v = payload.price_factor[k]
                if not isinstance(v, (int, float)) or v < 0:
                    raise HTTPException(status_code=400, detail=f"price_factor/{k}")
                new_data.setdefault("price_factor", {})[k] = float(v)
    if payload.rarity_mult:
        for k in ("common", "rare", "epic", "legendary"):
            if k in payload.rarity_mult:
                new_data["rarity_mult"][k] = float(payload.rarity_mult[k])
    if payload.tier_mult:
        for k in ("T1", "T2", "T3", "T4"):
            if k in payload.tier_mult:
                new_data["tier_mult"][k] = float(payload.tier_mult[k])
    if payload.reward_grid:
        for freq in ("daily", "weekly", "once"):
            if freq in payload.reward_grid:
                cells = payload.reward_grid[freq]
                for diff in ("easy", "medium", "hard", "epic"):
                    if diff in cells:
                        gd = cells[diff]
                        if not isinstance(gd, list) or len(gd) != 2:
                            raise HTTPException(status_code=400, detail=f"reward_grid/{freq}/{diff}")
                        new_data["reward_grid"][freq][diff] = [int(gd[0]), int(gd[1])]
    return new_data


def _save_economy(new_data: dict) -> None:
    path = economy_source_path()
    with path.open("w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
    # Сбросить кэш в loader, чтобы следующая загрузка прочла свежий файл
    from economy import loader as _loader
    _loader._CACHED = None


def register_admin_balance_routes(app: FastAPI) -> None:
    @app.post("/api/admin/balance/config", tags=["admin"])
    def get_config(body: ConfigQuery):
        _check_admin(body.init_data, body.token)
        eco = load_economy(force=True)
        try:
            with _shop_tags_path().open("r", encoding="utf-8") as f:
                tags = json.load(f)
        except Exception:
            tags = {}
        return {"ok": True, "economy": eco, "shop_tags": tags}

    @app.post("/api/admin/balance/save", tags=["admin"])
    def save_config(body: ConfigUpdate):
        uid = _check_admin(body.init_data, body.token)
        current = load_economy(force=True)
        new_data = _validate_update(body, current)
        _save_economy(new_data)
        logger.info("admin_balance: economy.json обновлён uid=%s", uid)
        return {"ok": True, "version": new_data.get("version", 1)}

    @app.post("/api/admin/balance/audit", tags=["admin"])
    def get_audit(body: ConfigQuery):
        _check_admin(body.init_data, body.token)
        return _build_audit_payload()


def _build_audit_payload() -> dict:
    """Собрать JSON-отчёт для админ-панели (вместо текста stdout)."""
    from reward_calculator import REWARD_TABLE
    from economy import reward_for_task, price_for_item, gold_to_diamond
    from api.tma_catalogs import SHOP_CATALOG

    quests = []
    for (freq, diff), tup in sorted(REWARD_TABLE.items()):
        cg, cd = tup[0], tup[1]
        fg, fd = reward_for_task(diff, freq)
        quests.append({
            "freq": freq, "diff": diff,
            "current": {"gold": cg, "diamond": cd},
            "formula": {"gold": fg, "diamond": fd},
        })

    try:
        with _shop_tags_path().open("r", encoding="utf-8") as f:
            tags = json.load(f).get("items", {})
    except Exception:
        tags = {}

    shop = []
    for item_id, item in sorted(SHOP_CATALOG.items()):
        price = item.get("price", 0)
        curr = item.get("currency", "gold")
        tag = tags.get(item_id)
        if price == 0 or tag is None:
            continue
        f_curr = "diamond" if curr == "diamonds" else curr
        formula_price = price_for_item(tag["power"], tag["rarity"], tag["tier"], currency=f_curr)
        shop.append({
            "id": item_id,
            "name": item.get("name"),
            "currency": curr,
            "current_price": price,
            "formula_price": formula_price,
            "rarity": tag["rarity"],
            "tier": tag["tier"],
            "power": tag["power"],
            "tab": item.get("tab"),
        })

    return {"ok": True, "quests": quests, "shop": shop}
