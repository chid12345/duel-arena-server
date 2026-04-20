/* ============================================================
   Wardrobe HTML Overlay — CSS + render
   Монтируется поверх Phaser canvas как DOM-div
   ============================================================ */
(() => {
const CSS = `
.wd-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding-top:0;background:rgba(0,0,0,.82);backdrop-filter:blur(4px)}
.wd-panel{width:100%;max-width:420px;height:100%;display:flex;flex-direction:column;background:rgba(10,5,25,.97);backdrop-filter:blur(14px);border-left:1px solid rgba(120,70,220,.25);border-right:1px solid rgba(120,70,220,.25);box-shadow:0 0 60px rgba(80,20,180,.15)}
.wd-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;background:linear-gradient(180deg,rgba(80,20,160,.35) 0%,transparent 100%);border-bottom:1px solid rgba(120,70,220,.15);flex-shrink:0}
.wd-title{font-size:16px;font-weight:700;letter-spacing:.5px;background:linear-gradient(90deg,#c4b5fd,#f9a8d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.wd-close{width:30px;height:30px;border-radius:8px;background:rgba(220,50,80,.2);border:1px solid rgba(255,80,120,.4);color:#fca5a5;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.wd-close:hover{background:rgba(220,50,80,.4)}
.wd-tabs{display:flex;gap:6px;padding:10px 14px 8px;flex-shrink:0}
.wd-tab{flex:1;position:relative;overflow:hidden;padding:9px 6px;border-radius:12px;cursor:pointer;font-size:13px;font-weight:700;text-align:center;border:1.5px solid transparent;transition:all .25s;color:#6b7280;background:rgba(255,255,255,.03);letter-spacing:.3px}
.wd-tab::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(109,40,217,.7),rgba(192,38,211,.5));opacity:0;transition:opacity .25s;border-radius:inherit}
.wd-tab.active{color:#fff;border-color:rgba(167,139,250,.5);box-shadow:0 0 16px rgba(139,92,246,.35),0 0 4px rgba(139,92,246,.2) inset}
.wd-tab.active::before{opacity:1}
.wd-tab span{position:relative;z-index:1}
.wd-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:4px 12px 14px;overflow-y:auto;flex:1;scrollbar-width:thin;scrollbar-color:rgba(139,92,246,.5) transparent}
.wd-grid::-webkit-scrollbar{width:3px;background:transparent}
.wd-grid::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(139,92,246,.7),rgba(167,139,250,.4),rgba(109,40,217,.6));border-radius:3px;box-shadow:0 0 6px rgba(139,92,246,.5)}
.wd-sep{grid-column:1/-1;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,.25);border-top:1px solid rgba(255,255,255,.07);padding-top:6px;margin-top:2px}
.wd-card{position:relative;overflow:hidden;border-radius:16px;padding:12px 10px 10px;cursor:pointer;background:rgba(255,255,255,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1.5px solid var(--rc,rgba(100,70,180,.3));box-shadow:0 4px 16px rgba(0,0,0,.3);transition:transform .2s,box-shadow .2s,border-color .2s}
.wd-card::before{content:'';position:absolute;inset:0;border-radius:inherit;background:radial-gradient(ellipse 80% 50% at 50% -10%,var(--rg,rgba(120,70,220,.18)) 0%,transparent 65%);pointer-events:none}
.wd-card::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--rc,rgba(120,70,220,.4)),transparent);pointer-events:none}
.wd-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.4),0 0 20px var(--rg,rgba(120,70,220,.3))}
.wd-card.equipped{border-color:#22c55e!important;box-shadow:0 0 20px rgba(34,197,94,.35),0 0 6px rgba(34,197,94,.15) inset!important}
.wd-card.rarity-common{--rc:rgba(156,163,175,.35);--rg:rgba(156,163,175,.18)}
.wd-card.rarity-rare{--rc:rgba(59,130,246,.45);--rg:rgba(59,130,246,.18)}
.wd-card.rarity-epic{--rc:rgba(168,85,247,.5);--rg:rgba(168,85,247,.2);animation:epicBorder 3s ease-in-out infinite}
.wd-card.rarity-mythic{--rc:rgba(249,115,22,.55);--rg:rgba(249,115,22,.22)}
@keyframes epicBorder{0%,100%{border-color:rgba(168,85,247,.4);box-shadow:0 4px 16px rgba(0,0,0,.3),0 0 8px rgba(168,85,247,.2)}50%{border-color:rgba(192,132,252,.85);box-shadow:0 4px 16px rgba(0,0,0,.3),0 0 18px rgba(168,85,247,.5),0 0 4px rgba(192,132,252,.3) inset}}
.wd-icon-wrap{position:relative;width:58px;height:58px;margin:0 auto 8px;border-radius:14px;overflow:hidden}
.wd-icon-img{width:100%;height:100%;object-fit:cover;object-position:center top}
.wd-icon-img.mythic{object-position:center 22%;transform:scale(1.6) translateY(7%);transform-origin:center center}
.wd-lava{position:absolute;inset:0;border-radius:inherit;pointer-events:none;mix-blend-mode:screen;animation:lavaPulse 2.4s ease-in-out infinite}
@keyframes lavaPulse{0%,100%{opacity:.7;background:radial-gradient(ellipse 70% 60% at 50% 60%,rgba(255,100,0,.15) 0%,transparent 70%)}50%{opacity:1;background:radial-gradient(ellipse 70% 60% at 50% 60%,rgba(255,140,0,.38) 0%,rgba(255,60,0,.12) 50%,transparent 70%);box-shadow:inset 0 0 22px rgba(255,90,0,.5)}}
.wd-neck-mask{position:absolute;top:0;left:0;right:0;height:38%;background:linear-gradient(180deg,rgba(10,5,25,1) 0%,rgba(10,5,25,.9) 35%,transparent 100%);pointer-events:none}
.wd-eq-dot{position:absolute;top:-3px;right:-3px;width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #06030f;box-shadow:0 0 8px #22c55e}
.wd-name{font-size:12px;font-weight:700;color:#f1f5f9;text-align:center;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-name.epic{background:linear-gradient(90deg,#a5f3fc,#818cf8,#c084fc,#818cf8,#a5f3fc);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:epicText 3s linear infinite}
.wd-name.mythic{font-weight:800;background:linear-gradient(90deg,#fdba74,#f97316,#fbbf24,#ef4444,#f97316,#fdba74);background-size:250% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:mythicText 2.5s linear infinite;filter:drop-shadow(0 0 4px rgba(249,115,22,.5))}
@keyframes epicText{0%{background-position:0% center}100%{background-position:200% center}}
@keyframes mythicText{0%{background-position:0% center}100%{background-position:250% center}}
.wd-rarity{font-size:9px;font-weight:700;text-align:center;margin-bottom:4px;letter-spacing:.8px;text-transform:uppercase}
.wd-stars{text-align:center;font-size:9px;margin-bottom:6px}
.wd-pills{display:flex;gap:3px;justify-content:center;flex-wrap:wrap;margin-bottom:8px;min-height:14px}
.wd-pill{padding:2px 5px;border-radius:5px;font-size:8.5px;font-weight:700}
.p-s{background:rgba(136,34,34,.85);color:#fca5a5}.p-a{background:rgba(17,85,119,.85);color:#7dd3fc}.p-i{background:rgba(85,17,136,.85);color:#d8b4fe}.p-e{background:rgba(17,85,51,.85);color:#86efac}
.wd-btn{position:relative;overflow:hidden;width:100%;padding:7px 4px;border-radius:10px;font-size:10px;font-weight:700;cursor:pointer;border:1.5px solid transparent;text-align:center;transition:all .2s;letter-spacing:.3px}
.wd-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);transform:skewX(-15deg)}
.wd-btn:hover::after{animation:shimmer .5s ease forwards}
@keyframes shimmer{to{left:150%}}
.btn-free{background:rgba(55,65,81,.3);border-color:rgba(156,163,175,.35);color:#d1d5db}
.btn-eq{background:rgba(21,128,61,.2);border-color:rgba(34,197,94,.45);color:#86efac;animation:pulseEq 2.4s ease-in-out infinite}
@keyframes pulseEq{0%,100%{box-shadow:0 0 6px rgba(34,197,94,.2);border-color:rgba(34,197,94,.4)}50%{box-shadow:0 0 14px rgba(34,197,94,.5),0 0 3px rgba(34,197,94,.3) inset;border-color:rgba(34,197,94,.8)}}
.btn-uneq{background:rgba(220,38,38,.15);border-color:rgba(239,68,68,.45);color:#fca5a5}
.btn-gold{background:rgba(120,85,0,.25);border-color:rgba(251,191,36,.4);color:#fde68a;background-image:linear-gradient(135deg,rgba(251,191,36,.08) 0%,rgba(245,158,11,.12) 100%)}
.btn-dia{background:rgba(88,28,160,.25);border-color:rgba(168,85,247,.4);color:#d8b4fe;background-image:linear-gradient(135deg,rgba(168,85,247,.08) 0%,rgba(139,92,246,.12) 100%)}
.btn-mythic{background:linear-gradient(135deg,#7c2d12,#c2410c,#d97706,#c2410c,#7c2d12);background-size:300% 100%;border-color:rgba(251,191,36,.65);color:#fff;font-weight:800;text-shadow:0 1px 4px rgba(0,0,0,.6);animation:mythicFlow 2.5s linear infinite,mythicPulse 2s ease-in-out infinite}
@keyframes mythicFlow{0%{background-position:100% 0}100%{background-position:-200% 0}}
@keyframes mythicPulse{0%,100%{box-shadow:0 0 8px rgba(249,115,22,.3)}50%{box-shadow:0 0 22px rgba(249,115,22,.75),0 0 8px rgba(251,191,36,.5)}}
.btn-mythic::after{content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);transform:skewX(-20deg);animation:mythicShine 2.5s ease-in-out infinite}
@keyframes mythicShine{0%{left:-80%}60%,100%{left:130%}}
.wd-smoke{position:absolute;bottom:100%;left:0;right:0;height:28px;pointer-events:none;overflow:hidden}
.wd-smoke::before,.wd-smoke::after{content:'';position:absolute;bottom:0;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle,rgba(255,120,0,.5) 0%,transparent 70%);filter:blur(3px);animation:smokeUp 2.2s ease-out infinite}
.wd-smoke::before{left:30%}.wd-smoke::after{left:62%;animation-delay:1.1s;width:6px;height:6px}
@keyframes smokeUp{0%{transform:translateY(0) scaleX(1);opacity:.7}60%{transform:translateY(-18px) scaleX(1.8);opacity:.3}100%{transform:translateY(-28px) scaleX(2.5);opacity:0}}
.wd-modal-bg{position:absolute;inset:0;z-index:10;background:rgba(0,0,0,.78);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center}
.wd-modal{width:290px;border-radius:20px;padding:20px 18px;background:rgba(10,5,25,.97);border:1.5px solid var(--mc,rgba(120,70,220,.5));box-shadow:0 0 40px var(--mg,rgba(120,70,220,.3)),0 20px 60px rgba(0,0,0,.7);position:relative;animation:mPop .2s cubic-bezier(.34,1.56,.64,1)}
@keyframes mPop{from{opacity:0;transform:scale(.88) translateY(10px)}to{opacity:1;transform:none}}
.wd-m-close{position:absolute;top:10px;right:12px;background:rgba(220,50,80,.2);border:1px solid rgba(255,80,120,.4);color:#fca5a5;font-size:13px;cursor:pointer;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.wd-m-icon{display:flex;justify-content:center;margin-bottom:12px}
.wd-m-icon-bg{width:80px;height:80px;border-radius:20px;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center}
.wd-m-icon-bg img{width:100%;height:100%;object-fit:cover;object-position:center top}
.wd-m-icon-bg img.mythic{object-position:center 22%;transform:scale(1.6) translateY(7%);transform-origin:center center}
.wd-m-neck{position:absolute;top:0;left:0;right:0;height:38%;background:linear-gradient(180deg,rgba(10,5,25,1) 0%,rgba(10,5,25,.9) 35%,transparent 100%)}
.wd-m-name{text-align:center;font-size:18px;font-weight:700;color:#f8fafc;margin-bottom:3px}
.wd-m-rarity{text-align:center;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:4px}
.wd-m-stars{text-align:center;font-size:12px;margin-bottom:10px}
.wd-m-div{height:1px;margin:10px 0;background:linear-gradient(90deg,transparent,var(--mc,rgba(120,70,220,.4)),transparent)}
.wd-m-pills{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.wd-m-pill{padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700}
.wd-m-bonus{font-size:12px;color:#c8a878;text-align:center;line-height:1.6;background:rgba(255,255,255,.04);border-radius:10px;padding:8px 12px;margin-bottom:12px;white-space:pre-wrap}
.wd-m-btn{width:100%;padding:11px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid transparent;transition:all .2s;position:relative;overflow:hidden}
.wd-m-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);transform:skewX(-15deg)}
.wd-m-btn:hover::after{animation:shimmer .5s ease forwards}
.mb-eq{background:linear-gradient(135deg,#166534,#15803d);border-color:rgba(34,197,94,.5);color:#fff;box-shadow:0 4px 16px rgba(21,128,61,.3)}
.mb-uneq{background:linear-gradient(135deg,#7f1d1d,#991b1b);border-color:rgba(239,68,68,.5);color:#fff}
.mb-free{background:linear-gradient(135deg,#1f2937,#374151);border-color:rgba(156,163,175,.35);color:#f9fafb}
.mb-gold{background:linear-gradient(135deg,#78350f,#92400e);border-color:rgba(251,191,36,.5);color:#fde68a}
.mb-dia{background:linear-gradient(135deg,#4c1d95,#5b21b6);border-color:rgba(167,139,250,.5);color:#ede9fe}
.mb-usdt{background:linear-gradient(135deg,#7c2d12,#9a3412);border-color:rgba(249,115,22,.5);color:#fed7aa}
.wd-empty{grid-column:1/-1;text-align:center;padding:40px 0;color:#4b5563;font-size:13px}
`;

const RARITY_IMG   = { common:'armor_common.png', rare:'armor_gold.png', epic:'armor_epic.png', mythic:'armor_mythic.png' };
const RARITY_COLOR = { common:'#9ca3af', rare:'#60a5fa', epic:'#c084fc', mythic:'#fb923c' };
const RARITY_LABEL = { common:'Обычная', rare:'Редкая', epic:'Эпическая', mythic:'Мифическая' };

const ARMORS_DATA = [
  { id:'tank_free',    r:'common', name:'Кираса Гвардейца',     stars:'★☆☆☆', tier:'БЕСПЛ.', str:5,agi:0,int:0,end:5, bonus:'Надёжная сталь для первых сражений.\nБроня: +2% к защите',         type:'free' },
  { id:'agile_free',   r:'common', name:'Доспех Рекрута',       stars:'★☆☆☆', tier:'БЕСПЛ.', str:0,agi:5,int:2,end:0, bonus:'Надёжная сталь для первых сражений.\nУклонение: +2%',              type:'free' },
  { id:'crit_free',    r:'common', name:'Кираса Гвардейца',     stars:'★☆☆☆', tier:'БЕСПЛ.', str:0,agi:0,int:6,end:5, bonus:'Надёжная сталь для первых сражений.\nКрит урон: +3%',              type:'free' },
  { id:'universal_free',r:'common',name:'Доспех Рекрута',       stars:'★☆☆☆', tier:'БЕСПЛ.', str:2,agi:2,int:2,end:2, bonus:'Надёжная сталь для первых сражений.\nМакс. HP: +1%',               type:'free' },
  { id:'berserker_gold',r:'rare',  name:'Панцирь Короля',       stars:'★★☆☆', tier:'ЗОЛОТО', str:7,agi:0,int:0,end:7, bonus:'Выковано из чистейшего золота.\nУрон +4% при HP < 30%',           type:'gold',     price:'💰 5000' },
  { id:'assassin_gold', r:'rare',  name:'Золотой Оплот',        stars:'★★☆☆', tier:'ЗОЛОТО', str:0,agi:7,int:0,end:0, bonus:'Выковано из чистейшего золота.\nДвойной удар: 4%',               type:'gold',     price:'💰 5000' },
  { id:'mage_gold',     r:'rare',  name:'Панцирь Короля',       stars:'★★☆☆', tier:'ЗОЛОТО', str:0,agi:0,int:7,end:0, bonus:'Выковано из чистейшего золота.\nКрит урон: +4%',                 type:'gold',     price:'💰 5000' },
  { id:'paladin_gold',  r:'rare',  name:'Золотой Оплот',        stars:'★★☆☆', tier:'ЗОЛОТО', str:4,agi:0,int:4,end:4, bonus:'Выковано из чистейшего золота.\nВходящий урон: -3%',             type:'gold',     price:'💰 5000' },
  { id:'dragonknight',  r:'epic',  name:'Доспех Ледяного Духа', stars:'★★★☆', tier:'АЛМАЗЫ', str:9,agi:0,int:5,end:9, bonus:'Кристаллы поглощают часть урона.\nУрон +6% при HP < 40%',        type:'diamonds', price:'💎 100' },
  { id:'shadowdancer',  r:'epic',  name:'Нагрудник Бездны',     stars:'★★★☆', tier:'АЛМАЗЫ', str:0,agi:9,int:5,end:0, bonus:'Кристаллы поглощают часть урона.\nДвойной удар: 6%',             type:'diamonds', price:'💎 100' },
  { id:'archmage',      r:'epic',  name:'Доспех Ледяного Духа', stars:'★★★☆', tier:'АЛМАЗЫ', str:0,agi:0,int:9,end:6, bonus:'Кристаллы поглощают часть урона.\nКрит урон: +5%',               type:'diamonds', price:'💎 100' },
  { id:'legendary_usdt',r:'mythic',name:'Сердце Дракона',       stars:'★★★★', tier:'ЛЕГЕНДА',str:0,agi:0,int:0,end:0, bonus:'Чешуя, пропитанная яростью лавы.\n+19 свободных статов\nСброс сборки — 5.99 USDT', type:'usdt', price:'🔥 11.99 USDT' },
];

function _injectCSS() {
  if (document.getElementById('wd-style')) return;
  const s = document.createElement('style');
  s.id = 'wd-style'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _pills(a) {
  let h = '';
  if (a.str > 0) h += `<span class="wd-pill p-s">С+${a.str}</span>`;
  if (a.agi > 0) h += `<span class="wd-pill p-a">Л+${a.agi}</span>`;
  if (a.int > 0) h += `<span class="wd-pill p-i">И+${a.int}</span>`;
  if (a.end > 0) h += `<span class="wd-pill p-e">В+${a.end}</span>`;
  return h;
}

function _iconHtml(a, big) {
  const sz = big ? 80 : 58; const r = big ? 20 : 14;
  const img = RARITY_IMG[a.r];
  if (!img) return `<div style="width:${sz}px;height:${sz}px;border-radius:${r}px;background:rgba(40,20,80,.5)"></div>`;
  if (a.r === 'mythic') {
    return `<div class="wd-icon-wrap${big?' wd-m-icon-bg':''}" style="width:${sz}px;height:${sz}px;border-radius:${r}px;background:rgba(60,20,0,.7)">
      <img src="${img}" class="wd-icon-img mythic" />
      <div class="wd-lava"></div><div class="wd-neck-mask"></div></div>`;
  }
  const bgs = { common:'rgba(30,25,45,.7)', rare:'rgba(20,40,80,.7)', epic:'rgba(40,15,80,.7)' };
  return `<div style="width:${sz}px;height:${sz}px;border-radius:${r}px;overflow:hidden;background:${bgs[a.r]||'rgba(40,20,80,.5)'}">
    <img src="${img}" class="wd-icon-img" style="width:100%;height:100%;object-fit:cover;object-position:center top" /></div>`;
}

function _btnHtml(a) {
  if (a.equipped) return `<button class="wd-btn btn-uneq" data-act="unequip" data-id="${a.id}">✅ Снять</button>`;
  if (a.owned)    return `<button class="wd-btn btn-eq"   data-act="equip"   data-id="${a.id}">Надеть</button>`;
  if (a.type === 'free')     return `<button class="wd-btn btn-free" data-act="buy" data-id="${a.id}">Выбрать</button>`;
  if (a.type === 'gold')     return `<button class="wd-btn btn-gold" data-act="buy" data-id="${a.id}">${a.price}</button>`;
  if (a.type === 'diamonds') return `<button class="wd-btn btn-dia"  data-act="buy" data-id="${a.id}">${a.price}</button>`;
  return `<div style="position:relative"><button class="wd-btn btn-mythic" data-act="buy_usdt" data-id="${a.id}">🔥 КУПИТЬ — ${a.price}</button><div class="wd-smoke"></div></div>`;
}

function _cardHtml(a) {
  const nc = a.r === 'epic' ? 'epic' : a.r === 'mythic' ? 'mythic' : '';
  const rc = RARITY_COLOR[a.r] || '#aaa';
  return `<div class="wd-card rarity-${a.r}${a.equipped?' equipped':''}" data-id="${a.id}">
    ${a.equipped ? '<div class="wd-eq-dot"></div>' : ''}
    <div style="display:flex;justify-content:center;margin-bottom:8px">${_iconHtml(a, false)}</div>
    <div class="wd-name${nc?' '+nc:''}">${a.name}</div>
    <div class="wd-rarity" style="color:${rc}">${RARITY_LABEL[a.r]}</div>
    <div class="wd-stars" style="color:${rc}">${a.stars}</div>
    <div class="wd-pills">${_pills(a)}</div>
    ${_btnHtml(a)}
  </div>`;
}

function _buildGrid(items, view) {
  if (!items.length) return `<div class="wd-empty">Нет предметов</div>`;
  if (view === 'owned') return items.map(_cardHtml).join('');
  const groups = [
    { key:'common',  label:'ОБЫЧНАЯ' },
    { key:'rare',    label:'РЕДКАЯ' },
    { key:'epic',    label:'ЭПИЧЕСКАЯ' },
    { key:'mythic',  label:'МИФИЧЕСКАЯ' },
  ];
  return groups.map(g => {
    const list = items.filter(a => a.r === g.key);
    if (!list.length) return '';
    return `<div class="wd-sep" style="color:${RARITY_COLOR[g.key]}">${g.label}</div>${list.map(_cardHtml).join('')}`;
  }).join('');
}

window.WardrobeHTML = {
  ARMORS_DATA,
  _injectCSS,
  _buildGrid,
  _cardHtml,
  _iconHtml,
  _pills,
  _btnHtml,
};
})();
