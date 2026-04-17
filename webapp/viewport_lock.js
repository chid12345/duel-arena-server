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
  let maxH = 0;
  function candidateH() {
    return Math.max(
      tg?.viewportStableHeight || 0,
      tg?.viewportHeight || 0,
      window.innerHeight || 0,
    );
  }
  function apply() {
    const h = candidateH();
    if (h < 100) return;
    if (h > maxH) maxH = h;
    document.documentElement.style.height = maxH + 'px';
    document.body.style.height = maxH + 'px';
    /* Для отладки — можно открыть в eruda/vConsole */
    window.__viewport_debug = {
      stable: tg?.viewportStableHeight,
      current: tg?.viewportHeight,
      inner: window.innerHeight,
      applied: maxH,
    };
  }
  if (tg) {
    try { tg.ready(); tg.expand(); } catch (_) {}
    /* Серия попыток — Telegram expand асинхронный, первые значения могут
       быть малыми. Берём МАКСИМУМ из всех увиденных. */
    [0, 100, 300, 700, 1500].forEach(d => setTimeout(apply, d));
    tg.onEvent('viewportChanged', apply);
  } else {
    window.addEventListener('load', apply);
  }
  window.addEventListener('orientationchange', () => {
    maxH = 0;
    setTimeout(apply, 400);
  });
})();
