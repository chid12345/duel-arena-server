/* ============================================================
   Boots HTML Overlay — 4 типа × 4 тира, 2 вкладки
   CSS берём из WardrobeHTML (уже загружен).
   ============================================================ */
(() => {

const BOOTS_IMG = {
  boots_free1:'boots_free1.png',     boots_free2:'boots_free2.png',
  boots_free3:'boots_free3.png',     boots_free4:'boots_free4.jpeg',
  boots_gold1:'boots_gold1.png',     boots_gold2:'boots_gold2.jpg',
  boots_gold3:'boots_gold3.jpg',     boots_gold4:'boots_gold4.jpg',
  boots_dia1:'boots_dia1.jpg',       boots_dia2:'boots_dia2.jpg',
  boots_dia3:'boots_dia3.jpg',       boots_dia4:'boots_dia4.jpg',
  boots_mythic1:'boots_mythic1.jpeg',boots_mythic2:'boots_mythic2.jpeg',
  boots_mythic3:'boots_mythic3.jpeg',boots_mythic4:'boots_mythic4.jpeg',
};

const BOOTS_DATA = [
  // ── Бесплатные — одна чистая роль
  {id:'boots_free1', r:'common', ht:'👟 Сапоги', name:'Сапоги Танка',      stars:'★☆☆☆', atk:0,  crit:0,  hp:50,  def:0,  pen:0, type:'free'},
  {id:'boots_free2', r:'common', ht:'👟 Сапоги', name:'Сапоги Стража',     stars:'★☆☆☆', atk:0,  crit:0,  hp:0,   def:3,  pen:0, type:'free'},
  {id:'boots_free3', r:'common', ht:'👟 Сапоги', name:'Сапоги Охотника',   stars:'★☆☆☆', atk:8,  crit:0,  hp:0,   def:0,  pen:0, type:'free'},
  {id:'boots_free4', r:'common', ht:'👟 Сапоги', name:'Сапоги Дуэлянта',   stars:'★☆☆☆', atk:0,  crit:4,  hp:0,   def:0,  pen:0, type:'free'},
  // ── Золото — двойные синергии
  {id:'boots_gold1', r:'rare',   ht:'👟 Сапоги', name:'Сапоги Берсерка',   stars:'★★☆☆', atk:16, crit:5,  hp:0,   def:0,  pen:0, type:'gold',     price:'1100'},
  {id:'boots_gold2', r:'rare',   ht:'👟 Сапоги', name:'Сапоги Крепости',   stars:'★★☆☆', atk:0,  crit:0,  hp:85,  def:6,  pen:0, type:'gold',     price:'1400'},
  {id:'boots_gold3', r:'rare',   ht:'👟 Сапоги', name:'Сапоги Снайпера',   stars:'★★☆☆', atk:12, crit:9,  hp:0,   def:0,  pen:0, type:'gold',     price:'1700'},
  {id:'boots_gold4', r:'rare',   ht:'👟 Сапоги', name:'Сапоги Паладина',   stars:'★★☆☆', atk:8,  crit:0,  hp:50,  def:4,  pen:0, type:'gold',     price:'2000'},
  // ── Алмазы — мощные комбо
  {id:'boots_dia1',  r:'epic',   ht:'👟 Сапоги', name:'Сапоги Демона',     stars:'★★★☆', atk:28, crit:10, hp:0,   def:0,  pen:0, type:'diamonds', price:'25'},
  {id:'boots_dia2',  r:'epic',   ht:'👟 Сапоги', name:'Стальные Сапоги',   stars:'★★★☆', atk:0,  crit:0,  hp:140, def:9,  pen:0, type:'diamonds', price:'35'},
  {id:'boots_dia3',  r:'epic',   ht:'👟 Сапоги', name:'Сапоги Арканы',     stars:'★★★☆', atk:0,  crit:13, hp:0,   def:5,  pen:0, type:'diamonds', price:'50'},
  {id:'boots_dia4',  r:'epic',   ht:'👟 Сапоги', name:'Сапоги Разрушителя',stars:'★★★☆', atk:36, crit:0,  hp:65,  def:0,  pen:2, type:'diamonds', price:'70'},
  // ── Мифические — каждый = уникальный стиль
  {id:'boots_mythic1',r:'mythic',ht:'👟 Сапоги', name:'Сапоги Дракона',    stars:'★★★★', atk:40, crit:0,  hp:150, def:10, pen:0, type:'mythic'},
  {id:'boots_mythic2',r:'mythic',ht:'👟 Сапоги', name:'Поступь Воителя',   stars:'★★★★', atk:33, crit:15, hp:0,   def:6,  pen:0, type:'mythic'},
  {id:'boots_mythic3',r:'mythic',ht:'👟 Сапоги', name:'Сапоги Смерти',     stars:'★★★★', atk:48, crit:13, hp:0,   def:0,  pen:3, type:'mythic'},
  {id:'boots_mythic4',r:'mythic',ht:'👟 Сапоги', name:'Сапоги Богов',      stars:'★★★★', atk:0,  crit:11, hp:260, def:14, pen:0, type:'mythic'},
];

const RC = {common:'#9ca3af',rare:'#60a5fa',epic:'#c084fc',mythic:'#fb923c'};
const RL = {common:'Обычный',rare:'Редкий',epic:'Эпический',mythic:'Мифический'};

let _currentScene = null;
const _imgCache = new Map();

function _removeDarkBg(img) {
  if (img._bgDone) return;
  img._bgDone = true;
  const origSrc = img.src;
  if (_imgCache.has(origSrc)) { img.src = _imgCache.get(origSrc); return; }
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || 64; c.height = img.naturalHeight || 64;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  try {
    const d = ctx.getImageData(0, 0, c.width, c.height);
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

function _pills(h) {
  let s = '';
  if (h.atk  > 0) s += `<span class="wd-pill p-s">+${h.atk} атк</span>`;
  if (h.crit > 0) s += `<span class="wd-pill p-i">+${h.crit} крит</span>`;
  if (h.hp   > 0) s += `<span class="wd-pill p-e">+${h.hp} HP</span>`;
  if (h.def  > 0) s += `<span class="wd-pill p-a">-${h.def}% урона врага</span>`;
  if (h.pen  > 0) s += `<span class="wd-pill p-s">+${h.pen}% пробой</span>`;
  return s;
}

function _btn(h) {
  if (h.equipped)
    return `<button class="wd-btn btn-uneq" data-act="unequip" data-id="${h.id}">✅ Снять</button>`;
  if (h.owned && h.type !== 'free')
    return `<button class="wd-btn btn-free" data-act="buy" data-id="${h.id}">👟 Надеть</button>`;
  if (h.type === 'free')
    return `<button class="wd-btn btn-free" data-act="buy" data-id="${h.id}">🆓 Выбрать</button>`;
  if (h.type === 'gold')
    return `<button class="wd-btn btn-gold" data-act="buy" data-id="${h.id}">💰 ${h.price}</button>`;
  if (h.type === 'diamonds')
    return `<button class="wd-btn btn-dia" data-act="buy" data-id="${h.id}">💎 ${h.price}</button>`;
  return `<div style="display:flex;gap:6px">
    <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:6px 2px" data-act="buy_usdt" data-id="${h.id}">💳 $11.99</button>
    <button class="wd-btn btn-gold"   style="flex:1;font-size:10px;padding:6px 2px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_stars" data-id="${h.id}">⭐ 590</button>
  </div>`;
}

function _card(h) {
  const nc = h.r==='epic'?' epic':h.r==='mythic'?' mythic':'';
  const src = BOOTS_IMG[h.id] || '';
  return `<div class="wd-card rarity-${h.r}${h.equipped?' equipped':''}" data-id="${h.id}">
    ${h.equipped?'<div class="wd-eq-badge">✅ Надеты</div>':''}
    <div class="wd-img-area">
      <div class="wd-img-wrap">
        <img src="${src}" class="wd-card-img" loading="eager" decoding="async"
          onerror="this.style.display='none'"
          onload="BootsHTML._removeDarkBg(this)"/>
      </div>
      <div class="wd-img-fade"></div>
    </div>
    <div class="wd-card-body">
      <div style="font-size:8px;color:#8899cc;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">${h.ht}</div>
      <div class="wd-name${nc}">${h.name}</div>
      <div class="wd-rarity-row">
        <span class="wd-rarity-badge" style="color:${RC[h.r]}">${RL[h.r]}</span>
        <span class="wd-stars" style="color:${RC[h.r]}">${h.stars}</span>
      </div>
      <div class="wd-pills">${_pills(h)}</div>
      ${_btn(h)}
    </div>
  </div>`;
}

function _notify(msg, ok=true, persist=false) {
  let el = document.getElementById('bt-notify');
  if (!el) {
    el = Object.assign(document.createElement('div'),{id:'bt-notify'});
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
  if (scene._bootsBusy) return;
  scene._bootsBusy = true;
  try {
    if (action === 'buy_stars') {
      _notify('⏳ Создаём счёт Stars...', true, true);
      const invRes = await post('/api/equipment/boots_stars_invoice', {item_id: item.id});
      if (!invRes?.ok) { _notify('❌ '+(invRes?.reason||'Ошибка'), false); scene._bootsBusy=false; return; }
      const starsUrl = invRes.invoice_url || '';
      if (typeof tg?.openInvoice === 'function') {
        tg.openInvoice(starsUrl, async (status) => {
          if (status === 'paid') {
            _notify('⏳ Активируем...', true, true);
            try {
              const conf = await post('/api/equipment/boots_stars_confirm', {item_id: item.id});
              if (conf?.ok) {
                if (conf.player)        { State.player=conf.player; State.playerLoadedAt=Date.now(); }
                if (conf.equipment)     State.equipment=conf.equipment;
                if (conf.owned_weapons) State.ownedWeapons=conf.owned_weapons;
                tg?.HapticFeedback?.notificationOccurred('success');
                _notify('✅ Мифические сапоги получены!');
                const activeTab = document.querySelector('#bt-root ._bt-view.active');
                _render(scene, activeTab?.dataset?.bv||'all');
              } else { _notify('⚠️ Оплата прошла! Обновите профиль.', true); }
            } catch(_) { _notify('⚠️ Оплата прошла! Обновите профиль.', true); }
          } else if (status === 'cancelled') { _notify('❌ Оплата отменена', false); }
          scene._bootsBusy = false;
        });
        return;
      }
      try {
        if (starsUrl.startsWith('https://t.me/') || starsUrl.startsWith('tg://'))
          tg?.openTelegramLink?.(starsUrl);
        else tg?.openLink?.(starsUrl);
      } catch(_) {}
      if (!tg && starsUrl) try { window.open(starsUrl, '_blank'); } catch(_) {}
      _notify('⭐ Счёт Stars открыт — оплатите и вернитесь');
      scene._bootsBusy = false;
      return;
    }
    if (action === 'buy_usdt') {
      _notify('⏳ Создаём счёт USDT...', true, true);
      const invRes = await post('/api/equipment/boots_crypto_invoice', {item_id: item.id});
      if (!invRes?.ok) { _notify('❌ '+(invRes?.reason||'Ошибка'), false); scene._bootsBusy=false; return; }
      const _url = invRes.invoice_url || '';
      try {
        if (invRes.web_app_url) tg?.openLink?.(invRes.web_app_url);
        else if (_url.startsWith('https://t.me/') || _url.startsWith('tg://')) tg?.openTelegramLink?.(_url);
        else tg?.openLink?.(_url);
      } catch(_) {}
      if (!tg && _url && !_url.startsWith('tg://')) try { window.open(_url, '_blank'); } catch(_) {}
      _notify('💳 Счёт USDT открыт — оплатите и вернитесь');
      scene._bootsBusy = false;
      if (invRes.invoice_id) {
        try {
          localStorage.setItem('bootsPendingInvoice', String(invRes.invoice_id));
          localStorage.setItem('bootsPendingItemId', item.id);
        } catch(_) {}
        _startBootsCryptoPolling(scene, invRes.invoice_id, item.id);
      }
      return;
    }
    _notify(action==='unequip'?'⏳ Снимаем...':'⏳ Надеваем...', true, true);
    const res = await post(
      action==='unequip' ? '/api/equipment/unequip' : '/api/equipment/equip',
      action==='unequip' ? {slot:'boots'} : {item_id:item.id,slot:'boots'}
    );
    if (res?.ok) {
      if (res.player)        { State.player=res.player; State.playerLoadedAt=Date.now(); }
      if (res.equipment)     State.equipment=res.equipment;
      if (res.owned_weapons) State.ownedWeapons=res.owned_weapons;
      tg?.HapticFeedback?.notificationOccurred('success');
      _notify(action==='unequip'?'✅ Сапоги сняты':'✅ Сапоги надеты!');
      const activeTab = document.querySelector('#bt-root ._bt-view.active');
      _render(scene, activeTab?.dataset?.bv||'all');
    } else { _notify('❌ '+(res?.reason||res?.detail||'Ошибка'),false); }
  } catch(_) { _notify('❌ Ошибка сети',false); }
  scene._bootsBusy=false;
}

function _render(scene, view) {
  const grid = document.getElementById('bt-grid');
  if (!grid) return;
  const scrollTop = grid.scrollTop;
  const eqId = (State.equipment?.boots||{}).item_id||'';
  const ownedSet = new Set(State.ownedWeapons||[]);
  const items = BOOTS_DATA.map(h=>({
    ...h,
    equipped: h.id===eqId,
    owned: ownedSet.has(h.id),
  }));
  const list = view==='owned' ? items.filter(h=>h.equipped||h.owned) : items;

  const groups = [
    {k:'common',l:'ОБЫЧНЫЙ'},{k:'rare',l:'РЕДКИЙ'},{k:'epic',l:'ЭПИЧЕСКИЙ'},{k:'mythic',l:'МИФИЧЕСКИЙ'}
  ];
  grid.innerHTML = groups.map(g=>{
    const gl = list.filter(h=>h.r===g.k);
    if (!gl.length) return '';
    return `<div class="wd-sep" style="color:${RC[g.k]}">${g.l}</div>
            <div class="wd-card-group">${gl.map(_card).join('')}</div>`;
  }).join('') || `<div class="wd-empty">Нет сапог</div>`;

  grid.scrollTop = scrollTop;
  grid.querySelectorAll('.wd-card-img').forEach(img=>{
    if (img.complete&&img.naturalWidth) _removeDarkBg(img);
  });
  grid.onclick = e=>{
    const btn=e.target.closest('[data-act]');
    if (btn) {
      e.stopPropagation();
      const h=items.find(x=>x.id===btn.dataset.id);
      if (h) _doAction(scene,btn.dataset.act,h);
      return;
    }
    const card=e.target.closest('.wd-card');
    if (card) {
      const h=items.find(x=>x.id===card.dataset.id);
      if (h && typeof BootsHTMLDetail!=='undefined')
        BootsHTMLDetail.show(scene, h, (act,item)=>_doAction(scene,act,item));
    }
  };
}

function refresh() {
  if (!_currentScene || !document.getElementById('bt-root')) return;
  const view = document.querySelector('#bt-root ._bt-view.active')?.dataset?.bv || 'all';
  _render(_currentScene, view);
}

function open(scene) {
  _currentScene = scene;
  scene._bootsBusy = false;
  try { scene.input.enabled = false; } catch(_) {}
  if (typeof WardrobeHTML!=='undefined') WardrobeHTML._injectCSS();
  close();
  const wrap=document.createElement('div');
  wrap.id='bt-root'; wrap.className='wd-overlay';
  let view='all';
  wrap.innerHTML=`
    <div class="wd-panel">
      <div class="wd-head">
        <span class="wd-title">👟 Сапоги</span>
        <button class="wd-close" id="bt-close">✕</button>
      </div>
      <div class="wd-tabs">
        <div class="wd-tab active _bt-view" id="bt-tab-all" data-bv="all"><span>👟 Все сапоги</span></div>
        <div class="wd-tab _bt-view" id="bt-tab-owned" data-bv="owned"><span>🎒 Арсенал</span></div>
      </div>
      <div class="wd-grid" id="bt-grid"></div>
    </div>`;
  document.body.appendChild(wrap);
  _render(scene, view);
  post('/api/player', {}).then(res => {
    if (!document.getElementById('bt-root')) return;
    if (Array.isArray(res?.owned_weapons)) State.ownedWeapons = res.owned_weapons;
    if (res?.equipment)     State.equipment = res.equipment;
    if (res?.player)        { State.player = res.player; State.playerLoadedAt = Date.now(); }
    refresh();
  }).catch(() => {});
  try {
    const pi = parseInt(localStorage.getItem('bootsPendingInvoice') || '0', 10);
    const pid = localStorage.getItem('bootsPendingItemId') || '';
    if (pi > 0 && pid) _startBootsCryptoPolling(scene, pi, pid, true);
  } catch(_) {}
  wrap.querySelectorAll('._bt-view').forEach(t=>t.onclick=()=>{
    view=t.dataset.bv;
    wrap.querySelectorAll('._bt-view').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    _render(scene,view);
  });
  document.getElementById('bt-close').onclick=()=>{
    tg?.HapticFeedback?.impactOccurred('light');
    close();
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
      try { _currentScene.input.enabled = true; } catch(_2) {}
      _currentScene.scene.start('Menu',{returnTab:'profile'});
    }
  };
  wrap.addEventListener('touchmove',e=>e.stopPropagation(),{passive:false});
}

function _startBootsCryptoPolling(scene, invoiceId, itemId, immediate = false) {
  let attempts = 0;
  const poll = async () => {
    attempts++;
    try {
      const r = await get(`/api/shop/crypto_check/${invoiceId}`);
      if (r.ok && r.paid) {
        try { localStorage.removeItem('bootsPendingInvoice'); localStorage.removeItem('bootsPendingItemId'); } catch(_) {}
        try {
          const pd = await post('/api/player');
          if (Array.isArray(pd?.owned_weapons)) State.ownedWeapons = pd.owned_weapons;
          if (pd?.equipment) State.equipment = pd.equipment;
          if (pd?.player)    { State.player = pd.player; State.playerLoadedAt = Date.now(); }
        } catch(_) {}
        tg?.HapticFeedback?.notificationOccurred('success');
        _notify('✅ Мифические сапоги получены!');
        const activeTab = document.querySelector('#bt-root ._bt-view.active');
        if (activeTab) _render(scene, activeTab.dataset?.bv || 'all');
        return;
      }
    } catch(_) {}
    if (attempts < 30) setTimeout(poll, 5000);
  };
  setTimeout(poll, immediate ? 800 : 4000);
}

function close() { document.getElementById('bt-root')?.remove(); }

window.BootsHTML = { open, close, _removeDarkBg, refresh };
})();
