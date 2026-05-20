/* ============================================================
   Upgrade Modal — общая модалка апгрейда для шмота (Этап 4F)
   Используется helmet/shield/ring/boots/weapon_html_overlay.js
   API: window.UpgradeModal.show(itemId, opts)
       opts.onClose — callback после закрытия (refresh card UI)
       opts.itemName — название (для заголовка)
       opts.itemImg  — URL картинки (опционально)
   ============================================================ */
(() => {
'use strict';

const CSS = `
.um-ov{position:fixed;inset:0;z-index:10500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);animation:umFade .2s ease}
@keyframes umFade{from{opacity:0}to{opacity:1}}
.um-box{width:min(360px,92vw);max-height:88vh;overflow-y:auto;background:linear-gradient(135deg,#1b0f33,#0a0617);border:1px solid rgba(0,240,255,.3);border-radius:18px;box-shadow:0 8px 32px rgba(0,200,255,.3);padding:18px;color:#e6f7ff;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}
.um-title{font-size:15px;font-weight:800;text-align:center;margin-bottom:6px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.um-plus{text-align:center;font-size:24px;font-weight:900;color:#ffd55a;margin-bottom:14px;letter-spacing:1px}
.um-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:12px}
.um-row:last-child{border-bottom:none}
.um-lab{color:#90a8c0}
.um-val{font-weight:700;color:#e6f7ff}
.um-chance{font-size:18px;font-weight:800;text-align:center;margin:12px 0;padding:8px;border-radius:10px;background:rgba(0,240,255,.08)}
.um-chance.risk{background:rgba(255,80,80,.12);color:#ff8888}
.um-btn{width:100%;padding:13px;border-radius:12px;font-size:14px;font-weight:800;border:none;cursor:pointer;margin-top:8px;transition:transform .1s;-webkit-tap-highlight-color:transparent}
.um-btn:active{transform:scale(.97)}
.um-btn.primary{background:linear-gradient(135deg,#0099ff,#0066cc);color:#fff}
.um-btn.danger{background:linear-gradient(135deg,#5a2020,#922424);color:#fcc}
.um-btn.ghost{background:rgba(255,255,255,.08);color:#aab}
.um-btn:disabled{opacity:.4;cursor:not-allowed}
.um-info{font-size:11px;color:#80c8ff;text-align:center;padding:6px;font-style:italic}
.um-tier{display:inline-block;padding:2px 8px;border-radius:6px;background:rgba(0,240,255,.15);color:#00f0ff;font-size:10px;font-weight:800;margin-left:6px}
.um-cf-ov{position:fixed;inset:0;z-index:10600;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);backdrop-filter:blur(4px);animation:umFade .18s ease}
.um-cf-box{width:min(320px,90vw);background:linear-gradient(135deg,#23102b,#0a0617);border:1px solid rgba(255,80,120,.45);border-radius:18px;box-shadow:0 10px 44px rgba(220,40,90,.3),0 0 28px rgba(255,60,110,.12);padding:20px 18px;color:#e6f7ff;text-align:center}
.um-cf-ic{font-size:34px;line-height:1;margin-bottom:8px}
.um-cf-title{font-size:16px;font-weight:900;margin-bottom:8px;background:linear-gradient(90deg,#ff6a9a,#ff3ba8);-webkit-background-clip:text;background-clip:text;color:transparent}
.um-cf-text{font-size:12.5px;color:#b9c7d8;line-height:1.55;margin-bottom:16px}
.um-cf-text b{color:#ffd55a}
.um-cf-text .danger{color:#ff8aa3}
.um-cf-btns{display:flex;gap:10px}
.um-cf-btn{flex:1;padding:12px;border-radius:12px;font-size:13px;font-weight:800;border:none;cursor:pointer;transition:transform .1s;-webkit-tap-highlight-color:transparent}
.um-cf-btn:active{transform:scale(.96)}
.um-cf-btn.cancel{background:rgba(255,255,255,.1);color:#aebccf}
.um-cf-btn.go{background:linear-gradient(135deg,#7a1f2f,#c62842);color:#fff}
`;
let _styleInjected = false;
function _injectStyle() {
  if (_styleInjected) return;
  const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
  _styleInjected = true;
}

let _busy = false;

function _toast(msg, ok = true) {
  let el = document.getElementById('um-toast');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: 'um-toast' });
    el.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:11000;padding:10px 18px;border-radius:14px;font-size:13px;font-weight:700;max-width:290px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.55);transition:opacity .22s';
    document.body.appendChild(el);
  }
  clearTimeout(el._t);
  el.textContent = msg;
  el.style.background = ok ? 'rgba(16,120,55,.97)' : 'rgba(180,25,25,.97)';
  el.style.color = ok ? '#a7f3c0' : '#fecaca';
  el.style.opacity = '1';
  el._t = setTimeout(() => el.style.opacity = '0', 2400);
}

