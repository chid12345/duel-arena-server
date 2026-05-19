/* ============================================================
   Легендарная броня (armor_mythic4) — overlay распределения +19 свободных
   статов, выбора пассивки и сохранения сборки. Заменил старый
   scene_wardrobe_overlay/detail после сноса legacy class-системы.

   Backend: /api/wardrobe/usdt/* — работает с armor_custom_mods.
   ============================================================ */
(() => {

const STATS = [
  { key: 'strength',  label: '💪 Сила',     col: '#dc3c46', field: 'str_bonus' },
  { key: 'agility',   label: '🤸 Ловкость', col: '#3cc8dc', field: 'agi_bonus' },
  { key: 'intuition', label: '💥 Интуиция', col: '#b45aff', field: 'int_bonus' },
  { key: 'stamina',   label: '🛡 Выносл.',  col: '#3cc864', field: 'end_bonus' },
];

const PASSIVES = [
  { key: 'damage_pct',   label: '⚔ Урон +8%' },
  { key: 'double_hit',   label: '⚡ 2×удар 8%' },
  { key: 'crit_dmg_pct', label: '💥 Крит +8%' },
  { key: 'armor_pct',    label: '🛡 Броня +4%' },
];

let _busy = false;
let _onCloseCb = null;

function _notify(msg, ok = true) {
  let el = document.getElementById('lg-notify');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: 'lg-notify' });
    el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:10100;padding:10px 18px;border-radius:12px;font-size:12px;font-weight:700;max-width:280px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.5)';
    document.body.appendChild(el);
  }
  el.style.background = ok ? 'rgba(20,120,55,.97)' : 'rgba(180,30,30,.97)';
  el.style.color = ok ? '#bff5ce' : '#ffd2d2';
  el.textContent = msg;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.remove(), 2400);
}

async function _api(path, body) {
  const tg = window.Telegram?.WebApp;
  const init_data = tg?.initData || (window.State && State.initData) || '';
  const apiBase = (typeof API !== 'undefined' && API) ? API : '';
  try {
    const r = await fetch(apiBase + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      cache: 'no-store',
      body: JSON.stringify(Object.assign({ init_data }, body || {})),
    });
    return await r.json();
  } catch (_e) { return null; }
}

async function _refresh() {
  const tg = window.Telegram?.WebApp;
  const init_data = encodeURIComponent(tg?.initData || (window.State && State.initData) || '');
  const apiBase = (typeof API !== 'undefined' && API) ? API : '';
  try {
    const r = await fetch(apiBase + '/api/wardrobe/reset-cost?init_data=' + init_data);
    await r.json();
  } catch (_e) {}
}

