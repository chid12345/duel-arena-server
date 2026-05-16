"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.46"
VERSION_LABEL = "v2.21.46 — Унификация armor шаг 5/6: клиент. КЛЮЧЕВАЯ ФИЧА — кнопка «Арендовать» на мифик-карточках брони (RentalPay.buildButton с правильным item_id через armorItemIdFromLegacy маппер). Аренда мифик-брони теперь работает end-to-end через тот же /api/rental/*, что для 5 других слотов. Изменения клиента: equipment_slots_html.js _slotInfo упрощён — armor больше не отдельная ветка с State.wardrobeEquipped, читает из eq.armor.texture_key или getArmorTextureKey(item_id). game_globals.js: убраны State.wardrobeEquipped + setWardrobeEquipped, одноразовая очистка localStorage.da_wardrobe_eq, расширен _ARMOR_TEXTURE_MAP (поддержка и legacy class_id, и новых item_id), новый helper armorItemIdFromLegacy. wardrobe_html_actions.js: убраны вызовы setWardrobeEquipped, добавлен handler 'buy_rental' через RentalPay.rent, _attachEvents находит item по обоим ID (class_id и item_id). wardrobe_html_overlay.js: на мифик-карточках добавлена кнопка аренды. scene_menu_lazy_assets.js: убрана ветка wardrobeEquipped, использует eq.armor.texture_key. ПОБОЧНЫЙ ФИКС: _inventory_schema_ensured переведён с class-level на per-instance (старый pre-existing баг с pytest TestDB instances). Прогон 280/280 (исключая pre-existing flaky test_wb_hits_today_count). version.py 2.21.45→2.21.46, GAME_VERSION 16.96→16.97."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.97"
