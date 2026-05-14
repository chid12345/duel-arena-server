/* ============================================================
   BoxRevealCard — единая киберпанк-карточка «что выпало»
   Используется из инвентаря, профиля и магазина.
   window.BoxRevealCard.show(items, opts)
   opts: { title, subtitle, boxId, onClose, okLabel }
   ============================================================ */
(() => {
const _ID = 'brc-wrap';

const _BOX_IMG = {
  box_common: 'chest_gold.png',
  box_rare: 'chest_diamond.png', box_rare_c: 'chest_diamond.png',
  box_epic_e2: 'chest_epic.png', box_epic_e3: 'chest_epic.png',
  wb_gold_chest: 'chest_gold.png', wb_diamond_chest: 'chest_diamond.png',
  prem_box: 'prem_box.png',
};

function _rar(id) {
  if (!id) return 'common';
  const s = String(id).toLowerCase();
  if (s.includes('titan') || s.includes('_500') || s === '_premium') return 'legendary';
  if (s.includes('_12') || s.includes('usdt') || s.includes('epic')) return 'epic';
  if (s.includes('_9') || s.includes('_6') || s === '_diamonds' || s.includes('diamond')) return 'rare';
  return 'common';
}

const _RCFG = {
  legendary: { nameCol: '#ffcc44', badge: 'ЛЕГЕНДАРНОЕ', star: '⭐', lucky: '🔥 везунчик!' },
  epic:      { nameCol: '#cc88ff', badge: 'ЭПИЧЕСКОЕ',   star: '',   lucky: '⚡ круто!'    },
  rare:      { nameCol: '#88bbff', badge: 'РЕДКОЕ',       star: '',   lucky: '✨ удача!'    },
  common:    { nameCol: '#c8d8f0', badge: 'ОБЫЧНОЕ',      star: '',   lucky: null          },
};

const _CSS = `
@keyframes brc-pop{from{opacity:0;transform:scale(.72) translateY(18px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes brc-bd{from{opacity:0}to{opacity:1}}
@keyframes brc-row{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}
#${_ID}{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;
  padding:14px;background:rgba(0,0,0,.9);animation:brc-bd .2s ease;backdrop-filter:blur(6px)}
#${_ID}::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,245,255,.012) 3px 4px)}
.brc-card{position:relative;z-index:1;width:100%;max-width:350px;
  background:linear-gradient(180deg,#0d0e20 0%,#080914 100%);border-radius:18px;overflow:hidden;
  animation:brc-pop .38s cubic-bezier(.34,1.3,.64,1) both}
.brc-card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--brc-accent,#00f5ff),transparent)}
.brc-card.is-gold{--brc-accent:#ffd700;
  border:1.5px solid rgba(255,215,0,.4);box-shadow:0 0 40px rgba(255,200,0,.1),0 4px 40px rgba(0,0,0,.6)}
.brc-card.is-cyan{--brc-accent:#00f5ff;
  border:1.5px solid rgba(0,245,255,.28);box-shadow:0 0 40px rgba(0,245,255,.08),0 4px 40px rgba(0,0,0,.6)}
.brc-head{display:flex;flex-direction:column;align-items:center;padding:20px 16px 12px;position:relative}
.brc-glow-orb{position:absolute;top:16px;width:80px;height:80px;border-radius:50%;
  filter:blur(30px);opacity:.5;pointer-events:none}
.brc-box-img{width:68px;height:68px;object-fit:contain;position:relative;z-index:1;
  filter:drop-shadow(0 0 14px rgba(255,215,0,.55)) drop-shadow(0 2px 8px rgba(0,0,0,.7))}
.brc-title{margin-top:10px;font-size:14px;font-weight:800;letter-spacing:2px;
  color:var(--brc-accent,#00f5ff);text-shadow:0 0 18px rgba(0,245,255,.55);text-transform:uppercase;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.brc-sub{font-size:9px;color:rgba(200,220,255,.4);letter-spacing:1px;text-transform:uppercase;
  margin-top:3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.brc-div{height:1px;margin:0 16px;
  background:linear-gradient(90deg,transparent,rgba(0,245,255,.18),transparent)}
.brc-list{padding:10px 12px 6px;display:flex;flex-direction:column;gap:6px;
  max-height:55vmax;overflow-y:auto;scrollbar-width:none}
.brc-list::-webkit-scrollbar{display:none}
.brc-row{position:relative;display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:11px;
  animation:brc-row .26s ease both;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
@keyframes brc-lck{0%,100%{opacity:.55;filter:brightness(.95)}50%{opacity:1;filter:brightness(1.45) drop-shadow(0 0 6px currentColor)}}
.brc-lck{position:absolute;top:-6px;right:10px;font-size:8px;font-weight:900;letter-spacing:1.2px;padding:2px 6px;border-radius:4px;text-transform:uppercase;animation:brc-lck 1s ease-in-out infinite;line-height:1.2;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;z-index:2}
.brc-lck.r-rare{background:#0a1538;color:#9cc8ff;border:1px solid rgba(136,187,255,.55)}
.brc-lck.r-epic{background:#1a0840;color:#d9a8ff;border:1px solid rgba(204,136,255,.55)}
.brc-lck.r-legendary{background:#3a1a00;color:#ffd766;border:1px solid rgba(255,200,80,.6)}
.brc-row.r-common{background:rgba(255,255,255,.04);border:1px solid rgba(0,245,255,.1)}
.brc-row.r-rare{background:rgba(10,40,120,.25);border:1px solid rgba(68,136,255,.35);
  box-shadow:0 0 8px rgba(68,136,255,.1) inset}
.brc-row.r-epic{background:rgba(90,20,160,.22);border:1px solid rgba(180,79,255,.38);
  box-shadow:0 0 10px rgba(180,79,255,.12) inset}
.brc-row.r-legendary{background:rgba(160,60,0,.22);border:1px solid rgba(255,140,0,.45);
  box-shadow:0 0 12px rgba(255,140,0,.16) inset}
.brc-ico{font-size:26px;flex-shrink:0;width:32px;text-align:center;line-height:1}
.brc-txt{flex:1;min-width:0}
.brc-name{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}
.brc-desc{font-size:10px;color:rgba(180,200,255,.42);margin-top:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.brc-badge{font-size:7.5px;font-weight:700;letter-spacing:.4px;padding:2px 5px;
  border-radius:4px;flex-shrink:0;line-height:1.4;text-transform:uppercase;white-space:nowrap}
.brc-badge.r-common{background:rgba(0,245,255,.09);color:rgba(0,245,255,.55)}
.brc-badge.r-rare{background:rgba(68,136,255,.18);color:#88bbff}
.brc-badge.r-epic{background:rgba(180,79,255,.18);color:#cc88ff}
.brc-badge.r-legendary{background:rgba(255,140,0,.2);color:#ffcc44}
.brc-foot{padding:10px 12px 14px;border-top:1px solid rgba(255,255,255,.05);
  display:flex;flex-direction:column;align-items:center;gap:8px}
.brc-hint{font-size:9px;color:rgba(0,200,255,.32);letter-spacing:.3px;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.brc-ok{width:100%;padding:12px;border-radius:11px;border:none;cursor:pointer;
  font-size:13px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;transition:filter .15s,transform .12s}
.brc-ok:active{transform:scale(.96);filter:brightness(.85)}
.brc-ok.gold{background:linear-gradient(135deg,#9a5f00,#e8a800,#ffd700);color:#180e00;
  box-shadow:0 0 16px rgba(255,215,0,.3)}
.brc-ok.cyan{background:linear-gradient(135deg,#003348,#0099cc,#00f5ff);color:#001520;
  box-shadow:0 0 16px rgba(0,245,255,.22)}
`;

function _injectCSS() {
  if (document.getElementById('brc-css')) return;
  const s = document.createElement('style'); s.id = 'brc-css';
  s.textContent = _CSS; document.head.appendChild(s);
}

window.BoxRevealCard = {
  show(items, opts = {}) {
    console.log('[BoxRevealCard] show called, items:', items?.length, 'opts:', opts);
    _injectCSS();
    document.getElementById(_ID)?.remove();

    const {
      title   = 'ИЗ ЯЩИКА ВЫПАЛО',
      subtitle = null,
      boxId   = null,
      onClose = null,
      okLabel = '✅ Отлично!',
    } = opts;

    const arr = items || [];
    const topRar = arr.reduce((best, it) => {
      const order = { legendary: 3, epic: 2, rare: 1, common: 0 };
      const r = _rar(it.item_id);
      return order[r] > order[best] ? r : best;
    }, 'common');

    const isGold  = topRar === 'legendary' || topRar === 'epic';
    const glowCol = topRar === 'legendary' ? '#ff8800' : topRar === 'epic' ? '#9944cc'
                  : topRar === 'rare' ? '#2266cc' : '#00bcd4';
    const imgSrc  = _BOX_IMG[boxId] || 'chest_gold.png';
    const cnt     = arr.length > 1 ? ` (${arr.length})` : '';
    const subHtml = subtitle ? `<div class="brc-sub">${subtitle}</div>` : '';

    const rowsHtml = arr.slice(0, 8).map((it, i) => {
      const r = _rar(it.item_id);
      const cfg = _RCFG[r];
      const star = cfg.star ? `<span style="font-size:13px;flex-shrink:0">${cfg.star}</span>` : '';
      const desc = it.desc ? `<div class="brc-desc">${it.desc}</div>` : '';
      // Для ящиков-наград (из премиум-ящика, ивентов и т.п.) подставляем PNG
      // как в магазине вместо тусклой эмодзи 📦.
      const rowIco = (window.BoxIcons && window.BoxIcons.imageFor(it.item_id))
        ? window.BoxIcons.htmlIcon(it.item_id, it.icon || '🎁', 28)
        : (it.icon || '🎁');
      const lck = cfg.lucky ? `<div class="brc-lck r-${r}">${cfg.lucky}</div>` : '';
      return `<div class="brc-row r-${r}" style="animation-delay:${80 + i * 55}ms">
        ${lck}
        <span class="brc-ico">${rowIco}</span>
        <div class="brc-txt">
          <div class="brc-name" style="color:${cfg.nameCol}">${it.name || it.item_id || '?'}</div>
          ${desc}
        </div>
        <span class="brc-badge r-${r}">${cfg.badge}</span>${star}
      </div>`;
    }).join('');

    const moreHtml = arr.length > 8
      ? `<div style="text-align:center;font-size:10px;color:rgba(255,255,255,.28);padding:4px 0">
           ... и ещё ${arr.length - 8} предмет(ов)</div>`
      : '';

    const wrap = document.createElement('div'); wrap.id = _ID;
    wrap.innerHTML = `
<div class="brc-card ${isGold ? 'is-gold' : 'is-cyan'}">
  <div class="brc-head">
    <div class="brc-glow-orb" style="background:${glowCol}"></div>
    <img class="brc-box-img" src="${imgSrc}" alt="box">
    <div class="brc-title">${title}${cnt}</div>
    ${subHtml}
  </div>
  <div class="brc-div"></div>
  <div class="brc-list">${rowsHtml || '<div style="padding:14px;text-align:center;color:rgba(255,255,255,.28)">Награда выдана</div>'}${moreHtml}</div>
  <div class="brc-foot">
    <div class="brc-hint">→ всё добавлено в инвентарь</div>
    <button class="brc-ok ${isGold ? 'gold' : 'cyan'}" id="brc-ok">${okLabel}</button>
  </div>
</div>`;
    document.body.appendChild(wrap);

    const _close = () => {
      wrap.remove();
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success'); } catch(_) {}
      if (typeof onClose === 'function') onClose();
    };
    document.getElementById('brc-ok')?.addEventListener('click', _close);
    wrap.addEventListener('click', e => { if (e.target === wrap) _close(); });
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('medium'); } catch(_) {}
  },
};
})();
