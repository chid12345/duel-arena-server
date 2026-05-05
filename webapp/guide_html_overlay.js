/* ============================================================
   Guide HTML Overlay — киберпанк/неон тема для "Справка"
   ============================================================ */
(() => {
const CSS = `
.gd-ov{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9000;display:flex;flex-direction:column;align-items:center;background:radial-gradient(ellipse at 50% 0%,#1a0a2a 0%,#05050a 55%),#000;color:#e6f7ff;overflow:hidden;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}
.gd-ov::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.025) 3px 4px);pointer-events:none;z-index:1}
.gd-ov::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 30%,rgba(255,40,170,.12),transparent 40%),radial-gradient(circle at 80% 70%,rgba(0,230,255,.10),transparent 40%);pointer-events:none;z-index:1}
.gd-inner{position:relative;z-index:2;width:100%;max-width:430px;height:100%;display:flex;flex-direction:column;overflow:hidden}
.gd-hdr{display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid rgba(0,240,255,.12);flex-shrink:0}
@keyframes gdBack{0%,100%{text-shadow:0 0 8px #00f5ff,0 0 18px rgba(0,245,255,.3);opacity:.75}50%{text-shadow:0 0 16px #00f5ff,0 0 32px rgba(0,245,255,.6);opacity:1}}
.gd-back{display:inline-flex;flex-direction:column;align-items:center;line-height:1;font-size:28px;color:#00f5ff;cursor:pointer;padding:2px 8px;user-select:none;animation:gdBack 2s ease-in-out infinite;flex-shrink:0}
.gd-back::after{content:'НАЗАД';font-size:6px;font-weight:700;letter-spacing:1.2px;color:rgba(0,245,255,.6);margin-top:-1px}
.gd-back:active{transform:scale(.88)}
.gd-title{font-size:16px;font-weight:800;letter-spacing:.5px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.gd-tabs{display:flex;gap:6px;padding:10px 12px;overflow-x:auto;flex-shrink:0;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.gd-tabs::-webkit-scrollbar{display:none}
.gd-tab{padding:8px 14px;border-radius:10px;font-size:11px;font-weight:700;color:#80a8c0;background:rgba(0,240,255,.06);border:1px solid rgba(0,240,255,.15);cursor:pointer;user-select:none;white-space:nowrap;transition:all .2s;flex-shrink:0;-webkit-tap-highlight-color:transparent}
.gd-tab.on{background:linear-gradient(135deg,rgba(0,240,255,.2),rgba(255,59,168,.15));color:#e6f7ff;border-color:rgba(0,240,255,.4);box-shadow:0 0 10px rgba(0,240,255,.2)}
.gd-cards{flex:1;overflow-y:auto;padding:6px 12px 20px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.gd-cards::-webkit-scrollbar{display:none}
.gd-card{display:flex;align-items:center;gap:12px;padding:14px 12px;border-radius:14px;margin-bottom:8px;background:linear-gradient(135deg,rgba(20,5,35,.9),rgba(5,5,18,.9));border:1px solid rgba(0,240,255,.2);cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;transition:border-color .15s,box-shadow .15s}
.gd-card:active{border-color:rgba(0,240,255,.5);box-shadow:0 0 14px rgba(0,240,255,.2)}
.gd-ci{font-size:24px;width:36px;text-align:center;flex-shrink:0}
.gd-ct{flex:1;min-width:0}
.gd-ctitle{font-size:13px;font-weight:700;color:#e6f7ff;margin-bottom:3px}
.gd-cdesc{font-size:11px;color:#80c8ff;opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gd-cbadge{padding:2px 7px;font-size:9px;font-weight:800;border-radius:8px;background:rgba(0,240,255,.15);color:#00f0ff;border:1px solid rgba(0,240,255,.4);letter-spacing:.5px;display:inline-block;margin-bottom:4px}
.gd-cwhere{font-size:9px;color:#888899;margin-top:3px}
.gd-arr{font-size:18px;color:#445566;flex-shrink:0}
@keyframes gdSlide{from{transform:translateY(100%)}to{transform:translateY(0)}}
.gd-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9200;display:flex;align-items:flex-end;justify-content:center}
.gd-modal{width:100%;max-width:430px;background:linear-gradient(160deg,#100520,#050510);border-radius:20px 20px 0 0;border-top:1px solid rgba(0,240,255,.35);padding:22px 18px 36px;animation:gdSlide .22s ease;max-height:72vh;overflow-y:auto;scrollbar-width:none}
.gd-modal::-webkit-scrollbar{display:none}
.gd-modal-icon{font-size:34px;text-align:center;margin-bottom:10px}
.gd-modal-title{font-size:16px;font-weight:800;text-align:center;margin-bottom:14px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.gd-modal-badge{text-align:center;margin-bottom:12px}
.gd-modal-text{font-size:13px;color:#b0d0e8;line-height:1.75;white-space:pre-line}
.gd-modal-where{margin-top:14px;padding:8px 12px;border-radius:10px;background:rgba(0,240,255,.06);border:1px solid rgba(0,240,255,.2);font-size:11px;color:#60a8c0;text-align:center}
.gd-modal-close{margin-top:18px;width:100%;padding:13px;border-radius:12px;background:linear-gradient(135deg,rgba(0,240,255,.15),rgba(255,59,168,.1));border:1px solid rgba(0,240,255,.3);color:#00f0ff;font-size:13px;font-weight:700;text-align:center;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
.gd-modal-close:active{transform:scale(.97)}
`;

const GuideHTML = (() => {
  let _el = null, _scene = null;

  function _inject() {
    if (document.getElementById('gd-style')) return;
    const s = document.createElement('style');
    s.id = 'gd-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function _tap(el, cb) {
    let sy = 0;
    el.addEventListener('pointerdown', e => { sy = e.clientY; }, { passive: true });
    el.addEventListener('pointerup', e => {
      if (Math.abs(e.clientY - sy) > 10) return;
      e.stopPropagation(); cb();
    });
  }

  function _cardHTML(c) {
    const badge = c.badge ? `<div class="gd-cbadge">${c.badge}</div>` : '';
    const where = c.where ? `<div class="gd-cwhere">📍 ${c.where}</div>` : '';
    return `<div class="gd-card" data-key="${c.title}">
  <div class="gd-ci">${c.icon}</div>
  <div class="gd-ct">${badge}<div class="gd-ctitle">${c.title}</div><div class="gd-cdesc">${c.desc}</div>${where}</div>
  <div class="gd-arr">›</div>
</div>`;
  }

  function _showDetail(c) {
    const badge = c.badge ? `<div class="gd-modal-badge"><span class="gd-cbadge">${c.badge}</span></div>` : '';
    const where = c.where ? `<div class="gd-modal-where">📍 ${c.where}</div>` : '';
    const bd = document.createElement('div');
    bd.className = 'gd-backdrop';
    bd.innerHTML = `<div class="gd-modal">
  <div class="gd-modal-icon">${c.icon}</div>
  <div class="gd-modal-title">${c.title}</div>
  ${badge}
  <div class="gd-modal-text">${(c.detail || c.desc)}</div>
  ${where}
  <div class="gd-modal-close">Понятно ✓</div>
</div>`;
    document.body.appendChild(bd);
    const close = () => bd.remove();
    bd.addEventListener('pointerdown', e => { if (e.target === bd) close(); });
    bd.querySelector('.gd-modal-close').addEventListener('click', close);
    try { tg?.HapticFeedback?.selectionChanged(); } catch(_) {}
  }

  function _renderSection(cardsEl, key) {
    const cards = (typeof GUIDE_CARDS !== 'undefined' ? GUIDE_CARDS[key] : null) || [];
    cardsEl.innerHTML = cards.map(_cardHTML).join('');
    cardsEl.querySelectorAll('.gd-card').forEach((el, i) => {
      _tap(el, () => _showDetail(cards[i]));
    });
    cardsEl.scrollTop = 0;
  }

  function _build(scene) {
    const sections = (typeof GUIDE_SECTIONS !== 'undefined') ? GUIDE_SECTIONS : [];
    const firstKey = sections[0]?.key || 'battle';

    const el = document.createElement('div');
    el.className = 'gd-ov'; el.id = 'gd-root';
    el.innerHTML = `<div class="gd-inner">
  <div class="gd-hdr">
    <div class="gd-back" id="gd-back">‹</div>
    <div class="gd-title">📖 СПРАВКА</div>
  </div>
  <div class="gd-tabs">${sections.map(s =>
    `<div class="gd-tab${s.key===firstKey?' on':''}" data-sec="${s.key}">${s.icon} ${s.label}</div>`
  ).join('')}</div>
  <div class="gd-cards" id="gd-cards"></div>
</div>`;
    return el;
  }

  function _wire(el, scene) {
    _tap(el.querySelector('#gd-back'), () => {
      try { tg?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
      GuideHTML.close();
      try { scene.scene.start('Menu', { returnTab: 'more' }); } catch(_) {}
    });

    const cardsEl = el.querySelector('#gd-cards');
    let activeKey = null;

    const switchSec = (key) => {
      if (activeKey === key) return;
      activeKey = key;
      el.querySelectorAll('.gd-tab').forEach(t => {
        t.classList.toggle('on', t.dataset.sec === key);
      });
      _renderSection(cardsEl, key);
      try { tg?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    };

    el.querySelectorAll('.gd-tab').forEach(t => {
      _tap(t, () => switchSec(t.dataset.sec));
    });

    const sections = (typeof GUIDE_SECTIONS !== 'undefined') ? GUIDE_SECTIONS : [];
    switchSec(sections[0]?.key || 'battle');
  }

  async function _loadCatalogPrices(el) {
    try {
      const res = await get('/api/shop/catalog');
      if (!res?.ok || !res.items) return;
      const cat = res.items;
      const gc = GUIDE_CARDS;
      const potions = gc.items?.find(c => c.title === 'Зелья HP');
      if (potions && cat.hp_small && cat.hp_medium && cat.hp_full) {
        potions.detail = `Зелья HP — покупай в Магазине:\n• 🧪 Малое: ${cat.hp_small.desc} — ${cat.hp_small.price}${cat.hp_small.currency==='gold'?'🪙':'💎'}\n• 🧪 Среднее: ${cat.hp_medium.desc} — ${cat.hp_medium.price}${cat.hp_medium.currency==='gold'?'🪙':'💎'}\n• 🧪 Полное: ${cat.hp_full.desc} — ${cat.hp_full.price}${cat.hp_full.currency==='gold'?'🪙':'💎'}\n\nИспользуй между боями чтобы быстрее вернуться в строй.`;
      }
      const scrolls = gc.items?.find(c => c.title === 'Свитки статов');
      if (scrolls && cat.scroll_str_3) {
        scrolls.detail = `Свитки дают временный буст к стату:\n• За золото: +3 к стату на 1 бой — ${cat.scroll_str_3.price}🪙\n${cat.scroll_str_5_d?`• За алмазы: +5 на 3 боя — ${cat.scroll_str_5_d.price}💎\n`:''  }• За Stars/USDT: +7–10 на 5–7 боёв\n\nСтакаются! Можно накинуть силу + крит одновременно.`;
      }
    } catch (_) {}
  }

  return {
    show(scene) {
      if (_el) return;
      _scene = scene;
      _inject();
      _el = _build(scene);
      document.body.appendChild(_el);
      _wire(_el, scene);
      _loadCatalogPrices(_el);
    },
    close() {
      if (!_el) return;
      _el.remove(); _el = null; _scene = null;
    },
    isOpen() { return !!_el; },
  };
})();

window.GuideHTML = GuideHTML;
})();
