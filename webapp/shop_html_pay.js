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
  const { id, label, stars, scroll_id, desc } = item;
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
  <div class="sh-ds">${desc || '→ инвентарь'}</div>
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
  const { id, label, usdt, scroll_id, desc } = pkg;
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
  <div class="sh-ds">${desc || '→ инвентарь'}</div>
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
    const reset = d.stars?.find(p => p.full_reset);
    const pkgMain = (d.stars || []).filter(p => p.id !== 'premium' && !p.full_reset);
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
    if (reset) html += `<div class="sh-sec">⚠️ Danger Zone</div><div class="sh-grid"><div class="sh-card r-d" data-stars="${reset.id}"><div class="sh-diode d-d"></div><div class="sh-ico"><img src="reset_icon.png?v=2" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 7px rgba(255,51,51,.6))"></div><div class="sh-nm">Сброс прогресса</div><div class="sh-ds">Уровень с нуля · золото и 💎 сохраняются</div><div class="sh-pr"><span class="sh-pr-ico">⭐</span><span class="sh-pr-v pv-s">${reset.stars}</span></div><button class="sh-btn btn-danger">СБРОСИТЬ</button></div></div>`;
    html += `<div style="text-align:center;font-size:10px;color:rgba(0,200,255,.55);margin-top:16px;letter-spacing:.5px;text-shadow:0 0 6px rgba(0,200,255,.3)">⭐ Telegram Stars — моментальная оплата</div>`;
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
    if (reset) html += `<div class="sh-sec">⚠️ Danger Zone</div><div class="sh-grid"><div class="sh-card r-d" data-usdt="${reset.id}"><div class="sh-diode d-d"></div><div class="sh-ico"><img src="reset_icon.png?v=2" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 7px rgba(255,51,51,.6))"></div><div class="sh-nm">Сброс прогресса</div><div class="sh-ds">Уровень с нуля · золото и 💎 сохраняются</div><div class="sh-pr"><span class="sh-pr-ico">💲</span><span class="sh-pr-v pv-u">${reset.usdt}</span></div><button class="sh-btn btn-danger">СБРОСИТЬ</button></div></div>`;
    html += `<div style="text-align:center;font-size:10px;color:rgba(0,200,255,.55);margin-top:16px;letter-spacing:.5px;text-shadow:0 0 6px rgba(0,200,255,.3)">💡 После оплаты товар придёт автоматически</div>`;
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


  async _buildCombined() {
    const el = document.getElementById('sh-p-special'); if (!el) return;
    const d = await _loadPkgs();
    const isPrem = !!(State.player || {}).is_premium;

    const starPrem    = d.stars?.find(p => p.id === 'premium');
    const usdtPrem    = d.crypto?.find(p => p.premium);
    const starReset   = d.stars?.find(p => p.full_reset);
    const usdtReset   = d.crypto?.find(p => p.full_reset);
    const starScrolls = (d.stars_scrolls || []).filter(p => !p.scroll_id?.startsWith('box_'));
    const usdtScrolls = (d.usdt_scrolls || []).filter(p => !p.scroll_id?.startsWith('box_'));
    const starBoxes   = (d.stars_scrolls || []).filter(p =>  p.scroll_id?.startsWith('box_'));
    const usdtBoxes   = (d.usdt_scrolls || []).filter(p =>  p.scroll_id?.startsWith('box_'));
    const starDia     = (d.stars  || []).filter(p => p.diamonds > 0 && !p.full_reset && p.id !== 'premium' && !p.starter_pack && !p.first_purchase);
    const usdtDia     = (d.crypto || []).filter(p => p.diamonds > 0 && !p.full_reset && !p.premium && !p.starter_pack && !p.first_purchase);
    const starStarter = d.stars?.find(p => p.starter_pack);
    const usdtStarter = d.crypto?.find(p => p.starter_pack);

    function _matchByScrollId(sArr, uArr) {
      const all = new Map();
      sArr.forEach(s => all.set(s.scroll_id, { s }));
      uArr.forEach(u => { const e = all.get(u.scroll_id) || {}; e.u = u; all.set(u.scroll_id, e); });
      return [...all.values()].map(e => [e.s || null, e.u || null]);
    }
    function _matchDia(sArr, uArr) {
      const pairs = [];
      const len = Math.max(sArr.length, uArr.length);
      for (let i = 0; i < len; i++) pairs.push([sArr[i] || null, uArr[i] || null]);
      return pairs;
    }
    function _dualIco(item) {
      const sid = (item?.scroll_id || '');
      const isBox = sid.startsWith('box_');
      const isLeg = sid.includes('titan') || (item?.id || '').includes('titan');
      return isBox
        ? '<img src="chest_epic.png" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(255,200,80,.35))">'
        : isLeg
        ? '<img src="scroll_titan.png" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(255,140,0,.6))"> '
        : '<img src="scroll_icon.png" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(255,170,50,.6))">';
    }
    function _cardDual(sItem, uItem) {
      const item = sItem || uItem;
      const sid  = (item?.scroll_id || '');
      const isBox = sid.startsWith('box_');
      const isLeg = sid.includes('titan') || (item?.id || '').includes('titan');
      const r = isLeg ? 'l' : isBox ? 'e' : 'stars';
      const name = (item?.label || '').replace(/^[^\s]+\s/, '');
      const sRow = sItem
        ? `<div class="sh-dual-row" data-stars="${sItem.id}"><span class="sh-pr-ico">⭐</span><span class="sh-pr-v pv-s">${sItem.stars}</span><button class="sh-btn btn-s">КУПИТЬ</button></div>`
        : '';
      const uRow = uItem
        ? `<div class="sh-dual-row" data-usdt="${uItem.id}"><span class="sh-pr-ico">💲</span><span class="sh-pr-v pv-u">${uItem.usdt}</span><button class="sh-btn btn-u">КУПИТЬ</button></div>`
        : '';
      return `<div class="sh-card r-${r}" style="justify-content:flex-start" data-s-id="${sItem?.id||''}" data-u-id="${uItem?.id||''}" data-combined="1"><div class="sh-ico">${_dualIco(item)}</div><div class="sh-nm">${name}</div><div class="sh-dual-rows">${sRow}${uRow}</div></div>`;
    }
    function _cardDiaDual(sItem, uItem) {
      const label = sItem ? `${sItem.diamonds} 💎` : `${uItem.diamonds} 💎`;
      const sRow = sItem
        ? `<div class="sh-dual-row" data-stars="${sItem.id}"><span class="sh-pr-ico">⭐</span><span class="sh-pr-v pv-s">${sItem.stars}</span><button class="sh-btn btn-s">КУПИТЬ</button></div>`
        : '';
      const uRow = uItem
        ? `<div class="sh-dual-row" data-usdt="${uItem.id}"><span class="sh-pr-ico">💲</span><span class="sh-pr-v pv-u">${uItem.usdt}</span><button class="sh-btn btn-u">КУПИТЬ</button></div>`
        : '';
      return `<div class="sh-card r-r" style="justify-content:flex-start" data-s-id="${sItem?.id||''}" data-u-id="${uItem?.id||''}" data-combined="1"><div class="sh-ico">💎</div><div class="sh-nm">${label}</div><div class="sh-dual-rows">${sRow}${uRow}</div></div>`;
    }
    function _cardDiaFirstDual(sItem, uItem) {
      const label = sItem ? `${sItem.diamonds} 💎` : `${uItem.diamonds} 💎`;
      // Нормальные цены для зачёркивания
      const normalStars = sItem ? {'100':150,'300':350,'500':500}[String(sItem.diamonds)] || '' : '';
      const normalUsdt  = uItem ? {'100':'2.99','300':'6.99','500':'9.99'}[String(uItem.diamonds)] || '' : '';
      const sRow = sItem
        ? `<div class="sh-dual-row" data-stars="${sItem.id}"><span class="sh-pr-ico">⭐</span><span class="sh-pr-v pv-s">${sItem.stars}<span style="font-size:7px;opacity:.5;text-decoration:line-through;margin-left:2px">${normalStars}</span></span><button class="sh-btn btn-s">КУПИТЬ</button></div>`
        : '';
      const uRow = uItem
        ? `<div class="sh-dual-row" data-usdt="${uItem.id}"><span class="sh-pr-ico">💲</span><span class="sh-pr-v pv-u">${uItem.usdt}<span style="font-size:7px;opacity:.5;text-decoration:line-through;margin-left:2px">${normalUsdt}</span></span><button class="sh-btn btn-u">КУПИТЬ</button></div>`
        : '';
      return `<div class="sh-card r-r" style="justify-content:flex-start;border:1px solid rgba(255,170,51,.4);box-shadow:0 0 8px rgba(255,170,51,.2)" data-s-id="${sItem?.id||''}" data-u-id="${uItem?.id||''}" data-combined="1"><div class="sh-ico" style="font-size:20px;position:relative">💎<span style="position:absolute;top:-4px;right:-4px;font-size:9px">🔥</span></div><div class="sh-nm">${label}</div><div class="sh-dual-rows">${sRow}${uRow}</div></div>`;
    }

    function _cardResetDual(sItem, uItem) {
      const sRow = sItem
        ? `<div class="sh-dual-row" data-stars="${sItem.id}"><span class="sh-pr-ico">⭐</span><span class="sh-pr-v pv-s">${sItem.stars}</span><button class="sh-btn btn-danger">СБРОС</button></div>`
        : '';
      const uRow = uItem
        ? `<div class="sh-dual-row" data-usdt="${uItem.id}"><span class="sh-pr-ico">💲</span><span class="sh-pr-v pv-u">${uItem.usdt}</span><button class="sh-btn btn-danger">СБРОС</button></div>`
        : '';
      return `<div class="sh-card r-d" style="justify-content:flex-start" data-s-id="${sItem?.id||''}" data-u-id="${uItem?.id||''}" data-combined="1"><div class="sh-ico"><img src="reset_icon.png?v=2" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 7px rgba(255,51,51,.6))"></div><div class="sh-nm">Сброс прогресса</div><div class="sh-dual-rows">${sRow}${uRow}</div></div>`;
    }

    let html = '';

    // Premium
    html += '<div class="sh-sec">👑 Premium</div>';
    if (isPrem) {
      html += `<div style="background:rgba(180,79,255,.1);border:1px solid rgba(180,79,255,.3);border-radius:11px;padding:10px 14px;font-size:12px;color:#c8a0ff;margin-bottom:8px">👑 Premium активен · ещё ${State.player.premium_days_left} дн.</div>`;
    } else {
      const sBtn = starPrem
        ? `<button class="sh-btn btn-s" data-prem-stars="${starPrem.id}" style="flex:1">⭐ ${starPrem.stars}</button>`
        : '';
      const uBtn = (usdtPrem && d.cryptopay_enabled)
        ? `<button class="sh-btn btn-u" data-prem-usdt="${usdtPrem.id}" style="flex:1">💲 ${usdtPrem.usdt} USDT</button>`
        : '';
      html += `<div class="sh-prem" style="cursor:default">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="font-size:26px">👑</div>
    <div>
      <div style="font-size:13px;font-weight:700;color:#fff">Premium подписка</div>
      <div style="font-size:10px;color:rgba(255,255,255,.45)">+15% XP · ящик · скидки · значок</div>
      <div style="font-size:10px;color:rgba(255,255,255,.25);margin-top:2px">21 день</div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:4px;min-width:90px">${sBtn}${uBtn}</div>
</div>`;
    }

    // Стартовый пак (только если не куплен)
    const starterUsed = !!(State.player?.starter_pack_used);
    if (!starterUsed && (starStarter || usdtStarter)) {
      const sBtn = starStarter
        ? `<button class="sh-btn btn-s" data-prem-stars="${starStarter.id}" style="flex:1">⭐ ${starStarter.stars}</button>`
        : '';
      const uBtn = (usdtStarter && d.cryptopay_enabled)
        ? `<button class="sh-btn btn-u" data-prem-usdt="${usdtStarter.id}" style="flex:1">💲 ${usdtStarter.usdt} USDT</button>`
        : '';
      html += `<div class="sh-sec" style="color:#ffaa33">🎁 Стартовый пак · только 1 раз</div>
<div class="sh-prem" data-starter="1" style="cursor:pointer;background:linear-gradient(135deg,rgba(255,170,51,.13),rgba(255,100,0,.08));border-color:rgba(255,170,51,.4)">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="font-size:26px">🎁</div>
    <div>
      <div style="font-size:13px;font-weight:700;color:#ffaa33">Стартовый пак</div>
      <div style="font-size:10px;color:rgba(255,255,255,.55)">200💎 · Premium 14 дн. · 2× Свиток Титана</div>
      <div style="font-size:10px;color:rgba(255,170,51,.6);margin-top:2px">только 1 раз · скидка ×4</div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:4px;min-width:90px">${sBtn}${uBtn}</div>
</div>`;
    }

    // Boxes
    const boxPairs = _matchByScrollId(starBoxes, usdtBoxes);
    if (boxPairs.length) html += `<div class="sh-sec">🎲 Эпические ящики</div><div class="sh-grid-d">${boxPairs.map(([s,u]) => _cardDual(s,u)).join('')}</div>`;
    // Scrolls
    const scrPairs = _matchByScrollId(starScrolls, usdtScrolls);
    if (scrPairs.length) html += `<div class="sh-sec">📜 Боевые свитки</div><div class="sh-grid-d">${scrPairs.map(([s,u]) => _cardDual(s,u)).join('')}</div>`;
    // Diamonds — одни 3 карточки; цена = первая покупка (со зачёркнутой) или обычная
    const firstAvail = !(State.player?.diamond_first_purchased);
    html += firstAvail
      ? `<div class="sh-sec" style="color:#ffaa33">💎 Алмазы · 🔥 скидка первой покупки</div>`
      : `<div class="sh-sec">💎 Алмазы</div>`;
    const diaHtml = [100, 300, 500].map(cnt => {
      const sf = (d.stars  || []).find(p => p.first_purchase && p.diamonds === cnt);
      const uf = (d.crypto || []).find(p => p.first_purchase && p.diamonds === cnt);
      const sn = starDia.find(p => p.diamonds === cnt);
      const un = usdtDia.find(p => p.diamonds === cnt);
      const sItem = (firstAvail && sf) ? sf : sn;
      const uItem = (firstAvail && uf) ? uf : un;
      const strikeS = (firstAvail && sf && sn) ? `<span style="font-size:7px;opacity:.45;text-decoration:line-through;margin-left:2px">${sn.stars}</span>` : '';
      const strikeU = (firstAvail && uf && un) ? `<span style="font-size:7px;opacity:.45;text-decoration:line-through;margin-left:2px">${un.usdt}</span>` : '';
      const sRow = sItem ? `<div class="sh-dual-row" data-stars="${sItem.id}"><span class="sh-pr-ico">⭐</span><span class="sh-pr-v pv-s">${sItem.stars}${strikeS}</span><button class="sh-btn btn-s">КУПИТЬ</button></div>` : '';
      const uRow = uItem ? `<div class="sh-dual-row" data-usdt="${uItem.id}"><span class="sh-pr-ico">💲</span><span class="sh-pr-v pv-u">${uItem.usdt}${strikeU}</span><button class="sh-btn btn-u">КУПИТЬ</button></div>` : '';
      const fireBorder = (firstAvail && sf) ? 'border:1px solid rgba(255,170,51,.35);box-shadow:0 0 6px rgba(255,170,51,.15)' : '';
      const fireBadge  = (firstAvail && sf) ? '<span style="position:absolute;top:-4px;right:-4px;font-size:9px">🔥</span>' : '';
      return `<div class="sh-card r-r" style="justify-content:flex-start;${fireBorder}" data-s-id="${sItem?.id||''}" data-u-id="${uItem?.id||''}" data-combined="1"><div class="sh-ico" style="position:relative;font-size:20px">💎${fireBadge}</div><div class="sh-nm">${cnt} 💎</div><div class="sh-dual-rows">${sRow}${uRow}</div></div>`;
    }).join('');
    html += `<div class="sh-grid-d">${diaHtml}</div>`;
    // Reset
    if (starReset || usdtReset) html += `<div class="sh-sec">⚠️ Danger Zone</div><div class="sh-grid-d">${_cardResetDual(starReset, usdtReset)}</div>`;

    html += '<div style="text-align:center;font-size:10px;color:rgba(0,200,255,.55);margin-top:16px;letter-spacing:.5px;text-shadow:0 0 6px rgba(0,200,255,.3)">⭐ Stars — моментально &nbsp;·&nbsp; 💲 USDT — крипто</div>';
    el.innerHTML = html;

    // Bind Premium buttons
    el.querySelectorAll('[data-prem-stars]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); ShopHtmlPay._buyStars(btn.dataset.premStars); });
    });
    el.querySelectorAll('[data-prem-usdt]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); ShopHtmlPay._buyCrypto(btn.dataset.premUsdt); });
    });
    // Клик по Стартовому паку → детальная карточка
    el.querySelector('[data-starter]')?.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON') return;
      const sId = starStarter?.id || null;
      const uId = usdtStarter?.id || null;
      ShopHtmlPay._showStarterDetail(sId, uId, starStarter, usdtStarter, d.cryptopay_enabled);
    });
    // Bind dual-row Stars buttons
    el.querySelectorAll('.sh-dual-row[data-stars] button').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); ShopHtmlPay._buyStars(btn.closest('[data-stars]').dataset.stars); });
    });
    // Bind dual-row USDT buttons
    el.querySelectorAll('.sh-dual-row[data-usdt] button').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); ShopHtmlPay._buyCrypto(btn.closest('[data-usdt]').dataset.usdt); });
    });
    // Клик по карточке целиком → детальная модалка с двумя кнопками оплаты
    el.querySelectorAll('[data-combined]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') return;
        ShopHtmlPay._showCombinedDetail(card.dataset.sId || null, card.dataset.uId || null);
      });
    });
  },

  _pkgs() { return _pkgs; },
  _resetCache() { _pkgs = null; },

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
              ShopHtml.toast(c.scroll_received ? '✅ Свиток получен! → Рюкзак' : c.profile_reset ? '🔄 Аккаунт сброшен' : c.premium_activated ? '👑 Premium активирован!' : `✅ +${c.diamonds_added || 0} 💎`);
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
          _pkgs = null; ShopHtmlPay._buildCombined();
        } else ShopHtmlPay._pollCrypto(invoiceId, attempts + 1);
      } catch(_) { ShopHtmlPay._pollCrypto(invoiceId, attempts + 1); }
    }, 5000);
  },
};
})();
