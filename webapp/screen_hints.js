/* ═══════════════════════════════════════════════════════════
   ScreenHints — одноразовые подсказки при первом посещении
   экрана. Данные — в screen_hints_data.js (SCREEN_HINTS).
   localStorage хранит список уже показанных ключей.
   ═══════════════════════════════════════════════════════════ */

const ScreenHints = (() => {
  const LS_KEY = 'da_screen_hints';
  let _overlay = null, _showing = false;

  function _seen() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
  }
  function _markSeen(key) {
    try {
      const s = _seen();
      if (!s.includes(key)) { s.push(key); localStorage.setItem(LS_KEY, JSON.stringify(s)); }
    } catch {}
  }
  function _isNew() {
    const p = typeof State !== 'undefined' && State.player;
    if (!p) return true;
    return ((parseInt(p.wins, 10) || 0) + (parseInt(p.losses, 10) || 0)) < 20;
  }

  /* ── DOM overlay (создаём один раз, стили общие с BattleHints) ─ */
  function _ensureOverlay() {
    if (_overlay) return;
    const s = document.createElement('style');
    s.textContent = `
      #sh-overlay{position:fixed;inset:0;z-index:210;display:none;
        align-items:center;justify-content:center;
        background:rgba(0,0,0,0.75);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        animation:sh-fi .22s ease}
      @keyframes sh-fi{from{opacity:0}to{opacity:1}}
      .sh-card{width:88%;max-width:340px;
        background:linear-gradient(145deg,#1e1c30,#12121c);
        border:1.5px solid rgba(255,200,60,.35);border-radius:16px;
        padding:22px 20px 18px;text-align:center;
        box-shadow:0 8px 32px rgba(0,0,0,.6);animation:sh-ci .28s ease}
      @keyframes sh-ci{from{transform:scale(.88) translateY(20px);opacity:0}
        to{transform:scale(1) translateY(0);opacity:1}}
      .sh-title{font-size:17px;font-weight:700;color:#ffc83c;margin-bottom:12px}
      .sh-text{font-size:13px;line-height:1.6;color:#ccccee;
        white-space:pre-line;margin-bottom:18px;text-align:left}
      .sh-btn{display:inline-block;padding:10px 36px;
        background:linear-gradient(135deg,#3a2a08,#1a1508);
        border:1.5px solid rgba(255,200,60,.5);border-radius:10px;
        color:#ffe888;font-size:14px;font-weight:700;cursor:pointer;
        transition:transform .12s}
      .sh-btn:active{transform:scale(.95);background:#4a3a18}
    `;
    document.head.appendChild(s);
    _overlay = document.createElement('div');
    _overlay.id = 'sh-overlay';
    document.body.appendChild(_overlay);
  }

  function _showCard(hint, key) {
    _ensureOverlay();
    _showing = true;
    _overlay.innerHTML = `
      <div class="sh-card">
        <div class="sh-title">${hint.title}</div>
        <div class="sh-text">${hint.text}</div>
        <div class="sh-btn" id="sh-ok">Понятно ✓</div>
      </div>`;
    _overlay.style.display = 'flex';
    document.getElementById('sh-ok').addEventListener('click', () => {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      _overlay.style.display = 'none';
      _showing = false;
      _markSeen(key);
    });
  }

  /* ── API ────────────────────────────────────────────────── */
  return {
    /** Показать подсказку для экрана (если ещё не показывалась) */
    show(key) {
      if (_showing) return;
      if (!_isNew()) return;
      if (_seen().includes(key)) return;
      const hint = typeof SCREEN_HINTS !== 'undefined' && SCREEN_HINTS[key];
      if (!hint) return;
      setTimeout(() => _showCard(hint, key), 400);
    },
    /** Принудительно скрыть */
    hide() {
      if (_overlay) _overlay.style.display = 'none';
      _showing = false;
    },
    /** Сбросить все подсказки (для тестирования) */
    reset() { try { localStorage.removeItem(LS_KEY); } catch {} },
    get active() { return _showing; },
  };
})();