async function _fetchPreview(itemId) {
  try { return await get('/api/upgrade/preview', { item_id: itemId }); }
  catch (_) { return { ok: false, reason: 'Сеть' }; }
}

function _renderModal(preview, opts) {
  const tier = preview.tier;
  const cur = preview.current_plus;
  const tgt = preview.target_plus;
  const can = preview.can_attempt;
  const chance = Math.round((preview.chance || 0) * 100);
  const risk = chance < 100;
  const dismantleQty = preview.dismantle_shards;
  const enoughGold = preview.player_gold >= preview.gold_cost;
  const enoughShards = preview.player_shards >= preview.shards_cost;
  const canBuy = can && enoughGold && enoughShards;

  const title = (opts.itemName || 'Апгрейд') + `<span class="um-tier">${tier}</span>`;

  let rows = '';
  if (can) {
    rows = `
      <div class="um-row"><span class="um-lab">Текущий уровень</span><span class="um-val">+${cur}</span></div>
      <div class="um-row"><span class="um-lab">Следующий шаг</span><span class="um-val">+${tgt}</span></div>
      <div class="um-row"><span class="um-lab">Цена золотом</span><span class="um-val">${preview.gold_cost}🪙 (у вас ${preview.player_gold})</span></div>
      <div class="um-row"><span class="um-lab">Цена шардами</span><span class="um-val">${preview.shards_cost} ${tier} (у вас ${preview.player_shards})</span></div>
      <div class="um-chance${risk ? ' risk' : ''}">Шанс успеха: ${chance}%${risk ? ` (риск ${100 - chance}%)` : ''}</div>
    `;
  } else {
    rows = `<div class="um-info">${preview.reason || 'Апгрейд недоступен'}</div>
      <div class="um-row"><span class="um-lab">Текущий уровень</span><span class="um-val">+${cur}</span></div>`;
  }

  const html = `
    <div class="um-ov" id="um-root">
      <div class="um-box">
        <div class="um-title">🔨 ${title}</div>
        <div class="um-plus">+${cur}${can ? ` → +${tgt}` : ''}</div>
        ${rows}
        ${can ? `<button class="um-btn primary" id="um-do" ${canBuy ? '' : 'disabled'}>🔨 Прокачать +${tgt}</button>` : ''}
        <button class="um-btn danger" id="um-dis">♻️ Разобрать (+${dismantleQty} шардов ${tier})</button>
        <button class="um-btn ghost" id="um-close">Закрыть</button>
      </div>
    </div>`;
  return html;
}

function _close() {
  const el = document.getElementById('um-root');
  if (el) el.remove();
}

// Перерисовать открытый оверлей снаряжения (после разборки/прокачки), чтобы
// потраченный предмет исчез, а уровень +N обновился. refresh() у каждого
// оверлея сам проверяет, открыт ли он, — безопасно дёрнуть все.
function _refreshOpenEquipOverlay() {
  ['HelmetHTML', 'ShieldHTML', 'RingHTML', 'BootsHTML', 'WeaponHTML', 'Armor2HTML']
    .forEach(ns => { try { window[ns]?.refresh?.(); } catch (_) {} });
}

// Закрыть открытую карточку-деталь (любого слота) — после разборки предмета
// уже нет, и стоящая поверх сетки деталь показывала бы удалённую вещь.
function _closeDetailPopups() {
  ['a2d', 'hnd', 'shd', 'rgd', 'bnd', 'wnd'].forEach(p => {
    try { document.getElementById(p + '-backdrop')?.remove(); } catch (_) {}
  });
}

