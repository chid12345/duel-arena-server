/* ============================================================
   BotBattleLog — тонкий лог боя для HTML-overlay (под HP-плашками).
     attach(root, host) — вставляет CSS + DOM .blog в overlay
     update(combatLog)  — пушит только новые записи (по сравнению с last)
     reset()            — сброс счётчика при unmount/mount
   Парсит строки формата "Р3 Вы→TORSO −245 · Враг→HEAD ✕мимо"
   (см. webapp_log в repositories/battles/read.py / battle_system).
   ============================================================ */

const BotBattleLog = (() => {
  let stack = null, lastLen = 0;

  const RU = { HEAD:'Голова', TORSO:'Тело', LEGS:'Ноги' };
  const RX = /^Р(\d+)\s+Вы→(\S+)\s+(.*?)\s+·\s+Враг→(\S+)\s+(.*)$/;

  function _injectCss() {
    if (document.getElementById('bb-log-css')) return;
    const s = document.createElement('style');
    s.id = 'bb-log-css';
    s.textContent = `
      #bb-root .blog{position:absolute;left:8px;right:8px;top:72px;z-index:9;background:rgba(2,5,18,.62);border:1px solid rgba(255,255,255,.08);border-radius:5px;height:34px;overflow:hidden;font-family:"Consolas",monospace;font-size:9.5px;pointer-events:none;}
      #bb-root .blog .stack{display:flex;flex-direction:column;}
      #bb-root .blog .line{display:flex;align-items:center;padding:1px 9px;height:17px;line-height:15px;border-bottom:1px solid rgba(255,255,255,.04);white-space:nowrap;}
      #bb-root .blog .line.old{opacity:.55;}
      #bb-root .blog .r{color:#ffd35a;font-weight:800;flex:0 0 26px;}
      #bb-root .blog .l{flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;color:#bcc6e0;}
      #bb-root .blog .arrow{color:#555;margin:0 4px;}
      #bb-root .blog .h{color:#ff8ac0;}
      #bb-root .blog .b{color:#8ab8ff;}
      #bb-root .blog .dmg{color:#fff;font-weight:700;}
      #bb-root .blog .crit{color:#ffd35a;font-weight:700;}
      #bb-root .blog .dodge{color:#3cc8dc;}
      #bb-root .blog .block{color:#aaa;}
    `;
    document.head.appendChild(s);
  }

  function _stylize(mk) {
    const s = String(mk || '').trim();
    if (!s || s === '—' || s === '0') return '<span class="block">—</span>';
    if (s.includes('💨')) return '<span class="dodge">💨уворот</span>';
    if (s.includes('🛡')) return '<span class="block">🛡блок</span>';
    if (s.includes('⚡') || s.includes('💥')) return `<span class="crit">${s}</span>`;
    if (s.startsWith('−') || s.startsWith('-')) return `<span class="dmg">${s}</span>`;
    return `<span class="block">${s}</span>`;
  }

  function _format(raw) {
    const m = (raw || '').match(RX);
    if (!m) return `<div class="line"><span class="l">${String(raw || '').slice(0, 40)}</span></div>`;
    const [, rN, z1, m1, z2, m2] = m;
    const ru = z => RU[z] || z;
    return `<div class="line"><span class="r">Р${rN}</span><span class="l"><span class="h">${ru(z1)}</span> ${_stylize(m1)} <span class="arrow">→</span> <span class="b">${ru(z2)}</span> ${_stylize(m2)}</span></div>`;
  }

  function _push(raw) {
    if (!stack) return;
    const cur = stack.querySelector('.line:not(.old)');
    if (cur) cur.classList.add('old');
    while (stack.children.length >= 2) stack.removeChild(stack.lastElementChild);
    stack.insertAdjacentHTML('afterbegin', _format(raw));
  }

  return {
    attach(root) {
      if (!root) return;
      _injectCss();
      const wrap = document.createElement('div');
      wrap.className = 'blog';
      wrap.innerHTML = '<div class="stack" id="bb-stack"></div>';
      root.appendChild(wrap);
      stack = wrap.querySelector('#bb-stack');
      lastLen = 0;
    },
    update(combatLog) {
      if (!stack || !Array.isArray(combatLog)) return;
      if (combatLog.length <= lastLen) return;
      const start = Math.max(lastLen, combatLog.length - 2);
      for (let i = start; i < combatLog.length; i++) _push(combatLog[i]);
      lastLen = combatLog.length;
    },
    reset() { stack = null; lastLen = 0; },
  };
})();

if (typeof window !== 'undefined') window.BotBattleLog = BotBattleLog;
