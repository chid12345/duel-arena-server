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

    const rowsHtml = rounds.map((r, i) => {
      const evHtml = r.items.map(it => {
        let tagCls, tagTxt, dmgCls, hpIco, hpVal;
        if (it.kind === 'me')   { tagCls='me';   tagTxt='МОЙ УД'; dmgCls='me';   hpIco='💀'; hpVal=it.boss_hp_after; }
        if (it.kind === 'crit') { tagCls='crit'; tagTxt='КРИТ!';  dmgCls='crit'; hpIco='💀'; hpVal=it.boss_hp_after; }
        if (it.kind === 'boss') { tagCls='boss'; tagTxt='БОСС';   dmgCls='boss'; hpIco='❤️'; hpVal=it.hp_after; }
        const hpHtml = hpVal != null
          ? `<div class="wb-bhist-hp"><span class="wb-bhist-hpico">${hpIco}</span><span class="wb-bhist-hpval">${_fmt(hpVal)}</span></div>`
          : '';
        return `<div class="wb-bhist-ev">
          <span class="wb-bhist-tag ${tagCls}">${tagTxt}</span>
          <span class="wb-bhist-arr">▶</span>
          <span class="wb-bhist-dmg ${dmgCls}">−${_fmt(it.dmg)}</span>
          ${hpHtml}
        </div>`;
      }).join('');
      return `<div class="wb-bhist-rsep">ROUND ${i+1}</div>${evHtml}`;
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
    logMyHit, checkBossHit,
    getBattleLog: getLog,
    getBattleLogForSpawn: getLogForSpawn,
    clearBattleLog: clearLog,
    showBattleHistory,
  });
})();
