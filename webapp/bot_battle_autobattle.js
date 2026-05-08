/* ============================================================
   bot_battle_autobattle.js — премиум-автобой во всех PvE/PvP/Натиск/Башня
   боях, идущих через #bb-root (BotBattleHtml).

   Логика проста и изолирована от bot_battle_html.js (Закон 1):
   • кнопка #bb-autobattle есть в HTML, мы только слушаем клики делегатом.
   • toggle .on на кнопке + флаг _on. Без премиума — toast и не включаем.
   • пока _on=true, раз в 250мс смотрим: появилось #bb-confirm.ready
     (зоны не выбраны/выбраны частично — выбор сделаем сами случайно).
     Если игрок может ходить (scene._choosing && !scene._submitting),
     запускаем BotBattleFx.spinChoice → submitChoice — те же кнопки,
     что использует одноразовый «🎲 Случайный ход».
   • Полностью без monkeypatch — слушает root напрямую.
   ============================================================ */
(() => {
  if (window.__botBattleAutoHooked) return;
  window.__botBattleAutoHooked = true;

  const ZONES = ['HEAD', 'TORSO', 'LEGS'];
  const _S = () => (typeof State !== 'undefined' ? State : (window.State || {}));
  const _isPrem = () => !!(_S()?.player?.is_premium);

  let _on = false;       // включён ли автобой
  let _busy = false;     // сейчас крутим выбор / ждём хода
  let _tickTimer = null; // setInterval токен
  let _lastRoundKey = null; // чтобы не запускать выбор дважды на одном раунде

  function _toast(msg) {
    const root = document.getElementById('bb-root');
    if (!root) return;
    try { root.querySelectorAll('.bb-toast').forEach(n => n.remove()); } catch (_) {}
    const t = document.createElement('div');
    t.className = 'bb-toast';
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(() => { try { t.remove(); } catch (_) {} }, 2400);
  }

  function _syncBtn() {
    const btn = document.getElementById('bb-autobattle');
    if (!btn) return;
    btn.classList.toggle('on', _on);
    btn.classList.toggle('locked', !_isPrem());
    // Маленький замок для не-премиума
    let lock = btn.querySelector('.lock-em');
    if (!_isPrem()) {
      if (!lock) {
        lock = document.createElement('div');
        lock.className = 'lock-em';
        lock.textContent = '🔒';
        btn.appendChild(lock);
      }
    } else if (lock) {
      try { lock.remove(); } catch (_) {}
    }
  }

  function _stop() {
    _on = false; _busy = false; _lastRoundKey = null;
    if (_tickTimer) { try { clearInterval(_tickTimer); } catch (_) {} _tickTimer = null; }
    _syncBtn();
  }

  // Один «авто-ход»: spinChoice как у бb-auto → submit. Не запускается, если уже идёт.
  function _autoMove() {
    if (_busy) return;
    const root = document.getElementById('bb-root');
    if (!root) return;
    const sc = (window.BotBattleHtml && (typeof BotBattleHtml.isMounted === 'function') && BotBattleHtml.isMounted())
      ? (window.__BB_LAST_SCENE || null) : null;
    // Берём сцену через scene_battle: BotBattleHtml._scene не публичен, но
    // глобальный реестр Phaser даёт активную BattleScene.
    const scene = sc || _findBattleScene();
    if (!scene || !scene._choosing || scene._submitting) return;
    _busy = true;
    const a = ZONES[Math.floor(Math.random() * 3)];
    const d = ZONES[Math.floor(Math.random() * 3)];
    // spinChoice показывает анимацию вращения и вызывает callback с финальным выбором.
    const aBtns = {}, dBtns = {};
    root.querySelectorAll('.atk-col .ic-btn').forEach(b => aBtns[b.dataset.key] = b);
    root.querySelectorAll('.def-col .ic-btn').forEach(b => dBtns[b.dataset.key] = b);
    const finish = () => {
      try {
        if (scene._choosing && !scene._submitting && scene._submitChoice) {
          scene._selAttack = a; scene._selDefense = d;
          scene._submitChoice();
        }
      } catch (_) {}
      _busy = false;
    };
    if (typeof BotBattleFx !== 'undefined' && BotBattleFx.spinChoice) {
      try { BotBattleFx.spinChoice(aBtns, dBtns, () => finish()); }
      catch (_) { finish(); }
    } else {
      finish();
    }
  }

  function _findBattleScene() {
    try {
      const game = window.game || window.phaserGame;
      if (!game) return null;
      const battle = game.scene?.getScene?.('Battle');
      return battle && battle.scene?.isActive?.() ? battle : null;
    } catch (_) { return null; }
  }

  function _tick() {
    const root = document.getElementById('bb-root');
    if (!root) return; // overlay не смонтирован
    _syncBtn(); // премиум-статус мог измениться
    if (!_on) return;
    if (_busy) return;
    const scene = _findBattleScene();
    if (!scene || !scene._choosing || scene._submitting) return;
    // Один авто-ход на раунд
    const rk = String(_S()?.battle?.round ?? -1);
    if (rk === _lastRoundKey) return;
    _lastRoundKey = rk;
    // Лёгкая задержка чтобы игрок успел увидеть начало раунда
    setTimeout(_autoMove, 600);
  }

  function _onClick(ev) {
    const btn = ev.target.closest('#bb-autobattle');
    if (!btn) return;
    if (!_isPrem()) {
      _toast('👑 АВТОБОЙ — только для подписчиков');
      try { tg?.HapticFeedback?.notificationOccurred?.('warning'); } catch (_) {}
      return;
    }
    _on = !_on;
    _lastRoundKey = null;
    _syncBtn();
    try { tg?.HapticFeedback?.impactOccurred?.(_on ? 'medium' : 'light'); } catch (_) {}
    _toast(_on ? '⚡ АВТОБОЙ ВКЛ' : 'АВТОБОЙ ВЫКЛ');
    if (_on && !_tickTimer) _tickTimer = setInterval(_tick, 250);
    if (!_on && _tickTimer) { try { clearInterval(_tickTimer); } catch (_) {} _tickTimer = null; }
    if (_on) _tick();
  }

  // Делегат глобальный — root пересоздаётся при каждом mount, поэтому слушаем body.
  document.addEventListener('click', _onClick, true);

  // Когда #bb-root исчезает (бой кончился / unmount) — сбрасываем стейт,
  // чтобы при следующем бое автобой стартовал в OFF и не дёргал спин на старом scene.
  const obs = new MutationObserver(() => {
    const root = document.getElementById('bb-root');
    if (!root && _tickTimer) _stop();
  });
  obs.observe(document.body, { childList: true });

  window.BotBattleAutoBattle = {
    isOn: () => _on,
    reset: _stop,
  };
})();
