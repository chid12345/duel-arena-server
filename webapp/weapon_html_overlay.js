/* ============================================================
   Weapon HTML Overlay — покупка/экипировка оружия
   Аналог wardrobe_html_overlay+actions, но для слота weapon.
   CSS берём из WardrobeHTML (уже загружен).
   ============================================================ */
(() => {

const WEAPON_IMG = {
  common:  'foto/оружие/меч/бесплатный.png',
  rare:    'foto/оружие/меч/золото.png',
  epic:    'foto/оружие/меч/алмазы.png',
};

const WEAPONS_DATA = [
  { id:'sword_iron',  r:'common', name:'Железный меч',  stars:'★☆☆☆', tier:'ОБЫЧНЫЙ',    atk:8,  crit:0, type:'gold',     price:'💰 300'  },
  { id:'sword_steel', r:'rare',   name:'Стальной меч',   stars:'★★☆☆', tier:'РЕДКИЙ',     atk:20, crit:0, type:'gold',     price:'💰 1200' },
  { id:'sword_chaos', r:'epic',   name:'Клинок Хаоса',   stars:'★★★☆', tier:'ЭПИЧЕСКИЙ',  atk:40, crit:0, type:'diamonds', price:'💎 25'   },
];

const RARITY_COLOR = { common:'#9ca3af', rare:'#60a5fa', epic:'#c084fc', mythic:'#fb923c' };
const RARITY_LABEL = { common:'Обычный',  rare:'Редкий',  epic:'Эпический', mythic:'Мифический' };

/* ── Убираем чёрный фон PNG через Canvas ── */
function _removeDarkBg(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  try {
    const d = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4)
      if (d.data[i] < 40 && d.data[i+1] < 40 && d.data[i+2] < 40) d.data[i+3] = 0;
    ctx.putImageData(d, 0, 0);
    img.src = c.toDataURL();
  } catch(_) {}
}

/* ── Пилюли статов ── */
function _pills(w) {
  let h = '';
  if (w.atk  > 0) h += `<span class="wd-pill p-s">⚔️ +${w.atk} атк</span>`;
  if (w.crit > 0) h += `<span class="wd-pill p-i">💥 +${w.crit} крит</span>`;
  return h || `<span style="color:#4b5563;font-size:8px">—</span>`;
}

/* ── Блок с изображением ── */
function _imgArea(w) {
  const src = WEAPON_IMG[w.r] || '';
  return `<div class="wd-img-area">
    <div class="wd-img-wrap">
      <img src="${src}" class="wd-card-img" loading="eager" decoding="async"
        onerror="this.style.display='none'"
        onload="WeaponHTML._removeDarkBg(this)" />
    </div>
    <div class="wd-img-fade"></div>
  </div>`;
}

/* ── Кнопка карточки ── */
function _btnHtml(w) {
  if (w.equipped)
    return `<button class="wd-btn btn-uneq" data-act="unequip" data-id="${w.id}">✅ Снять</button>`;
  if (w.type === 'gold')
    return `<button class="wd-btn btn-gold" data-act="buy" data-id="${w.id}">💰 Купить — ${w.price.replace('💰 ','')}</button>`;
  if (w.type === 'diamonds')
    return `<button class="wd-btn btn-dia" data-act="buy" data-id="${w.id}">💎 Купить — ${w.price.replace('💎 ','')}</button>`;
  return `<button class="wd-btn btn-eq" data-act="buy" data-id="${w.id}">⚔️ Выбрать</button>`;
}

/* ── HTML одной карточки ── */
function _cardHtml(w) {
  const nc = w.r === 'epic' ? ' epic' : '';
  const rc = RARITY_COLOR[w.r] || '#aaa';
  return `<div class="wd-card rarity-${w.r}${w.equipped?' equipped':''}" data-id="${w.id}">
    ${w.equipped ? '<div class="wd-eq-badge">✅ Надет</div>' : ''}
    ${_imgArea(w)}
    <div class="wd-card-body">
      <div class="wd-name${nc}">${w.name}</div>
      <div class="wd-rarity-row">
        <span class="wd-rarity-badge" style="color:${rc}">${RARITY_LABEL[w.r]}</span>
        <span class="wd-stars" style="color:${rc}">${w.stars}</span>
      </div>
      <div class="wd-pills">${_pills(w)}</div>
      ${_btnHtml(w)}
    </div>
  </div>`;
}

/* ── Уведомление ── */
function _notify(msg, ok = true) {
  let el = document.getElementById('wd-notify');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id:'wd-notify' });
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

