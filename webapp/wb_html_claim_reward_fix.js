/* wb_html_claim_reward_fix.js — защитная обёртка claim награды.

   Жалоба пользователя: «не получалось забрать награду после боя».
   Возможные причины:
   - scene._claimReward не сработал (scene стал невалидный)
   - Клик не зарегистрировался
   - Ошибка не показалась пользователю

   Модуль перехватывает клик на #wb-mvp-claim через document delegation
   (MutationObserver не нужен — popup живёт в body). Делает прямой POST
   и явно показывает результат тостом. Если scene._claimReward всё-таки
   сработал — наш дубликат поймает «уже забрана» и тихо проглотит. */
(() => {
  if (window.__wbzClaimFixLoaded) return;
  window.__wbzClaimFixLoaded = true;

  // Защита от дубль-вызова (kunstantik кликает дважды или scene+мы оба)
  const _claimedIds = new Set();

  function _toast(msg) {
    try {
      const sc = window.WBHtml?._scene;
      if (sc?._toast) { sc._toast(msg); return; }
      window.WBHtml?.toast?.(msg);
    } catch(_) {}
  }

  async function _doClaim(reward_id) {
    if (!reward_id) return;
    if (_claimedIds.has(reward_id)) return;  // уже отправляли
    _claimedIds.add(reward_id);
    try {
      const r = await post('/api/world_boss/claim_reward', { reward_id });
      if (r?.ok) {
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success'); } catch(_) {}
        const parts = [];
        if (r.gold)     parts.push(`💰 ${r.gold}`);
        if (r.exp)      parts.push(`⭐ ${r.exp}`);
        if (r.diamonds) parts.push(`💎 ${r.diamonds}`);
        if (r.chest_added) parts.push('🎁 сундук');
        _toast('🏆 Награда: ' + (parts.length ? parts.join(' · ') : 'получена'));
        // Чистим из state.unclaimed_rewards чтобы не показалась снова
        try {
          const sc = window.WBHtml?._scene;
          if (sc?._state?.unclaimed_rewards) {
            sc._state.unclaimed_rewards = sc._state.unclaimed_rewards.filter(x => x.reward_id !== reward_id);
          }
        } catch(_) {}
        // Refresh state с сервера
        setTimeout(() => { try { window.WBHtml?._scene?._refresh?.(); } catch(_) {} }, 800);
      } else {
        const reason = r?.reason || 'Не удалось забрать награду';
        // «Уже забрана» — тихо (другой обработчик сработал)
        if (reason.includes('уже забрана') || reason.includes('недоступна')) return;
        _toast('❌ ' + reason);
        _claimedIds.delete(reward_id);  // дать второй шанс
      }
    } catch(err) {
      console.warn('[wbz claim fix] err:', err);
      _toast('❌ Нет соединения');
      _claimedIds.delete(reward_id);
    }
  }

  // Делегация: ловим клик/touchend на #wb-mvp-claim в body
  function _onTap(e) {
    const btn = e.target?.closest?.('#wb-mvp-claim');
    if (!btn) return;
    // Достаём reward_id из state
    let rid = null;
    try {
      const sc = window.WBHtml?._scene;
      const list = sc?._state?.unclaimed_rewards;
      if (list && list.length) rid = list[0].reward_id;
    } catch(_) {}
    if (!rid) return;
    // Не блокируем propagation — оригинальный обработчик пусть тоже отработает.
    // Но через 150мс если scene._claimReward не сделал успешный refresh,
    // наш _doClaim добьёт. _claimedIds защитит от двойного списания.
    setTimeout(() => _doClaim(rid), 150);
  }

  document.addEventListener('click', _onTap, false);
  document.addEventListener('touchend', _onTap, false);
})();
