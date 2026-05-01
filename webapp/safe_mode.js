/* ============================================================
   SafeMode — диагностический переключатель визуальных эффектов.
   Убирает backdrop-filter/blur/box-shadow/text-shadow одним тогглом.
   Цель: если игра «летит» в Safe Mode — причина лагов = GPU-эффекты.

   API:
     SafeMode.toggle()   — вкл/выкл (сохраняет в localStorage)
     SafeMode.enable()   / SafeMode.disable()
     SafeMode.isOn()     → boolean
   Консоль: SafeMode.toggle()
   ============================================================ */
const SafeMode = (() => {
  const LS_KEY = 'da_safe_mode';
  const CLS    = 'da-safe-mode';

  const CSS = `
/* ── SafeMode: отключены тяжёлые GPU-эффекты ──────────────── */
body.da-safe-mode *:not(canvas) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  filter: none !important;
  box-shadow: none !important;
  text-shadow: none !important;
}
/* Индикатор Safe Mode */
#da-safe-badge {
  position: fixed;
  top: 6px; left: 50%; transform: translateX(-50%);
  z-index: 99999;
  background: #ff4455;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  padding: 2px 8px;
  border-radius: 4px;
  pointer-events: none;
  font-family: monospace;
}
`;

  let _cssInjected = false;
  function _inject() {
    if (_cssInjected) return;
    const s = document.createElement('style');
    s.id = 'da-safe-css';
    s.textContent = CSS;
    document.head.appendChild(s);
    _cssInjected = true;
  }

  function _badge(on) {
    const old = document.getElementById('da-safe-badge');
    if (old) old.remove();
    if (!on) return;
    const b = document.createElement('div');
    b.id = 'da-safe-badge';
    b.textContent = '⚡ SAFE MODE';
    document.body.appendChild(b);
  }

  function _apply(on) {
    _inject();
    document.body.classList.toggle(CLS, on);
    _badge(on);
    try { localStorage.setItem(LS_KEY, on ? '1' : '0'); } catch(_) {}
    console.log(`[SafeMode] ${on ? 'ВКЛЮЧЁН — blur/shadow отключены' : 'ВЫКЛЮЧЕН — эффекты восстановлены'}`);
  }

  // Применяем сразу при загрузке если было включено.
  // Также читаем URL-параметр ?safe=1 / ?safe=0 — удобно без консоли.
  function _init() {
    try {
      const urlParam = new URLSearchParams(location.search).get('safe');
      if (urlParam === '1') { _apply(true); return; }
      if (urlParam === '0') { _apply(false); return; }
      if (localStorage.getItem(LS_KEY) === '1') _apply(true);
    } catch(_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  return {
    enable:  () => _apply(true),
    disable: () => _apply(false),
    toggle:  () => _apply(!document.body.classList.contains(CLS)),
    isOn:    () => document.body.classList.contains(CLS),
  };
})();

if (typeof window !== 'undefined') window.SafeMode = SafeMode;