/* ── API вызовы ── */
async function _doAction(scene, action, item) {
  if (scene._weaponBusy) return;
  scene._weaponBusy = true;
  try {
    let res = null;
    if (action === 'buy')     res = await post('/api/equipment/equip',   { item_id: item.id, slot: 'weapon' });
    if (action === 'unequip') res = await post('/api/equipment/unequip', { slot: 'weapon' });
    if (res?.ok) {
      if (res.player)    { State.player = res.player; State.playerLoadedAt = Date.now(); }
      if (res.equipment) State.equipment = res.equipment;
      tg?.HapticFeedback?.notificationOccurred('success');
      _notify(action === 'unequip' ? '✅ Оружие снято' : '✅ Оружие надето');
      _renderGrid(scene);
    } else {
      _notify('❌ ' + (res?.reason || 'Ошибка'), false);
    }
  } catch(_) { _notify('❌ Ошибка сети', false); }
  scene._weaponBusy = false;
}

/* ── Рендер сетки с учётом текущего State ── */
function _renderGrid(scene) {
  const grid = document.getElementById('wn-grid');
  if (!grid) return;
  const eqId = (State.equipment?.weapon || {}).item_id || '';
  const items = WEAPONS_DATA.map(w => ({ ...w, equipped: w.id === eqId }));

  const groups = [
    { key:'common', label:'ОБЫЧНОЕ'   },
    { key:'rare',   label:'РЕДКОЕ'    },
    { key:'epic',   label:'ЭПИЧЕСКОЕ' },
  ];
  grid.innerHTML = groups.map(g => {
    const list = items.filter(w => w.r === g.key);
    if (!list.length) return '';
    return `<div class="wd-sep" style="color:${RARITY_COLOR[g.key]}">${g.label}</div>
            <div class="wd-card-group">${list.map(_cardHtml).join('')}</div>`;
  }).join('');

  grid.querySelectorAll('.wd-card-img').forEach(img => {
    if (img.complete && img.naturalWidth) _removeDarkBg(img);
  });

  grid.onclick = e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    const w = items.find(x => x.id === btn.dataset.id);
    if (w) _doAction(scene, btn.dataset.act, w);
  };
}

/* ── Открыть оверлей ── */
function open(scene) {
  if (typeof WardrobeHTML !== 'undefined') WardrobeHTML._injectCSS();
  close();

  const wrap = document.createElement('div');
  wrap.id = 'wn-root';
  wrap.className = 'wd-overlay';
  wrap.innerHTML = `
    <div class="wd-panel">
      <div class="wd-head">
        <span class="wd-title">⚔️ Оружие</span>
        <button class="wd-close" id="wn-close-btn">✕</button>
      </div>
      <div class="wd-grid" id="wn-grid"></div>
    </div>`;
  document.body.appendChild(wrap);

  _renderGrid(scene);

  document.getElementById('wn-close-btn').onclick = () => {
    close();
    tg?.HapticFeedback?.impactOccurred('light');
    State.playerLoadedAt = 0;
    scene.scene.start('Menu', { returnTab: 'profile' });
  };
  wrap.addEventListener('touchmove', e => e.stopPropagation(), { passive: false });
}

function close() { document.getElementById('wn-root')?.remove(); }

window.WeaponHTML = { open, close, _removeDarkBg };
})();
