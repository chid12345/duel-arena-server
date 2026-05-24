/* ============================================================
   PlusBadge — общий помощник отображения прокачки (+N) на карточках.
   Уровень хранится в State.itemPlus = {item_id: N} (грузится в /api/player).
   Бой УЖЕ учитывает +N (см. economy/upgrades_formulas.py:plus_stats_for) —
   здесь ВИЗУАЛ: показать значок +N и усиленные числа, чтобы игрок видел эффект.

   Формула 1:1 с сервером (economy/upgrades_formulas.py:plus_stats_for):
     целые статы +2%/уровень, проценты +0,8%/уровень, БЕЗ «минимум +1».
   Единый шаг для всех редкостей (баланс держится за счёт разной базы).
   ============================================================ */
(() => {
  'use strict';

  // Целые статы +2%/ур, проценты +0,8%/ур — единый шаг, без «минимум +1».
  const INT_STEP = 0.02;
  const INT_FIELDS = ['atk', 'crit', 'hp', 'str', 'agi', 'intu', 'dodge', 'regen', 'acc'];
  const PCT_STEP = 0.008;
  const PCT_FIELDS = ['def', 'pen', 'lifesteal', 'crit_resist', 'anti_dodge', 'silence', 'slow', 'gold', 'xp', 'regen_speed'];

  function level(itemId) {
    try {
      const n = parseInt((window.State && State.itemPlus || {})[itemId] || 0, 10);
      return n > 0 ? n : 0;
    } catch (_) { return 0; }
  }

  // Вернуть копию предмета с усиленными статами под его +N. Не мутирует оригинал.
  function boostItem(item) {
    if (!item || !item.id) return item;
    const n = level(item.id);
    if (n <= 0) return item;
    const intMult = 1 + INT_STEP * n;
    const pctMult = 1 + PCT_STEP * n;
    const out = Object.assign({}, item);
    for (const f of INT_FIELDS) {
      const v = out[f];
      if (typeof v === 'number' && v > 0) out[f] = Math.round(v * intMult);
    }
    for (const f of PCT_FIELDS) {
      const v = out[f];
      if (typeof v === 'number' && v > 0) out[f] = Math.round(v * pctMult);
    }
    return out;
  }

  // Золотой чип «+N». '' если предмет не прокачан.
  function badge(itemId) {
    const n = level(itemId);
    return n > 0 ? `<span class="plus-badge">+${n}</span>` : '';
  }

  function injectCSS() {
    if (document.getElementById('plus-badge-css')) return;
    const s = document.createElement('style');
    s.id = 'plus-badge-css';
    s.textContent =
      '.plus-badge{display:inline-block;padding:1px 7px;border-radius:7px;' +
      'background:linear-gradient(135deg,#ffd55a,#ff9d2f);color:#3a2400;' +
      'font-size:11px;font-weight:900;letter-spacing:.3px;vertical-align:middle;' +
      'box-shadow:0 0 8px rgba(255,180,60,.55)}';
    document.head.appendChild(s);
  }
  try { injectCSS(); } catch (_) {}

  window.PlusBadge = { level, badge, boostItem, injectCSS };
})();
