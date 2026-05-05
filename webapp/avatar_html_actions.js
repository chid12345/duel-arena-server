/* ============================================================
   Avatar HTML Actions — монтаж overlay, API, покупки
   ============================================================ */
(() => {
const H = () => window.AvatarHTML;

const _AV_TABS = [
  { key: 'mine',   label: 'Мои' },
  { key: 'free',   label: '🆓 Free' },
  { key: 'gold',   label: '💰 Gold' },
  { key: 'epic',   label: '💎 Epic' },
  { key: 'legend', label: '⭐ Legend' },
];

function _filterAvatars(avatars, tab) {
  if (tab === 'mine')   return avatars.filter(a => a.unlocked);
  if (tab === 'free')   return avatars.filter(a => a.tier === 'base');
  if (tab === 'gold')   return avatars.filter(a => a.tier === 'gold');
  if (tab === 'epic')   return avatars.filter(a => a.tier === 'diamond');
  if (tab === 'legend') return avatars.filter(a => a.tier === 'premium' || a.tier === 'sub' || a.tier === 'elite' || a.tier === 'referral');
  return avatars;
}

/* ── toast ── */
function _toast(msg, ok = true) {
  let el = document.getElementById('av-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'av-toast';
    el.className = 'av-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = ok ? 'rgba(21,128,61,.92)' : 'rgba(185,28,28,.92)';
  el.style.color = ok ? '#86efac' : '#fca5a5';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

/* ── fitToCanvas — позиционируем внутри canvas ── */
function _fit(root) {
  try {
    const c = document.querySelector('canvas');
    if (!c) return;
    const r = c.getBoundingClientRect();
    const canvasH = c.height || 700;
    const tabBarPx = (r.height * 76) / canvasH;
    root.style.top    = r.top + 'px';
    root.style.left   = r.left + 'px';
    root.style.width  = r.width + 'px';
    root.style.right  = 'auto';
    root.style.bottom = 'auto';
    root.style.height = Math.max(0, r.height - tabBarPx) + 'px';
    // Модальный фон тоже фиксируем
    const mb = document.getElementById('av-modal-bg');
    if (mb) {
      mb.style.top    = r.top + 'px';
      mb.style.left   = r.left + 'px';
      mb.style.width  = r.width + 'px';
      mb.style.right  = 'auto';
      mb.style.bottom = 'auto';
      mb.style.height = r.height + 'px';
    }
  } catch (_) {}
}

/* ── Открыть overlay ── */
function open(scene, avatars, equippedId, initialTab) {
  H()._injectCSS();
  close();

  const tab = initialTab || 'free';
  let curTab = tab;

  const root = document.createElement('div');
  root.id = 'av-root';
  root.className = 'av-overlay';

  // Tabs HTML
  const tabsHtml = _AV_TABS.map(t =>
    `<div class="av-tab${t.key === curTab ? ' av-active' : ''}" data-tab="${t.key}">${t.label}</div>`
  ).join('');

  root.innerHTML = `
    <div class="av-hdr">
      <span class="av-back" data-act="back">‹</span>
      <div class="av-hdr-icon">🏛️</div>
      <div class="av-hdr-txt">
        <div class="av-hdr-title">ГАЛЕРЕЯ ОБРАЗОВ</div>
        <div class="av-hdr-sub">Выбери облик своего воина</div>
      </div>
    </div>
    <div class="av-tabs" id="av-tabs">${tabsHtml}</div>
    <div class="av-grid-wrap">
      <div class="av-grid" id="av-grid"></div>
    </div>`;

  document.body.appendChild(root);
  _fit(root);

  const onResize = () => _fit(root);
  window.addEventListener('resize', onResize);
  root._onResize = onResize;

  // Блок тач-скролл от Phaser
  root.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });

  function renderGrid() {
    const list = _filterAvatars(avatars, curTab);
    document.getElementById('av-grid').innerHTML = H()._buildGrid(list, curTab);
  }
  renderGrid();

  // Клики по табам
  document.getElementById('av-tabs').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    const key = tab.dataset.tab;
    if (key === curTab) return;
    curTab = key;
    document.querySelectorAll('#av-root .av-tab').forEach(el => el.classList.remove('av-active'));
    tab.classList.add('av-active');
    renderGrid();
    try { window.Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (_) {}
  });

  // Клики по сетке (ячейки аватарок)
  document.getElementById('av-grid').addEventListener('click', e => {
    const cell = e.target.closest('[data-avid]');
    if (!cell) return;
    const av = avatars.find(a => a.id === cell.dataset.avid);
    if (!av) return;
    try { window.Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (_) {}
    _openModal(scene, av, avatars, renderGrid);
  });

  // Клик назад
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.dataset.act === 'back') {
      close();
      scene.scene.start('Menu', {});
    }
  });

  // Восстановление незавершённой крипто-оплаты
  _resumeCryptoPoll(scene, avatars, renderGrid);
}

