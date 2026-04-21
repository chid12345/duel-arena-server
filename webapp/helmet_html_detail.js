/* ============================================================
   HelmetHTMLDetail — попап деталей шлема (карточка-просмотр)
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

const HELMET_DESC = {
  helmet_free1:   'Простой кожаный шлем — даёт запас прочности новичку.',
  helmet_free2:   'Железная броня для головы поглощает часть каждого удара.',
  helmet_free3:   'Открытый шлем охотника не сковывает движений — атака острее.',
  helmet_free4:   'Узкий шлем дуэлянта повышает концентрацию — крит точнее.',
  helmet_gold1:   'Берсерк не думает о защите — только атака и хаос крита.',
  helmet_gold2:   'Массивный шлем крепости: ни удар, ни HP не пройдут мимо.',
  helmet_gold3:   'Шлем снайпера: каждый крит наносит максимальный урон.',
  helmet_gold4:   'Паладин сочетает нападение и защиту — ни шага назад.',
  helmet_dia1:    'Демонический шлем разжигает ярость: атака и крит слиты воедино.',
  helmet_dia2:    'Стальная крепость: абсолютная защита без компромиссов.',
  helmet_dia3:    'Шлем арканы усиливает крит и одновременно гасит урон врага.',
  helmet_dia4:    'Разрушитель ломает броню насквозь — пробой делает своё дело.',
  helmet_mythic1: 'Шлем дракона — универсальный топ: урон, защита и HP в одном.',
  helmet_mythic2: 'Корона воителя для агрессоров: урон, крит и немного защиты.',
  helmet_mythic3: 'Маска смерти — чистый убийца: максимум атаки, пробой, крит.',
  helmet_mythic4: 'Шлем богов делает тебя неубиваемым: HP, защита и крит-стат.',
};

const RC  = {common:'#9ca3af', rare:'#60a5fa', epic:'#c084fc', mythic:'#fb923c'};
const RL  = {common:'ОБЫЧНЫЙ', rare:'РЕДКИЙ',  epic:'ЭПИЧЕСКИЙ', mythic:'МИФИЧЕСКИЙ'};
const WGC = {
  common:'rgba(140,148,165,.28)', rare:'rgba(96,165,250,.3)',
  epic:'rgba(168,85,247,.35)',    mythic:'rgba(249,115,22,.4)',
};

const CSS = `
.hnd-backdrop{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}
.hnd-card{position:relative;width:min(340px,90vw);border-radius:22px;overflow:hidden;background:rgba(10,6,24,.97);border:1.5px solid rgba(120,60,240,.35);box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 40px rgba(80,20,180,.2)}
.hnd-x{position:absolute;top:12px;right:12px;z-index:10;width:34px;height:34px;border-radius:10px;background:rgba(220,50,80,.2);border:1px solid rgba(255,80,120,.35);color:#fca5a5;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.hnd-x:hover{background:rgba(220,50,80,.4)}
.hnd-img-area{width:100%;height:190px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.hnd-img-area::before{content:'';position:absolute;bottom:5%;left:50%;translate:-50% 0;width:80%;height:60%;background:radial-gradient(ellipse at center,var(--hg,rgba(120,70,220,.3)),transparent 70%);filter:blur(14px);z-index:1;pointer-events:none}
.hnd-img-wrap{width:70%;height:80%;position:relative;z-index:2;animation:breathe 4s ease-in-out infinite;will-change:transform}
.hnd-img-wrap img{width:100%;height:100%;object-fit:contain}
.hnd-img-fade{position:absolute;bottom:0;inset-x:0;height:45%;background:linear-gradient(transparent,rgba(10,6,24,.97));z-index:3;pointer-events:none}
.hnd-body{padding:12px 18px 18px;display:flex;flex-direction:column;gap:5px}
.hnd-wtype{font-size:9px;color:#7a6aaa;text-transform:uppercase;letter-spacing:1.2px;font-weight:700}
.hnd-name{font-size:18px;font-weight:800;color:#f0eeff;letter-spacing:.3px}
.hnd-name.epic{background:linear-gradient(90deg,#c084fc,#e879f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hnd-name.mythic{background:linear-gradient(90deg,#fb923c,#fbbf24,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hnd-badge-row{display:flex;align-items:center;gap:7px}
.hnd-rarity{font-size:10px;font-weight:700;letter-spacing:.8px}
.hnd-dot{color:rgba(255,255,255,.3);font-size:10px}
.hnd-price{font-size:10px;font-weight:700;color:rgba(255,255,255,.55)}
.hnd-stars{font-size:12px}
.hnd-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}
.hnd-stat-line{font-size:11px;color:rgba(255,255,255,.55);line-height:1.5;margin-top:1px}
.hnd-desc{font-size:11px;color:rgba(255,255,255,.42);line-height:1.5}
.hnd-btn-wrap{margin-top:8px}`;

function _injectCSS() {
  if (document.getElementById('hnd-css')) return;
  const s = document.createElement('style');
  s.id = 'hnd-css'; s.textContent = CSS;
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
    return `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${h.id}">⛑️ Надеть</button>`;
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
  document.getElementById('hnd-backdrop')?.remove();

  const nc  = h.r === 'epic' ? ' epic' : h.r === 'mythic' ? ' mythic' : '';
  const src = HELMET_IMG[h.id] || '';

  const div = document.createElement('div');
  div.id = 'hnd-backdrop';
  div.className = 'hnd-backdrop';
  div.innerHTML = `
    <div class="hnd-card" style="--hg:${WGC[h.r]||WGC.common}">
      <button class="hnd-x" id="hnd-x-btn">✕</button>
      <div class="hnd-img-area">
        <div class="hnd-img-wrap">
          <img src="${src}" alt="${h.name}"
            onerror="this.style.display='none'"
            onload="typeof HelmetHTML!=='undefined'&&HelmetHTML._removeDarkBg&&HelmetHTML._removeDarkBg(this)"/>
        </div>
        <div class="hnd-img-fade"></div>
      </div>
      <div class="hnd-body">
        <div class="hnd-wtype">${h.ht}</div>
        <div class="hnd-name${nc}">${h.name}</div>
        <div class="hnd-badge-row">
          <span class="hnd-rarity" style="color:${RC[h.r]}">${RL[h.r]}</span>
          <span class="hnd-dot">·</span>
          <span class="hnd-price">${_priceLabel(h)}</span>
        </div>
        <div class="hnd-stars" style="color:${RC[h.r]}">${h.stars}</div>
        <div class="hnd-pills">${_pillsHtml(h)}</div>
        <div class="hnd-stat-line">${_statLine(h)}</div>
        <div class="hnd-desc">${HELMET_DESC[h.id] || ''}</div>
        <div class="hnd-btn-wrap">${_btnHtml(h)}</div>
      </div>
    </div>`;

  document.body.appendChild(div);

  div.querySelector('#hnd-x-btn').onclick = () => div.remove();
  div.addEventListener('click', e => { if (e.target === div) div.remove(); });
  div.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    div.remove();
    if (onAction) onAction(btn.dataset.act, h);
  });
}

window.HelmetHTMLDetail = { show };
})();