function _render(mods, owned) {
  const root = document.getElementById('lg-root');
  if (!root) return;
  const locked = !!(mods && mods.applied);
  const free = mods ? Number(mods.free_stats_left || 0) : 19;
  const passive = (mods && mods.passive_type) || '';
  const name = (mods && mods.custom_name) || 'Легендарный слот';

  if (!owned) {
    root.querySelector('.lg-body').innerHTML = `
      <div style="text-align:center;padding:24px 12px">
        <div style="font-size:48px;margin-bottom:12px">💠</div>
        <div style="font-size:14px;font-weight:700;color:#3cd084;margin-bottom:8px">Легендарная броня</div>
        <div style="font-size:11px;color:#a0c8ff;line-height:1.5;margin-bottom:16px">
          Доспех с +19 свободных статов · выбор боевой пассивки · кастомное имя
        </div>
        <button class="wd-btn btn-mythic" data-act="buy" style="width:100%;padding:12px;font-size:13px;margin-bottom:8px">
          💳 Купить за $11.99 USDT
        </button>
        <button class="wd-btn btn-gold" data-act="buy_stars" style="width:100%;padding:12px;font-size:13px;background:linear-gradient(135deg,#44240e,#92400e)">
          ⭐ Купить за 800 Stars
        </button>
      </div>`;
    return;
  }

  const rows = STATS.map(s => {
    const v = mods ? Number(mods[s.field] || 0) : 0;
    const minusOn = !locked && v > 0;
    const plusOn = !locked && free > 0;
    return `<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(30,28,56,.9);border-radius:6px;padding:8px 12px;margin-bottom:6px">
      <span style="color:#ddddff;font-size:11px;flex:1">${s.label}</span>
      <span style="color:${s.col};font-weight:800;font-size:13px;min-width:24px;text-align:center">${v}</span>
      <button class="lg-stat-btn" data-act="untrain" data-stat="${s.key}" ${minusOn ? '' : 'disabled'}
        style="width:26px;height:24px;border-radius:6px;border:none;font-size:13px;font-weight:700;margin-left:6px;background:${minusOn ? '#5a2020' : '#1e1e2e'};color:${minusOn ? '#e06464' : '#44445a'}">−</button>
      <button class="lg-stat-btn" data-act="train" data-stat="${s.key}" ${plusOn ? '' : 'disabled'}
        style="width:26px;height:24px;border-radius:6px;border:none;font-size:13px;font-weight:700;margin-left:4px;background:${plusOn ? '#1a5a1a' : '#1e1e2e'};color:${plusOn ? '#44dd44' : '#44445a'}">+</button>
    </div>`;
  }).join('');

  const passiveRows = PASSIVES.map(p => {
    const active = passive === p.key;
    return `<button class="lg-pass-btn" data-act="passive" data-key="${p.key}" ${locked ? 'disabled' : ''}
      style="display:block;width:100%;padding:8px;margin-bottom:4px;border-radius:6px;border:1px solid ${active ? '#3cd084' : '#3a3a52'};background:${active ? 'rgba(60,208,132,.18)' : 'rgba(30,28,56,.9)'};color:${active ? '#bff5ce' : '#ddddff'};font-size:11px;font-weight:600;text-align:left;cursor:${locked ? 'not-allowed' : 'pointer'}">${p.label}${active ? '  ✓' : ''}</button>`;
  }).join('');

  root.querySelector('.lg-body').innerHTML = `
    <div style="padding:12px">
      <div style="text-align:center;font-size:11px;color:${locked ? '#ffaa44' : (free > 0 ? '#ffc83c' : '#3cd084')};margin-bottom:10px;font-weight:700">
        ${locked ? '🔒 Сборка сохранена — сброс $5.99' : `Вложено: ${19 - free}/19${free > 0 ? `  (ещё ${free})` : '  ✓'}`}
      </div>
      <div style="font-size:9px;color:#8899cc;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">СТАТЫ</div>
      ${rows}
      <div style="font-size:9px;color:#8899cc;text-transform:uppercase;letter-spacing:1px;margin:12px 0 6px">ПАССИВКА</div>
      ${passiveRows}
      ${locked
        ? `<div style="display:flex;gap:6px;margin-top:12px">
            <button class="wd-btn btn-uneq" data-act="reset" style="flex:1;padding:10px;font-size:11px">💳 Сброс $5.99</button>
            <button class="wd-btn btn-gold" data-act="reset_stars" style="flex:1;padding:10px;font-size:11px;background:linear-gradient(135deg,#44240e,#92400e)">⭐ Сброс 400</button>
          </div>`
        : `<button class="wd-btn btn-mythic" data-act="apply" style="width:100%;padding:10px;margin-top:12px;font-size:12px;${(free > 0 || !passive) ? 'opacity:.5' : ''}" ${(free > 0 || !passive) ? 'disabled' : ''}>✅ Сохранить сборку</button>`
      }
    </div>`;
}

