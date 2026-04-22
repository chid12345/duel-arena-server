/* ============================================================
   DetailCompare — блок сравнения характеристик (надетое → новое)
   Используется во всех *_html_detail.js.
   ============================================================ */
(() => {

const CSS = `
.wnd-cmp{margin-top:6px;padding:7px 10px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}
.wnd-cmp-title{font-size:9px;color:rgba(200,205,230,.55);letter-spacing:1.1px;text-transform:uppercase;margin-bottom:4px;font-weight:700}
.wnd-cmp-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;line-height:1.55}
.wnd-cmp-l{color:rgba(230,232,245,.6)}
.wnd-cmp-r{font-weight:700;white-space:nowrap}
.wnd-cmp-r.up{color:#86efac}
.wnd-cmp-r.dn{color:#fca5a5}
.wnd-cmp-r.eq{color:rgba(255,255,255,.45)}
`;

function _injectCSS() {
  if (document.getElementById('wnd-cmp-css')) return;
  const s = document.createElement('style');
  s.id = 'wnd-cmp-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// statDefs: [{k:'atk', label:'Атака', suf:''}, {k:'pen', label:'Пробой', suf:'%'}, ...]
function html(newItem, eqItem, statDefs) {
  _injectCSS();
  if (!newItem || newItem.equipped) return '';
  const rows = [];
  for (const s of statDefs) {
    const nv = +(newItem[s.k] || 0);
    const ev = +((eqItem && eqItem[s.k]) || 0);
    if (!nv && !ev) continue;
    const d = nv - ev;
    const cls = d > 0 ? 'up' : d < 0 ? 'dn' : 'eq';
    const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '=';
    const sign = d > 0 ? '+' : '';
    rows.push(`<div class="wnd-cmp-row">
      <span class="wnd-cmp-l">${s.label}: ${ev}${s.suf} → ${nv}${s.suf}</span>
      <span class="wnd-cmp-r ${cls}">${sign}${d}${s.suf} ${arrow}</span>
    </div>`);
  }
  if (!rows.length) return '';
  const title = eqItem ? '🔄 Сравнение со снаряжённым' : '🆕 Сейчас слот пуст';
  return `<div class="wnd-cmp">
    <div class="wnd-cmp-title">${title}</div>
    ${rows.join('')}
  </div>`;
}

window.DetailCompare = { html };
})();
