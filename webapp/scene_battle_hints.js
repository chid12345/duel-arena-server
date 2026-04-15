/* ═══════════════════════════════════════════════════════════
   BattleHints — DOM-подсказки + пульсирующие стрелки на
   конкретные UI-элементы для новичков (первые 5 боёв).
   Вызывается из BattleScene.create() и _updateFromState().
   ═══════════════════════════════════════════════════════════ */

const BattleHints = (() => {
  let _overlay = null, _arrow = null, _showing = false;

  /* ── Подсказки: arrow = {x,y Phaser-коорд, dir: up|down|left|right} ─ */
  const H = {
    battle_0: [{
      title: '🎓 Добро пожаловать на арену!',
      text: 'Выбери зону АТАКИ (куда бить) и зону ЗАЩИТЫ (что защищать).',
      arrow: { x: 195, y: 430, dir: 'down' },
    }],
    battle_0_round: [{
      title: '❤️ Полоски здоровья',
      text: 'Вверху — HP. Чьё закончится первым — тот проиграл!',
      arrow: { x: 100, y: 56, dir: 'up' },
    }],
    battle_1: [{
      title: '📜 Лог боя',
      text: 'Полоска ниже — лог. Тут крит 💥, блок 🛡, уклон 💨.\nНажми — откроется история раундов.',
      arrow: { x: 195, y: 390, dir: 'up' },
    }],
    battle_2: [{
      title: '🎯 Зоны — выбирай с умом!',
      text: '👤 Голова: +30% урона, но легко блокируется\n🧥 Тело: стабильный урон\n🦵 Ноги: мало урона, но −15% уклон врага',
      arrow: { x: 70, y: 456, dir: 'down' },
    }],
    battle_3: [{
      title: '👁️ Карточка соперника',
      text: 'Нажми на панель «СОПЕРНИК» вверху — увидишь статы и уровень.',
      arrow: { x: 310, y: 40, dir: 'up' },
    }],
    battle_4: [{
      title: '⚔️ Тренировка окончена!',
      text: 'Ты готов к PvP! Удачи, воин!',
    }],
  };

  /* ── Стили ──────────────────────────────────────────────── */
  function _ensureOverlay() {
    if (_overlay) return;
    const s = document.createElement('style');
    s.textContent = `
      #bh-overlay{position:fixed;inset:0;z-index:200;display:none;
        align-items:center;justify-content:center;
        background:rgba(0,0,0,0.72);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        animation:bh-fi .22s ease}
      @keyframes bh-fi{from{opacity:0}to{opacity:1}}
      .bh-card{width:86%;max-width:340px;
        background:linear-gradient(145deg,#1e1c30,#12121c);
        border:1.5px solid rgba(255,200,60,.35);border-radius:16px;
        padding:22px 20px 18px;text-align:center;
        box-shadow:0 8px 32px rgba(0,0,0,.6);animation:bh-ci .28s ease}
      @keyframes bh-ci{from{transform:scale(.88) translateY(20px);opacity:0}
        to{transform:scale(1) translateY(0);opacity:1}}
      .bh-title{font-size:16px;font-weight:700;color:#ffc83c;margin-bottom:10px}
      .bh-text{font-size:13px;line-height:1.55;color:#ccccee;
        white-space:pre-line;margin-bottom:18px}
      .bh-btn{display:inline-block;padding:10px 32px;
        background:linear-gradient(135deg,#3a2a08,#1a1508);
        border:1.5px solid rgba(255,200,60,.5);border-radius:10px;
        color:#ffe888;font-size:14px;font-weight:700;cursor:pointer;
        transition:transform .12s}
      .bh-btn:active{transform:scale(.95);background:#4a3a18}
      #bh-arrow{position:fixed;z-index:199;pointer-events:none;
        font-size:28px;animation:bh-pulse 1s ease-in-out infinite}
      @keyframes bh-pulse{0%,100%{transform:translateY(0);opacity:1}
        50%{transform:translateY(-10px);opacity:.6}}
      #bh-arrow.dir-up{animation-name:bh-pu}
      #bh-arrow.dir-down{animation-name:bh-pd}
      #bh-arrow.dir-left{animation-name:bh-pl}
      #bh-arrow.dir-right{animation-name:bh-pr}
      @keyframes bh-pu{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
      @keyframes bh-pd{0%,100%{transform:translateY(0)}50%{transform:translateY(12px)}}
      @keyframes bh-pl{0%,100%{transform:translateX(0)}50%{transform:translateX(-12px)}}
      @keyframes bh-pr{0%,100%{transform:translateX(0)}50%{transform:translateX(12px)}}
    `;
    document.head.appendChild(s);
    _overlay = document.createElement('div');
    _overlay.id = 'bh-overlay';
    document.body.appendChild(_overlay);
    _arrow = document.createElement('div');
    _arrow.id = 'bh-arrow';
    _arrow.style.display = 'none';
    document.body.appendChild(_arrow);
  }

  /* ── Стрелка по Phaser-координатам ──────────────────────── */
  const ARROW_CHARS = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };

  function _showArrow(arrowDef) {
    if (!_arrow || !arrowDef) { _hideArrow(); return; }
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const sx = r.width / (canvas.width || 390);
    const sy = r.height / (canvas.height || 700);
    const screenX = r.left + arrowDef.x * sx;
    const screenY = r.top + arrowDef.y * sy;
    const dir = arrowDef.dir || 'down';

    _arrow.textContent = ARROW_CHARS[dir] || '⬆️';
    _arrow.className = `dir-${dir}`;
    _arrow.style.left = `${screenX - 16}px`;
    _arrow.style.top = `${screenY - 16}px`;
    _arrow.style.display = 'block';
  }

  function _hideArrow() {
    if (_arrow) _arrow.style.display = 'none';
  }

  function _completedBattles() {
    const p = State.player;
    if (!p) return 999;
    return (parseInt(p.wins, 10) || 0) + (parseInt(p.losses, 10) || 0);
  }

  function _show(hints) {
    if (_showing || !hints || !hints.length) return;
    _ensureOverlay(); _showing = true;
    let idx = 0;
    function _render() {
      const h = hints[idx];
      _showArrow(h.arrow);
      _overlay.innerHTML = `
        <div class="bh-card">
          <div class="bh-title">${h.title}</div>
          <div class="bh-text">${h.text}</div>
          <div class="bh-btn" id="bh-ok">Понятно ✓</div>
          ${hints.length > 1 ? `<div style="margin-top:8px;font-size:10px;color:#888">${idx+1}/${hints.length}</div>` : ''}
        </div>`;
      _overlay.style.display = 'flex';
      document.getElementById('bh-ok').addEventListener('click', () => {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        idx++;
        if (idx < hints.length) { _render(); }
        else { _overlay.style.display = 'none'; _hideArrow(); _showing = false; }
      });
    }
    _render();
  }

  /* ── API ────────────────────────────────────────────────── */
  return {
    onBattleStart(scene) {
      const c = _completedBattles();
      if (c >= 5) return;
      const hints = H[`battle_${c}`];
      if (hints) setTimeout(() => _show(hints), 600);
    },
    onRoundEnd(scene, roundNum) {
      const c = _completedBattles();
      if (c === 0 && roundNum === 1 && H.battle_0_round) {
        setTimeout(() => _show(H.battle_0_round), 800);
      }
    },
    hide() {
      if (_overlay) _overlay.style.display = 'none';
      _hideArrow(); _showing = false;
    },
    reset() { try { localStorage.removeItem('da_hint_step'); } catch(_){} },
    get active() { return _showing; },
  };
})();
