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

  // Set «уже показывали этот reward» — без него поп-ап всплывал заново
  // на каждом _refresh (раз в 8 сек) пока награду не забрали.
  // Хранится в модуле — сбрасывается на полный reload страницы.
  // Если игрок закрыл — может вернуться через кнопку в лобби (force=true).
  const _shownRewards = new Set();

  function showMvpResult(state, scene, opts) {
    if (!state?.unclaimed_rewards?.length) return;
    const r = state.unclaimed_rewards[0];
    const force = opts && opts.force;
    if (!force && _shownRewards.has(r.reward_id)) return;
    _shownRewards.add(r.reward_id);
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
      chest = `<div class="wb-mvp-chest">✨ Свиток «+12 ко всем пассивкам» · удача 5%!</div>`;
    } else if (r.chest_type) {
      chest = `<div class="wb-mvp-chest">🎁 ${_esc(r.chest_type)}</div>`;
    }

    // Статы боя — что показать в логе при клике на «📜 Лог боя».
    const hits = ps.hits_count || 0;
    const avgDmg = hits ? Math.round((dmg||0) / hits) : 0;
    const recHp = (ps.max_hp || 0) - (ps.current_hp || 0);
    const hpPct = ps.max_hp ? Math.round(((ps.current_hp||0) / ps.max_hp) * 100) : 0;

    ov.innerHTML = `<div class="wb-mvp">
      <div class="wb-mvp-x" id="wb-mvp-x" title="Закрыть">×</div>
      <div class="wb-mvp-bdg">${head}</div>
      <div class="wb-mvp-av">${avatar}</div>
      <div class="wb-mvp-name">@${_esc(name)}</div>
      <div class="wb-mvp-sub">${sub}</div>
      <div class="wb-mvp-dmg">Урон: <span>${(dmg||0).toLocaleString('ru')}</span></div>
      ${rewards.length ? `<div class="wb-mvp-rew">${rewards.join('   ')}</div>` : ''}
      ${chest}
      <div id="wb-mvp-summary" class="wb-mvp-summary" style="display:none"></div>
      <div class="wb-mvp-log-btn" id="wb-mvp-log">📜 Лог боя</div>
      <div class="wb-mvp-msg">${msg}</div>
      <button class="wb-mvp-btn" id="wb-mvp-claim">ПОЛУЧИТЬ НАГРАДУ</button>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    // Подгружаем итоги рейда (победитель + везунчики свитка) и показываем.
    if (r.spawn_id) {
      _loadRaidSummary(r.spawn_id);
    }

    const _close = () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 300);
    };
    document.getElementById('wb-mvp-x')?.addEventListener('click', _close);
    document.getElementById('wb-mvp-log')?.addEventListener('click', () => {
      // Новый пораундовый лог из клиентского трекера wb_html_battle_log.js
      // (показывает каждый удар: твой/босса с временем). Лог хранится в LS
      // по spawn_id и переживает закрытие webapp. Fallback — только если
      // действительно нет данных (например, открыли MVP с другого устройства).
      const fromLS = window.WBHtml?.getBattleLogForSpawn?.(r.spawn_id) || [];
      const inMem  = window.WBHtml?.getBattleLog?.() || [];
      const tracker = fromLS.length ? fromLS : inMem;
      if (tracker.length > 0 && window.WBHtml?.showBattleHistory) {
        // Подменяем in-memory лог на LS-копию, чтобы showBattleHistory её увидел.
        if (fromLS.length && !inMem.length && window.WBHtml._battleLog) {
          window.WBHtml._battleLog.push(...fromLS);
        }
        window.WBHtml.showBattleHistory();
      } else {
        _showBattleLog({
          name, avatar, win,
          damage: dmg||0, hits, avg: avgDmg, crits: ps.crits||0,
          received: recHp, hp_left: ps.current_hp||0, max_hp: ps.max_hp||0, hp_pct: hpPct,
          contribution: r.contribution_pct||0,
          gold: r.gold||0, exp: r.exp||0, diamonds: r.diamonds||0,
        });
      }
    });
    document.getElementById('wb-mvp-claim').addEventListener('click', () => {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success'); } catch(_) {}
      _close();
      scene?._claimReward?.(r.reward_id);
    });
  }

  // ── Лог боя (статы за один рейд) ─────────────────────────────────
  // Fallback показывается ТОЛЬКО если новый пораундовый трекер пуст
  // (например, рейд из другого устройства / очень редкая ситуация).
  // Не показываем строки с нулями — лучше скрыть, чем вводить в заблуждение.
  function _showBattleLog(s) {
    document.getElementById('wb-blog-ov')?.remove();
    const ov = document.createElement('div');
    ov.id = 'wb-blog-ov'; ov.className = 'wb-blog-ov';
    const rows = [];
    rows.push(`<div class="wb-blog-row good"><span class="ic">⚔️</span><span class="lbl">Нанёс урон</span><span class="val">${s.damage.toLocaleString('ru')}</span></div>`);
    if (s.hits > 0) {
      rows.push(`<div class="wb-blog-row"><span class="ic">🎯</span><span class="lbl">Ударов</span><span class="val">${s.hits}</span></div>`);
      rows.push(`<div class="wb-blog-row"><span class="ic">📊</span><span class="lbl">Средний урон</span><span class="val">${s.avg.toLocaleString('ru')}</span></div>`);
    }
    if (s.crits) rows.push(`<div class="wb-blog-row"><span class="ic">💥</span><span class="lbl">Критов</span><span class="val">${s.crits}</span></div>`);
    if (s.received > 0) rows.push(`<div class="wb-blog-row bad"><span class="ic">🩸</span><span class="lbl">Получил урона</span><span class="val">${s.received.toLocaleString('ru')}</span></div>`);
    if (s.max_hp > 0) rows.push(`<div class="wb-blog-row"><span class="ic">❤️</span><span class="lbl">HP в конце</span><span class="val">${s.hp_left}/${s.max_hp} (${s.hp_pct}%)</span></div>`);
    rows.push(`<div class="wb-blog-row"><span class="ic">🏆</span><span class="lbl">Вклад в победу</span><span class="val">${(s.contribution).toFixed(1)}%</span></div>`);
    ov.innerHTML = `<div class="wb-blog">
      <div class="wb-blog-x" id="wb-blog-x">×</div>
      <div class="wb-blog-h">📜 ЛОГ БОЯ</div>
      <div class="wb-blog-sub">@${_esc(s.name)} ${s.avatar}  ·  ${s.win ? '✅ ПОБЕДА' : '❌ ПОРАЖЕНИЕ'}</div>

      <div class="wb-blog-grid">
        ${rows.join('')}
      </div>

      <div class="wb-blog-rew">
        ${s.gold ? `💰 ${s.gold}` : ''} ${s.exp ? `⭐ ${s.exp}` : ''} ${s.diamonds ? `💎 ${s.diamonds}` : ''}
      </div>

      <div class="wb-blog-ok" id="wb-blog-ok">ПОНЯТНО</div>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 220); };
    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.id === 'wb-blog-x' || e.target.id === 'wb-blog-ok') close();
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
        <span class="wb-mvp-sum-lbl">Свиток выпал (5%):</span>
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
