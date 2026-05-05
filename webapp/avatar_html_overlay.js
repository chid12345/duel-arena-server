/* ============================================================
   Avatar HTML Overlay — CSS + render (cyberpunk, парящие аватарки)
   ============================================================ */
(() => {
const CSS = `
.av-overlay{position:fixed;top:0;left:0;right:0;bottom:76px;z-index:9000;display:flex;flex-direction:column;background:radial-gradient(ellipse at 50% 0%,#1a0a2a 0%,#05050a 55%),#000;color:#e6f7ff;overflow:hidden;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}
.av-overlay::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.022) 3px 4px);pointer-events:none;z-index:1}
.av-overlay::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,rgba(255,40,170,.08),transparent 40%),radial-gradient(circle at 80% 80%,rgba(0,230,255,.06),transparent 40%);pointer-events:none;z-index:1}

/* Header */
.av-hdr{position:relative;z-index:2;display:flex;align-items:center;gap:10px;padding:12px 14px 8px;flex-shrink:0}
@keyframes avBackGlow{0%,100%{text-shadow:0 0 8px #00f5ff,0 0 18px rgba(0,245,255,.3);opacity:.75}50%{text-shadow:0 0 16px #00f5ff,0 0 32px rgba(0,245,255,.6);opacity:1}}
.av-back{display:inline-flex;flex-direction:column;align-items:center;line-height:1;font-size:28px;color:#00f5ff;cursor:pointer;padding:2px 8px;user-select:none;animation:avBackGlow 2s ease-in-out infinite}
.av-back::after{content:'НАЗАД';font-size:6px;font-weight:700;letter-spacing:1.2px;color:rgba(0,245,255,.6);margin-top:-1px}
.av-back:active{transform:scale(.88)}
.av-hdr-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:17px;background:linear-gradient(135deg,#1a0533,#2a0a40);border:1px solid #ff3ba8;box-shadow:0 0 12px rgba(255,59,168,.5),inset 0 0 8px rgba(255,59,168,.2);flex-shrink:0}
.av-hdr-txt{flex:1;min-width:0}
.av-hdr-title{font-size:15px;font-weight:800;letter-spacing:.5px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.av-hdr-sub{font-size:9px;color:#00e0ff;opacity:.7;margin-top:1px}

/* Tabs */
.av-tabs{position:relative;z-index:2;display:flex;gap:5px;padding:2px 10px 8px;flex-shrink:0;overflow-x:auto;scrollbar-width:none}
.av-tabs::-webkit-scrollbar{display:none}
.av-tab{flex-shrink:0;padding:6px 13px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid transparent;transition:all .22s;color:#3d4a5c;background:rgba(255,255,255,.04);white-space:nowrap;user-select:none}
.av-tab:active{transform:scale(.95)}
.av-tab[data-tab="mine"].av-active{border-color:rgba(0,240,255,.5);background:linear-gradient(135deg,rgba(0,240,255,.14),rgba(0,180,220,.08));box-shadow:0 0 12px rgba(0,240,255,.22);color:#80eeff}
.av-tab[data-tab="free"].av-active{border-color:rgba(74,222,128,.5);background:linear-gradient(135deg,rgba(74,222,128,.14),rgba(22,163,74,.08));box-shadow:0 0 12px rgba(74,222,128,.2);color:#86efac}
.av-tab[data-tab="gold"].av-active{border-color:rgba(251,191,36,.55);background:linear-gradient(135deg,rgba(251,191,36,.14),rgba(180,130,0,.08));box-shadow:0 0 12px rgba(251,191,36,.22);color:#fde68a}
.av-tab[data-tab="epic"].av-active{border-color:rgba(192,132,252,.58);background:linear-gradient(135deg,rgba(192,132,252,.16),rgba(120,60,220,.08));box-shadow:0 0 12px rgba(192,132,252,.25);color:#dda0ff}
.av-tab[data-tab="legend"].av-active{border-color:rgba(249,115,22,.6);background:linear-gradient(135deg,rgba(249,115,22,.2),rgba(180,60,0,.1));box-shadow:0 0 14px rgba(249,115,22,.35);color:#fdba74}

/* Grid */
.av-grid-wrap{position:relative;z-index:2;flex:1;overflow-y:auto;padding:4px 10px 20px;scrollbar-width:thin;scrollbar-color:rgba(255,59,168,.3) transparent}
.av-grid-wrap::-webkit-scrollbar{width:2px}
.av-grid-wrap::-webkit-scrollbar-thumb{background:rgba(255,59,168,.4);border-radius:2px}
.av-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px 4px}

/* Avatar cell — парящий стиль без рамки */
.av-cell{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;user-select:none;padding:2px 0;position:relative;-webkit-tap-highlight-color:transparent}
.av-cell:active .av-em{transform:scale(.88)!important}
.av-em{font-size:34px;line-height:1;display:block;text-align:center;position:relative;z-index:1;transition:filter .18s,transform .18s;will-change:transform,filter;animation:avFloat 3.2s ease-in-out infinite}
@keyframes avFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
/* Glow по редкости */
.av-g-free   .av-em{filter:drop-shadow(0 0 8px rgba(74,222,128,.72))  drop-shadow(0 0 3px rgba(0,0,0,.85))}
.av-g-gold   .av-em{filter:drop-shadow(0 0 8px rgba(251,191,36,.78))  drop-shadow(0 0 3px rgba(0,0,0,.85))}
.av-g-epic   .av-em{filter:drop-shadow(0 0 8px rgba(168,85,247,.78))  drop-shadow(0 0 3px rgba(0,0,0,.85))}
.av-g-legend .av-em{filter:drop-shadow(0 0 8px rgba(249,115,22,.82))  drop-shadow(0 0 3px rgba(0,0,0,.85))}
.av-g-sub    .av-em{filter:drop-shadow(0 0 8px rgba(129,140,248,.82)) drop-shadow(0 0 3px rgba(0,0,0,.85))}
.av-g-elite  .av-em{filter:drop-shadow(0 0 10px rgba(251,191,36,.9))  drop-shadow(0 0 6px rgba(249,115,22,.65)) drop-shadow(0 0 2px rgba(0,0,0,.9))}
.av-g-ref    .av-em{filter:drop-shadow(0 0 8px rgba(34,211,238,.72))  drop-shadow(0 0 3px rgba(0,0,0,.85))}
.av-g-locked .av-em{filter:none;opacity:.3}
/* Разные задержки парения */
.av-cell:nth-child(2)  .av-em{animation-delay:.35s}
.av-cell:nth-child(3)  .av-em{animation-delay:.7s}
.av-cell:nth-child(4)  .av-em{animation-delay:1.05s}
.av-cell:nth-child(5)  .av-em{animation-delay:1.4s}
.av-cell:nth-child(6)  .av-em{animation-delay:.2s;animation-duration:3.5s}
.av-cell:nth-child(7)  .av-em{animation-delay:.55s;animation-duration:3.7s}
.av-cell:nth-child(8)  .av-em{animation-delay:.9s;animation-duration:3.1s}
.av-cell:nth-child(9)  .av-em{animation-delay:1.25s;animation-duration:3.4s}
.av-cell:nth-child(10) .av-em{animation-delay:1.6s;animation-duration:3.6s}
.av-cell:nth-child(n+11) .av-em{animation-duration:3.3s}

/* Glow под аватаркой */
.av-glow{width:36px;height:7px;border-radius:50%;flex-shrink:0;margin-top:-2px;animation:avGlowP 3.2s ease-in-out infinite}
.av-g-free   .av-glow{background:radial-gradient(ellipse,rgba(74,222,128,.55),transparent 70%)}
.av-g-gold   .av-glow{background:radial-gradient(ellipse,rgba(251,191,36,.55),transparent 70%)}
.av-g-epic   .av-glow{background:radial-gradient(ellipse,rgba(168,85,247,.55),transparent 70%)}
.av-g-legend .av-glow{background:radial-gradient(ellipse,rgba(249,115,22,.58),transparent 70%)}
.av-g-sub    .av-glow{background:radial-gradient(ellipse,rgba(129,140,248,.55),transparent 70%)}
.av-g-elite  .av-glow{background:radial-gradient(ellipse,rgba(251,191,36,.65),transparent 70%)}
.av-g-ref    .av-glow{background:radial-gradient(ellipse,rgba(34,211,238,.55),transparent 70%)}
.av-g-locked .av-glow{display:none}
@keyframes avGlowP{0%,100%{opacity:.45;transform:scaleX(1)}50%{opacity:1;transform:scaleX(1.35)}}

/* Экипирован badge */
.av-eq-dot{position:absolute;top:0;right:3px;width:14px;height:14px;border-radius:50%;background:#15803d;font-size:7px;font-weight:800;color:#fff;display:flex;align-items:center;justify-content:center;z-index:3;box-shadow:0 0 6px rgba(34,197,94,.85)}

.av-nm{font-size:8px;font-weight:700;text-align:center;line-height:1.2;width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#2d3748}
.av-nm.owned{color:#60a5fa}
.av-nm.equipped{color:#4ade80}
.av-pr{font-size:7px;text-align:center;color:#1a202c}

/* Секция */
.av-sec{grid-column:1/-1;display:flex;align-items:center;gap:6px;padding:6px 0 2px}
.av-sec-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--lc,rgba(255,255,255,.1)),transparent)}
.av-sec-txt{font-size:7.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--tc,#374151);white-space:nowrap}

/* ── Modal (bottom sheet) ── */
.av-modal-bg{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9100;background:rgba(0,0,0,.84);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding-bottom:76px;animation:avMbgIn .18s ease}
@keyframes avMbgIn{from{opacity:0}to{opacity:1}}
.av-modal{width:100%;max-width:430px;border-radius:22px 22px 0 0;background:rgba(8,4,22,.99);border-top:1.5px solid var(--mc,rgba(255,59,168,.4));border-left:1.5px solid var(--mc,rgba(255,59,168,.4));border-right:1.5px solid var(--mc,rgba(255,59,168,.4));box-shadow:0 -10px 50px var(--ms,rgba(255,59,168,.2));overflow:hidden;animation:avMSlide .24s cubic-bezier(.34,1.4,.64,1);position:relative}
@keyframes avMSlide{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}

.av-modal-top{padding:14px 16px 0;display:flex;align-items:center;gap:12px}
.av-modal-em{font-size:52px;line-height:1;animation:avFloat 3s ease-in-out infinite;flex-shrink:0}
.av-modal-head{flex:1;min-width:0}
.av-modal-rar{font-size:8px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
.av-modal-name{font-size:16px;font-weight:900;color:#f8fafc;line-height:1.2}
.av-modal-name.epic{background:linear-gradient(90deg,#a5f3fc,#818cf8,#c084fc,#a5f3fc);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:avEpicT 3s linear infinite}
@keyframes avEpicT{0%{background-position:0%}100%{background-position:200%}}
.av-modal-name.legend{background:linear-gradient(90deg,#fdba74,#f97316,#fbbf24,#f97316,#fdba74);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:avLegT 2.5s linear infinite}
@keyframes avLegT{0%{background-position:0%}100%{background-position:200%}}
.av-modal-name.sub{background:linear-gradient(90deg,#c7d2fe,#818cf8,#c7d2fe);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:avEpicT 3s linear infinite}
.av-modal-close{background:rgba(0,0,0,.5);border:none;color:#6b7280;font-size:13px;cursor:pointer;width:28px;height:28px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.av-modal-close:active{opacity:.6}

.av-modal-body{padding:8px 16px 20px}
.av-modal-desc{font-size:11px;color:#8b9ab0;line-height:1.6;margin-bottom:10px;background:rgba(255,255,255,.04);border-radius:10px;padding:8px 10px}
.av-modal-stats{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;min-height:0}
.av-pill{padding:3px 9px;border-radius:8px;font-size:10px;font-weight:800}
.p-str{background:rgba(136,34,34,.85);color:#fca5a5}
.p-agi{background:rgba(17,85,119,.85);color:#7dd3fc}
.p-int{background:rgba(80,17,136,.85);color:#d8b4fe}
.p-end{background:rgba(17,85,51,.85);color:#86efac}

/* Кнопки без рамки */
.av-btn{width:100%;padding:12px 8px;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer;border:none;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;letter-spacing:.3px;transition:transform .15s;margin-top:7px;position:relative;overflow:hidden}
.av-btn:active{transform:scale(.96)}
.av-btn::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:skewX(-15deg)}
.av-btn:active::after{animation:avShim .3s ease forwards}
@keyframes avShim{to{left:150%}}
.av-btn-equip   {background:linear-gradient(135deg,#166534,#15803d);color:#fff;box-shadow:0 4px 18px rgba(21,128,61,.4)}
.av-btn-equipped{background:rgba(22,22,34,1);color:#4b5568;cursor:default}
.av-btn-free    {background:linear-gradient(135deg,#0f2a1a,#166534);color:#4ade80;box-shadow:0 4px 14px rgba(74,222,128,.25)}
.av-btn-gold    {background:linear-gradient(135deg,#78350f,#a16207);color:#fef08a;box-shadow:0 4px 14px rgba(202,138,4,.35);animation:avGoldG 2.5s ease-in-out infinite}
@keyframes avGoldG{0%,100%{box-shadow:0 4px 12px rgba(161,98,7,.3)}50%{box-shadow:0 4px 22px rgba(251,191,36,.6)}}
.av-btn-gold::after{animation:avShim 2.5s ease-in-out infinite!important}
.av-btn-epic    {background:linear-gradient(135deg,#4c1d95,#7c3aed);color:#ede9fe;box-shadow:0 4px 14px rgba(124,58,237,.4);animation:avEpicG 2.2s ease-in-out infinite}
@keyframes avEpicG{0%,100%{box-shadow:0 4px 12px rgba(124,58,237,.3)}50%{box-shadow:0 4px 20px rgba(167,139,250,.6)}}
.av-btn-epic::after{animation:avShim 2.2s ease-in-out infinite!important}
.av-btn-stars   {background:linear-gradient(135deg,#1e3c55,#1e5c82);color:#7dd3fc;box-shadow:0 4px 12px rgba(30,92,130,.4)}
.av-btn-usdt    {background:linear-gradient(135deg,#1a3a1a,#166534);color:#4ade80;box-shadow:0 4px 12px rgba(22,101,52,.4)}
.av-btn-sub     {background:linear-gradient(135deg,#1e1b4b,#4338ca);color:#c7d2fe;box-shadow:0 4px 12px rgba(67,56,202,.4)}
.av-btn-ref     {background:linear-gradient(135deg,#0e4a5a,#0891b2);color:#67e8f9;box-shadow:0 4px 12px rgba(8,145,178,.4)}
.av-btn-elite   {background:linear-gradient(135deg,#7c2d12,#c2410c,#d97706,#c2410c,#7c2d12);background-size:300% 100%;color:#fff;font-weight:900;animation:avEliteF 2.6s linear infinite,avEliteG 2s ease-in-out infinite}
@keyframes avEliteF{0%{background-position:100% 0}100%{background-position:-200% 0}}
@keyframes avEliteG{0%,100%{box-shadow:0 4px 14px rgba(249,115,22,.4)}50%{box-shadow:0 6px 28px rgba(249,115,22,.75)}}
.av-btn-elite::after{animation:avShim 2.6s ease-in-out infinite!important}
.av-btn-row{display:flex;gap:7px;margin-top:7px}
.av-btn-row .av-btn{margin-top:0}

/* Toast */
.av-toast{position:fixed;bottom:84px;left:50%;transform:translateX(-50%);z-index:9999;padding:9px 18px;border-radius:12px;font-size:13px;font-weight:700;pointer-events:none;transition:opacity .35s;white-space:nowrap;max-width:300px;text-align:center}
`;

const TIER_KEY = {
  free:'free', gold:'gold', epic:'epic', legend:'legend',
  stars:'legend', subscription:'sub', referral:'ref', usdt_stars:'elite',
};
const GCLS = {free:'av-g-free',gold:'av-g-gold',epic:'av-g-epic',legend:'av-g-legend',sub:'av-g-sub',elite:'av-g-elite',ref:'av-g-ref'};
const RCOL = {free:'#4ade80',gold:'#fbbf24',epic:'#a855f7',legend:'#f97316',sub:'#818cf8',elite:'#fbbf24',ref:'#22d3ee'};
const RLAB = {free:'БЕСПЛАТНЫЙ',gold:'ЗОЛОТОЙ',epic:'ЭПИЧЕСКИЙ',legend:'ЛЕГЕНДАРНЫЙ',sub:'ПОДПИСКА',elite:'ЭЛИТНЫЙ',ref:'РЕФЕРАЛЬНЫЙ'};
const MFIL = {
  free:  'drop-shadow(0 0 14px rgba(74,222,128,.8))',
  gold:  'drop-shadow(0 0 14px rgba(251,191,36,.85))',
  epic:  'drop-shadow(0 0 14px rgba(168,85,247,.85))',
  legend:'drop-shadow(0 0 14px rgba(249,115,22,.85))',
  sub:   'drop-shadow(0 0 14px rgba(129,140,248,.85))',
  elite: 'drop-shadow(0 0 16px rgba(251,191,36,.9)) drop-shadow(0 0 8px rgba(249,115,22,.7))',
  ref:   'drop-shadow(0 0 14px rgba(34,211,238,.8))',
};
const MC = {free:'rgba(74,222,128,.45)',gold:'rgba(251,191,36,.5)',epic:'rgba(168,85,247,.55)',legend:'rgba(249,115,22,.58)',sub:'rgba(129,140,248,.55)',elite:'rgba(249,115,22,.65)',ref:'rgba(34,211,238,.45)'};
const MS = {free:'rgba(74,222,128,.18)',gold:'rgba(251,191,36,.2)',epic:'rgba(168,85,247,.22)',legend:'rgba(249,115,22,.24)',sub:'rgba(129,140,248,.2)',elite:'rgba(249,115,22,.3)',ref:'rgba(34,211,238,.18)'};

function _tkey(av) {
  if (av.currency === 'subscription') return 'sub';
  if (av.currency === 'usdt_stars')   return 'elite';
  if (av.currency === 'referral')     return 'ref';
  if (av.tier === 'premium' || av.currency === 'stars') return 'legend';
  return av.tier || 'free';
}

function _injectCSS() {
  if (document.getElementById('av-style')) return;
  const s = document.createElement('style');
  s.id = 'av-style'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _priceLabel(av) {
  if (av.currency === 'free')         return 'Free';
  if (av.currency === 'gold')         return `💰${av.price}`;
  if (av.currency === 'diamonds')     return `💎${av.price}`;
  if (av.currency === 'stars')        return `⭐${av.price}`;
  if (av.currency === 'usdt_stars')   return `⭐${av.price}`;
  if (av.currency === 'subscription') return '👑SUB';
  if (av.currency === 'referral')     return '🤝REF';
  return '';
}

function _cell(av) {
  const tk  = _tkey(av);
  const gcls = av.unlocked ? (GCLS[tk] || 'av-g-free') : 'av-g-locked';
  const nm   = av.equipped ? 'equipped' : av.unlocked ? 'owned' : '';
  const eq   = av.equipped ? `<div class="av-eq-dot">✓</div>` : '';
  const badge = av.badge || av.name.match(/^(\S+)/)?.[1] || '?';
  const shortName = (av.name || '').replace(/^\S+\s/, '');
  const n = shortName.length > 9 ? shortName.slice(0, 8) + '…' : shortName;
  return `<div class="av-cell ${gcls}" data-avid="${av.id}">
    ${eq}
    <span class="av-em">${badge}</span>
    <div class="av-glow"></div>
    <div class="av-nm ${nm}">${n || badge}</div>
    <div class="av-pr">${_priceLabel(av)}</div>
  </div>`;
}

function _buildGrid(avatars, tab) {
  if (!avatars.length)
    return `<div style="grid-column:1/-1;text-align:center;padding:40px 0;color:#374151;font-size:12px">Нет образов</div>`;

  if (tab === 'legend') {
    const prem = avatars.filter(a => a.currency === 'stars');
    const spec = avatars.filter(a => a.currency !== 'stars');
    let h = '';
    if (prem.length) {
      h += `<div class="av-sec" style="--lc:rgba(249,115,22,.3);--tc:#c2410c"><div class="av-sec-line"></div><div class="av-sec-txt">⭐ Premium · 50⭐ / $1</div><div class="av-sec-line"></div></div>`;
      h += prem.map(_cell).join('');
    }
    if (spec.length) {
      h += `<div class="av-sec" style="--lc:rgba(249,115,22,.5);--tc:#f97316"><div class="av-sec-line"></div><div class="av-sec-txt">🔥 Особые</div><div class="av-sec-line"></div></div>`;
      h += spec.map(_cell).join('');
    }
    return h;
  }
  return avatars.map(_cell).join('');
}

function _buildModal(av) {
  const tk = _tkey(av);
  const isEq = av.equipped, isUn = av.unlocked;

  const stats = [];
  if (av.effective_strength)  stats.push(`<span class="av-pill p-str">⚔️ Сила +${av.effective_strength}</span>`);
  if (av.effective_endurance) stats.push(`<span class="av-pill p-agi">🏃 Ловк +${av.effective_endurance}</span>`);
  if (av.effective_crit)      stats.push(`<span class="av-pill p-int">💥 Инту +${av.effective_crit}</span>`);
  if (av.effective_hp_flat)   stats.push(`<span class="av-pill p-end">🛡 HP +${av.effective_hp_flat}</span>`);

  let btns = '';
  if (isEq) {
    btns = `<button class="av-btn av-btn-equipped" data-act="none">✓ Экипирован</button>`;
  } else if (isUn) {
    btns = `<button class="av-btn av-btn-equip" data-act="equip" data-id="${av.id}">⚔️ Экипировать</button>`;
  } else if (av.currency === 'free') {
    btns = `<button class="av-btn av-btn-free" data-act="buy" data-id="${av.id}">🆓 Получить бесплатно</button>`;
  } else if (av.currency === 'gold') {
    btns = `<button class="av-btn av-btn-gold" data-act="buy" data-id="${av.id}">💰 Купить — ${av.price}</button>`;
  } else if (av.currency === 'diamonds') {
    btns = `<button class="av-btn av-btn-epic" data-act="buy" data-id="${av.id}">💎 Купить — ${av.price}</button>`;
  } else if (av.currency === 'stars') {
    btns = `<div class="av-btn-row">
      <button class="av-btn av-btn-stars" data-act="buy_stars" data-id="${av.id}">⭐ ${av.price} Stars</button>
      <button class="av-btn av-btn-usdt"  data-act="buy_crypto" data-id="${av.id}">💵 $${av.usdt_price || '1.00'} USDT</button>
    </div>`;
  } else if (av.currency === 'usdt_stars') {
    btns = `<div class="av-btn-row">
      <button class="av-btn av-btn-stars" data-act="buy_stars" data-id="${av.id}">⭐ ${av.price || 590} Stars</button>
      <button class="av-btn av-btn-elite" data-act="buy_crypto" data-id="${av.id}">💵 $${av.usdt_price || '11.99'} USDT</button>
    </div>`;
  } else if (av.currency === 'subscription') {
    btns = `<button class="av-btn av-btn-sub" data-act="none">👑 Нужна Premium подписка</button>`;
  } else if (av.currency === 'referral') {
    btns = `<button class="av-btn av-btn-ref" data-act="none">🤝 Пригласи 5+ друзей</button>`;
  }

  const nmCls = av.tier === 'epic' ? 'epic' : av.currency === 'subscription' ? 'sub' : av.tier === 'premium' || av.currency === 'usdt_stars' ? 'legend' : '';
  const badge = av.badge || av.name.match(/^(\S+)/)?.[1] || '?';
  const shortName = (av.name || '').replace(/^\S+\s/, '');

  return `<div class="av-modal" style="--mc:${MC[tk]||MC.legend};--ms:${MS[tk]||MS.legend}">
    <div class="av-modal-top">
      <span class="av-modal-em" style="filter:${MFIL[tk]||MFIL.legend}">${badge}</span>
      <div class="av-modal-head">
        <div class="av-modal-rar" style="color:${RCOL[tk]||'#f97316'}">${RLAB[tk]||'ЛЕГЕНДАРНЫЙ'}</div>
        <div class="av-modal-name ${nmCls}">${shortName || badge}</div>
      </div>
      <button class="av-modal-close" data-act="close-modal">✕</button>
    </div>
    <div class="av-modal-body">
      <div class="av-modal-desc">${av.description || ''}</div>
      <div class="av-modal-stats">${stats.join('')}</div>
      ${btns}
    </div>
  </div>`;
}

window.AvatarHTML = window.AvatarHTML || {};
Object.assign(window.AvatarHTML, { _injectCSS, _buildGrid, _buildModal, _tkey, _priceLabel, GCLS, RCOL, RLAB, MFIL, MC, MS });
})();
