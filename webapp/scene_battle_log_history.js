/* ============================================================
   BattleLog — история раундов (попап).
   Дизайн идентичен истории боя с боссом (wb-bhist-* классы).
   Патчит BattleLog: showHistory / hideHistory.
   ============================================================ */
(() => {

  function _ensureCSS() {
    try { WBBattleCSS?.inject?.(); } catch(_) {}
  }

  function _fmt(n) { return (n|0).toLocaleString('ru'); }

  function _parseDmg(mk) {
    const m = String(mk || '').match(/[−\-](\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function _isCrit(mk) { return /⚡|💥/.test(mk); }

  function _isMiss(mk) {
    const s = String(mk || '').trim();
    return s.startsWith('✕') || /💨|🛡/.test(s);
  }

  function _parseHp(mk) {
    const m = String(mk || '').match(/❤(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  function _parseHeal(mk) {
    const m = String(mk || '').match(/🩸\+(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  // Parse webapp_log entries → structured rounds + totals
  function _parseLog(entries) {
    const RX = /^Р(\d+)\s+Вы→(\S+)\s+(.*?)\s+·\s+Враг→(\S+)\s+(.*)$/;
    const byRound = {};
    let totalMe = 0, totalEnemy = 0, hits = 0, crits = 0, enemyHits = 0;

    for (const raw of (entries || [])) {
      const m = String(raw || '').match(RX);
      if (!m) continue;
      const [, rn, z1, m1, , m2] = m;
      const rNum = parseInt(rn, 10);
      if (!byRound[rNum]) byRound[rNum] = [];

      // Player action
      const myDmg = _parseDmg(m1);
      const myIsCrit = _isCrit(m1);
      const myIsMiss = _isMiss(m1);
      if (!myIsMiss && myDmg > 0) { totalMe += myDmg; hits++; if (myIsCrit) crits++; }
      byRound[rNum].push({
        kind: myIsMiss ? 'miss' : myIsCrit ? 'crit' : 'me',
        dmg: myDmg, hp: myIsMiss ? null : _parseHp(m1), mk: m1,
        heal: _parseHeal(m1),
      });

      // Enemy action — всегда показываем, в т.ч. промахи/блок/уклон
      const enDmg = _parseDmg(m2);
      const enHp  = _parseHp(m2);
      if (enDmg > 0) {
        totalEnemy += enDmg;
        enemyHits++;
        byRound[rNum].push({ kind: _isCrit(m2) ? 'enemy_crit' : 'boss', dmg: enDmg, hp: enHp });
      } else {
        byRound[rNum].push({ kind: 'enemy_miss', dmg: 0, hp: null, mk: m2 });
      }
    }

    const rounds = Object.keys(byRound)
      .sort((a, b) => +a - +b)
      .map(k => ({ idx: +k, items: byRound[k] }));

    return { rounds, totalMe, totalEnemy, hits, crits, enemyHits };
  }

  function _missLabel(mk) {
    const s = String(mk || '');
    if (s.includes('💨')) return '💨 уклон';
    if (s.includes('🛡')) return '🛡 блок';
    return '✕ мимо';
  }

  function _evHtml(ev) {
    let tagCls, tagTxt, dmgCls, hpIco, hpColor;
    if (ev.kind === 'me')              { tagCls='me';   tagTxt='МОЙ УД'; dmgCls='me';   hpIco='💀'; hpColor='#00E5FF'; }
    else if (ev.kind === 'crit')       { tagCls='crit'; tagTxt='КРИТ!';  dmgCls='crit'; hpIco='💀'; hpColor='#00FFB0'; }
    else if (ev.kind === 'miss')       { tagCls='boss'; tagTxt='МИМО';   dmgCls='boss'; hpIco='';   hpColor=''; }
    else if (ev.kind === 'boss')       { tagCls='boss'; tagTxt='ВРАГ';   dmgCls='boss'; hpIco='❤️'; hpColor=''; }
    else if (ev.kind === 'enemy_crit') { tagCls='boss'; tagTxt='ВР.КР'; dmgCls='boss'; hpIco='❤️'; hpColor=''; }
    else if (ev.kind === 'enemy_miss') { tagCls='boss'; tagTxt='ВРАГ';   dmgCls='boss'; hpIco='';   hpColor=''; }
    else return '';

    const dmgStr = ev.dmg > 0 ? `−${_fmt(ev.dmg)}` : _missLabel(ev.mk);
    const hpHtml = ev.hp != null && hpIco
      ? `<div class="wb-bhist-hp"><span class="wb-bhist-hpico">${hpIco}</span><span class="wb-bhist-hpval"${hpColor ? ` style="color:${hpColor}"` : ''}>${_fmt(ev.hp)}</span></div>`
      : '';
    const healHtml = ev.heal > 0
      ? `<span style="font-size:10px;color:#ff4888;margin-left:6px;font-weight:700">🩸+${_fmt(ev.heal)}</span>`
      : '';

    return `<div class="wb-bhist-ev">
      <span class="wb-bhist-tag ${tagCls}">${tagTxt}</span>
      <span class="wb-bhist-arr">▶</span>
      <span class="wb-bhist-dmg ${dmgCls}">${dmgStr}</span>
      ${hpHtml}${healHtml}
    </div>`;
  }

  // 1-3 подсказки по итогам боя
  function _analyze(entries) {
    const rx = /^Р(\d+)\s+Вы→(\S+)\s+(.*?)\s+·\s+Враг→(\S+)\s+(.*)$/;
    let n = 0, myMiss = 0, myCrit = 0, enemyCrit = 0, enemyHits = 0;
    for (const raw of entries || []) {
      const m = String(raw || '').match(rx);
      if (!m) continue;
      n++;
      const [, , , m1, , m2] = m;
      if (_isMiss(m1)) myMiss++;
      else if (_isCrit(m1)) myCrit++;
      if (_isCrit(m2)) enemyCrit++;
      if (_parseDmg(m2) > 0) enemyHits++;
    }
    const hints = [];
    if (!n) return hints;
    if (myMiss >= Math.max(2, Math.ceil(n * 0.3)))
      hints.push('🎲 Много промахов — прокачай интуицию/силу.');
    if (enemyCrit >= 2)
      hints.push(`⚡ Получил ${enemyCrit} крита — подними выносливость/защиту.`);
    if (enemyHits >= Math.max(3, Math.ceil(n * 0.6)))
      hints.push('🛡️ Враг часто попадал — смени тактику защиты.');
    if (myCrit >= 2)
      hints.push(`💥 Твои криты: ${myCrit} — продолжай в том же духе!`);
    if (!hints.length)
      hints.push('💭 Бой был ровным. Меняй зону защиты каждые 2 раунда.');
    return hints.slice(0, 2);
  }

  function showHistory(_canvas, entries) {
    _ensureCSS();
    document.getElementById('bl-bhist-ov')?.remove();

    const { rounds, totalMe, totalEnemy, hits, crits, enemyHits } = _parseLog(entries);

    const rowsHtml = rounds.map(r => {
      const evs = r.items.map(_evHtml).join('');
      return `<div class="wb-bhist-rsep">ROUND ${r.idx}</div>${evs}`;
    }).join('');

    const hints = _analyze(entries);
    const hintsHtml = hints.length
      ? `<div class="wb-bhist-rsep" style="margin-top:6px">💡 РАЗБОР</div>
         ${hints.map(h => `<div class="wb-bhist-ev" style="padding:3px 0;font-size:10px;color:rgba(255,255,255,.65);gap:4px">${h}</div>`).join('')}`
      : '';

    const ov = document.createElement('div');
    ov.id = 'bl-bhist-ov';
    ov.className = 'wb-bhist-ov';
    ov.innerHTML = `<div class="wb-bhist">
      <div class="wb-bhist-x" id="bl-bhist-x">×</div>
      <div class="wb-bhist-h">⚔ ИСТОРИЯ БОЯ <span class="wb-bhist-cnt">/ ${rounds.length} раундов</span></div>
      <div class="wb-bhist-totals">
        <div class="wb-bhist-tme">
          <div class="wb-bhist-tlbl">⚔ МОЙ УРОН</div>
          <div class="wb-bhist-tval me">${_fmt(totalMe)}</div>
          <div class="wb-bhist-tsub">${hits} уд${crits ? ` · ${crits} крита` : ''}</div>
        </div>
        <div class="wb-bhist-tsep"></div>
        <div class="wb-bhist-tboss">
          <div class="wb-bhist-tlbl">🩸 ВРАГ ПО МНЕ</div>
          <div class="wb-bhist-tval boss">${_fmt(totalEnemy)}</div>
          <div class="wb-bhist-tsub">${enemyHits} удар${enemyHits===1?'':'а'}</div>
        </div>
      </div>
      <div class="wb-bhist-list">
        ${rowsHtml || '<div class="wb-bhist-empty">Нет данных о раундах.</div>'}
        ${hintsHtml}
      </div>
      <div class="wb-bhist-ok" id="bl-bhist-ok">ПОНЯТНО</div>
    </div>`;

    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    const close = () => {
      ov.classList.remove('open');
      setTimeout(() => { try { ov.remove(); } catch(_) {} }, 220);
    };
    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.id === 'bl-bhist-x' || e.target.id === 'bl-bhist-ok') close();
    });
  }

  function hideHistory() {
    const ov = document.getElementById('bl-bhist-ov');
    if (!ov) return;
    ov.classList.remove('open');
    setTimeout(() => { try { ov.remove(); } catch(_) {} }, 220);
  }

  Object.assign(BattleLog, { showHistory, hideHistory });
})();
