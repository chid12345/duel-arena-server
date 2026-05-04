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
      .bl-hp-left   { color: #88bbaa; font-size: 9px; font-weight: 600; margin-left: 3px; opacity: 0.85; }
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
    // Суффикс "❤N" — HP цели после удара (добавляется бэком).
    let hpTail = '';
    const hpM = (m || '').match(/❤(\d+)\s*$/);
    if (hpM) {
      hpTail = `<span class="bl-hp-left">❤${hpM[1]}</span>`;
      m = m.slice(0, hpM.index).trim();
    }
    let core;
    if (!m || m === '—' || m === '0') core = `<span class="bl-miss-col">—</span>`;
    else if (m.startsWith('⏱'))  core = `<span class="bl-miss-col">⏱</span>`;
    else if (m.startsWith('✕'))  core = `<span class="bl-miss-col">✕мимо</span>`;
    else if (m.includes('💨'))   core = `<span class="bl-dodge-col">💨уклон</span>`;
    else if (m.includes('🛡'))   core = `<span class="${side === 'you' ? 'bl-dmg-you' : 'bl-dmg-enemy'}">🛡блок</span>`;
    else if (m.includes('⚡') || m.includes('💥')) core = `<span class="bl-crit">${m}</span>`;
    else if (m.startsWith('−') || m.startsWith('-'))
      core = `<span class="${side === 'you' ? 'bl-dmg-you' : 'bl-dmg-enemy'}">${m}</span>`;
    else core = `<span class="bl-miss-col">${m}</span>`;
    return core + hpTail;
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
      // Закрываем и попап истории раундов, если открыт
      try { BattleLog.hideHistory?.(); } catch(_) {}
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
    try { if (typeof _closeAllTabOverlays === 'function') _closeAllTabOverlays(); } catch(_) {}
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

    // Защита: если State.battle не пришёл с сервера (редкий race), возвращаем в меню.
    if (!State.battle) { this.scene.start('Menu', { returnTab: 'profile' }); return; }

    // Снимаем хвостовые блокеры от warrior_select (если сцена сменилась
    // не через _closeWarriorSelect, а напрямую — canvas остаётся
    // pointer-events:none, и Phaser-кнопки боя в Натиск/Башне молчат).
    try {
      const cv = document.querySelector('canvas');
      if (cv) cv.style.pointerEvents = '';
      ['ws-overlay','ws-early-blocker'].forEach(id => {
        const el = document.getElementById(id);
        if (el) try { el.remove(); } catch(_) {}
      });
      document.body.className = document.body.className.replace(/wscls-\S+/g,'').trim();
    } catch(_) {}

    // ВСЕ бои (PvE-бот / Натиск / Башня / PvP-поиск / Вызов по нику) идут
    // через единый HTML-overlay. Phaser-путь оставлен только как fallback.
    if (typeof BotBattleHtml !== 'undefined') {
      console.log('[Battle] mount HTML overlay…');
      try {
        BotBattleHtml.mount(this);
      } catch(e) {
        console.error('[Battle] HTML overlay mount error — fallback to Phaser:', e);
        try { BotBattleHtml.unmount(); } catch(_) {}
      }
      if (BotBattleHtml.isMounted()) {
        this._htmlMode = true;
        this._setupWSBattle();
        this._startTimer();
        this._armUiWatchdog();
        return;
      }
      console.warn('[Battle] HTML overlay not mounted — using Phaser fallback');
    }

    this._buildArena();
    this._buildHUDs();
    this._buildChoicePanel();
    this._buildLog();
    this._updateFromState(State.battle);
    this._setupWSBattle();
    this._startTimer();
    this._armUiWatchdog();

    // Подсказки для новичков (первые 5 боёв)
    if (typeof BattleHints !== 'undefined') BattleHints.onBattleStart(this);
  }

  _armUiWatchdog() {
    // Через 4с проверяем — отрисовался ли UI боя? Если ни HTML-overlay
    // (#bb-p1n не существует), ни Phaser-арена (this.warrior1 = null),
    // то сцена застряла → молча возвращаем в меню вместо чёрного экрана.
    if (this._uiWatchdog) { try { this._uiWatchdog.remove(); } catch(_) {} }
    this._uiWatchdog = this.time.delayedCall(4000, () => {
      const htmlOk   = !!document.querySelector('#bb-root #bb-p1n');
      const phaserOk = !!this.warrior1;
      if (!htmlOk && !phaserOk) {
        console.error('[Battle] UI watchdog: ни HTML, ни Phaser не отрисовались за 4с — выход в меню');
        // Метка для MenuScene: бой только что упал — не возвращай нас сюда
        // через active_session 30 секунд. Без этого получается зомби-цикл:
        // Menu → active_session=Battle → Battle падает → Menu → Battle …
        try { localStorage.setItem('da_skip_battle_resume', String(Date.now())); } catch(_) {}
        try { State.battle = null; } catch(_) {}
        try { BotBattleHtml?.unmount?.(); } catch(_) {}
        this.scene.start('Menu', { returnTab: 'profile' });
      }
    });
  }

  shutdown() {
    // Phaser сам чистит time.addEvent и tweens, но DOM-оверлей и WS-handler
    // висят независимо — убираем вручную, иначе после выхода из боя
    // BattleLog остаётся на экране, а ws.onmessage дёргает мёртвую сцену.
    if (this._uiWatchdog) { try { this._uiWatchdog.remove(); } catch(_) {} this._uiWatchdog = null; }
    try { BattleLog.hide(); } catch(_) {}
    try { if (typeof BotBattleHtml !== 'undefined') BotBattleHtml.unmount(); } catch(_) {}
    try {
      if (State.ws && State.ws.onmessage) {
        // Ставим no-op — следующая сцена (Result/Menu) всё равно вызовет
        // connectWS и перезапишет. Нужно только чтобы мёртвый handleMsg
        // не стрельнул прямо сейчас на приходящий round_result.
        State.ws.onmessage = null;
      }
    } catch(_) {}
    if (this._timerEvent) { try { this._timerEvent.remove(); } catch(_) {} this._timerEvent = null; }
    if (this._pollEvent)  { try { this._pollEvent.remove();  } catch(_) {} this._pollEvent  = null; }
  }
}