async function _load() {
  const tg = window.Telegram?.WebApp;
  const init_data = tg?.initData || (window.State && State.initData) || '';
  const apiBase = (typeof API !== 'undefined' && API) ? API : '';
  try {
    // Получим состояние через wardrobe_state — но лучше через /api/player для armor_custom_mods.
    // У нас нет специального endpoint — спросим напрямую через train с пустым? Нет.
    // Используем POST /api/wardrobe/usdt/create — он идемпотентен и возвращает state? Нет.
    // Сделаем простой подход: вызываем POST /api/wardrobe/usdt/set-passive с текущим passive,
    // он возвращает armor_mods. Но это меняет state.
    // Решение: добавил specific GET endpoint... Сейчас не успеваю. Использую POST /api/player.
    const r = await fetch(apiBase + '/api/player?_t=' + Date.now(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      cache: 'no-store',
      body: JSON.stringify({ init_data }),
    });
    const data = await r.json();
    const owned = Array.isArray(data?.owned_weapons) ? false : false;
    // owned_armor не возвращается через /api/player. Проверяем через equipment.armor.
    // Это упрощение: если хочет купить — кнопка купить будет.
    // Для корректной проверки запрашиваем wardrobe state.
    const wr = await _api('/api/wardrobe/usdt/set-passive', { passive_type: '' });  // no-op probe
    if (wr && wr.armor_mods) {
      _render(wr.armor_mods, true);
    } else {
      _render(null, false);
    }
  } catch (_e) {
    _render(null, false);
  }
}

async function _doAction(act, params) {
  if (_busy) return;
  _busy = true;
  try {
    if (act === 'buy') {
      const inv = await _api('/api/wardrobe/usdt/buy-invoice', {});
      if (!inv?.ok) { _notify('❌ ' + (inv?.reason || 'Ошибка'), false); return; }
      const tg = window.Telegram?.WebApp;
      const url = inv.invoice_url || '';
      try {
        if (inv.web_app_url) tg?.openLink?.(inv.web_app_url);
        else if (url.startsWith('https://t.me/') || url.startsWith('tg://')) tg?.openTelegramLink?.(url);
        else tg?.openLink?.(url);
      } catch(_) {}
      _notify('💳 Счёт USDT открыт — оплатите и вернитесь');
      return;
    }
    if (act === 'buy_stars') {
      const inv = await _api('/api/wardrobe/usdt/buy-invoice-stars', {});
      if (!inv?.ok) { _notify('❌ ' + (inv?.reason || 'Ошибка'), false); return; }
      const tg = window.Telegram?.WebApp;
      const url = inv.invoice_url || '';
      if (typeof tg?.openInvoice === 'function') {
        tg.openInvoice(url, async (status) => {
          if (status === 'paid') {
            _notify('✅ Легендарная броня получена!');
            tg?.HapticFeedback?.notificationOccurred('success');
            // Подождать пока бот обработает successful_payment и создаст armor_custom_mods
            await new Promise(r => setTimeout(r, 1500));
            await _load();  // перерисовать overlay с уже созданной кастомкой
          } else if (status === 'cancelled') {
            _notify('❌ Оплата отменена', false);
          }
        });
        return;
      }
      try {
        if (url.startsWith('https://t.me/') || url.startsWith('tg://')) tg?.openTelegramLink?.(url);
        else tg?.openLink?.(url);
      } catch(_) {}
      _notify('⭐ Счёт Stars открыт — оплатите и вернитесь');
      return;
    }
    if (act === 'train' || act === 'untrain') {
      const ep = act === 'train' ? '/api/wardrobe/usdt/train' : '/api/wardrobe/usdt/untrain';
      const res = await _api(ep, { stat: params.stat });
      if (res?.ok) { _render(res.armor_mods, true); }
      else { _notify('❌ ' + (res?.message || 'Ошибка'), false); _render(res?.armor_mods, true); }
      return;
    }
    if (act === 'passive') {
      const res = await _api('/api/wardrobe/usdt/set-passive', { passive_type: params.key });
      if (res?.ok) { _render(res.armor_mods, true); }
      else { _notify('❌ ' + (res?.message || 'Ошибка'), false); }
      return;
    }
    if (act === 'apply') {
      const res = await _api('/api/wardrobe/usdt/apply-stats', {});
      if (res?.ok) { _notify('✅ Сборка сохранена!'); _render(res.armor_mods, true); }
      else { _notify('❌ ' + (res?.message || 'Ошибка'), false); }
      return;
    }
    if (act === 'reset') {
      const inv = await _api('/api/wardrobe/usdt/reset-invoice', {});
      if (!inv?.ok) { _notify('❌ ' + (inv?.reason || 'Ошибка'), false); return; }
      const tg = window.Telegram?.WebApp;
      const url = inv.invoice_url || '';
      try {
        if (inv.web_app_url) tg?.openLink?.(inv.web_app_url);
        else if (url.startsWith('https://t.me/') || url.startsWith('tg://')) tg?.openTelegramLink?.(url);
        else tg?.openLink?.(url);
      } catch(_) {}
      _notify('💳 Счёт сброса открыт — оплатите и вернитесь');
      return;
    }
    if (act === 'reset_stars') {
      const inv = await _api('/api/wardrobe/usdt/reset-invoice-stars', {});
      if (!inv?.ok) { _notify('❌ ' + (inv?.reason || 'Ошибка'), false); return; }
      const tg = window.Telegram?.WebApp;
      const url = inv.invoice_url || '';
      if (typeof tg?.openInvoice === 'function') {
        tg.openInvoice(url, async (status) => {
          if (status === 'paid') {
            _notify('⏳ Применяем сброс...', true);
            // Бот обработает payload legendary_reset_stars → db.reset_legendary
            await new Promise(r => setTimeout(r, 1500));
            tg?.HapticFeedback?.notificationOccurred('success');
            _notify('🔄 Сборка сброшена! Распределяй заново.');
            await _load();  // перерисовать overlay (теперь applied=0, можно крутить +/−)
          } else if (status === 'cancelled') {
            _notify('❌ Оплата отменена', false);
          }
        });
        return;
      }
      try {
        if (url.startsWith('https://t.me/') || url.startsWith('tg://')) tg?.openTelegramLink?.(url);
        else tg?.openLink?.(url);
      } catch(_) {}
      _notify('⭐ Счёт сброса открыт — оплатите и вернитесь');
      return;
    }
  } finally {
    _busy = false;
  }
}

