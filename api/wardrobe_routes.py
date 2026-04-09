from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class InitDataHeader(BaseModel):
    init_data: str


class WardrobeBuyBody(BaseModel):
    init_data: str
    class_id: str


class WardrobeEquipBody(BaseModel):
    init_data: str
    class_id: str


class USDTBody(BaseModel):
    init_data: str
    class_id: str


class USDTNameBody(BaseModel):
    init_data: str
    class_id: str
    custom_name: str


def register_wardrobe_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()

    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    _cache_invalidate = ctx["_cache_invalidate"]
    _rl_check = ctx["_rl_check"]
    
    # Конфигурация классов
    FREE_CLASSES = ctx["FREE_CLASSES"]
    GOLD_CLASSES = ctx["GOLD_CLASSES"]
    DIAMONDS_CLASSES = ctx["DIAMONDS_CLASSES"]
    USDT_CLASS_BASE = ctx["USDT_CLASS_BASE"]
    RESET_STATS_COST_DIAMONDS = ctx["RESET_STATS_COST_DIAMONDS"]
    RESET_STATS_COST_DIAMONDS_USDT = ctx["RESET_STATS_COST_DIAMONDS_USDT"]

    @router.get("/api/wardrobe")
    async def wardrobe(init_data: str):
        """Получить всю информацию о гардеробе пользователя."""
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            username = tg_user.get("username") or tg_user.get("first_name") or ""
            db.get_or_create_player(uid, username)
            
            # Доступные классы с отметкой о владении
            available_classes = db.get_available_classes_for_user(uid)
            
            # Текущий экипированный класс
            equipped_class = db.get_equipped_class(uid)
            
            # Весь инвентарь
            inventory = db.get_user_inventory(uid)
            
            # USDT-образы
            usdt_items = [item for item in inventory if item["class_type"] == "usdt"]
            
            # Стоимость сброса статов
            reset_cost = db.get_reset_stats_cost(uid)
            
            return {
                "ok": True,
                "available_classes": available_classes,
                "equipped_class": equipped_class,
                "inventory": inventory,
                "usdt_items": usdt_items,
                "reset_cost_diamonds": reset_cost,
                "config": {
                    "free_classes": FREE_CLASSES,
                    "gold_classes": GOLD_CLASSES,
                    "diamonds_classes": DIAMONDS_CLASSES,
                    "usdt_base": USDT_CLASS_BASE,
                }
            }
        except Exception as e:
            logger.error("wardrobe load failed: %s", e, exc_info=True)
            return {"ok": False, "reason": f"wardrobe_error: {str(e)[:120]}"}

    @router.post("/api/wardrobe/buy")
    async def wardrobe_buy(body: WardrobeBuyBody):
        """Купить класс."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        
        success, message = db.purchase_class(uid, body.class_id.strip())
        
        result = {"ok": success, "message": message}
        if success:
            _cache_invalidate(uid)
            # Обновляем данные игрока
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
            # Возвращаем обновлённый гардероб
            result.update(await wardrobe(body.init_data))
        
        return result

    @router.post("/api/wardrobe/equip")
    async def wardrobe_equip(body: WardrobeEquipBody):
        """Переключиться на другой класс."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        
        success, message = db.switch_class(uid, body.class_id.strip())
        
        result = {"ok": success, "message": message}
        if success:
            _cache_invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
            result.update(await wardrobe(body.init_data))
        
        return result

    @router.post("/api/wardrobe/unequip")
    async def wardrobe_unequip(body: InitDataHeader):
        """Снять текущий образ/класс (играть без образа)."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)

        success, message = db.unequip_class(uid)
        result = {"ok": bool(success), "message": message}
        if success:
            _cache_invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
            result.update(await wardrobe(body.init_data))
        return result

    @router.post("/api/wardrobe/resync")
    async def wardrobe_resync(body: InitDataHeader):
        """Починить статы, если они стали некорректными (например ловкость=1 после смены образов)."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)

        success, message = db.resync_player_stats(uid)
        result = {"ok": bool(success), "message": message}
        if success:
            _cache_invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
            result.update(await wardrobe(body.init_data))
        return result

    @router.post("/api/wardrobe/usdt/create")
    async def wardrobe_usdt_create(body: InitDataHeader):
        """Создать новый USDT-образ (демо-версия без платежа)."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        
        success, message, new_class_id = db.create_usdt_class(uid)
        
        result = {"ok": success, "message": message, "new_class_id": new_class_id}
        if success:
            _cache_invalidate(uid)
            result.update(await wardrobe(body.init_data))
        
        return result

    @router.post("/api/wardrobe/usdt/save")
    async def wardrobe_usdt_save(body: USDTBody):
        """Сохранить текущие статы в USDT-образ."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        
        success, message = db.save_usdt_stats(uid, body.class_id.strip())
        
        result = {"ok": success, "message": message}
        if success:
            result.update(await wardrobe(body.init_data))
        
        return result

    @router.post("/api/wardrobe/usdt/rename")
    async def wardrobe_usdt_rename(body: USDTNameBody):
        """Переименовать USDT-образ."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        
        # Проверяем, что USDT-образ принадлежит пользователю
        inventory = db.get_user_inventory(uid)
        usdt_item = next((item for item in inventory if item["class_id"] == body.class_id), None)
        
        if not usdt_item or usdt_item["class_type"] != "usdt":
            return {"ok": False, "message": "USDT-образ не найден"}
        
        # Обновляем кастомное имя
        conn = db.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE user_inventory SET custom_name = ? WHERE user_id = ? AND class_id = ?",
                (body.custom_name.strip()[:50], uid, body.class_id)
            )
            conn.commit()
            result = {"ok": True, "message": "Название обновлено"}
            result.update(await wardrobe(body.init_data))
            return result
        except Exception as e:
            conn.rollback()
            logger.error("usdt rename failed: %s", e)
            return {"ok": False, "message": f"Ошибка: {str(e)}"}
        finally:
            conn.close()

    @router.get("/api/wardrobe/reset-cost")
    async def wardrobe_reset_cost(init_data: str):
        """Получить стоимость сброса статов (со скидкой для USDT)."""
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        
        cost = db.get_reset_stats_cost(uid)
        has_usdt = any(item["class_type"] == "usdt" for item in db.get_user_inventory(uid))
        
        return {
            "ok": True,
            "cost_diamonds": cost,
            "has_usdt_discount": has_usdt,
            "regular_cost": RESET_STATS_COST_DIAMONDS,
            "discounted_cost": RESET_STATS_COST_DIAMONDS_USDT,
        }

    # Регистрируем роутер
    app.include_router(router)