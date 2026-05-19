/* webapp/rental_pay.js — общая логика аренды mythic (Этап 8 редизайна).
 *
 * Используется во всех 5 overlay-каталогах (helmet/shield/boots/ring/weapon).
 * Кнопка-builder открывает модалку выбора Stars/USDT в киберпанк-стиле.
 *
 * Использование:
 *   const html = RentalPay.buildButton(item.id);
 *   // клик по data-act="buy_rental" в overlay → RentalPay.openModal(item, onSuccess, notify)
 *
 * Стили модалки переиспользуют классы .spd-* из shop_html_pay_detail.js.
 */
(function (global) {
  'use strict';

  const RENTAL_STARS = 133;   // эквивалент $2 по курсу Telegram (~67⭐/$)
  const RENTAL_USDT = '2.00';
  const RENTAL_DAYS = 7;

  function buildButton(itemId, _legacyArg) {
    // Открывает модалку с выбором Stars/USDT (цены в самой модалке).
    return `<button class="wd-btn btn-rental" style="margin-top:4px;font-size:10px;padding:6px 2px;width:100%;background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#dbeafe;border:1px solid rgba(96,165,250,.5);font-weight:700;letter-spacing:.3px" data-act="buy_rental" data-id="${itemId}">🕐 АРЕНДА · 7 ДНЕЙ</button>`;
  }

  // Совместимость: старый код мог звать rentalStarsFor(590).
  function rentalStarsFor(_full) { return RENTAL_STARS; }

  function _openModal(html) {
    let el = document.getElementById('rental-modal');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'rental-modal';
    el.className = 'spd-overlay';
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  }

  function openModal(item, onSuccess, notifyFn) {
    const tg = window.Telegram?.WebApp;
    const itemName = item.name || item.id;
    const itemEmoji = item.emoji || '🕐';

    const html = `
<div class="spd-card" style="border:1px solid rgba(96,165,250,.7);box-shadow:0 0 40px rgba(96,165,250,.3),0 16px 50px rgba(0,0,0,.8)">
  <div class="spd-close" data-close>×</div>
  <div class="spd-ico"><div style="font-size:64px;line-height:1;filter:drop-shadow(0 0 20px rgba(96,165,250,.7))">🕐</div></div>
  <div class="spd-name" style="text-shadow:0 0 18px rgba(96,165,250,.6)">Аренда ${RENTAL_DAYS} дней</div>
  <div class="spd-sub" style="color:rgba(160,200,255,.8)">${itemEmoji} ${itemName}</div>
  <div class="spd-rows" style="border-color:rgba(96,165,250,.2);background:rgba(96,165,250,.06)">
    <div class="spd-row"><span class="spd-row-ico">⏱️</span><span class="spd-row-txt">Срок</span><span class="spd-row-val vc">${RENTAL_DAYS} дней</span></div>
    <div class="spd-row"><span class="spd-row-ico">⚔️</span><span class="spd-row-txt">Полные статы mythic</span><span class="spd-row-val vc">да</span></div>
    <div class="spd-row"><span class="spd-row-ico">🔁</span><span class="spd-row-txt">Можно продлить</span><span class="spd-row-val vc">да</span></div>
    <div class="spd-row"><span class="spd-row-ico">⚠️</span><span class="spd-row-txt">По истечении</span><span class="spd-row-val vo">авто-снятие</span></div>
  </div>
  <button class="spd-btn spd-btn-s" data-act-s>⭐ ${RENTAL_STARS} Stars</button>
  <button class="spd-btn spd-btn-u" data-act-u>💲 ${RENTAL_USDT} USDT</button>
  <div class="spd-hint" style="color:rgba(160,200,255,.55)">⭐ Stars — моментально &nbsp;·&nbsp; 💲 USDT — крипто</div>
</div>`;
    const el = _openModal(html);
    el.querySelector('[data-close]')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    el.querySelector('[data-act-s]')?.addEventListener('click', async () => {
      el.remove();
      await _payStars(item, onSuccess, notifyFn);
    });
    el.querySelector('[data-act-u]')?.addEventListener('click', async () => {
      el.remove();
      await _payUsdt(item, onSuccess, notifyFn);
    });
  }

  async function _payStars(item, onSuccess, notifyFn) {
    const tg = window.Telegram?.WebApp;
    try {
      notifyFn('⏳ Создаём счёт аренды (Stars)...', true, true);
      const invRes = await fetch('/api/rental/stars_invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: tg?.initData || '', item_id: item.id }),
      }).then(r => r.json());
      if (!invRes?.ok) {
        notifyFn('❌ ' + (invRes?.reason || 'Ошибка'), false);
        return;
      }
      const starsUrl = invRes.invoice_url || '';
      if (typeof tg?.openInvoice === 'function') {
        tg.openInvoice(starsUrl, (status) => {
          if (status === 'paid') {
            notifyFn(`✅ Аренда оформлена — открыта на ${RENTAL_DAYS} дней!`);
            tg?.HapticFeedback?.notificationOccurred('success');
            if (typeof onSuccess === 'function') setTimeout(onSuccess, 800);
          } else if (status === 'cancelled') {
            notifyFn('❌ Оплата отменена', false);
          }
        });
        return;
      }
      try {
        if (starsUrl.startsWith('https://t.me/') || starsUrl.startsWith('tg://'))
          tg?.openTelegramLink?.(starsUrl);
        else tg?.openLink?.(starsUrl);
      } catch (_) { }
      if (!tg && starsUrl) try { window.open(starsUrl, '_blank'); } catch (_) { }
      notifyFn('⭐ Счёт аренды открыт — оплатите и вернитесь');
    } catch (e) {
      notifyFn('❌ Ошибка сети', false);
    }
  }

  async function _payUsdt(item, onSuccess, notifyFn) {
    const tg = window.Telegram?.WebApp;
    try {
      notifyFn('⏳ Создаём счёт аренды (USDT)...', true, true);
      const invRes = await fetch('/api/rental/crypto_invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: tg?.initData || '', item_id: item.id }),
      }).then(r => r.json());
      if (!invRes?.ok) {
        notifyFn('❌ ' + (invRes?.reason || 'Ошибка'), false);
        return;
      }
      const _url = invRes.invoice_url || '';
      const invoiceId = invRes.invoice_id;
      try {
        if (invRes.web_app_url) tg?.openLink?.(invRes.web_app_url);
        else if (_url.startsWith('https://t.me/') || _url.startsWith('tg://')) tg?.openTelegramLink?.(_url);
        else tg?.openLink?.(_url);
      } catch (_) { }
      if (!tg && _url) try { window.open(_url, '_blank'); } catch (_) { }
      notifyFn('💲 Счёт USDT открыт — оплатите и вернитесь');
      // Сохраняем invoice_id чтобы при возврате в мини-app продолжить polling
      // даже если игрок закрыл оверлей.
      try {
        localStorage.setItem('rentalPendingInvoice', String(invoiceId));
        localStorage.setItem('rentalPendingItemId', String(item.id));
      } catch (_) { }
      // Запускаем polling /api/shop/crypto_check — это третий из «трёх путей
      // доставки USDT» (webhook + crypto_check + recover). Если webhook не
      // сработал — клиент сам вызовет deliver_rental через crypto_check.
      if (invoiceId) _startRentalPolling(invoiceId, item, onSuccess, notifyFn);
    } catch (e) {
      notifyFn('❌ Ошибка сети', false);
    }
  }

  /* Polling /api/shop/crypto_check после открытия инвойса (до 5 мин, 5с шаг).
     Идемпотентен — повторный paid не создаёт дубликат аренды.
     При успехе — onSuccess() и убирает pending-маркер из localStorage.

     Использует global get() helper из game_globals.js — он автоматически
     добавляет ?init_data=... (без него endpoint возвращает 422). */
  function _startRentalPolling(invoiceId, item, onSuccess, notifyFn) {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const r = await (typeof get === 'function'
          ? get('/api/shop/crypto_check/' + invoiceId)
          : fetch('/api/shop/crypto_check/' + invoiceId + '?init_data=' +
              encodeURIComponent(window.Telegram?.WebApp?.initData || '')).then(x => x.json()));
        if (r && r.ok && r.paid) {
          try {
            localStorage.removeItem('rentalPendingInvoice');
            localStorage.removeItem('rentalPendingItemId');
          } catch (_) { }
          notifyFn('✅ Аренда активирована — броня надета!');
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
          if (typeof onSuccess === 'function') onSuccess();
          return;
        }
      } catch (_) { }
      if (attempts < 60) setTimeout(poll, 5000);
    };
    setTimeout(poll, 4000);
  }

  /* При загрузке: если есть pendingInvoice в localStorage — подхватываем
     polling (игрок мог закрыть приложение между оплатой и доставкой). */
  function _resumePendingRental() {
    try {
      const invoiceId = localStorage.getItem('rentalPendingInvoice');
      const itemId = localStorage.getItem('rentalPendingItemId');
      if (invoiceId && itemId) {
        _startRentalPolling(invoiceId, { id: itemId }, () => {
          // Принудительно обновляем профиль/гардероб
          try { State.playerLoadedAt = 0; } catch (_) { }
        }, (msg) => { try { console.log('[rental]', msg); } catch (_) { } });
      }
    } catch (_) { }
  }
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _resumePendingRental);
    } else {
      _resumePendingRental();
    }
  }

  // Старый API совместимости: RentalPay.rent(scene, item, onSuccess, notify)
  function rent(scene, item, onSuccess, notifyFn) {
    return openModal(item, onSuccess, notifyFn);
  }

  global.RentalPay = { buildButton, rentalStarsFor, rent, openModal };
})(window);
