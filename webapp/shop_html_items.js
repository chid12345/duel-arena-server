/* ═══════════════════════════════════════════════════════════
   Shop HTML Items — данные товаров + карточки + покупка
   ═══════════════════════════════════════════════════════════ */
(() => {
// [id, icon, name, price, currency, desc, badge, risk]
const DATA = {
  consumables: [
    ['hp_full',     '⚗️','Зелье HP',          35, 'gold',    'Полное HP',               null,   false],
    ['xp_boost_5',  '⚡','XP Буст ×1.5',     60, 'gold',    '5 боёв → инвентарь',      '5 БОЁВ',false],
    ['xp_boost_20', '⚡','XP Буст ×1.5',      8, 'diamonds','20 боёв → инвентарь',     '20 БОЁВ',false],
    ['xp_boost_x2', '🚀','XP Буст ×2.0',      6, 'diamonds','10 боёв → инвентарь',    '10 БОЁВ',false],
    ['gold_hunt',   '💰','Охота за золотом',   5, 'diamonds','+20% золото · 24ч',      '24 ЧАСА',false],
    ['xp_hunt',     '📚','Охота за опытом',    8, 'diamonds','+50% опыта · 24ч',       '24 ЧАСА',false],
  ],
  scrolls: [
    ['scroll_str_3',    '⚔️','Эликсир силы +3',     20, 'gold',   'Сила +3 · 1 бой',         '1 БОЙ', false],
    ['scroll_end_3',    '🌀','Эликс. ловкости +3',   20, 'gold',   'Ловкость +3 · 1 бой',     '1 БОЙ', false],
    ['scroll_crit_3',   '🎯','Эликсир интуиции +3',  20, 'gold',   'Интуиция +3 · 1 бой',     '1 БОЙ', false],
    ['scroll_hp_100',   '❤️','Эликсир HP +100',      20, 'gold',   '+100 HP · 1 бой',          '1 БОЙ', false],
    ['scroll_armor_6',  '🛡️','Свиток брони 6%',      28, 'gold',   'Броня +6% · 1 бой',       '1 БОЙ', false],
    ['scroll_warrior',  '⚔️','Комбо Воина',          40, 'gold',   'Сила+2, Ловк+2 · 1 бой',  '1 БОЙ', false],
    ['scroll_shadow',   '🌑','Комбо Тени',            50, 'gold',   'Ловк+3, Уворот+3% · 1 бой','1 БОЙ', false],
    ['scroll_fury',     '💥','Комбо Ярости',          60, 'gold',   'Сила+4, Крит+2 · 1 бой',  '1 БОЙ', false],
    ['scroll_vampire_g','🩸','Свиток Вампира',        75, 'gold',   'Вампиризм 9% · 1 бой',    '1 БОЙ', false],
    ['scroll_str_6',    '⚔️','Эликсир силы +6',       6, 'diamonds','Сила +6 · 3 боя',          '3 БОЯ', false],
    ['scroll_end_6',    '🌀','Эликс. ловкости +6',    6, 'diamonds','Ловкость +6 · 3 боя',     '3 БОЯ', false],
    ['scroll_crit_6',   '🎯','Эликсир интуиции +6',   6, 'diamonds','Интуиция +6 · 3 боя',     '3 БОЯ', false],
    ['scroll_dodge_5',  '💨','Свиток уворота 5%',      6, 'diamonds','Уворот +5% · 3 боя',      '3 БОЯ', false],
    ['scroll_hp_200',   '❤️','Эликсир HP +200',        6, 'diamonds','+200 HP · 3 боя',          '3 БОЯ', false],
    ['scroll_accuracy', '🎯','Точность +15%',           6, 'diamonds','Точность +15% · 3 боя',   '3 БОЯ', false],
    ['scroll_armor_10', '🛡️','Свиток брони 10%',       8, 'diamonds','Броня +10% · 3 боя',      '3 БОЯ', false],
    ['scroll_double_10','⚡','Двойной удар +10%',      10, 'diamonds','Двойной удар +10% · 3 боя','3 БОЯ', false],
    ['scroll_all_4',    '✨','Все пассивки +4',        10, 'diamonds','Все статы +4 · 1 бой',    '1 БОЙ', false],
    ['scroll_bastion',  '🏰','Бастион',                12, 'diamonds','Ловк+5, Броня+8% · 3 боя','3 БОЯ', false],
    ['scroll_predator', '🐍','Хищник',                 12, 'diamonds','Крит+5, Двойн+8% · 3 боя','3 БОЯ', false],
    ['scroll_vampire_d','🧛','Свиток Вампира+',        12, 'diamonds','Вампиризм 15% · 3 боя',   '3 БОЯ', false],
    ['scroll_berserker','🔥','Берсерк',                15, 'diamonds','Сила+8, Броня-5% · 3 боя','3 БОЯ', true],
  ],
  boxes: [
    ['exchange_small', 'img:exchange.png','5💎 → 450🪙',     5,  'diamonds','Обмен алмазы → золото', null, false],
    ['exchange_medium','img:exchange.png','15💎 → 1400🪙',   15,  'diamonds','Лучший курс',            null, false],
    ['exchange_large', 'img:exchange.png','50💎 → 5000🪙',   50,  'diamonds','Максимальный курс',      null, false],
    ['stat_reset',     '🔄','Сброс статов',       75, 'diamonds','Сброс всех статов',     null,   false],
    ['box_common',  'img:chest_gold.png',   'Обычный ящик',  150, 'gold',    '2–4 золотых свитка · 5% алмазный свиток · 3% +10–20💎', null, false],
    ['box_rare',    'img:chest_diamond.png','Редкий ящик',    20,  'diamonds','3–6 алмазных свитков · 5% USDT-свиток · 3% +100💎 · 5% Premium 3 дн.', null, false],
    ['box_rare_c',  'img:chest_diamond.png','Редкий ящик+',   30,  'diamonds','2 гарант. алмазных + 0–4 бонус · 5% USDT-свиток · 5% +200💎 · 5% Premium 3 дн.', null, false],
  ],
};

let _inv = {};

function _rarity(cur, price, risk) {
  if (risk) return 'e';
  if (cur === 'diamonds' && price >= 35) return 'e';
  if (cur === 'diamonds') return 'r';
  if (cur === 'gold' && price >= 60) return 'r';
  return 'c';
}

function _badgeClass(badge) {
  if (!badge) return '';
  if (badge.includes('БОЙ')) return 'b-bat';
  if (badge.includes('БОЯ') || badge.includes('БОЁВ')) return 'b-dur';
  if (badge.includes('ЧАС')) return 'b-day';
  return 'b-dur';
}

function _btnClass(cur) {
  return cur === 'diamonds' ? 'btn-d' : 'btn-g';
}

function _priceClass(cur) {
  return cur === 'diamonds' ? 'pv-d' : 'pv-g';
}

function _priceIcon(cur) {
  return cur === 'diamonds' ? '💎' : '🪙';
}

// Зелье HP — цена динамическая (растёт с max_hp). Берём реальную из API (heal_potion_price),
// иначе на карточке висели бы статичные 35🪙, а списывалось бы 15…150🪙.
function _effPrice(id, price) {
  if (id === 'hp_full') {
    const dyn = (typeof State !== 'undefined' && State.player && State.player.heal_potion_price) || 0;
    if (dyn > 0) return dyn;
  }
  return price;
}

function _icoHtml(icon, size) {
  if (icon && icon.startsWith('img:')) {
    return `<img src="${icon.slice(4)}" style="width:${size}px;height:${size}px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(255,200,80,.35))">`;
  }
  return icon;
}

function _cardHTML(item) {
  const [id, icon, name, , cur, desc, badge, risk] = item;
  const price = _effPrice(id, item[3]);
  const r = _rarity(cur, price, risk);
  const qty = _inv[id] || 0;
  const badgeCls = badge ? `<span class="sh-bdg ${_badgeClass(badge)}">${badge}</span>` : '';
  const riskBdg  = risk  ? `<span class="sh-bdg b-risk">⚠ РИСК</span>` : '';
  const invBdg   = qty   ? `<div class="sh-inv-cnt">×${qty}</div>` : '';
  return `
<div class="sh-card r-${r}" data-buy="${id}">
  <div class="sh-diode d-${r}"></div>
  ${invBdg}
  <div class="sh-ico">${_icoHtml(icon, 34)}</div>
  <div class="sh-nm">${name}</div>
  <div class="sh-ds">${desc}</div>
  ${riskBdg}${badgeCls}
  <div class="sh-pr"><span class="sh-pr-ico">${_priceIcon(cur)}</span><span class="sh-pr-v ${_priceClass(cur)}">${price}</span></div>
  <button class="sh-btn ${_btnClass(cur)}">КУПИТЬ</button>
</div>`;
}

window.ShopHtmlItems = {
  _setInv(inventory) {
    _inv = {};
    for (const e of inventory) _inv[e.item_id] = e.quantity || 0;
    // Обновляем бейджи инвентаря в DOM
    const r = document.getElementById('shop-html-ov'); if (!r) return;
    for (const [id] of [...DATA.consumables, ...DATA.scrolls, ...DATA.boxes]) {
      const card = r.querySelector(`[data-buy="${id}"]`); if (!card) continue;
      let badge = card.querySelector('.sh-inv-cnt');
      const qty = _inv[id] || 0;
      if (qty > 0 && !badge) {
        badge = document.createElement('div'); badge.className = 'sh-inv-cnt';
        card.appendChild(badge);
      }
      if (badge) badge.textContent = qty > 0 ? `×${qty}` : '';
    }
  },

  _panelHTML(tab) {
    const items = DATA[tab];
    if (tab === 'consumables') {
      const gold = items.filter(i => i[4] === 'gold');
      const dia  = items.filter(i => i[4] === 'diamonds');
      return `<div class="sh-sec">🧪 Зелья HP и бусты</div><div class="sh-grid">${gold.map(_cardHTML).join('')}</div>`
           + `<div class="sh-sec">💎 За алмазы</div><div class="sh-grid">${dia.map(_cardHTML).join('')}</div>`;
    }
    if (tab === 'scrolls') {
      const gold = items.filter(i => i[4] === 'gold');
      const dia  = items.filter(i => i[4] === 'diamonds');
      return `<div class="sh-sec">🪙 За золото · 1 бой</div><div class="sh-grid">${gold.map(_cardHTML).join('')}</div>`
           + `<div class="sh-sec">💎 За алмазы · 3 боя</div><div class="sh-grid">${dia.map(_cardHTML).join('')}</div>`;
    }
    if (tab === 'boxes') {
      const ex   = items.filter(i => i[0].startsWith('exchange'));
      const misc = items.filter(i => i[0] === 'stat_reset');
      const box  = items.filter(i => i[0].startsWith('box'));
      const miscHtml = misc.length ? `<div class="sh-sec">🔄 Прочее</div><div class="sh-grid">${misc.map(_cardHTML).join('')}</div>` : '';
      return `<div class="sh-sec">💱 Обмен алмазы → золото</div><div class="sh-grid">${ex.map(_cardHTML).join('')}</div>`
           + miscHtml
           + `<div class="sh-sec">📦 Ящики</div><div class="sh-grid">${box.map(_cardHTML).join('')}</div>`;
    }
    return '';
  },

  _findItem(id) {
    for (const tab of ['consumables', 'scrolls', 'boxes']) {
      const it = (DATA[tab] || []).find(i => i[0] === id);
      if (it) return { tab, item: it };
    }
    return null;
  },

  _showDetailFor(id) {
    const found = ShopHtmlItems._findItem(id); if (!found) return;
    const [iid, icon, name, , cur, desc, badge, risk] = found.item;
    const price = _effPrice(iid, found.item[3]);
    let r = _rarity(cur, price, risk);
    const qty = _inv[iid] || 0;
    const p = State.player || {};
    const bal = cur === 'diamonds' ? (p.diamonds || 0) : (p.gold || 0);
    const canBuy = bal >= price;
    const pIcon = cur === 'diamonds' ? '💎' : '🪙';

    // ── Строки описания в spd-row стиле ──────────────────────────────────────
    function _r(ico, txt, val, vc) {
      return `<div class="spd-row"><span class="spd-row-ico">${ico}</span><span class="spd-row-txt">${txt}</span>${val ? `<span class="spd-row-val ${vc||'vc'}">${val}</span>` : ''}</div>`;
    }
    let rows = null;
    let richDesc = desc;

    // Зелье HP (единственное — полное)
    if (iid === 'hp_full') {
      const curHp = p.current_hp != null ? Number(p.current_hp) : null;
      const maxHp = p.max_hp != null ? Number(p.max_hp) : null;
      if (curHp != null && maxHp > 0) {
        const isFull = curHp >= maxHp;
        const restore = maxHp - curHp;
        const hpPct = Math.round(curHp / maxHp * 100);
        if (isFull) {
          rows = _r('❌','HP уже полное','зелье не нужно','vr');
        } else {
          const bar = `<div style="background:rgba(255,255,255,.1);border-radius:4px;height:6px;overflow:hidden;margin:4px 0"><div style="width:${hpPct}%;height:100%;background:linear-gradient(90deg,#992222,#ff4444);border-radius:4px"></div></div>`;
          rows = _r('❤️', desc, '', '')
            + `<div class="spd-row" style="flex-direction:column;align-items:flex-start;gap:2px"><span class="spd-row-txt" style="font-size:11px;opacity:.6">${curHp} / ${maxHp} HP сейчас</span>${bar}</div>`
            + _r('💚', `+${restore} HP восстановится`, `→ ${maxHp} (100%)`, 'vc');
        }
      }
    }
    // stat_reset
    else if (iid === 'stat_reset') {
      rows = _r('⚠️','Все очки статов','сбросятся','vr')
           + _r('✅','Золото и алмазы','сохраняются','vc')
           + _r('✅','Инвентарь','сохраняется','vc')
           + _r('🔒','Действие','необратимо','vr');
    }
    // Ящики — красивые строки содержимого
    else if (iid === 'box_common') {
      r = 'r';
      rows = _r('📜','2–4 золотых свитка','гарантировано','vc')
           + _r('💎','Алмазный свиток','5% шанс','vo')
           + _r('💎','+10–20 алмазов','3% шанс','vo')
           + _r('🎒','Содержимое','→ в рюкзак','vm');
    }
    else if (iid === 'box_rare') {
      r = 'e';
      rows = _r('💎','Алмазных свитков × 3–6','гарантировано','vc')
           + _r('📜','USDT-свиток','5% шанс','vo')
           + _r('💎','+100 алмазов','3% шанс','vo')
           + _r('👑','Premium 3 дня','5% шанс','vp')
           + _r('🎒','Содержимое','→ в рюкзак','vm');
    }
    else if (iid === 'box_rare_c') {
      r = 'e';
      rows = _r('💎','×2 алмазных свитка (гарант.)','гарантировано','vc')
           + _r('💎','×0–4 алмазных свитка','бонус','vc')
           + _r('📜','USDT-свиток','5% шанс','vo')
           + _r('💎','+200 алмазов','5% шанс','vg')
           + _r('👑','Premium 3 дня','5% шанс','vp')
           + _r('🎒','Содержимое','→ в рюкзак','vm');
    }
    // Предметы с badge (броня/мечи/шлемы — временные)
    else if (badge) {
      rows = _r('⚡', desc || name, '', '')
           + _r('⏱','Длительность', badge, 'vo')
           + _r('🎒','В инвентарь','применишь перед боем','vm');
    }
    // Обычный предмет — просто текст
    else {
      richDesc = desc;
    }

    // stat_reset: двойное подтверждение
    let action = canBuy
      ? () => ShopHtmlItems._doBuy(iid)
      : () => ShopHtml.toast(`❌ Не хватает ${cur === 'diamonds' ? 'алмазов' : 'золота'}`, true);

    if (iid === 'stat_reset' && canBuy) {
      action = () => ShopHtml.showDetail({
        icon: '⚠️', name: 'Подтвердите сброс',
        rows: _r('⚠️','Все очки статов обнулятся','необратимо','vr') + _r('✅','Золото и алмазы','сохраняются','vc'),
        price, currency: cur, rarity: 'd',
        actionLabel: `⚠️ Сбросить за ${price} 💎`,
        btnClass: 'btn-danger',
        action: () => ShopHtmlItems._doBuy('stat_reset'),
      });
    }

    const detailIcon = (icon && icon.startsWith('img:'))
      ? `<img src="${icon.slice(4)}" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 10px rgba(255,200,80,.5))">`
      : (icon || '📦');

    ShopHtml.showDetail({
      icon: detailIcon, name, rows, desc: rows ? null : richDesc,
      badge: rows ? null : badge, risk, price, currency: cur, qty, rarity: r,
      actionLabel: canBuy ? `Купить за ${price} ${pIcon}` : `Нужно ${price} ${pIcon}`,
      action,
    });
  },

  bindBuyEvents(root) {
    root.querySelectorAll('[data-buy]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') return;
        ShopHtmlItems._showDetailFor(card.dataset.buy);
      });
      card.querySelector('.sh-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        const iid = card.dataset.buy;
        if (iid === 'stat_reset') ShopHtmlItems._showDetailFor(iid);
        else ShopHtmlItems._doBuy(iid);
      });
    });
  },

  async _doBuy(id) {
    const r = document.getElementById('shop-html-ov'); if (!r) return;
    const card = r.querySelector(`[data-buy="${id}"]`); if (!card) return;
    if (card.dataset.buying) return;
    card.dataset.buying = '1';
    // Flash
    const fov = document.createElement('div'); fov.className = 'sh-fov'; card.appendChild(fov);
    setTimeout(() => { fov.remove(); delete card.dataset.buying; }, 500);
    tg?.HapticFeedback?.impactOccurred('medium');
    try {
      const res = await post('/api/shop/buy', { item_id: id });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (res.player) { State.player = res.player; ShopHtml._updateBalance(); }
        let msg = `✅ Куплено`;
        if (res.hp_restored > 0) msg = `❤️ +${res.hp_restored} HP`;
        if (res.gold_gained)     msg = `💰 +${res.gold_gained} золота`;
        if (res.added_to_inventory) { msg = `📦 → в инвентарь`; ShopHtml.bumpInvBadge(); }
        ShopHtml.toast(msg);
        // Обновляем инвентарь
        try { const inv = await get('/api/shop/inventory'); if (inv?.inventory) ShopHtmlItems._setInv(inv.inventory); } catch(_) {}
      } else {
        tg?.HapticFeedback?.notificationOccurred('error');
        ShopHtml.toast(res.reason || res.detail || '❌ Ошибка', true);
      }
    } catch(e) { ShopHtml.toast('❌ Нет соединения', true); }
    delete card.dataset.buying;
  },
};

// Привязка кликов после рендера
const _orig = window.ShopHtml.show.bind(window.ShopHtml);
window.ShopHtml.show = async function(tab, scene) {
  await _orig(tab, scene);
  const r = document.getElementById('shop-html-ov');
  if (r) ShopHtmlItems.bindBuyEvents(r);
};
})();
