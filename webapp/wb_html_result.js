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
      <div id="wb-mvp-summary" class="wb-mvp-summary" style="display:none"></div>
      <div class="wb-mvp-msg">${msg}</div>
      <button class="wb-mvp-btn" id="wb-mvp-claim">ПОЛУЧИТЬ НАГРАДУ</button>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    // Подгружаем итоги рейда (победитель + везунчики свитка) и показываем.
    if (r.spawn_id) {
      _loadRaidSummary(r.spawn_id);
    }

    document.getElementById('wb-mvp-claim').addEventListener('click', () => {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success'); } catch(_) {}
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 300);
      scene?._claimReward?.(r.reward_id);
    });
  }

  async function _loadRaidSummary(spawn_id) {
    try {
      const initData = window.State?.initData || '';
      const url = `/api/world_boss/raid_summary?spawn_id=${spawn_id}&init_data=${encodeURIComponent(initData)}`;
      const resp = await fetch(url);
      const d = await resp.json();
      if (!d?.ok) return;
      _renderRaidSummary(d);
    } catch(_) {}
  }

  function _renderRaidSummary(d) {
    const box = document.getElementById('wb-mvp-summary');
    if (!box) return;
    const parts = [];
    parts.push(`<div class="wb-mvp-sum-h">📜 ИТОГИ РЕЙДА</div>`);
    if (d.winner) {
      parts.push(`<div class="wb-mvp-sum-row gold">
        <span class="wb-mvp-sum-ic">💠</span>
        <span class="wb-mvp-sum-lbl">Топ-1 урон:</span>
        <span class="wb-mvp-sum-val">@${_esc(d.winner.name)}</span>
        <span class="wb-mvp-sum-pct">${(d.winner.contribution_pct||0).toFixed(1)}%</span>
      </div>`);
    }
    if (d.scroll_winners && d.scroll_winners.length) {
      const names = d.scroll_winners.slice(0, 5).map(w => `@${_esc(w.name)}`).join(', ');
      const more = d.scroll_winners.length > 5 ? ` и ещё ${d.scroll_winners.length - 5}` : '';
      parts.push(`<div class="wb-mvp-sum-row scroll">
        <span class="wb-mvp-sum-ic">✨</span>
        <span class="wb-mvp-sum-lbl">Свиток выпал (3%):</span>
        <span class="wb-mvp-sum-val">${names}${more}</span>
      </div>`);
    }
    if (d.top3 && d.top3.length) {
      const medals = ['🥇', '🥈', '🥉'];
      const rows = d.top3.map((t, i) =>
        `<div class="wb-mvp-sum-row top3">
          <span class="wb-mvp-sum-ic">${medals[i]}</span>
          <span class="wb-mvp-sum-val">@${_esc(t.name)}</span>
          <span class="wb-mvp-sum-pct">⚔️ ${(t.damage||0).toLocaleString('ru')}</span>
        </div>`
      ).join('');
      parts.push(rows);
    }
    box.innerHTML = parts.join('');
    box.style.display = '';
  }

  Object.assign(window.WBHtml = window.WBHtml || {}, { showMvpResult });
})();
