/* ============================================================
   BotBattleModeBanner — режим-баннер поверх HTML-боя
   Натиск:  🔥 ВОЛНА N    Башня:  🗿 ЭТАЖ N
   Обычный «Бой с ботом» — баннер не рисуется.
   API: attach(root)
   ============================================================ */

const BotBattleModeBanner = (() => {

  function _injectCss() {
    if (document.getElementById('bb-mode-css')) return;
    const s = document.createElement('style');
    s.id = 'bb-mode-css';
    s.textContent = `
      #bb-root .mode-banner{position:absolute;top:112px;left:50%;transform:translateX(-50%);
        z-index:11;pointer-events:none;padding:4px 14px;border-radius:14px;
        font-family:"Consolas",monospace;font-size:11px;font-weight:900;letter-spacing:2px;
        background:rgba(8,8,18,.86);border:1px solid rgba(255,200,80,.5);
        color:#ffd370;text-shadow:0 0 8px rgba(255,180,40,.7);
        box-shadow:0 0 12px rgba(255,180,40,.35);}
      #bb-root .mode-banner.titan{border-color:rgba(180,80,255,.55);
        color:#cc9aff;text-shadow:0 0 8px rgba(180,80,255,.7);
        box-shadow:0 0 12px rgba(180,80,255,.35);}
    `;
    document.head.appendChild(s);
  }

  function _label() {
    const b = (typeof State !== 'undefined' && State.battle) ? State.battle : (window.State?.battle || {});
    const mode = b.mode || 'normal';
    const meta = b.mode_meta || {};
    if (mode === 'endless') {
      const w = meta.wave || (typeof State !== 'undefined' ? State.endlessWave : 0) || 1;
      return { text: `🔥 ВОЛНА ${w}`, cls: '' };
    }
    if (mode === 'titan') {
      const f = meta.floor || 1;
      return { text: `🗿 ЭТАЖ ${f}`, cls: 'titan' };
    }
    return null;
  }

  return {
    attach(root) {
      if (!root) return;
      _injectCss();
      try { const old = root.querySelector('.mode-banner'); if (old) old.remove(); } catch(_) {}
      const lbl = _label();
      if (!lbl) return;
      const el = document.createElement('div');
      el.className = 'mode-banner' + (lbl.cls ? ' ' + lbl.cls : '');
      el.textContent = lbl.text;
      root.appendChild(el);
    },
  };
})();

if (typeof window !== 'undefined') window.BotBattleModeBanner = BotBattleModeBanner;
