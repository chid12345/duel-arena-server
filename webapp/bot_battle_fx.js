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
      @keyframes bbHit{0%{filter:brightness(3) saturate(1.6)}40%{filter:brightness(1.5)}100%{filter:brightness(1)}}
      @keyframes bbShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
      @keyframes dmgFloat{0%{opacity:0;transform:translate(-50%,15px) scale(.7)}12%{opacity:1;transform:translate(-50%,-10px) scale(1.18)}30%{opacity:1;transform:translate(-50%,-30px) scale(1.05)}100%{opacity:0;transform:translate(-50%,-110px) scale(1)}}
      @keyframes bbScrShake{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,2px)}50%{transform:translate(3px,-2px)}75%{transform:translate(-2px,-1px)}}
      @keyframes bbScrShakeBig{0%,100%{transform:translate(0,0)}10%{transform:translate(-8px,4px)}30%{transform:translate(7px,-3px)}50%{transform:translate(-6px,3px)}70%{transform:translate(5px,4px)}90%{transform:translate(-4px,-3px)}}
      @keyframes bbHurt{0%{opacity:0}25%{opacity:.85}100%{opacity:0}}
      @keyframes bbPop{0%{transform:translateY(0)}40%{transform:translateY(-12px) scale(1.08)}100%{transform:translateY(0)}}
      #bb-root .hit > img{animation:bbHit .4s ease-out;}
      #bb-root .crit-hit > img{animation:bbHit .55s ease-out, bbShake .3s ease-out 2;}
      #bb-root.scr-shake{animation:bbScrShake .3s ease-out;}
      #bb-root.scr-shake-big{animation:bbScrShakeBig .55s ease-out;}
      #bb-root .pop{animation:bbPop .38s ease-out;}
      #bb-root .hurt-vig{position:absolute;inset:0;pointer-events:none;z-index:50;opacity:0;background:radial-gradient(ellipse at center,transparent 35%,rgba(180,0,0,.55) 80%,rgba(255,0,0,.7) 100%);}
      #bb-root .hurt-vig.show{animation:bbHurt .55s ease-out;}
      #bb-root .dmg-float{position:absolute;left:50%;top:35%;font-size:30px;font-weight:900;font-family:"Consolas",monospace;color:#ff5fa0;text-shadow:0 3px 8px #000,0 0 14px rgba(255,0,112,.85),0 0 4px #fff;pointer-events:none;animation:dmgFloat 1.6s ease-out forwards;z-index:11;}
      #bb-root .dmg-float.crit{color:#ffd35a;font-size:40px;text-shadow:0 3px 8px #000,0 0 18px #ff8a00,0 0 28px #ff4500,0 0 4px #fff;}
      #bb-root .dmg-float.me{color:#5fb8ff;text-shadow:0 3px 8px #000,0 0 14px rgba(0,180,255,.85),0 0 4px #fff;}
    `;
    document.head.appendChild(s);
  }
  return {
    apply(side, amount, isCrit) {
      _inject();
      const root = document.getElementById('bb-root');
      if (!root) return;
      const target = root.querySelector(side === 'opp' ? '#bb-p2' : '#bb-p1');
      const attacker = root.querySelector(side === 'opp' ? '#bb-p1' : '#bb-p2');
      if (!target) return;
      target.classList.remove('hit', 'crit-hit'); void target.offsetWidth;
      target.classList.add(isCrit ? 'crit-hit' : 'hit');
      if (attacker) { attacker.classList.remove('pop'); void attacker.offsetWidth; attacker.classList.add('pop'); setTimeout(() => attacker.classList.remove('pop'), 400); }
      const sh = isCrit ? 'scr-shake-big' : 'scr-shake';
      root.classList.remove('scr-shake', 'scr-shake-big'); void root.offsetWidth; root.classList.add(sh);
      setTimeout(() => root.classList.remove(sh), isCrit ? 600 : 320);
      if (side === 'me') {
        let v = root.querySelector('.hurt-vig');
        if (!v) { v = document.createElement('div'); v.className = 'hurt-vig'; root.appendChild(v); }
        v.classList.remove('show'); void v.offsetWidth; v.classList.add('show');
      }
      if (amount > 0) {
        const n = document.createElement('div');
        n.className = 'dmg-float' + (isCrit ? ' crit' : '') + (side === 'me' ? ' me' : '');
        n.textContent = (isCrit ? '💥 ' : '') + '−' + amount;
        target.appendChild(n);
        setTimeout(() => { try { n.remove(); } catch(_) {} }, 1700);
      }
    },
  };
})();

if (typeof window !== 'undefined') window.BotBattleFx = BotBattleFx;
