/* ============================================================
   legendary_armor2/overlay.js — STATS / PASSIVES, _render,
   open/close, регистрация window.LegendaryArmor2.

   Загружается ПОСЛЕДНИМ из модулей legendary_armor2/*.
   ============================================================ */
(() => {

  const N = window.LA2;

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

  N._render = function (mods, owned) {
    const root = document.getElementById('la2-root');
    if (!root) return;
    const locked = !!(mods && mods.applied);
    const free = mods ? Number(mods.free_stats_left || 0) : 19;
    const passive = (mods && mods.passive_type) || '';

    if (!owned) {
      root.querySelector('.la2-body').innerHTML = `
        <div style="text-align:center;padding:24px 12px">
          <img src="armor_mythic4.png?v=17.62" alt="Доспех Светоносного Бога" style="width:120px;height:120px;object-fit:contain;margin:0 auto 10px;display:block;filter:drop-shadow(0 0 14px rgba(60,208,132,.55))">
          <div style="font-size:14px;font-weight:700;color:#3cd084;margin-bottom:4px">Доспех Светоносного Бога</div>
          <div style="font-size:11px;color:#a0c8ff;line-height:1.5;margin-bottom:16px">
            +19 свободных статов · выбор боевой пассивки · кастомное имя
          </div>
          <button class="wd-btn btn-mythic" data-act="buy_usdt" style="width:100%;padding:12px;font-size:13px;margin-bottom:8px">
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
        <button class="la2-stat-btn" data-act="untrain" data-stat="${s.key}" ${minusOn ? '' : 'disabled'}
          style="width:26px;height:24px;border-radius:6px;border:none;font-size:13px;font-weight:700;margin-left:6px;background:${minusOn ? '#5a2020' : '#1e1e2e'};color:${minusOn ? '#e06464' : '#44445a'}">−</button>
        <button class="la2-stat-btn" data-act="train" data-stat="${s.key}" ${plusOn ? '' : 'disabled'}
          style="width:26px;height:24px;border-radius:6px;border:none;font-size:13px;font-weight:700;margin-left:4px;background:${plusOn ? '#1a5a1a' : '#1e1e2e'};color:${plusOn ? '#44dd44' : '#44445a'}">+</button>
      </div>`;
    }).join('');

    const passiveRows = PASSIVES.map(p => {
      const active = passive === p.key;
      return `<button class="la2-pass-btn" data-act="passive" data-key="${p.key}" ${locked ? 'disabled' : ''}
        style="display:block;width:100%;padding:8px;margin-bottom:4px;border-radius:6px;border:1px solid ${active ? '#3cd084' : '#3a3a52'};background:${active ? 'rgba(60,208,132,.18)' : 'rgba(30,28,56,.9)'};color:${active ? '#bff5ce' : '#ddddff'};font-size:11px;font-weight:600;text-align:left;cursor:${locked ? 'not-allowed' : 'pointer'}">${p.label}${active ? '  ✓' : ''}</button>`;
    }).join('');

    root.querySelector('.la2-body').innerHTML = `
      <div style="padding:12px">
        <div style="text-align:center;font-size:11px;color:${locked ? '#ffaa44' : (free > 0 ? '#ffc83c' : '#3cd084')};margin-bottom:10px;font-weight:700">
          ${locked ? '🔒 Сборка сохранена — сброс $5.99 / ⭐400' : `Вложено: ${19 - free}/19${free > 0 ? `  (ещё ${free})` : '  ✓'}`}
        </div>
        <div style="font-size:9px;color:#8899cc;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">СТАТЫ</div>
        ${rows}
        <div style="font-size:9px;color:#8899cc;text-transform:uppercase;letter-spacing:1px;margin:12px 0 6px">ПАССИВКА</div>
        ${passiveRows}
        ${locked
          ? `<div style="display:flex;gap:6px;margin-top:12px">
              <button class="wd-btn btn-uneq" data-act="reset_usdt" style="flex:1;padding:10px;font-size:11px">💳 Сброс $5.99</button>
              <button class="wd-btn btn-gold" data-act="reset_stars" style="flex:1;padding:10px;font-size:11px;background:linear-gradient(135deg,#44240e,#92400e)">⭐ Сброс 400</button>
            </div>`
          : `<button class="wd-btn btn-mythic" data-act="apply" style="width:100%;padding:10px;margin-top:12px;font-size:12px;${(free > 0 || !passive) ? 'opacity:.5' : ''}" ${(free > 0 || !passive) ? 'disabled' : ''}>✅ Сохранить сборку</button>`
        }
      </div>`;
  };

  function open(_scene, onClose) {
    close();
    N._onCloseCb = onClose || null;
    const wrap = document.createElement('div');
    wrap.id = 'la2-root';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:20px';
    wrap.innerHTML = `
      <div style="background:linear-gradient(160deg,#1a1430,#0c0a1a);border:1px solid #3cd084;border-radius:14px;max-width:340px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(60,208,132,.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #2a2444">
          <span style="color:#3cd084;font-weight:800;font-size:13px">💠 Легендарная броня</span>
          <button id="la2-close" style="background:#3a2030;border:1px solid #ff6688;border-radius:6px;color:#ffd8e0;width:28px;height:24px;font-size:12px;cursor:pointer">✕</button>
        </div>
        <div class="la2-body"><div style="padding:24px;text-align:center;color:#8899cc;font-size:11px">Загрузка...</div></div>
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
      N._doAction(act, params);
    });
    document.getElementById('la2-close').onclick = () => {
      close();
      if (N._onCloseCb) { try { N._onCloseCb(); } catch (_) { } }
    };
    wrap.addEventListener('touchmove', e => e.stopPropagation(), { passive: false });

    N._load();

    try {
      const pendingId = localStorage.getItem('la2PendingInvoice');
      const pendingKind = localStorage.getItem('la2PendingKind') || 'buy';
      // Resume — НЕ свежая покупка, не открывать LA2-оверлей автоматически.
      if (pendingId) N._startCryptoPolling(pendingId, pendingKind, { fresh: false });
    } catch (_) { }
  }

  function close() {
    document.getElementById('la2-root')?.remove();
  }

  window.LegendaryArmor2 = { open, close };

})();
