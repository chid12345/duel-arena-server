/* ═══════════════════════════════════════════════════════════
   Shop HTML Detail — модалка деталей товара (Cyberpunk стиль)
   API: ShopHtml.showDetail(opts)
   opts: { icon, name, desc, rows, badge, risk, price, currency,
           qty, rarity:'c'|'r'|'e'|'l'|'d',
           action, actionLabel, btnClass }
   ═══════════════════════════════════════════════════════════ */
(() => {
const ID = 'shop-detail-mod';

// ── Переиспользуем spd-* CSS из shop_html_pay_detail.js (он уже подключён) ─
// Добавляем только специфичные для этого модуля стили
const CSS_ID = 'shd-own-css';
if (!document.getElementById(CSS_ID)) {
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = `
#${ID}{position:fixed;inset:0;z-index:9300;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,10,.88);backdrop-filter:blur(12px)}
#${ID}.on{display:flex;animation:shdFade .18s ease}
@keyframes shdFade{from{opacity:0}to{opacity:1}}
#${ID} .shd-card{animation:shdPop .22s cubic-bezier(.2,1.2,.4,1)}
@keyframes shdPop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
#${ID} .shd-card.r-l{animation:shdPop .22s cubic-bezier(.2,1.2,.4,1),shdMyth 3s ease-in-out .22s infinite}
@keyframes shdMyth{0%,100%{box-shadow:0 0 40px rgba(255,140,0,.35),0 16px 50px rgba(0,0,0,.8)}50%{box-shadow:0 0 16px rgba(255,140,0,.15),0 16px 50px rgba(0,0,0,.8)}}
#${ID} .shd-ds{font-size:13px;color:#c0d8ff;line-height:1.55;position:relative;z-index:1}
#${ID} .shd-ds-wrap{background:rgba(0,200,255,.05);border:1px solid rgba(0,200,255,.12);border-radius:12px;padding:10px 14px;margin-bottom:14px;position:relative;z-index:1}
#${ID} .shd-ds-wrap.r-r{border-color:rgba(68,136,255,.2);background:rgba(68,136,255,.05)}
#${ID} .shd-ds-wrap.r-e{border-color:rgba(180,79,255,.2);background:rgba(180,79,255,.05)}
#${ID} .shd-ds-wrap.r-l{border-color:rgba(255,140,0,.25);background:rgba(255,140,0,.05)}
#${ID} .shd-ds-wrap.r-d{border-color:rgba(255,51,51,.2);background:rgba(255,51,51,.05)}
#${ID} .shd-bdgs{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-bottom:10px;position:relative;z-index:1}
#${ID} .shd-bdgs:empty{display:none;margin:0}
#${ID} .shd-bdg{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.8px;padding:3px 10px;border-radius:6px;line-height:1.3;text-transform:uppercase}
#${ID} .b-qty{background:rgba(0,245,255,.12);color:#00f5ff;border:1px solid rgba(0,245,255,.3)}
#${ID} .b-bat{background:rgba(255,45,120,.15);color:#ff5a8a;border:1px solid rgba(255,45,120,.3)}
#${ID} .b-dur{background:rgba(0,200,255,.1);color:#5fdfff;border:1px solid rgba(0,200,255,.25)}
#${ID} .b-risk{background:rgba(255,60,60,.16);color:#ff6666;border:1px solid rgba(255,60,60,.35)}
#${ID} .b-day{background:rgba(255,215,0,.1);color:#ffd700;border:1px solid rgba(255,215,0,.25)}
`;
  document.head.appendChild(s);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const _RS = {
  l: { border:'rgba(255,140,0,.7)',  glow:'rgba(255,140,0,.35)',  sub:'rgba(255,180,60,.85)',  txt:'◆ Легендарный' },
  e: { border:'rgba(180,79,255,.7)', glow:'rgba(180,79,255,.3)',  sub:'rgba(200,100,255,.85)', txt:'◆ Эпический'   },
  r: { border:'rgba(0,200,255,.6)',  glow:'rgba(0,200,255,.25)',  sub:'rgba(0,210,255,.85)',   txt:'◆ Редкий'      },
  c: { border:'rgba(120,140,180,.4)',glow:'rgba(120,140,180,.15)',sub:'rgba(160,180,200,.7)',  txt:'◆ Обычный'     },
  d: { border:'rgba(255,51,51,.65)', glow:'rgba(255,51,51,.3)',   sub:'rgba(255,90,90,.85)',   txt:'⚠ Опасно'      },
};

function _btnCls(cur) {
  if (cur === 'diamonds') return 'spd-btn-u';
  if (cur === 'usdt')     return 'spd-btn-u';
  if (cur === 'stars')    return 'spd-btn-s';
  if (cur === 'danger')   return 'spd-btn-danger';
  return 'spd-btn-g';
}
function _pIcon(cur) {
  return cur === 'diamonds' ? '💎' : cur === 'usdt' ? '💲' : cur === 'stars' ? '⭐' : '🪙';
}

function _badgeCls(b) {
  if (!b) return '';
  if (b.includes('БОЙ')) return 'b-bat';
  if (b.includes('БОЯ') || b.includes('БОЁВ')) return 'b-dur';
  if (b.includes('ЧАС')) return 'b-day';
  return 'b-dur';
}

function _root() {
  let r = document.getElementById(ID);
  if (!r) {
    r = document.createElement('div'); r.id = ID;
    document.body.appendChild(r);
    r.addEventListener('click', e => { if (e.target === r) ShopHtml.hideDetail(); });
  }
  return r;
}

// ── Стиль кнопки gold отдельно (нет в spd-*) ─────────────────────────────────
const CSS_G_ID = 'shd-btn-g';
if (!document.getElementById(CSS_G_ID)) {
  const s = document.createElement('style'); s.id = CSS_G_ID;
  s.textContent = '.spd-btn-g{background:linear-gradient(135deg,#7a5000,#c88000,#ffd700);color:#1a0e00;box-shadow:0 0 22px rgba(255,215,0,.45),0 4px 15px rgba(0,0,0,.5);text-shadow:0 1px 0 rgba(255,255,255,.2)}.spd-btn-g:hover{box-shadow:0 0 30px rgba(255,215,0,.65),0 4px 15px rgba(0,0,0,.5);filter:brightness(1.08)}.spd-btn-d-blue{background:linear-gradient(135deg,#003a88,#0077dd,#00aaff);color:#fff;box-shadow:0 0 22px rgba(0,170,255,.45),0 4px 15px rgba(0,0,0,.5)}.spd-btn-d-blue:hover{box-shadow:0 0 30px rgba(0,170,255,.65)}';
  document.head.appendChild(s);
}

let _curAction = null, _escHandler = null;

window.ShopHtml = window.ShopHtml || {};

ShopHtml.showDetail = function(opts) {
  const r = _root();
  const r0 = opts.rarity || 'c';
  const rs = _RS[r0] || _RS.c;
  const cur = opts.currency || 'gold';

  // Badges
  const badges = [];
  if (opts.qty)   badges.push(`<span class="shd-bdg b-qty">В РЮКЗАКЕ ×${opts.qty}</span>`);
  if (opts.risk)  badges.push(`<span class="shd-bdg b-risk">⚠ РИСК</span>`);
  if (opts.badge) badges.push(`<span class="shd-bdg ${_badgeCls(opts.badge)}">${opts.badge}</span>`);

  // Description: либо rows (spd-row стиль), либо plain html
  let descHtml = '';
  if (opts.rows) {
    descHtml = `<div class="spd-rows shd-ds-wrap r-${r0}" style="margin-bottom:14px">${opts.rows}</div>`;
  } else if (opts.desc) {
    descHtml = `<div class="shd-ds-wrap r-${r0}"><div class="shd-ds">${opts.desc}</div></div>`;
  }

  const pIcon = _pIcon(cur);
  const btnLabel = opts.actionLabel || `Купить за ${opts.price ?? ''} ${pIcon}`;
  const btnCls = opts.btnClass
    ? (opts.btnClass === 'btn-danger' ? 'spd-btn-danger' : opts.btnClass)
    : (cur === 'diamonds' ? 'spd-btn-d-blue' : _btnCls(cur));

  r.innerHTML = `
<div class="spd-card shd-card r-${r0}" style="border:1px solid ${rs.border};box-shadow:0 0 40px ${rs.glow},0 16px 50px rgba(0,0,0,.8)">
  <div class="spd-close" data-close>×</div>
  <div class="spd-ico">${opts.icon || '📦'}</div>
  <div class="spd-name">${opts.name || ''}</div>
  <div class="spd-sub" style="color:${rs.sub}">${rs.txt}</div>
  <div class="shd-bdgs">${badges.join('')}</div>
  ${descHtml}
  <div class="spd-line" style="background:linear-gradient(90deg,transparent,${rs.border},transparent)"></div>
  <button class="spd-btn ${btnCls}" data-act>${btnLabel}</button>
</div>`;

  r.classList.add('on');
  _curAction = typeof opts.action === 'function' ? opts.action : null;
  r.querySelector('[data-close]')?.addEventListener('click', () => ShopHtml.hideDetail());
  r.querySelector('[data-act]')?.addEventListener('click', () => {
    const fn = _curAction; ShopHtml.hideDetail();
    try { fn && fn(); } catch(e) { console.warn('[ShopDetail]', e); }
  });
  if (!_escHandler) {
    _escHandler = e => { if (e.key === 'Escape') ShopHtml.hideDetail(); };
    document.addEventListener('keydown', _escHandler);
  }
};

ShopHtml.hideDetail = function() {
  const r = document.getElementById(ID); if (!r) return;
  r.classList.remove('on');
  _curAction = null;
  if (_escHandler) { document.removeEventListener('keydown', _escHandler); _escHandler = null; }
};
})();
