/* webapp/rental_pay.js — общая логика аренды mythic (Этап 8 редизайна).
 *
 * Используется во всех 5 overlay-каталогах (helmet/shield/boots/ring/weapon).
 * Кнопка-builder и обработчик openInvoice — здесь, чтобы не дублировать.
 *
 * Использование:
 *   const html = RentalPay.buildButton(item.id, 295);  // вернёт HTML <button>
 *   await RentalPay.rent(scene, item, '/api/equipment/state', notify, () => refresh());
 *
 * Цена аренды (50%) считается на сервере, на клиенте — для UI достаточно.
 */
(function (global) {
  'use strict';

  function buildButton(itemId, rentalStars) {
    // Маленькая кнопка-плашка под основными ⭐/💳.
    return `<button class="wd-btn btn-rental" style="margin-top:4px;font-size:10px;padding:5px 2px;width:100%;background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#dbeafe;border:1px solid rgba(96,165,250,.5)" data-act="buy_rental" data-id="${itemId}">🕐 Аренда 7д · ⭐ ${rentalStars}</button>`;
  }

  function rentalStarsFor(fullStars) {
    return Math.max(1, Math.round(Number(fullStars) * 0.5));
  }

  async function rent(scene, item, onSuccess, notifyFn) {
    /**
     * Открывает Stars-инвойс аренды. После 'paid' — вызывает onSuccess для refresh.
     * notifyFn(msg, ok=true, persist=false) — UI-уведомления.
     */
    const tg = window.Telegram?.WebApp;
    try {
      notifyFn('⏳ Создаём счёт аренды...', true, true);
      const invRes = await fetch('/api/rental/stars_invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          init_data: tg?.initData || '',
          item_id: item.id,
        }),
      }).then(r => r.json());
      if (!invRes?.ok) {
        notifyFn('❌ ' + (invRes?.reason || 'Ошибка'), false);
        return;
      }
      const starsUrl = invRes.invoice_url || '';
      if (typeof tg?.openInvoice === 'function') {
        tg.openInvoice(starsUrl, async (status) => {
          if (status === 'paid') {
            notifyFn('✅ Аренда оформлена — открыта на 7 дней!');
            tg?.HapticFeedback?.notificationOccurred('success');
            if (typeof onSuccess === 'function') {
              setTimeout(onSuccess, 800);  // даём боту дописать в БД
            }
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

  global.RentalPay = { buildButton, rentalStarsFor, rent };
})(window);
