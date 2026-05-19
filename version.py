"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.93"
VERSION_LABEL = "v2.21.68 — полный снос legacy class-системы. Удалено: (1) таблица user_inventory целиком (migration part11 DROP), (2) функции purchase_class / switch_class / unequip_class / has_class / get_user_inventory / get_equipped_class / get_class_info / get_all_classes / get_class_bonuses / get_available_classes_for_user / get_free_class_choice / create_usdt_class / reset_usdt_slot_stats / train_usdt_stat / untrain_usdt_stat / apply_usdt_stats / set_usdt_passive / get_equipped_usdt_passive / save_usdt_stats / get_reset_stats_cost / _apply_stat_delta_to_player / _usdt_stat_vector / _mirror_armor_to_unified_tables / _remove_legacy_avatar_bonus_with_cursor, (3) файлы repositories/inventory/{catalog,crud,switch,legacy_avatar,usdt,usdt_train,usdt_apply_passive}.py, (4) handlers/ui_helpers/{wardrobe_menus,wardrobe_actions}.py, (5) handlers/misc_callbacks/wardrobe_callbacks.py + регистрации в dispatch.py (теперь legacy callback'и возвращают подсказку «Гардероб в Mini-app»), (6) api/wardrobe_routes/core_routes.py (legacy /api/wardrobe), (7) webapp/{wardrobe_html_actions,scene_wardrobe_overlay,scene_wardrobe_overlay_ext,scene_wardrobe_detail,scene_wardrobe_detail_ext,scene_wardrobe_detail_ext2}.js + wardrobe_variants.html. Переписано: USDT-кастомка (armor_mythic4 +19 свободных статов) живёт в armor_custom_mods (новые методы create_legendary_armor / train_legendary_stat / set_legendary_passive / apply_legendary_stats / reset_legendary). Новый webapp/legendary_armor_overlay.js — простой UI распределения статов. Bot Telegram «Гардероб» команды удалены — броня покупается/настраивается ТОЛЬКО через mini-app. players.current_class и current_class_type оставлены как кэш для battle-перков (auto-sync через equip_item('armor')). Пройдено: 313 тестов, smoke-импорт OK."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.44"
