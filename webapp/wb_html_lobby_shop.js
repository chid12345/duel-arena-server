/* wb_html_lobby_shop.js — инфо-попап буст-карточек лобби WB.
   Расширяет window.WBHtml: showBoostInfo(id, state, scene, scrollMeta, markBoughtFn) */
(() => {
  const BOOST_DESC = {
    damage_25:  'Увеличивает урон по боссу на 25%. Суммируется с другими бустами.',
    power_10:   'Урон по боссу +10%. Быстрый и недорогой буст на старт рейда.',
    defense_20: 'Снижает входящий урон от босса на 20% на весь рейд.',
    dodge_10:   'Шанс уклонения от атаки босса +10%. Поможет выжить дольше.',
    crit_10:    'Шанс критического удара +10%. Максимизирует урон в финале.',
  };

  function showBoostInfo(id, state, scene, scrollMeta, markBoughtFn) {
    const m = scrollMeta[id]; if (!m) return;
    const inv = state?.raid_scrolls_inv || {};
    const owned = inv[id] || 0;
    document.getElementById('wb-binfo-ov')?.remove();
    const ov = document.createElement('div'); ov.id = 'wb-binfo-ov'; ov.className = 'wb-binfo-ov';
    ov.innerHTML = `<div class="wb-binfo">
      <div class="wb-binfo-hdl"></div>
      <div class="wb-binfo-ic">${m.icon}</div>
      <div class="wb-binfo-title">${m.name}</div>
      <div class="wb-binfo-val">${m.val}</div>
      <div class="wb-binfo-desc">${BOOST_DESC[id]||'Боевой свиток для рейда.'}</div>
      <div class="wb-binfo-own">В запасе: <b>${owned}</b></div>
      <div class="wb-binfo-buy" id="wb-binfo-buy">${m.price} — КУПИТЬ</div>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 250); };
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    document.getElementById('wb-binfo-buy')?.addEventListener('click', () => {
      close();
      const card = document.querySelector(`[data-id="${id}"]`);
      if (card) { markBoughtFn(id); card.classList.add('bought'); }
      scene?._buyScroll?.(id);
    });
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
  }

  Object.assign(window.WBHtml, { showBoostInfo });
})();
