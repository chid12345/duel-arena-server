/* wb_html_result.js — экран итогов рейда (MVP RAID) по raid_boss_preview.html
   Показывается при наличии unclaimed_rewards. На "ПОЛУЧИТЬ НАГРАДУ" → scene._claimReward. */
(() => {
  function _esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function _subtitle(pct, win) {
    if (!win) return '⚰️ ПОПЫТКА УЧТЕНА';
    if (pct >= 50) return '⚡ РАЗРУШИТЕЛЬ БОССОВ ⚡';
    if (pct >= 25) return '⚔️ ВОИН РЕЙДА ⚔️';
    if (pct >= 10) return '🛡️ ВЕТЕРАН РЕЙДА 🛡️';
    return '🌟 УЧАСТНИК РЕЙДА 🌟';
  }

  function showMvpResult(state, scene) {
    if (!state?.unclaimed_rewards?.length) return;
    const r = state.unclaimed_rewards[0];
    const ps = state.player_state || {};
    const tgu = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    const name = ps.name || tgu.username || tgu.first_name || 'Игрок';
    const avatar = ps.emoji || ps.avatar || '⚔️';
    const dmg = r.total_damage || ps.total_damage || ps.damage || r.player_damage || 0;
    const win = !!r.is_victory;
    const head = win ? '👑 MVP RAID' : '💀 БОЙ ОКОНЧЕН';
    const sub = _subtitle(r.contribution_pct||0, win);

    document.getElementById('wb-mvp-ov')?.remove();
    const ov = document.createElement('div');
    ov.id = 'wb-mvp-ov'; ov.className = 'wb-mvp-ov' + (win ? '' : ' lose');

    const rewards = [];
    if (r.gold)     rewards.push(`💰 ${r.gold}`);
    if (r.exp)      rewards.push(`⭐ ${r.exp}`);
    if (r.diamonds) rewards.push(`💎 ${r.diamonds}`);
    const chest = r.chest_type
      ? `<div class="wb-mvp-chest">${r.chest_type==='wb_diamond_chest'?'💠 Алмазный':'🏆 Золотой'} сундук рейда</div>` : '';

    ov.innerHTML = `<div class="wb-mvp">
      <div class="wb-mvp-bdg">${head}</div>
      <div class="wb-mvp-av">${avatar}</div>
      <div class="wb-mvp-name">@${_esc(name)}</div>
      <div class="wb-mvp-sub">${sub}</div>
      <div class="wb-mvp-dmg">Урон: <span>${(dmg||0).toLocaleString('ru')}</span></div>
      ${rewards.length ? `<div class="wb-mvp-rew">${rewards.join('   ')}</div>` : ''}
      ${chest}
      <button class="wb-mvp-btn" id="wb-mvp-claim">ПОЛУЧИТЬ НАГРАДУ</button>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    document.getElementById('wb-mvp-claim').addEventListener('click', () => {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success'); } catch(_) {}
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 300);
      scene?._claimReward?.(r.reward_id);
    });
  }

  Object.assign(window.WBHtml = window.WBHtml || {}, { showMvpResult });
})();
