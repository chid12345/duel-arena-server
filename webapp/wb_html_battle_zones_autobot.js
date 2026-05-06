/* wb_html_battle_zones_autobot.js — клиент-сайд авто-бой для премиума.

   Каждые 3с: тапает случайную зону атаки + защиты (видимая подсветка),
   через 600мс жмёт «Совершить ход». Игрок видит весь цикл —
   выбор зон → удар → результат → повтор.

   Не использует серверный флаг auto_bot — чисто визуальная автоматизация
   на клиенте. При выходе из webapp — авто останавливается.
   Состояние ВКЛ/ВЫКЛ persist в localStorage. */
(() => {
  if (window.__wbzAutobotLoaded) return;
  window.__wbzAutobotLoaded = true;

  const ZONES = ['HEAD', 'TORSO', 'LEGS'];
  let _autoTimer = null;
  function _isOn() { return _autoTimer != null; }

  function _step() {
    const root = document.getElementById('wb-root');
    const sc = window.WBHtml?._scene;
    if (!root || !sc?._alive) { _stop(); return; }
    const ps = sc._state?.player_state;
    if (!sc._state?.active || ps?.is_dead) { _stop(); return; }
    const a = ZONES[Math.floor(Math.random() * 3)];
    const d = ZONES[Math.floor(Math.random() * 3)];
    // Видимый шаг: тап на зону атаки → подсветка → потом защита → апплай
    root.querySelector('.wbz-col-atk .wbz-btn[data-key="' + a + '"]')?.click();
    setTimeout(() => root.querySelector('.wbz-col-def .wbz-btn[data-key="' + d + '"]')?.click(), 250);
    setTimeout(() => root.querySelector('#wbz-apply')?.click(), 600);
  }

  function _start() {
    if (_autoTimer) return;
    // НЕ persist в localStorage — auto-bot только в текущей сессии,
    // иначе при reload бот мог дёргать удары в фоне (контр-урон → ранняя смерть).
    _step();
    _autoTimer = setInterval(_step, 3000);
  }
  function _stop() {
    if (_autoTimer) { clearInterval(_autoTimer); _autoTimer = null; }
    // Чистим старый флаг — на случай если он остался от предыдущей версии.
    try { localStorage.removeItem('wbz_auto_on'); } catch(_) {}
    const btn = document.querySelector('#wb-root .wbz-auto-btn');
    if (btn) btn.classList.remove('on');
  }
  // Чистим легаси-флаг сразу при загрузке модуля — старые сессии могли его оставить.
  try { localStorage.removeItem('wbz_auto_on'); } catch(_) {}

  function _onClick() {
    const sc = window.WBHtml?._scene;
    const state = sc?._state;
    if (!state) return;
    if (!state.is_premium) {
      try { window.WBHtml?.toast?.('👑 АВТО доступен только подписчикам'); } catch(_) {}
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('warning'); } catch(_) {}
      return;
    }
    if (_isOn()) {
      _stop();
      try { window.WBHtml?.toast?.('🤖 Авто-бой ВЫКЛ'); } catch(_) {}
    } else {
      _start();
      try { window.WBHtml?.toast?.('🤖 Авто-бой ВКЛ — выбираю зоны и бью'); } catch(_) {}
    }
    const btn = document.querySelector('#wb-root .wbz-auto-btn');
    if (btn) btn.classList.toggle('on', _isOn());
  }

  // Инжект CSS кнопки АВТО — отдельно от других модулей
  function _injectCss() {
    if (document.getElementById('wbz-auto-css')) return;
    const s = document.createElement('style');
    s.id = 'wbz-auto-css';
    s.textContent = `
      .wbz-auto-btn{position:absolute;top:10px;right:10px;z-index:14;display:flex;flex-direction:column;align-items:center;justify-content:center;width:46px;padding:5px 0;border-radius:9px;background:linear-gradient(135deg,rgba(15,5,30,.88),rgba(8,5,18,.92));border:1.5px solid rgba(160,150,200,.45);font-family:Consolas,monospace;cursor:pointer;user-select:none;transition:all .25s}
      .wbz-auto-btn .ic{font-size:18px;line-height:1}
      .wbz-auto-btn .lb{font-size:7px;font-weight:900;letter-spacing:.6px;color:#aaa;margin-top:2px;text-transform:uppercase}
      .wbz-auto-btn .lk{position:absolute;bottom:-3px;right:-3px;font-size:9px;background:#222;border-radius:50%;padding:1px 3px}
      .wbz-auto-btn.locked{opacity:.7}
      .wbz-auto-btn.on{border-color:#00ff88;background:linear-gradient(135deg,rgba(0,80,40,.7),rgba(0,40,20,.9));box-shadow:0 0 18px rgba(0,255,136,.6),inset 0 0 8px rgba(0,255,136,.2);animation:wbzAutoPulse 2s ease-in-out infinite}
      @keyframes wbzAutoPulse{0%,100%{box-shadow:0 0 18px rgba(0,255,136,.6)}50%{box-shadow:0 0 28px rgba(0,255,136,.9),0 0 40px rgba(0,255,136,.4)}}
      .wbz-auto-btn.on .lb{color:#00ff88;text-shadow:0 0 6px #00ff88}
      .wbz-auto-btn.on .ic{filter:drop-shadow(0 0 6px #00ff88)}
    `;
    document.head.appendChild(s);
  }

  // Внешний API: вызывается из wb_html_battle_zones_extras.js на каждом render
  function render(root, state) {
    _injectCss();
    const zone = root.querySelector('.wb-boss-zone');
    if (!zone) return;
    let btn = zone.querySelector('.wbz-auto-btn');
    if (!btn) {
      btn = document.createElement('div');
      btn.className = 'wbz-auto-btn';
      btn.innerHTML = '<div class="ic">🤖</div><div class="lb">АВТО</div>';
      zone.appendChild(btn);
      btn.addEventListener('click', _onClick);
    }
    const isPremium = !!state?.is_premium;
    btn.classList.toggle('locked', !isPremium);
    let lk = btn.querySelector('.lk');
    if (!isPremium) {
      if (!lk) { lk = document.createElement('div'); lk.className = 'lk'; lk.textContent = '🔒'; btn.appendChild(lk); }
    } else if (lk) { lk.remove(); }
    // НЕ автостартуем — иначе бот мог дёргать удары в фоне и убивать игрока
    // контр-уроном до того как тот заметит. АВТО запускается ТОЛЬКО ручным
    // тапом по кнопке. localStorage флаг используется только для UI-восстановления
    // активного класса в текущем сеансе (если бот реально работает).
    btn.classList.toggle('on', _isOn());
    btn.title = isPremium ? (_isOn() ? 'Авто-бой ВКЛ — тап чтобы выключить' : 'Включить авто-бой') : '🔒 Только для подписчиков';
  }

  window.WbzAutobot = { render };
})();
