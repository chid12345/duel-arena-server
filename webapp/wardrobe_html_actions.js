/* ============================================================
   Wardrobe HTML Actions — mount / API calls / modal
   ============================================================ */
(() => {
  const W = WardrobeHTML;

  const MODAL_CFG = {
    common:  { mc:'rgba(156,163,175,.55)', mg:'rgba(156,163,175,.25)' },
    rare:    { mc:'rgba(96,165,250,.6)',   mg:'rgba(59,130,246,.32)'  },
    epic:    { mc:'rgba(192,132,252,.65)', mg:'rgba(168,85,247,.38)'  },
    mythic:  { mc:'rgba(251,146,60,.65)',  mg:'rgba(249,115,22,.42)'  },
  };

  /* ── modal ── */
  function _openModal(scene, a, wp) {
    const bg = document.getElementById('wd-modal-bg');
    if (!bg) return;
    const mc  = MODAL_CFG[a.r] || MODAL_CFG.common;
    const rc  = W.RARITY_COLOR[a.r] || '#aaa';
    const img = W.RARITY_IMG[a.r] || '';
    const nc  = a.r === 'epic' ? ' epic' : a.r === 'mythic' ? ' mythic' : '';
    const cropCls = a.r === 'mythic' ? ' mythic-crop' : '';
    const lava    = a.r === 'mythic' ? '<div class="wd-lava-overlay"></div><div class="wd-neck-mask"></div>' : '';

    let mbCls = 'wd-m-btn ';
    let mbTxt = '';
    if (a.equipped)              { mbCls += 'mb-uneq'; mbTxt = '✅ Надета — Снять'; }
    else if (a.owned)            { mbCls += 'mb-eq';   mbTxt = '⚔️ Надеть броню'; }
    else if (a.type === 'free')  { mbCls += 'mb-free'; mbTxt = '🆓 Выбрать бесплатно'; }
    else if (a.type === 'gold')  { mbCls += 'mb-gold'; mbTxt = `💰 Купить — ${a.price}`; }
    else if (a.type === 'diamonds') { mbCls += 'mb-dia'; mbTxt = `💎 Купить — ${a.price}`; }
    else                         { mbCls += 'mb-usdt'; mbTxt = `🔥 Купить — ${a.price}`; }

    bg.innerHTML = `
      <div class="wd-modal" style="--mc:${mc.mc};--mg:${mc.mg}">
        <button class="wd-m-close" id="wd-m-cls">✕</button>
        <div class="wd-m-img-wrap">
          <img src="${img}" class="${cropCls.trim()}" />
          <div class="wd-m-img-fade"></div>
          ${lava}
        </div>
        <div class="wd-m-body">
          <div class="wd-m-name${nc}">${a.name}</div>
          <div class="wd-m-rarity" style="color:${rc}">${W.RARITY_LABEL[a.r]} · ${a.tier}</div>
          <div class="wd-m-stars" style="color:${rc}">${a.stars}</div>
          <div class="wd-m-div"></div>
          <div class="wd-m-pills">
            ${a.str>0?`<span class="wd-m-pill p-s">⚔️ Сила +${a.str}</span>`:''}
            ${a.agi>0?`<span class="wd-m-pill p-a">🏃 Ловкость +${a.agi}</span>`:''}
            ${a.int>0?`<span class="wd-m-pill p-i">💥 Интуиция +${a.int}</span>`:''}
            ${a.end>0?`<span class="wd-m-pill p-e">🛡 Выносл. +${a.end}</span>`:''}
            ${!(a.str||a.agi||a.int||a.end)?`<span style="color:#6b7280;font-size:11px">Особые характеристики</span>`:''}
          </div>
          <div class="wd-m-bonus">${a.bonus||'—'}</div>
          <button class="${mbCls}" id="wd-m-act">${mbTxt}</button>
        </div>
      </div>`;

    bg.style.display = 'flex';
    bg.querySelector('#wd-m-cls').onclick = () => { bg.style.display = 'none'; bg.innerHTML = ''; };
    bg.onclick = e => { if (e.target === bg) { bg.style.display = 'none'; bg.innerHTML = ''; } };
    const actBtn = bg.querySelector('#wd-m-act');
    if (actBtn) actBtn.onclick = () => {
      bg.style.display = 'none'; bg.innerHTML = '';
      if (a.equipped)            _doAction(scene, 'unequip',  a, wp);
      else if (a.owned)          _doAction(scene, 'equip',    a, wp);
      else if (a.type === 'usdt') _doAction(scene, 'buy_usdt', a, wp);
      else                        _doAction(scene, 'buy',      a, wp);
    };
  }

  /* ── HTML-уведомление внутри оверлея (видно поверх canvas) ── */
  function _notify(msg, ok = true) {
    let el = document.getElementById('wd-notify');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wd-notify';
      el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;padding:9px 18px;border-radius:12px;font-size:13px;font-weight:700;pointer-events:none;transition:opacity .3s;max-width:300px;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = ok ? 'rgba(21,128,61,.92)' : 'rgba(185,28,28,.92)';
    el.style.color = ok ? '#86efac' : '#fca5a5';
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
  }

  /* ── api actions ── */
  async function _doAction(scene, action, item, wp) {
    if (scene._wardrobeHtmlBusy) return;
    scene._wardrobeHtmlBusy = true;
    try {
      let res = null;
      if (action === 'buy')     res = await post('/api/wardrobe/buy',    { class_id: item.id });
      if (action === 'equip')   res = await post('/api/wardrobe/equip',  { class_id: item._realId || item.id });
      if (action === 'unequip') res = await post('/api/wardrobe/unequip', {});
      if (action === 'buy_usdt') {
        _notify('⏳ Создаём счёт…', true);
        res = await post('/api/wardrobe/usdt/buy-invoice', {});
        if (res?.ok && res.invoice_url) {
          const _url = res.invoice_url || '';
          try {
            if (_url.startsWith('https://t.me/') || _url.startsWith('tg://'))
              window.Telegram?.WebApp?.openTelegramLink?.(_url);
            else
              window.Telegram?.WebApp?.openLink?.(_url);
          } catch (_) {}
          if (_url && !_url.startsWith('tg://')) window.open(_url, '_blank');
          _notify('💳 Счёт открыт — оплатите и вернитесь');
          if (res.invoice_id) _pollUsdtSlot(scene, res.invoice_id, 0);
        } else {
          const errMsg = res?.reason || res?.message || 'Ошибка создания счёта';
          _notify('❌ ' + errMsg, false);
          tg?.showAlert?.(errMsg);
        }
        scene._wardrobeHtmlBusy = false; return;
      }
      if (res?.ok) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        const msg = action==='buy' ? '✅ Броня получена' : action==='unequip' ? '✅ Броня снята' : '✅ Броня надета';
        _notify(msg);
        WardrobeHTML.refresh(scene, res);
      } else { _notify('❌ ' + (res?.message || res?.reason || 'Ошибка'), false); }
    } catch { _notify('❌ Ошибка сети', false); }
    scene._wardrobeHtmlBusy = false;
  }

  /* ── attach grid events ── */
  function _attachEvents(scene, wp, items) {
    const grid = document.getElementById('wd-grid');
    if (!grid) return;
    grid.onclick = e => {
      const btn  = e.target.closest('[data-act]');
      const card = e.target.closest('.wd-card');
      if (btn) {
        e.stopPropagation();
        const a = items.find(x => x.id === btn.dataset.id);
        if (a) _doAction(scene, btn.dataset.act, a, wp);
        return;
      }
      if (card) {
        const a = items.find(x => x.id === card.dataset.id);
        if (a) _openModal(scene, a, wp);
      }
    };
  }

  /* ── build items from payload ── */
  function _mergePayload(wp) {
    const eqId  = wp?.equipped_class?.class_id || '';
    const avail = wp?.available_classes || {};
    const owned = new Set();
    ['free','gold','diamonds'].forEach(t => (avail[t]||[]).forEach(c => { if (c.owned) owned.add(c.class_id); }));
    (wp?.inventory || []).forEach(i => owned.add(i.class_id));

    // USDT слот: бэкенд создаёт usdt_custom_{uid}_{n}, фронтенд показывает legendary_usdt
    const usdtItem = (wp?.usdt_items || []).length > 0
      ? wp.usdt_items[0]
      : (wp?.inventory || []).find(i => i.class_type === 'usdt');

    return W.ARMORS_DATA.map(a => {
      if (a.id === 'legendary_usdt') {
        return {
          ...a,
          owned:    !!usdtItem,
          equipped: !!usdtItem && (!!usdtItem.equipped || usdtItem.class_id === eqId),
          _realId:  usdtItem?.class_id || a.id,
        };
      }
      return {
        ...a,
        owned:    owned.has(a.id),
        equipped: a.id === eqId || !!(wp?.inventory||[]).find(i => i.class_id === a.id && i.equipped),
      };
    });
  }

  /* ── render view ── */
  function _renderView(scene, wp, view) {
    const items   = _mergePayload(wp);
    const visible = view === 'owned' ? items.filter(a => a.owned || a.equipped) : items;
    const grid    = document.getElementById('wd-grid');
    if (!grid) return;
    grid.innerHTML = W._buildGrid(visible, view);
    _attachEvents(scene, wp, items);
  }

  /* ── open ── */
  function open(scene, wp) {
    W._injectCSS();
    close();
    let view = scene._wardrobeView || 'all';

    const wrap = document.createElement('div');
    wrap.id = 'wd-root';
    wrap.className = 'wd-overlay';
    wrap.innerHTML = `
      <div class="wd-panel">
        <div class="wd-head">
          <span class="wd-title">🛡 Броня</span>
          <button class="wd-close" id="wd-close-btn">✕</button>
        </div>
        <div class="wd-tabs">
          <div class="wd-tab${view==='all'?' active':''}"   id="wd-tab-all"><span>⚔️ Вся броня</span></div>
          <div class="wd-tab${view==='owned'?' active':''}" id="wd-tab-owned"><span>🎒 Арсенал</span></div>
        </div>
        <div class="wd-grid" id="wd-grid"></div>
        <div class="wd-modal-bg" id="wd-modal-bg" style="display:none"></div>
      </div>`;
    document.body.appendChild(wrap);

    _renderView(scene, wp, view);

    const switchTab = v => {
      view = v; scene._wardrobeView = v;
      document.querySelectorAll('.wd-tab').forEach(t => t.classList.remove('active'));
      document.getElementById(`wd-tab-${v}`)?.classList.add('active');
      _renderView(scene, wp, v);
    };
    document.getElementById('wd-tab-all').onclick   = () => switchTab('all');
    document.getElementById('wd-tab-owned').onclick = () => switchTab('owned');
    document.getElementById('wd-close-btn').onclick = () => scene._closeAvatarOverlay?.();
    wrap.addEventListener('touchmove', e => e.stopPropagation(), { passive: false });
  }

  /* ── close ── */
  function close() {
    document.getElementById('wd-root')?.remove();
  }

  /* ── refresh after action ── */
  function refresh(scene, wp) {
    const view = scene._wardrobeView || 'all';
    _renderView(scene, wp, view);
  }

  /* ── USDT polling after CryptoPay ── */
  async function _pollUsdtSlot(scene, invoiceId, attempt) {
    if (attempt >= 24 || !document.getElementById('wd-root')) return;
    setTimeout(async () => {
      try {
        const r = await get(`/api/shop/crypto_check/${invoiceId}`);
        if (r?.ok && r.paid && r.usdt_slot_created) {
          _notify('🎉 Легендарный образ получен!');
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
          try {
            const wp = await get('/api/wardrobe');
            if (wp?.ok) WardrobeHTML.refresh(scene, wp);
          } catch (_) {}
          return;
        }
        if (r?.ok && r.paid) return; // оплачен, но создание ещё в процессе
      } catch (_) {}
      if (document.getElementById('wd-root')) _pollUsdtSlot(scene, invoiceId, attempt + 1);
    }, 5000);
  }

  Object.assign(WardrobeHTML, { open, close, refresh });
})();
