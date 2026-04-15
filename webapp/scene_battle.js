/* ============================================================
   BattleLog IIFE + BattleScene
   Продолжение: scene_battle_ext1.js, scene_battle_ext2.js,
                scene_battle_ext3.js
   ============================================================ */

/* ═══════════════════════════════════════════════════════════
   BATTLE LOG — компактный DOM-оверлей над панелью выбора
   ═══════════════════════════════════════════════════════════ */
const BattleLog = (() => {
  let overlay = null, inner = null;
  let _shown = false;

  function _init() {
    if (overlay) return;
    const style = document.createElement('style');
    style.textContent = `
      #battle-log-overlay {
        position: fixed; display: none; z-index: 50;
        pointer-events: none; box-sizing: border-box;
        border-radius: 6px; overflow: hidden;
        background: rgba(10, 8, 22, 0.84);
        border: 1px solid rgba(80, 70, 140, 0.28);
      }
      #battle-log-inner {
        width: 100%; height: 100%; box-sizing: border-box;
        display: flex; align-items: center;
        padding: 0 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 10px; line-height: 1.3;
      }
      .bl-you   { flex: 0 0 42%; text-align: left;
                  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                  color: #aabbdd; }
      .bl-mid   { flex: 0 0 16%; text-align: center;
                  font-size: 9px; color: #ffc83c; font-weight: 700;
                  white-space: nowrap; }
      .bl-enemy { flex: 0 0 42%; text-align: right;
                  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                  color: #cc9999; }
      .bl-dmg-you   { color: #4d94ff; font-weight: 700; }
      .bl-dmg-enemy { color: #ff4d4d; font-weight: 700; }
      .bl-crit      { color: #ffcc00; font-weight: 700; }
      .bl-dodge-col { color: #2ecc71; }
      .bl-miss-col  { color: #cccccc; }
    `;
    document.head.appendChild(style);
    overlay = document.createElement('div');
    overlay.id = 'battle-log-overlay';
    inner = document.createElement('div');
    inner.id = 'battle-log-inner';
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
  }

  function _styleMarker(m, side) {
    if (!m || m === '—' || m === '0') return `<span class="bl-miss-col">—</span>`;
    if (m.startsWith('⏱'))  return `<span class="bl-miss-col">⏱</span>`;
    if (m.startsWith('✕'))  return `<span class="bl-miss-col">✕мимо</span>`;
    if (m.includes('💨'))   return `<span class="bl-dodge-col">💨уклон</span>`;
    if (m.includes('🛡'))   return `<span class="${side === 'you' ? 'bl-dmg-you' : 'bl-dmg-enemy'}">🛡блок</span>`;
    if (m.includes('⚡') || m.includes('💥')) return `<span class="bl-crit">${m}</span>`;
    if (m.startsWith('−') || m.startsWith('-'))
      return `<span class="${side === 'you' ? 'bl-dmg-you' : 'bl-dmg-enemy'}">${m}</span>`;
    return `<span class="bl-miss-col">${m}</span>`;
  }

  function _render(raw) {
    if (!inner) return;
    const parsed = (raw || '').match(/^Р(\d+)\s+Вы→(\S+)\s+(.*?)\s+·\s+Враг→(\S+)\s+(.*)$/);
    if (!parsed) {
      inner.innerHTML = `<span class="bl-you">${(raw||'').replace(/<[^>]+>/g,'').slice(0,40)}</span>`;
      return;
    }
    const [, rNum, z1, m1r, z2, m2r] = parsed;
    const m1 = m1r.trim(), m2 = m2r.trim();
    inner.innerHTML =
      `<span class="bl-you">${z1} ${_styleMarker(m1, 'you')}</span>` +
      `<span class="bl-mid">Р${rNum}</span>` +
      `<span class="bl-enemy">${z2} ${_styleMarker(m2, 'enemy')}</span>`;
  }

  return {
    show(canvas, sceneX, sceneY, sceneW, sceneH) {
      _init();
      const r  = canvas.getBoundingClientRect();
      const sx = r.width  / canvas.width;
      const sy = r.height / canvas.height;
      overlay.style.left   = (r.left + sceneX * sx) + 'px';
      overlay.style.top    = (r.top  + sceneY * sy) + 'px';
      overlay.style.width  = (sceneW * sx) + 'px';
      overlay.style.height = (sceneH * sy) + 'px';
      overlay.style.display = 'block';
      if (inner) inner.innerHTML = '';
      _shown = true;
    },
    hide() {
      if (!overlay) return;
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
      overlay.onclick = null;
      _shown = false;
    },
    clear() {
      _init();
      if (inner) inner.innerHTML = '';
    },
    update(entries) {
      if (!_shown || !entries || !entries.length) return;
      _render(entries[entries.length - 1]);
    },
    setClickable(cb) {
      _init();
      overlay.style.pointerEvents = 'auto';
      overlay.style.cursor = 'pointer';
      overlay.onclick = cb;
    },
    styleMarker: _styleMarker,  // expose for scene_battle_log_history.js
  };
})();

/* ═══════════════════════════════════════════════════════════
   BATTLE SCENE — боевой экран
   ═══════════════════════════════════════════════════════════ */
class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._selAttack  = null;
    this._selDefense = null;
    this._choosing   = true;
    this._submitting = false;
    this._logLines   = [];
    this._prevMyHp   = null;
    this._prevOppHp  = null;
    this._p1PrevPct  = null;
    this._p2PrevPct  = null;
    this._oppCardOpen = false;

    this._buildArena();
    this._buildHUDs();
    this._buildChoicePanel();
    this._buildLog();
    this._updateFromState(State.battle);
    this._setupWSBattle();
    this._startTimer();

    // Подсказки для новичков (первые 5 боёв)
    if (typeof BattleHints !== 'undefined') BattleHints.onBattleStart(this);
  }
}
