/* wb_html_battle_log.js — клиентский трекер истории боя с боссом.
   Хранит timeline всех ударов (твоих и босса) пока ты в бою.
   Live-показ во время боя + полный лог в MVP-окне после. */
(() => {
  // Каждый item: {ts, kind:'me'|'boss'|'crit', dmg, hp_after?, note?}
  const _log = [];
  let _lastSpawnId = null;
  let _lastPlayerHp = null;

  function _resetIfNewSpawn(sid) {
    if (sid && _lastSpawnId !== sid) {
      _lastSpawnId = sid;
      _log.length = 0;
      _lastPlayerHp = null;
    }
  }

  // Удар игрока по боссу (вызывается из scene._onHit при ответе сервера).
  function logMyHit(dmg, isCrit) {
    _log.push({
      ts: Date.now(),
      kind: isCrit ? 'crit' : 'me',
      dmg: dmg|0,
    });
    _trim();
  }

  // Удар босса по игроку — детектим по падению current_hp в WS-тике.
  // Вызываем из scene_world_boss_fx._applyWsEffects.
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
  }

  function _trim() {
    // Лимит 200 событий, чтобы не раздуть память за 10 мин боя
    if (_log.length > 200) _log.splice(0, _log.length - 200);
  }

  function getLog() { return _log.slice(); }
  function clearLog() { _log.length = 0; _lastPlayerHp = null; }

  // Рендерим popup с историей (вызывается из MVP-окна или панели «Лог боя»)
  function showBattleHistory() {
    const log = getLog();
    document.getElementById('wb-bhist-ov')?.remove();
    const ov = document.createElement('div');
    ov.id = 'wb-bhist-ov'; ov.className = 'wb-bhist-ov';

    // Группируем по 5-секундным «раундам» для компактности
    const rounds = [];
    let currentRound = null;
    log.forEach(it => {
      const r = Math.floor((it.ts - (log[0]?.ts || it.ts)) / 5000);
      if (!currentRound || currentRound.idx !== r) {
        currentRound = { idx: r, items: [] };
        rounds.push(currentRound);
      }
      currentRound.items.push(it);
    });

    let totalMe = 0, totalBoss = 0, hits = 0, crits = 0;
    log.forEach(it => {
      if (it.kind === 'me' || it.kind === 'crit') { totalMe += it.dmg; hits++; if (it.kind === 'crit') crits++; }
      else if (it.kind === 'boss') totalBoss += it.dmg;
    });

    const rowsHtml = rounds.map((r, i) => {
      const itemsHtml = r.items.map(it => {
        if (it.kind === 'me') return `<span class="ev me">⚔️ −${it.dmg.toLocaleString('ru')}</span>`;
        if (it.kind === 'crit') return `<span class="ev crit">💥 −${it.dmg.toLocaleString('ru')} КРИТ</span>`;
        if (it.kind === 'boss') return `<span class="ev boss">🩸 ты −${it.dmg}${it.hp_after!=null?` (HP ${it.hp_after})`:''}</span>`;
        return '';
      }).join('');
      return `<div class="wb-bhist-row">
        <span class="wb-bhist-r">P${i+1}</span>
        <span class="wb-bhist-evs">${itemsHtml}</span>
      </div>`;
    }).join('');

    ov.innerHTML = `<div class="wb-bhist">
      <div class="wb-bhist-x" id="wb-bhist-x">×</div>
      <div class="wb-bhist-h">📜 ИСТОРИЯ БОЯ <span class="cnt">(${rounds.length})</span></div>
      <div class="wb-bhist-stats">
        <span class="me">⚔️ ${totalMe.toLocaleString('ru')}</span>
        <span class="dot">·</span>
        <span class="hits">${hits} ударов${crits?` (${crits}💥)`:''}</span>
        <span class="dot">·</span>
        <span class="boss">🩸 −${totalBoss}</span>
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
    logMyHit, checkBossHit, getBattleLog: getLog, clearBattleLog: clearLog,
    showBattleHistory,
  });
})();
