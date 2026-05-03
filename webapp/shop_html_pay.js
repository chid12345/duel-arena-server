/* ═══════════════════════════════════════════════════════════
   Shop HTML Pay — Stars / USDT панели + покупки
   ═══════════════════════════════════════════════════════════ */
(() => {
let _pkgs = null;

async function _loadPkgs() {
  if (_pkgs) return _pkgs;
  try { _pkgs = await get('/api/shop/packages'); } catch(_) { _pkgs = {}; }
  return _pkgs;
}

function _cardStar(item) {
  const { id, label, stars, scroll_id } = item;
  const isBox = (scroll_id || '').startsWith('box_');
  const isLeg = id.includes('titan');
  const r = isLeg ? 'l' : isBox ? 'e' : 'stars';
  const name = label.replace(/^[^\s]+\s/, '');
  const icoHtml = isBox
    ? `<img src="chest_epic.png" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(255,200,80,.35))">`
    : isLeg ? `<img src="scroll_titan.png" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(255,140,0,.6))">`
    : `<img src="scroll_icon.png" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(255,170,50,.6))">`;
  return `
<div class="sh-card r-${r}" data-stars="${id}">
  <div class="sh-diode d-${r}"></div>
  <div class="sh-ico">${icoHtml}</div>
  <div class="sh-nm">${name}</div>
  <div class="sh-ds">→ инвентарь</div>
  <div class="sh-pr"><span class="sh-pr-ico">⭐</span><span class="sh-pr-v pv-s">${stars}</span></div>
  <button class="sh-btn btn-s">КУПИТЬ</button>
</div>`;
}

function _cardDia(pkg) {
  return `
<div class="sh-card r-r" data-stars="${pkg.id}">
  <div class="sh-diode d-r"></div>
  <div class="sh-ico">💎</div>
  <div class="sh-nm">${pkg.diamonds} алмазов</div>
  <div class="sh-ds">Мгновенно на счёт</div>
  <div class="sh-pr"><span class="sh-pr-ico">⭐</span><span class="sh-pr-v pv-s">${pkg.stars}</span></div>
  <button class="sh-btn btn-s">КУПИТЬ</button>
</div>`;
}

function _cardUSDT(pkg) {
  const { id, label, usdt, scroll_id } = pkg;
  const isBox = (scroll_id || '').startsWith('box_');
  const isLeg = id.includes('titan');
  const r = isLeg ? 'l' : isBox ? 'e' : 'usdt';
  const name = label.replace(/^[^\s]+\s/, '');
  const icoHtml = isBox
    ? `<img src="chest_epic.png" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(255,200,80,.35))">`
    : isLeg ? `<img src="scroll_titan.png" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(255,140,0,.6))">`
    : `<img src="scroll_icon.png" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(0,255,136,.55))">`;
  return `
<div class="sh-card r-${r}" data-usdt="${id}">
  <div class="sh-diode d-${r}"></div>
  <div class="sh-ico">${icoHtml}</div>
  <div class="sh-nm">${name}</div>
  <div class="sh-ds">→ инвентарь</div>
  <div class="sh-pr"><span class="sh-pr-ico">💲</span><span class="sh-pr-v pv-u">${usdt}</span></div>
  <button class="sh-btn btn-u">КУПИТЬ</button>
</div>`;
}

function _cardDiaUSDT(pkg) {
  return `
<div class="sh-card r-r" data-usdt="${pkg.id}">
  <div class="sh-diode d-r"></div>
  <div class="sh-ico">💎</div>
  <div class="sh-nm">${pkg.diamonds} алмазов</div>
  <div class="sh-ds">Мгновенно на счёт</div>
  <div class="sh-pr"><span class="sh-pr-ico">💲</span><span class="sh-pr-v pv-u">${pkg.usdt}</span></div>
  <button class="sh-btn btn-u">КУПИТЬ</button>
</div>`;
}

function _premBanner(price, cur, pkgId) {
  const icon = cur === 'stars' ? `⭐ ${price}` : `${price} <span style="font-size:12px;opacity:.7">USDT</span>`;
  const btnCls = cur === 'stars' ? 'btn-s' : 'btn-u';
  const pv = cur === 'stars' ? 'pv-s' : 'pv-u';
  return `<div class="sh-prem" data-prem="${pkgId}" data-cur="${cur}">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="font-size:26px">👑</div>
    <div>
      <div style="font-size:13px;font-weight:700;color:#fff">Premium подписка</div>
      <div style="font-size:10px;color:rgba(255,255,255,.45)">+15% XP · ящик · скидки · значок</div>
      <div style="font-size:10px;color:rgba(255,255,255,.25);margin-top:2px">21 день</div>
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:19px;font-weight:900;color:${cur==='stars'?'#ffaa33':'#00ff88'}">${icon}</div>
    <button class="sh-btn ${btnCls}" style="margin-top:6px;padding:5px 10px;font-size:10px">АКТИВИРОВАТЬ</button>
  </div>
</div>`;
}

window.ShopHtmlPay = {
  async _buildStars() {
    const el = document.getElementById('sh-p-stars'); if (!el) return;
    const d = await _loadPkgs();
    const prem = d.stars?.find(p => p.id === 'premium');
    const pkgMain = (d.stars || []).filter(p => p.id !== 'premium');
    const scrolls = (d.stars_scrolls || []).filter(p => !p.scroll_id?.startsWith('box_'));
    const boxes   = (d.stars_scrolls || []).filter(p =>  p.scroll_id?.startsWith('box_'));
    const isPrem = !!(State.player || {}).is_premium;

    let html = '';
    if (prem) {
      html += `<div class="sh-sec">👑 Premium</div>`;
      html += isPrem
        ? `<div style="background:rgba(180,79,255,.1);border:1px solid rgba(180,79,255,.3);border-radius:11px;padding:10px 14px;font-size:12px;color:#c8a0ff;margin-bottom:8px">👑 Premium активен · ещё ${State.player.premium_days_left} дн.</div>`
        : _premBanner(prem.stars, 'stars', prem.id);
    }
    if (boxes.length) {
      html += `<div class="sh-sec">🎲 Эпические ящики</div><div class="sh-grid">${boxes.map(_cardStar).join('')}</div>`;
    }
    if (scrolls.length) {
      html += `<div class="sh-sec">📜 Боевые свитки</div><div class="sh-grid">${scrolls.map(_cardStar).join('')}</div>`;
    }
    if (pkgMain.length) {
      html += `<div class="sh-sec">💎 Алмазы</div><div class="sh-grid">${pkgMain.map(_cardDia).join('')}</div>`;
    }
    html += `<div style="text-align:center;font-size:10px;color:rgba(85,119,170,.8);margin-top:16px">⭐ Telegram Stars — моментальная оплата</div>`;
    el.innerHTML = html;
    el.querySelectorAll('[data-stars]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') return;
        ShopHtmlPay._showStarsDetail(card.dataset.stars);
      });
      card.querySelector('.sh-btn')?.addEventListener('click', e => { e.stopPropagation(); ShopHtmlPay._buyStars(card.dataset.stars); });
    });
    el.querySelectorAll('[data-prem]').forEach(card => {
      const id = card.dataset.prem;
      card.querySelector('.sh-btn')?.addEventListener('click', e => { e.stopPropagation(); ShopHtmlPay._buyStars(id); });
    });
  },

  async _buildSpecial() {
    const el = document.getElementById('sh-p-special'); if (!el) return;
    const d = await _loadPkgs();
    if (!d.cryptopay_enabled) {
      el.innerHTML = `<div style="text-align:center;padding:30px;color:rgba(255,255,255,.3);font-size:13px">⚙️ CryptoPay не подключён</div>`;
      return;
    }
    const prem    = d.crypto?.find(p => p.premium);
    const reset   = d.crypto?.find(p => p.full_reset);
    const dPkgs   = (d.crypto || []).filter(p => !p.premium && !p.full_reset);
    const scrolls = (d.usdt_scrolls || []).filter(p => !p.scroll_id?.startsWith('box_'));
    const boxes   = (d.usdt_scrolls || []).filter(p =>  p.scroll_id?.startsWith('box_'));
    const isPrem  = !!(State.player || {}).is_premium;

    let html = '';
    if (prem) {
      html += `<div class="sh-sec">👑 Premium</div>`;
      html += isPrem
        ? `<div style="background:rgba(180,79,255,.1);border:1px solid rgba(180,79,255,.3);border-radius:11px;padding:10px 14px;font-size:12px;color:#c8a0ff;margin-bottom:8px">👑 Premium активен · ещё ${State.player.premium_days_left} дн.</div>`
        : _premBanner(prem.usdt, 'usdt', prem.id);
    }
    if (boxes.length) html += `<div class="sh-sec">🎲 Эпические ящики</div><div class="sh-grid">${boxes.map(_cardUSDT).join('')}</div>`;
    if (scrolls.length) html += `<div class="sh-sec">📜 Боевые свитки</div><div class="sh-grid">${scrolls.map(_cardUSDT).join('')}</div>`;
    if (dPkgs.length)   html += `<div class="sh-sec">💎 Алмазы / USDT</div><div class="sh-grid">${dPkgs.map(_cardDiaUSDT).join('')}</div>`;
    if (reset) html += `<div class="sh-sec">⚠️ Danger Zone</div><div class="sh-grid"><div class="sh-card r-d" data-usdt="${reset.id}"><div class="sh-diode d-d"></div><div class="sh-ico">🔄</div><div class="sh-nm">Сброс прогресса</div><div class="sh-ds">Уровень с нуля · золото и 💎 сохраняются</div><div class="sh-pr"><span class="sh-pr-ico">💲</span><span class="sh-pr-v pv-u">${reset.usdt}</span></div><button class="sh-btn btn-danger">СБРОСИТЬ</button></div></div>`;
    html += `<div style="text-align:center;font-size:10px;color:rgba(85,119,170,.8);margin-top:16px">💡 После оплаты товар придёт автоматически</div>`;
    el.innerHTML = html;
    el.querySelectorAll('[data-usdt]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') return;
        ShopHtmlPay._showUsdtDetail(card.dataset.usdt);
      });
      card.querySelector('.sh-btn')?.addEventListener('click', e => { e.stopPropagation(); ShopHtmlPay._buyCrypto(card.dataset.usdt); });
    });
    el.querySelectorAll('[data-prem]').forEach(card => {
      card.querySelector('.sh-btn')?.addEventListener('click', e => { e.stopPropagation(); ShopHtmlPay._buyCrypto(card.dataset.prem); });
    });
  },

  _pkgs() { return _pkgs; },

  async _buyStars(pkgId) {
    ShopHtml.toast('⏳ Открываем оплату...');
    try {
      const res = await post('/api/shop/stars_invoice', { package_id: pkgId });
      if (!res.ok) { ShopHtml.toast(res.reason || '❌ Ошибка', true); return; }
      if (typeof tg?.openInvoice !== 'function') {
        const u = res.invoice_url || '';
        try { if (u.startsWith('https://t.me/') || u.startsWith('tg://')) tg?.openTelegramLink?.(u); else tg?.openLink?.(u); } catch(_) {}
        if (u) try { window.open(u, '_blank'); } catch(_) {}
        ShopHtml.toast('⭐ Счёт Stars открыт'); return;
      }
      tg.openInvoice(res.invoice_url, async status => {
        if (status === 'paid') {
          tg?.HapticFeedback?.notificationOccurred('success');
          ShopHtml.toast('⏳ Активируем...');
          try {
            const c = await post('/api/shop/stars_confirm', { package_id: pkgId });
            if (c.ok) {
              if (c.player) { State.player = c.player; ShopHtml._updateBalance(); }
              if (c.scroll_received) ShopHtml.bumpInvBadge();
              ShopHtml.toast(c.scroll_received ? '✅ Свиток получен! → Рюкзак' : c.premium_activated ? '👑 Premium активирован!' : `✅ +${c.diamonds_added || 0} 💎`);
            }
          } catch(_) {}
          _pkgs = null; ShopHtmlPay._buildStars();
        } else if (status === 'cancelled') ShopHtml.toast('❌ Оплата отменена', true);
      });
    } catch(_) { ShopHtml.toast('❌ Нет соединения', true); }
  },

  async _buyCrypto(pkgId) {
    ShopHtml.toast('⏳ Создаём счёт...');
    try {
      const res = await post('/api/shop/crypto_invoice', { package_id: pkgId });
      if (!res.ok || !res.invoice_url) { ShopHtml.toast(res.reason || '❌ Ошибка CryptoPay', true); return; }
      localStorage.setItem('cryptoPendingInvoice', String(res.invoice_id));
      const u = res.invoice_url;
      try { if (res.web_app_url) tg?.openLink?.(res.web_app_url); else if (u.includes('startapp=')) tg?.openLink?.(u); else tg?.openTelegramLink?.(u); } catch(_) {}
      if (!tg && u && !u.startsWith('tg://')) try { window.open(u, '_blank'); } catch(_) {}
      ShopHtml.toast('💳 Счёт открыт — оплатите и вернитесь');
      ShopHtmlPay._pollCrypto(res.invoice_id, 0);
    } catch(_) { ShopHtml.toast('❌ Нет соединения', true); }
  },

  async _pollCrypto(invoiceId, attempts) {
    if (attempts >= 24) {
      ShopHtml.toast('💳 Оплатили позже? Зайдите снова в магазин — товар проверится автоматически');
      return;
    }
    setTimeout(async () => {
      try {
        const r = await get(`/api/shop/crypto_check/${invoiceId}`);
        if (r.ok && r.paid) {
          tg?.HapticFeedback?.notificationOccurred('success');
          localStorage.removeItem('cryptoPendingInvoice');
          if (r.scroll_received) ShopHtml.bumpInvBadge();
          const msg = r.profile_reset ? '🔄 Аккаунт сброшен' : r.premium_activated ? '👑 Premium активирован!' : `✅ +${r.diamonds || 0} 💎`;
          ShopHtml.toast(msg);
          try { const d = await post('/api/player'); if (d.ok && d.player) { State.player = d.player; ShopHtml._updateBalance(); } } catch(_) {}
          _pkgs = null; ShopHtmlPay._buildSpecial();
        } else ShopHtmlPay._pollCrypto(invoiceId, attempts + 1);
      } catch(_) { ShopHtmlPay._pollCrypto(invoiceId, attempts + 1); }
    }, 5000);
  },
};
})();
