/* ============================================================
   Helmet HTML Overlay — 4 типа × 4 тира, 2 вкладки
   CSS берём из WardrobeHTML (уже загружен).
   ============================================================ */
(() => {

const HELMET_IMG = {
  helmet_free1:'helmet_free1.png',    helmet_free2:'helmet_free2.png',
  helmet_free3:'helmet_free3.png',    helmet_free4:'helmet_free4.png',
  helmet_gold1:'helmet_gold1.png',    helmet_gold2:'helmet_gold2.png',
  helmet_gold3:'helmet_gold3.png',    helmet_gold4:'helmet_gold4.png',
  helmet_dia1:'helmet_dia1.png',      helmet_dia2:'helmet_dia2.png',
  helmet_dia3:'helmet_dia3.png',      helmet_dia4:'helmet_dia4.png',
  helmet_mythic1:'helmet_mythic1.png',helmet_mythic2:'helmet_mythic2.png',
  helmet_mythic3:'helmet_mythic3.png',helmet_mythic4:'helmet_mythic4.png',
};

const HELMETS_DATA = [
  // ── Бесплатные — каждый = одна чистая роль
  {id:'helmet_free1',  r:'common', ht:'⛑️ Шлем', name:'Шлем Танка',        stars:'★☆☆☆', atk:0,  crit:0,  hp:60,  def:0,  pen:0, type:'gold', price:'810', tier:'T1', recLevel:1, bonus:'Танк: чистый запас жизни'},
  {id:'helmet_free2',  r:'common', ht:'⛑️ Шлем', name:'Шлем Стража',       stars:'★☆☆☆', atk:0,  crit:0,  hp:0,   def:3,  pen:0, type:'gold', price:'810', tier:'T1', recLevel:1, bonus:'Страж: снижает входящий урон'},
  {id:'helmet_free3',  r:'common', ht:'⛑️ Шлем', name:'Шлем Охотника',     stars:'★☆☆☆', atk:8,  crit:0,  hp:0,   def:0,  pen:0, type:'gold', price:'810', tier:'T1', recLevel:1, bonus:'Охотник: чистый прирост атаки'},
  {id:'helmet_free4',  r:'common', ht:'⛑️ Шлем', name:'Шлем Дуэлянта',    stars:'★☆☆☆', atk:0,  crit:4,  hp:0,   def:0,  pen:0, type:'gold', price:'810', tier:'T1', recLevel:1, bonus:'Дуэлянт: чаще проходят криты'},
  // ── Золото — двойные синергии
  {id:'helmet_gold1',  r:'rare',   ht:'⛑️ Шлем', name:'Шлем Берсерка',     stars:'★★☆☆', atk:18, crit:5,  hp:0,   def:0,  pen:0, type:'gold',     price:'7965', tier:'T2', recLevel:20, bonus:'Берсерк: ярость в атаке + криты'},
  {id:'helmet_gold2',  r:'rare',   ht:'⛑️ Шлем', name:'Шлем Крепости',     stars:'★★☆☆', atk:0,  crit:0,  hp:90,  def:6,  pen:0, type:'gold',     price:'7965', tier:'T2', recLevel:20, bonus:'Крепость: HP + щит против урона'},
  {id:'helmet_gold3',  r:'rare',   ht:'⛑️ Шлем', name:'Шлем Снайпера',     stars:'★★☆☆', atk:14, crit:9,  hp:0,   def:0,  pen:0, type:'gold',     price:'7965', tier:'T2', recLevel:20, bonus:'Снайпер: точный мощный крит'},
  {id:'helmet_gold4',  r:'rare',   ht:'⛑️ Шлем', name:'Шлем Паладина',     stars:'★★☆☆', atk:10, crit:0,  hp:55,  def:4,  pen:0, type:'gold',     price:'7965', tier:'T2', recLevel:20, bonus:'Паладин: универсал атака+защита'},
  // ── Алмазы — мощные или уникальные комбо
  {id:'helmet_dia1',   r:'epic',   ht:'⛑️ Шлем', name:'Шлем Демона',       stars:'★★★☆', atk:30, crit:10, hp:0,   def:0,  pen:0, type:'diamonds', price:'77', tier:'T3', recLevel:45, bonus:'Демон: чистая ярость атак и критов'},
  {id:'helmet_dia2',   r:'epic',   ht:'⛑️ Шлем', name:'Стальная Крепость', stars:'★★★☆', atk:0,  crit:0,  hp:150, def:9,  pen:0, type:'diamonds', price:'77', tier:'T3', recLevel:45, bonus:'Стальной монолит: танк без компромиссов'},
  {id:'helmet_dia3',   r:'epic',   ht:'⛑️ Шлем', name:'Шлем Арканы',       stars:'★★★☆', atk:0,  crit:14, hp:0,   def:5,  pen:0, type:'diamonds', price:'77', tier:'T3', recLevel:45, bonus:'Аркана: криты + защита от урона'},
  {id:'helmet_dia4',   r:'epic',   ht:'⛑️ Шлем', name:'Шлем Разрушителя',  stars:'★★★☆', atk:38, crit:0,  hp:70,  def:0,  pen:2, type:'diamonds', price:'77', tier:'T3', recLevel:45, bonus:'Разрушитель: пробой брони и HP'},
  // ── Мифические — каждый = уникальный стиль игры
  {id:'helmet_mythic1',r:'mythic', ht:'⛑️ Шлем', name:'Шлем Дракона',      stars:'★★★★', atk:42, crit:0,  hp:160, def:10, pen:0, type:'mythic', tier:'T4', recLevel:65, bonus:'Дракон: универсал — урон/HP/защита'},
  {id:'helmet_mythic2',r:'mythic', ht:'⛑️ Шлем', name:'Корона Воителя',    stars:'★★★★', atk:35, crit:16, hp:0,   def:6,  pen:0, type:'mythic', tier:'T4', recLevel:65, bonus:'Воитель: топ урона и критов с защитой'},
  {id:'helmet_mythic3',r:'mythic', ht:'⛑️ Шлем', name:'Маска Смерти',      stars:'★★★★', atk:50, crit:14, hp:0,   def:0,  pen:3, type:'mythic', tier:'T4', recLevel:65, bonus:'Смерть: убийца — урон, крит, пробой'},
  {id:'helmet_mythic4',r:'mythic', ht:'⛑️ Шлем', name:'Шлем Богов',        stars:'★★★★', atk:0,  crit:12, hp:280, def:15, pen:0, type:'mythic', tier:'T4', recLevel:65, bonus:'Боги: неубиваемый защитник с критами'},
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

function _pills(h) {
  h = window.PlusBadge ? window.PlusBadge.boostItem(h) : h;
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
    return `<div style="display:flex;gap:4px">
      <button class="wd-btn btn-uneq" data-act="unequip" data-id="${h.id}" style="flex:1">✅ Снять</button>
      <button class="wd-btn btn-gold" data-act="upgrade" data-id="${h.id}" style="flex:1;background:linear-gradient(135deg,#3a2050,#7c2d92);color:#fff">🔨 Прокачать</button>
    </div>`;
  if (h.owned && h.type !== 'free')
    return `<button class="wd-btn btn-free" data-act="buy" data-id="${h.id}">⛑️ Надеть</button>`;
  // Вариант В: уровень не достигнут → серая заблокированная кнопка
  if (window.LevelLock?.isLocked(h)) return LevelLock.lockedBtn(h);
  if (h.type === 'free')
    return `<button class="wd-btn btn-free" data-act="buy" data-id="${h.id}">🆓 Выбрать</button>`;
  if (h.type === 'gold')
    return `<button class="wd-btn btn-gold" data-act="buy" data-id="${h.id}">💰 ${h.price}</button>`;
  if (h.type === 'diamonds')
    return `<button class="wd-btn btn-dia" data-act="buy" data-id="${h.id}">💎 ${h.price}</button>`;
  return `<div>
    <div style="display:flex;gap:6px">
      <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:6px 2px" data-act="buy_usdt" data-id="${h.id}">💳 $11.99</button>
      <button class="wd-btn btn-gold"   style="flex:1;font-size:10px;padding:6px 2px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_stars" data-id="${h.id}">⭐ 800</button>
    </div>
    ${window.RentalPay ? RentalPay.buildButton(h.id, RentalPay.rentalStarsFor(590)) : ''}
  </div>`;
}

function _card(h) {
  const nc = h.r==='epic'?' epic':h.r==='mythic'?' mythic':'';
  const src = HELMET_IMG[h.id] || '';
  const lockCls = window.LevelLock?.cardLockedClass(h) || '';
  return `<div class="wd-card rarity-${h.r}${h.equipped?' equipped':''}${lockCls}" data-id="${h.id}" style="position:relative">
    ${h.equipped?'<div class="wd-eq-badge">✅ Надет</div>':''}
    ${window.RentalBadge ? RentalBadge.html(h.id, State.activeRentals) : ''}
    <div class="wd-img-area">
      <div class="wd-img-wrap">
        <img src="${src}" class="wd-card-img" loading="eager" decoding="async"
          onerror="this.style.display='none'"
          onload="HelmetHTML._removeDarkBg(this)"/>
      </div>
      <div class="wd-img-fade"></div>
    </div>
    <div class="wd-card-body">
      <div style="font-size:8px;color:#8899cc;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">${h.ht}</div>
      <div class="wd-name${nc}">${h.name}</div>
      <div class="wd-rarity-row">
        <span class="wd-rarity-badge" style="color:${RC[h.r]}">${RL[h.r]}</span>
        <span class="wd-stars" style="color:${RC[h.r]}">${h.stars}</span>
        ${window.PlusBadge?.badge(h.id) || ''}
        ${window.LevelLock?.buildBadge(h) || ''}
      </div>
      ${window.ArchBadge?.htmlFor(h.id) || ''}
      <div class="wd-pills">${_pills(h)}</div>
      ${h.bonus ? `<div style="font-size:9px;color:#ffc97a;line-height:1.35;margin-top:2px;font-style:italic">✨ ${h.bonus}</div>` : ''}
      ${_btn(h)}
    </div>
  </div>`;
}

function _notify(msg, ok=true, persist=false) {
  let el = document.getElementById('hm-notify');
  if (!el) {
    el = Object.assign(document.createElement('div'),{id:'hm-notify'});
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
  if (scene._helmetBusy) return;
  scene._helmetBusy = true;
  try {
    if (action === 'buy_rental') {
      // Этап 8: аренда mythic-шлема на 7 дней за 50% Stars-цены.
      // Сервер сам делает rent + equip. После 'paid' — обновляем State через
      // no-store /api/player (иначе бейдж «🕐 Аренда · Nд» не появится из-за кэша),
      // потом перерендер.
      await RentalPay.rent(scene, item, async () => {
        if (window.RentalBadge) await RentalBadge.refreshState();
        const activeTab = document.querySelector('#hm-root ._hm-view.active');
        _render(scene, activeTab?.dataset?.hv || 'all');
      }, _notify);
      scene._helmetBusy = false;
      return;
    }
    if (action === 'buy_stars') {
      _notify('⏳ Создаём счёт Stars...', true, true);
      const invRes = await post('/api/equipment/helmet_stars_invoice', {item_id: item.id});
      if (!invRes?.ok) { _notify('❌ '+(invRes?.reason||'Ошибка'), false); scene._helmetBusy=false; return; }
      const starsUrl = invRes.invoice_url || '';
      if (typeof tg?.openInvoice === 'function') {
        tg.openInvoice(starsUrl, async (status) => {
          if (status === 'paid') {
            _notify('⏳ Активируем...', true, true);
            // Сервер (helmet_stars_confirm) read-only: ждёт до 3с пока бот
            // обработает successful_payment. Если не успел — reason:"processing".
            // Ретраим до 3 раз × 2с: серверу даём до 9с на race condition.
            let conf = null;
            for (let i = 0; i < 3; i++) {
              try { conf = await post('/api/equipment/helmet_stars_confirm', {item_id: item.id}); }
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
              _notify('✅ Мифический шлем получен!');
              const activeTab = document.querySelector('#hm-root ._hm-view.active');
              _render(scene, activeTab?.dataset?.hv||'all');
            } else { _notify('⚠️ Оплата прошла! Обновите профиль.', true); }
          } else if (status === 'cancelled') { _notify('❌ Оплата отменена', false); }
          scene._helmetBusy = false;
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
      scene._helmetBusy = false;
      return;
    }
    if (action === 'buy_usdt') {
      _notify('⏳ Создаём счёт USDT...', true, true);
      const invRes = await post('/api/equipment/helmet_crypto_invoice', {item_id: item.id});
      if (!invRes?.ok) { _notify('❌ '+(invRes?.reason||'Ошибка'), false); scene._helmetBusy=false; return; }
      const _url = invRes.invoice_url || '';
      try {
        if (invRes.web_app_url) tg?.openLink?.(invRes.web_app_url);
        else if (_url.startsWith('https://t.me/') || _url.startsWith('tg://')) tg?.openTelegramLink?.(_url);
        else tg?.openLink?.(_url);
      } catch(_) {}
      if (!tg && _url && !_url.startsWith('tg://')) try { window.open(_url, '_blank'); } catch(_) {}
      _notify('💳 Счёт USDT открыт — оплатите и вернитесь');
      scene._helmetBusy = false;
      if (invRes.invoice_id) {
        try {
          localStorage.setItem('helmetPendingInvoice', String(invRes.invoice_id));
          localStorage.setItem('helmetPendingItemId', item.id);
        } catch(_) {}
        _startHelmetCryptoPolling(scene, invRes.invoice_id, item.id);
      }
      return;
    }
    if (action === 'upgrade') {
      if (window.UpgradeModal) {
        UpgradeModal.show(item.id, { itemName: item.name, onClose: refresh });
      } else { _notify('UpgradeModal недоступен', false); }
      scene._helmetBusy = false;
      return;
    }
    _notify(action==='unequip'?'⏳ Снимаем...':'⏳ Надеваем...', true, true);
    const res = await post(
      action==='unequip' ? '/api/equipment/unequip' : '/api/equipment/equip',
      action==='unequip' ? {slot:'belt'} : {item_id:item.id,slot:'belt'}
    );
    if (res?.ok) {
      // Ghost-tap guard: после re-render палец игрока не должен пробить
      // в кнопку под оверлеем (TabBar/БОИ-карта/Меню/etc) на touch-устройствах.
      try { window.GhostTapGuard?.block?.(300); } catch(_) {}
      if (res.player)        { State.player=res.player; State.playerLoadedAt=Date.now(); }
      if (res.equipment)     State.equipment=res.equipment;
      if (res.owned_weapons) State.ownedWeapons=res.owned_weapons;
      try { window.SetBonusPage?.refresh?.(); } catch(_) {}  // обновить «Комплект»
      tg?.HapticFeedback?.notificationOccurred('success');
      _notify(action==='unequip'?'✅ Шлем снят':'✅ Шлем надет!');
      const activeTab = document.querySelector('#hm-root ._hm-view.active');
      _render(scene, activeTab?.dataset?.hv||'all');
    } else { _notify('❌ '+(res?.reason||res?.detail||'Ошибка'),false); }
  } catch(_) { _notify('❌ Ошибка сети',false); }
  scene._helmetBusy=false;
}

function _render(scene, view) {
  const grid = document.getElementById('hm-grid');
  if (!grid) return;
  const scrollTop = grid.scrollTop;
  const eqId = (State.equipment?.belt||{}).item_id||'';
  const ownedSet = window.RentalBadge
    ? RentalBadge.ownedSetFor('belt', State.ownedWeapons, State.activeRentals)
    : new Set([...(State.ownedWeapons||[]), ...((State.activeRentals||[]).map(r => r.item_id))]);
  const items = HELMETS_DATA.map(h=>({
    ...h,
    equipped: h.id===eqId,
    owned: ownedSet.has(h.id),
  }));
  const list = view==='owned' ? items.filter(h=>h.equipped||h.owned) : items;

  if (view === 'owned') {
    grid.innerHTML = list.length
      ? `<div class="wd-card-group">${list.map(_card).join('')}</div>`
      : `<div class="wd-empty">Нет шлемов</div>`;
  } else {
    const groups = [
      {k:'common',l:'ОБЫЧНЫЙ'},{k:'rare',l:'РЕДКИЙ'},{k:'epic',l:'ЭПИЧЕСКИЙ'},{k:'mythic',l:'МИФИЧЕСКИЙ'}
    ];
    grid.innerHTML = groups.map(g=>{
      const gl = list.filter(h=>h.r===g.k);
      if (!gl.length) return '';
      return `<div class="wd-sep" style="color:${RC[g.k]}">${g.l}</div>
              <div class="wd-card-group">${gl.map(_card).join('')}</div>`;
    }).join('') || `<div class="wd-empty">Нет шлемов</div>`;
  }

  grid.scrollTop = scrollTop;
  grid.querySelectorAll('.wd-card-img').forEach(img=>{
    if (img.complete&&img.naturalWidth) _removeDarkBg(img);
  });
  grid.onclick = e=>{
    const btn=e.target.closest('[data-act]');
    if (btn) {
      e.stopPropagation();
      // Ghost-tap guard: блокируем ВСЕ touch/click события до конца обработки.
      // 500мс хватит на сетевой round-trip + re-render. Без этого click может
      // «улететь» в кнопку под оверлеем (БОИ/TabBar) при touch на мобиле.
      try { window.GhostTapGuard?.block?.(500); } catch(_) {}
      const h=items.find(x=>x.id===btn.dataset.id);
      if (h) _doAction(scene,btn.dataset.act,h);
      return;
    }
    const card=e.target.closest('.wd-card');
    if (card) {
      const h=items.find(x=>x.id===card.dataset.id);
      const eq=items.find(x=>x.equipped);
      if (h && typeof HelmetHTMLDetail!=='undefined')
        HelmetHTMLDetail.show(scene, h, (act,item)=>_doAction(scene,act,item), eq);
    }
  };
}

function refresh() {
  if (!_currentScene || !document.getElementById('hm-root')) return;
  const view = document.querySelector('#hm-root ._hm-view.active')?.dataset?.hv || 'all';
  _render(_currentScene, view);
}

function open(scene) {
  try { if (typeof EquipmentSlotsHTML !== 'undefined') EquipmentSlotsHTML.close(); } catch(_) {}
  try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.hide(); } catch(_) {}
  _currentScene = scene;
  scene._helmetBusy = false;
  try { scene.input.enabled = false; } catch(_) {}
  if (typeof WardrobeHTML!=='undefined') WardrobeHTML._injectCSS();
  // Только удаляем старый DOM-узел — без побочных эффектов close()
  // (close() при настоящем закрытии возвращает таббар + Phaser-инпут;
  // здесь это бы перекрыло hide()/disable из шагов выше → ghost-tap в таббар).
  document.getElementById('hm-root')?.remove();
  const wrap=document.createElement('div');
  wrap.id='hm-root'; wrap.className='wd-overlay';
  let view='all';
  wrap.innerHTML=`
    <div class="wd-panel">
      <div class="wd-head">
        <span class="wd-title">⛑️ Шлемы</span>
        ${window.ShardsBar ? ShardsBar.build() : ''}
        <button class="wd-close" id="hm-close">✕</button>
      </div>
      <div class="wd-tabs">
        <div class="wd-tab active _hm-view" id="hm-tab-all" data-hv="all"><span>⛑️ Все шлемы</span></div>
        <div class="wd-tab _hm-view" id="hm-tab-owned" data-hv="owned"><span>🎒 Арсенал</span></div>
      </div>
      ${window.RentalBadge ? RentalBadge.debugBarHtml() : ''}
      <div class="wd-grid" id="hm-grid"></div>
    </div>`;
  document.body.appendChild(wrap);
  _render(scene, view);
  if (window.RentalBadge) RentalBadge.attachDebugBar(wrap, refresh, _notify);
  // no-store fetch обходит кэш Telegram WebView (иначе после покупки
  // active_rentals остаётся пустым и бейдж аренды не появляется).
  (window.RentalBadge ? RentalBadge.refreshState() : post('/api/player', {}))
    .then(res => {
      if (!document.getElementById('hm-root')) return;
      // RentalBadge.refreshState уже сохранил State; для fallback дописываем.
      if (res && !window.RentalBadge) {
        if (Array.isArray(res?.owned_weapons)) State.ownedWeapons = res.owned_weapons;
        if (Array.isArray(res?.active_rentals)) State.activeRentals = res.active_rentals;
        if (res?.equipment)     State.equipment = res.equipment;
        if (res?.player)        { State.player = res.player; State.playerLoadedAt = Date.now(); }
      }
      refresh();
    }).catch(() => {});
  try {
    const pi = parseInt(localStorage.getItem('helmetPendingInvoice') || '0', 10);
    const pid = localStorage.getItem('helmetPendingItemId') || '';
    if (pi > 0 && pid) _startHelmetCryptoPolling(scene, pi, pid, true);
  } catch(_) {}
  wrap.querySelectorAll('._hm-view').forEach(t=>t.onclick=()=>{
    view=t.dataset.hv;
    wrap.querySelectorAll('._hm-view').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    _render(scene,view);
  });
  document.getElementById('hm-close').onclick=()=>{
    tg?.HapticFeedback?.impactOccurred('light');
    // Ghost-tap guard: pointer-up не должен проскочить в DOM под оверлеем.
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

function _startHelmetCryptoPolling(scene, invoiceId, itemId, immediate = false) {
  let attempts = 0;
  const poll = async () => {
    attempts++;
    try {
      const r = await get(`/api/shop/crypto_check/${invoiceId}`);
      if (r.ok && r.paid) {
        try { localStorage.removeItem('helmetPendingInvoice'); localStorage.removeItem('helmetPendingItemId'); } catch(_) {}
        try {
          const pd = await post('/api/player');
          if (Array.isArray(pd?.owned_weapons)) State.ownedWeapons = pd.owned_weapons;
          if (pd?.equipment) State.equipment = pd.equipment;
          if (pd?.player)    { State.player = pd.player; State.playerLoadedAt = Date.now(); }
        } catch(_) {}
        tg?.HapticFeedback?.notificationOccurred('success');
        _notify('✅ Мифический шлем получен!');
        const activeTab = document.querySelector('#hm-root ._hm-view.active');
        if (activeTab) _render(scene, activeTab.dataset?.hv || 'all');
        return;
      }
    } catch(_) {}
    if (attempts < 30) setTimeout(poll, 5000);
  };
  setTimeout(poll, immediate ? 800 : 4000);
}

function close() {
  document.getElementById('hm-root')?.remove();
  try { if (_currentScene) _currentScene.input.enabled = true; } catch(_) {}
  try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.show(); } catch(_) {}
}

window.HelmetHTML = { open, close, _removeDarkBg, refresh };
})();
