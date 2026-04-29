/* ============================================================
   BotBattleFx — визуальные эффекты урона в HTML-overlay PvE-боя:
     apply(side, amount, isCrit)
       side:    'me'  | 'opp'
       amount:  число (>0 — отрисовать всплывашку)
       isCrit:  true → подсветка крита + шейк + большая золотая цифра
   Ставит CSS-классы на спрайт (#bb-p1 / #bb-p2) и временно вставляет
   .dmg-float (всплывающее число), которое само удаляется через 950мс.
   ============================================================ */

const BotBattleFx = (() => {
  function _inject() {
    if (document.getElementById('bb-fx-css')) return;
    const s = document.createElement('style');
    s.id = 'bb-fx-css';
    s.textContent = `
      @keyframes bbHit{0%{filter:brightness(2.3) saturate(1.4)}100%{filter:brightness(1)}}
      @keyframes bbShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
      @keyframes dmgFloat{0%{opacity:0;transform:translate(-50%,0) scale(.7)}15%{opacity:1;transform:translate(-50%,-30px) scale(1.15)}100%{opacity:0;transform:translate(-50%,-90px) scale(1)}}
      #bb-root .hit > img{animation:bbHit .4s ease-out;}
      #bb-root .crit-hit > img{animation:bbHit .55s ease-out, bbShake .3s ease-out 2;}
      #bb-root .dmg-float{position:absolute;left:50%;top:18%;font-size:26px;font-weight:900;font-family:"Consolas",monospace;color:#ff5fa0;text-shadow:0 2px 6px #000,0 0 12px rgba(255,0,112,.75);pointer-events:none;animation:dmgFloat .95s ease-out forwards;z-index:11;}
      #bb-root .dmg-float.crit{color:#ffd35a;font-size:34px;text-shadow:0 2px 6px #000,0 0 16px #ff8a00,0 0 24px #ff4500;}
      #bb-root .dmg-float.me{color:#5fb8ff;text-shadow:0 2px 6px #000,0 0 12px rgba(0,180,255,.75);}
    `;
    document.head.appendChild(s);
  }
  return {
    apply(side, amount, isCrit) {
      _inject();
      const root = document.getElementById('bb-root');
      if (!root) return;
      const el = root.querySelector(side === 'opp' ? '#bb-p2' : '#bb-p1');
      if (!el) return;
      el.classList.remove('hit', 'crit-hit'); void el.offsetWidth;
      el.classList.add(isCrit ? 'crit-hit' : 'hit');
      if (amount > 0) {
        const n = document.createElement('div');
        n.className = 'dmg-float' + (isCrit ? ' crit' : '') + (side === 'me' ? ' me' : '');
        n.textContent = (isCrit ? '💥 ' : '') + '−' + amount;
        el.appendChild(n);
        setTimeout(() => { try { n.remove(); } catch(_) {} }, 950);
      }
    },
  };
})();

if (typeof window !== 'undefined') window.BotBattleFx = BotBattleFx;
