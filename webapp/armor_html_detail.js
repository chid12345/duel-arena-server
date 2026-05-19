/* ============================================================
   ArmorHTMLDetail — попап деталей брони (карточка-просмотр).
   Симметрично HelmetHTMLDetail / ShieldHTMLDetail / WeaponHTMLDetail
   / BootsHTMLDetail / RingHTMLDetail. Открывается при тапе по
   карточке в armor_overlay_v2.js (кроме клика по кнопке).
   ============================================================ */
(() => {

const ARMOR_IMG = {
  armor_free1:'armor_free1.png',    armor_free2:'armor_free2.png',
  armor_free3:'armor_free3.png',    armor_free4:'armor_free4.png',
  armor_gold1:'armor_gold1.png',    armor_gold2:'armor_gold2.png',
  armor_gold3:'armor_gold3.png',    armor_gold4:'armor_gold4.png',
  armor_dia1:'armor_dia1.png',      armor_dia2:'armor_dia2.png',
  armor_dia3:'armor_dia3.png',      armor_dia4:'armor_dia4.png',
  armor_mythic1:'armor_mythic1.png',armor_mythic2:'armor_mythic2.png',
  armor_mythic3:'armor_mythic3.png',armor_mythic4:'armor_mythic4.png',
};

const ARMOR_DESC = {
  armor_free1:    'Простая кираса ополченца — даёт чистый прирост силы новичку.',
  armor_free2:    'Лёгкий жилет следопыта — ставка на скорость и уворот.',
  armor_free3:    'Роба ученика — обостряет внимание и интуицию в бою.',
  armor_free4:    'Плащ странника — баланс трёх статов и небольшой запас HP.',
  armor_gold1:    'Панцирь берсерка — мощный плюс к силе для агрессивного стиля.',
  armor_gold2:    'Кольчуга теней — увеличивает ловкость, реже бьёт враг.',
  armor_gold3:    'Мантия чародея — прирост интуиции, чаще проходят криты.',
  armor_gold4:    'Броня стража — равномерный буст всех статов + HP.',
  armor_dia1:     'Латы кровавого вождя — топ силы за алмазы, ставка на урон.',
  armor_dia2:     'Плащ ночного клинка — топ ловкости, максимум уворота.',
  armor_dia3:     'Одеяние архимага — топ интуиции, ставка на криты.',
  armor_dia4:     'Латы паладина зари — баланс на алмазах, универсальный вариант.',
  armor_mythic1:  'Доспех пламенного титана — лучший прирост силы в игре.',
  armor_mythic2:  'Облачение призрака ветров — лучший прирост ловкости в игре.',
  armor_mythic3:  'Регалии повелителя молний — лучший прирост интуиции в игре.',
  armor_mythic4:  'Доспех светоносного бога — 19 свободных статов и личная пассивка.',
};

const RC  = {common:'#9ca3af', rare:'#60a5fa', epic:'#c084fc', mythic:'#fb923c'};
const RL  = {common:'ОБЫЧНАЯ', rare:'РЕДКАЯ',  epic:'ЭПИЧЕСКАЯ', mythic:'МИФИЧЕСКАЯ'};
const WGC = {
  common:'rgba(140,148,165,.28)', rare:'rgba(96,165,250,.3)',
  epic:'rgba(168,85,247,.35)',    mythic:'rgba(249,115,22,.4)',
};

const CSS = `
.ard-backdrop{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}
.ard-card{position:relative;width:min(340px,90vw);border-radius:22px;overflow:hidden;background:rgba(10,6,24,.97);border:1.5px solid rgba(120,60,240,.35);box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 40px rgba(80,20,180,.2)}
.ard-x{position:absolute;top:12px;right:12px;z-index:10;width:34px;height:34px;border-radius:10px;background:rgba(220,50,80,.2);border:1px solid rgba(255,80,120,.35);color:#fca5a5;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.ard-x:hover{background:rgba(220,50,80,.4)}
.ard-img-area{width:100%;height:190px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.ard-img-area::before{content:'';position:absolute;bottom:5%;left:50%;translate:-50% 0;width:80%;height:60%;background:radial-gradient(ellipse at center,var(--ag,rgba(120,70,220,.3)),transparent 70%);filter:blur(14px);z-index:1;pointer-events:none}
.ard-img-wrap{width:70%;height:80%;position:relative;z-index:2;animation:breathe 4s ease-in-out infinite;will-change:transform}
.ard-img-wrap img{width:100%;height:100%;object-fit:contain}
.ard-img-fade{position:absolute;bottom:0;inset-x:0;height:45%;background:linear-gradient(transparent,rgba(10,6,24,.97));z-index:3;pointer-events:none}
.ard-body{padding:12px 18px 18px;display:flex;flex-direction:column;gap:5px}
.ard-wtype{font-size:9px;color:#7a6aaa;text-transform:uppercase;letter-spacing:1.2px;font-weight:700}
.ard-name{font-size:18px;font-weight:800;color:#f0eeff;letter-spacing:.3px}
.ard-name.epic{background:linear-gradient(90deg,#c084fc,#e879f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ard-name.mythic{background:linear-gradient(90deg,#fb923c,#fbbf24,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ard-badge-row{display:flex;align-items:center;gap:7px}
.ard-rarity{font-size:10px;font-weight:700;letter-spacing:.8px}
.ard-dot{color:rgba(255,255,255,.3);font-size:10px}
.ard-price{font-size:10px;font-weight:700;color:rgba(255,255,255,.55)}
.ard-stars{font-size:12px}
.ard-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}
.ard-stat-line{font-size:11px;color:rgba(255,255,255,.55);line-height:1.5;margin-top:1px}
.ard-desc{font-size:11px;color:rgba(255,255,255,.42);line-height:1.5}
.ard-btn-wrap{margin-top:8px}`;

function _injectCSS() {
  if (document.getElementById('ard-css')) return;
  const s = document.createElement('style');
  s.id = 'ard-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _priceLabel(a) {
  if (a.type === 'free')     return 'БЕСПЛ.';
  if (a.type === 'gold')     return `${a.price} 💰`;
  if (a.type === 'diamonds') return `${a.price} 💎`;
  return '💳 / ⭐';
}

// Кнопки повторяют _btn из armor_overlay_v2.js один-в-один — иначе
// поведение из карточки и из попапа разъедется.
function _btnHtml(a) {
  if (a.equipped)
    return `<div style="display:flex;gap:4px">
      <button class="wd-btn btn-uneq" data-act="unequip" data-id="${a.id}" style="flex:1">✅ Снять</button>
      <button class="wd-btn btn-gold" data-act="upgrade" data-id="${a.id}" style="flex:1;background:linear-gradient(135deg,#3a2050,#7c2d92);color:#fff">🔨 Прокачать</button>
    </div>`;
  if (a.owned && a.type !== 'free')
    return `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${a.id}">🛡 Надеть</button>`;
  if (window.LevelLock?.isLocked(a)) return LevelLock.lockedBtn(a);
  if (a.id === 'armor_mythic4')
    return `<div style="display:flex;gap:6px">
      <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:8px 4px" data-act="buy_legendary_usdt" data-id="${a.id}">💳 $11.99</button>
      <button class="wd-btn btn-gold" style="flex:1;font-size:10px;padding:8px 4px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_legendary_stars" data-id="${a.id}">⭐ 800</button>
    </div>`;
  if (a.type === 'free')
    return `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${a.id}">🆓 Выбрать бесплатно</button>`;
  if (a.type === 'gold')
    return `<button class="wd-btn btn-gold" style="width:100%" data-act="buy" data-id="${a.id}">💰 Купить за ${a.price}</button>`;
  if (a.type === 'diamonds')
    return `<button class="wd-btn btn-dia" style="width:100%" data-act="buy" data-id="${a.id}">💎 Купить за ${a.price}</button>`;
  // mythic1-3
  return `<div>
    <div style="display:flex;gap:6px">
      <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:8px 4px" data-act="buy_usdt" data-id="${a.id}">💳 $11.99</button>
      <button class="wd-btn btn-gold"   style="flex:1;font-size:10px;padding:8px 4px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_stars" data-id="${a.id}">⭐ 800</button>
    </div>
    ${window.RentalPay ? RentalPay.buildButton(a.id, RentalPay.rentalStarsFor(590)) : ''}
  </div>`;
}

function _pillsHtml(a) {
  let s = '';
  if (a.str  > 0) s += `<span class="wd-pill p-s">С+${a.str}</span>`;
  if (a.agi  > 0) s += `<span class="wd-pill p-a">Л+${a.agi}</span>`;
  if (a.intu > 0) s += `<span class="wd-pill p-i">И+${a.intu}</span>`;
  if (a.hp   > 0) s += `<span class="wd-pill p-e">+${a.hp} HP</span>`;
  if (a.id === 'armor_mythic4') s += `<span class="wd-pill p-s">+19 своб.ст</span>`;
  return s;
}

function _statLine(a) {
  const p = [];
  if (a.str  > 0) p.push(`Сила: +${a.str}`);
  if (a.agi  > 0) p.push(`Ловкость: +${a.agi}`);
  if (a.intu > 0) p.push(`Интуиция: +${a.intu}`);
  if (a.hp   > 0) p.push(`HP: +${a.hp}`);
  return p.join(' · ');
}

function show(scene, a, onAction, eq) {
  _injectCSS();
  document.getElementById('ard-backdrop')?.remove();

  const nc  = a.r === 'epic' ? ' epic' : a.r === 'mythic' ? ' mythic' : '';
  const src = ARMOR_IMG[a.id] || '';

  const div = document.createElement('div');
  div.id = 'ard-backdrop';
  div.className = 'ard-backdrop';
  div.innerHTML = `
    <div class="ard-card" style="--ag:${WGC[a.r]||WGC.common}">
      <button class="ard-x" id="ard-x-btn">✕</button>
      <div class="ard-img-area">
        <div class="ard-img-wrap">
          <img src="${src}" alt="${a.name}"
            onerror="this.style.display='none'"
            onload="typeof ArmorHTML!=='undefined'&&ArmorHTML._removeDarkBg&&ArmorHTML._removeDarkBg(this)"/>
        </div>
        <div class="ard-img-fade"></div>
      </div>
      <div class="ard-body">
        <div class="ard-wtype">${a.ht}</div>
        <div class="ard-name${nc}">${a.name}</div>
        <div class="ard-badge-row">
          <span class="ard-rarity" style="color:${RC[a.r]}">${RL[a.r]}</span>
          <span class="ard-dot">·</span>
          <span class="ard-price">${_priceLabel(a)}</span>
        </div>
        <div class="ard-stars" style="color:${RC[a.r]}">${a.stars}</div>
        <div class="ard-pills">${_pillsHtml(a)}</div>
        <div class="ard-stat-line">${_statLine(a)}</div>
        ${(typeof DetailCompare!=='undefined'?DetailCompare.html(a,eq,[{k:'str',label:'Сила',suf:''},{k:'agi',label:'Ловкость',suf:''},{k:'intu',label:'Интуиция',suf:''},{k:'hp',label:'HP',suf:''}]):'')}
        <div class="ard-desc">${ARMOR_DESC[a.id] || ''}</div>
        <div class="ard-btn-wrap">${_btnHtml(a)}</div>
      </div>
    </div>`;

  document.body.appendChild(div);

  div.querySelector('#ard-x-btn').onclick = () => div.remove();
  div.addEventListener('click', e => { if (e.target === div) div.remove(); });
  div.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    div.remove();
    if (onAction) onAction(btn.dataset.act, a);
  });
}

window.ArmorHTMLDetail = { show };
})();
