/* ============================================================
   BoxRevealHelpers — таблицы редкости предметов + classify helpers.
   Используется BoxRevealCard (и любым другим UI, которому нужна
   «редкость» дропа по item_id) для покраски строк ОБЫЧНОЕ/РЕДКОЕ/
   ЭПИЧЕСКОЕ/ЛЕГЕНДАРНОЕ и срабатывания «удача»-плашки.

   Тиры предметов привязаны к валюте магазина (см. shop_loot_box.py):
   • common    — gold-свитки (_3, _100, armor_6, vampire_g, combo *)
   • rare      — diamond-свитки (_6, _200, armor_10, dodge_5, bastion,
                 predator, berserker, accuracy, vampire_d, all_4),
                 алмазные ящики и бонус-дроп _diamonds
   • epic      — USDT-свитки (_12, _500, all_12), эпические ящики,
                 бонус-дроп _usdt
   • legendary — Титан, Premium-ящик, бонус-дроп _premium
   ============================================================ */
(() => {

const LEG = new Set(['_premium', 'scroll_titan', 'prem_box']);

const EPI = new Set([
  '_usdt',
  'scroll_str_12', 'scroll_end_12', 'scroll_stam_12', 'scroll_crit_12',
  'scroll_hp_500', 'scroll_all_12',
  'box_epic_e2', 'box_epic_e3',
]);

const RAR = new Set([
  '_diamonds',
  'scroll_str_6', 'scroll_end_6', 'scroll_crit_6',
  'scroll_dodge_5', 'scroll_armor_10', 'scroll_hp_200',
  'scroll_double_10', 'scroll_bastion', 'scroll_predator', 'scroll_berserker',
  'scroll_accuracy', 'scroll_vampire_d', 'scroll_all_4',
  'box_rare', 'box_rare_c', 'wb_diamond_chest',
]);

const BTIER = {
  box_common: 0, wb_gold_chest: 0,
  box_rare: 1, box_rare_c: 1, wb_diamond_chest: 1,
  box_epic_e2: 2, box_epic_e3: 2, prem_box: 2,
};

const RT = { common: 0, rare: 1, epic: 2, legendary: 3 };

function rar(id) {
  if (!id) return 'common';
  if (LEG.has(id)) return 'legendary';
  if (EPI.has(id)) return 'epic';
  if (RAR.has(id)) return 'rare';
  return 'common';
}

/** "Удача": бонус-дроп (_diamonds/_premium/_usdt) или редкость дропа
 *  выше тира ящика (gold → diamond+, diamond → USDT+, и т.д.). */
function luck(id, bid) {
  if (!id) return false;
  if (String(id).startsWith('_')) return true;
  const bt = BTIER[bid];
  return bt != null && (RT[rar(id)] || 0) > bt;
}

window.BoxRevealHelpers = { rar, luck };
})();
