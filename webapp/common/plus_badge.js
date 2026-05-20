/* ============================================================
   PlusBadge — общий помощник отображения прокачки (+N) на карточках.
   Уровень хранится в State.itemPlus = {item_id: N} (грузится в /api/player).
   Бой УЖЕ учитывает +N (stat × (1 + 0.08 × N), см. economy/upgrades_formulas.py);
   этот модуль — только ВИЗУАЛ, чтобы игрок видел, что прокачка работает.
   ============================================================ */
(() => {
  'use strict';
  const STEP = 0.08; // +8% за уровень — синхронно с upgrades_formulas.stat_step_pct

  function level(itemId) {
    try {
      const n = parseInt((window.State && State.itemPlus || {})[itemId] || 0, 10);
      return n > 0 ? n : 0;
    } catch (_) { return 0; }
  }

  // Усилить целочисленный стат на N уровней (как plus_stats_for: round(val×mult)).
  function boost(val, itemIdOrN) {
    const v = Number(val) || 0;
    const n = typeof itemIdOrN === 'number' ? itemIdOrN : level(itemIdOrN);
    if (!n || v <= 0) return v;
    return Math.round(v * (1 + STEP * n));
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

  window.PlusBadge = { level, boost, badge, injectCSS };
})();
