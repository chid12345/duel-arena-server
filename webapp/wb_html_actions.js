/* wb_html_actions.js — модальные панели боевых действий:
   свитки рейда (применить в слот), буст-шоп (купить).
   Расширяет window.WBHtml */
(() => {
  const CSS_A = `
.wb-picker-ov{position:fixed;inset:0;z-index:9998;display:flex;align-items:flex-end;justify-content:center;
  background:rgba(0,0,0,.6);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .2s;}
.wb-picker-ov.open{opacity:1;pointer-events:all;}
.wb-picker{width:100%;max-width:390px;border-radius:22px 22px 0 0;overflow:hidden;
  background:linear-gradient(180deg,#14003a 0%,#06030f 100%);
  border:1px solid rgba(255,0,200,.35);border-bottom:none;
  box-shadow:0 -10px 60px rgba(255,0,200,.18);padding:0 0 16px;
  transform:translateY(100%);transition:transform .3s cubic-bezier(.32,1.2,.5,1);}
.wb-picker-ov.open .wb-picker{transform:translateY(0);}
.wb-picker-hdl{display:flex;justify-content:center;padding:10px 0 6px;}
.wb-picker-hdl::before{content:"";width:36px;height:4px;border-radius:2px;background:rgba(255,0,200,.35);}
.wb-picker-title{font-size:13px;font-weight:900;letter-spacing:1px;color:#fff;text-align:center;padding:0 18px 12px;
  border-bottom:1px solid rgba(255,0,200,.1);}
.wb-picker-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 14px 0;}
.wb-picker-item{padding:12px 10px;border-radius:12px;cursor:pointer;text-align:center;
  background:linear-gradient(135deg,rgba(20,0,38,.97),rgba(5,4,18,.97));
  border:1px solid rgba(255,0,200,.25);transition:all .2s;}
.wb-picker-item:hover,.wb-picker-item:active{border-color:rgba(255,0,200,.6);box-shadow:0 0 16px rgba(255,0,200,.2);}
.wb-picker-item.wide{grid-column:1/-1;}
.wpi-ic{font-size:22px;margin-bottom:4px;filter:drop-shadow(0 0 5px rgba(255,0,200,.5));}
.wpi-nm{font-size:9px;font-weight:800;letter-spacing:.8px;color:#cc88ff;margin-bottom:2px;}
.wpi-vl{font-size:16px;font-weight:900;color:#ff00cc;text-shadow:0 0 8px currentColor;}
.wpi-pr{font-size:12px;font-weight:900;color:#ffdd44;text-shadow:0 0 6px rgba(255,210,0,.4);margin-top:3px;}
.wpi-ow{font-size:9px;font-weight:800;color:#00e5ff;margin-top:2px;}
.wb-picker-empty{padding:28px;text-align:center;font-size:11px;color:#445;letter-spacing:1px;}
.wb-picker-slots{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 14px 0;}
.wb-slot{padding:10px;border-radius:12px;cursor:pointer;text-align:center;
  background:rgba(0,10,30,.8);border:1px solid rgba(0,229,255,.2);transition:all .2s;}
.wb-slot.filled{border-color:rgba(255,0,200,.4);background:rgba(30,0,50,.9);}
.wb-slot-lbl{font-size:8px;font-weight:800;letter-spacing:1.5px;color:#336;margin-bottom:5px;}
.wb-slot.filled .wb-slot-lbl{color:#ff00cc;}
.wb-slot-val{font-size:13px;font-weight:900;color:#aaaacc;}
.wb-slot.filled .wb-slot-val{color:#fff;}
`;

  const SCROLL_META = [
    { id:'damage_25',  icon:'⚔️', name:'УРОН',   val:'+25%', price:'60 🪙' },
    { id:'power_10',   icon:'🐲', name:'УРОН',   val:'+10%', price:'30 🪙' },
    { id:'defense_20', icon:'🛡️', name:'ЗАЩИТА', val:'+20%', price:'45 🪙' },
    { id:'dodge_10',   icon:'💨', name:'УВОРОТ', val:'+10%', price:'35 🪙' },
    { id:'crit_10',    icon:'🎯', name:'КРИТ',   val:'+10%', price:'40 🪙' },
  ];

  function _injectCSS() {
    if (document.getElementById('wb-style-a')) return;
    const s = document.createElement('style'); s.id = 'wb-style-a'; s.textContent = CSS_A;
    document.head.appendChild(s);
  }

  function _makePicker(titleHTML, bodyHTML, onClose) {
    _injectCSS();
    document.getElementById('wb-picker-ov')?.remove();
    const ov = document.createElement('div'); ov.id = 'wb-picker-ov'; ov.className = 'wb-picker-ov';
    ov.innerHTML = `<div class="wb-picker"><div class="wb-picker-hdl"></div><div class="wb-picker-title">${titleHTML}</div>${bodyHTML}</div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 250); if (onClose) onClose(); };
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    return { ov, close };
  }

  /* ── Свитки рейда: выбрать свиток → применить в слот ── */
  function _htmlScrollPicker(s, sc) {
    const inv = s.raid_scrolls_inv || {};
    const ps  = s.player_state || {};
    const avail = SCROLL_META.filter(m => (inv[m.id] || 0) > 0);

    if (!avail.length) {
      window.WBHtml.toast('📦 Нет свитков рейда — купи в лобби');
      return;
    }

    // Показываем текущие слоты
    const slot1 = ps.raid_scroll_1, slot2 = ps.raid_scroll_2;
    const slotsHTML = `
      <div class="wb-picker-slots">
        <div class="wb-slot${slot1?' filled':''}" id="wbs-slot1">
          <div class="wb-slot-lbl">СЛОТ 1</div>
          <div class="wb-slot-val">${slot1 || '+ пусто'}</div>
        </div>
        <div class="wb-slot${slot2?' filled':''}" id="wbs-slot2">
          <div class="wb-slot-lbl">СЛОТ 2</div>
          <div class="wb-slot-val">${slot2 || '+ пусто'}</div>
        </div>
      </div>`;

    const itemsHTML = avail.map((m, i) =>
      `<div class="wb-picker-item${i===avail.length-1&&avail.length%2?' wide':''}" data-sid="${m.id}">
        <div class="wpi-ic">${m.icon}</div>
        <div class="wpi-nm">${m.name}</div>
        <div class="wpi-vl">${m.val}</div>
        <div class="wpi-ow">×${inv[m.id]} в запасе</div>
      </div>`).join('');

    const { ov, close } = _makePicker('📜 ВЫБЕРИ СВИТОК', slotsHTML + `<div class="wb-picker-grid">${itemsHTML}</div>`);

    let _selectedScroll = null;
    ov.querySelectorAll('[data-sid]').forEach(el => el.addEventListener('click', () => {
      _selectedScroll = el.dataset.sid;
      ov.querySelectorAll('[data-sid]').forEach(x => x.style.borderColor = '');
      el.style.borderColor = '#ff00cc';
      el.style.boxShadow = '0 0 16px rgba(255,0,200,.4)';
    }));

    // Клик на слот = применить выбранный свиток
    [['wbs-slot1',1],['wbs-slot2',2]].forEach(([id,slot]) => {
      ov.querySelector('#'+id)?.addEventListener('click', () => {
        if (!_selectedScroll) { window.WBHtml.toast('Сначала выбери свиток'); return; }
        sc?._useScroll?.(_selectedScroll, slot);
        close();
      });
    });
  }

  /* ── Буст-шоп: купить свиток рейда ── */
  function _htmlBoostShop(s, sc) {
    const inv = s.raid_scrolls_inv || {};
    const itemsHTML = SCROLL_META.map((m, i) => {
      const qty = inv[m.id] || 0;
      const wide = i === SCROLL_META.length - 1 && SCROLL_META.length % 2 === 1;
      return `<div class="wb-picker-item${wide?' wide':''}" data-bid="${m.id}">
        <div class="wpi-ic">${m.icon}</div>
        <div class="wpi-nm">${m.name}</div>
        <div class="wpi-vl">${m.val}</div>
        <div class="wpi-pr">${m.price}</div>
        <div class="wpi-ow">×${qty} в запасе</div>
      </div>`;
    }).join('');

    const { ov, close } = _makePicker('⚡ КУПИТЬ БУСТ', `<div class="wb-picker-grid">${itemsHTML}</div>`);

    ov.querySelectorAll('[data-bid]').forEach(el => el.addEventListener('click', () => {
      sc?._buyScroll?.(el.dataset.bid);
      close();
    }));
  }

  Object.assign(window.WBHtml, { _htmlScrollPicker, _htmlBoostShop });
})();
