/* ============================================================
   Armor2 HTML Overlay — 4 типа × 4 редкости, 2 вкладки.
   Чистая реализация после сноса старого armor — slot=armor2 в БД.
   Структура полностью совпадает с helmet_html_overlay.js
   (CSS из WardrobeHTML, RentalBadge, LevelLock).
   ============================================================ */
(() => {

const ARMOR2_IMG = {
  armor2_free1:'armor_free1.png',    armor2_free2:'armor_free2.png',
  armor2_free3:'armor_free3.png',    armor2_free4:'armor_free4.png',
  armor2_gold1:'armor_gold1.png',    armor2_gold2:'armor_gold2.png',
  armor2_gold3:'armor_gold3.png',    armor2_gold4:'armor_gold4.png',
  armor2_dia1:'armor_dia1.png',      armor2_dia2:'armor_dia2.png',
  armor2_dia3:'armor_dia3.png',      armor2_dia4:'armor_dia4.png',
  armor2_mythic1:'armor_mythic1.png',armor2_mythic2:'armor_mythic2.png',
  armor2_mythic3:'armor_mythic3.png',armor2_mythic4:'armor_mythic4.png',
};

const ARMOR2_DATA = [
  // ── Обычные (common) — 800 gold, T1, уровень 1
  {id:'armor2_free1',  r:'common', ht:'🛡 Броня', name:'Кираса Ополченца', stars:'★☆☆☆', str:5, agi:0, intu:0, hp:10, type:'gold', price:'800', tier:'T1', recLevel:1},
  {id:'armor2_free2',  r:'common', ht:'🛡 Броня', name:'Жилет Следопыта',  stars:'★☆☆☆', str:0, agi:5, intu:0, hp:10, type:'gold', price:'800', tier:'T1', recLevel:1},
  {id:'armor2_free3',  r:'common', ht:'🛡 Броня', name:'Роба Ученика',     stars:'★☆☆☆', str:0, agi:0, intu:5, hp:10, type:'gold', price:'800', tier:'T1', recLevel:1},
  {id:'armor2_free4',  r:'common', ht:'🛡 Броня', name:'Плащ Странника',   stars:'★☆☆☆', str:2, agi:2, intu:2, hp:4,  type:'gold', price:'800', tier:'T1', recLevel:1},
  // ── Редкие (rare) — 8000 gold, T2, уровень 20
  {id:'armor2_gold1',  r:'rare',   ht:'🛡 Броня', name:'Панцирь Берсерка', stars:'★★☆☆', str:7, agi:0, intu:0, hp:14, type:'gold', price:'8000', tier:'T2', recLevel:20},
  {id:'armor2_gold2',  r:'rare',   ht:'🛡 Броня', name:'Кольчуга Теней',   stars:'★★☆☆', str:0, agi:7, intu:0, hp:14, type:'gold', price:'8000', tier:'T2', recLevel:20},
  {id:'armor2_gold3',  r:'rare',   ht:'🛡 Броня', name:'Мантия Чародея',   stars:'★★☆☆', str:0, agi:0, intu:7, hp:14, type:'gold', price:'8000', tier:'T2', recLevel:20},
  {id:'armor2_gold4',  r:'rare',   ht:'🛡 Броня', name:'Броня Стража',     stars:'★★☆☆', str:4, agi:4, intu:4, hp:8,  type:'gold', price:'8000', tier:'T2', recLevel:20},
  // ── Эпические (epic) — 75 алмазов, T3, уровень 45
  {id:'armor2_dia1',   r:'epic',   ht:'🛡 Броня', name:'Латы Кровавого Вождя', stars:'★★★☆', str:9, agi:0, intu:0, hp:18, type:'diamonds', price:'75', tier:'T3', recLevel:45},
  {id:'armor2_dia2',   r:'epic',   ht:'🛡 Броня', name:'Плащ Ночного Клинка',  stars:'★★★☆', str:0, agi:9, intu:0, hp:18, type:'diamonds', price:'75', tier:'T3', recLevel:45},
  {id:'armor2_dia3',   r:'epic',   ht:'🛡 Броня', name:'Одеяние Архимага',     stars:'★★★☆', str:0, agi:0, intu:9, hp:18, type:'diamonds', price:'75', tier:'T3', recLevel:45},
  {id:'armor2_dia4',   r:'epic',   ht:'🛡 Броня', name:'Латы Паладина Зари',   stars:'★★★☆', str:6, agi:6, intu:6, hp:12, type:'diamonds', price:'75', tier:'T3', recLevel:45},
  // ── Мифические (mythic) — $11.99 / ⭐800, T4, уровень 65
  {id:'armor2_mythic1',r:'mythic', ht:'🛡 Броня', name:'Доспех Пламенного Титана', stars:'★★★★', str:12, agi:0, intu:0, hp:24, type:'mythic', tier:'T4', recLevel:65},
  {id:'armor2_mythic2',r:'mythic', ht:'🛡 Броня', name:'Облачение Призрака Ветров',stars:'★★★★', str:0, agi:12, intu:0, hp:24, type:'mythic', tier:'T4', recLevel:65},
  {id:'armor2_mythic3',r:'mythic', ht:'🛡 Броня', name:'Регалии Повелителя Молний',stars:'★★★★', str:0, agi:0, intu:12, hp:24, type:'mythic', tier:'T4', recLevel:65},
  {id:'armor2_mythic4',r:'mythic', ht:'🛡 Броня', name:'Доспех Светоносного Бога', stars:'★★★★', str:0, agi:0, intu:0,  hp:0,  type:'legendary', tier:'T4', recLevel:65},
];

const RC = {common:'#9ca3af',rare:'#60a5fa',epic:'#c084fc',mythic:'#fb923c'};
const RL = {common:'Обычная',rare:'Редкая',epic:'Эпическая',mythic:'Мифическая'};

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

function _pills(a) {
  let s = '';
  if (a.str  > 0) s += `<span class="wd-pill p-s">С+${a.str}</span>`;
  if (a.agi  > 0) s += `<span class="wd-pill p-a">Л+${a.agi}</span>`;
  if (a.intu > 0) s += `<span class="wd-pill p-i">И+${a.intu}</span>`;
  if (a.hp   > 0) s += `<span class="wd-pill p-e">+${a.hp} HP</span>`;
  if (a.id === 'armor2_mythic4') s += `<span class="wd-pill p-s">+19 своб.ст</span>`;
  return s;
}

function _btn(a) {
  if (a.equipped)
    return `<div style="display:flex;gap:4px">
      <button class="wd-btn btn-uneq" data-act="unequip" data-id="${a.id}" style="flex:1">✅ Снять</button>
      <button class="wd-btn btn-gold" data-act="upgrade" data-id="${a.id}" style="flex:1;background:linear-gradient(135deg,#3a2050,#7c2d92);color:#fff">🔨 Прокачать</button>
    </div>`;
  if (a.owned && a.type !== 'free')
    return `<button class="wd-btn btn-free" data-act="buy" data-id="${a.id}">🛡 Надеть</button>`;
  if (window.LevelLock?.isLocked(a)) return LevelLock.lockedBtn(a);
  // armor2_mythic4 = Легендарная USDT-броня: 2 кнопки покупки, без аренды
  // (без распределения статов аренда бессмысленна).
  if (a.id === 'armor2_mythic4')
    return `<div style="display:flex;gap:6px">
      <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:6px 2px" data-act="buy_legendary_usdt" data-id="${a.id}">💳 $11.99</button>
      <button class="wd-btn btn-gold" style="flex:1;font-size:10px;padding:6px 2px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_legendary_stars" data-id="${a.id}">⭐ 800</button>
    </div>`;
  if (a.type === 'gold')
    return `<button class="wd-btn btn-gold" data-act="buy" data-id="${a.id}">💰 ${a.price}</button>`;
  if (a.type === 'diamonds')
    return `<button class="wd-btn btn-dia" data-act="buy" data-id="${a.id}">💎 ${a.price}</button>`;
  // mythic1-3 — обычные мифические с арендой
  return `<div>
    <div style="display:flex;gap:6px">
      <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:6px 2px" data-act="buy_usdt" data-id="${a.id}">💳 $11.99</button>
      <button class="wd-btn btn-gold"   style="flex:1;font-size:10px;padding:6px 2px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_stars" data-id="${a.id}">⭐ 800</button>
    </div>
    ${window.RentalPay ? RentalPay.buildButton(a.id) : ''}
  </div>`;
}

function _card(a) {
  const nc = a.r==='epic'?' epic':a.r==='mythic'?' mythic':'';
  const src = ARMOR2_IMG[a.id] || '';
  const lockCls = window.LevelLock?.cardLockedClass(a) || '';
  return `<div class="wd-card rarity-${a.r}${a.equipped?' equipped':''}${lockCls}" data-id="${a.id}" style="position:relative">
    ${a.equipped?'<div class="wd-eq-badge">✅ Надета</div>':''}
    ${window.RentalBadge ? RentalBadge.html(a.id, State.activeRentals) : ''}
    <div class="wd-img-area">
      <div class="wd-img-wrap">
        <img src="${src}" class="wd-card-img" loading="eager" decoding="async"
          onerror="this.style.display='none'"
          onload="Armor2HTML._removeDarkBg(this)"/>
      </div>
      <div class="wd-img-fade"></div>
    </div>
    <div class="wd-card-body">
      <div style="font-size:8px;color:#8899cc;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">${a.ht}</div>
      <div class="wd-name${nc}">${a.name}</div>
      <div class="wd-rarity-row">
        <span class="wd-rarity-badge" style="color:${RC[a.r]}">${RL[a.r]}</span>
        <span class="wd-stars" style="color:${RC[a.r]}">${a.stars}</span>
        ${window.LevelLock?.buildBadge(a) || ''}
      </div>
      <div class="wd-pills">${_pills(a)}</div>
      ${_btn(a)}
    </div>
  </div>`;
}

function _notify(msg, ok=true, persist=false) {
  let el = document.getElementById('ar2-notify');
  if (!el) {
    el = Object.assign(document.createElement('div'),{id:'ar2-notify'});
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
  if (scene._armor2Busy) return;
  scene._armor2Busy = true;
  try {
    // Платные покупки (Stars/USDT) — endpoints появятся в Этапе 2.4.
    // Пока заглушка чтобы UI не падал.
    if (action === 'buy_stars' || action === 'buy_usdt'
        || action === 'buy_legendary_stars' || action === 'buy_legendary_usdt'
        || action === 'buy_rental') {
      _notify('⚙️ Платные покупки брони — скоро (Этап 2.4)', false);
      scene._armor2Busy = false;
      return;
    }
    if (action === 'upgrade') {
      _notify('⚙️ Прокачка брони — скоро', false);
      scene._armor2Busy = false;
      return;
    }
    // Обычное надевание/снятие — общий endpoint /api/equipment/*.
    _notify(action==='unequip'?'⏳ Снимаем...':'⏳ Надеваем...', true, true);
    const res = await post(
      action==='unequip' ? '/api/equipment/unequip' : '/api/equipment/equip',
      action==='unequip' ? {slot:'armor2'} : {item_id:item.id,slot:'armor2'}
    );
    if (res?.ok) {
      try { window.GhostTapGuard?.block?.(300); } catch(_) {}
      if (res.player)        { State.player=res.player; State.playerLoadedAt=Date.now(); }
      if (res.equipment)     State.equipment=res.equipment;
      if (res.owned_weapons) State.ownedWeapons=res.owned_weapons;
      tg?.HapticFeedback?.notificationOccurred('success');
      _notify(action==='unequip'?'✅ Броня снята':'✅ Броня надета!');
      const activeTab = document.querySelector('#ar2-root ._ar2-view.active');
      _render(scene, activeTab?.dataset?.av||'all');
    } else { _notify('❌ '+(res?.reason||res?.detail||'Ошибка'), false); }
  } catch(_) { _notify('❌ Ошибка сети', false); }
  scene._armor2Busy = false;
}

function _render(scene, view) {
  const grid = document.getElementById('ar2-grid');
  if (!grid) return;
  const scrollTop = grid.scrollTop;
  const eqId = (State.equipment?.armor2||{}).item_id||'';
  // Для armor2 владение хранится в player_owned_armor2 — но фронт сейчас
  // не получает этот список отдельно (API endpoint появится в 2.4).
  // Поэтому owned проверяем только по State.activeRentals — пока ничего
  // не куплено, owned-флаг будет ставиться только надетой бронёй.
  const rentalsByItem = {};
  for (const r of (State.activeRentals || [])) {
    if (r && r.item_id) rentalsByItem[r.item_id] = r;
  }
  const ownedArmor2 = new Set(State.ownedArmor2 || []);
  const items = ARMOR2_DATA.map(a=>({
    ...a,
    equipped: a.id===eqId,
    owned: ownedArmor2.has(a.id) || !!rentalsByItem[a.id] || a.id===eqId,
    rental: rentalsByItem[a.id] || null,
  }));
  const list = view==='owned' ? items.filter(a=>a.equipped||a.owned) : items;

  if (view === 'owned') {
    grid.innerHTML = list.length
      ? `<div class="wd-card-group">${list.map(_card).join('')}</div>`
      : `<div class="wd-empty">Нет брони</div>`;
  } else {
    const groups = [
      {k:'common',l:'ОБЫЧНАЯ'},{k:'rare',l:'РЕДКАЯ'},{k:'epic',l:'ЭПИЧЕСКАЯ'},{k:'mythic',l:'МИФИЧЕСКАЯ'}
    ];
    grid.innerHTML = groups.map(g=>{
      const gl = list.filter(a=>a.r===g.k);
      if (!gl.length) return '';
      return `<div class="wd-sep" style="color:${RC[g.k]}">${g.l}</div>
              <div class="wd-card-group">${gl.map(_card).join('')}</div>`;
    }).join('') || `<div class="wd-empty">Нет брони</div>`;
  }

  grid.scrollTop = scrollTop;
  grid.querySelectorAll('.wd-card-img').forEach(img=>{
    if (img.complete&&img.naturalWidth) _removeDarkBg(img);
  });
  grid.onclick = e=>{
    const btn=e.target.closest('[data-act]');
    if (btn) {
      e.stopPropagation();
      try { window.GhostTapGuard?.block?.(500); } catch(_) {}
      const a=items.find(x=>x.id===btn.dataset.id);
      if (a) _doAction(scene, btn.dataset.act, a);
      return;
    }
    const card = e.target.closest('.wd-card');
    if (!card) return;
    const a = items.find(x => x.id === card.dataset.id);
    const eq = items.find(x => x.equipped);
    if (a && typeof Armor2HTMLDetail !== 'undefined')
      Armor2HTMLDetail.show(scene, a, (act, item) => _doAction(scene, act, item), eq);
  };
}

function refresh() {
  if (!_currentScene || !document.getElementById('ar2-root')) return;
  const view = document.querySelector('#ar2-root ._ar2-view.active')?.dataset?.av || 'all';
  _render(_currentScene, view);
}

function open(scene) {
  try { if (typeof EquipmentSlotsHTML !== 'undefined') EquipmentSlotsHTML.close(); } catch(_) {}
  try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.hide(); } catch(_) {}
  _currentScene = scene;
  scene._armor2Busy = false;
  try { scene.input.enabled = false; } catch(_) {}
  if (typeof WardrobeHTML!=='undefined') WardrobeHTML._injectCSS();
  close();
  const wrap=document.createElement('div');
  wrap.id='ar2-root'; wrap.className='wd-overlay';
  let view='all';
  wrap.innerHTML=`
    <div class="wd-panel">
      <div class="wd-head">
        <span class="wd-title">🛡 Броня</span>
        ${window.ShardsBar ? ShardsBar.build() : ''}
        <button class="wd-close" id="ar2-close">✕</button>
      </div>
      <div class="wd-tabs">
        <div class="wd-tab active _ar2-view" id="ar2-tab-all" data-av="all"><span>🛡 Вся броня</span></div>
        <div class="wd-tab _ar2-view" id="ar2-tab-owned" data-av="owned"><span>🎒 Арсенал</span></div>
      </div>
      ${window.RentalBadge ? RentalBadge.debugBarHtml() : ''}
      <div class="wd-grid" id="ar2-grid"></div>
    </div>`;
  document.body.appendChild(wrap);
  _render(scene, view);
  if (window.RentalBadge) RentalBadge.attachDebugBar(wrap, refresh, _notify);
  (window.RentalBadge ? RentalBadge.refreshState() : post('/api/player', {}))
    .then(res => {
      if (!document.getElementById('ar2-root')) return;
      if (res && !window.RentalBadge) {
        if (Array.isArray(res?.owned_weapons)) State.ownedWeapons = res.owned_weapons;
        if (Array.isArray(res?.active_rentals)) State.activeRentals = res.active_rentals;
        if (res?.equipment)     State.equipment = res.equipment;
        if (res?.player)        { State.player = res.player; State.playerLoadedAt = Date.now(); }
      }
      refresh();
    }).catch(() => {});
  wrap.querySelectorAll('._ar2-view').forEach(t=>t.onclick=()=>{
    view=t.dataset.av;
    wrap.querySelectorAll('._ar2-view').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    _render(scene, view);
  });
  document.getElementById('ar2-close').onclick=()=>{
    tg?.HapticFeedback?.impactOccurred('light');
    try { window.GhostTapGuard?.block?.(300); } catch(_) {}
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

function close() {
  document.getElementById('ar2-root')?.remove();
  try { if (_currentScene) _currentScene.input.enabled = true; } catch(_) {}
  try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.show(); } catch(_) {}
}

window.Armor2HTML = { open, close, _removeDarkBg, refresh };
})();
