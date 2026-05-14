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
  function apply() {
    /* viewportStableHeight — высота WebApp ИСКЛЮЧАЯ клавиатуру (именно
       то что нам нужно). Если 0/мусор — fallback на viewportHeight.
       Раньше использовали maxH-only-grows, но он мог застрять на
       большом старом значении (напр. 708 при реальном окне 649) —
       тогда body выше реального viewport, Phaser FIT canvas в этот
       завышенный body, и при resume Telegram refit'ит постоянно. */
    const stable = tg?.viewportStableHeight || 0;
    const current = tg?.viewportHeight || window.innerHeight || 0;
    const h = stable > 100 ? stable : current;
    if (h < 100) return;
    document.documentElement.style.height = h + 'px';
    document.body.style.height = h + 'px';
    window.__viewport_debug = {
      stable, current, inner: window.innerHeight, applied: h,
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
    setTimeout(apply, 400);
  });

  /* После resume из фона Telegram анимирует expand WebApp ~300-500мс,
     window.resize стреляет десятки раз, Phaser FIT каждый раз refit'ит
     canvas → каскад reflow HTML-оверлеев = «моргание». Лечим жёстко:
     отключаем Phaser scale listeners на время анимации, ждём 500мс,
     дёргаем refresh ровно один раз. apply() тоже один раз — после. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const sc = window.game?.scale;
    try { sc?.stopListeners?.(); } catch (_) {}
    setTimeout(() => {
      try { apply(); } catch (_) {}
      try { sc?.refresh?.(); } catch (_) {}
      try { sc?.startListeners?.(); } catch (_) {}
    }, 500);
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
