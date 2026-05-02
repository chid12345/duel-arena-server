/* ============================================================
   ResultButtonsHTML — кнопки после боя (HTML + CSS drop-shadow)
   Как клан: filter:drop-shadow следует форме иконки
   ============================================================ */

const ResultButtonsHTML = (() => {
  const CSS = `
.rb-wrap{position:fixed;z-index:150;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:8px}
.rb-info{font-size:12px;font-weight:800;letter-spacing:.3px;text-align:center;text-shadow:0 0 8px currentColor;pointer-events:none;margin-bottom:6px;font-family:'Arial Black',Arial,sans-serif}
.rb-big-row{display:flex;gap:20px;justify-content:center;pointer-events:auto}
.rb-big{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;background:none;border:none;padding:4px 10px;user-select:none;-webkit-tap-highlight-color:transparent;transition:transform .12s;font-family:'Arial Black',Arial,sans-serif}
.rb-big:active{transform:scale(.92)}
.rb-bi-lg{width:82px;height:82px;object-fit:contain;filter:drop-shadow(0 0 14px currentColor) drop-shadow(0 0 5px rgba(0,0,0,.7));transition:filter .18s,transform .18s;display:block}
.rb-big:active .rb-bi-lg{filter:drop-shadow(0 0 22px currentColor) drop-shadow(0 0 7px rgba(0,0,0,.7));transform:scale(.93)}
.rb-lbl-lg{font-size:12px;font-weight:800;color:currentColor;text-shadow:0 0 8px currentColor;letter-spacing:.3px;text-align:center;white-space:pre-line;line-height:1.3}
.rb-div{width:64%;height:1px;background:currentColor;opacity:.22;margin:9px 0;pointer-events:none}
.rb-row{display:flex;gap:14px;justify-content:center;pointer-events:auto}
.rb-btn{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;background:none;border:none;padding:2px 8px;user-select:none;-webkit-tap-highlight-color:transparent;transition:transform .12s;font-family:'Arial Black',Arial,sans-serif}
.rb-btn:active{transform:scale(.92)}
.rb-bi-sm{width:62px;height:62px;object-fit:contain;filter:drop-shadow(0 0 11px currentColor) drop-shadow(0 0 4px rgba(0,0,0,.6));transition:filter .18s,transform .18s;display:block}
.rb-btn:active .rb-bi-sm{filter:drop-shadow(0 0 17px currentColor) drop-shadow(0 0 6px rgba(0,0,0,.6));transform:scale(.93)}
.rb-lbl-sm{font-size:10.5px;font-weight:800;color:currentColor;text-shadow:0 0 6px currentColor;letter-spacing:.3px;white-space:nowrap}
`;

  function _css() {
    if (document.getElementById('rb-css')) return;
    const s = document.createElement('style');
    s.id = 'rb-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function _fit(el) {
    try {
      const c = document.querySelector('canvas');
      if (!c) return;
      const r = c.getBoundingClientRect();
      const tbH = Math.round((r.height * 76) / (c.height || 700));
      el.style.top    = r.top + 'px';
      el.style.left   = r.left + 'px';
      el.style.width  = r.width + 'px';
      el.style.height = (r.height - tbH) + 'px';
    } catch (_) {}
  }

  function _btn(cls, biCls, icon, label, color, cb, haptic) {
    const el = document.createElement('div');
    el.className = cls; el.style.color = color;
    const lblCls = cls === 'rb-big' ? 'rb-lbl-lg' : 'rb-lbl-sm';
    el.innerHTML = `<img src="${icon}" class="${biCls}" alt=""><div class="${lblCls}">${label}</div>`;
    el.addEventListener('click', () => {
      try { tg?.HapticFeedback?.impactOccurred(haptic); } catch(_) {}
      cb();
    });
    return el;
  }

  function show(_, { big, rows, info }) {
    _css(); hide();
    const wrap = document.createElement('div');
    wrap.id = 'rb-root'; wrap.className = 'rb-wrap';

    if (info) {
      const el = document.createElement('div');
      el.className = 'rb-info'; el.style.color = info.color || '#88ddaa';
      el.textContent = info.text; wrap.appendChild(el);
    }
    if (big?.length) {
      const row = document.createElement('div'); row.className = 'rb-big-row';
      big.forEach(b => row.appendChild(_btn('rb-big', 'rb-bi-lg', b.icon, b.label, b.color, b.cb, 'medium')));
      wrap.appendChild(row);
    }
    if (rows?.length) {
      const d = document.createElement('div'); d.className = 'rb-div'; d.style.color = '#7799bb';
      wrap.appendChild(d);
      const row = document.createElement('div'); row.className = 'rb-row';
      rows.forEach(b => row.appendChild(_btn('rb-btn', 'rb-bi-sm', b.icon, b.label, b.color, b.cb, 'light')));
      wrap.appendChild(row);
    }

    document.body.appendChild(wrap);
    _fit(wrap);
  }

  function hide() { document.getElementById('rb-root')?.remove(); }

  return { show, hide };
})();
