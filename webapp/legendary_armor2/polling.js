/* ============================================================
   legendary_armor2/polling.js — крипто-поллинг после buy_usdt /
   reset_usdt. Чистит la2PendingInvoice / la2PendingKind в
   localStorage и подтягивает свежий /api/player в State.
   ============================================================ */
(() => {

  const N = window.LA2;

  // Максимальное «время жизни» pending invoice. После этого считаем что
  // покупка зависла или давно закрыта — чистим, чтобы не плодить призраки.
  const _PENDING_TTL_MS = 30 * 60 * 1000;  // 30 минут

  // In-memory флаг: авто-открытие LegendaryArmor2 после успешной выдачи
  // допустимо только если polling был стартован В ЭТОЙ сессии (act='buy'
  // → _doAction → _startCryptoPolling сразу же). При _resumePolling из
  // прошлой сессии флаг false → авто-открытие НЕ запускаем, иначе
  // оверлей раскатки статов вылетает рандомно при каждом visibilitychange.
  let _autoOpenOnPaid = false;

  function _clearPending() {
    try {
      localStorage.removeItem('la2PendingInvoice');
      localStorage.removeItem('la2PendingKind');
      localStorage.removeItem('la2PendingTs');
    } catch (_) { }
  }

  N._clearPending = _clearPending;

  N._startCryptoPolling = function (invoiceId, kind, opts) {
    if (N._pollTimer) { clearTimeout(N._pollTimer); N._pollTimer = null; }
    // Если стартовали polling из текущей сессии (opts.fresh === true) —
    // разрешаем авто-открытие LegendaryArmor2 после paid. На resume — нет.
    _autoOpenOnPaid = !!(opts && opts.fresh);
    // Свежая покупка этой сессии → показываем красивый статус-оверлей.
    if (_autoOpenOnPaid && window.PaymentStatus) {
      window.PaymentStatus.show({
        title: 'Доспех Светоносного Бога',
        onManualCheck: () => { try { N._pollTimer && clearTimeout(N._pollTimer); tick(); } catch (_) { } },
      });
    }
    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        const apiBase = (typeof API !== 'undefined' && API) ? API : '';
        const r = await fetch(apiBase + `/api/shop/crypto_check/${invoiceId}`, { cache: 'no-store' }).then(x => x.json());
        if (r && r.ok && r.paid) {
          _clearPending();
          try {
            const init_data = window.Telegram?.WebApp?.initData || (window.State && State.initData) || '';
            const pd = await fetch(apiBase + '/api/player', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
              cache: 'no-store',
              body: JSON.stringify({ init_data }),
            }).then(x => x.json());
            if (pd) {
              if (Array.isArray(pd.owned_armor2)) State.ownedArmor2 = pd.owned_armor2;
              if (pd.equipment) State.equipment = pd.equipment;
              if (pd.player) { State.player = pd.player; State.playerLoadedAt = Date.now(); }
            }
          } catch (_) { }
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
          const _paidMsg = kind === 'reset' ? '🔄 Сборка сброшена!' : '✅ Легендарная броня получена!';
          if (window.PaymentStatus && window.PaymentStatus.isOpen()) window.PaymentStatus.success(_paidMsg);
          else N._notify(_paidMsg);
          if (document.getElementById('la2-root')) {
            await N._load();
          } else if (kind === 'buy' && _autoOpenOnPaid && window.LegendaryArmor2) {
            // Авто-открытие окна распределения статов сразу после выдачи —
            // ТОЛЬКО для свежей покупки этой сессии. Resume не открывает.
            try { setTimeout(() => window.LegendaryArmor2.open(null, null), 600); } catch (_) { }
          }
          _autoOpenOnPaid = false;
          return;
        }
      } catch (_) { }
      if (attempts < 60) N._pollTimer = setTimeout(tick, 5000);
    };
    N._pollTimer = setTimeout(tick, 800);
  };

  N._resumePolling = function () {
    try {
      const pid = localStorage.getItem('la2PendingInvoice');
      if (!pid) return;
      // Старые ключи без timestamp = stale (от прежней версии кода) → чистим.
      const tsRaw = localStorage.getItem('la2PendingTs');
      const ts = tsRaw ? parseInt(tsRaw, 10) : 0;
      if (!ts || Date.now() - ts > _PENDING_TTL_MS) {
        _clearPending();
        return;
      }
      const pkind = localStorage.getItem('la2PendingKind') || 'buy';
      // opts.fresh = false → не открывать LegendaryArmor2 авто-оверлеем.
      N._startCryptoPolling(pid, pkind, { fresh: false });
    } catch (_) { }
  };

  try {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) N._resumePolling(); });
    window.addEventListener('focus', () => N._resumePolling());
    setTimeout(() => N._resumePolling(), 1500);
  } catch (_) { }

})();
