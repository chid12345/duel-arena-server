/* wb_html_lobby_enter_protector.js — защита от мерцания кнопки «ВОЙТИ В РЕЙ»
   на ~10 минутах до спавна.

   Жалоба: «глюк был на 10 минутах показал зайти но потом сразу исчез».
   Причина: lobby всегда рендерит <div class="wb-enter">, а активирует только
   при s.active. Если сервер на короткое время вернул active=true (старый
   рейд не успел зачиститься), кнопка мигнёт до следующего refresh.

   Защита:
   1) CSS-правило — без .active/.locked точно display:none (страховка).
   2) Перехват WBHtml.render — после рендера если !state.active,
      форсим display:none через inline style. */
(() => {
  if (window.__wbzEnterProtectorLoaded) return;
  window.__wbzEnterProtectorLoaded = true;

  // Защитный CSS — даже если .wb-enter рендерится, без класса состояния
  // не показывается. Поверх дефолта display:none с !important.
  function _injectCss() {
    if (document.getElementById('wbz-enter-css')) return;
    const s = document.createElement('style');
    s.id = 'wbz-enter-css';
    s.textContent = `
      #wb-root .wb-enter:not(.active):not(.locked):not(.wb-gather-cta){display:none!important;visibility:hidden!important}
    `;
    document.head.appendChild(s);
  }

  function _suppress(state) {
    if (state?.active) return;  // активный рейд — кнопка может быть валидна
    const btn = document.querySelector('#wb-root #wb-enter-btn');
    if (!btn) return;
    // Сбрасываем .active которую могло добавить race-render
    btn.classList.remove('active');
    btn.style.display = 'none';
  }

  function _hookRender() {
    if (!window.WBHtml || !window.WBHtml.render) { setTimeout(_hookRender, 100); return; }
    if (window.WBHtml.__wbzEnterHooked) return;
    window.WBHtml.__wbzEnterHooked = true;
    _injectCss();
    const orig = window.WBHtml.render;
    window.WBHtml.render = function(scene, state) {
      orig.call(this, scene, state);
      try { _suppress(state); } catch(_) {}
    };
  }

  _hookRender();
})();
