/* ============================================================
   Viewport lock: фиксируем высоту body на tg.viewportStableHeight.
   Когда на Android открывается клавиатура, visualViewport сужается
   и Phaser.Scale.FIT ужимает canvas по обеим осям → форма «Создать
   клан» становится крошечной. С фиксацией — body высоты не меняется,
   canvas остаётся нормальным, клавиатура просто накрывает низ.
   На orientation change — обновляем.
   ============================================================ */
(function () {
  const tg = window.Telegram?.WebApp;
  function applyH(h) {
    if (!h || h < 100) return;
    document.documentElement.style.height = h + 'px';
    document.body.style.height = h + 'px';
  }
  function stableH() {
    return tg?.viewportStableHeight || tg?.viewportHeight || window.innerHeight;
  }
  if (tg) {
    try { tg.ready(); tg.expand(); } catch (_) {}
    applyH(stableH());
    tg.onEvent('viewportChanged', () => applyH(stableH()));
  } else {
    window.addEventListener('load', () => applyH(window.innerHeight));
  }
  window.addEventListener('orientationchange', () => {
    setTimeout(() => applyH(stableH()), 400);
  });
})();