/* ── Модальное окно ── */
function _openModal(scene, av, avatars, onUpdate) {
  document.getElementById('av-modal-bg')?.remove();

  const bg = document.createElement('div');
  bg.id = 'av-modal-bg';
  bg.className = 'av-modal-bg';
  bg.innerHTML = H()._buildModal(av);
  document.body.appendChild(bg);
  _fit(document.getElementById('av-root')); // обновляем и позицию bg

  bg.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });

  // Закрыть по фону
  bg.addEventListener('click', e => {
    if (e.target === bg) _closeModal();
  });

  bg.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const id  = el.dataset.id || av.id;
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch (_) {}
    if (act === 'close-modal' || act === 'none') { _closeModal(); return; }
    if (act === 'equip')       { _closeModal(); _doEquip(scene, av, avatars, onUpdate); return; }
    if (act === 'buy')         { _closeModal(); _doBuy(scene, av, avatars, onUpdate); return; }
    if (act === 'buy_stars')   { _closeModal(); _doBuyStars(scene, av, avatars, onUpdate); return; }
    if (act === 'buy_crypto')  { _closeModal(); _doBuyCrypto(scene, av, avatars, onUpdate); return; }
  });
}

function _closeModal() {
  const bg = document.getElementById('av-modal-bg');
  if (!bg) return;
  bg.style.opacity = '0';
  bg.style.transition = 'opacity .18s';
  setTimeout(() => bg.remove(), 200);
}

/* ── Обновляем данные аватарки в массиве ── */
function _applyAvatarsResponse(scene, resp, avatarsArr) {
  if (resp.player) State.player = resp.player;
  if (Array.isArray(resp.avatars) && resp.avatars.length) {
    // Мутируем существующий массив — все ссылки остаются актуальными
    avatarsArr.length = 0;
    resp.avatars.forEach(a => avatarsArr.push(a));
    State.avatarsCache = { avatars: [...avatarsArr], equipped: resp.equipped_avatar_id || State.avatarsCache?.equipped, at: Date.now() };
  } else {
    State.avatarsCache = null;
  }
}

/* ── API: купить (gold / diamonds / free) ── */
async function _doBuy(scene, av, avatarsArr, onUpdate) {
  try {
    const j = await post('/api/avatars/buy', { avatar_id: av.id });
    if (j.ok) {
      _applyAvatarsResponse(scene, j, avatarsArr);
      onUpdate();
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (_) {}
      _toast('✅ Образ получен!');
    } else {
      _toast('❌ ' + (j.reason || 'Ошибка'), false);
    }
  } catch (_) { _toast('❌ Ошибка сети', false); }
}

/* ── API: экипировать ── */
async function _doEquip(scene, av, avatarsArr, onUpdate) {
  try {
    const j = await post('/api/avatars/equip', { avatar_id: av.id });
    if (j.ok) {
      _applyAvatarsResponse(scene, j, avatarsArr);
      State.avatarId = av.id;
      try { localStorage.setItem('da_avatar', av.id); } catch (_) {}
      // Сбрасываем панель профиля чтобы аватарка обновилась в меню
      try { const m = scene.scene.get('Menu'); if (m?._panels?.profile) { m._panels.profile.destroy(); m._panels.profile = null; } } catch (_) {}
      onUpdate();
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (_) {}
      _toast('⚔️ Образ надет!');
    } else {
      _toast('❌ ' + (j.reason || 'Ошибка'), false);
    }
  } catch (_) { _toast('❌ Ошибка сети', false); }
}

