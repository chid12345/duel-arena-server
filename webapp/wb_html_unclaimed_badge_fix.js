/* wb_html_unclaimed_badge_fix.js — фикс тапа по плашке «🎁 У тебя есть незабранная награда».

   На телефоне тап вызывал рефреш сцены и выкидывал в лобби WB вместо
   открытия MVP-попапа. Причина — гонка обработчика клика с polling-рефрешем
   и побочные эффекты делегации в wb_html_lobby.js (559 строк, не трогаем).

   Решение: capture-listener на document перехватывает клик ДО других
   обработчиков, останавливает bubbling и явно открывает popup. */
(() => {
  if (window.__wbzBadgeFixLoaded) return;
  window.__wbzBadgeFixLoaded = true;

  function _openMvp(e) {
    const badge = e.target?.closest?.('.wb-unclaimed[data-act="show-rewards"]');
    if (!badge) return;
    // Останавливаем bubble в lobby/scene — иначе на phone какие-то побочки
    // (refresh / scene restart) выкидывают в WB-лобби.
    e.stopPropagation();
    e.preventDefault();
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    // Явно открываем MVP-попап (force=true чтобы обойти кэш _shownRewards).
    setTimeout(() => {
      try {
        const sc = window.WBHtml?._scene;
        const st = sc?._state;
        if (window.WBHtml?.showMvpResult) {
          window.WBHtml.showMvpResult(st, sc, { force: true });
        }
      } catch(err) {
        console.warn('[wbz badge fix] mvp open err:', err);
      }
    }, 0);
  }

  // Capture-фаза — этот listener выполняется ПЕРВЫМ, до bubbling-обработчиков
  // в lobby и canvas. stopPropagation блокирует дальнейшую цепочку.
  document.addEventListener('click', _openMvp, true);
  document.addEventListener('touchend', _openMvp, true);
})();
