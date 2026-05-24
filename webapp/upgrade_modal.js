/* ============================================================
   Upgrade Modal — улучшение шмота (киберпанк, система v2 без шардов)
   Используется helmet/shield/ring/boots/weapon/armor2_overlay.js
   API: window.UpgradeModal.show(itemId, opts)
       opts.onClose  — callback после закрытия (refresh card UI)
       opts.itemName — название (для заголовка)
   ============================================================ */
(() => {
'use strict';

const CSS = `
.um-ov{position:fixed;inset:0;z-index:10500;display:flex;align-items:center;justify-content:center;background:rgba(2,4,14,.78);backdrop-filter:blur(3px);animation:umFade .2s ease}
@keyframes umFade{from{opacity:0}to{opacity:1}}
.um-box{width:min(360px,92vw);max-height:90vh;overflow-y:auto;position:relative;background:linear-gradient(160deg,#120a2a 0%,#0a0617 70%);border:1px solid rgba(0,240,255,.35);border-radius:18px;box-shadow:0 8px 40px rgba(0,200,255,.28),0 0 22px rgba(255,59,168,.12) inset;padding:18px 16px;color:#e6f7ff;font-family:'Share Tech Mono',-apple-system,"Segoe UI",Roboto,sans-serif}
.um-title{font-size:15px;font-weight:800;text-align:center;margin-bottom:4px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.um-tier{display:inline-block;padding:1px 7px;border-radius:6px;background:rgba(0,240,255,.15);color:#00f0ff;font-size:10px;font-weight:800;margin-left:6px;vertical-align:middle}
.um-plus{text-align:center;font-size:30px;font-weight:900;color:#ffd55a;margin:6px 0 2px;letter-spacing:1px;text-shadow:0 0 14px rgba(255,213,90,.5)}
.um-plus .nx{color:#46ffa3;text-shadow:0 0 14px rgba(70,255,163,.5)}
.um-bar{height:6px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;margin:8px 2px 4px}
.um-bar>i{display:block;height:100%;background:linear-gradient(90deg,#00f0ff,#ff3ba8);box-shadow:0 0 8px rgba(0,240,255,.6)}
.um-prog{text-align:center;font-size:10px;color:#7da6c8;margin-bottom:10px;letter-spacing:.5px}
.um-stats{background:rgba(0,240,255,.05);border:1px solid rgba(0,240,255,.12);border-radius:12px;padding:8px 10px;margin-bottom:10px}
.um-srow{display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px}
.um-slab{color:#9fb6cc}
.um-sval{font-weight:700;color:#cfe9ff}
.um-sval .up{color:#46ffa3}
.um-sval .soon{color:#b48bff;font-size:9.5px;font-weight:600;margin-left:5px}
.um-cost{display:flex;justify-content:center;align-items:center;gap:8px;font-size:15px;font-weight:800;margin:4px 0 2px;color:#ffe79a}
.um-purse{text-align:center;font-size:10.5px;color:#7da6c8;margin-bottom:6px}
.um-free{text-align:center;font-size:11.5px;color:#46ffa3;margin:4px 0 8px;padding:5px;border-radius:9px;background:rgba(70,255,163,.08);border:1px solid rgba(70,255,163,.2)}
.um-lock{text-align:center;font-size:12px;color:#ffb38a;font-style:italic;padding:10px 4px}
.um-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}
.um-btn{padding:12px 6px;border-radius:12px;font-size:13px;font-weight:800;border:1px solid transparent;cursor:pointer;transition:transform .1s,filter .15s;-webkit-tap-highlight-color:transparent;font-family:inherit}
.um-btn:active{transform:scale(.96)}
.um-btn.p1{background:linear-gradient(135deg,#0099ff,#0066cc);color:#fff;border-color:rgba(120,220,255,.4)}
.um-btn.p10{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-color:rgba(180,150,255,.4)}
.um-btn.p25{background:linear-gradient(135deg,#c026d3,#7c3aed);color:#fff;border-color:rgba(230,150,255,.4)}
.um-btn.pmax{background:linear-gradient(135deg,#ff3ba8,#b91c5c);color:#fff;border-color:rgba(255,150,200,.5)}
.um-btn:disabled{opacity:.35;cursor:not-allowed;filter:grayscale(.4)}
.um-close{width:100%;margin-top:8px;padding:11px;border-radius:12px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:rgba(255,255,255,.08);color:#aab;font-family:inherit}
`;
let _styleInjected = false;
function _injectStyle() {
  if (_styleInjected) return;
  const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
  _styleInjected = true;
}

let _busy = false;
const ICON = { gold: '🪙', diamond: '💎' };

function _toast(msg, ok = true) {
  let el = document.getElementById('um-toast');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: 'um-toast' });
    el.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:11000;padding:10px 18px;border-radius:14px;font-size:13px;font-weight:700;max-width:300px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.55);transition:opacity .22s';
    document.body.appendChild(el);
  }
  clearTimeout(el._t);
  el.textContent = msg;
  el.style.background = ok ? 'rgba(16,120,55,.97)' : 'rgba(180,25,25,.97)';
  el.style.color = ok ? '#a7f3c0' : '#fecaca';
  el.style.opacity = '1';
  el._t = setTimeout(() => el.style.opacity = '0', 2600);
}

