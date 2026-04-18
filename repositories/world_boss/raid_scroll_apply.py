"""Применение рейд-свитка из инвентаря в слот активного рейда.

Cross-mixin логика: списывает 1 заряд из player_inventory + ставит в
world_boss_player_state.raid_scroll_1/2. Правила (docs/WORLD_BOSS.md):
- Свиток работает только в рейде (тут же списывается 1 шт.)
- Макс 2 активных слота; если оба заняты — отказ
- Дубликат одного и того же свитка в обоих слотах — отказ (смысла нет)
- slot=None → выберем первый свободный
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from .player_state import VALID_RAID_SCROLLS
from .damage_calc import RAID_SCROLL_EFFECTS

log = logging.getLogger(__name__)

# Гарантируем что каждый свиток из VALID_RAID_SCROLLS имеет эффект в damage_calc.
# Если кто-то добавит свиток в одно место и забудет про другое — упадёт при старте.
_missing = VALID_RAID_SCROLLS - set(RAID_SCROLL_EFFECTS)
assert not _missing, f"Нет эффектов для рейд-свитков: {_missing}. Добавь в RAID_SCROLL_EFFECTS."


class WorldBossRaidScrollApplyMixin:

    def wb_apply_raid_scroll(
        self,
        user_id: int,
        scroll_name: str,
        slot: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Применить свиток из инвентаря. Возвращает dict:
        {ok, reason?, slot, scroll_name, remaining?}.

        Не атомарен через один conn, но защищён через per-user-lock на API-уровне.
        """
        if scroll_name not in VALID_RAID_SCROLLS:
            return {"ok": False, "reason": "Неизвестный рейд-свиток"}

        active = self.get_wb_active_spawn()
        if not active:
            return {"ok": False, "reason": "Нет активного рейда"}
        spawn_id = int(active["spawn_id"])

        ps = self.get_wb_player_state(spawn_id, int(user_id))
        if not ps:
            return {"ok": False, "reason": "Вы не в рейде"}
        if int(ps.get("is_dead") or 0):
            return {"ok": False, "reason": "Нельзя применить свиток после смерти"}

        slot_1 = ps.get("raid_scroll_1")
        slot_2 = ps.get("raid_scroll_2")
        if scroll_name in (slot_1, slot_2):
            return {"ok": False, "reason": "Этот свиток уже активен"}

        chosen = self._wb_pick_slot(slot, slot_1, slot_2)
        if not chosen:
            return {"ok": False, "reason": "Оба слота заняты"}

        if not self.has_item(int(user_id), scroll_name):
            return {"ok": False, "reason": "Свиток не найден в инвентаре"}

        if not self.remove_from_inventory(int(user_id), scroll_name, quantity=1):
            return {"ok": False, "reason": "Не удалось списать заряд"}

        ok = self.wb_set_raid_scroll(spawn_id, int(user_id), chosen, scroll_name)
        if not ok:
            # Откат: вернуть свиток в инвентарь
            self.add_to_inventory(int(user_id), scroll_name, quantity=1,
                                  bump_unseen=False)
            return {"ok": False, "reason": "Не удалось установить в слот"}

        return {"ok": True, "slot": chosen, "scroll_name": scroll_name}

    @staticmethod
    def _wb_pick_slot(
        requested: Optional[int], slot_1: Optional[str], slot_2: Optional[str]
    ) -> Optional[int]:
        """Выбирает слот. requested=1|2 — именно этот, если свободен; None — авто."""
        if requested == 1:
            return 1 if not slot_1 else None
        if requested == 2:
            return 2 if not slot_2 else None
        if not slot_1:
            return 1
        if not slot_2:
            return 2
        return None
