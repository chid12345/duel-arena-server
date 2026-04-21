/* ============================================================
   ShieldHTMLDetail — попап деталей щита (карточка-просмотр)
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

const SHIELD_DESC = {
  shield_free1:   'Деревянный щит ополченца — гасит часть входящего урона.',
  shield_free2:   'Крепкий и тяжёлый — даёт запас жизни без лишних хитростей.',
  shield_free3:   'Закалённая сталь поглощает силу критических ударов.',
  shield_free4:   'Универсальный щит новобранца — немного всего нужного.',
  shield_gold1:   'Рыцарская защита: серьёзное снижение входящего урона.',
  shield_gold2:   'Великанский запас HP — пережить удар там, где другие падают.',
  shield_gold3:   'Паладин не боится критов — их сила здесь ослаблена на 18%.',
  shield_gold4:   'Хранитель держит всё сразу: броня, жизнь и устойчивость к критам.',
  shield_dia1:    'Драконья чешуя: -10% к каждому удару. Почти непробиваемый.',
  shield_dia2:    'Колосс не умирает — 200 HP это целый дополнительный запас.',
  shield_dia3:    'Непоколебимый: крит-удары теряют 25% мощи о этот щит.',
  shield_dia4:    'Аркана баланса — защита, жизнь и крит-сопротивление в одном.',
  shield_mythic1: 'Щит Судьбы: -14% урона и +160 HP — лучший для выживания.',
  shield_mythic2: 'Щит Бессмертного: огромный HP-запас + 20% сопротивление критам.',
  shield_mythic3: 'Щит Рока: критические удары теряют 30% мощи. Кошмар крит-билдов.',
  shield_mythic4: 'Щит Богов — универсальный топ: броня, жизнь и крит-сопротивление.',
};

const RC  = {common:'#9ca3af', rare:'#60a5fa', epic:'#c084fc', mythic:'#fb923c'};
const RL  = {common:'ОБЫЧНЫЙ', rare:'РЕДКИЙ',  epic:'ЭПИЧЕСКИЙ', mythic:'МИФИЧЕСКИЙ'};
const WGC = {
  common:'rgba(140,148,165,.28)', rare:'rgba(96,165,250,.3)',
  epic:'rgba(168,85,247,.35)',    mythic:'rgba(249,115,22,.4)',
};

const CSS = `
.shd-backdrop{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}
.shd-card{position:relative;width:min(340px,90vw);border-radius:22px;overflow:hidden;background:rgba(10,6,24,.97);border:1.5px solid rgba(120,60,240,.35);box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 40px rgba(80,20,180,.2)}
.shd-x{position:absolute;top:12px;right:12px;z-index:10;width:34px;height:34px;border-radius:10px;background:rgba(220,50,80,.2);border:1px solid rgba(255,80,120,.35);color:#fca5a5;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.shd-x:hover{background:rgba(220,50,80,.4)}
.shd-img-area{width:100%;height:190px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.shd-img-area::before{content:'';position:absolute;bottom:5%;left:50%;translate:-50% 0;width:80%;height:60%;background:radial-gradient(ellipse at center,var(--bg,rgba(120,70,220,.3)),transparent 70%);filter:blur(14px);z-index:1;pointer-events:none}
.shd-img-wrap{width:70%;height:80%;position:relative;z-index:2;animation:breathe 4s ease-in-out infinite;will-change:transform}
.shd-img-wrap img{width:100%;height:100%;object-fit:contain}
.shd-img-fade{position:absolute;bottom:0;inset-x:0;height:45%;background:linear-gradient(transparent,rgba(10,6,24,.97));z-index:3;pointer-events:none}
.shd-body{padding:12px 18px 18px;display:flex;flex-direction:column;gap:5px}
.shd-wtype{font-size:9px;color:#7a6aaa;text-transform:uppercase;letter-spacing:1.2px;font-weight:700}
.shd-name{font-size:18px;font-weight:800;color:#f0eeff;letter-spacing:.3px}
.shd-name.epic{background:linear-gradient(90deg,#c084fc,#e879f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.shd-name.mythic{background:linear-gradient(90deg,#fb923c,#fbbf24,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.shd-badge-row{display:flex;align-items:center;gap:7px}
.shd-rarity{font-size:10px;font-weight:700;letter-spacing:.8px}
.shd-dot{color:rgba(255,255,255,.3);font-size:10px}
.shd-price{font-size:10px;font-weight:700;color:rgba(255,255,255,.55)}
.shd-stars{font-size:12px}
.shd-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}
.shd-stat-line{font-size:11px;color:rgba(255,255,255,.55);line-height:1.5;margin-top:1px}
.shd-desc{font-size:11px;color:rgba(255,255,255,.42);line-height:1.5}
.shd-btn-wrap{margin-top:8px}`;

function _injectCSS() {
  if (document.getElementById('shd-css')) return;
  const s = document.createElement('style');
  s.id = 'shd-css'; s.textContent = CSS;
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
    return `<button class="wd-btn btn-free" style="width:100%" data-act="buy" data-id="${h.id}">🛡️ Надеть</button>`;
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
  if (h.def > 0)         s += `<span class="wd-pill p-a">-${h.def}% урона врага</span>`;
  if (h.hp > 0)          s += `<span class="wd-pill p-e">+${h.hp} HP</span>`;
  if (h.crit_resist > 0) s += `<span class="wd-pill p-i">-${h.crit_resist}% крит-урон врага</span>`;
  return s;
}

function _statLine(h) {
  const p = [];
  if (h.def > 0)         p.push(`Защита: -${h.def}% урона`);
  if (h.hp > 0)          p.push(`HP: +${h.hp}`);
  if (h.crit_resist > 0) p.push(`Крит-сопр.: -${h.crit_resist}%`);
  return p.join(' · ');
}

function show(scene, h, onAction) {
  _injectCSS();
  document.getElementById('shd-backdrop')?.remove();

  const nc  = h.r === 'epic' ? ' epic' : h.r === 'mythic' ? ' mythic' : '';
  const src = SHIELD_IMG[h.id] || '';

  const div = document.createElement('div');
  div.id = 'shd-backdrop';
  div.className = 'shd-backdrop';
  div.innerHTML = `
    <div class="shd-card" style="--bg:${WGC[h.r]||WGC.common}">
      <button class="shd-x" id="shd-x-btn">✕</button>
      <div class="shd-img-area">
        <div class="shd-img-wrap">
          <img src="${src}" alt="${h.name}"
            onerror="this.style.display='none'"
            onload="typeof ShieldHTML!=='undefined'&&ShieldHTML._removeDarkBg&&ShieldHTML._removeDarkBg(this)"/>
        </div>
        <div class="shd-img-fade"></div>
      </div>
      <div class="shd-body">
        <div class="shd-wtype">${h.ht}</div>
        <div class="shd-name${nc}">${h.name}</div>
        <div class="shd-badge-row">
          <span class="shd-rarity" style="color:${RC[h.r]}">${RL[h.r]}</span>
          <span class="shd-dot">·</span>
          <span class="shd-price">${_priceLabel(h)}</span>
        </div>
        <div class="shd-stars" style="color:${RC[h.r]}">${h.stars}</div>
        <div class="shd-pills">${_pillsHtml(h)}</div>
        <div class="shd-stat-line">${_statLine(h)}</div>
        <div class="shd-desc">${SHIELD_DESC[h.id] || ''}</div>
        <div class="shd-btn-wrap">${_btnHtml(h)}</div>
      </div>
    </div>`;

  document.body.appendChild(div);

  div.querySelector('#shd-x-btn').onclick = () => div.remove();
  div.addEventListener('click', e => { if (e.target === div) div.remove(); });
  div.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.stopPropagation();
    div.remove();
    if (onAction) onAction(btn.dataset.act, h);
  });
}

window.ShieldHTMLDetail = { show };
})();
