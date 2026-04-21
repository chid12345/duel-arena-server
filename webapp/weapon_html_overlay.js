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

function _removeDarkBg(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  try {
    const d = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4)
      if (d.data[i] < 40 && d.data[i+1] < 40 && d.data[i+2] < 40) d.data[i+3] = 0;
    ctx.putImageData(d, 0, 0); img.src = c.toDataURL();
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

function _notify(msg, ok=true) {
  let el = document.getElementById('wd-notify');
  if (!el) {
    el = Object.assign(document.createElement('div'),{id:'wd-notify'});
    el.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;padding:9px 18px;border-radius:12px;font-size:13px;font-weight:700;pointer-events:none;transition:opacity .3s;max-width:300px;text-align:center';
    document.body.appendChild(el);
  }
  el.textContent=msg; el.style.opacity='1';
  el.style.background=ok?'rgba(21,128,61,.92)':'rgba(185,28,28,.92)';
  el.style.color=ok?'#86efac':'#fca5a5';
  clearTimeout(el._t); el._t=setTimeout(()=>{el.style.opacity='0';},2800);
}

async function _doAction(scene, action, item) {
  if (scene._weaponBusy) return;
  scene._weaponBusy = true;
  try {
    // ── Stars (мифическое оружие) ──────────────────────────────
    if (action === 'buy_stars') {
      const invRes = await post('/api/equipment/weapon_stars_invoice', {item_id: item.id});
      if (!invRes?.ok) { _notify('❌ '+(invRes?.reason||'Ошибка'), false); scene._weaponBusy=false; return; }
      if (typeof tg?.openInvoice !== 'function') {
        _notify('❌ Откройте через Telegram', false); scene._weaponBusy=false; return;
      }
      tg.openInvoice(invRes.invoice_url, async (status) => {
        if (status === 'paid') {
          _notify('⏳ Активируем...');
          try {
            const conf = await post('/api/equipment/weapon_stars_confirm', {item_id: item.id});
            if (conf?.ok) {
              if (conf.player)    { State.player=conf.player; State.playerLoadedAt=Date.now(); }
              if (conf.equipment) State.equipment=conf.equipment;
              tg?.HapticFeedback?.notificationOccurred('success');
              _notify('✅ Мифическое оружие получено!');
              _render(scene, document.querySelector('#wn-root ._wn-view')?._wv||'all');
            } else { _notify('⚠️ Оплата прошла! Обновите профиль.', true); }
          } catch(_) { _notify('⚠️ Оплата прошла! Обновите профиль.', true); }
        } else if (status === 'cancelled') { _notify('❌ Оплата отменена', false); }
        scene._weaponBusy = false;
      });
      return; // busy сбросится в callback
    }
    // ── USDT (мифическое оружие) ───────────────────────────────
    if (action === 'buy_usdt') {
      const invRes = await post('/api/equipment/weapon_crypto_invoice', {item_id: item.id});
      if (!invRes?.ok) { _notify('❌ '+(invRes?.reason||'Ошибка'), false); scene._weaponBusy=false; return; }
      const _url = invRes.invoice_url || '';
      if (invRes.web_app_url) tg?.openLink?.(invRes.web_app_url);
      else if (_url.includes('startapp=')) tg?.openLink?.(_url);
      else tg?.openTelegramLink?.(_url);
      _notify('💳 Счёт открыт — оплатите и вернитесь');
      scene._weaponBusy = false;
      return;
    }
    // ── Стандартное надевание/снятие (free/gold/diamonds) ──────
    const res = await post(
      action==='unequip' ? '/api/equipment/unequip' : '/api/equipment/equip',
      action==='unequip' ? {slot:'weapon'} : {item_id:item.id,slot:'weapon'}
    );
    if (res?.ok) {
      if (res.player)    { State.player=res.player; State.playerLoadedAt=Date.now(); }
      if (res.equipment) State.equipment=res.equipment;
      tg?.HapticFeedback?.notificationOccurred('success');
      _notify(action==='unequip'?'✅ Оружие снято':'✅ Оружие надето');
      _render(scene, document.querySelector('#wn-root ._wn-view')?._wv||'all');
    } else { _notify('❌ '+(res?.reason||'Ошибка'),false); }
  } catch(_) { _notify('❌ Ошибка сети',false); }
  scene._weaponBusy=false;
}

function _render(scene, view) {
  const grid = document.getElementById('wn-grid');
  if (!grid) return;
  const eqId = (State.equipment?.weapon||{}).item_id||'';
  const items = WEAPONS_DATA.map(w=>({...w,equipped:w.id===eqId}));
  const list  = view==='owned' ? items.filter(w=>w.equipped) : items;

  const groups = [
    {k:'common',l:'ОБЫЧНОЕ'},{k:'rare',l:'РЕДКОЕ'},{k:'epic',l:'ЭПИЧЕСКОЕ'},{k:'mythic',l:'МИФИЧЕСКОЕ'}
  ];
  grid.innerHTML = groups.map(g=>{
    const gl = list.filter(w=>w.r===g.k);
    if (!gl.length) return '';
    return `<div class="wd-sep" style="color:${RC[g.k]}">${g.l}</div>
            <div class="wd-card-group">${gl.map(_card).join('')}</div>`;
  }).join('') || `<div class="wd-empty">Нет оружия</div>`;

  grid.querySelectorAll('.wd-card-img').forEach(img=>{
    if (img.complete&&img.naturalWidth) _removeDarkBg(img);
  });
  grid.onclick = e=>{
    const btn=e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    const w=items.find(x=>x.id===btn.dataset.id);
    if (w) _doAction(scene,btn.dataset.act,w);
  };
}

function open(scene) {
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
  wrap.querySelectorAll('._wn-view').forEach(t=>t.onclick=()=>{
    view=t.dataset.wv;
    wrap.querySelectorAll('._wn-view').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    _render(scene,view);
  });
  document.getElementById('wn-close').onclick=()=>{
    close(); tg?.HapticFeedback?.impactOccurred('light');
    State.playerLoadedAt=0;
    scene.scene.start('Menu',{returnTab:'profile'});
  };
  wrap.addEventListener('touchmove',e=>e.stopPropagation(),{passive:false});
}

function close() { document.getElementById('wn-root')?.remove(); }

window.WeaponHTML = { open, close, _removeDarkBg };
})();
