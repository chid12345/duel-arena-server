/* wb_html_battle_zones_extras.js — UI-доп для боя WB:
   1) Скрывает УЛЬТА-панель и нижние СКИЛЛЫ (по требованию пользователя)
   2) Маленькая кнопка АВТО (премиум) в верхнем правом углу босс-зоны
   3) Лента истории — 5 последних ходов под HP босса (вариант B)
   Подключается ПОСЛЕ wb_html_battle_zones.js. Закон 1: ≤200 строк. */
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
      /* Скрываем УЛЬТА и СКИЛЛЫ когда зон-режим активен */
      #wb-root .wbz-on ~ .wb-ultra,
      #wb-root .wb-boss-zone.wbz-on ~ .wb-ultra,
      #wb-root .wb-boss-zone.wbz-on ~ .wb-skills,
      body.wbz-on #wb-root .wb-ultra,
      body.wbz-on #wb-root .wb-skills{display:none!important}

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

      /* Кнопка АВТО (премиум) — верхний правый угол босс-зоны */
      .wbz-auto-btn{position:absolute;top:10px;right:10px;z-index:14;display:flex;flex-direction:column;align-items:center;justify-content:center;width:46px;padding:5px 0;border-radius:9px;background:linear-gradient(135deg,rgba(15,5,30,.88),rgba(8,5,18,.92));border:1.5px solid rgba(160,150,200,.45);font-family:Consolas,monospace;cursor:pointer;user-select:none;transition:all .25s;backdrop-filter:blur(2px)}
      .wbz-auto-btn .ic{font-size:18px;line-height:1}
      .wbz-auto-btn .lb{font-size:7px;font-weight:900;letter-spacing:.6px;color:#aaa;margin-top:2px;text-transform:uppercase}
      .wbz-auto-btn .lk{position:absolute;bottom:-3px;right:-3px;font-size:9px;background:#222;border-radius:50%;padding:1px 3px}
      .wbz-auto-btn.locked{opacity:.7}
      .wbz-auto-btn.on{border-color:#00ff88;background:linear-gradient(135deg,rgba(0,80,40,.7),rgba(0,40,20,.9));box-shadow:0 0 18px rgba(0,255,136,.6),inset 0 0 8px rgba(0,255,136,.2);animation:wbzAutoPulse 2s ease-in-out infinite}
      @keyframes wbzAutoPulse{0%,100%{box-shadow:0 0 18px rgba(0,255,136,.6)}50%{box-shadow:0 0 28px rgba(0,255,136,.9),0 0 40px rgba(0,255,136,.4)}}
      .wbz-auto-btn.on .lb{color:#00ff88;text-shadow:0 0 6px #00ff88}
      .wbz-auto-btn.on .ic{filter:drop-shadow(0 0 6px #00ff88)}
    `;
    document.head.appendChild(s);
  }

  function _hideOldUI(root) {
    // Прямой inline-стиль страховка (некоторые селекторы могут не сработать)
    root.querySelectorAll('.wb-ultra, .wb-skills').forEach(el => { el.style.display = 'none'; });
  }

  function _renderHistory(root, scene) {
    let bar = root.querySelector('.wbz-hbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'wbz-hbar';
      bar.innerHTML = '<div class="wbz-hbar-lbl">⚡ БОСС ЦЕЛИЛ:</div><div class="wbz-hbar-row"></div>';
      // Вставляем ВНУТРЬ sticky-шапки (после HP-секции) — лента всегда видна
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

  function _renderAuto(root, state) {
    const zone = root.querySelector('.wb-boss-zone');
    if (!zone) return;
    let btn = zone.querySelector('.wbz-auto-btn');
    if (!btn) {
      btn = document.createElement('div');
      btn.className = 'wbz-auto-btn';
      btn.innerHTML = '<div class="ic">🤖</div><div class="lb">АВТО</div>';
      zone.appendChild(btn);
      btn.addEventListener('click', _onAutoClick);
    }
    const isPremium = !!state?.is_premium;
    const isOn = !!(state?.player_state?.auto_bot);
    btn.classList.toggle('locked', !isPremium);
    btn.classList.toggle('on', isOn && isPremium);
    let lk = btn.querySelector('.lk');
    if (!isPremium) {
      if (!lk) { lk = document.createElement('div'); lk.className = 'lk'; lk.textContent = '🔒'; btn.appendChild(lk); }
    } else if (lk) { lk.remove(); }
    btn.title = isPremium ? (isOn ? 'Авто-бой ВКЛ — тап чтобы выключить' : 'Включить авто-бой') : '🔒 Только для подписчиков';
  }

  async function _onAutoClick() {
    const sc = window.WBHtml?._scene;
    const state = sc?._state;
    if (!state) return;
    if (!state.is_premium) {
      try { window.WBHtml?.toast?.('👑 АВТО доступен только подписчикам'); } catch(_) {}
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('warning'); } catch(_) {}
      return;
    }
    const cur = !!state.player_state?.auto_bot;
    try {
      const r = await post('/api/world_boss/toggle_auto_bot', { enabled: !cur });
      if (r?.ok) {
        if (state.player_state) state.player_state.auto_bot = r.enabled ? 1 : 0;
        try { window.WBHtml?.toast?.(r.enabled ? '🤖 Авто-бой ВКЛ' : '🤖 Авто-бой ВЫКЛ'); } catch(_) {}
        const root = document.getElementById('wb-root');
        if (root) _renderAuto(root, state);
      } else if (r?.reason) {
        try { window.WBHtml?.toast?.('❌ ' + r.reason); } catch(_) {}
      }
    } catch(_) {}
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
        // Активируем flex layout — wb-boss-zone растягивается, пустоты внизу нет
        if (root.classList) root.classList.add('wbz-fill');
        _hideOldUI(root);
        const sc = window.WBHtml?._scene;
        _renderHistory(root, sc);
        _renderAuto(root, s);
      } catch(e) { console.warn('[wbz extras]', e); }
    };
  }

  window.WbzExtras = { logHit };
  _hookRender();
})();
