/* BotBattleHtmlFx — кибер-FX для HTML-overlay боя.
   API:
     dmg(root, side, amount, isCrit) — урон/крит-FX на спрайте жертвы:
       cy-slash + cy-shock + cy-sparks + большая неон-цифра + crit-glow.
     dodge(root, side)               — анимация уворота
     timer(elTimer, secs)            — обновляет цифру + danger при ≤5с

   side === 'me' → жертва — игрок (#bb-p1)
   side === 'opp' → жертва — соперник/босс (#bb-p2) */

const BotBattleHtmlFx = (() => {

  function _toggleAnimClass(el, cls, durMs) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => { try { el.classList.remove(cls); } catch (_) {} }, durMs);
  }

  // Спавн одного DOM-FX-элемента, удаляется через durMs
  function _spawn(parent, cls, styleSetter, durMs) {
    if (!parent) return;
    const el = document.createElement('div');
    el.className = cls;
    if (styleSetter) styleSetter(el);
    parent.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch (_) {} }, durMs);
  }

  // Координаты центра спрайта жертвы относительно #bb-root
  function _victimCenter(root, side) {
    if (!root) return null;
    const sel = side === 'me' ? '#bb-p1' : '#bb-p2';
     const fighter = root.querySelector(sel);
    if (!fighter) return null;
    const r = fighter.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    return {
      x: r.left - rr.left + r.width / 2,
      y: r.top - rr.top + r.height * 0.45,
    };
  }

  function _impact(root, side, isCrit) {
    const c = _victimCenter(root, side);
    if (!c) return;
    const critCls = isCrit ? ' crit' : '';

    // SLASH — диагональная вспышка под случайным углом
    _spawn(root, 'cy-slash' + critCls, el => {
      const ang = -35 + Math.random() * 70;
      el.style.left = c.x + 'px';
      el.style.top  = c.y + 'px';
      el.style.setProperty('--slash-rot', ang + 'deg');
    }, 500);

    // SHOCKWAVE
    _spawn(root, 'cy-shock' + critCls, el => {
      el.style.left = c.x + 'px';
      el.style.top  = c.y + 'px';
    }, 600);

    // SPARKS
    const n = isCrit ? 10 : 6;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i / n) + (Math.random() * 0.4 - 0.2);
      const dist = (isCrit ? 70 : 50) + Math.random() * 30;
      _spawn(root, 'cy-spark' + critCls, el => {
        el.style.left = c.x + 'px';
        el.style.top  = c.y + 'px';
        el.style.setProperty('--dx', Math.cos(a) * dist + 'px');
        el.style.setProperty('--dy', Math.sin(a) * dist + 'px');
      }, 600);
    }
  }

  function _dmgNumber(root, side, amount, isCrit) {
    const c = _victimCenter(root, side);
    if (!c || amount == null) return;
    _spawn(root, 'cy-dmg' + (isCrit ? ' crit' : ''), el => {
      el.style.left = (c.x + (Math.random() - .5) * 40) + 'px';
      el.style.top  = (c.y - 14) + 'px';
      el.textContent = (isCrit ? '💥 −' : '−') + (Number(amount) || 0).toLocaleString('ru') + (isCrit ? '!' : '');
    }, 1700);
  }

  return {
    dmg(root, side, amount, isCrit) {
      _impact(root, side, isCrit);
      _dmgNumber(root, side, amount, isCrit);
      // Кибер-вспышка на спрайте жертвы (короткая, не ломает breath-анимацию)
      if (!root) return;
      const target = root.querySelector(side === 'me' ? '#bb-p1' : '#bb-p2');
      if (!target) return;
      target.classList.remove('cy-hit', 'crit'); void target.offsetWidth;
      target.classList.add('cy-hit'); if (isCrit) target.classList.add('crit');
      setTimeout(() => { try { target.classList.remove('cy-hit', 'crit'); } catch (_) {} }, 360);
    },

    dodge(root, side) {
      if (!root) return;
      const sel = side === 'me' ? '#bb-p1' : '#bb-p2';
      const cls = side === 'me' ? 'dodge-left' : 'dodge-right';
      _toggleAnimClass(root.querySelector(sel), cls, 420);
    },

    timer(elTimer, secs) {
      if (!elTimer) return;
      const v = Math.max(0, secs | 0);
      elTimer.textContent = String(v);
      elTimer.classList.toggle('danger', v > 0 && v <= 5);
    },
  };
})();

if (typeof window !== 'undefined') window.BotBattleHtmlFx = BotBattleHtmlFx;
