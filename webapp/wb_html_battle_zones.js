/* wb_html_battle_zones.js — оверлей с зонами атака/защита для боя WB.
   Заменяет «тап по боссу» на выбор зоны атаки + зоны защиты + «Совершить ход».
   Монки-патчит WBHtml._renderBattle (не трогает существующий код).
   Kill-switch: ?wb_classic=1 в URL или localStorage.wb_classic=1 — вернёт тап. */
(() => {
  const ZONES = ['HEAD','TORSO','LEGS'];
  const NAME  = { HEAD:'Голова', TORSO:'Тело', LEGS:'Ноги' };
  const ICON  = { HEAD:'battle_icons/head.png', TORSO:'battle_icons/torso.png', LEGS:'battle_icons/legs.png' };

  let _selA = null, _selD = null;
  let _busy = false;

  function _isClassic() {
    try { if (new URLSearchParams(location.search).get('wb_classic') === '1') return true; } catch(_) {}
    try { if (localStorage.getItem('wb_classic') === '1') return true; } catch(_) {}
    return false;
  }

  function _injectCss() {
    if (document.getElementById('wbz-css')) return;
    const s = document.createElement('style');
    s.id = 'wbz-css';
    s.textContent = `
      /* Колонки атаки/защиты — внизу боссовой зоны. Компактные кнопки */
      .wbz-col{position:absolute;display:flex;flex-direction:column;gap:4px;z-index:30;bottom:12px}
      .wbz-col-atk{left:4px} .wbz-col-def{right:4px}
      .wbz-lbl{font-size:8px;font-weight:900;letter-spacing:1.2px;text-align:center;font-family:Consolas,monospace;text-transform:uppercase;margin-bottom:1px}
      .wbz-col-atk .wbz-lbl{color:#ff8ac0;text-shadow:0 0 6px rgba(255,80,160,.65),0 1px 2px rgba(0,0,0,.9)}
      .wbz-col-def .wbz-lbl{color:#8acfff;text-shadow:0 0 6px rgba(80,180,255,.65),0 1px 2px rgba(0,0,0,.9)}
      /* Skin-style: без рамки/фона, компактные иконка + надпись. ФИКСИРОВАНЫ */
      .wbz-btn{width:42px;display:flex;flex-direction:column;align-items:center;cursor:pointer;background:transparent;border:none;padding:0;user-select:none}
      .wbz-btn img{width:24px;height:24px;object-fit:contain;transition:filter .2s,transform .2s}
      .wbz-btn .nm{font-size:7px;font-weight:800;letter-spacing:.3px;font-family:Consolas,monospace;text-transform:uppercase;margin-top:1px;text-shadow:0 1px 3px rgba(0,0,0,.95)}
      .wbz-col-atk .wbz-btn img{filter:drop-shadow(0 0 6px rgba(255,80,160,.85)) drop-shadow(0 1px 2px rgba(0,0,0,.85))}
      .wbz-col-def .wbz-btn img{filter:drop-shadow(0 0 6px rgba(80,180,255,.85)) drop-shadow(0 1px 2px rgba(0,0,0,.85))}
      .wbz-col-atk .wbz-btn .nm{color:#ff8ac0;text-shadow:0 0 5px rgba(255,80,160,.7),0 1px 3px rgba(0,0,0,.95)}
      .wbz-col-def .wbz-btn .nm{color:#8acfff;text-shadow:0 0 5px rgba(80,180,255,.7),0 1px 3px rgba(0,0,0,.95)}
      /* Выбранная зона — усиленное свечение + scale (без парения) */
      .wbz-col-atk .wbz-btn.sel img{filter:drop-shadow(0 0 14px #ff5fa0) drop-shadow(0 0 8px #fff);transform:scale(1.2)}
      .wbz-col-def .wbz-btn.sel img{filter:drop-shadow(0 0 14px #5fb8ff) drop-shadow(0 0 8px #fff);transform:scale(1.2)}
      .wbz-btn.sel .nm{color:#fff;font-weight:900;text-shadow:0 0 8px #fff,0 1px 3px rgba(0,0,0,.95)}
      /* Кнопки действия — 🎲 (картинка) + Совершить ход. ФИКСИРОВАНЫ */
      .wbz-actions{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:10px;align-items:center;z-index:31}
      /* Кубик-кнопка: больше + объёмная подложка, выглядит как кнопка */
      .wbz-auto{display:flex;align-items:center;justify-content:center;cursor:pointer;width:48px;height:48px;border-radius:10px;background:linear-gradient(180deg,rgba(50,30,5,.85),rgba(20,12,2,.95));border:1.5px solid rgba(255,200,80,.5);padding:4px;user-select:none;transition:transform .12s,box-shadow .15s,filter .12s;box-shadow:0 2px 8px rgba(0,0,0,.6),0 0 12px rgba(255,180,40,.25),inset 0 1px 0 rgba(255,220,120,.15)}
      .wbz-auto:active{transform:scale(.88) translateY(2px);filter:brightness(1.25);box-shadow:0 0 4px rgba(0,0,0,.6),inset 0 0 8px rgba(0,0,0,.5)}
      .wbz-auto img{width:36px;height:36px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(255,200,60,.7));pointer-events:none}
      /* Apply: больше, объёмная, выглядит как настоящая кнопка */
      .wbz-apply{width:138px;min-width:138px;max-width:138px;padding:11px 0;text-align:center;border-radius:9px;font-family:Consolas,monospace;font-weight:900;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#fff;text-shadow:0 0 5px rgba(201,138,255,.7),0 1px 2px rgba(0,0,0,.85);background:linear-gradient(180deg,rgba(140,40,200,.95),rgba(80,20,140,.98));border:1.5px solid rgba(220,120,200,.55);box-shadow:0 3px 10px rgba(0,0,0,.55),0 0 10px rgba(180,80,255,.35),inset 0 1px 0 rgba(255,180,255,.2);opacity:.55;cursor:not-allowed;transition:transform .12s,opacity .25s,box-shadow .12s;white-space:nowrap;overflow:hidden}
      .wbz-apply:active{transform:scale(.96) translateY(2px);box-shadow:0 0 4px rgba(0,0,0,.6),inset 0 0 8px rgba(0,0,0,.5)}
      .wbz-apply.ready{opacity:1;cursor:pointer;border-color:rgba(255,120,200,.7);animation:wbzReady 2s ease-in-out infinite}
      @keyframes wbzReady{0%,100%{box-shadow:0 0 12px rgba(180,80,255,.45)}50%{box-shadow:0 0 22px rgba(255,100,180,.6)}}
      .wbz-apply.busy{opacity:.6;animation:none;pointer-events:none}
      #wb-root .wbz-on .wb-tap-hint{display:none!important}
      /* При ударе старый код ставит transform:scale(.98) на boss-zone — это
         сдвигало все зоны/кнопки внутри. Блокируем — пусть эффект на боссе. */
      #wb-root .wb-boss-zone{transform:none!important;cursor:default!important}
    `;
    document.head.appendChild(s);
  }

  function _disableTap(zoneEl) {
    if (!zoneEl) return;
    zoneEl.classList.add('wbz-on');
    if (zoneEl.dataset.act === 'hit') zoneEl.removeAttribute('data-act');
    zoneEl.querySelectorAll('[data-act="hit"]').forEach(el => el.removeAttribute('data-act'));
  }

  function _buildCol(side) {
    const col = document.createElement('div');
    col.className = 'wbz-col wbz-col-' + side;
    col.innerHTML = `<div class="wbz-lbl">${side==='atk'?'⚔ Атака':'🛡 Защита'}</div>` +
      ZONES.map(k => `<div class="wbz-btn" data-side="${side}" data-key="${k}"><img src="${ICON[k]}"><div class="nm">${NAME[k]}</div></div>`).join('');
    return col;
  }

  function _injectZones(zoneEl) {
    if (!zoneEl) return;
    zoneEl.querySelectorAll('.wbz-col, .wbz-actions').forEach(el => el.remove());
    if (getComputedStyle(zoneEl).position === 'static') zoneEl.style.position = 'relative';
    zoneEl.appendChild(_buildCol('atk'));
    zoneEl.appendChild(_buildCol('def'));
    const a = document.createElement('div');
    a.className = 'wbz-actions';
    a.innerHTML = `<div class="wbz-auto" id="wbz-auto" title="Случайный ход"><img src="dice.png" alt="dice"></div><div class="wbz-apply" id="wbz-apply">⚔ Совершить ход</div>`;
    zoneEl.appendChild(a);
  }

  function _refresh(root) {
    root.querySelectorAll('.wbz-col-atk .wbz-btn').forEach(b => b.classList.toggle('sel', b.dataset.key === _selA));
    root.querySelectorAll('.wbz-col-def .wbz-btn').forEach(b => b.classList.toggle('sel', b.dataset.key === _selD));
    const a = root.querySelector('#wbz-apply');
    if (a) a.classList.toggle('ready', !!(_selA && _selD));
  }

  function _zoneToast(scene, r) {
    if (!r || !r.zone_mode) return;
    const atkIc = r.atk_blocked ? '🛡' : '⚔';
    const defIc = r.def_blocked ? '🛡' : '💢';
    const atkTxt = r.atk_blocked ? `блок −${r.damage}` : `−${r.damage}`;
    const defTxt = r.def_blocked ? 'отбил' : `получил −${r.counter_damage}`;
    try { scene._toast?.(`${atkIc} ${atkTxt} · ${defIc} ${defTxt}`); } catch(_) {}
  }

  function _resetSelection(root) {
    _selA = null; _selD = null;
    _refresh(root);
  }

  async function _hit(scene) {
    if (_busy || !_selA || !_selD) return;
    if (scene._hitBusy) return;
    if (window.WbzFx?.isOnCooldown?.()) return;
    _busy = true; scene._hitBusy = true;
    const apply = document.getElementById('wbz-apply');
    apply?.classList.add('busy');
    try {
      const r = await post('/api/world_boss/hit', { attack_zone: _selA, defense_zone: _selD });
      if (r && r.ok) {
        try { tg?.HapticFeedback?.impactOccurred(r.is_crit ? 'heavy' : 'light'); } catch(_) {}
        if (scene._state?.active) scene._state.active.current_hp = r.boss_hp;
        // Phase 2: сразу обновляем HP игрока локально, чтобы не ждать WS-тик.
        if (scene._state?.player_state && r.player_hp != null) {
          const _prevHp = scene._state.player_state.current_hp;
          scene._state.player_state.current_hp = r.player_hp;
          // F: на телефоне WS-тик иногда не приходит, и боссовый contre-урон
          // не попадал в лог боя. Логируем напрямую при падении HP.
          if (r.player_hp < _prevHp) {
            try { window.WBHtml?.checkBossHit?.(_prevHp, r.player_hp); } catch(_) {}
          }
          if (r.player_died) {
            scene._state.player_state.is_dead = 1;
            try { window.WBHtml?.logDeath?.(); } catch(_) {}
          }
        }
        try { window.WBHtml?.addHitLog?.(r.damage, r.is_crit); } catch(_) {}
        try { window.WBHtml?.logMyHit?.(r.damage, !!r.is_crit, r.boss_hp); } catch(_) {}
        _zoneToast(scene, r);
        const root = document.getElementById('wb-root');
        if (root) {
          try { window.WbzFx?.animate?.(root, r, _selA, _selD); } catch(_) {}
          try { window.WbzFx?.playResult?.(r); } catch(_) {}
          try { window.WbzExtras?.logHit?.(scene, r); } catch(_) {}
          _resetSelection(root);
        }
        // Клиентский кулдаун 1.5с между ходами — глянуть результат и подумать.
        try { window.WbzFx?.startCooldown?.(1500, document.getElementById('wbz-apply')); } catch(_) {}
        const hadPs = !!scene._state?.player_state;
        // Если игрок умер — рефрешим состояние, чтобы показалось окно воскрешения.
        if (r.player_died || !hadPs) {
          setTimeout(() => { if (scene._alive) scene._refresh?.(); }, 400);
        } else {
          try { window.WBHtml?.updateHUD?.(scene._state); } catch(_) {}
        }
      } else if (r && r.reason && r.reason !== 'Слишком быстро') {
        try { scene._toast?.('❌ ' + r.reason); } catch(_) {}
      }
    } catch(_) {}
    _busy = false; scene._hitBusy = false;
    apply?.classList.remove('busy');
  }

  function _bind(root) {
    if (root.__wbzBound) return;
    root.__wbzBound = true;
    root.addEventListener('click', e => {
      const btn = e.target.closest('.wbz-btn');
      if (btn) {
        if (btn.dataset.side === 'atk') _selA = btn.dataset.key; else _selD = btn.dataset.key;
        _refresh(root);
        return;
      }
      if (e.target.closest('#wbz-auto')) {
        _selA = ZONES[Math.floor(Math.random() * 3)];
        _selD = ZONES[Math.floor(Math.random() * 3)];
        _refresh(root);
        const sc = window.WBHtml?._scene;
        if (sc) setTimeout(() => _hit(sc), 200);
        return;
      }
      if (e.target.closest('#wbz-apply')) {
        const sc = window.WBHtml?._scene;
        if (sc) _hit(sc);
        return;
      }
    });
  }

  function _hookRender() {
    if (!window.WBHtml || !window.WBHtml._renderBattle) { setTimeout(_hookRender, 50); return; }
    if (window.WBHtml.__wbzHooked) return;
    window.WBHtml.__wbzHooked = true;
    const orig = window.WBHtml._renderBattle;
    window.WBHtml._renderBattle = function(root, s) {
      orig.call(this, root, s);
      if (_isClassic()) return;
      try {
        _injectCss();
        const ps = s?.player_state;
        if (!ps || ps.is_dead) return;  // мёртвый или не вошёл — не показываем зоны
        const zone = root.querySelector('.wb-boss-zone');
        _disableTap(zone);
        _injectZones(zone);
        _bind(root);
        _refresh(root);
      } catch(e) { console.warn('[wbz] render err', e); }
    };
  }

  _hookRender();
})();
