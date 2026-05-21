/* ============================================================
   Armor2HTMLDetail — попап деталей брони (карточка-просмотр).
   Симметрично HelmetHTMLDetail и ShieldHTMLDetail.
   Открывается при тапе по карточке в armor2_overlay.js.
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

const ARMOR2_DESC = {
  armor2_free1:    'Простая кираса ополченца — даёт чистый прирост силы новичку.',
  armor2_free2:    'Лёгкий жилет следопыта — ставка на скорость и уворот.',
  armor2_free3:    'Роба ученика — обостряет внимание и интуицию в бою.',
  armor2_free4:    'Плащ странника — баланс трёх статов и небольшой запас HP.',
  armor2_gold1:    'Панцирь берсерка — мощный плюс к силе для агрессивного стиля.',
  armor2_gold2:    'Кольчуга теней — увеличивает ловкость, реже бьёт враг.',
  armor2_gold3:    'Мантия чародея — прирост интуиции, чаще проходят криты.',
  armor2_gold4:    'Броня стража — равномерный буст всех статов + HP.',
  armor2_dia1:     'Латы кровавого вождя — топ силы за алмазы, ставка на урон.',
  armor2_dia2:     'Плащ ночного клинка — топ ловкости, максимум уворота.',
  armor2_dia3:     'Одеяние архимага — топ интуиции, ставка на криты.',
  armor2_dia4:     'Латы паладина зари — баланс на алмазах, универсальный вариант.',
  armor2_mythic1:  'Доспех пламенного титана — лучший прирост силы в игре.',
  armor2_mythic2:  'Облачение призрака ветров — лучший прирост ловкости в игре.',
  armor2_mythic3:  'Регалии повелителя молний — лучший прирост интуиции в игре.',
  armor2_mythic4:  'Доспех светоносного бога — −15% урона по телу, 19 свободных статов и личная пассивка.',
};

const RC  = {common:'#9ca3af', rare:'#60a5fa', epic:'#c084fc', mythic:'#fb923c'};
const RL  = {common:'ОБЫЧНАЯ', rare:'РЕДКАЯ',  epic:'ЭПИЧЕСКАЯ', mythic:'МИФИЧЕСКАЯ'};
const WGC = {
  common:'rgba(140,148,165,.28)', rare:'rgba(96,165,250,.3)',
  epic:'rgba(168,85,247,.35)',    mythic:'rgba(249,115,22,.4)',
};

const CSS = `
.a2d-backdrop{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}
.a2d-card{position:relative;width:min(340px,90vw);border-radius:22px;overflow-x:hidden;overflow-y:auto;max-height:92vh;background:rgba(10,6,24,.97);border:1.5px solid rgba(120,60,240,.35);box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 40px rgba(80,20,180,.2)}
.a2d-x{position:absolute;top:12px;right:12px;z-index:10;width:34px;height:34px;border-radius:10px;background:rgba(220,50,80,.2);border:1px solid rgba(255,80,120,.35);color:#fca5a5;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.a2d-x:hover{background:rgba(220,50,80,.4)}
.a2d-img-area{width:100%;height:190px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.a2d-img-area::before{content:'';position:absolute;bottom:5%;left:50%;translate:-50% 0;width:80%;height:60%;background:radial-gradient(ellipse at center,var(--ag,rgba(120,70,220,.3)),transparent 70%);filter:blur(14px);z-index:1;pointer-events:none}
.a2d-img-wrap{width:70%;height:80%;position:relative;z-index:2;animation:breathe 4s ease-in-out infinite;will-change:transform}
.a2d-img-wrap img{width:100%;height:100%;object-fit:contain}
.a2d-img-fade{position:absolute;bottom:0;inset-x:0;height:45%;background:linear-gradient(transparent,rgba(10,6,24,.97));z-index:3;pointer-events:none}
.a2d-body{padding:12px 18px 18px;display:flex;flex-direction:column;gap:5px}
.a2d-wtype{font-size:9px;color:#7a6aaa;text-transform:uppercase;letter-spacing:1.2px;font-weight:700}
.a2d-name{font-size:18px;font-weight:800;color:#f0eeff;letter-spacing:.3px}
.a2d-name.epic{background:linear-gradient(90deg,#c084fc,#e879f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.a2d-name.mythic{background:linear-gradient(90deg,#fb923c,#fbbf24,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.a2d-badge-row{display:flex;align-items:center;gap:7px}
.a2d-rarity{font-size:10px;font-weight:700;letter-spacing:.8px}
.a2d-dot{color:rgba(255,255,255,.3);font-size:10px}
.a2d-price{font-size:10px;font-weight:700;color:rgba(255,255,255,.55)}
.a2d-stars{font-size:12px}
.a2d-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}
.a2d-stat-line{font-size:11px;color:rgba(255,255,255,.55);line-height:1.5;margin-top:1px}
.a2d-desc{font-size:11px;color:rgba(255,255,255,.42);line-height:1.5}
.a2d-btn-wrap{margin-top:8px}`;

function _injectCSS() {
  if (document.getElementById('a2d-css')) return;
  const s = document.createElement('style');
  s.id = 'a2d-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _priceLabel(a) {
  if (a.type === 'gold')     return `${a.price} 💰`;
  if (a.type === 'diamonds') return `${a.price} 💎`;
  return '💳 / ⭐';
}

function _btnHtml(a) {
  // armor2_mythic4 (Легендарная): когда куплена — показываем «⚙️ Настроить статы»
  // (открывает LegendaryArmor2 с распределением +19 + сбросом за полцены) рядом
  // со стандартными кнопками Снять/Надеть/Прокачать.
  const isLegendary = a.id === 'armor2_mythic4';
  const cfgBtn = isLegendary
    ? `<button class="wd-btn btn-mythic" data-act="configure_legendary" data-id="${a.id}" style="flex:1;background:linear-gradient(135deg,#1a5a3a,#3cd084);color:#0a1810;font-size:11px;padding:8px 4px">⚙️ Настроить статы</button>`
    : '';
  if (a.equipped)
    return `<div style="display:flex;gap:4px;flex-wrap:wrap">
      <button class="wd-btn btn-uneq" data-act="unequip" data-id="${a.id}" style="flex:1;min-width:40%">✅ Снять</button>
      <button class="wd-btn btn-gold" data-act="upgrade" data-id="${a.id}" style="flex:1;min-width:40%;background:linear-gradient(135deg,#3a2050,#7c2d92);color:#fff">🔨 Прокачать</button>
      ${cfgBtn ? `<div style="flex-basis:100%;height:0"></div>${cfgBtn}` : ''}
    </div>`;
  if (a.owned && a.type !== 'free')
    return isLegendary
      ? `<div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="wd-btn btn-free" style="flex:1;min-width:40%" data-act="buy" data-id="${a.id}">🛡 Надеть</button>
          ${cfgBtn}
        </div>`
      : `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${a.id}">🛡 Надеть</button>`;
  if (window.LevelLock?.isLocked(a)) return LevelLock.lockedBtn(a);
  if (a.id === 'armor2_mythic4')
    return `<div style="display:flex;gap:6px">
      <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:8px 4px" data-act="buy_legendary_usdt" data-id="${a.id}">💳 $11.99</button>
      <button class="wd-btn btn-gold" style="flex:1;font-size:10px;padding:8px 4px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_legendary_stars" data-id="${a.id}">⭐ 800</button>
    </div>`;
  if (a.type === 'gold')
    return `<button class="wd-btn btn-gold" style="width:100%" data-act="buy" data-id="${a.id}">💰 Купить за ${a.price}</button>`;
  if (a.type === 'diamonds')
    return `<button class="wd-btn btn-dia" style="width:100%" data-act="buy" data-id="${a.id}">💎 Купить за ${a.price}</button>`;
  return `<div>
    <div style="display:flex;gap:6px">
      <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:8px 4px" data-act="buy_usdt" data-id="${a.id}">💳 $11.99</button>
      <button class="wd-btn btn-gold"   style="flex:1;font-size:10px;padding:8px 4px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_stars" data-id="${a.id}">⭐ 800</button>
    </div>
    ${window.RentalPay ? RentalPay.buildButton(a.id) : ''}
  </div>`;
}

function _pillsHtml(a) {
  const b = window.PlusBadge ? window.PlusBadge.boostItem(a) : a;
  let s = '';
  if (a.str  > 0) s += `<span class="wd-pill p-s">С+${b.str}</span>`;
  if (a.agi  > 0) s += `<span class="wd-pill p-a">Л+${b.agi}</span>`;
  if (a.intu > 0) s += `<span class="wd-pill p-i">И+${b.intu}</span>`;
  if (a.hp   > 0) s += `<span class="wd-pill p-e">+${b.hp} HP</span>`;
  if (a.id === 'armor2_mythic4') s += `<span class="wd-pill p-s">+19 своб.ст</span>`;
  return s;
}

function _statLine(a) {
  const n = window.PlusBadge ? window.PlusBadge.level(a.id) : 0;
  const b = window.PlusBadge ? window.PlusBadge.boostItem(a) : a;
  const p = [];
  if (a.str  > 0) p.push(`Сила: +${b.str}`);
  if (a.agi  > 0) p.push(`Ловкость: +${b.agi}`);
  if (a.intu > 0) p.push(`Интуиция: +${b.intu}`);
  if (a.hp   > 0) p.push(`HP: +${b.hp}`);
  const line = p.join(' · ');
  // Подсказка, что числа уже усилены прокачкой.
  return n > 0 ? `${line}　<span style="color:#ffd55a">(прокачка +${n})</span>` : line;
}

function show(scene, a, onAction, eq) {
  _injectCSS();
  document.getElementById('a2d-backdrop')?.remove();

  const nc  = a.r === 'epic' ? ' epic' : a.r === 'mythic' ? ' mythic' : '';
  const src = ARMOR2_IMG[a.id] || '';

  const div = document.createElement('div');
  div.id = 'a2d-backdrop';
  div.className = 'a2d-backdrop';
  div.innerHTML = `
    <div class="a2d-card" style="--ag:${WGC[a.r]||WGC.common}">
      <button class="a2d-x" id="a2d-x-btn">✕</button>
      <div class="a2d-img-area">
        <div class="a2d-img-wrap">
          <img src="${src}" alt="${a.name}"
            onerror="this.style.display='none'"
            onload="typeof Armor2HTML!=='undefined'&&Armor2HTML._removeDarkBg&&Armor2HTML._removeDarkBg(this)"/>
        </div>
        <div class="a2d-img-fade"></div>
      </div>
      <div class="a2d-body">
        <div class="a2d-wtype">${a.ht}</div>
        <div class="a2d-name${nc}">${a.name}</div>
        <div class="a2d-badge-row">
          <span class="a2d-rarity" style="color:${RC[a.r]}">${RL[a.r]}</span>
          <span class="a2d-dot">·</span>
          <span class="a2d-price">${_priceLabel(a)}</span>
        </div>
        <div class="a2d-stars" style="color:${RC[a.r]}">${a.stars} ${window.PlusBadge?.badge(a.id) || ''}</div>
        <div class="a2d-pills">${_pillsHtml(a)}</div>
        <div class="a2d-stat-line">${_statLine(a)}</div>
        ${(typeof DetailCompare!=='undefined'?DetailCompare.html(a,eq,[{k:'str',label:'Сила',suf:''},{k:'agi',label:'Ловкость',suf:''},{k:'intu',label:'Интуиция',suf:''},{k:'hp',label:'HP',suf:''}]):'')}
        ${window.ArchBadge?.detailBlock(a.id) || ''}
        ${a.bonus ? `<div style="margin-top:6px;padding:8px 10px;border-radius:8px;background:rgba(255,180,80,.10);border:1px solid rgba(255,180,80,.25);font-size:11px;color:#ffd29a;line-height:1.45">✨ <b>Особенность:</b> ${a.bonus}</div>` : ''}
        <div class="a2d-desc">${ARMOR2_DESC[a.id] || ''}</div>
        <div class="a2d-btn-wrap">${_btnHtml(a)}</div>
      </div>
    </div>`;

  document.body.appendChild(div);

  div.querySelector('#a2d-x-btn').onclick = () => div.remove();
  div.addEventListener('click', e => { if (e.target === div) div.remove(); });
  div.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    div.remove();
    if (onAction) onAction(btn.dataset.act, a);
  });
}

window.Armor2HTMLDetail = { show };
})();
