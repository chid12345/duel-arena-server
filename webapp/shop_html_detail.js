/* ═══════════════════════════════════════════════════════════
   Shop HTML Detail — модалка деталей товара (Cyberpunk стиль)
   API: ShopHtml.showDetail(opts)
   opts: { icon, name, desc, badge, risk, price, currency, qty,
           rarity:'c'|'r'|'e'|'l'|'d', action: ()=>{...} }
   ═══════════════════════════════════════════════════════════ */
(() => {
const ID = 'shop-detail-mod';
const CSS = `
#${ID}{position:fixed;inset:0;z-index:9200;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:shdFade .18s ease}
#${ID}.on{display:flex}
@keyframes shdFade{from{opacity:0}to{opacity:1}}
#${ID} .shd-card{position:relative;width:100%;max-width:340px;background:linear-gradient(180deg,#0c0c1c 0%,#06060f 100%);border:1px solid rgba(0,245,255,.2);border-radius:18px;padding:20px 18px 16px;box-shadow:0 0 30px rgba(0,245,255,.15),0 12px 40px rgba(0,0,0,.7);animation:shdPop .25s cubic-bezier(.2,1.2,.4,1)}
@keyframes shdPop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
#${ID} .shd-card.r-r{border-color:rgba(68,136,255,.55);box-shadow:0 0 30px rgba(68,136,255,.3),0 12px 40px rgba(0,0,0,.7)}
#${ID} .shd-card.r-e{border-color:rgba(180,79,255,.6);box-shadow:0 0 32px rgba(180,79,255,.35),0 12px 40px rgba(0,0,0,.7)}
#${ID} .shd-card.r-l{border-color:rgba(255,140,0,.65);box-shadow:0 0 34px rgba(255,140,0,.4),0 12px 40px rgba(0,0,0,.7);animation:shdPop .25s cubic-bezier(.2,1.2,.4,1),shdMyth 3s ease-in-out .25s infinite}
@keyframes shdMyth{0%,100%{box-shadow:0 0 34px rgba(255,140,0,.4),0 12px 40px rgba(0,0,0,.7)}50%{box-shadow:0 0 14px rgba(255,140,0,.18),0 12px 40px rgba(0,0,0,.7)}}
#${ID} .shd-card.r-d{border-color:rgba(255,51,51,.55);box-shadow:0 0 30px rgba(255,51,51,.3),0 12px 40px rgba(0,0,0,.7)}
#${ID} .shd-card::before{content:"";position:absolute;inset:0;background:linear-gradient(145deg,rgba(255,255,255,.04) 0%,transparent 45%);border-radius:18px;pointer-events:none}
#${ID} .shd-x{position:absolute;top:8px;right:10px;width:30px;height:30px;display:grid;place-items:center;color:rgba(255,255,255,.45);font-size:22px;font-weight:300;cursor:pointer;border-radius:50%;transition:all .15s;line-height:1;user-select:none;z-index:2}
#${ID} .shd-x:hover{color:#fff;background:rgba(255,255,255,.08)}
#${ID} .shd-ico{font-size:64px;text-align:center;margin:6px 0 10px;line-height:1;filter:drop-shadow(0 0 10px rgba(200,200,220,.4));position:relative;z-index:1}
#${ID} .shd-card.r-r .shd-ico{filter:drop-shadow(0 0 14px rgba(68,136,255,.8))}
#${ID} .shd-card.r-e .shd-ico{filter:drop-shadow(0 0 16px rgba(180,79,255,.9))}
#${ID} .shd-card.r-l .shd-ico{filter:drop-shadow(0 0 16px rgba(255,140,0,.95))}
#${ID} .shd-card.r-d .shd-ico{filter:drop-shadow(0 0 14px rgba(255,51,51,.85))}
#${ID} .shd-nm{font-size:17px;font-weight:700;color:#fff;text-align:center;margin-bottom:6px;line-height:1.25;position:relative;z-index:1;letter-spacing:.3px}
#${ID} .shd-bdgs{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-bottom:10px;position:relative;z-index:1;min-height:0}
#${ID} .shd-bdgs:empty{display:none}
#${ID} .shd-bdg{display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:.5px;padding:3px 8px;border-radius:5px;line-height:1.3;text-transform:uppercase}
#${ID} .b-bat{background:rgba(255,45,120,.15);color:#ff5a8a;border:1px solid rgba(255,45,120,.3)}
#${ID} .b-dur{background:rgba(0,245,255,.1);color:#5fdfff;border:1px solid rgba(0,245,255,.25)}
#${ID} .b-risk{background:rgba(255,60,60,.16);color:#ff6666;border:1px solid rgba(255,60,60,.35)}
#${ID} .b-day{background:rgba(255,215,0,.1);color:#ffd700;border:1px solid rgba(255,215,0,.25)}
#${ID} .b-qty{background:rgba(0,245,255,.12);color:#00f5ff;border:1px solid rgba(0,245,255,.3)}
#${ID} .shd-ds{font-size:13px;color:rgba(220,220,240,.78);text-align:center;line-height:1.45;margin-bottom:14px;padding:0 6px;position:relative;z-index:1}
#${ID} .shd-ds:empty{display:none;margin:0}
#${ID} .shd-sep{height:1px;background:linear-gradient(90deg,transparent,rgba(0,245,255,.3),transparent);margin:0 -4px 12px;position:relative;z-index:1}
#${ID} .shd-pr{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;position:relative;z-index:1}
#${ID} .shd-pr-lbl{font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,.4);text-transform:uppercase}
#${ID} .shd-pr-ico{font-size:22px}
#${ID} .shd-pr-v{font-size:26px;font-weight:800;line-height:1}
#${ID} .pv-g{color:#ffd700;text-shadow:0 0 12px rgba(255,215,0,.55)}
#${ID} .pv-d{color:#00f5ff;text-shadow:0 0 12px rgba(0,245,255,.55)}
#${ID} .pv-u{color:#00ff88;text-shadow:0 0 12px rgba(0,255,136,.55)}
#${ID} .pv-s{color:#ffaa33;text-shadow:0 0 12px rgba(255,170,51,.55)}
#${ID} .shd-btn{width:100%;padding:13px 0;border-radius:10px;border:none;font-size:14px;font-weight:800;letter-spacing:1.5px;cursor:pointer;position:relative;overflow:hidden;transition:all .18s;text-transform:uppercase;z-index:1}
#${ID} .btn-g{background:linear-gradient(135deg,#b87a08,#ffd700);color:#1a1000;box-shadow:0 4px 14px rgba(255,215,0,.35)}
#${ID} .btn-d{background:linear-gradient(135deg,#0055bb,#00aaff);color:#fff;box-shadow:0 4px 14px rgba(0,170,255,.4)}
#${ID} .btn-u{background:linear-gradient(135deg,#007a3d,#00dd77);color:#001a0d;box-shadow:0 4px 14px rgba(0,221,119,.35)}
#${ID} .btn-s{background:linear-gradient(135deg,#995500,#ffaa33);color:#1a0800;box-shadow:0 4px 14px rgba(255,170,51,.35)}
#${ID} .btn-danger{background:linear-gradient(135deg,#aa1111,#ff3333);color:#fff;box-shadow:0 4px 14px rgba(255,51,51,.4)}
#${ID} .shd-btn:hover{filter:brightness(1.13);transform:translateY(-1px)}
#${ID} .shd-btn:active{transform:translateY(1px)}
#${ID} .shd-btn:disabled{opacity:.45;cursor:not-allowed;filter:grayscale(.6);transform:none}
`;

function _root() {
  let r = document.getElementById(ID);
  if (!r) {
    if (!document.getElementById('shd-css')) {
      const s = document.createElement('style'); s.id = 'shd-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
    r = document.createElement('div'); r.id = ID;
    document.body.appendChild(r);
    r.addEventListener('click', e => { if (e.target === r) ShopHtml.hideDetail(); });
  }
  return r;
}

function _badgeCls(badge) {
  if (!badge) return '';
  if (badge.includes('БОЙ')) return 'b-bat';
  if (badge.includes('БОЯ') || badge.includes('БОЁВ')) return 'b-dur';
  if (badge.includes('ЧАС')) return 'b-day';
  return 'b-dur';
}

function _btnCls(cur) {
  if (cur === 'diamonds') return 'btn-d';
  if (cur === 'usdt') return 'btn-u';
  if (cur === 'stars') return 'btn-s';
  if (cur === 'danger') return 'btn-danger';
  return 'btn-g';
}

function _priceCls(cur) {
  if (cur === 'diamonds') return 'pv-d';
  if (cur === 'usdt') return 'pv-u';
  if (cur === 'stars') return 'pv-s';
  return 'pv-g';
}

function _priceIcon(cur) {
  if (cur === 'diamonds') return '💎';
  if (cur === 'usdt') return '💲';
  if (cur === 'stars') return '⭐';
  return '🪙';
}

let _curAction = null, _escHandler = null;

window.ShopHtml = window.ShopHtml || {};
ShopHtml.showDetail = function(opts) {
  const r = _root();
  const r0 = opts.rarity || 'c';
  const cur = opts.currency || 'gold';
  const badges = [];
  if (opts.qty)   badges.push(`<span class="shd-bdg b-qty">В РЮКЗАКЕ ×${opts.qty}</span>`);
  if (opts.risk)  badges.push(`<span class="shd-bdg b-risk">⚠ РИСК</span>`);
  if (opts.badge) badges.push(`<span class="shd-bdg ${_badgeCls(opts.badge)}">${opts.badge}</span>`);
  const btnLabel = opts.actionLabel || `${_priceIcon(cur)} ${opts.price} — Купить`;
  const btnCls   = opts.btnClass || _btnCls(cur);
  r.innerHTML = `
<div class="shd-card r-${r0}">
  <div class="shd-x" data-close>×</div>
  <div class="shd-ico">${opts.icon || '📦'}</div>
  <div class="shd-nm">${opts.name || ''}</div>
  <div class="shd-bdgs">${badges.join('')}</div>
  <div class="shd-ds">${opts.desc || ''}</div>
  <div class="shd-sep"></div>
  <div class="shd-pr">
    <span class="shd-pr-lbl">Цена</span>
    <span class="shd-pr-ico">${_priceIcon(cur)}</span>
    <span class="shd-pr-v ${_priceCls(cur)}">${opts.price ?? ''}</span>
  </div>
  <button class="shd-btn ${btnCls}" data-act>${btnLabel}</button>
</div>`;
  r.classList.add('on');
  _curAction = typeof opts.action === 'function' ? opts.action : null;
  r.querySelector('[data-close]')?.addEventListener('click', () => ShopHtml.hideDetail());
  r.querySelector('[data-act]')?.addEventListener('click', () => {
    const fn = _curAction; ShopHtml.hideDetail();
    try { fn && fn(); } catch(e) { console.warn('[ShopDetail] action failed', e); }
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
