/* ============================================================
   InvBoxesHtml — DOM-карточки ящиков во вкладке «Особые»
   Заменяет Phaser-карточки на HTML с PNG и киберпанк-стилем.
   InvBoxesHtml.show(items, yPx, hPx, onOpen)
   InvBoxesHtml.hide()
   ============================================================ */
(() => {
const _ID = 'ibh-list';

const _CFG = {
  box_common:      { img:'chest_gold.png',    bc:'#e8a800', gc:'rgba(232,168,0,.22)',  tier:'ЗОЛОТО',    nc:'#ffe080', fi:'📦' },
  box_rare:        { img:'chest_diamond.png', bc:'#00c8ff', gc:'rgba(0,200,255,.18)',  tier:'АЛМАЗЫ',    nc:'#80ddff', fi:'🟦' },
  box_rare_c:      { img:'chest_diamond.png', bc:'#b44fff', gc:'rgba(180,79,255,.18)', tier:'АЛМАЗЫ+',   nc:'#cc88ff', fi:'🟪' },
  box_epic_e2:     { img:'chest_epic.png',    bc:'#00ff88', gc:'rgba(0,255,136,.18)',  tier:'USDT',      nc:'#80ffbb', fi:'🔮' },
  box_epic_e3:     { img:'chest_epic.png',    bc:'#00ff88', gc:'rgba(0,255,136,.18)',  tier:'USDT',      nc:'#80ffbb', fi:'⚔️' },
  wb_gold_chest:   { img:'chest_gold.png',    bc:'#e8a800', gc:'rgba(232,168,0,.18)',  tier:'РЕЙД 🏆',  nc:'#ffe080', fi:'🏆' },
  wb_diamond_chest:{ img:'chest_diamond.png', bc:'#00c8ff', gc:'rgba(0,200,255,.15)',  tier:'РЕЙД 💠',  nc:'#80ddff', fi:'💠' },
};

function _cfg(id) {
  return _CFG[id] || { img:null, bc:'rgba(0,245,255,.4)', gc:'rgba(0,245,255,.1)', tier:'', nc:'#c8d8f0', fi:'🎁' };
}

function _btnCls(bc) {
  if (bc.includes('255,136')) return 'ibh-g';
  if (bc.includes('79,255') || bc.includes('44fff')) return 'ibh-p';
  if (bc.includes('200,255') || bc.includes('c8ff')) return 'ibh-c';
  return 'ibh-a';
}

/* Иконка: сначала PNG через BoxIcons, потом img напрямую, потом эмодзи */
function _iconHtml(it, c) {
  // BoxIcons уже знает все ящики и умеет показывать с emoji-fallback
  if (window.BoxIcons) {
    return window.BoxIcons.htmlIcon(it.item_id, c.fi || '📦', 64);
  }
  if (c.img) {
    return `<img style="width:64px;height:64px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 0 10px ${c.bc})" src="${c.img}" alt="" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><span style="display:none;width:64px;height:64px;font-size:38px;align-items:center;justify-content:center;flex-shrink:0">${c.fi}</span>`;
  }
  return `<span style="width:64px;height:64px;font-size:38px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${c.fi}</span>`;
}

const CSS = `
#${_ID}{position:fixed;left:0;right:0;overflow-y:auto;overflow-x:hidden;z-index:200;
  padding:4px 8px 12px;scrollbar-width:none}
#${_ID}::-webkit-scrollbar{display:none}
.ibh-card{display:flex;align-items:center;gap:10px;padding:10px;
  border-radius:12px;margin-bottom:6px;border:1.5px solid;
  background:rgba(8,9,26,.97);backdrop-filter:blur(6px);
  transition:transform .12s,box-shadow .18s}
.ibh-card:active{transform:scale(.975)}
.ibh-info{flex:1;min-width:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.ibh-tier{font-size:7.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px}
.ibh-name{font-size:12px;font-weight:700;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ibh-desc{font-size:9px;color:rgba(180,210,255,.45);margin-top:2px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ibh-r{display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0}
.ibh-qty{font-size:12px;font-weight:800;color:rgba(255,255,255,.55);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.ibh-btn{padding:8px 14px;border-radius:8px;border:none;cursor:pointer;
  font-size:11px;font-weight:800;letter-spacing:.4px;white-space:nowrap;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  transition:filter .15s,transform .12s}
.ibh-btn:active{transform:scale(.92);filter:brightness(.82)}
.ibh-a{background:linear-gradient(135deg,#6a3c00,#c47808,#ffd700);color:#1a0e00;
  box-shadow:0 0 10px rgba(255,215,0,.22)}
.ibh-c{background:linear-gradient(135deg,#002a40,#005880,#00c8ff);color:#001520;
  box-shadow:0 0 10px rgba(0,200,255,.18)}
.ibh-p{background:linear-gradient(135deg,#1e0040,#7a18c8,#b44fff);color:#10001e;
  box-shadow:0 0 10px rgba(180,79,255,.18)}
.ibh-g{background:linear-gradient(135deg,#003820,#007840,#00ff88);color:#001408;
  box-shadow:0 0 10px rgba(0,255,136,.18)}
.ibh-empty{padding:28px 0;text-align:center;color:rgba(0,245,255,.3);font-size:12px;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
`;

window.InvBoxesHtml = {
  show(items, yPx, hPx, onOpen) {
    if (!document.getElementById('ibh-css')) {
      const s = document.createElement('style'); s.id = 'ibh-css';
      s.textContent = CSS; document.head.appendChild(s);
    }
    let el = document.getElementById(_ID);
    if (!el) { el = document.createElement('div'); el.id = _ID; document.body.appendChild(el); }
    el.style.top    = `${yPx}px`;
    el.style.height = `${hPx}px`;

    const meta = (window.INVENTORY_META || {}).ITEM_META || {};
    const html = (items || []).map(it => {
      const c  = _cfg(it.item_id);
      const m  = meta[it.item_id] || { name: it.item_id, desc: '', icon: c.fi || '📦' };
      const bc = _btnCls(c.bc);
      const iconHtml = _iconHtml(it, { ...c, fi: m.icon || c.fi || '📦' });
      return `<div class="ibh-card" style="border-color:${c.bc};box-shadow:0 0 16px ${c.gc},inset 0 0 10px ${c.gc}">
        ${iconHtml}
        <div class="ibh-info">
          <div class="ibh-tier" style="color:${c.bc}">${c.tier}</div>
          <div class="ibh-name" style="color:${c.nc}">${m.name}</div>
          <div class="ibh-desc">${m.desc || ''}</div>
        </div>
        <div class="ibh-r">
          <div class="ibh-qty">×${it.quantity || 1}</div>
          <button class="ibh-btn ${bc}" data-iid="${it.item_id}">🎲 Открыть</button>
        </div>
      </div>`;
    }).join('');

    el.innerHTML = html || '<div class="ibh-empty">Нет ящиков · загляни в Магазин</div>';
    el.querySelectorAll('.ibh-btn[data-iid]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof onOpen === 'function') onOpen(btn.dataset.iid);
      });
    });
  },

  hide() { document.getElementById(_ID)?.remove(); },
};
})();
