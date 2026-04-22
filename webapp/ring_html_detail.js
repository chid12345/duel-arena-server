/* ============================================================
   RingHTMLDetail — попап деталей кольца (карточка-просмотр)
   ============================================================ */
(() => {

const RING_IMG = {
  ring_free1:'ring_free1.png',  ring_free2:'ring_free2.png',
  ring_free3:'ring_free3.png',  ring_free4:'ring_free4.png',
  ring_gold1:'ring_gold1.png',  ring_gold2:'ring_gold2.png',
  ring_gold3:'ring_gold3.png',  ring_gold4:'ring_gold4.png',
  ring_dia1:'ring_dia1.png',    ring_dia2:'ring_dia2.png',
  ring_dia3:'ring_dia3.png',    ring_dia4:'ring_dia4.png',
  ring_mythic1:'ring_mythic1.png', ring_mythic2:'ring_mythic2.png',
  ring_mythic3:'ring_mythic3.png', ring_mythic4:'ring_mythic4.png',
};

const RING_DESC = {
  ring_free1:   'Кольцо с гравировкой ока — удары находят цель точнее. Ускоряет восстановление HP между боями. Приносит больше золота с побед.',
  ring_free2:   'Охотничий амулет: противник не может уйти от удара. HP восстанавливается быстрее. Дополнительный опыт за каждый бой.',
  ring_free3:   'Древнее кольцо тишины — мощный удар врага иногда не срабатывает. Ускоряет регенерацию HP. Золото копится быстрее.',
  ring_free4:   'Кольцо оков: сковывает движения врага, мешая двойным ударам. HP восстанавливается быстрее. Повышает получаемый опыт.',
  ring_gold1:   'Снайперское кольцо: точность высокого уровня — промахов почти нет. Регенерация HP заметно ускоряется. Золото прибывает быстрее.',
  ring_gold2:   'Кольцо преследователя: враг не скроется за уворотом. HP быстро восстанавливается между боями. Опыт накапливается эффективнее.',
  ring_gold3:   'Глубокая тишина гасит критические удары врага. Регенерация HP значительно ускорена. Приносит больше золота с каждой победы.',
  ring_gold4:   'Замедляет рефлексы противника: двойные удары врага редкость. Ускоренное восстановление HP. Бонус к получаемому опыту.',
  ring_dia1:    'Ясновидец не промахивается — точность на уровне легенд. Быстрая регенерация HP. Значительная прибавка к золоту.',
  ring_dia2:    'Неизбежность настигает любого: уворот врага ощутимо снижен. Мощная регенерация HP. Щедрая прибавка к опыту.',
  ring_dia3:    'Полное молчание: шанс погасить критический удар врага высок. Быстрое восстановление HP. Золото льётся рекой.',
  ring_dia4:    'Оцепенение: враг не собирается для двойного удара. Высокая скорость регенерации HP. Опыт растёт заметно быстрее.',
  ring_mythic1: 'Провидец видит каждый удар — промахи почти исключены. Максимальная скорость регенерации HP. Огромный бонус к золоту.',
  ring_mythic2: 'Рок настигает любого: уворот врага рушится. Сверхбыстрое восстановление HP. Мощный прирост опыта за победы.',
  ring_mythic3: 'Вечное безмолвие — критические удары врага гаснут на каждом шагу. HP восстанавливается стремительно. Золото множится.',
  ring_mythic4: 'Паралич воли: двойные удары врага тают в оцепенении. Максимальная регенерация HP. Опыт прибывает в полную силу.',
};

const RC  = {common:'#9ca3af', rare:'#60a5fa', epic:'#c084fc', mythic:'#fb923c'};
const RL  = {common:'ОБЫЧНЫЙ', rare:'РЕДКИЙ',  epic:'ЭПИЧЕСКИЙ', mythic:'МИФИЧЕСКИЙ'};
const WGC = {
  common:'rgba(140,148,165,.28)', rare:'rgba(96,165,250,.3)',
  epic:'rgba(168,85,247,.35)',    mythic:'rgba(249,115,22,.4)',
};

const CSS = `
.rgd-backdrop{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}
.rgd-card{position:relative;width:min(340px,90vw);border-radius:22px;overflow:hidden;background:rgba(10,6,24,.97);border:1.5px solid rgba(120,60,240,.35);box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 40px rgba(80,20,180,.2)}
.rgd-x{position:absolute;top:12px;right:12px;z-index:10;width:34px;height:34px;border-radius:10px;background:rgba(220,50,80,.2);border:1px solid rgba(255,80,120,.35);color:#fca5a5;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.rgd-x:hover{background:rgba(220,50,80,.4)}
.rgd-img-area{width:100%;height:190px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.rgd-img-area::before{content:'';position:absolute;bottom:5%;left:50%;translate:-50% 0;width:80%;height:60%;background:radial-gradient(ellipse at center,var(--bg,rgba(120,70,220,.3)),transparent 70%);filter:blur(14px);z-index:1;pointer-events:none}
.rgd-img-wrap{width:70%;height:80%;position:relative;z-index:2;animation:breathe 4s ease-in-out infinite;will-change:transform}
.rgd-img-wrap img{width:100%;height:100%;object-fit:contain}
.rgd-img-fade{position:absolute;bottom:0;inset-x:0;height:45%;background:linear-gradient(transparent,rgba(10,6,24,.97));z-index:3;pointer-events:none}
.rgd-body{padding:12px 18px 18px;display:flex;flex-direction:column;gap:5px}
.rgd-wtype{font-size:9px;color:#7a6aaa;text-transform:uppercase;letter-spacing:1.2px;font-weight:700}
.rgd-name{font-size:18px;font-weight:800;color:#f0eeff;letter-spacing:.3px}
.rgd-name.epic{background:linear-gradient(90deg,#c084fc,#e879f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.rgd-name.mythic{background:linear-gradient(90deg,#fb923c,#fbbf24,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.rgd-badge-row{display:flex;align-items:center;gap:7px}
.rgd-rarity{font-size:10px;font-weight:700;letter-spacing:.8px}
.rgd-dot{color:rgba(255,255,255,.3);font-size:10px}
.rgd-price{font-size:10px;font-weight:700;color:rgba(255,255,255,.55)}
.rgd-stars{font-size:12px}
.rgd-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}
.rgd-stat-line{font-size:11px;color:rgba(255,255,255,.55);line-height:1.5;margin-top:1px}
.rgd-desc{font-size:11px;color:rgba(255,255,255,.42);line-height:1.5}
.rgd-btn-wrap{margin-top:8px}`;

function _injectCSS() {
  if (document.getElementById('rgd-css')) return;
  const s = document.createElement('style');
  s.id = 'rgd-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _priceLabel(h) {
  if (h.type === 'free')     return 'БЕСПЛ.';
  if (h.type === 'gold')     return `${h.price} 💰`;
  if (h.type === 'diamonds') return `${h.price} 💎`;
  return '⭐ 490';
}

function _btnHtml(h) {
  if (h.equipped)
    return `<button class="wd-btn btn-uneq" style="width:100%" data-act="unequip" data-id="${h.id}">✅ Снять</button>`;
  if (h.owned && h.type !== 'free')
    return `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${h.id}">💍 Надеть</button>`;
  if (h.type === 'free')
    return `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${h.id}">🆓 Выбрать бесплатно</button>`;
  if (h.type === 'gold')
    return `<button class="wd-btn btn-gold" style="width:100%" data-act="buy" data-id="${h.id}">💰 Купить за ${h.price}</button>`;
  if (h.type === 'diamonds')
    return `<button class="wd-btn btn-dia" style="width:100%" data-act="buy" data-id="${h.id}">💎 Купить за ${h.price}</button>`;
  return `<div style="display:flex;gap:8px">
    <button class="wd-btn btn-mythic" style="flex:1;font-size:10px;padding:8px 4px" data-act="buy_usdt" data-id="${h.id}">💳 $11.99</button>
    <button class="wd-btn btn-gold"   style="flex:1;font-size:10px;padding:8px 4px;background:linear-gradient(135deg,#44240e,#92400e)" data-act="buy_stars" data-id="${h.id}">⭐ 490 Stars</button>
  </div>`;
}

function _pillsHtml(h) {
  let s = '';
  if (h.acc        > 0) s += `<span class="wd-pill p-a">+${h.acc}% точность</span>`;
  if (h.anti_dodge > 0) s += `<span class="wd-pill p-i">-${h.anti_dodge}% уворот врага</span>`;
  if (h.silence    > 0) s += `<span class="wd-pill p-s">${h.silence}% тишина</span>`;
  if (h.slow       > 0) s += `<span class="wd-pill p-e">${h.slow}% замедление</span>`;
  if (h.regen      > 0) s += `<span class="wd-pill p-r">+${h.regen}% реген</span>`;
  if (h.gold       > 0) s += `<span class="wd-pill p-g">+${h.gold}% золото</span>`;
  if (h.xp         > 0) s += `<span class="wd-pill p-x">+${h.xp}% опыт</span>`;
  return s;
}

function _statLine(h) {
  const p = [];
  if (h.acc        > 0) p.push(`Точность: +${h.acc}%`);
  if (h.anti_dodge > 0) p.push(`Антиуклон: -${h.anti_dodge}% уворот врага`);
  if (h.silence    > 0) p.push(`Тишина: ${h.silence}% глушит крит`);
  if (h.slow       > 0) p.push(`Замедление: -${h.slow}% двойной врага`);
  if (h.regen      > 0) p.push(`Реген HP: +${h.regen}%`);
  if (h.gold       > 0) p.push(`Золото: +${h.gold}%`);
  if (h.xp         > 0) p.push(`Опыт: +${h.xp}%`);
  return p.join(' · ');
}

function show(scene, h, onAction, eq) {
  _injectCSS();
  document.getElementById('rgd-backdrop')?.remove();

  const nc  = h.r === 'epic' ? ' epic' : h.r === 'mythic' ? ' mythic' : '';
  const src = RING_IMG[h.id] || '';

  const div = document.createElement('div');
  div.id = 'rgd-backdrop';
  div.className = 'rgd-backdrop';
  div.innerHTML = `
    <div class="rgd-card" style="--bg:${WGC[h.r]||WGC.common}">
      <button class="rgd-x" id="rgd-x-btn">✕</button>
      <div class="rgd-img-area">
        <div class="rgd-img-wrap">
          <img src="${src}" alt="${h.name}"
            onerror="this.style.display='none'"
            onload="typeof RingHTML!=='undefined'&&RingHTML._removeDarkBg&&RingHTML._removeDarkBg(this)"/>
        </div>
        <div class="rgd-img-fade"></div>
      </div>
      <div class="rgd-body">
        <div class="rgd-wtype">${h.ht}</div>
        <div class="rgd-name${nc}">${h.name}</div>
        <div class="rgd-badge-row">
          <span class="rgd-rarity" style="color:${RC[h.r]}">${RL[h.r]}</span>
          <span class="rgd-dot">·</span>
          <span class="rgd-price">${_priceLabel(h)}</span>
        </div>
        <div class="rgd-stars" style="color:${RC[h.r]}">${h.stars}</div>
        <div class="rgd-pills">${_pillsHtml(h)}</div>
        <div class="rgd-stat-line">${_statLine(h)}</div>
        ${(typeof DetailCompare!=='undefined'?DetailCompare.html(h,eq,[{k:'acc',label:'Точность',suf:'%'},{k:'anti_dodge',label:'Антиуклон',suf:'%'},{k:'silence',label:'Тишина',suf:'%'},{k:'slow',label:'Замедление',suf:'%'},{k:'regen',label:'Реген HP',suf:'%'},{k:'gold',label:'Золото',suf:'%'},{k:'xp',label:'Опыт',suf:'%'}]):'')}
        <div class="rgd-desc">${RING_DESC[h.id] || ''}</div>
        <div class="rgd-btn-wrap">${_btnHtml(h)}</div>
      </div>
    </div>`;

  document.body.appendChild(div);

  div.querySelector('#rgd-x-btn').onclick = () => div.remove();
  div.addEventListener('click', e => { if (e.target === div) div.remove(); });
  div.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    div.remove();
    if (onAction) onAction(btn.dataset.act, h);
  });
}

window.RingHTMLDetail = { show };
})();
