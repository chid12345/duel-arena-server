/* wb_html_result.js — экран итогов рейда (MVP RAID) по raid_boss_preview.html
   Показывается при наличии unclaimed_rewards. На "ПОЛУЧИТЬ НАГРАДУ" → scene._claimReward. */
(() => {
  function _esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function _subtitle(pct, win) {
    if (!win) {
      if (pct >= 25) return '💔 ПОЧТИ ПОЛУЧИЛОСЬ';
      if (pct >= 10) return '⚔️ ХРАБРЫЙ БОЕЦ';
      return '💀 ПОПЫТКА УЧТЕНА';
    }
    if (pct >= 50) return '⚡ РАЗРУШИТЕЛЬ БОССОВ ⚡';
    if (pct >= 25) return '⚔️ ВОИН РЕЙДА ⚔️';
    if (pct >= 10) return '🛡️ ВЕТЕРАН РЕЙДА 🛡️';
    return '🌟 УЧАСТНИК РЕЙДА 🌟';
  }
  function _bottomMsg(pct, win) {
    if (!win) {
      if (pct >= 25) return 'Босс был сильнее... но ты дрался достойно. В следующий раз — точно повезёт! 💪';
      if (pct >= 10) return 'Не сдавайся! Каждый удар приближает к победе. До встречи в рейде ⚔️';
      return 'Поражение — это шаг к победе. Точи меч и возвращайся! 🗡️';
    }
    if (pct >= 50) return '👑 Босс пал от твоей руки! Легендарный воин!';
    if (pct >= 25) return 'Без тебя победа была бы невозможна! 🏆';
    return 'Вместе мы победили! Каждый удар важен ⚔️';
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
    const head = win ? '👑 MVP RAID' : '💀 ПОРАЖЕНИЕ';
    const sub = _subtitle(r.contribution_pct||0, win);
    const msg = _bottomMsg(r.contribution_pct||0, win);

    document.getElementById('wb-mvp-ov')?.remove();
    const ov = document.createElement('div');
    ov.id = 'wb-mvp-ov'; ov.className = 'wb-mvp-ov' + (win ? '' : ' lose');

    const rewards = [];
    if (r.gold)     rewards.push(`💰 ${r.gold}`);
    if (r.exp)      rewards.push(`⭐ ${r.exp}`);
    if (r.diamonds) rewards.push(`💎 ${r.diamonds}`);
    let chest = '';
    if (r.chest_type === 'wb_diamond_chest') {
      chest = `<div class="wb-mvp-chest">💠 Алмазный сундук рейда · топ-1 по урону</div>`;
    } else if (r.chest_type === 'scroll_all_12') {
      chest = `<div class="wb-mvp-chest">✨ Свиток «+12 ко всем пассивкам» · удача 3%!</div>`;
    } else if (r.chest_type) {
      chest = `<div class="wb-mvp-chest">🎁 ${_esc(r.chest_type)}</div>`;
    }

    ov.innerHTML = `<div class="wb-mvp">
      <div class="wb-mvp-bdg">${head}</div>
      <div class="wb-mvp-av">${avatar}</div>
      <div class="wb-mvp-name">@${_esc(name)}</div>
      <div class="wb-mvp-sub">${sub}</div>
      <div class="wb-mvp-dmg">Урон: <span>${(dmg||0).toLocaleString('ru')}</span></div>
      ${rewards.length ? `<div class="wb-mvp-rew">${rewards.join('   ')}</div>` : ''}
      ${chest}
      <div class="wb-mvp-msg">${msg}</div>
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
