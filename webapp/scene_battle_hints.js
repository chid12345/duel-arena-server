/* ═══════════════════════════════════════════════════════════
   BattleHints — DOM-подсказки для новичков (первые 5 боёв).
   Хранит прогресс в localStorage ('da_hint_step').
   Вызывается из BattleScene.create() → BattleHints.onBattleStart(scene)
   и из _updateFromState()      → BattleHints.onRoundEnd(scene, roundNum)
   ═══════════════════════════════════════════════════════════ */

const BattleHints = (() => {
  const LS_KEY = 'da_hint_step';
  let _overlay = null;
  let _showing = false;

  /* ── Тексты подсказок ───────────────────────────────────── */
  const HINTS = {
    // battle_N — показывается при старте боя N (0-based по completed battles)
    battle_0: [
      {
        title: '🎓 Добро пожаловать на арену!',
        text: 'Выбери зону АТАКИ (куда бить) и зону ЗАЩИТЫ (что защищать). Враг делает то же самое!',
      },
    ],
    battle_0_round: [
      {
        title: '❤️ Полоски здоровья',
        text: 'Вверху — HP (здоровье). Чьё закончится первым — тот проиграл. Следи за своим HP!',
      },
    ],
    battle_1: [
      {
        title: '📜 Лог боя',
        text: 'Полоска внизу — лог боя. Тут видно: крит 💥, блок 🛡, уклон 💨. Нажми на неё — откроется история всех раундов.',
      },
    ],
    battle_2: [
      {
        title: '🎯 Зоны атаки',
        text: '👤 Голова: +30% урона — рискованно, но мощно.\n🦵 Ноги: меньше урона, но снижает уклон врага.\n🧥 Тело: стабильный урон.',
      },
    ],
    battle_3: [
      {
        title: '👁️ Карточка соперника',
        text: 'Нажми на панель «ВЫ» или «СОПЕРНИК» вверху — увидишь статы, уровень и силу. Знай врага в лицо!',
      },
    ],
    battle_4: [
      {
        title: '⚔️ Тренировка окончена!',
        text: 'Ты освоил основы! Теперь можешь сражаться с реальными игроками в PvP. Удачи, воин!',
      },
    ],
  };

  /* ── DOM-оверлей ────────────────────────────────────────── */
  function _ensureOverlay() {
    if (_overlay) return;
    const style = document.createElement('style');
    style.textContent = `
      #battle-hint-overlay {
        position: fixed; inset: 0; z-index: 200;
        display: none;
        align-items: center; justify-content: center;
        background: rgba(0,0,0,0.72);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: bh-fade-in 0.22s ease;
      }
      @keyframes bh-fade-in {
        from { opacity: 0; } to { opacity: 1; }
      }
      .bh-card {
        width: 86%; max-width: 340px;
        background: linear-gradient(145deg, #1e1c30 0%, #12121c 100%);
        border: 1.5px solid rgba(255,200,60,0.35);
        border-radius: 16px;
        padding: 22px 20px 18px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        animation: bh-card-in 0.28s ease;
      }
      @keyframes bh-card-in {
        from { transform: scale(0.88) translateY(20px); opacity: 0; }
        to   { transform: scale(1) translateY(0); opacity: 1; }
      }
      .bh-title {
        font-size: 16px; font-weight: 700;
        color: #ffc83c;
        margin-bottom: 10px;
      }
      .bh-text {
        font-size: 13px; line-height: 1.55;
        color: #ccccee;
        white-space: pre-line;
        margin-bottom: 18px;
      }
      .bh-btn {
        display: inline-block;
        padding: 10px 32px;
        background: linear-gradient(135deg, #3a2a08 0%, #1a1508 100%);
        border: 1.5px solid rgba(255,200,60,0.5);
        border-radius: 10px;
        color: #ffe888; font-size: 14px; font-weight: 700;
        cursor: pointer;
        transition: transform 0.12s, background 0.12s;
      }
      .bh-btn:active {
        transform: scale(0.95);
        background: #4a3a18;
      }
      .bh-step {
        margin-top: 10px;
        font-size: 10px; color: #888;
      }
    `;
    document.head.appendChild(style);

    _overlay = document.createElement('div');
    _overlay.id = 'battle-hint-overlay';
    document.body.appendChild(_overlay);
  }

  function _getStep() {
    try { return parseInt(localStorage.getItem(LS_KEY) || '0', 10); } catch (_) { return 0; }
  }

  function _setStep(n) {
    try { localStorage.setItem(LS_KEY, String(n)); } catch (_) { /* noop */ }
  }

  function _completedBattles() {
    const p = State.player;
    if (!p) return 999;
    return (parseInt(p.wins, 10) || 0) + (parseInt(p.losses, 10) || 0);
  }

  function _show(hints, stepLabel) {
    if (_showing || !hints || !hints.length) return;
    _ensureOverlay();
    _showing = true;

    let idx = 0;
    function _render() {
      const h = hints[idx];
      const total = hints.length;
      _overlay.innerHTML = `
        <div class="bh-card">
          <div class="bh-title">${h.title}</div>
          <div class="bh-text">${h.text}</div>
          <div class="bh-btn" id="bh-ok-btn">Понятно ✓</div>
          ${total > 1 ? `<div class="bh-step">${idx + 1} / ${total}</div>` : ''}
        </div>
      `;
      _overlay.style.display = 'flex';
      document.getElementById('bh-ok-btn').addEventListener('click', () => {
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
        idx++;
        if (idx < hints.length) {
          _render();
        } else {
          _overlay.style.display = 'none';
          _showing = false;
        }
      });
    }
    _render();
  }

  /* ── Публичное API ──────────────────────────────────────── */
  return {
    /** Вызвать при старте боя (BattleScene.create) */
    onBattleStart(scene) {
      const completed = _completedBattles();
      if (completed >= 5) return;
      const key = `battle_${completed}`;
      if (HINTS[key]) {
        // Небольшая задержка чтобы арена успела отрисоваться
        setTimeout(() => _show(HINTS[key], key), 600);
      }
    },

    /** Вызвать после завершения раунда */
    onRoundEnd(scene, roundNum) {
      const completed = _completedBattles();
      if (completed >= 5) return;
      // Подсказка после первого раунда первого боя
      if (completed === 0 && roundNum === 1) {
        const key = 'battle_0_round';
        if (HINTS[key]) {
          setTimeout(() => _show(HINTS[key], key), 800);
        }
      }
    },

    /** Принудительно закрыть (при уходе со сцены) */
    hide() {
      if (_overlay) _overlay.style.display = 'none';
      _showing = false;
    },

    /** Для тестирования: сбросить прогресс */
    reset() {
      try { localStorage.removeItem(LS_KEY); } catch (_) { /* noop */ }
    },

    /** Активен ли сейчас оверлей */
    get active() { return _showing; },
  };
})();
