/* ============================================================
   ClanScene — _makeInput: DOM <input> поверх canvas
   с автопозиционированием при resize canvas / visualViewport.
   Вынесено из scene_clan_ext.js (Закон 1: ≤200 строк).
   ============================================================ */

Object.assign(ClanScene.prototype, {

  /* gameX — x-координата в игровых пикселях; если null — центрирует.
     Позиция/размер пересчитываются через ResizeObserver(canvas) +
     visualViewport — когда на мобиле открывается клавиатура,
     Phaser FIT-масштабирует canvas, и инпут обязан сжаться вместе с ним.
     font-size:16px — иначе iOS автоматически зумит страницу. */
  _makeInput(W, y, w, h, placeholder, maxLen = 20, gameX = null) {
    const el = document.createElement('input');
    el.type = 'text'; el.placeholder = placeholder; el.maxLength = maxLen;
    el.autocomplete = 'off'; el.autocapitalize = 'off'; el.spellcheck = false;
    el.style.cssText = `position:fixed;left:0;top:0;width:0;height:0;
      padding:0 12px;background:#1e3878;color:#f0f0fa;border:2px solid #5096ffaa;
      border-radius:10px;font-size:16px;outline:none;z-index:999;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      box-sizing:border-box;-webkit-appearance:none;`;
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
    document.body.appendChild(el);

    const scene = this;
    const canvas = scene.game.canvas;
    const doReposition = () => {
      if (!el.isConnected) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 50) return;
      const sx = rect.width / W;
      const sy = rect.height / scene.H;
      const left = gameX !== null
        ? Math.round(rect.left + gameX * sx)
        : Math.round(rect.left + (W - w) / 2 * sx);
      const top  = Math.round(rect.top + y * sy);
      el.style.left   = left + 'px';
      el.style.top    = top  + 'px';
      el.style.width  = Math.round(w * sx) + 'px';
      el.style.height = Math.round(h * sy) + 'px';
    };
    /* Phaser пересчитывает canvas асинхронно (после window.resize), поэтому
       getBoundingClientRect сразу после resize может вернуть старые размеры.
       Делаем несколько попыток: сразу + 2 кадра + 100мс. */
    const reposition = () => {
      doReposition();
      requestAnimationFrame(() => {
        doReposition();
        requestAnimationFrame(doReposition);
      });
      setTimeout(doReposition, 100);
    };
    reposition();

    const vp = window.visualViewport;
    const ro = ('ResizeObserver' in window) ? new ResizeObserver(reposition) : null;
    ro?.observe(canvas);
    window.addEventListener('resize', reposition);
    window.addEventListener('orientationchange', reposition);
    vp?.addEventListener('resize', reposition);
    vp?.addEventListener('scroll', reposition);

    /* Сдвиг canvas вверх если инпут под клавиатурой. Общий state через
       window._kbdShift — несколько инпутов работают согласованно.
       reposition() после transform — getBoundingClientRect вернёт новые
       координаты, инпут плавно уйдёт за canvas. */
    const shiftCanvas = (px) => {
      if (window._kbdShift === px) return;
      window._kbdShift = px;
      canvas.style.transition = 'transform 0.2s ease-out';
      canvas.style.transform  = px ? `translateY(${-px}px)` : '';
      reposition();
    };
    el.addEventListener('focus', () => {
      setTimeout(() => {
        if (!vp) return;
        const r = el.getBoundingClientRect();
        const viewBottom = (vp.offsetTop || 0) + vp.height;
        const diff = Math.round(r.bottom - viewBottom + 16);
        if (diff > 0) shiftCanvas(diff);
      }, 300);
    });
    el.addEventListener('blur', () => {
      setTimeout(() => {
        if (!(document.activeElement instanceof HTMLInputElement)) shiftCanvas(0);
      }, 150);
    });

    const cleanup = () => {
      ro?.disconnect();
      window.removeEventListener('resize', reposition);
      window.removeEventListener('orientationchange', reposition);
      vp?.removeEventListener('resize', reposition);
      vp?.removeEventListener('scroll', reposition);
      el.remove();
      if (window._kbdShift) shiftCanvas(0);
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy',  cleanup);
    return el;
  },

});
