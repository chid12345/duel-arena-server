/* wb_html_qte.js — QTE «Коллективный удар» в бою WB.
   Расширяет window.WBHtml: showQTE(data), updateQTE(data), hideQTE() */
(() => {
  let _qteTimer = null;

  function _getZone() { return document.getElementById('wb-boss-zone'); }

  function showQTE(data) {
    hideQTE();
    const zone = _getZone(); if (!zone) return;
    const total = data?.required || 10;
    const cur   = data?.count    || 0;
    const secs  = data?.seconds  || 5;

    const ov = document.createElement('div'); ov.id = 'wb-qte-ov'; ov.className = 'wb-qte-ov';
    ov.innerHTML = `
      <div class="wb-qte-title">⚡ КОЛЛЕКТИВНЫЙ УДАР ⚡</div>
      <div class="wb-qte-btn" id="wb-qte-tap">
        <div class="wb-qte-lbl">ВСЕ ЖМУТ</div>
        <div class="wb-qte-ic">💥</div>
        <div class="wb-qte-cnt" id="wb-qte-cnt">${cur} / ${total}</div>
      </div>
      <div class="wb-qte-bar-wrap">
        <div class="wb-qte-bar-lbl">ОСТАЛОСЬ: <span id="wb-qte-sec">${secs.toFixed(1)}</span>с</div>
        <div class="wb-qte-bar"><div class="wb-qte-bar-fill" id="wb-qte-fill" style="width:100%"></div></div>
      </div>`;
    zone.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    ov.querySelector('#wb-qte-tap')?.addEventListener('click', () => {
      try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch(_) {}
      window.WBHtml._scene?._onQteTap?.();
    });

    // локальный обратный отсчёт
    let elapsed = 0;
    const total_ms = secs * 1000;
    _qteTimer = setInterval(() => {
      elapsed += 100;
      const left = Math.max(0, (total_ms - elapsed) / 1000);
      const secEl = document.getElementById('wb-qte-sec');
      const fillEl = document.getElementById('wb-qte-fill');
      if (secEl)  secEl.textContent = left.toFixed(1);
      if (fillEl) fillEl.style.width = ((total_ms - elapsed) / total_ms * 100) + '%';
      if (elapsed >= total_ms) hideQTE();
    }, 100);
  }

  function updateQTE(data) {
    const cnt = document.getElementById('wb-qte-cnt');
    if (cnt) cnt.textContent = `${data.count || 0} / ${data.required || 10}`;
  }

  function hideQTE() {
    clearInterval(_qteTimer); _qteTimer = null;
    const ov = document.getElementById('wb-qte-ov');
    if (!ov) return;
    ov.classList.remove('open');
    setTimeout(() => ov.remove(), 200);
  }

  Object.assign(window.WBHtml, { showQTE, updateQTE, hideQTE });
})();