// Красивое подтверждение разборки в стиле игры (вместо системного confirm).
function _confirmDismantle({ itemName, qty, tier }) {
  return new Promise(resolve => {
    _injectStyle();
    const ov = document.createElement('div');
    ov.className = 'um-cf-ov';
    ov.innerHTML = `
      <div class="um-cf-box">
        <div class="um-cf-ic">♻️</div>
        <div class="um-cf-title">Разобрать предмет?</div>
        <div class="um-cf-text">
          «${itemName}» <span class="danger">исчезнет навсегда</span>.<br>
          Взамен получишь <b>+${qty} ${tier ? 'шардов ' + tier : 'шардов'}</b>.
        </div>
        <div class="um-cf-btns">
          <button class="um-cf-btn cancel" id="umc-no">Отмена</button>
          <button class="um-cf-btn go" id="umc-yes">♻️ Разобрать</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const done = v => { ov.remove(); resolve(v); };
    ov.querySelector('#umc-no').onclick = () => done(false);
    ov.querySelector('#umc-yes').onclick = () => done(true);
    ov.addEventListener('click', e => { if (e.target === ov) done(false); });
  });
}

async function _doApply(itemId, opts) {
  if (_busy) return;
  _busy = true;
  try {
    const r = await post('/api/upgrade/apply', { item_id: itemId });
    if (!r?.ok) { _toast('❌ ' + (r?.reason || 'Ошибка'), false); _busy = false; return; }
    if (r.success) {
      _toast(`✅ Успех! +${r.new_plus}`, true);
      tg?.HapticFeedback?.notificationOccurred('success');
    } else {
      _toast(`❌ Провал. Шанс был ${Math.round(r.chance_was * 100)}%`, false);
      tg?.HapticFeedback?.notificationOccurred('error');
    }
    if (r.player) { State.player = r.player; State.playerLoadedAt = Date.now(); }
    if (r.shards) { State.shards = r.shards; }
    if (typeof r.new_plus === 'number') { State.itemPlus = State.itemPlus || {}; State.itemPlus[itemId] = r.new_plus; }
    _busy = false;
    // Обновляем карточку под модалкой (новый +N и усиленные статы).
    _refreshOpenEquipOverlay();
    // Перерендерить модалку с новыми данными
    const fresh = await _fetchPreview(itemId);
    if (fresh?.ok) {
      _close();
      document.body.insertAdjacentHTML('beforeend', _renderModal(fresh, opts));
      _bindEvents(itemId, opts, fresh);
    } else {
      _close();
      opts?.onClose?.();
    }
  } catch (e) { _busy = false; _toast('❌ Ошибка', false); }
}

async function _doDismantle(itemId, opts) {
  if (_busy) return;
  _busy = true;
  try {
    const r = await post('/api/upgrade/dismantle', { item_id: itemId });
    if (!r?.ok) { _toast('❌ ' + (r?.reason || 'Ошибка'), false); _busy = false; return; }
    _toast(`♻️ +${r.shards_gained} шардов ${r.tier}`, true);
    tg?.HapticFeedback?.notificationOccurred('success');
    // Предмет потрачен — обновляем коллекцию/экипировку, чтобы он сразу пропал.
    if (r.shards) State.shards = r.shards;
    if (Array.isArray(r.owned_weapons)) State.ownedWeapons = r.owned_weapons;
    if (Array.isArray(r.owned_armor2)) State.ownedArmor2 = r.owned_armor2;
    if (r.equipment) State.equipment = r.equipment;
    _busy = false;
    _close();
    _closeDetailPopups();
    opts?.onClose?.();
    _refreshOpenEquipOverlay();
    try { window.SetBonusPage?.refresh?.(); } catch (_) {}
  } catch (e) { _busy = false; _toast('❌ Ошибка', false); }
}

function _bindEvents(itemId, opts, preview) {
  document.getElementById('um-close')?.addEventListener('click', () => { _close(); opts?.onClose?.(); });
  document.getElementById('um-do')?.addEventListener('click', () => _doApply(itemId, opts));
  document.getElementById('um-dis')?.addEventListener('click', async () => {
    const ok = await _confirmDismantle({
      itemName: opts.itemName || 'Предмет',
      qty: preview?.dismantle_shards ?? '',
      tier: preview?.tier || '',
    });
    if (ok) _doDismantle(itemId, opts);
  });
}

async function show(itemId, opts = {}) {
  _injectStyle();
  _close();
  const preview = await _fetchPreview(itemId);
  if (!preview?.ok) { _toast('❌ ' + (preview?.reason || 'Ошибка'), false); return; }
  // Запоминаем текущий +N — карточки снаряжения показывают его и усиленные статы.
  if (typeof preview.current_plus === 'number') {
    State.itemPlus = State.itemPlus || {};
    State.itemPlus[itemId] = preview.current_plus;
  }
  document.body.insertAdjacentHTML('beforeend', _renderModal(preview, opts));
  _bindEvents(itemId, opts, preview);
}

window.UpgradeModal = { show };

// Глобальный делегированный listener: ловит клик на любую кнопку с
// data-act="upgrade" из 5 overlay-файлов (helmet/shield/ring/boots/weapon).
// Capture phase — срабатывает РАНЬШЕ grid.onclick в overlay → блокирует
// дублирующее срабатывание «надеть/снять».
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act="upgrade"][data-id]');
  if (!btn) return;
  e.stopPropagation();
  e.preventDefault();
  const id = btn.dataset.id;
  const name = btn.closest('.wd-card')?.querySelector('.wd-name')?.textContent || 'Предмет';
  show(id, {
    itemName: name,
    onClose: () => {
      // Шлём событие — overlay может его слушать чтобы перерендериться.
      try { window.dispatchEvent(new CustomEvent('upgrade-changed', { detail: { itemId: id } })); } catch (_) {}
    },
  });
}, true);
})();
