/* ============================================================
   BootsHTMLDetail — попап деталей сапог (карточка-просмотр)
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

const BOOTS_DESC = {
  boots_free1:   'Крепкие кожаные сапоги — дают запас прочности каждому новобранцу.',
  boots_free2:   'Стальные накладки принимают часть каждого удара на себя.',
  boots_free3:   'Лёгкие сапоги охотника не сковывают движений — удар быстрее.',
  boots_free4:   'Узкий носок дуэлянта улучшает стойку — крит точнее.',
  boots_gold1:   'Берсерк топчет врагов без остановки — атака и хаос крита.',
  boots_gold2:   'Массивные сапоги крепости: ни удар, ни HP не пройдут мимо.',
  boots_gold3:   'Сапоги снайпера: каждый шаг — расчёт, каждый крит — максимум.',
  boots_gold4:   'Паладин стоит твёрдо — атака и защита в одном шаге.',
  boots_dia1:    'Демонические сапоги разжигают ярость: атака и крит слиты воедино.',
  boots_dia2:    'Стальные сапоги: абсолютная защита, ни шагу назад.',
  boots_dia3:    'Сапоги арканы усиливают крит и гасят урон врага одновременно.',
  boots_dia4:    'Разрушитель ломает броню насквозь — пробой делает своё дело.',
  boots_mythic1: 'Сапоги дракона — универсальный топ: урон, защита и HP в одном.',
  boots_mythic2: 'Поступь воителя для агрессоров: урон, крит и немного защиты.',
  boots_mythic3: 'Сапоги смерти — чистый убийца: максимум атаки, пробой, крит.',
  boots_mythic4: 'Сапоги богов делают тебя неубиваемым: HP, защита и крит-стат.',
};

const RC  = {common:'#9ca3af', rare:'#60a5fa', epic:'#c084fc', mythic:'#fb923c'};
const RL  = {common:'ОБЫЧНЫЙ', rare:'РЕДКИЙ',  epic:'ЭПИЧЕСКИЙ', mythic:'МИФИЧЕСКИЙ'};
const WGC = {
  common:'rgba(140,148,165,.28)', rare:'rgba(96,165,250,.3)',
  epic:'rgba(168,85,247,.35)',    mythic:'rgba(249,115,22,.4)',
};

const CSS = `
.bnd-backdrop{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}
.bnd-card{position:relative;width:min(340px,90vw);border-radius:22px;overflow:hidden;background:rgba(10,6,24,.97);border:1.5px solid rgba(120,60,240,.35);box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 40px rgba(80,20,180,.2)}
.bnd-x{position:absolute;top:12px;right:12px;z-index:10;width:34px;height:34px;border-radius:10px;background:rgba(220,50,80,.2);border:1px solid rgba(255,80,120,.35);color:#fca5a5;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.bnd-x:hover{background:rgba(220,50,80,.4)}
.bnd-img-area{width:100%;height:190px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.bnd-img-area::before{content:'';position:absolute;bottom:5%;left:50%;translate:-50% 0;width:80%;height:60%;background:radial-gradient(ellipse at center,var(--bg,rgba(120,70,220,.3)),transparent 70%);filter:blur(14px);z-index:1;pointer-events:none}
.bnd-img-wrap{width:70%;height:80%;position:relative;z-index:2;animation:breathe 4s ease-in-out infinite;will-change:transform}
.bnd-img-wrap img{width:100%;height:100%;object-fit:contain}
.bnd-img-fade{position:absolute;bottom:0;inset-x:0;height:45%;background:linear-gradient(transparent,rgba(10,6,24,.97));z-index:3;pointer-events:none}
.bnd-body{padding:12px 18px 18px;display:flex;flex-direction:column;gap:5px}
.bnd-wtype{font-size:9px;color:#7a6aaa;text-transform:uppercase;letter-spacing:1.2px;font-weight:700}
.bnd-name{font-size:18px;font-weight:800;color:#f0eeff;letter-spacing:.3px}
.bnd-name.epic{background:linear-gradient(90deg,#c084fc,#e879f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.bnd-name.mythic{background:linear-gradient(90deg,#fb923c,#fbbf24,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.bnd-badge-row{display:flex;align-items:center;gap:7px}
.bnd-rarity{font-size:10px;font-weight:700;letter-spacing:.8px}
.bnd-dot{color:rgba(255,255,255,.3);font-size:10px}
.bnd-price{font-size:10px;font-weight:700;color:rgba(255,255,255,.55)}
.bnd-stars{font-size:12px}
.bnd-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}
.bnd-stat-line{font-size:11px;color:rgba(255,255,255,.55);line-height:1.5;margin-top:1px}
.bnd-desc{font-size:11px;color:rgba(255,255,255,.42);line-height:1.5}
.bnd-btn-wrap{margin-top:8px}`;

function _injectCSS() {
  if (document.getElementById('bnd-css')) return;
  const s = document.createElement('style');
  s.id = 'bnd-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _priceLabel(h) {
  if (h.type === 'free')     return 'БЕСПЛ.';
  if (h.type === 'gold')     return `${h.price} 💰`;
  if (h.type === 'diamonds') return `${h.price} 💎`;
  return '💳 / ⭐';
}

function _btnHtml(h) {
  if (h.equipped)
    return `<button class="wd-btn btn-uneq" style="width:100%" data-act="unequip" data-id="${h.id}">✅ Снять</button>`;
  if (h.owned && h.type !== 'free')
    return `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${h.id}">👟 Надеть</button>`;
  if (h.type === 'free')
    return `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${h.id}">🆓 Выбрать бесплатно</button>`;
  if (h.type === 'gold')
    return `<button class="wd-btn btn-gold" style="width:100%" data-act="buy" data-id="${h.id}">💰 Купить за ${h.price}</button>`;
  if (h.type === 'diamonds')
    return `<button class="wd-btn btn-dia" style="width:100%" data-act="buy" data-id="${h.id}">💎 Купить за ${h.price}</button>`;
  return `<div style="display:flex;gap:8px">
    <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:8px 4px" data-act="buy_usdt" data-id="${h.id}">💳 $11.99</button>
    <button class="wd-btn btn-gold"   style="flex:1;font-size:10px;padding:8px 4px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_stars" data-id="${h.id}">⭐ 590</button>
  </div>`;
}

function _pillsHtml(h) {
  let s = '';
  if (h.atk  > 0) s += `<span class="wd-pill p-s">+${h.atk} атк</span>`;
  if (h.crit > 0) s += `<span class="wd-pill p-i">+${h.crit} крит</span>`;
  if (h.hp   > 0) s += `<span class="wd-pill p-e">+${h.hp} HP</span>`;
  if (h.def  > 0) s += `<span class="wd-pill p-a">-${h.def}% урона врага</span>`;
  if (h.pen  > 0) s += `<span class="wd-pill p-s">+${h.pen}% пробой</span>`;
  return s;
}

function _statLine(h) {
  const p = [];
  if (h.atk  > 0) p.push(`Атака: +${h.atk}`);
  if (h.crit > 0) p.push(`Крит-стат: +${h.crit}`);
  if (h.hp   > 0) p.push(`HP: +${h.hp}`);
  if (h.def  > 0) p.push(`Урон врага: -${h.def}%`);
  if (h.pen  > 0) p.push(`Пробой: +${h.pen}%`);
  return p.join(' · ');
}

function show(scene, h, onAction) {
  _injectCSS();
  document.getElementById('bnd-backdrop')?.remove();

  const nc  = h.r === 'epic' ? ' epic' : h.r === 'mythic' ? ' mythic' : '';
  const src = BOOTS_IMG[h.id] || '';

  const div = document.createElement('div');
  div.id = 'bnd-backdrop';
  div.className = 'bnd-backdrop';
  div.innerHTML = `
    <div class="bnd-card" style="--bg:${WGC[h.r]||WGC.common}">
      <button class="bnd-x" id="bnd-x-btn">✕</button>
      <div class="bnd-img-area">
        <div class="bnd-img-wrap">
          <img src="${src}" alt="${h.name}"
            onerror="this.style.display='none'"
            onload="typeof BootsHTML!=='undefined'&&BootsHTML._removeDarkBg&&BootsHTML._removeDarkBg(this)"/>
        </div>
        <div class="bnd-img-fade"></div>
      </div>
      <div class="bnd-body">
        <div class="bnd-wtype">${h.ht}</div>
        <div class="bnd-name${nc}">${h.name}</div>
        <div class="bnd-badge-row">
          <span class="bnd-rarity" style="color:${RC[h.r]}">${RL[h.r]}</span>
          <span class="bnd-dot">·</span>
          <span class="bnd-price">${_priceLabel(h)}</span>
        </div>
        <div class="bnd-stars" style="color:${RC[h.r]}">${h.stars}</div>
        <div class="bnd-pills">${_pillsHtml(h)}</div>
        <div class="bnd-stat-line">${_statLine(h)}</div>
        <div class="bnd-desc">${BOOTS_DESC[h.id] || ''}</div>
        <div class="bnd-btn-wrap">${_btnHtml(h)}</div>
      </div>
    </div>`;

  document.body.appendChild(div);

  div.querySelector('#bnd-x-btn').onclick = () => div.remove();
  div.addEventListener('click', e => { if (e.target === div) div.remove(); });
  div.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    div.remove();
    if (onAction) onAction(btn.dataset.act, h);
  });
}

window.BootsHTMLDetail = { show };
})();
