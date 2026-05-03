/* ═══════════════════════════════════════════════════════════
   Shop HTML Overlay — Cyberpunk магазин
   Продолжение: shop_html_items.js, shop_html_pay.js
   ═══════════════════════════════════════════════════════════ */
(() => {
const ID = 'shop-html-ov';
const CSS = `
#${ID}{position:fixed;top:0;left:0;right:0;bottom:0;z-index:8500;display:flex;flex-direction:column;background:#0a0a14;color:#e0e0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden}
#${ID}::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,245,255,.015) 3px 4px)}
.sh-hdr{flex-shrink:0;background:rgba(10,10,20,.97);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,245,255,.12);padding:10px 14px 0;position:relative;z-index:2}
.sh-hdr-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.sh-back{font-size:22px;color:rgba(0,245,255,.7);cursor:pointer;padding:2px 8px;user-select:none}
.sh-ttl{font-size:17px;font-weight:700;letter-spacing:2px;color:#00f5ff;text-shadow:0 0 18px rgba(0,245,255,.5)}
.sh-ttl span{color:#fff}
.sh-bp{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;user-select:none}
.sh-bp-btn{position:relative;width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(180,79,255,.07);box-shadow:0 0 0 1px rgba(180,79,255,.32),0 0 14px rgba(180,79,255,.28),inset 0 0 10px rgba(180,79,255,.05);transition:all .2s}
.sh-bp:hover .sh-bp-btn{box-shadow:0 0 0 1px rgba(180,79,255,.65),0 0 22px rgba(180,79,255,.5),inset 0 0 14px rgba(180,79,255,.1)}
.sh-bp-img{width:28px;height:28px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(180,79,255,.55)) drop-shadow(0 0 12px rgba(180,79,255,.3));transition:filter .2s}
.sh-bp:hover .sh-bp-img{filter:drop-shadow(0 0 8px rgba(180,79,255,.85)) drop-shadow(0 0 16px rgba(180,79,255,.5))}
.sh-bp-badge{display:none;position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;border-radius:9px;background:#e64c4c;border:2px solid #0a0a14;color:#fff;font-size:10px;font-weight:800;align-items:center;justify-content:center;padding:0 3px;line-height:1;z-index:3;animation:shBdgPop .3s ease}
.sh-bp-badge.on{display:flex}
@keyframes shBdgPop{0%{transform:scale(0)}70%{transform:scale(1.25)}100%{transform:scale(1)}}
.sh-bp-pulse{animation:shBpPulse .28s ease-in-out}
@keyframes shBpPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
.sh-bp-lbl{font-size:9px;font-weight:700;letter-spacing:.5px;color:rgba(180,79,255,.75);text-transform:uppercase}
.sh-tabs{display:flex;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid rgba(255,255,255,.05)}
.sh-tabs::-webkit-scrollbar{display:none}
.sh-tab{flex-shrink:0;padding:7px 13px;font-size:12px;font-weight:600;color:rgba(255,255,255,.4);cursor:pointer;border-bottom:2px solid transparent;transition:all .22s;white-space:nowrap;position:relative}
.sh-tab.on{color:#00f5ff;border-bottom-color:#00f5ff;text-shadow:0 0 10px rgba(0,245,255,.7)}
.sh-tab.on::after{content:"";position:absolute;bottom:-1px;left:0;right:0;height:2px;background:#00f5ff;box-shadow:0 0 8px #00f5ff,0 0 16px #00f5ff}
.sh-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 12px 88px;scrollbar-width:thin;scrollbar-color:rgba(0,245,255,.2) transparent;position:relative;z-index:1}
.sh-body::-webkit-scrollbar{width:3px}.sh-body::-webkit-scrollbar-thumb{background:rgba(0,245,255,.2);border-radius:2px}
.sh-panel{display:none}.sh-panel.on{display:block}
.sh-sec{font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.28);text-transform:uppercase;margin:16px 0 9px;padding-left:2px}
.sh-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.sh-card{position:relative;background:linear-gradient(145deg,rgba(18,5,32,.96),rgba(6,6,18,.97));border-radius:14px;border:none;padding:10px 10px 8px;display:flex;flex-direction:column;overflow:hidden;cursor:pointer;box-shadow:0 6px 28px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.055),inset 0 0 18px rgba(255,255,255,.025);transition:transform .14s,box-shadow .2s}
.sh-card::before{content:"";position:absolute;inset:0;background:linear-gradient(145deg,rgba(255,255,255,.04) 0%,transparent 50%);pointer-events:none}
.sh-card:hover{transform:translateY(-2px)}
.sh-card.r-r{box-shadow:0 6px 28px rgba(0,0,0,.55),0 0 0 1px rgba(68,136,255,.35),0 0 18px rgba(68,136,255,.22),inset 0 0 20px rgba(68,136,255,.06)}
.sh-card.r-r:hover{box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 0 1px rgba(68,136,255,.6),0 0 28px rgba(68,136,255,.38),inset 0 0 24px rgba(68,136,255,.1)}
.sh-card.r-e{box-shadow:0 6px 28px rgba(0,0,0,.55),0 0 0 1px rgba(180,79,255,.38),0 0 20px rgba(180,79,255,.26),inset 0 0 22px rgba(180,79,255,.07)}
.sh-card.r-e:hover{box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 0 1px rgba(180,79,255,.65),0 0 30px rgba(180,79,255,.42),inset 0 0 26px rgba(180,79,255,.12)}
.sh-card.r-l{background:linear-gradient(145deg,rgba(24,10,4,.96),rgba(8,6,2,.97));box-shadow:0 6px 28px rgba(0,0,0,.55),0 0 0 1px rgba(255,140,0,.4),0 0 22px rgba(255,140,0,.28),inset 0 0 22px rgba(255,140,0,.07);animation:shMythic 3s ease-in-out infinite}
.sh-card.r-l:hover{box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 0 1px rgba(255,140,0,.7),0 0 34px rgba(255,140,0,.45),inset 0 0 26px rgba(255,140,0,.12)}
@keyframes shMythic{0%,100%{box-shadow:0 6px 28px rgba(0,0,0,.55),0 0 0 1px rgba(255,140,0,.4),0 0 22px rgba(255,140,0,.28),inset 0 0 22px rgba(255,140,0,.07)}50%{box-shadow:0 6px 28px rgba(0,0,0,.55),0 0 0 1px rgba(255,140,0,.2),0 0 10px rgba(255,140,0,.12),inset 0 0 12px rgba(255,140,0,.04)}}
.sh-card.r-d{background:linear-gradient(145deg,rgba(22,4,4,.96),rgba(8,4,4,.97));box-shadow:0 6px 28px rgba(0,0,0,.55),0 0 0 1px rgba(255,51,51,.35),0 0 18px rgba(255,51,51,.22),inset 0 0 20px rgba(255,51,51,.06)}
.sh-card.r-d:hover{box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 0 1px rgba(255,51,51,.6),0 0 28px rgba(255,51,51,.38),inset 0 0 24px rgba(255,51,51,.1)}
.sh-diode{position:absolute;top:9px;left:9px;width:7px;height:7px;border-radius:50%;box-shadow:0 0 5px currentColor,0 0 10px currentColor}
.d-c{background:#8a8a9a;color:#8a8a9a}.d-r{background:#4488ff;color:#4488ff;animation:shDiode 2s ease-in-out infinite}.d-e{background:#b44fff;color:#b44fff;animation:shDiode 1.6s ease-in-out infinite}.d-l{background:#ff8c00;color:#ff8c00;animation:shDiode 1s ease-in-out infinite}.d-d{background:#ff3333;color:#ff3333;animation:shDiode 1.2s ease-in-out infinite}
@keyframes shDiode{0%,100%{opacity:1;box-shadow:0 0 5px currentColor,0 0 10px currentColor}50%{opacity:.4;box-shadow:0 0 2px currentColor}}
.sh-inv-cnt{position:absolute;top:7px;right:7px;background:rgba(0,245,255,.12);border:1px solid rgba(0,245,255,.25);border-radius:6px;font-size:8px;font-weight:700;color:#00f5ff;padding:1px 5px;line-height:1.4;z-index:2}
.sh-ico{font-size:30px;text-align:center;margin:12px 0 6px;filter:drop-shadow(0 0 6px rgba(255,255,255,.25));position:relative;z-index:1}
.sh-nm{font-size:11.5px;font-weight:600;line-height:1.3;color:#d0d0e8;text-align:center;margin-bottom:3px;position:relative;z-index:1}
.sh-ds{font-size:10px;color:rgba(255,255,255,.38);text-align:center;line-height:1.4;flex:1;position:relative;z-index:1}
.sh-bdg{display:block;font-size:9px;font-weight:700;letter-spacing:.4px;padding:2px 7px;border-radius:4px;margin:5px auto 0;width:fit-content;position:relative;z-index:1}
.b-bat{background:rgba(255,45,120,.18);color:#ff2d78;border:1px solid rgba(255,45,120,.28)}.b-dur{background:rgba(0,245,255,.09);color:#00f5ff;border:1px solid rgba(0,245,255,.18)}.b-risk{background:rgba(255,60,60,.14);color:#ff4444;border:1px solid rgba(255,60,60,.28)}.b-day{background:rgba(255,215,0,.1);color:#ffd700;border:1px solid rgba(255,215,0,.2)}
.sh-pr{display:flex;align-items:center;justify-content:center;gap:5px;margin:7px 0 5px;position:relative;z-index:1}
.sh-pr-ico{font-size:15px}.sh-pr-v{font-size:17px;font-weight:800;color:#fff}
.pv-g{color:#ffd700;text-shadow:0 0 8px rgba(255,215,0,.45)}.pv-d{color:#00f5ff;text-shadow:0 0 8px rgba(0,245,255,.45)}.pv-u{color:#00ff88;text-shadow:0 0 8px rgba(0,255,136,.45)}.pv-s{color:#ffaa33;text-shadow:0 0 8px rgba(255,170,51,.45)}
.sh-btn{width:100%;padding:7px 0;border-radius:7px;border:none;font-size:11px;font-weight:700;letter-spacing:.8px;cursor:pointer;position:relative;overflow:hidden;transition:all .18s;z-index:1}
.btn-g{background:linear-gradient(135deg,#b87a08,#ffd700);color:#1a1000}.btn-d{background:linear-gradient(135deg,#0055bb,#00aaff);color:#fff}.btn-u{background:linear-gradient(135deg,#007a3d,#00dd77);color:#001a0d}.btn-s{background:linear-gradient(135deg,#995500,#ffaa33);color:#1a0800}.btn-danger{background:linear-gradient(135deg,#aa1111,#ff3333);color:#fff}
.sh-btn:hover{filter:brightness(1.12);transform:scale(1.02)}.sh-btn:active{transform:scale(.96)}
.sh-fov{position:absolute;inset:0;border-radius:14px;pointer-events:none;z-index:5;animation:shFlash .45s forwards}
@keyframes shFlash{0%{background:rgba(255,255,255,.22)}100%{background:rgba(255,255,255,0)}}
.sh-prem{background:linear-gradient(135deg,rgba(180,79,255,.13),rgba(255,45,120,.08));border:1px solid rgba(180,79,255,.3);border-radius:11px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;position:relative;overflow:hidden;margin-bottom:2px;cursor:pointer}
.sh-foot{flex-shrink:0;position:relative;z-index:2;background:rgba(10,10,20,.97);backdrop-filter:blur(20px);border-top:1px solid rgba(0,245,255,.18);padding:9px 18px;display:flex;align-items:center;justify-content:space-between}
.sh-foot::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#00f5ff,#b44fff,transparent);box-shadow:0 0 8px #00f5ff}
.sh-fl{font-size:9px;letter-spacing:1px;color:rgba(255,255,255,.3);text-transform:uppercase}
.sh-fi{display:flex;gap:14px}.sh-fitem{display:flex;align-items:center;gap:5px}
.sh-fval{font-size:15px;font-weight:800;line-height:1}.fv-g{color:#ffd700;text-shadow:0 0 6px rgba(255,215,0,.35)}.fv-d{color:#00f5ff;text-shadow:0 0 6px rgba(0,245,255,.35)}
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
