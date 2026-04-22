/* ============================================================
   WeaponHTMLDetail — попап деталей оружия (карточка-просмотр)
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

const WEAPON_DESC = {
  sword_free:    'Деревянное лезвие — первый шаг воина.',
  sword_gold:    'Закалённая сталь. Точные удары с повышенным крит-шансом.',
  sword_diamond: 'Руны усиливают каждый удар, пробивая защиту врага.',
  sword_mythic:  'Пламенный клинок уничтожает противников с одного удара.',
  axe_free:      'Каменный топор — грубая сила без затей.',
  axe_gold:      'Топор ополченца ломает броню и наносит тяжёлые раны.',
  axe_diamond:   'Секира с пробоем брони: ни один щит не выдержит.',
  axe_mythic:    'Топор хаоса несёт разрушение одним ударом.',
  club_free:     'Дубина увеличивает запас здоровья в бою.',
  club_gold:     'Усиленная дубина даёт серьёзный прирост HP.',
  club_diamond:  'Булава — сочетание удара и крепкого здоровья.',
  club_mythic:   'Молот колосса: огромный HP-буст и сокрушительный урон.',
  gs_free:       'Двуручный меч — скорость и крит в одном.',
  gs_gold:       'Меч паладина с высоким крит-статом.',
  gs_diamond:    'Клинок хаоса пронзает доспехи и жалит критом.',
  gs_mythic:     'Тень смерти — абсолютная крит-машина.',
};

const RC  = {common:'#9ca3af', rare:'#60a5fa', epic:'#c084fc', mythic:'#fb923c'};
const RL  = {common:'ОБЫЧНОЕ', rare:'РЕДКОЕ',  epic:'ЭПИЧЕСКОЕ', mythic:'МИФИЧЕСКОЕ'};
const WGC = {
  common:'rgba(140,148,165,.28)', rare:'rgba(251,191,36,.3)',
  epic:'rgba(168,85,247,.35)',    mythic:'rgba(249,115,22,.4)',
};

const CSS = `
.wnd-backdrop{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}
.wnd-card{position:relative;width:min(340px,90vw);border-radius:22px;overflow:hidden;background:rgba(10,6,24,.97);border:1.5px solid rgba(120,60,240,.35);box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 40px rgba(80,20,180,.2)}
.wnd-x{position:absolute;top:12px;right:12px;z-index:10;width:34px;height:34px;border-radius:10px;background:rgba(220,50,80,.2);border:1px solid rgba(255,80,120,.35);color:#fca5a5;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.wnd-x:hover{background:rgba(220,50,80,.4)}
.wnd-img-area{width:100%;height:190px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.wnd-img-area::before{content:'';position:absolute;bottom:5%;left:50%;translate:-50% 0;width:80%;height:60%;background:radial-gradient(ellipse at center,var(--wg,rgba(120,70,220,.3)),transparent 70%);filter:blur(14px);z-index:1;pointer-events:none}
.wnd-img-wrap2{width:70%;height:80%;position:relative;z-index:2;animation:breathe 4s ease-in-out infinite;will-change:transform}
.wnd-img-wrap2 img{width:100%;height:100%;object-fit:contain}
.wnd-img-fade{position:absolute;bottom:0;inset-x:0;height:45%;background:linear-gradient(transparent,rgba(10,6,24,.97));z-index:3;pointer-events:none}
.wnd-body{padding:12px 18px 18px;display:flex;flex-direction:column;gap:5px}
.wnd-wtype{font-size:9px;color:#7a6aaa;text-transform:uppercase;letter-spacing:1.2px;font-weight:700}
.wnd-name2{font-size:18px;font-weight:800;color:#f0eeff;letter-spacing:.3px}
.wnd-name2.epic{background:linear-gradient(90deg,#c084fc,#e879f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.wnd-name2.mythic{background:linear-gradient(90deg,#fb923c,#fbbf24,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.wnd-badge-row{display:flex;align-items:center;gap:7px}
.wnd-rarity2{font-size:10px;font-weight:700;letter-spacing:.8px}
.wnd-dot{color:rgba(255,255,255,.3);font-size:10px}
.wnd-price2{font-size:10px;font-weight:700;color:rgba(255,255,255,.55)}
.wnd-stars2{font-size:12px}
.wnd-pills2{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}
.wnd-stat-line{font-size:11px;color:rgba(255,255,255,.55);line-height:1.5;margin-top:1px}
.wnd-desc2{font-size:11px;color:rgba(255,255,255,.42);line-height:1.5}
.wnd-btn-wrap{margin-top:8px}`;

function _injectCSS() {
  if (document.getElementById('wnd-css')) return;
  const s = document.createElement('style');
  s.id = 'wnd-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _priceLabel(w) {
  if (w.type === 'free')     return 'БЕСПЛ.';
  if (w.type === 'gold')     return `${w.price} 💰`;
  if (w.type === 'diamonds') return `${w.price} 💎`;
  return '💳 / ⭐';
}

function _btnHtml(w) {
  if (w.equipped)
    return `<button class="wd-btn btn-uneq" style="width:100%" data-act="unequip" data-id="${w.id}">✅ Снять</button>`;
  if (w.owned && w.type !== 'free')
    return `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${w.id}">⚔️ Надеть</button>`;
  if (w.type === 'free')
    return `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${w.id}">🆓 Выбрать бесплатно</button>`;
  if (w.type === 'gold')
    return `<button class="wd-btn btn-gold" style="width:100%" data-act="buy" data-id="${w.id}">💰 Купить за ${w.price}</button>`;
  if (w.type === 'diamonds')
    return `<button class="wd-btn btn-dia" style="width:100%" data-act="buy" data-id="${w.id}">💎 Купить за ${w.price}</button>`;
  return `<div style="display:flex;gap:8px">
    <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:8px 4px" data-act="buy_usdt" data-id="${w.id}">💳 $11.99</button>
    <button class="wd-btn btn-gold"   style="flex:1;font-size:10px;padding:8px 4px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_stars" data-id="${w.id}">⭐ 590</button>
  </div>`;
}

function _pillsHtml(w) {
  let h = '';
  if (w.atk  > 0) h += `<span class="wd-pill p-s">+${w.atk} атк</span>`;
  if (w.crit > 0) h += `<span class="wd-pill p-i">+${w.crit} крит</span>`;
  if (w.hp   > 0) h += `<span class="wd-pill p-e">+${w.hp} HP</span>`;
  if (w.pen  > 0) h += `<span class="wd-pill p-a">+${w.pen}% пробой</span>`;
  return h;
}

function _statLine(w) {
  const parts = [];
  if (w.atk  > 0) parts.push(`Атака: +${w.atk}`);
  if (w.crit > 0) parts.push(`Крит-стат: +${w.crit}`);
  if (w.hp   > 0) parts.push(`HP: +${w.hp}`);
  if (w.pen  > 0) parts.push(`Пробой: +${w.pen}%`);
  return parts.join(' · ');
}

function show(scene, w, onAction, eq) {
  _injectCSS();
  document.getElementById('wnd-backdrop')?.remove();

  const nc  = w.r === 'epic' ? ' epic' : w.r === 'mythic' ? ' mythic' : '';
  const src = WEAPON_IMG[w.id] || '';

  const div = document.createElement('div');
  div.id = 'wnd-backdrop';
  div.className = 'wnd-backdrop';
  div.innerHTML = `
    <div class="wnd-card" style="--wg:${WGC[w.r]||WGC.common}">
      <button class="wnd-x" id="wnd-x-btn">✕</button>
      <div class="wnd-img-area">
        <div class="wnd-img-wrap2">
          <img src="${src}" alt="${w.name}"
            onerror="this.style.display='none'"
            onload="typeof WeaponHTML!=='undefined'&&WeaponHTML._removeDarkBg&&WeaponHTML._removeDarkBg(this)"/>
        </div>
        <div class="wnd-img-fade"></div>
      </div>
      <div class="wnd-body">
        <div class="wnd-wtype">${w.wt}</div>
        <div class="wnd-name2${nc}">${w.name}</div>
        <div class="wnd-badge-row">
          <span class="wnd-rarity2" style="color:${RC[w.r]}">${RL[w.r]}</span>
          <span class="wnd-dot">·</span>
          <span class="wnd-price2">${_priceLabel(w)}</span>
        </div>
        <div class="wnd-stars2" style="color:${RC[w.r]}">${w.stars}</div>
        <div class="wnd-pills2">${_pillsHtml(w)}</div>
        <div class="wnd-stat-line">${_statLine(w)}</div>
        ${(typeof DetailCompare!=='undefined'?DetailCompare.html(w,eq,[{k:'atk',label:'Атака',suf:''},{k:'crit',label:'Крит',suf:''},{k:'hp',label:'HP',suf:''},{k:'pen',label:'Пробой',suf:'%'}]):'')}
        <div class="wnd-desc2">${WEAPON_DESC[w.id] || ''}</div>
        <div class="wnd-btn-wrap">${_btnHtml(w)}</div>
      </div>
    </div>`;

  document.body.appendChild(div);

  div.querySelector('#wnd-x-btn').onclick = () => div.remove();
  div.addEventListener('click', e => { if (e.target === div) div.remove(); });
  div.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    div.remove();
    if (onAction) onAction(btn.dataset.act, w);
  });
}

window.WeaponHTMLDetail = { show };
})();