async function _fetchPreview(itemId) {
  try { return await get('/api/upgrade/preview', { item_id: itemId }); }
  catch (_) { return { ok: false, reason: 'Сеть' }; }
}

// Строки «что прибавится»: подпись — сейчас → станет (зелёным, если выросло).
function _statRows(p) {
  const now = p.stats_now || {}, next = p.stats_next || {}, upIn = p.stats_up_in || {};
  const fields = Array.from(new Set([...Object.keys(next), ...Object.keys(now)]));
  if (!fields.length) return '';
  const rows = fields.map(f => {
    const a = now[f], b = next[f] || a;
    if (!b) return '';
    const suf = b.pct ? '%' : '';
    const av = a ? a.value : 0;
    let right;
    if (b.value > av) {                      // вырастет уже на этом уровне
      right = `${av}${suf} <span class="up">→ ${b.value}${suf}</span>`;
    } else if (upIn[f]) {                    // подскажем, через сколько прыгнет
      right = `${b.value}${suf} <span class="soon">+1 через ${upIn[f]} ур.</span>`;
    } else {
      right = `${b.value}${suf}`;
    }
    return `<div class="um-srow"><span class="um-slab">${b.label}</span><span class="um-sval">${right}</span></div>`;
  }).join('');
  return `<div class="um-stats">${rows}</div>`;
}

function _renderModal(p, opts) {
  const cur = p.current_plus, tgt = p.target_plus, can = p.can_attempt;
  const maxp = p.max_plus || 80;
  const icon = ICON[p.currency] || '🪙';
  const purse = p.currency === 'diamond'
    ? `у вас ${p.player_diamonds}💎` : `у вас ${p.player_gold}🪙`;
  const enoughSingle = p.currency === 'diamond'
    ? p.player_diamonds >= p.cost : p.player_gold >= p.cost;
  const barPct = Math.min(100, Math.round(cur / 80 * 100));

  const title = (opts.itemName || 'Улучшение') + `<span class="um-tier">${p.tier}</span>`;
  const plusLine = can ? `+${cur} <span class="nx">→ +${tgt}</span>` : `+${cur}`;

  let body;
  if (can) {
    body = `
      ${_statRows(p)}
      <div class="um-cost">Цена: ${p.cost}${icon}</div>
      <div class="um-purse">${purse}</div>
      ${p.free_chance ? `<div class="um-free">🎁 Шанс ${Math.round(p.free_chance*100)}% улучшить бесплатно · осталось ${p.free_remaining}</div>` : ''}
      <div class="um-btns">
        <button class="um-btn p1"  id="um-1"   ${enoughSingle ? '' : 'disabled'}>+1 (${p.cost}${icon})</button>
        <button class="um-btn p10" id="um-10">+10</button>
        <button class="um-btn p25" id="um-25">+25</button>
        <button class="um-btn pmax" id="um-max">МАКС</button>
      </div>`;
  } else {
    body = `<div class="um-lock">${p.reason || 'Улучшение недоступно'}</div>`;
  }

  return `
    <div class="um-ov" id="um-root">
      <div class="um-box">
        <div class="um-title">🔧 ${title}</div>
        <div class="um-plus">${plusLine}</div>
        <div class="um-bar"><i style="width:${barPct}%"></i></div>
        <div class="um-prog">Уровень ${cur} из 80${maxp < 80 ? ` · твой потолок сейчас +${maxp}` : ''}</div>
        ${body}
        <button class="um-close" id="um-close">Закрыть</button>
      </div>
    </div>`;
}

function _close() { document.getElementById('um-root')?.remove(); }

