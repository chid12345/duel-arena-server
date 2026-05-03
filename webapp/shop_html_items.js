/* ═══════════════════════════════════════════════════════════
   Shop HTML Items — данные товаров + карточки + покупка
   ═══════════════════════════════════════════════════════════ */
(() => {
// [id, icon, name, price, currency, desc, badge, risk]
const DATA = {
  consumables: [
    ['hp_small',    '🧪','Малое зелье HP',   12, 'gold',    '+30% HP перед боем',      null,   false],
    ['hp_medium',   '💊','Среднее зелье HP',  25, 'gold',    '+60% HP перед боем',      null,   false],
    ['hp_full',     '⚗️','Полное зелье HP',   50, 'gold',    'Полное HP',               null,   false],
    ['xp_boost_5',  '⚡','XP Буст ×1.5',    100, 'gold',    '5 боёв → инвентарь',      '5 БОЁВ',false],
    ['xp_boost_20', '⚡','XP Буст ×1.5',     25, 'diamonds','20 боёв → инвентарь',     '20 БОЁВ',false],
    ['xp_boost_x2', '🚀','XP Буст ×2.0',     40, 'diamonds','10 боёв → инвентарь',    '10 БОЁВ',false],
    ['gold_hunt',   '💰','Охота за золотом',  20, 'diamonds','+20% золото · 24ч',      '24 ЧАСА',false],
    ['xp_hunt',     '📚','Охота за опытом',   20, 'diamonds','+50% опыта · 24ч',       '24 ЧАСА',false],
    ['stat_reset',  '🔄','Сброс статов',     200, 'diamonds','Сброс всех статов',       null,   false],
  ],
  scrolls: [
    ['scroll_str_3',   '⚔️','Эликсир силы +3',    60, 'gold',   'Сила +3 · 1 бой',         '1 БОЙ', false],
    ['scroll_end_3',   '🌀','Эликс. ловкости +3',  60, 'gold',   'Ловкость +3 · 1 бой',     '1 БОЙ', false],
    ['scroll_crit_3',  '🎯','Эликсир интуиции +3',   75, 'gold',   'Интуиция +3 · 1 бой',     '1 БОЙ', false],
    ['scroll_armor_6', '🛡️','Свиток брони 6%',     80, 'gold',   'Броня +6% · 1 бой',       '1 БОЙ', false],
    ['scroll_hp_100',  '❤️','Эликсир HP +100',     70, 'gold',   '+100 HP · 1 бой',          '1 БОЙ', false],
    ['scroll_warrior', '⚔️','Комбо Воина',         110, 'gold',   'Сила+2, Ловк+2 · 1 бой',  '1 БОЙ', false],
    ['scroll_shadow',  '🌑','Комбо Тени',          100, 'gold',   'Ловк+3, Уворот+3%',        '1 БОЙ', false],
    ['scroll_fury',    '💥','Комбо Ярости',        120, 'gold',   'Сила+4, Крит+2',           '1 БОЙ', false],
    ['scroll_vampire_g','🩸','Свиток Вампира',     140, 'gold',   'Вампиризм 9% · 1 бой',     '1 БОЙ', false],
    ['scroll_str_6',   '⚔️','Эликсир силы +6',    20, 'diamonds','Сила +6 · 3 боя',          '3 БОЯ', false],
    ['scroll_end_6',   '🌀','Эликс. ловкости +6',  20, 'diamonds','Ловкость +6 · 3 боя',     '3 БОЯ', false],
    ['scroll_crit_6',  '🎯','Эликсир интуиции +6',   25, 'diamonds','Интуиция +6 · 3 боя',     '3 БОЯ', false],
    ['scroll_dodge_5', '💨','Свиток уворота 5%',    25, 'diamonds','Уворот +5% · 3 боя',      '3 БОЯ', false],
    ['scroll_armor_10','🛡️','Свиток брони 10%',    30, 'diamonds','Броня +10% · 3 боя',      '3 БОЯ', false],
    ['scroll_hp_200',  '❤️','Эликсир HP +200',     25, 'diamonds','+200 HP · 3 боя',          '3 БОЯ', false],
    ['scroll_double_10','⚡','Двойной удар +10%',   35, 'diamonds','Двойной удар +10% · 3 боя','3 БОЯ', false],
    ['scroll_all_4',   '✨','Все пассивки +4',      40, 'diamonds','Все статы +4 · 1 бой',    '1 БОЙ', false],
    ['scroll_bastion', '🏰','Бастион',              35, 'diamonds','Ловк+5, Броня+8% · 3 боя','3 БОЯ', false],
    ['scroll_predator','🐍','Хищник',               35, 'diamonds','Крит+5, Двойн+8% · 3 боя','3 БОЯ', false],
    ['scroll_berserker','🔥','Берсерк',             40, 'diamonds','Сила+8, Броня-5% · 3 боя','3 БОЯ', true],
    ['scroll_accuracy','🎯','Точность +15%',        20, 'diamonds','Точность +15% · 3 боя',   '3 БОЯ', false],
    ['scroll_vampire_d','🧛','Свиток Вампира+',    40, 'diamonds','Вампиризм 15% · 3 боя',    '3 БОЯ', false],
  ],
  boxes: [
    ['exchange_small', '💱','5💎 → 350🪙',     5,  'diamonds','Обмен алмазы → золото', null, false],
    ['exchange_medium','💰','15💎 → 1100🪙',   15,  'diamonds','Лучший курс',            null, false],
    ['exchange_large', '💎','50💎 → 4000🪙',   50,  'diamonds','Максимальный курс',      null, false],
    ['box_common',     '📦','Обычный ящик',    150, 'gold',    '2–4 золотых свитка · 5% алмазный свиток · 3% +10–20💎', null, false],
    ['box_rare',       '🟦','Редкий ящик',      50,  'diamonds','3–6 алмазных свитков · 5% USDT-свиток · 3% +100💎 · 3% Premium 3 дн.', null, false],
    ['box_rare_c',     '🟪','Редкий ящик+',     80,  'diamonds','2 гарант. алмазных + 0–4 бонус · 5% USDT-свиток · 5% +300💎 · 3% Premium 3 дн.', null, false],
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

function _cardHTML(item) {
  const [id, icon, name, price, cur, desc, badge, risk] = item;
  const r = _rarity(cur, price, risk);
  const qty = _inv[id] || 0;
  const badgeCls = badge ? `<span class="sh-bdg ${_badgeClass(badge)}">${badge}</span>` : '';
  const riskBdg  = risk  ? `<span class="sh-bdg b-risk">⚠ РИСК</span>` : '';
  const invBdg   = qty   ? `<div class="sh-inv-cnt">×${qty}</div>` : '';
  return `
<div class="sh-card r-${r}" data-buy="${id}">
  <div class="sh-diode d-${r}"></div>
  ${invBdg}
  <div class="sh-ico">${icon}</div>
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
      const ex  = items.filter(i => i[0].startsWith('exchange'));
      const box = items.filter(i => i[0].startsWith('box'));
      return `<div class="sh-sec">💱 Обмен алмазы → золото</div><div class="sh-grid">${ex.map(_cardHTML).join('')}</div>`
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
    const [iid, icon, name, price, cur, desc, badge, risk] = found.item;
    const r = _rarity(cur, price, risk);
    const qty = _inv[iid] || 0;
    const p = State.player || {};
    const bal = cur === 'diamonds' ? (p.diamonds || 0) : (p.gold || 0);
    const canBuy = bal >= price;
    const pIcon = cur === 'diamonds' ? '💎' : '🪙';

    // HP-зелья: полоска здоровья в описании
    let richDesc = desc;
    if (['hp_small', 'hp_medium', 'hp_full'].includes(iid)) {
      const curHp = p.current_hp ?? p.max_hp ?? 100;
      const maxHp = p.max_hp ?? 100;
      const isFull = curHp >= maxHp;
      const pct = iid === 'hp_full' ? 1.0 : iid === 'hp_medium' ? 0.6 : 0.3;
      const restore = iid === 'hp_full' ? (maxHp - curHp) : Math.max(1, Math.floor(maxHp * pct));
      const newHp = Math.min(maxHp, curHp + restore);
      const hpPct = Math.round(curHp / maxHp * 100);
      const newPct = Math.min(100, Math.round(newHp / maxHp * 100));
      richDesc = (isFull
        ? `<span style="color:#ff6666">❌ HP уже полное — зелье не нужно</span>`
        : `${desc}<br><br>`
          + `<div style="font-size:10px;color:rgba(255,255,255,.45);margin-bottom:5px">Текущее HP: ${curHp} / ${maxHp}</div>`
          + `<div style="background:rgba(255,255,255,.1);border-radius:4px;height:8px;overflow:hidden;margin-bottom:5px">`
          + `<div style="width:${hpPct}%;height:100%;background:linear-gradient(90deg,#992222,#ff4444);border-radius:4px"></div></div>`
          + `<div style="font-size:11px;color:#00ff88;font-weight:700">+${restore} HP → ${newHp} / ${maxHp} (${newPct}%)</div>`
      );
    }

    // stat_reset: двойное подтверждение перед списанием 200💎
    let action = canBuy
      ? () => ShopHtmlItems._doBuy(iid)
      : () => ShopHtml.toast(`❌ Не хватает ${cur === 'diamonds' ? 'алмазов' : 'золота'}`, true);

    if (iid === 'stat_reset' && canBuy) {
      action = () => ShopHtml.showDetail({
        icon: '⚠️', name: 'Подтвердите сброс',
        desc: 'Все вложенные очки статов обнулятся.<br>Это <b>необратимо</b> — откатить нельзя.',
        price, currency: cur, rarity: 'd',
        actionLabel: `⚠️ Сбросить за ${price} 💎`,
        btnClass: 'btn-danger',
        action: () => ShopHtmlItems._doBuy('stat_reset'),
      });
    }

    ShopHtml.showDetail({
      icon, name, desc: richDesc, badge, risk, price, currency: cur, qty, rarity: r,
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
