/* ============================================================
   BattleLog — история раундов (попап).
   Патчит BattleLog: showHistory / hideHistory.
   Загружается после scene_battle.js.
   ============================================================ */
(() => {
  let el = null;

  function _init() {
    if (el) return;
    const s = document.createElement('style');
    s.textContent = `
      #bl-history {
        position:fixed; display:none; z-index:300;
        background:rgba(8,6,20,0.97);
        border:1px solid rgba(80,70,140,0.55); border-radius:10px;
        overflow-y:auto; box-sizing:border-box;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        font-size:11px; color:#ccc;
      }
      #bl-history .blh-close {
        position:sticky; top:0;
        background:rgba(8,6,20,0.98);
        padding:6px 10px 5px;
        font-size:13px; font-weight:700; color:#ffc83c;
        text-align:right; cursor:pointer;
        border-bottom:1px solid rgba(80,70,140,0.3);
        display:flex; justify-content:space-between; align-items:center;
      }
      #bl-history .blh-title { font-size:12px; color:#aabbdd; font-weight:400; }
      #bl-history .blh-row {
        display:flex; align-items:center;
        padding:5px 8px;
        border-bottom:1px solid rgba(255,255,255,0.06);
      }
      #bl-history .blh-rn  { font-size:9px; color:#ffc83c; font-weight:700; min-width:24px; flex-shrink:0; }
      #bl-history .blh-you { flex:1; color:#aabbdd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #bl-history .blh-sep { color:#555; padding:0 4px; flex-shrink:0; }
      #bl-history .blh-opp { flex:1; text-align:right; color:#cc9999; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #bl-history .blh-hints { padding:8px 10px; border-top:1px solid rgba(255,200,60,0.25); background:rgba(255,200,60,0.04); }
      #bl-history .blh-hints-t { font-size:11px; color:#ffc83c; font-weight:700; margin-bottom:4px; }
      #bl-history .blh-hint   { font-size:10px; color:#ddddee; line-height:1.35; padding:2px 0; }
    `;
    document.head.appendChild(s);
    el = document.createElement('div');
    el.id = 'bl-history';
    // pointer/mouse события — полностью поглощаем (не проваливаем на Phaser canvas)
    ['pointerdown','pointerup','mousedown','mouseup','click'].forEach(ev => {
      el.addEventListener(ev, e => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
    });
    // touch — только stopPropagation, без preventDefault: иначе сломается нативный скролл
    ['touchstart','touchend','touchmove'].forEach(ev => {
      el.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    });
    // Закрытие по ✕
    el.addEventListener('click', e => {
      if (e.target.classList.contains('blh-close') ||
          e.target.closest?.('.blh-close')) BattleLog.hideHistory();
    });
    document.body.appendChild(el);
  }

  // Разбирает webapp_log и выдаёт 1–3 подсказки «почему так получилось».
  // Работает от лица игрока (Вы→). Если логов нет — возвращает пустой массив.
  function _analyze(entries) {
    const rx = /^Р(\d+)\s+Вы→(\S+)\s+(.*?)\s+·\s+Враг→(\S+)\s+(.*)$/;
    let n = 0, myMiss = 0, myDodged = 0, myBlocked = 0;
    let myCrit = 0, enemyCrit = 0, enemyHitsOnMe = 0, enemyDodge = 0, enemyBlock = 0;
    const myZones = { 'Гол':0, 'Тело':0, 'Ноги':0 };
    const enemyZones = { 'Гол':0, 'Тело':0, 'Ноги':0 };
    for (const raw of entries || []) {
      const m = (raw || '').match(rx);
      if (!m) continue;
      n++;
      const [, , z1, mark1, z2, mark2] = m;
      if (myZones[z1] != null) myZones[z1]++;
      if (enemyZones[z2] != null) enemyZones[z2]++;
      // мой удар (mark1)
      if (mark1.startsWith('✕')) myMiss++;
      else if (mark1.includes('💨')) myDodged++;  // противник уклонился
      else if (mark1.includes('🛡')) myBlocked++; // противник заблокировал
      else if (mark1.includes('⚡') || mark1.includes('💥')) myCrit++;
      // удар врага (mark2) — HP-суффикс «❤N» уже игнорируется (после маркера)
      if (mark2.includes('⚡') || mark2.includes('💥')) enemyCrit++;
      if (mark2.startsWith('−') || mark2.startsWith('-')) enemyHitsOnMe++;
      if (mark2.includes('💨')) enemyDodge++;
      if (mark2.includes('🛡')) enemyBlock++;
    }
    const hints = [];
    if (n === 0) return hints;
    // Частый уклон/блок врага → меняй зону
    if ((myDodged + myBlocked) >= Math.max(2, Math.ceil(n * 0.4))) {
      hints.push('🎯 Враг часто уклонялся/блокировал — меняй зону атаки чаще.');
    }
    // Частые промахи → прокачай силу/интуицию (влияет на точность)
    if (myMiss >= Math.max(2, Math.ceil(n * 0.3))) {
      hints.push('🎲 Много промахов — подумай о прокачке интуиции/силы.');
    }
    // Враг попадал критами → защита/броня
    if (enemyCrit >= 2) {
      hints.push(`⚡ Получил ${enemyCrit} критов — поднять выносливость/защиту головы.`);
    }
    // Враг бьёт стабильно → защита не покрывает зону
    if (enemyHitsOnMe >= Math.max(3, Math.ceil(n * 0.6))) {
      // Найти самую частую зону врага
      const topZone = Object.entries(enemyZones).sort((a,b) => b[1]-a[1])[0];
      if (topZone && topZone[1] >= 2) {
        hints.push(`🛡️ Враг бил в «${topZone[0]}» — защищай эту зону в защите.`);
      }
    }
    // Я много крит — похвала
    if (myCrit >= 2) {
      hints.push(`💥 Твои криты: ${myCrit} — прокачка интуиции работает!`);
    }
    // Если пусто — мягкий совет
    if (!hints.length) {
      hints.push('💭 Бой был ровным. Попробуй менять защитную зону каждые 2 раунда.');
    }
    return hints.slice(0, 3);
  }

  function _fmtRow(raw) {
    const p = (raw || '').match(/^Р(\d+)\s+Вы→(\S+)\s+(.*?)\s+·\s+Враг→(\S+)\s+(.*)$/);
    if (!p) return `<div class="blh-row"><span class="blh-you">${raw}</span></div>`;
    const [, rn, z1, m1, z2, m2] = p;
    const sm = BattleLog.styleMarker;
    return `<div class="blh-row">
      <span class="blh-rn">Р${rn}</span>
      <span class="blh-you">${z1} ${sm(m1.trim(),'you')}</span>
      <span class="blh-sep">·</span>
      <span class="blh-opp">${z2} ${sm(m2.trim(),'enemy')}</span>
    </div>`;
  }

  Object.assign(BattleLog, {
    showHistory(canvas, entries) {
      _init();
      const r = canvas.getBoundingClientRect();
      el.style.left   = (r.left + 8) + 'px';
      el.style.top    = (r.top  + r.height * 0.05) + 'px';
      el.style.width  = (r.width - 16) + 'px';
      el.style.height = (r.height * 0.65) + 'px';
      const n = (entries || []).length;
      const rows = (entries || []).map(_fmtRow).join('');
      const hints = _analyze(entries);
      const hintsHtml = hints.length
        ? `<div class="blh-hints">
             <div class="blh-hints-t">💡 Разбор боя</div>
             ${hints.map(h => `<div class="blh-hint">${h}</div>`).join('')}
           </div>`
        : '';
      el.innerHTML =
        `<div class="blh-close">
           <span class="blh-title">📜 История раундов (${n})</span>
           <span>✕</span>
         </div>` +
        (rows || '<div class="blh-row"><span class="blh-you">Раундов ещё не было</span></div>') +
        hintsHtml;
      el.style.display = 'block';
      el.scrollTop = el.scrollHeight;
    },
    hideHistory() {
      if (!el) return;
      el.style.display = 'none';
      // Phaser слушает события напрямую на canvas — ставим временный щит
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const shield = document.createElement('div');
        shield.style.cssText = 'position:fixed;inset:0;z-index:299;pointer-events:all;';
        document.body.appendChild(shield);
        setTimeout(() => shield.remove(), 250);
      }
    },
  });
})();