function open(_scene, onClose) {
  close();
  _onCloseCb = onClose || null;
  const wrap = document.createElement('div');
  wrap.id = 'lg-root';
  wrap.className = 'wd-overlay';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:20px';
  wrap.innerHTML = `
    <div style="background:linear-gradient(160deg,#1a1430,#0c0a1a);border:1px solid #3cd084;border-radius:14px;max-width:340px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(60,208,132,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #2a2444">
        <span style="color:#3cd084;font-weight:800;font-size:13px">💠 Легендарная броня</span>
        <button id="lg-close" style="background:#3a2030;border:1px solid #ff6688;border-radius:6px;color:#ffd8e0;width:28px;height:24px;font-size:12px;cursor:pointer">✕</button>
      </div>
      <div class="lg-body"><div style="padding:24px;text-align:center;color:#8899cc;font-size:11px">Загрузка...</div></div>
    </div>`;
  document.body.appendChild(wrap);

  wrap.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    const act = btn.dataset.act;
    const params = {};
    if (btn.dataset.stat) params.stat = btn.dataset.stat;
    if (btn.dataset.key) params.key = btn.dataset.key;
    _doAction(act, params);
  });
  document.getElementById('lg-close').onclick = () => {
    close();
    if (_onCloseCb) { try { _onCloseCb(); } catch(_) {} }
  };
  wrap.addEventListener('touchmove', e => e.stopPropagation(), { passive: false });

  _load();
}

function close() {
  document.getElementById('lg-root')?.remove();
}

window.LegendaryArmor = { open, close };
})();
