/* ============================================================
   Weapon HTML Overlay — 4 типа × 4 тира, 2 вкладки
   CSS берём из WardrobeHTML (уже загружен).
   ============================================================ */
(() => {

const WEAPON_IMG = {
  sword_free:'weapon_sword_free.png',   sword_gold:'weapon_sword_rare.png',
  sword_diamond:'weapon_sword_epic.png',sword_mythic:'weapon_sword_mythic.png',
  axe_free:'weapon_axe_free.png',       axe_gold:'weapon_axe_rare.png',
  axe_diamond:'weapon_axe_epic.png',    axe_mythic:'weapon_axe_mythic.png',
  club_free:'weapon_club_free.png',     club_gold:'weapon_club_rare.png',
  club_diamond:'weapon_club_epic.png',  club_mythic:'weapon_club_mythic.png',
  gs_free:'weapon_gs_free.png',         gs_gold:'weapon_gs_rare.png',
  gs_diamond:'weapon_gs_epic.png',      gs_mythic:'weapon_gs_mythic.png',
};

const WEAPONS_DATA = [
  // ── Меч
  {id:'sword_free',    r:'common', wt:'⚔️ Меч',         name:'Деревянный меч',    stars:'★☆☆☆', atk:5,  crit:1,  hp:0,   pen:0,  type:'free'},
  {id:'sword_gold',    r:'rare',   wt:'⚔️ Меч',         name:'Стальной меч',       stars:'★★☆☆', atk:15, crit:3,  hp:0,   pen:1,  type:'gold',     price:'1200'},
  {id:'sword_diamond', r:'epic',   wt:'⚔️ Меч',         name:'Рунический клинок',  stars:'★★★☆', atk:30, crit:7,  hp:0,   pen:2,  type:'diamonds', price:'25'},
  {id:'sword_mythic',  r:'mythic', wt:'⚔️ Меч',         name:'Пламенный клинок',   stars:'★★★★', atk:45, crit:10, hp:0,   pen:3,  type:'mythic'},
  // ── Топор
  {id:'axe_free',      r:'common', wt:'🪓 Топор',        name:'Каменный топор',     stars:'★☆☆☆', atk:8,  crit:0,  hp:0,   pen:0,  type:'free'},
  {id:'axe_gold',      r:'rare',   wt:'🪓 Топор',        name:'Топор ополченца',    stars:'★★☆☆', atk:22, crit:0,  hp:0,   pen:1,  type:'gold',     price:'1500'},
  {id:'axe_diamond',   r:'epic',   wt:'🪓 Топор',        name:'Секира',             stars:'★★★☆', atk:40, crit:0,  hp:0,   pen:2,  type:'diamonds', price:'30'},
  {id:'axe_mythic',    r:'mythic', wt:'🪓 Топор',        name:'Топор хаоса',        stars:'★★★★', atk:58, crit:0,  hp:0,   pen:3,  type:'mythic'},
  // ── Дубина
  {id:'club_free',     r:'common', wt:'🏏 Дубина',       name:'Дубина',             stars:'★☆☆☆', atk:3,  crit:0,  hp:50,  pen:0,  type:'free'},
  {id:'club_gold',     r:'rare',   wt:'🏏 Дубина',       name:'Усиленная дубина',   stars:'★★☆☆', atk:8,  crit:0,  hp:100, pen:1,  type:'gold',     price:'1200'},
  {id:'club_diamond',  r:'epic',   wt:'🏏 Дубина',       name:'Булава',             stars:'★★★☆', atk:18, crit:0,  hp:150, pen:2,  type:'diamonds', price:'28'},
  {id:'club_mythic',   r:'mythic', wt:'🏏 Дубина',       name:'Молот колосса',      stars:'★★★★', atk:32, crit:0,  hp:170, pen:3,  type:'mythic'},
  // ── Большой меч
  {id:'gs_free',       r:'common', wt:'🗡️ Большой меч', name:'Двуручный меч',      stars:'★☆☆☆', atk:4,  crit:5,  hp:0,   pen:0,  type:'free'},
  {id:'gs_gold',       r:'rare',   wt:'🗡️ Большой меч', name:'Меч паладина',       stars:'★★☆☆', atk:10, crit:15, hp:0,   pen:1,  type:'gold',     price:'1400'},
  {id:'gs_diamond',    r:'epic',   wt:'🗡️ Большой меч', name:'Клинок хаоса',       stars:'★★★☆', atk:15, crit:25, hp:0,   pen:2,  type:'diamonds', price:'25'},
  {id:'gs_mythic',     r:'mythic', wt:'🗡️ Большой меч', name:'Тень смерти',        stars:'★★★★', atk:20, crit:35, hp:0,   pen:3,  type:'mythic'},
];

const RC = {common:'#9ca3af',rare:'#60a5fa',epic:'#c084fc',mythic:'#fb923c'};
const RL = {common:'Обычный',rare:'Редкий',epic:'Эпический',mythic:'Мифическое'};

let _currentScene = null;
const _imgCache = new Map(); // origSrc → dataUrl, живёт на всё время сессии

function _removeDarkBg(img) {
  if (img._bgDone) return;
  img._bgDone = true;
  if (!img.naturalWidth || !img.naturalHeight) return;
  const origSrc = img.src;
  if (_imgCache.has(origSrc)) {
    const cached = _imgCache.get(origSrc);
    if (cached !== origSrc) img.src = cached;
    return;
  }
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  try {
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const W = c.width, H = c.height;
    let darkCorners = 0;
    [[0,0],[W-1,0],[0,H-1],[W-1,H-1]].forEach(([x,y]) => {
      const i=(y*W+x)*4;
      const mx=Math.max(d.data[i],d.data[i+1],d.data[i+2]);
      const mn=Math.min(d.data[i],d.data[i+1],d.data[i+2]);
      if (d.data[i+3]>10 && mx<80 && mx-mn<30) darkCorners++;
    });
    if (darkCorners < 2) { _imgCache.set(origSrc, origSrc); return; }
    for (let i = 0; i < d.data.length; i += 4) {
      const r=d.data[i], g=d.data[i+1], b=d.data[i+2];
      const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
      if (mx < 72 && mx - mn < 28) d.data[i+3] = 0;
    }
    ctx.putImageData(d, 0, 0);
    const dataUrl = c.toDataURL();
    _imgCache.set(origSrc, dataUrl);
    img.src = dataUrl;
  } catch(_) {}
}

function _pills(w) {
  let h = '';
  if (w.atk  > 0) h += `<span class="wd-pill p-s">+${w.atk} атк</span>`;
  if (w.crit > 0) h += `<span class="wd-pill p-i">+${w.crit} крит</span>`;
  if (w.hp   > 0) h += `<span class="wd-pill p-e">+${w.hp} HP</span>`;
  if (w.pen  > 0) h += `<span class="wd-pill p-a">+${w.pen}% пробой</span>`;
  return h;
}

function _btn(w) {
  if (w.equipped)
    return `<button class="wd-btn btn-uneq" data-act="unequip" data-id="${w.id}">✅ Снять</button>`;
  if (w.owned && w.type !== 'free')
    return `<button class="wd-btn btn-free" data-act="buy" data-id="${w.id}">⚔️ Надеть</button>`;
  if (w.type === 'free')
    return `<button class="wd-btn btn-free" data-act="buy" data-id="${w.id}">🆓 Выбрать</button>`;
  if (w.type === 'gold')
    return `<button class="wd-btn btn-gold" data-act="buy" data-id="${w.id}">💰 ${w.price}</button>`;
  if (w.type === 'diamonds')
    return `<button class="wd-btn btn-dia" data-act="buy" data-id="${w.id}">💎 ${w.price}</button>`;
  // mythic — два варианта оплаты
  return `<div style="display:flex;gap:6px">
    <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:6px 2px" data-act="buy_usdt" data-id="${w.id}">💳 $11.99</button>
    <button class="wd-btn btn-gold"   style="flex:1;font-size:10px;padding:6px 2px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_stars" data-id="${w.id}">⭐ 590</button>
  </div>`;
}

function _card(w) {
  const nc = w.r==='epic'?' epic':w.r==='mythic'?' mythic':'';
  const src = WEAPON_IMG[w.id] || '';
  return `<div class="wd-card rarity-${w.r}${w.equipped?' equipped':''}" data-id="${w.id}">
    ${w.equipped?'<div class="wd-eq-badge">✅ Надет</div>':''}
    <div class="wd-img-area">
      <div class="wd-img-wrap">
        <img src="${src}" class="wd-card-img" loading="eager" decoding="async"
          onerror="this.style.display='none'"
          onload="WeaponHTML._removeDarkBg(this)"/>
      </div>
      <div class="wd-img-fade"></div>
    </div>
    <div class="wd-card-body">
      <div style="font-size:8px;color:#8899cc;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">${w.wt}</div>
      <div class="wd-name${nc}">${w.name}</div>
      <div class="wd-rarity-row">
        <span class="wd-rarity-badge" style="color:${RC[w.r]}">${RL[w.r]}</span>
        <span class="wd-stars" style="color:${RC[w.r]}">${w.stars}</span>
      </div>
      <div class="wd-pills">${_pills(w)}</div>
      ${_btn(w)}
    </div>
  </div>`;
}

function _notify(msg, ok=true, persist=false) {
  let el = document.getElementById('wd-notify');
  if (!el) {
    el = Object.assign(document.createElement('div'),{id:'wd-notify'});
    el.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(16px);z-index:10000;padding:10px 20px;border-radius:14px;font-size:13px;font-weight:700;pointer-events:none;transition:opacity .22s,transform .22s;max-width:290px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.55);opacity:0';
    document.body.appendChild(el);
  }
  clearTimeout(el._t);
  el.textContent=msg;
  el.style.background=ok?'rgba(16,120,55,.97)':'rgba(180,25,25,.97)';
  el.style.color=ok?'#a7f3c0':'#fecaca';
  el.style.opacity='1';
  el.style.transform='translateX(-50%) translateY(0)';
  if (!persist) el._t=setTimeout(()=>{
    el.style.opacity='0'; el.style.transform='translateX(-50%) translateY(16px)';
  }, 2800);
}

async function _doAction(scene, action, item) {
  if (scene._weaponBusy) return;
  scene._weaponBusy = true;
  try {
    // ── Stars (мифическое оружие) ──────────────────────────────
    if (action === 'buy_stars') {
      _notify('⏳ Создаём счёт Stars...', true, true);
      const invRes = await post('/api/equipment/weapon_stars_invoice', {item_id: item.id});
      if (!invRes?.ok) { _notify('❌ '+(invRes?.reason||'Ошибка'), false); scene._weaponBusy=false; return; }
      const starsUrl = invRes.invoice_url || '';
      if (typeof tg?.openInvoice === 'function') {
        // Mobile Telegram — нативная оплата с коллбэком
        tg.openInvoice(starsUrl, async (status) => {
          if (status === 'paid') {
            _notify('⏳ Активируем...', true, true);
            try {
              const conf = await post('/api/equipment/weapon_stars_confirm', {item_id: item.id});
              if (conf?.ok) {
                if (conf.player)        { State.player=conf.player; State.playerLoadedAt=Date.now(); }
                if (conf.equipment)     State.equipment=conf.equipment;
                if (conf.owned_weapons) State.ownedWeapons=conf.owned_weapons;
                tg?.HapticFeedback?.notificationOccurred('success');
                _notify('✅ Мифическое оружие получено!');
                const activeTab = document.querySelector('#wn-root ._wn-view.active');
                _render(scene, activeTab?.dataset?.wv||'all');
              } else { _notify('⚠️ Оплата прошла! Обновите профиль.', true); }
            } catch(_) { _notify('⚠️ Оплата прошла! Обновите профиль.', true); }
          } else if (status === 'cancelled') { _notify('❌ Оплата отменена', false); }
          scene._weaponBusy = false;
        });
        return;
      }
      // Fallback: Telegram Desktop / браузер — открываем ссылку
      try {
        if (starsUrl.startsWith('https://t.me/') || starsUrl.startsWith('tg://'))
          tg?.openTelegramLink?.(starsUrl);
        else tg?.openLink?.(starsUrl);
      } catch(_) {}
      if (!tg && starsUrl) try { window.open(starsUrl, '_blank'); } catch(_) {}
      _notify('⭐ Счёт Stars открыт — оплатите и вернитесь');
      scene._weaponBusy = false;
      return;
    }
    // ── USDT (мифическое оружие) ───────────────────────────────
    if (action === 'buy_usdt') {
      _notify('⏳ Создаём счёт USDT...', true, true);
      const invRes = await post('/api/equipment/weapon_crypto_invoice', {item_id: item.id});
      if (!invRes?.ok) { _notify('❌ '+(invRes?.reason||'Ошибка'), false); scene._weaponBusy=false; return; }
      const _url = invRes.invoice_url || '';
      try {
        if (invRes.web_app_url) tg?.openLink?.(invRes.web_app_url);
        else if (_url.startsWith('https://t.me/') || _url.startsWith('tg://')) tg?.openTelegramLink?.(_url);
        else tg?.openLink?.(_url);
      } catch(_) {}
      if (!tg && _url && !_url.startsWith('tg://')) try { window.open(_url, '_blank'); } catch(_) {}
      _notify('💳 Счёт USDT открыт — оплатите и вернитесь');
      scene._weaponBusy = false;
      if (invRes.invoice_id) {
        try {
          localStorage.setItem('weaponPendingInvoice', String(invRes.invoice_id));
          localStorage.setItem('weaponPendingItemId', item.id);
        } catch(_) {}
        _startWeaponCryptoPolling(scene, invRes.invoice_id, item.id);
      }
      return;
    }
    // ── Стандартное надевание/снятие (free/gold/diamonds) ──────
    _notify(action==='unequip'?'⏳ Снимаем...':'⏳ Надеваем...', true, true);
    const res = await post(
      action==='unequip' ? '/api/equipment/unequip' : '/api/equipment/equip',
      action==='unequip' ? {slot:'weapon'} : {item_id:item.id,slot:'weapon'}
    );
    if (res?.ok) {
      if (res.player)        { State.player=res.player; State.playerLoadedAt=Date.now(); }
      if (res.equipment)     State.equipment=res.equipment;
      if (res.owned_weapons) State.ownedWeapons=res.owned_weapons;
      tg?.HapticFeedback?.notificationOccurred('success');
      _notify(action==='unequip'?'✅ Оружие снято':'✅ Оружие надето!');
      const activeTab = document.querySelector('#wn-root ._wn-view.active');
      _render(scene, activeTab?.dataset?.wv||'all');
    } else { _notify('❌ '+(res?.reason||res?.detail||'Ошибка'),false); }
  } catch(_) { _notify('❌ Ошибка сети',false); }
  scene._weaponBusy=false;
}

function _render(scene, view) {
  const grid = document.getElementById('wn-grid');
  if (!grid) return;
  const scrollTop = grid.scrollTop;
  const eqId = (State.equipment?.weapon||{}).item_id||'';
  const ownedSet = new Set(State.ownedWeapons||[]);
  const items = WEAPONS_DATA.map(w=>({
    ...w,
    equipped: w.id===eqId,
    owned: ownedSet.has(w.id),
  }));
  const list = view==='owned' ? items.filter(w=>w.equipped||w.owned) : items;

  const groups = [
    {k:'common',l:'ОБЫЧНОЕ'},{k:'rare',l:'РЕДКОЕ'},{k:'epic',l:'ЭПИЧЕСКОЕ'},{k:'mythic',l:'МИФИЧЕСКОЕ'}
  ];
  grid.innerHTML = groups.map(g=>{
    const gl = list.filter(w=>w.r===g.k);
    if (!gl.length) return '';
    return `<div class="wd-sep" style="color:${RC[g.k]}">${g.l}</div>
            <div class="wd-card-group">${gl.map(_card).join('')}</div>`;
  }).join('') || `<div class="wd-empty">Нет оружия</div>`;

  grid.scrollTop = scrollTop;
  grid.querySelectorAll('.wd-card-img').forEach(img=>{
    if (img.complete&&img.naturalWidth) _removeDarkBg(img);
  });
  grid.onclick = e=>{
    const btn=e.target.closest('[data-act]');
    if (btn) {
      e.stopPropagation();
      const w=items.find(x=>x.id===btn.dataset.id);
      if (w) _doAction(scene,btn.dataset.act,w);
      return;
    }
    const card=e.target.closest('.wd-card');
    if (card && typeof WeaponHTMLDetail!=='undefined') {
      const w=items.find(x=>x.id===card.dataset.id);
      if (w) WeaponHTMLDetail.show(scene,w,(act,item)=>_doAction(scene,act,item));
    }
  };
}

function refresh() {
  if (!_currentScene || !document.getElementById('wn-root')) return;
  const view = document.querySelector('#wn-root ._wn-view.active')?.dataset?.wv || 'all';
  _render(_currentScene, view);
}

function open(scene) {
  _currentScene = scene;
  scene._weaponBusy = false;
  try { scene.input.enabled = false; } catch(_) {}
  if (typeof WardrobeHTML!=='undefined') WardrobeHTML._injectCSS();
  close();
  const wrap=document.createElement('div');
  wrap.id='wn-root'; wrap.className='wd-overlay';
  let view='all';
  wrap.innerHTML=`
    <div class="wd-panel">
      <div class="wd-head">
        <span class="wd-title">⚔️ Оружие</span>
        <button class="wd-close" id="wn-close">✕</button>
      </div>
      <div class="wd-tabs">
        <div class="wd-tab active _wn-view" id="wn-tab-all" data-wv="all"><span>⚔️ Всё оружие</span></div>
        <div class="wd-tab _wn-view" id="wn-tab-owned" data-wv="owned"><span>🎒 Арсенал</span></div>
      </div>
      <div class="wd-grid" id="wn-grid"></div>
    </div>`;
  document.body.appendChild(wrap);
  _render(scene, view);
  // Всегда перечитываем стейт при открытии (нужно после оплаты)
  post('/api/player', {}).then(res => {
    if (!document.getElementById('wn-root')) return;
    if (Array.isArray(res?.owned_weapons)) State.ownedWeapons = res.owned_weapons;
    if (res?.equipment)     State.equipment = res.equipment;
    if (res?.player)        { State.player = res.player; State.playerLoadedAt = Date.now(); }
    refresh();
  }).catch(() => {});
  // Pending USDT invoice — возобновляем поллинг (если оверлей закрылся во время оплаты)
  try {
    const pi = parseInt(localStorage.getItem('weaponPendingInvoice') || '0', 10);
    const pid = localStorage.getItem('weaponPendingItemId') || '';
    if (pi > 0 && pid) _startWeaponCryptoPolling(scene, pi, pid, true);
  } catch(_) {}
  wrap.querySelectorAll('._wn-view').forEach(t=>t.onclick=()=>{
    view=t.dataset.wv;
    wrap.querySelectorAll('._wn-view').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    _render(scene,view);
  });
  document.getElementById('wn-close').onclick=()=>{
    tg?.HapticFeedback?.impactOccurred('light');
    close();
    // Перестраиваем слот профиля на месте (без перезапуска сцены).
    // Перезапуск сцены создаёт race-condition: зоны таббара успевают поймать
    // тап до завершения shutdown и бросают на случайную вкладку.
    try {
      const sc = _currentScene;
      if (sc._panels?.profile) {
        try { sc._panels.profile.destroy(true); } catch(_) {}
        sc._panels.profile = null;
      }
      sc._buildProfilePanel();
      try { sc.input.enabled = true; } catch(_) {}
      sc._switchTab('profile');
    } catch(_) {
      // fallback: полный перезапуск
      try { _currentScene.input.enabled = true; } catch(_2) {}
      _currentScene.scene.start('Menu',{returnTab:'profile'});
    }
  };
  wrap.addEventListener('touchmove',e=>e.stopPropagation(),{passive:false});
}

function _startWeaponCryptoPolling(scene, invoiceId, itemId, immediate = false) {
  let attempts = 0;
  const poll = async () => {
    attempts++;
    try {
      const r = await get(`/api/shop/crypto_check/${invoiceId}`);
      if (r.ok && r.paid) {
        try { localStorage.removeItem('weaponPendingInvoice'); localStorage.removeItem('weaponPendingItemId'); } catch(_) {}
        if (r.weapon_equipped) {
          if (r.player)    { State.player = r.player; State.playerLoadedAt = Date.now(); }
          if (r.equipment) State.equipment = r.equipment;
        } else {
          try {
            const pd = await post('/api/player');
            if (Array.isArray(pd?.owned_weapons)) State.ownedWeapons = pd.owned_weapons;
            if (pd?.equipment) State.equipment = pd.equipment;
            if (pd?.player)    { State.player = pd.player; State.playerLoadedAt = Date.now(); }
          } catch(_) {}
        }
        tg?.HapticFeedback?.notificationOccurred('success');
        _notify('✅ Мифическое оружие получено!');
        const activeTab = document.querySelector('#wn-root ._wn-view.active');
        if (activeTab) _render(scene, activeTab.dataset?.wv || 'all');
        return;
      }
    } catch(_) {}
    if (attempts < 30) setTimeout(poll, 5000);
  };
  // immediate=true — проверяем сразу (resume после оплаты), иначе ждём 4с
  setTimeout(poll, immediate ? 800 : 4000);
}

function close() { document.getElementById('wn-root')?.remove(); }

window.WeaponHTML = { open, close, _removeDarkBg, refresh };
})();
