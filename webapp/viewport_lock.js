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
    // Берём stableHeight как базу — он не сжимается от клавиатуры.
    // window.innerHeight не используем: на Android он может вырасти выше
    // реального viewport и тогда CENTER_BOTH сдвинет canvas вниз.
    const stable = tg?.viewportStableHeight || 0;
    const current = tg?.viewportHeight || window.innerHeight || 0;
    return stable > 100 ? stable : current;
  }
  function apply() {
    const h = candidateH();
    if (h < 100) return;
    // maxH только растёт, но не выше текущего реального viewport.
    // Это предотвращает сдвиг canvas вниз при CENTER_HORIZONTALLY.
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
    /* viewportChanged может прилетать пачкой при resume из фона
       (Telegram анимирует expand): без debounce body высота прыгает,
       Phaser FIT каждый раз пересчитывает canvas → мерцание HUD/оверлеев.
       Дебаунс 120мс — apply() сработает один раз когда viewport устаканится. */
    let _vpDeb = null;
    tg.onEvent('viewportChanged', () => {
      clearTimeout(_vpDeb);
      _vpDeb = setTimeout(apply, 120);
    });
  } else {
    window.addEventListener('load', apply);
  }
  window.addEventListener('orientationchange', () => {
    maxH = 0;
    setTimeout(apply, 400);
  });

  /* После resume из фона — форсим Phaser Scale.refresh + apply, чтобы сбросить
     рассинхрон canvas-размера с body-размером, который вызывает «моргание»
     HTML-оверлеев в Telegram WebApp на Android. Задержка 250мс — даёт
     Telegram закончить анимацию expand перед пересчётом. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    setTimeout(() => {
      try { apply(); } catch (_) {}
      try { window.game?.scale?.refresh?.(); } catch (_) {}
    }, 250);
  });

  /* Debug: тройной тап в верхнем-левом углу (90×90 — крупная зона) →
     alert с диагностикой. pointerdown в capture-фазе перехватит тап
     ДО того как Phaser canvas его съест. */
  let _tapCnt = 0, _tapTimer = null;
  document.addEventListener('pointerdown', (e) => {
    if (e.clientX > 90 || e.clientY > 90) { _tapCnt = 0; return; }
    _tapCnt++;
    clearTimeout(_tapTimer);
    _tapTimer = setTimeout(() => { _tapCnt = 0; }, 800);
    if (_tapCnt >= 3) {
      _tapCnt = 0;
      const d = window.__viewport_debug || {};
      const canvas = document.querySelector('canvas');
      const r = canvas?.getBoundingClientRect();
      alert(
        `viewport_debug:\n` +
        `stable=${d.stable} current=${d.current} inner=${d.inner} applied=${d.applied}\n` +
        `body=${document.body.offsetWidth}x${document.body.offsetHeight}\n` +
        `canvas=${r ? Math.round(r.width) + 'x' + Math.round(r.height) : '?'}\n` +
        `window=${window.innerWidth}x${window.innerHeight}`
      );
    }
  }, true);
})();
