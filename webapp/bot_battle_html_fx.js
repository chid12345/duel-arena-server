/* BotBattleHtmlFx — DOM-FX для HTML-overlay боя.
   Toggle CSS-классов на спрайтах и таймере. Вынесено из bot_battle_html.js
   чтобы вернуть основной модуль в норму ≤200 строк (Закон 1).
   API:
     dmg(root, side, amount, isCrit) — урон/крит-flash
     dodge(root, side)               — анимация уворота
     timer(elTimer, secs)            — обновляет цифру + danger при ≤5с */

const BotBattleHtmlFx = (() => {

  function _toggleAnimClass(el, cls, durMs) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;          // force reflow для рестарта animation
    el.classList.add(cls);
    setTimeout(() => { try { el.classList.remove(cls); } catch (_) {} }, durMs);
  }

  return {
    dmg(root, side, amount, isCrit) {
      // Всплывающая цифра + (опционально) тряска через BotBattleFx (внешний).
      if (typeof BotBattleFx !== 'undefined') {
        try { BotBattleFx.apply(side, amount, isCrit); } catch (_) {}
      }
      // Подсветка спрайта жертвы при крите.
      if (!isCrit || !root) return;
      const sel = side === 'me' ? '#bb-p1' : '#bb-p2';
      _toggleAnimClass(root.querySelector(sel), 'crit-hit', 360);
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
      // Красный пульсирующий таймер при ≤5 сек.
      elTimer.classList.toggle('danger', v > 0 && v <= 5);
    },
  };
})();

if (typeof window !== 'undefined') window.BotBattleHtmlFx = BotBattleHtmlFx;
