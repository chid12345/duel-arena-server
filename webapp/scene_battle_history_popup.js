/* ============================================================
   BattleHistory — попап «Мои последние бои».
   Глобальный singleton BattleHistory.open(canvas).
   Строки-бои → клик → реплей через BattleLog.showHistory().
   Загружается после scene_battle_log_history.js.
   ============================================================ */
(() => {
  let el = null;

  function _init() {
    if (el) return;
    const s = document.createElement('style');
    s.textContent = `
      #bh-list {
        position:fixed; display:none; z-index:310;
        background:rgba(8,6,20,0.97);
        border:1px solid rgba(80,70,140,0.55); border-radius:10px;
        overflow-y:auto; box-sizing:border-box;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        font-size:11px; color:#ccc;
      }
      #bh-list .bhl-close {
        position:sticky; top:0; background:rgba(8,6,20,0.98);
        padding:6px 10px 5px; font-size:13px; font-weight:700; color:#ffc83c;
        display:flex; justify-content:space-between; align-items:center;
        border-bottom:1px solid rgba(80,70,140,0.3);
      }
      #bh-list .bhl-close .x { cursor:pointer; }
      #bh-list .bhl-title { font-size:12px; color:#aabbdd; font-weight:400; }
      #bh-list .bhl-row {
        display:flex; align-items:center; gap:8px;
        padding:7px 10px; cursor:pointer;
        border-bottom:1px solid rgba(255,255,255,0.06);
      }
      #bh-list .bhl-row:hover { background:rgba(255,255,255,0.04); }
      #bh-list .bhl-res { min-width:22px; text-align:center; font-size:14px; }
      #bh-list .bhl-win  { color:#3cc864; }
      #bh-list .bhl-lose { color:#ff4455; }
      #bh-list .bhl-meta { flex:1; color:#ddddee; }
      #bh-list .bhl-meta small { color:#8899aa; font-size:9px; }
      #bh-list .bhl-tape { font-size:14px; opacity:0.8; }
      #bh-list .bhl-empty { padding:14px 10px; color:#8899aa; text-align:center; }
    `;
    document.head.appendChild(s);
    el = document.createElement('div');
    el.id = 'bh-list';
    // pointer/mouse события — полностью поглощаем (не проваливаем на Phaser canvas)
    ['pointerdown','pointerup','mousedown','mouseup','click'].forEach(ev => {
      el.addEventListener(ev, e => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
    });
    ['touchstart','touchend','touchmove'].forEach(ev => {
      el.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    });
    document.body.appendChild(el);
  }

  function _fmtAgo(iso) {
    if (!iso) return '';
    const t = Date.parse(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z'));
    if (!isFinite(t)) return '';
    const diff = (Date.now() - t) / 1000;
    if (diff < 60)   return 'только что';
    if (diff < 3600) return `${Math.floor(diff/60)}м назад`;
    if (diff < 86400) return `${Math.floor(diff/3600)}ч назад`;
    if (diff < 86400*7) return `${Math.floor(diff/86400)}д назад`;
    return iso.slice(0, 10);
  }

  async function _loadAndRender(canvas) {
    el.innerHTML =
      `<div class="bhl-close">
         <span class="bhl-title">📼 Мои бои — последние 20</span>
         <span class="x">✕</span>
       </div>
       <div class="bhl-empty">Загрузка…</div>`;
    let items = [];
    try {
      const res = await get('/api/battle/history?limit=20');
      if (res?.ok) items = res.items || [];
    } catch (_) {}
    const header =
      `<div class="bhl-close">
         <span class="bhl-title">📼 Мои бои (${items.length})</span>
         <span class="x">✕</span>
       </div>`;
    if (!items.length) {
      el.innerHTML = header + `<div class="bhl-empty">Пока нет сохранённых боёв</div>`;
      return;
    }
    const rows = items.map(it => {
      const cls = it.won ? 'bhl-win' : 'bhl-lose';
      const ico = it.won ? '🏆' : '💀';
      const opp = it.opp_is_bot ? 'Бот' : `ID ${it.opp_id ?? '?'}`;
      const ago = _fmtAgo(it.created_at);
      return `<div class="bhl-row" data-id="${it.battle_id}">
        <span class="bhl-res ${cls}">${ico}</span>
        <span class="bhl-meta">${it.won ? 'Победа' : 'Поражение'} · ${it.rounds}р. · ${opp}<br><small>${ago}</small></span>
        <span class="bhl-tape">📼</span>
      </div>`;
    }).join('');
    el.innerHTML = header + rows;
    // Делегирование кликов
    el.querySelectorAll('.bhl-row').forEach(row => {
      row.addEventListener('click', async e => {
        e.stopPropagation();
        const bid = row.getAttribute('data-id');
        if (!bid) return;
        try {
          tg?.HapticFeedback?.impactOccurred('light');
          const r = await get(`/api/battle/replay/${bid}`);
          if (r?.ok && r.replay?.webapp_log?.length) {
            BattleHistory.close();
            BattleLog.showHistory(canvas, r.replay.webapp_log);
          }
        } catch (_) {}
      });
    });
  }

  const BattleHistory = {
    open(canvas) {
      _init();
      const r = canvas.getBoundingClientRect();
      el.style.left   = (r.left + 8) + 'px';
      el.style.top    = (r.top  + r.height * 0.08) + 'px';
      el.style.width  = (r.width - 16) + 'px';
      el.style.height = (r.height * 0.8) + 'px';
      el.style.display = 'block';
      el.addEventListener('click', e => {
        if (e.target.classList.contains('x')) BattleHistory.close();
      }, { once: false });
      _loadAndRender(canvas);
    },
    close() {
      if (!el) return;
      el.style.display = 'none';
      // Временный щит от проваливания клика на Phaser canvas
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const shield = document.createElement('div');
        shield.style.cssText = 'position:fixed;inset:0;z-index:309;pointer-events:all;';
        document.body.appendChild(shield);
        setTimeout(() => shield.remove(), 250);
      }
    },
  };
  window.BattleHistory = BattleHistory;
})();
