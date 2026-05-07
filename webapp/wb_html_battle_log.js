/* wb_html_battle_log.js — клиентский трекер истории боя с боссом.
   Хранит timeline всех ударов (твоих и босса) пока ты в бою.
   Live-показ во время боя + полный лог в MVP-окне после.
   Persist в localStorage по spawn_id — переживает закрытие webapp. */
(() => {
  // Каждый item: {ts, kind:'me'|'boss'|'crit', dmg, boss_hp_after?, hp_after?}
  const _log = [];
  let _lastSpawnId = null;
  let _lastPlayerHp = null;

  // Хранилка: при закрытии webapp _log в памяти умирает, поэтому пишем в LS
  // по spawn_id. При повторном открытии (например, чтобы посмотреть лог в MVP-окне)
  // лог восстановится без 0/0 в fallback-агрегате.
  const _LS_KEY = (sid) => `wb_battle_log_${sid}`;

  function _saveToLS(sid) {
    if (!sid) return;
    try { localStorage.setItem(_LS_KEY(sid), JSON.stringify(_log)); } catch(_) {}
  }
  function _loadFromLS(sid) {
    if (!sid) return [];
    try {
      const raw = localStorage.getItem(_LS_KEY(sid));
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch(_) { return []; }
  }
  function _cleanupOldLS(keepSid) {
    // Чистим логи старых рейдов чтобы LS не разрастался.
    try {
      const keep = keepSid ? _LS_KEY(keepSid) : null;
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('wb_battle_log_') && k !== keep) {
          localStorage.removeItem(k);
        }
      });
    } catch(_) {}
  }

  function _resetIfNewSpawn(sid) {
    if (sid && _lastSpawnId !== sid) {
      _lastSpawnId = sid;
      _log.length = 0;
      _lastPlayerHp = null;
      // Восстанавливаем лог с диска: если игрок зашёл в тот же рейд после
      // refresh — продолжаем трекать поверх существующего timeline.
      const restored = _loadFromLS(sid);
      if (restored.length) _log.push(...restored);
      _cleanupOldLS(sid);
    }
  }

  // Удар игрока по боссу (вызывается из scene._onHit при ответе сервера).
  function logMyHit(dmg, isCrit, boss_hp_after) {
    _log.push({
      ts: Date.now(),
      kind: isCrit ? 'crit' : 'me',
      dmg: dmg|0,
      boss_hp_after: boss_hp_after != null ? (boss_hp_after|0) : null,
    });
    _trim();
    _saveToLS(_lastSpawnId);
  }

  // Удар босса по игроку — детектим по падению current_hp в WS-тике.
  function checkBossHit(prev_hp, new_hp) {
    if (typeof prev_hp !== 'number' || typeof new_hp !== 'number') return;
    if (new_hp >= prev_hp) return;
    const dmg = prev_hp - new_hp;
    _log.push({
      ts: Date.now(),
      kind: 'boss',
      dmg,
      hp_after: new_hp,
    });
    _trim();
    _saveToLS(_lastSpawnId);
  }

  function _trim() {
    if (_log.length > 200) _log.splice(0, _log.length - 200);
  }

  // Смерть игрока в рейде (kind='died') — записываем для лога.
  function logDeath() {
    _log.push({ ts: Date.now(), kind: 'died' });
    _trim();
    _saveToLS(_lastSpawnId);
  }

  // Воскрешение свитком (kind='resurrect') — пишем какой свиток + восстановленное HP.
  function logResurrect(scrollName, hpRestored) {
    _log.push({ ts: Date.now(), kind: 'resurrect', scroll: scrollName || '', hp: hpRestored | 0 });
    _trim();
    _saveToLS(_lastSpawnId);
  }

  function getLog() { return _log.slice(); }
  function getLogForSpawn(sid) {
    // Геттер с явным spawn_id — для MVP-окна, когда _lastSpawnId уже мог
    // быть сброшен после закрытия активного рейда.
    if (sid && _lastSpawnId === sid && _log.length) return _log.slice();
    return _loadFromLS(sid);
  }
  function clearLog() { _log.length = 0; _lastPlayerHp = null; }

  function _fmt(n) { return (n|0).toLocaleString('ru'); }

  function showBattleHistory() {
    const log = getLog();
    document.getElementById('wb-bhist-ov')?.remove();
    const ov = document.createElement('div');
    ov.id = 'wb-bhist-ov'; ov.className = 'wb-bhist-ov';

    // Группируем по 5-секундным раундам
    const rounds = [];
    let cur = null;
    log.forEach(it => {
      const r = Math.floor((it.ts - (log[0]?.ts || it.ts)) / 5000);
      if (!cur || cur.idx !== r) { cur = { idx: r, items: [] }; rounds.push(cur); }
      cur.items.push(it);
    });

    let totalMe = 0, totalBoss = 0, hits = 0, crits = 0, bossHits = 0;
    log.forEach(it => {
      if (it.kind === 'me' || it.kind === 'crit') {
        totalMe += it.dmg; hits++;
        if (it.kind === 'crit') crits++;
      } else if (it.kind === 'boss') { totalBoss += it.dmg; bossHits++; }
    });

    // PvP-стиль: 1 раунд = 1 строка. Слева — мой урон по боссу, справа —
    // боссовый контр-урон. Особые события (died/resurrect) — отдельной строкой.
    const _row = (label, dmg, hpIco, hpVal, color) =>
      `<span style="color:${color};font-weight:800">${label} −${_fmt(dmg)}</span>` +
      (hpVal != null ? `<small style="color:#88bbaa;margin-left:3px;font-size:9px">${hpIco}${_fmt(hpVal)}</small>` : '');
    const rowsHtml = rounds.map((r, i) => {
      const lines = [];
      let meDmg = 0, meCrit = false, meHpAfter = null;
      let bsDmg = 0, bsHpAfter = null;
      r.items.forEach(it => {
        if (it.kind === 'me')   { meDmg += it.dmg; meHpAfter = it.boss_hp_after ?? meHpAfter; }
        if (it.kind === 'crit') { meDmg += it.dmg; meCrit = true; meHpAfter = it.boss_hp_after ?? meHpAfter; }
        if (it.kind === 'boss') { bsDmg += it.dmg; bsHpAfter = it.hp_after ?? bsHpAfter; }
        if (it.kind === 'died')      lines.push(`<div class="wbl-ev"><span style="background:rgba(255,80,160,.18);color:#ff8aa8;border-radius:4px;padding:2px 8px;font-weight:800;font-size:10px">💀 ПАЛ В БОЮ</span></div>`);
        if (it.kind === 'resurrect') lines.push(`<div class="wbl-ev"><span style="background:rgba(0,255,136,.18);color:#00ff88;border-radius:4px;padding:2px 8px;font-weight:800;font-size:10px">✨ ВОСКРЕС${it.hp?` +${it.hp} HP`:''}</span></div>`);
      });
      const meHtml = meDmg > 0 ? _row(meCrit?'⚡':'⚔', meDmg, '💀', meHpAfter, meCrit?'#ffcc00':'#4d94ff') : '';
      const bsHtml = bsDmg > 0 ? _row('💢', bsDmg, '❤', bsHpAfter, '#ff4d4d') : '';
      const _S = 'display:grid;grid-template-columns:32px 1fr 12px 1fr;gap:6px;align-items:center;padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.05);font-family:Consolas,monospace';
      const _SR = 'color:#bf00ff;font-weight:900;font-size:10px;text-shadow:0 0 4px rgba(191,0,255,.5)';
      const _SC = 'color:rgba(255,255,255,.3);text-align:center';
      const _SS = 'font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      const main = (meHtml || bsHtml)
        ? `<div style="${_S}"><span style="${_SR}">P${i+1}</span><span style="${_SS}">${meHtml||'<span style="opacity:.3">—</span>'}</span><span style="${_SC}">·</span><span style="${_SS}">${bsHtml||'<span style="opacity:.3">—</span>'}</span></div>`
        : '';
      return main + lines.join('');
    }).join('');

    ov.innerHTML = `<div class="wb-bhist">
      <div class="wb-bhist-x" id="wb-bhist-x">×</div>
      <div class="wb-bhist-h">⚔ ИСТОРИЯ БОЯ <span class="wb-bhist-cnt">/ ${rounds.length} раундов</span></div>
      <div class="wb-bhist-totals">
        <div class="wb-bhist-tme">
          <div class="wb-bhist-tlbl">⚔ МОЙ УРОН</div>
          <div class="wb-bhist-tval me">${_fmt(totalMe)}</div>
          <div class="wb-bhist-tsub">${hits} уд${crits ? ` · ${crits} крита` : ''}</div>
        </div>
        <div class="wb-bhist-tsep"></div>
        <div class="wb-bhist-tboss">
          <div class="wb-bhist-tlbl">🩸 БОСС ПО МНЕ</div>
          <div class="wb-bhist-tval boss">${_fmt(totalBoss)}</div>
          <div class="wb-bhist-tsub">${bossHits} удар${bossHits===1?'':'а'}</div>
        </div>
      </div>
      <div class="wb-bhist-list">${rowsHtml || '<div class="wb-bhist-empty">Нет данных. Зайди в бой и побей босса!</div>'}</div>
      <div class="wb-bhist-ok" id="wb-bhist-ok">ПОНЯТНО</div>
    </div>`;

    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 220); };
    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.id === 'wb-bhist-x' || e.target.id === 'wb-bhist-ok') close();
    });
  }

  Object.assign(window.WBHtml = window.WBHtml || {}, {
    _battleLog: _log,
    _resetBattleLog: _resetIfNewSpawn,
    logMyHit, checkBossHit, logDeath, logResurrect,
    getBattleLog: getLog,
    getBattleLogForSpawn: getLogForSpawn,
    clearBattleLog: clearLog,
    showBattleHistory,
  });
})();
