"""Справочник классов (free/gold/diamonds/usdt)."""

from __future__ import annotations

from typing import Dict, List, Optional

from config import DIAMONDS_CLASSES, FREE_CLASSES, GOLD_CLASSES, MYTHIC_CLASSES, USDT_CLASS_BASE


class InventoryClassCatalogMixin:
    def get_class_info(self, class_id: str) -> Optional[Dict]:
        """Получить информацию о классе по ID."""
        if class_id in FREE_CLASSES:
            return {**FREE_CLASSES[class_id], "class_id": class_id, "class_type": "free"}
        if class_id in GOLD_CLASSES:
            return {**GOLD_CLASSES[class_id], "class_id": class_id, "class_type": "gold"}
        if class_id in DIAMONDS_CLASSES:
            return {**DIAMONDS_CLASSES[class_id], "class_id": class_id, "class_type": "diamonds"}
        if class_id in MYTHIC_CLASSES:
            return {**MYTHIC_CLASSES[class_id], "class_id": class_id, "class_type": "mythic"}
        if class_id.startswith("usdt_custom_"):
            return {**USDT_CLASS_BASE, "class_id": class_id, "class_type": "usdt"}
        return None

    def get_all_classes(self) -> Dict[str, List[Dict]]:
        """Получить все доступные классы сгруппированные по типу."""
        return {
            "free": [{**info, "class_id": cid, "class_type": "free"} for cid, info in FREE_CLASSES.items()],
            "gold": [{**info, "class_id": cid, "class_type": "gold"} for cid, info in GOLD_CLASSES.items()],
            "diamonds": [{**info, "class_id": cid, "class_type": "diamonds"} for cid, info in DIAMONDS_CLASSES.items()],
            "mythic": [{**info, "class_id": cid, "class_type": "mythic"} for cid, info in MYTHIC_CLASSES.items()],
        }
