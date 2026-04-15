/* ============================================================
   BattleLog — история раундов (попап).
   Патчит BattleLog: showHistory / hideHistory.
   Загружается после scene_battle.js.
   ============================================================ */
(() => {
  let el = null;

  function _init() {
    if (el) return;
    const s = document.createElement('style');
    s.textContent = `
      #bl-history {
        position:fixed; display:none; z-index:300;
        background:rgba(8,6,20,0.97);
        border:1px solid rgba(80,70,140,0.55); border-radius:10px;
        overflow-y:auto; box-sizing:border-box;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        font-size:11px; color:#ccc;
      }
      #bl-history .blh-close {
        position:sticky; top:0;
        background:rgba(8,6,20,0.98);
        padding:6px 10px 5px;
        font-size:13px; font-weight:700; color:#ffc83c;
        text-align:right; cursor:pointer;
        border-bottom:1px solid rgba(80,70,140,0.3);
        display:flex; justify-content:space-between; align-items:center;
      }
      #bl-history .blh-title { font-size:12px; color:#aabbdd; font-weight:400; }
      #bl-history .blh-row {
        display:flex; align-items:center;
        padding:5px 8px;
        border-bottom:1px solid rgba(255,255,255,0.06);
      }
      #bl-history .blh-rn  { font-size:9px; color:#ffc83c; font-weight:700; min-width:24px; flex-shrink:0; }
      #bl-history .blh-you { flex:1; color:#aabbdd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #bl-history .blh-sep { color:#555; padding:0 4px; flex-shrink:0; }
      #bl-history .blh-opp { flex:1; text-align:right; color:#cc9999; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    `;
    document.head.appendChild(s);
    el = document.createElement('div');
    el.id = 'bl-history';
    el.addEventListener('click', e => {
      if (e.target.classList.contains('blh-close') ||
          e.target.closest?.('.blh-close')) BattleLog.hideHistory();
    });
    document.body.appendChild(el);
  }

  function _fmtRow(raw) {
    const p = (raw || '').match(/^Р(\d+)\s+Вы→(\S+)\s+(.*?)\s+·\s+Враг→(\S+)\s+(.*)$/);
    if (!p) return `<div class="blh-row"><span class="blh-you">${raw}</span></div>`;
    const [, rn, z1, m1, z2, m2] = p;
    const sm = BattleLog.styleMarker;
    return `<div class="blh-row">
      <span class="blh-rn">Р${rn}</span>
      <span class="blh-you">${z1} ${sm(m1.trim(),'you')}</span>
      <span class="blh-sep">·</span>
      <span class="blh-opp">${z2} ${sm(m2.trim(),'enemy')}</span>
    </div>`;
  }

  Object.assign(BattleLog, {
    showHistory(canvas, entries) {
      _init();
      const r = canvas.getBoundingClientRect();
      el.style.left   = (r.left + 8) + 'px';
      el.style.top    = (r.top  + r.height * 0.05) + 'px';
      el.style.width  = (r.width - 16) + 'px';
      el.style.height = (r.height * 0.65) + 'px';
      const n = (entries || []).length;
      const rows = (entries || []).map(_fmtRow).join('');
      el.innerHTML =
        `<div class="blh-close">
           <span class="blh-title">📜 История раундов (${n})</span>
           <span>✕</span>
         </div>` +
        (rows || '<div class="blh-row"><span class="blh-you">Раундов ещё не было</span></div>');
      el.style.display = 'block';
      el.scrollTop = el.scrollHeight;
    },
    hideHistory() {
      if (el) el.style.display = 'none';
    },
  });
})();
