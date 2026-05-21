/* ============================================================
   BotBattleLog — кибер-лог раундов для HTML-overlay боя
   (PvE-бот, PvP, Натиск, Башня Титанов).
     attach(root)       — вставляет CSS + DOM .bb-clog в overlay
     update(combatLog)  — пушит новые раунды в стек (показываем 2 последних)
     reset()            — сброс при unmount/mount

   Формат строки сервера: "Р3 Вы→TORSO −245 · Враг→HEAD ✕мимо"
   Рендерим: [Р3]  Тело −245  ·  Голова ✕мимо
              ─тег──  ─моё событие─  ─событие соперника─
   Цвета тегов чередуются (розовый ↔ голубой) чтобы взгляд цеплялся.
   ============================================================ */

const BotBattleLog = (() => {
  let root = null, lastLen = 0;

  const RU = { HEAD: 'Голова', TORSO: 'Тело', LEGS: 'Ноги' };
  const SHORT = { HEAD: 'Гол', TORSO: 'Тело', LEGS: 'Ноги' };
  const RX = /^Р(\d+)\s+Вы→(\S+)\s+(.*?)\s+·\s+Враг→(\S+)\s+(.*)$/;

  function _injectCss() {
    if (document.getElementById('bb-log-css')) return;
    const s = document.createElement('style');
    s.id = 'bb-log-css';
    s.textContent = `
      #bb-root .bb-clog{position:absolute;left:8px;right:8px;top:58px;z-index:9;display:flex;flex-direction:column;gap:2px;padding:5px 7px;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(10,2,20,.45));border-radius:8px;border:1px solid rgba(0,240,255,.12);font-family:'Courier New',monospace;font-size:10px;line-height:1.4;pointer-events:none;}
      @keyframes bbClogPulse{0%{box-shadow:0 0 0 0 rgba(0,240,255,0);border-color:rgba(0,240,255,.12);}20%{box-shadow:0 0 12px rgba(0,240,255,.4);border-color:rgba(0,240,255,.55);}100%{box-shadow:0 0 0 0 rgba(0,240,255,0);border-color:rgba(0,240,255,.12);}}
      #bb-root .bb-clog.fresh{animation:bbClogPulse .9s ease-out;}
      #bb-root .bb-clog-row{display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;}
      #bb-root .bb-clog-row.old{opacity:.55;}
      #bb-root .bb-clog-tag{font-weight:900;letter-spacing:.5px;padding:1px 5px;border-radius:4px;flex-shrink:0;font-size:9px;}
      #bb-root .bb-clog-tag.t-pink{color:#ff7acb;background:rgba(255,59,168,.15);border:1px solid rgba(255,59,168,.5);text-shadow:0 0 4px rgba(255,59,168,.7);}
      #bb-root .bb-clog-tag.t-cyan{color:#80e8ff;background:rgba(0,240,255,.12);border:1px solid rgba(0,240,255,.5);text-shadow:0 0 4px rgba(0,240,255,.7);}
      #bb-root .bb-clog-zone{font-weight:700;letter-spacing:.3px;}
      #bb-root .bb-clog-zone.me{color:#80e8ff;text-shadow:0 0 4px rgba(0,240,255,.5);}
      #bb-root .bb-clog-zone.opp{color:#ff9ed4;text-shadow:0 0 4px rgba(255,59,168,.5);}
      #bb-root .bb-clog-arr{color:rgba(255,255,255,.35);font-weight:700;margin:0 2px;}
      #bb-root .bb-clog-res{font-weight:800;letter-spacing:.3px;display:inline-flex;align-items:center;gap:1px;}
      #bb-root .bb-clog-res.dmg{color:#ff4477;text-shadow:0 0 4px rgba(255,68,119,.6);}
      #bb-root .bb-clog-res.crit{color:#ffd166;text-shadow:0 0 5px rgba(255,209,102,.7);}
      #bb-root .bb-clog-res.miss{color:rgba(220,220,235,.55);}
      #bb-root .bb-clog-res.dodge{color:#80e8ff;text-shadow:0 0 4px rgba(0,240,255,.5);}
      #bb-root .bb-clog-res.blk{color:rgba(220,220,235,.55);}
      #bb-root .bb-clog-empty{text-align:center;font-size:9px;color:rgba(160,200,255,.4);letter-spacing:1.5px;padding:4px 0;font-family:'Courier New',monospace;}
    `;
    document.head.appendChild(s);
  }

  function _classifyResult(raw) {
    const s = String(raw || '').trim();
    if (!s || s === '—' || s === '0') return { cls: 'blk', text: '—' };
    if (s.includes('💨')) return { cls: 'dodge', text: '💨' };
    // 🛡 = полный блок; 🏰 (абсолютная стойка) НЕ блок — это урон 1, обрабатываем ниже.
    if ((s.includes('🛡') && !s.includes('🏰')) || /блок/i.test(s)) return { cls: 'blk', text: '⊘ блок' };
    if (s.includes('✕') || /мимо/i.test(s)) return { cls: 'miss', text: '✕ мимо' };
    // Доп. значки механик + вампиризм соперника (🩸+N) — показываем рядом с уроном.
    let extra = '';
    if (s.includes('×2')) extra += '×2';
    if (s.includes('🪓')) extra += '🪓';
    if (s.includes('🧱')) extra += '🧱';
    if (s.includes('🏰')) extra += '🏰';
    if (s.includes('▪'))  extra += '▪';
    const healM = s.match(/🩸\+(\d+)/);
    if (healM) extra += ' 🩸+' + healM[1];
    if (s.includes('💥') || s.includes('⚡')) {
      const num = (s.match(/-?\d+/) || [''])[0];
      return { cls: 'crit', text: '💥−' + (num.replace(/^-/, '') || '?') + extra };
    }
    if (/^[−-]\d/.test(s)) {
      const m = s.match(/^[−-](\d+)/);
      return { cls: 'dmg', text: '−' + (m ? m[1] : '?') + extra };
    }
    return { cls: 'blk', text: s.slice(0, 14) };
  }

  function _renderEmpty(wrap) {
    wrap.innerHTML = '<div class="bb-clog-empty">— РАУНД ЕЩЁ НЕ СЫГРАН —</div>';
  }

  // Одна строка: [Р{N}] моя_зона моё_событие · их_зона их_событие
  function _rowHtml(raw, isFresh) {
    const m = (raw || '').match(RX);
    if (!m) return `<div class="bb-clog-row${isFresh ? '' : ' old'}"><span class="bb-clog-empty" style="position:static;padding:0">${String(raw || '').slice(0, 40)}</span></div>`;
    const [, rN, z1, e1, z2, e2] = m;
    const me = _classifyResult(e1);
    const opp = _classifyResult(e2);
    const tagCls = isFresh ? 't-pink' : 't-cyan';
    return `<div class="bb-clog-row${isFresh ? '' : ' old'}">
      <span class="bb-clog-tag ${tagCls}">Р${rN}</span>
      <span class="bb-clog-zone me">${SHORT[z1] || z1}</span>
      <span class="bb-clog-res ${me.cls}">${me.text}</span>
      <span class="bb-clog-arr">·</span>
      <span class="bb-clog-zone opp">${SHORT[z2] || z2}</span>
      <span class="bb-clog-res ${opp.cls}">${opp.text}</span>
    </div>`;
  }

  function _renderStack(combatLog) {
    if (!root) return;
    const wrap = root.querySelector('.bb-clog');
    if (!wrap) return;
    if (!Array.isArray(combatLog) || combatLog.length === 0) { _renderEmpty(wrap); return; }
    const last = combatLog[combatLog.length - 1];
    const prev = combatLog.length >= 2 ? combatLog[combatLog.length - 2] : null;
    const html = _rowHtml(last, true) + (prev ? _rowHtml(prev, false) : '');
    wrap.innerHTML = html;
    wrap.classList.remove('fresh'); void wrap.offsetWidth; wrap.classList.add('fresh');
  }

  return {
    attach(rt) {
      if (!rt) return;
      _injectCss();
      const wrap = document.createElement('div');
      wrap.className = 'bb-clog';
      rt.appendChild(wrap);
      root = rt;
      lastLen = 0;
      _renderEmpty(wrap);
    },
    update(combatLog) {
      if (!root || !Array.isArray(combatLog)) return;
      if (combatLog.length === lastLen) return;
      _renderStack(combatLog);
      lastLen = combatLog.length;
    },
    reset() { root = null; lastLen = 0; },
  };
})();

if (typeof window !== 'undefined') window.BotBattleLog = BotBattleLog;
