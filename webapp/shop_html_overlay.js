/* ═══════════════════════════════════════════════════════════
   Shop HTML Overlay — Cyberpunk магазин
   Продолжение: shop_html_items.js, shop_html_pay.js
   ═══════════════════════════════════════════════════════════ */
(() => {
const ID = 'shop-html-ov';
const CSS = `
#${ID}{position:fixed;top:0;left:0;right:0;bottom:0;z-index:8500;display:flex;flex-direction:column;background:#0a0a14;color:#e0e0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden}
#${ID}::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,245,255,.015) 3px 4px)}
.sh-hdr{flex-shrink:0;background:rgba(10,10,20,.97);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,245,255,.12);padding:6px 14px 0;position:relative;z-index:2}
.sh-hdr-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.sh-back{font-size:22px;color:rgba(0,245,255,.7);cursor:pointer;padding:2px 8px;user-select:none}
.sh-ttl{font-size:17px;font-weight:700;letter-spacing:2px;color:#00f5ff;text-shadow:0 0 18px rgba(0,245,255,.5)}
.sh-ttl span{color:#fff}
.sh-bp{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;user-select:none}
.sh-bp-btn{position:relative;width:40px;height:40px;display:grid;place-items:center;background:none;border:none;box-shadow:none;transition:transform .15s}
.sh-bp:active .sh-bp-btn{transform:scale(.93)}
.sh-bp-img{width:38px;height:38px;object-fit:contain;filter:drop-shadow(0 0 5px rgba(180,79,255,.55));transition:filter .15s}
.sh-bp:hover .sh-bp-img{filter:drop-shadow(0 0 9px rgba(180,79,255,.95))}
.sh-bp-badge{display:none;position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;border-radius:9px;background:#e64c4c;border:2px solid #0a0a14;color:#fff;font-size:10px;font-weight:800;align-items:center;justify-content:center;padding:0 3px;line-height:1;z-index:3;animation:shBdgPop .3s ease}
.sh-bp-badge.on{display:flex}
@keyframes shBdgPop{0%{transform:scale(0)}70%{transform:scale(1.25)}100%{transform:scale(1)}}
.sh-bp-pulse{animation:shBpPulse .28s ease-in-out}
@keyframes shBpPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
.sh-bp-lbl{font-size:9px;font-weight:700;letter-spacing:.5px;color:rgba(180,79,255,.75);text-transform:uppercase}
.sh-tabs{display:flex;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid rgba(255,255,255,.05)}
.sh-tabs::-webkit-scrollbar{display:none}
.sh-tab{flex-shrink:0;padding:5px 10px;font-size:11px;font-weight:600;color:rgba(255,255,255,.4);cursor:pointer;border-bottom:2px solid transparent;transition:all .22s;white-space:nowrap;position:relative}
.sh-tab.on{color:#00f5ff;border-bottom-color:#00f5ff;text-shadow:0 0 10px rgba(0,245,255,.7)}
.sh-tab.on::after{content:"";position:absolute;bottom:-1px;left:0;right:0;height:2px;background:#00f5ff;box-shadow:0 0 8px #00f5ff,0 0 16px #00f5ff}
.sh-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:4px 6px 60px;scrollbar-width:thin;scrollbar-color:rgba(0,245,255,.2) transparent;position:relative;z-index:1}
.sh-body::-webkit-scrollbar{width:3px}.sh-body::-webkit-scrollbar-thumb{background:rgba(0,245,255,.2);border-radius:2px}
.sh-panel{display:none}.sh-panel.on{display:block}
.sh-sec{font-size:9px;font-weight:700;letter-spacing:1.5px;color:rgba(255,255,255,.28);text-transform:uppercase;margin:7px 0 4px;padding-left:2px}
.sh-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.sh-card{position:relative;background:none;border:none;box-shadow:none;padding:4px 2px;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform .15s;user-select:none}
.sh-card:active{transform:scale(.93)}
.sh-card.r-l{animation:shMythic 3s ease-in-out infinite}
@keyframes shMythic{0%,100%{filter:drop-shadow(0 0 6px rgba(255,140,0,.45))}50%{filter:drop-shadow(0 0 2px rgba(255,140,0,.15))}}
.sh-diode{display:none}
.sh-inv-cnt{position:absolute;top:0;right:0;background:rgba(0,245,255,.18);border:1px solid rgba(0,245,255,.4);border-radius:5px;font-size:8px;font-weight:700;color:#00f5ff;padding:0 4px;line-height:1.3;z-index:2}
.sh-ico{font-size:24px;text-align:center;margin:1px 0 2px;line-height:1;filter:drop-shadow(0 0 5px rgba(200,200,220,.4));transition:filter .15s}
.sh-card.r-r .sh-ico{filter:drop-shadow(0 0 6px rgba(68,136,255,.7))}
.sh-card.r-e .sh-ico{filter:drop-shadow(0 0 7px rgba(180,79,255,.8))}
.sh-card.r-l .sh-ico{filter:drop-shadow(0 0 7px rgba(255,140,0,.85))}
.sh-card.r-d .sh-ico{filter:drop-shadow(0 0 6px rgba(255,51,51,.75))}
.sh-card:hover .sh-ico{filter:brightness(1.15) drop-shadow(0 0 9px rgba(255,255,255,.5))}
.sh-nm{font-size:8.5px;font-weight:600;line-height:1.15;color:#d0d0e8;text-align:center;margin-bottom:1px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:18px}
.sh-ds{display:none}
.sh-bdg{display:inline-block;font-size:7px;font-weight:700;letter-spacing:.2px;padding:1px 3px;border-radius:3px;margin:0 auto;line-height:1.2}
.b-bat{background:rgba(255,45,120,.15);color:#ff5a8a}.b-dur{background:rgba(0,245,255,.08);color:#5fdfff}.b-risk{background:rgba(255,60,60,.14);color:#ff6666}.b-day{background:rgba(255,215,0,.1);color:#ffd700}
.sh-pr{display:flex;align-items:center;justify-content:center;gap:2px;margin:2px 0 2px}
.sh-pr-ico{font-size:9px}.sh-pr-v{font-size:11px;font-weight:800;color:#fff;line-height:1}
.pv-g{color:#ffd700;text-shadow:0 0 6px rgba(255,215,0,.45)}.pv-d{color:#00f5ff;text-shadow:0 0 6px rgba(0,245,255,.45)}.pv-u{color:#00ff88;text-shadow:0 0 6px rgba(0,255,136,.45)}.pv-s{color:#ffaa33;text-shadow:0 0 6px rgba(255,170,51,.45)}
.sh-btn{width:100%;padding:3px 0;border-radius:4px;border:none;font-size:8px;font-weight:700;letter-spacing:.4px;cursor:pointer;position:relative;overflow:hidden;transition:all .18s;margin-top:auto}
.btn-g{background:linear-gradient(135deg,#b87a08,#ffd700);color:#1a1000}.btn-d{background:linear-gradient(135deg,#0055bb,#00aaff);color:#fff}.btn-u{background:linear-gradient(135deg,#007a3d,#00dd77);color:#001a0d}.btn-s{background:linear-gradient(135deg,#995500,#ffaa33);color:#1a0800}.btn-danger{background:linear-gradient(135deg,#aa1111,#ff3333);color:#fff}
.sh-btn:hover{filter:brightness(1.12);transform:scale(1.02)}.sh-btn:active{transform:scale(.96)}
.sh-fov{position:absolute;inset:0;border-radius:14px;pointer-events:none;z-index:5;animation:shFlash .45s forwards}
@keyframes shFlash{0%{background:rgba(255,255,255,.22)}100%{background:rgba(255,255,255,0)}}
.sh-prem{background:linear-gradient(135deg,rgba(180,79,255,.13),rgba(255,45,120,.08));border:1px solid rgba(180,79,255,.3);border-radius:11px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;position:relative;overflow:hidden;margin-bottom:2px;cursor:pointer}
.sh-foot{flex-shrink:0;position:relative;z-index:2;background:rgba(10,10,20,.97);backdrop-filter:blur(20px);border-top:1px solid rgba(0,245,255,.18);padding:6px 14px;display:flex;align-items:center;justify-content:space-between}
.sh-foot::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#00f5ff,#b44fff,transparent);box-shadow:0 0 8px #00f5ff}
.sh-fl{font-size:9px;letter-spacing:1px;color:rgba(255,255,255,.3);text-transform:uppercase}
.sh-fi{display:flex;gap:14px}.sh-fitem{display:flex;align-items:center;gap:5px}
.sh-fval{font-size:13px;font-weight:800;line-height:1}.fv-g{color:#ffd700;text-shadow:0 0 6px rgba(255,215,0,.35)}.fv-d{color:#00f5ff;text-shadow:0 0 6px rgba(0,245,255,.35)}
.sh-toast{position:fixed;bottom:70px;left:50%;transform:translateX(-50%) translateY(12px);background:rgba(0,245,255,.13);border:1px solid rgba(0,245,255,.35);border-radius:18px;padding:7px 18px;font-size:12px;font-weight:600;color:#00f5ff;backdrop-filter:blur(10px);z-index:9100;opacity:0;transition:all .25s;white-space:nowrap;pointer-events:none}
.sh-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}.sh-toast.err{background:rgba(255,51,51,.13);border-color:rgba(255,51,51,.35);color:#ff6666}
`;

let _scene = null, _tab = 'consumables';
let _toastTmr = null;

function _root() {
  let r = document.getElementById(ID);
  if (!r) {
    if (!document.getElementById('sh-css')) {
      const s = document.createElement('style');
      s.id = 'sh-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
    r = document.createElement('div'); r.id = ID;
    document.body.appendChild(r);
  }
  return r;
}

window.ShopHtml = {
  async show(tab, scene) {
    _scene = scene; _tab = tab || 'consumables';
    const r = _root();
    r.innerHTML = _html();
    r.style.display = 'flex';
    r.querySelector('.sh-back').addEventListener('click', () => ShopHtml.hide());
    r.querySelector('#sh-bp').addEventListener('click', () => ShopHtml._openInventory());
    r.querySelectorAll('.sh-tab').forEach(t => t.addEventListener('click', () => ShopHtml._setTab(t.dataset.t)));
    ShopHtml._setTab(_tab, true);
    // Загружаем данные
    try { const d = await post('/api/player'); if (d.ok && d.player) State.player = d.player; } catch(_) {}
    ShopHtml._updateBalance();
    ShopHtml._renderBadge();
    try {
      const inv = await get('/api/shop/inventory');
      if (inv?.inventory) ShopHtmlItems._setInv(inv.inventory);
    } catch(_) {}
  },
  hide() {
    const r = document.getElementById(ID);
    if (r) r.style.display = 'none';
    if (_scene) { _scene.scene.start('Menu', { returnTab: 'more' }); _scene = null; }
  },
  _setTab(t, init) {
    _tab = t;
    const r = document.getElementById(ID); if (!r) return;
    r.querySelectorAll('.sh-tab').forEach(el => el.classList.toggle('on', el.dataset.t === t));
    r.querySelectorAll('.sh-panel').forEach(el => el.classList.toggle('on', el.id === `sh-p-${t}`));
    if (!init) r.querySelector('.sh-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    r.querySelector(`.sh-tab[data-t="${t}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    if (t === 'stars') ShopHtmlPay._buildStars();
    if (t === 'special') ShopHtmlPay._buildSpecial();
  },
  _updateBalance() {
    const p = State.player;
    const r = document.getElementById(ID); if (!r) return;
    const g = r.querySelector('#sh-fg'); const d = r.querySelector('#sh-fd');
    if (g) g.textContent = (p?.gold || 0).toLocaleString('ru');
    if (d) d.textContent = p?.diamonds || 0;
  },
  toast(msg, err) {
    const t = document.getElementById('sh-toast'); if (!t) return;
    t.textContent = msg; t.className = 'sh-toast on' + (err ? ' err' : '');
    clearTimeout(_toastTmr);
    _toastTmr = setTimeout(() => t.classList.remove('on'), 2200);
  },
  _readInvCount() {
    const sv = State?.player?.inventory_unseen;
    if (typeof sv === 'number') return Math.max(0, sv | 0);
    try { return parseInt(localStorage.getItem('shop_inv_new_count') || '0', 10) || 0; } catch(_) { return 0; }
  },
  _renderBadge() {
    const badge = document.getElementById('sh-bp-badge'); if (!badge) return;
    const n = ShopHtml._readInvCount();
    if (n > 0) {
      badge.textContent = n > 9 ? '9+' : String(n);
      badge.classList.add('on');
    } else {
      badge.classList.remove('on');
    }
  },
  bumpInvBadge() {
    const hasSv = typeof State?.player?.inventory_unseen === 'number';
    if (!hasSv) {
      const n = ShopHtml._readInvCount() + 1;
      try { localStorage.setItem('shop_inv_new_count', String(n)); } catch(_) {}
    }
    ShopHtml._renderBadge();
    // Пульс кнопки
    const btn = document.querySelector('.sh-bp-btn'); if (!btn) return;
    btn.classList.remove('sh-bp-pulse');
    void btn.offsetWidth;
    btn.classList.add('sh-bp-pulse');
    setTimeout(() => btn.classList.remove('sh-bp-pulse'), 300);
  },
  _openInventory() {
    // Сбрасываем счётчик
    try { localStorage.setItem('shop_inv_new_count', '0'); } catch(_) {}
    const r = document.getElementById('shop-html-ov');
    if (r) r.style.display = 'none';
    if (_scene) { _scene.scene.start('Stats', { player: State.player, openInventory: true }); }
  },
};

function _html() {
  return `
<div class="sh-hdr">
  <div class="sh-hdr-row">
    <div style="display:flex;align-items:center;gap:8px">
      <div class="sh-back">‹</div>
      <div class="sh-ttl"><span>⚔️</span> МАГАЗИН</div>
    </div>
    <div class="sh-bp" id="sh-bp">
      <div class="sh-bp-btn">
        <img src="рюкзак.png" class="sh-bp-img" alt="Рюкзак">
        <span class="sh-bp-badge" id="sh-bp-badge"></span>
      </div>
      <div class="sh-bp-lbl">Рюкзак</div>
    </div>
  </div>
  <div class="sh-tabs">
    <div class="sh-tab" data-t="consumables">🧪 Зелья</div>
    <div class="sh-tab" data-t="scrolls">📜 Свитки</div>
    <div class="sh-tab" data-t="boxes">🎲 Ящики</div>
    <div class="sh-tab" data-t="stars">⭐ Звёзды</div>
    <div class="sh-tab" data-t="special">💵 Купить</div>
  </div>
</div>
<div class="sh-body">
  <div class="sh-panel" id="sh-p-consumables">${ShopHtmlItems._panelHTML('consumables')}</div>
  <div class="sh-panel" id="sh-p-scrolls">${ShopHtmlItems._panelHTML('scrolls')}</div>
  <div class="sh-panel" id="sh-p-boxes">${ShopHtmlItems._panelHTML('boxes')}</div>
  <div class="sh-panel" id="sh-p-stars"><div style="text-align:center;padding:40px;color:rgba(255,255,255,.3)">⏳ Загрузка...</div></div>
  <div class="sh-panel" id="sh-p-special"><div style="text-align:center;padding:40px;color:rgba(255,255,255,.3)">⏳ Загрузка...</div></div>
</div>
<div class="sh-foot">
  <div class="sh-fl">Баланс</div>
  <div class="sh-fi">
    <div class="sh-fitem"><span style="font-size:17px">🪙</span><span class="sh-fval fv-g" id="sh-fg">—</span></div>
    <div class="sh-fitem"><span style="font-size:17px">💎</span><span class="sh-fval fv-d" id="sh-fd">—</span></div>
  </div>
</div>
<div class="sh-toast" id="sh-toast"></div>`;
}
})();