/* ── API: Stars (invoice → openInvoice → confirm) ── */
async function _doBuyStars(scene, av, avatarsArr, onUpdate) {
  const isElite = av.currency === 'usdt_stars';
  const invoiceUrl = isElite ? '/api/avatars/elite/stars_invoice' : '/api/avatars/premium/stars_invoice';
  const confirmUrl = isElite ? '/api/avatars/elite/stars_confirm' : '/api/avatars/premium/stars_confirm';
  try {
    const j = await post(invoiceUrl, { avatar_id: av.id });
    if (!j.ok || !j.invoice_url) { _toast('❌ ' + (j.reason || 'Ошибка'), false); return; }

    if (typeof tg?.openInvoice !== 'function') {
      const u = j.invoice_url;
      try {
        if (u.startsWith('https://t.me/') || u.startsWith('tg://')) tg?.openTelegramLink?.(u);
        else tg?.openLink?.(u);
      } catch (_) {}
      if (!tg && u) try { window.open(u, '_blank'); } catch (_) {}
      _toast('⭐ Счёт Stars открыт — оплатите и вернитесь');
      return;
    }

    tg.openInvoice(j.invoice_url, async (status) => {
      if (status === 'cancelled') return;
      if (status === 'pending') {
        _toast('Платёж в обработке...');
        _pollAvatarState(scene, av.id, avatarsArr, 6, 4000, onUpdate);
        return;
      }
      if (status !== 'paid') return;
      try {
        const r = await post(confirmUrl, { avatar_id: av.id });
        if (!r.ok) {
          _toast('Оплата прошла, выдаём образ...');
          _pollAvatarState(scene, av.id, avatarsArr, 6, 3000, onUpdate);
          return;
        }
        _applyAvatarsResponse(scene, r, avatarsArr);
        onUpdate();
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (_) {}
        _toast('✅ Образ получен!');
      } catch (_) {
        _toast('Оплата прошла, проверяем выдачу...');
        _pollAvatarState(scene, av.id, avatarsArr, 6, 3000, onUpdate);
      }
    });
  } catch (_) { _toast('❌ Ошибка сети', false); }
}

/* ── API: USDT crypto (CryptoPay invoice + polling) ── */
async function _doBuyCrypto(scene, av, avatarsArr, onUpdate) {
  const isElite = av.currency === 'usdt_stars';
  const url = isElite ? '/api/avatars/elite/crypto_invoice' : '/api/avatars/premium/crypto_invoice';
  try {
    const j = await post(url, { avatar_id: av.id });
    if (!j.ok || !j.invoice_url || !j.invoice_id) { _toast('❌ ' + (j.reason || 'Ошибка'), false); return; }
    try {
      localStorage.setItem('avatarPendingInvoice', String(j.invoice_id));
      localStorage.setItem('avatarPendingId', String(av.id));
    } catch (_) {}
    const u = j.invoice_url;
    if (j.web_app_url) tg?.openLink?.(j.web_app_url);
    else if (u.includes('startapp=')) tg?.openLink?.(u);
    else tg?.openTelegramLink?.(u);
    _startCryptoPolling(scene, j.invoice_id, av.id, avatarsArr, onUpdate);
  } catch (_) { _toast('❌ Ошибка сети', false); }
}

function _startCryptoPolling(scene, invoiceId, avatarId, avatarsArr, onUpdate, silent = false) {
  let attempts = 0;
  const poll = async () => {
    attempts += 1;
    try {
      const r = await get(`/api/shop/crypto_check/${invoiceId}`);
      if (r.ok && r.paid) {
        try { localStorage.removeItem('avatarPendingInvoice'); localStorage.removeItem('avatarPendingId'); } catch (_) {}
        _pollAvatarState(scene, avatarId, avatarsArr, 4, 1500, onUpdate, !silent);
        return;
      }
    } catch (_) {}
    if (attempts < 24 && document.getElementById('av-root')) {
      setTimeout(poll, 5000);
    } else if (!silent) {
      _toast('Платёж найден, но подтверждение задерживается. Откройте образы позже.', false);
    }
  };
  setTimeout(poll, silent ? 1200 : 4000);
}

function _resumeCryptoPoll(scene, avatarsArr, onUpdate) {
  try {
    const invoiceId = parseInt(localStorage.getItem('avatarPendingInvoice') || '0', 10);
    const avatarId  = localStorage.getItem('avatarPendingId') || '';
    if (invoiceId > 0 && avatarId) {
      _startCryptoPolling(scene, invoiceId, avatarId, avatarsArr, onUpdate, true);
    }
  } catch (_) {}
}

function _pollAvatarState(scene, avatarId, avatarsArr, attempts, delayMs, onUpdate, notify = true) {
  let left = attempts;
  const tick = async () => {
    left -= 1;
    try {
      const d = await get('/api/avatars');
      if (d.ok && Array.isArray(d.avatars) && d.avatars.length) {
        _applyAvatarsResponse(scene, d, avatarsArr);
        const got = avatarsArr.some(a => a.id === avatarId && a.unlocked);
        if (got) {
          onUpdate();
          if (notify) try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch (_) {}
          if (notify) _toast('✅ Образ получен!');
          return;
        }
      }
    } catch (_) {}
    if (left > 0 && document.getElementById('av-root')) {
      setTimeout(tick, delayMs);
    }
  };
  setTimeout(tick, delayMs);
}

/* ── Закрыть overlay ── */
function close() {
  const r = document.getElementById('av-root');
  if (r?._onResize) { try { window.removeEventListener('resize', r._onResize); } catch (_) {} }
  r?.remove();
  document.getElementById('av-modal-bg')?.remove();
  document.getElementById('av-toast')?.remove();
}

Object.assign(window.AvatarHTML, { open, close, _toast });
})();
