/* ============================================================
   BoxDetailRows — строки «что внутри ящика» с редкостями.
   Используется в popup-карточке рюкзака (stats_html_items) —
   чтобы выглядела как красивая карточка магазина с описанием
   шансов выпадения. Источник правды о шансах — shop_loot_box.py.

   API: window.BoxDetailRows.html(itemId) → HTML строк или ''
   ============================================================ */
(() => {

// rarity: c=common, r=rare(diamond), e=epic(USDT), l=legendary
const ROWS = {
  box_common: [
    ['📜', '2–4 золотых свитка',  'гарантировано', 'c'],
    ['💎', 'Алмазный свиток',     '5% шанс',       'r'],
    ['💎', '+10–20 алмазов',      '3% шанс',       'r'],
  ],
  box_rare: [
    ['💎', 'Алмазных свитков × 3–6', 'гарантировано', 'c'],
    ['📜', 'USDT-свиток',            '5% шанс',       'e'],
    ['💎', '+100 алмазов',           '3% шанс',       'r'],
    ['👑', 'Premium 3 дня',          '5% шанс',       'l'],
  ],
  box_rare_c: [
    ['💎', '×2 алмазных свитка (гарант.)', 'гарантировано', 'c'],
    ['💎', '×0–4 алмазных свитка',         'бонус',         'c'],
    ['📜', 'USDT-свиток',                  '5% шанс',       'e'],
    ['💎', '+200 алмазов',                 '5% шанс',       'r'],
    ['👑', 'Premium 3 дня',                '5% шанс',       'l'],
  ],
  box_epic_e2: [
    ['📜',  'USDT-свиток',         'гарантировано', 'e'],
    ['💎',  '2–4 алмазных свитка', 'гарантировано', 'c'],
    ['🏔️', 'Свиток Титана',       '20% шанс',      'l'],
    ['👑',  'Premium 7 дней',      '8% шанс',       'l'],
    ['💎',  '+100 алмазов',        '3% шанс',       'r'],
  ],
  box_epic_e3: [
    ['📜',  'USDT-свиток',       'гарантировано', 'e'],
    ['🚀',  'XP Буст ×2',        'гарантировано', 'c'],
    ['💎',  '1 алмазный свиток', 'гарантировано', 'c'],
    ['📜',  '1 золотой свиток',  'гарантировано', 'c'],
    ['🏔️', 'Свиток Титана',     '10% шанс',      'l'],
    ['👑',  'Premium 3 дня',     '5% шанс',       'l'],
  ],
};

const CSS = `
.bdr-wrap{display:flex;flex-direction:column;gap:5px;margin:6px 0 12px}
.bdr-r{padding:6px 9px;border-radius:8px;background:rgba(0,240,255,.05);border:1px solid rgba(0,240,255,.18);display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:center}
.bdr-ic{font-size:14px;text-align:center;line-height:1}
.bdr-tx{font-size:10.5px;color:#c8d8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.bdr-v{font-size:9px;font-weight:800;padding:2px 7px;border-radius:5px;letter-spacing:.3px;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.bdr-v.c{background:rgba(0,255,150,.12);color:#7affc0;border:1px solid rgba(0,255,150,.3)}
.bdr-v.r{background:rgba(0,200,255,.12);color:#5fcfff;border:1px solid rgba(0,200,255,.3)}
.bdr-v.e{background:rgba(180,79,255,.14);color:#cc88ff;border:1px solid rgba(180,79,255,.35)}
.bdr-v.l{background:rgba(255,180,30,.14);color:#ffcc66;border:1px solid rgba(255,180,30,.4)}
`;

function _injectCSS() {
  if (document.getElementById('bdr-css')) return;
  const s = document.createElement('style'); s.id = 'bdr-css';
  s.textContent = CSS; document.head.appendChild(s);
}

const _esc = s => String(s ?? '').replace(/[&<>"']/g,c=>(
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

window.BoxDetailRows = {
  /** HTML строк «что внутри» для box_*, или '' если нет данных. */
  html(itemId) {
    const rows = ROWS[itemId];
    if (!rows) return '';
    _injectCSS();
    const html = rows.map(([ic, tx, vl, vc]) =>
      `<div class="bdr-r"><span class="bdr-ic">${ic}</span><span class="bdr-tx">${_esc(tx)}</span><span class="bdr-v ${vc}">${_esc(vl)}</span></div>`
    ).join('');
    return `<div class="bdr-wrap">${html}</div>`;
  },
};
})();
