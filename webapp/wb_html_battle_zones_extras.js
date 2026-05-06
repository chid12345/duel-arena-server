/* wb_html_battle_zones_extras.js — UI-доп для боя WB:
   1) Скрывает УЛЬТА-панель и нижние СКИЛЛЫ
   2) Лента истории — 5 последних ходов внутри sticky-шапки (вариант B)
   3) flex-layout #wb-root — убирает пустоту внизу
   Кнопка АВТО — отдельный модуль wb_html_battle_zones_autobot.js. */
(() => {
  if (window.__wbzExtrasLoaded) return;
  window.__wbzExtrasLoaded = true;

  const HKEY = 'wbz_history_';
  const MAX = 5;
  const ZONE_ICON = { HEAD:'battle_icons/head.png', TORSO:'battle_icons/torso.png', LEGS:'battle_icons/legs.png' };

  function _key(scene) {
    const sid = scene?._state?.active?.spawn_id;
    return sid ? HKEY + sid : null;
  }
  function _load(scene) {
    const k = _key(scene); if (!k) return [];
    try { const a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a.slice(-MAX) : []; }
    catch(_) { return []; }
  }
  function _save(scene, arr) {
    const k = _key(scene); if (!k) return;
    try { localStorage.setItem(k, JSON.stringify(arr.slice(-MAX))); } catch(_) {}
  }

  function _injectCss() {
    if (document.getElementById('wbz-x-css')) return;
    const s = document.createElement('style');
    s.id = 'wbz-x-css';
    s.textContent = `
      /* Растягиваем wb-root на flex column когда зон-режим — убираем пустоту внизу */
      #wb-root.wbz-fill{display:flex!important;flex-direction:column}
      #wb-root.wbz-fill .wb-boss-zone{flex:1 1 auto;min-height:300px}
      #wb-root.wbz-fill .wb-plhp{flex-shrink:0;margin-top:auto}

      /* Лента истории — flow-элемент внутри sticky-шапки (всегда виден) */
      .wbz-hbar{display:flex;align-items:center;gap:7px;padding:5px 2px 1px;font-family:Consolas,monospace;font-size:8.5px;color:rgba(200,200,220,.75);letter-spacing:.6px}
      .wbz-hbar-lbl{text-transform:uppercase;font-weight:800;color:#ff8aa8;text-shadow:0 0 6px rgba(255,80,160,.55);white-space:nowrap}
      .wbz-hbar-row{display:flex;gap:4px;align-items:center}
      .wbz-h-cell{width:22px;height:22px;border-radius:5px;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;background:rgba(8,5,18,.55);position:relative}
      .wbz-h-cell.ok{border-color:rgba(0,255,136,.6);box-shadow:0 0 6px rgba(0,255,136,.4)}
      .wbz-h-cell.bad{border-color:rgba(255,51,68,.6);box-shadow:0 0 6px rgba(255,51,68,.45)}
      .wbz-h-cell img{width:14px;height:14px;object-fit:contain;opacity:.92}
      .wbz-h-empty{color:rgba(255,255,255,.3);font-size:10px;font-weight:700}
    `;
    document.head.appendChild(s);
  }

  function _hideOldUI(root) {
    // inline display:none — страховка если CSS не сработал
    root.querySelectorAll('.wb-ultra, .wb-skills').forEach(el => { el.style.display = 'none'; });
  }

  function _renderHistory(root, scene) {
    let bar = root.querySelector('.wbz-hbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'wbz-hbar';
      bar.innerHTML = '<div class="wbz-hbar-lbl">⚡ БОСС ЦЕЛИЛ:</div><div class="wbz-hbar-row"></div>';
      const hdr = root.querySelector('.wb-bhdr2');
      const hpSec = hdr?.querySelector('.wb-hp2-sec');
      if (hpSec && hpSec.parentNode) hpSec.parentNode.insertBefore(bar, hpSec.nextSibling);
      else if (hdr) hdr.appendChild(bar);
      else root.appendChild(bar);
    }
    const row = bar.querySelector('.wbz-hbar-row');
    if (!row) return;
    const arr = _load(scene);
    if (!arr.length) { row.innerHTML = '<span class="wbz-h-empty">пока пусто</span>'; return; }
    row.innerHTML = arr.map(h => {
      const zone = h.boss_atk || 'HEAD';
      const cls = h.def_blocked ? 'ok' : 'bad';
      return `<div class="wbz-h-cell ${cls}"><img src="${ZONE_ICON[zone] || ''}"></div>`;
    }).join('');
  }

  function logHit(scene, r) {
    if (!scene || !r || !r.zone_mode || !r.boss_atk_zone) return;
    const arr = _load(scene);
    arr.push({
      ts: Date.now(),
      boss_atk: r.boss_atk_zone,
      boss_def: r.boss_def_zone,
      def_blocked: !!r.def_blocked,
      atk_blocked: !!r.atk_blocked,
    });
    _save(scene, arr);
    const root = document.getElementById('wb-root');
    if (root) _renderHistory(root, scene);
  }

  function _hookRender() {
    if (!window.WBHtml || !window.WBHtml._renderBattle) { setTimeout(_hookRender, 50); return; }
    if (window.WBHtml.__wbzExtrasHooked) return;
    window.WBHtml.__wbzExtrasHooked = true;
    const orig = window.WBHtml._renderBattle;
    window.WBHtml._renderBattle = function(root, s) {
      orig.call(this, root, s);
      try {
        _injectCss();
        if (root.classList) root.classList.add('wbz-fill');
        _hideOldUI(root);
        const sc = window.WBHtml?._scene;
        _renderHistory(root, sc);
        // Кнопка АВТО — делегируем отдельному модулю
        try { window.WbzAutobot?.render?.(root, s); } catch(_) {}
      } catch(e) { console.warn('[wbz extras]', e); }
    };
  }

  window.WbzExtras = { logHit };
  _hookRender();
})();
