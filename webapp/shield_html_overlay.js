/* ============================================================
   Shield HTML Overlay — 4 типа × 4 тира, 2 вкладки
   CSS берём из WardrobeHTML (уже загружен).
   ============================================================ */
(() => {

const SHIELD_IMG = {
  shield_free1:'shield_free1.jpeg', shield_free2:'shield_free2.jpeg',
  shield_free3:'shield_free3.jpeg', shield_free4:'shield_free4.jpeg',
  shield_gold1:'shield_gold1.jpeg', shield_gold2:'shield_gold2.jpeg',
  shield_gold3:'shield_gold3.jpeg', shield_gold4:'shield_gold4.jpeg',
  shield_dia1:'shield_dia1.png',    shield_dia2:'shield_dia2.png',
  shield_dia3:'shield_dia3.png',    shield_dia4:'shield_dia4.png',
  shield_mythic1:'shield_mythic1.png', shield_mythic2:'shield_mythic2.png',
  shield_mythic3:'shield_mythic3.png', shield_mythic4:'shield_mythic4.png',
};

const SHIELD_DATA = [
  // Бесплатные
  {id:'shield_free1', r:'common', ht:'🛡️ Щит', name:'Щит Ополченца',       stars:'★☆☆☆', def:3,  hp:0,   crit_resist:0,  str:2, agi:0, intu:0, type:'free'},
  {id:'shield_free2', r:'common', ht:'🛡️ Щит', name:'Щит Стойкости',        stars:'★☆☆☆', def:0,  hp:50,  crit_resist:0,  str:0, agi:2, intu:0, type:'free'},
  {id:'shield_free3', r:'common', ht:'🛡️ Щит', name:'Щит Закалённого',      stars:'★☆☆☆', def:0,  hp:0,   crit_resist:10, str:0, agi:0, intu:2, type:'free'},
  {id:'shield_free4', r:'common', ht:'🛡️ Щит', name:'Щит Дружинника',       stars:'★☆☆☆', def:2,  hp:30,  crit_resist:0,  str:2, agi:0, intu:0, type:'free'},
  // Золото
  {id:'shield_gold1', r:'rare',   ht:'🛡️ Щит', name:'Рыцарский Щит',        stars:'★★☆☆', def:6,  hp:0,   crit_resist:0,  str:1, agi:1, intu:1, type:'gold',     price:'1200'},
  {id:'shield_gold2', r:'rare',   ht:'🛡️ Щит', name:'Щит Великана',         stars:'★★☆☆', def:0,  hp:110, crit_resist:0,  str:1, agi:1, intu:1, type:'gold',     price:'1400'},
  {id:'shield_gold3', r:'rare',   ht:'🛡️ Щит', name:'Щит Паладина',         stars:'★★☆☆', def:0,  hp:0,   crit_resist:18, str:1, agi:1, intu:1, type:'gold',     price:'1700'},
  {id:'shield_gold4', r:'rare',   ht:'🛡️ Щит', name:'Щит Хранителя',        stars:'★★☆☆', def:4,  hp:60,  crit_resist:8,  str:1, agi:1, intu:1, type:'gold',     price:'2000'},
  // Алмазы
  {id:'shield_dia1',  r:'epic',   ht:'🛡️ Щит', name:'Щит Дракона',          stars:'★★★☆', def:10, hp:0,   crit_resist:0,  str:2, agi:2, intu:2, type:'diamonds', price:'25'},
  {id:'shield_dia2',  r:'epic',   ht:'🛡️ Щит', name:'Щит Колосса',          stars:'★★★☆', def:0,  hp:200, crit_resist:0,  str:2, agi:2, intu:2, type:'diamonds', price:'35'},
  {id:'shield_dia3',  r:'epic',   ht:'🛡️ Щит', name:'Щит Непоколебимого',   stars:'★★★☆', def:0,  hp:0,   crit_resist:25, str:2, agi:2, intu:2, type:'diamonds', price:'50'},
  {id:'shield_dia4',  r:'epic',   ht:'🛡️ Щит', name:'Щит Арканы',           stars:'★★★☆', def:7,  hp:90,  crit_resist:12, str:2, agi:2, intu:2, type:'diamonds', price:'70'},
  // Мифические
  {id:'shield_mythic1',r:'mythic',ht:'🛡️ Щит', name:'Щит Судьбы',           stars:'★★★★', def:14, hp:160, crit_resist:0,  str:4, agi:4, intu:4, type:'mythic'},
  {id:'shield_mythic2',r:'mythic',ht:'🛡️ Щит', name:'Щит Бессмертного',     stars:'★★★★', def:0,  hp:300, crit_resist:20, str:4, agi:4, intu:4, type:'mythic'},
  {id:'shield_mythic3',r:'mythic',ht:'🛡️ Щит', name:'Щит Рока',             stars:'★★★★', def:8,  hp:0,   crit_resist:30, str:4, agi:4, intu:4, type:'mythic'},
  {id:'shield_mythic4',r:'mythic',ht:'🛡️ Щит', name:'Щит Богов',            stars:'★★★★', def:10, hp:120, crit_resist:18, str:4, agi:4, intu:4, type:'mythic'},
];

const RC = {common:'#9ca3af',rare:'#60a5fa',epic:'#c084fc',mythic:'#fb923c'};
const RL = {common:'Обычный',rare:'Редкий',epic:'Эпический',mythic:'Мифический'};

let _currentScene = null;
const _imgCache = new Map();

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
      const i = (y*W+x)*4;
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

function _pills(h) {
  let s = '';
  if (h.def > 0)         s += `<span class="wd-pill p-a">-${h.def}% урона врага</span>`;
  if (h.hp > 0)          s += `<span class="wd-pill p-e">+${h.hp} HP</span>`;
  if (h.crit_resist > 0) s += `<span class="wd-pill p-i">-${h.crit_resist}% крит-урон врага</span>`;
  if (h.str > 0)         s += `<span class="wd-pill p-s">+${h.str} Сила</span>`;
  if (h.agi > 0)         s += `<span class="wd-pill p-s">+${h.agi} Ловкость</span>`;
  if (h.intu > 0)        s += `<span class="wd-pill p-s">+${h.intu} Интуиция</span>`;
  return s;
}

function _btn(h) {
  if (h.equipped)
    return `<button class="wd-btn btn-uneq" data-act="unequip" data-id="${h.id}">✅ Снять</button>`;
  if (h.owned && h.type !== 'free')
    return `<button class="wd-btn btn-free" data-act="buy" data-id="${h.id}">🛡️ Надеть</button>`;
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
  const src = SHIELD_IMG[h.id] || '';
  return `<div class="wd-card rarity-${h.r}${h.equipped?' equipped':''}" data-id="${h.id}">
    ${h.equipped?'<div class="wd-eq-badge">✅ Надет</div>':''}
    <div class="wd-img-area">
      <div class="wd-img-wrap">
        <img src="${src}" class="wd-card-img" loading="eager" decoding="async"
          onerror="this.style.display='none'"
          onload="ShieldHTML._removeDarkBg(this)"/>
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
  let el = document.getElementById('sh-notify');
  if (!el) {
    el = Object.assign(document.createElement('div'),{id:'sh-notify'});
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
  if (scene._shieldBusy) return;
  scene._shieldBusy = true;
  try {
    if (action === 'buy_stars') {
      _notify('⏳ Создаём счёт Stars...', true, true);
      const invRes = await post('/api/equipment/shield_stars_invoice', {item_id: item.id});
      if (!invRes?.ok) { _notify('❌ '+(invRes?.reason||'Ошибка'), false); scene._shieldBusy=false; return; }
      const starsUrl = invRes.invoice_url || '';
      if (typeof tg?.openInvoice === 'function') {
        tg.openInvoice(starsUrl, async (status) => {
          if (status === 'paid') {
            _notify('⏳ Активируем...', true, true);
            // Сервер (shield_stars_confirm) read-only: ждёт до 3с пока бот
            // обработает successful_payment. Если не успел — reason:"processing".
            // Ретраим до 3 раз × 2с: серверу даём до 9с на race condition.
            let conf = null;
            for (let i = 0; i < 3; i++) {
              try { conf = await post('/api/equipment/shield_stars_confirm', {item_id: item.id}); }
              catch(_) { conf = null; }
              if (conf?.ok) break;
              if (conf?.reason !== 'processing') break;
              await new Promise(r => setTimeout(r, 2000));
            }
            if (conf?.ok) {
              if (conf.player)        { State.player=conf.player; State.playerLoadedAt=Date.now(); }
              if (conf.equipment)     State.equipment=conf.equipment;
              if (conf.owned_weapons) State.ownedWeapons=conf.owned_weapons;
              tg?.HapticFeedback?.notificationOccurred('success');
              _notify('✅ Мифический щит получен!');
              const activeTab = document.querySelector('#sh-root ._sh-view.active');
              _render(scene, activeTab?.dataset?.sv||'all');
            } else { _notify('⚠️ Оплата прошла! Обновите профиль.', true); }
          } else if (status === 'cancelled') { _notify('❌ Оплата отменена', false); }
          scene._shieldBusy = false;
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
      scene._shieldBusy = false;
      return;
    }
    if (action === 'buy_usdt') {
      _notify('⏳ Создаём счёт USDT...', true, true);
      const invRes = await post('/api/equipment/shield_crypto_invoice', {item_id: item.id});
      if (!invRes?.ok) { _notify('❌ '+(invRes?.reason||'Ошибка'), false); scene._shieldBusy=false; return; }
      const _url = invRes.invoice_url || '';
      try {
        if (invRes.web_app_url) tg?.openLink?.(invRes.web_app_url);
        else if (_url.startsWith('https://t.me/') || _url.startsWith('tg://')) tg?.openTelegramLink?.(_url);
        else tg?.openLink?.(_url);
      } catch(_) {}
      if (!tg && _url && !_url.startsWith('tg://')) try { window.open(_url, '_blank'); } catch(_) {}
      _notify('💳 Счёт USDT открыт — оплатите и вернитесь');
      scene._shieldBusy = false;
      if (invRes.invoice_id) {
        try {
          localStorage.setItem('shieldPendingInvoice', String(invRes.invoice_id));
          localStorage.setItem('shieldPendingItemId', item.id);
        } catch(_) {}
        _startShieldCryptoPolling(scene, invRes.invoice_id, item.id);
      }
      return;
    }
    _notify(action==='unequip'?'⏳ Снимаем...':'⏳ Надеваем...', true, true);
    const res = await post(
      action==='unequip' ? '/api/equipment/unequip' : '/api/equipment/equip',
      action==='unequip' ? {slot:'shield'} : {item_id:item.id,slot:'shield'}
    );
    if (res?.ok) {
      if (res.player)        { State.player=res.player; State.playerLoadedAt=Date.now(); }
      if (res.equipment)     State.equipment=res.equipment;
      if (res.owned_weapons) State.ownedWeapons=res.owned_weapons;
      tg?.HapticFeedback?.notificationOccurred('success');
      _notify(action==='unequip'?'✅ Щит снят':'✅ Щит надет!');
      const activeTab = document.querySelector('#sh-root ._sh-view.active');
      _render(scene, activeTab?.dataset?.sv||'all');
    } else { _notify('❌ '+(res?.reason||res?.detail||'Ошибка'),false); }
  } catch(_) { _notify('❌ Ошибка сети',false); }
  scene._shieldBusy=false;
}

function _render(scene, view) {
  const grid = document.getElementById('sh-grid');
  if (!grid) return;
  const scrollTop = grid.scrollTop;
  const eqId = (State.equipment?.shield||{}).item_id||'';
  const ownedSet = new Set(State.ownedWeapons||[]);
  const items = SHIELD_DATA.map(h=>({
    ...h,
    equipped: h.id===eqId,
    owned: ownedSet.has(h.id),
  }));
  const list = view==='owned' ? items.filter(h=>h.equipped||h.owned) : items;

  if (view === 'owned') {
    grid.innerHTML = list.length
      ? `<div class="wd-card-group">${list.map(_card).join('')}</div>`
      : `<div class="wd-empty">Нет щитов</div>`;
  } else {
    const groups = [
      {k:'common',l:'ОБЫЧНЫЙ'},{k:'rare',l:'РЕДКИЙ'},{k:'epic',l:'ЭПИЧЕСКИЙ'},{k:'mythic',l:'МИФИЧЕСКИЙ'}
    ];
    grid.innerHTML = groups.map(g=>{
      const gl = list.filter(h=>h.r===g.k);
      if (!gl.length) return '';
      return `<div class="wd-sep" style="color:${RC[g.k]}">${g.l}</div>
              <div class="wd-card-group">${gl.map(_card).join('')}</div>`;
    }).join('') || `<div class="wd-empty">Нет щитов</div>`;
  }

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
      const eq=items.find(x=>x.equipped);
      if (h && typeof ShieldHTMLDetail!=='undefined')
        ShieldHTMLDetail.show(scene, h, (act,item)=>_doAction(scene,act,item), eq);
    }
  };
}

function refresh() {
  if (!_currentScene || !document.getElementById('sh-root')) return;
  const view = document.querySelector('#sh-root ._sh-view.active')?.dataset?.sv || 'all';
  _render(_currentScene, view);
}

function open(scene) {
  try { if (typeof EquipmentSlotsHTML !== 'undefined') EquipmentSlotsHTML.close(); } catch(_) {}
  _currentScene = scene;
  scene._shieldBusy = false;
  try { scene.input.enabled = false; } catch(_) {}
  if (typeof WardrobeHTML!=='undefined') WardrobeHTML._injectCSS();
  close();
  const wrap=document.createElement('div');
  wrap.id='sh-root'; wrap.className='wd-overlay';
  let view='all';
  wrap.innerHTML=`
    <div class="wd-panel">
      <div class="wd-head">
        <span class="wd-title">🛡️ Щит</span>
        <button class="wd-close" id="sh-close">✕</button>
      </div>
      <div class="wd-tabs">
        <div class="wd-tab active _sh-view" id="sh-tab-all" data-sv="all"><span>🛡️ Все щиты</span></div>
        <div class="wd-tab _sh-view" id="sh-tab-owned" data-sv="owned"><span>🎒 Арсенал</span></div>
      </div>
      <div class="wd-grid" id="sh-grid"></div>
    </div>`;
  document.body.appendChild(wrap);
  _render(scene, view);
  post('/api/player', {}).then(res => {
    if (!document.getElementById('sh-root')) return;
    if (Array.isArray(res?.owned_weapons)) State.ownedWeapons = res.owned_weapons;
    if (res?.equipment)     State.equipment = res.equipment;
    if (res?.player)        { State.player = res.player; State.playerLoadedAt = Date.now(); }
    refresh();
  }).catch(() => {});
  try {
    const pi = parseInt(localStorage.getItem('shieldPendingInvoice') || '0', 10);
    const pid = localStorage.getItem('shieldPendingItemId') || '';
    if (pi > 0 && pid) _startShieldCryptoPolling(scene, pi, pid, true);
  } catch(_) {}
  wrap.querySelectorAll('._sh-view').forEach(t=>t.onclick=()=>{
    view=t.dataset.sv;
    wrap.querySelectorAll('._sh-view').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    _render(scene,view);
  });
  document.getElementById('sh-close').onclick=()=>{
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

function _startShieldCryptoPolling(scene, invoiceId, itemId, immediate = false) {
  let attempts = 0;
  const poll = async () => {
    attempts++;
    try {
      const r = await get(`/api/shop/crypto_check/${invoiceId}`);
      if (r.ok && r.paid) {
        try { localStorage.removeItem('shieldPendingInvoice'); localStorage.removeItem('shieldPendingItemId'); } catch(_) {}
        try {
          const pd = await post('/api/player');
          if (Array.isArray(pd?.owned_weapons)) State.ownedWeapons = pd.owned_weapons;
          if (pd?.equipment) State.equipment = pd.equipment;
          if (pd?.player)    { State.player = pd.player; State.playerLoadedAt = Date.now(); }
        } catch(_) {}
        tg?.HapticFeedback?.notificationOccurred('success');
        _notify('✅ Мифический щит получен!');
        const activeTab = document.querySelector('#sh-root ._sh-view.active');
        if (activeTab) _render(scene, activeTab.dataset?.sv || 'all');
        return;
      }
    } catch(_) {}
    if (attempts < 30) setTimeout(poll, 5000);
  };
  setTimeout(poll, immediate ? 800 : 4000);
}

function close() {
  document.getElementById('sh-root')?.remove();
  try { if (_currentScene) _currentScene.input.enabled = true; } catch(_) {}
}

window.ShieldHTML = { open, close, _removeDarkBg, refresh };
})();
