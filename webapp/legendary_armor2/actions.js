/* ============================================================
   legendary_armor2/actions.js — _doAction со всеми ветками:
   buy_usdt / buy_stars / train / untrain / passive / apply /
   reset_usdt / reset_stars.
   ============================================================ */
(() => {

  const N = window.LA2;

  N._doAction = async function (act, params) {
    if (N._busy) return;
    N._busy = true;
    try {
      if (act === 'buy_usdt') {
        const inv = await N._api('/api/equipment/armor2_legendary_usdt_invoice', {});
        if (!inv?.ok) { N._notify('❌ ' + (inv?.reason || 'Ошибка'), false); return; }
        const tg = window.Telegram?.WebApp;
        const url = inv.invoice_url || '';
        try {
          if (inv.web_app_url) tg?.openLink?.(inv.web_app_url);
          else if (url.startsWith('https://t.me/') || url.startsWith('tg://')) tg?.openTelegramLink?.(url);
          else tg?.openLink?.(url);
        } catch (_) { }
        N._notify('💳 Счёт USDT открыт — оплатите и вернитесь');
        if (inv.invoice_id) {
          try {
            localStorage.setItem('la2PendingInvoice', String(inv.invoice_id));
            localStorage.setItem('la2PendingKind', 'buy');
          } catch (_) { }
          N._startCryptoPolling(inv.invoice_id, 'buy');
        }
        return;
      }
      if (act === 'buy_stars') {
        const inv = await N._api('/api/equipment/armor2_legendary_stars_invoice', {});
        if (!inv?.ok) { N._notify('❌ ' + (inv?.reason || 'Ошибка'), false); return; }
        const tg = window.Telegram?.WebApp;
        const url = inv.invoice_url || '';
        if (typeof tg?.openInvoice === 'function') {
          tg.openInvoice(url, async (status) => {
            if (status === 'paid') {
              N._notify('✅ Легендарная броня получена!');
              tg?.HapticFeedback?.notificationOccurred('success');
              await new Promise(r => setTimeout(r, 1500));
              await N._load();
            } else if (status === 'cancelled') {
              N._notify('❌ Оплата отменена', false);
            }
          });
          return;
        }
        try {
          if (url.startsWith('https://t.me/') || url.startsWith('tg://')) tg?.openTelegramLink?.(url);
          else tg?.openLink?.(url);
        } catch (_) { }
        N._notify('⭐ Счёт Stars открыт — оплатите и вернитесь');
        return;
      }
      if (act === 'train' || act === 'untrain') {
        const ep = act === 'train' ? '/api/equipment/armor2_legendary_train' : '/api/equipment/armor2_legendary_untrain';
        const res = await N._api(ep, { stat: params.stat });
        if (res?.ok) { N._render(res.armor2_mods, true); }
        else { N._notify('❌ ' + (res?.message || 'Ошибка'), false); N._render(res?.armor2_mods, true); }
        return;
      }
      if (act === 'passive') {
        const res = await N._api('/api/equipment/armor2_legendary_passive', { passive_type: params.key });
        if (res?.ok) { N._render(res.armor2_mods, true); }
        else { N._notify('❌ ' + (res?.message || 'Ошибка'), false); }
        return;
      }
      if (act === 'apply') {
        const res = await N._api('/api/equipment/armor2_legendary_apply', {});
        if (res?.ok) { N._notify('✅ Сборка сохранена!'); N._render(res.armor2_mods, true); }
        else { N._notify('❌ ' + (res?.message || 'Ошибка'), false); }
        return;
      }
      if (act === 'reset_usdt') {
        const inv = await N._api('/api/equipment/armor2_legendary_reset_usdt_invoice', {});
        if (!inv?.ok) { N._notify('❌ ' + (inv?.reason || 'Ошибка'), false); return; }
        const tg = window.Telegram?.WebApp;
        const url = inv.invoice_url || '';
        try {
          if (inv.web_app_url) tg?.openLink?.(inv.web_app_url);
          else if (url.startsWith('https://t.me/') || url.startsWith('tg://')) tg?.openTelegramLink?.(url);
          else tg?.openLink?.(url);
        } catch (_) { }
        N._notify('💳 Счёт сброса открыт — оплатите и вернитесь');
        if (inv.invoice_id) {
          try {
            localStorage.setItem('la2PendingInvoice', String(inv.invoice_id));
            localStorage.setItem('la2PendingKind', 'reset');
          } catch (_) { }
          N._startCryptoPolling(inv.invoice_id, 'reset');
        }
        return;
      }
      if (act === 'reset_stars') {
        const inv = await N._api('/api/equipment/armor2_legendary_reset_stars_invoice', {});
        if (!inv?.ok) { N._notify('❌ ' + (inv?.reason || 'Ошибка'), false); return; }
        const tg = window.Telegram?.WebApp;
        const url = inv.invoice_url || '';
        if (typeof tg?.openInvoice === 'function') {
          tg.openInvoice(url, async (status) => {
            if (status === 'paid') {
              N._notify('⏳ Применяем сброс...', true);
              await new Promise(r => setTimeout(r, 1500));
              tg?.HapticFeedback?.notificationOccurred('success');
              N._notify('🔄 Сборка сброшена!');
              await N._load();
            } else if (status === 'cancelled') {
              N._notify('❌ Оплата отменена', false);
            }
          });
          return;
        }
        try {
          if (url.startsWith('https://t.me/') || url.startsWith('tg://')) tg?.openTelegramLink?.(url);
          else tg?.openLink?.(url);
        } catch (_) { }
        N._notify('⭐ Счёт сброса открыт — оплатите и вернитесь');
        return;
      }
    } finally {
      N._busy = false;
    }
  };

})();
