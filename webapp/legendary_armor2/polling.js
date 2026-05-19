/* ============================================================
   legendary_armor2/polling.js — крипто-поллинг после buy_usdt /
   reset_usdt. Чистит la2PendingInvoice / la2PendingKind в
   localStorage и подтягивает свежий /api/player в State.
   ============================================================ */
(() => {

  const N = window.LA2;

  N._startCryptoPolling = function (invoiceId, kind) {
    if (N._pollTimer) { clearTimeout(N._pollTimer); N._pollTimer = null; }
    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        const apiBase = (typeof API !== 'undefined' && API) ? API : '';
        const r = await fetch(apiBase + `/api/shop/crypto_check/${invoiceId}`, { cache: 'no-store' }).then(x => x.json());
        if (r && r.ok && r.paid) {
          try { localStorage.removeItem('la2PendingInvoice'); localStorage.removeItem('la2PendingKind'); } catch (_) { }
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
          N._notify(kind === 'reset' ? '🔄 Сборка сброшена!' : '✅ Легендарная броня получена!');
          if (document.getElementById('la2-root')) await N._load();
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
      const pkind = localStorage.getItem('la2PendingKind') || 'buy';
      if (pid) N._startCryptoPolling(pid, pkind);
    } catch (_) { }
  };

  try {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) N._resumePolling(); });
    window.addEventListener('focus', () => N._resumePolling());
    setTimeout(() => N._resumePolling(), 1500);
  } catch (_) { }

})();
