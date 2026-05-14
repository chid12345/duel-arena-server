/* ============================================================
   GhostTapGuard — блокировщик «протекающих» тапов.
   Когда HTML-overlay закрывается, pointer-up палец может попасть
   на элемент под ним → ложный клик (на кнопку Tab-бара, на слот
   соседнего предмета, на Phaser-сцену под canvas).
   GhostTapGuard.block(ms) ставит capture-фазу blocker на N мс:
   все pointer/touch/mouse/click события глотаются до его снятия.
   Использование:
     window.GhostTapGuard.block(300);
     overlay.remove();
   ============================================================ */

window.GhostTapGuard = (() => {
  const EVS = ['click','touchstart','touchend','mousedown','mouseup','pointerdown','pointerup','dblclick'];
  let active = 0;
  let timer = 0;
  const blocker = ev => { ev.stopPropagation(); ev.preventDefault(); };

  function block(ms) {
    if (typeof document === 'undefined') return;
    if (!active) EVS.forEach(e => document.addEventListener(e, blocker, true));
    active++;
    clearTimeout(timer);
    timer = setTimeout(() => {
      active = 0;
      EVS.forEach(e => { try { document.removeEventListener(e, blocker, true); } catch(_) {} });
    }, ms || 300);
  }

  return { block };
})();