function _refreshOpenEquipOverlay() {
  ['HelmetHTML', 'ShieldHTML', 'RingHTML', 'BootsHTML', 'WeaponHTML', 'Armor2HTML']
    .forEach(ns => { try { window[ns]?.refresh?.(); } catch (_) {} });
}

function _applyState(r, itemId) {
  if (r.player) { State.player = r.player; State.playerLoadedAt = Date.now(); }
  if (typeof r.new_plus === 'number') { State.itemPlus = State.itemPlus || {}; State.itemPlus[itemId] = r.new_plus; }
}

async function _rerender(itemId, opts) {
  // Карточку под модалкой НЕ перерисовываем на каждый ап — это тяжёлый ре-рендер
  // всей сетки каталога и подвешивает WebView. Обновим один раз при закрытии.
  const fresh = await _fetchPreview(itemId);
  _close();
  if (fresh?.ok) {
    document.body.insertAdjacentHTML('beforeend', _renderModal(fresh, opts));
    _bindEvents(itemId, opts, fresh);
  } else { opts?.onClose?.(); }
}

async function _doSingle(itemId, opts) {
  if (_busy) return; _busy = true;
  try {
    const r = await post('/api/upgrade/apply', { item_id: itemId });
    if (!r?.ok) { _toast('❌ ' + (r?.reason || 'Ошибка'), false); _busy = false; return; }
    if (r.was_free) { _toast(`🎁 Удача! Бесплатно → +${r.new_plus}`, true); tg?.HapticFeedback?.notificationOccurred('success'); }
    else { _toast(`✅ Улучшено → +${r.new_plus} (−${r.spent}${ICON[r.currency] || '🪙'})`, true); tg?.HapticFeedback?.impactOccurred('medium'); }
    _applyState(r, itemId); _busy = false;
    await _rerender(itemId, opts);
  } catch (_) { _busy = false; _toast('❌ Ошибка', false); }
}

async function _doBatch(itemId, opts, count) {
  if (_busy) return; _busy = true;
  try {
    const r = await post('/api/upgrade/apply_batch', { item_id: itemId, count });
    if (!r?.ok) { _toast('❌ ' + (r?.reason || 'Ошибка'), false); _busy = false; return; }
    const parts = [];
    if (r.gold_spent) parts.push(`−${r.gold_spent}🪙`);
    if (r.diamonds_spent) parts.push(`−${r.diamonds_spent}💎`);
    if (r.freebies) parts.push(`🎁×${r.freebies}`);
    _toast(`✅ +${r.applied} → +${r.new_plus}${parts.length ? '  ' + parts.join(' ') : ''}`, true);
    tg?.HapticFeedback?.notificationOccurred('success');
    _applyState(r, itemId); _busy = false;
    await _rerender(itemId, opts);
  } catch (_) { _busy = false; _toast('❌ Ошибка', false); }
}

function _bindEvents(itemId, opts) {
  document.getElementById('um-close')?.addEventListener('click', () => {
    _close();
    _refreshOpenEquipOverlay();  // один раз при закрытии — карточка подхватит финальный +N
    opts?.onClose?.();
  });
  document.getElementById('um-1')?.addEventListener('click', () => _doSingle(itemId, opts));
  document.getElementById('um-10')?.addEventListener('click', () => _doBatch(itemId, opts, 10));
  document.getElementById('um-25')?.addEventListener('click', () => _doBatch(itemId, opts, 25));
  document.getElementById('um-max')?.addEventListener('click', () => _doBatch(itemId, opts, 0));
}

async function show(itemId, opts = {}) {
  _injectStyle();
  _close();
  const preview = await _fetchPreview(itemId);
  if (!preview?.ok) { _toast('❌ ' + (preview?.reason || 'Ошибка'), false); return; }
  if (typeof preview.current_plus === 'number') {
    State.itemPlus = State.itemPlus || {};
    State.itemPlus[itemId] = preview.current_plus;
  }
  document.body.insertAdjacentHTML('beforeend', _renderModal(preview, opts));
  _bindEvents(itemId, opts);
}

window.UpgradeModal = { show };

// Делегированный listener: клик по кнопке data-act="upgrade" в overlay-файлах.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act="upgrade"][data-id]');
  if (!btn) return;
  e.stopPropagation();
  e.preventDefault();
  const id = btn.dataset.id;
  const name = btn.closest('.wd-card')?.querySelector('.wd-name')?.textContent || 'Предмет';
  show(id, {
    itemName: name,
    onClose: () => { try { window.dispatchEvent(new CustomEvent('upgrade-changed', { detail: { itemId: id } })); } catch (_) {} },
  });
}, true);
})();
