/* ============================================================
   PlusBadge — общий помощник отображения прокачки (+N) на карточках.
   Уровень хранится в State.itemPlus = {item_id: N} (грузится в /api/player).
   Бой УЖЕ учитывает +N (см. economy/upgrades_formulas.py:plus_stats_for) —
   здесь ВИЗУАЛ: показать значок +N и усиленные числа, чтобы игрок видел эффект.

   Сила прокачки растёт по редкости (мягкий P2W) — синхронно с
   config/balance_curve.json → upgrades.stat_step_pct_per_tier:
     обычная +10% / редкая +16% / эпическая +22% / мифическая +30% за уровень.
   Целочисленные статы — минимум +1 за уровень (как на сервере).
   ============================================================ */
(() => {
  'use strict';

  // % за уровень по редкости (T1..T4 = common/rare/epic/mythic). Fallback 8%.
  const STEP_BY_RARITY = { common: 0.10, rare: 0.16, epic: 0.22, mythic: 0.30 };
  // Целочисленные статы — минимум +1 за уровень.
  const INT_FIELDS = ['atk', 'crit', 'hp', 'str', 'agi', 'intu', 'dodge', 'regen', 'acc'];
  // Процентные статы — чисто мультипликативно (на карточке показываются как целые %).
  const PCT_FIELDS = ['def', 'pen', 'lifesteal', 'crit_resist', 'anti_dodge', 'silence', 'slow', 'gold', 'xp'];

  function level(itemId) {
    try {
      const n = parseInt((window.State && State.itemPlus || {})[itemId] || 0, 10);
      return n > 0 ? n : 0;
    } catch (_) { return 0; }
  }

  function stepFor(rarity) {
    return STEP_BY_RARITY[rarity] || 0.08;
  }

  // Вернуть копию предмета с усиленными статами под его +N. Не мутирует оригинал.
  // rarity берём из item.r (как в карточках) или item.rarity.
  function boostItem(item) {
    if (!item || !item.id) return item;
    const n = level(item.id);
    if (n <= 0) return item;
    const mult = 1 + stepFor(item.r || item.rarity) * n;
    const out = Object.assign({}, item);
    for (const f of INT_FIELDS) {
      const v = out[f];
      if (typeof v === 'number' && v > 0) out[f] = Math.max(Math.round(v * mult), Math.round(v) + n);
    }
    for (const f of PCT_FIELDS) {
      const v = out[f];
      if (typeof v === 'number' && v > 0) out[f] = Math.round(v * mult);
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
