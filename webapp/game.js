/* ============================================================
   Duel Arena TMA — Phaser 3
   Сцены: Boot → Menu → Battle → Result
   ============================================================ */

const tg = window.Telegram?.WebApp;

const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? `http://${window.location.hostname}:8000`
  : '';  // продакшн — тот же origin

/* Цветовая палитра */
const C = {
  bg:      0x12121c,
  bgMid:   0x1c1a2e,
  bgPanel: 0x1e1c30,
  gold:    0xffc83c,
  red:     0xdc3c46,
  green:   0x3cc864,
  blue:    0x5096ff,
  purple:  0xb45aff,
  cyan:    0x3cc8dc,
  white:   0xf0f0fa,
  gray:    0x8888aa,
  dark:    0x28243c,
  _name:   'dark',
};

/* ── Темы ───────────────────────────────────────────────────── */
const THEMES = {
  dark: {
    bg: 0x12121c, bgMid: 0x1c1a2e, bgPanel: 0x1e1c30,
    gold: 0xffc83c, red: 0xdc3c46, green: 0x3cc864,
    blue: 0x5096ff, purple: 0xb45aff, cyan: 0x3cc8dc,
    white: 0xf0f0fa, gray: 0x8888aa, dark: 0x28243c, _name: 'dark',
  },
  light: {
    bg: 0xf0f2ff, bgMid: 0xe4e8ff, bgPanel: 0xfcfdff,
    gold: 0xcc8800, red: 0xcc2233, green: 0x1a8a3c,
    blue: 0x1a66cc, purple: 0x7722bb, cyan: 0x0088aa,
    white: 0x1a1a2e, gray: 0x4444aa, dark: 0xdde0f8, _name: 'light',
  },
};

function applyTheme(name) {
  // Всегда тёмная тема независимо от системных настроек
  const t = THEMES.dark;
  Object.assign(C, t);
  document.body.style.background = '#12121c';
}
// Всегда тёмная тема
applyTheme('dark');

/* Shared state */
const State = {
  initData: tg?.initData || '',
  player: null,
  playerLoadedAt: 0,   // timestamp последней загрузки профиля
  battle: null,
  lastResult: null,
  ws: null,
  appVersion: '...',
};

function post(path, body = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ init_data: State.initData, ...body }),
    signal: ctrl.signal,
  }).then(r => {
    clearTimeout(t);
    return r.json().catch(() => ({ ok: false, _httpStatus: r.status }));
  }).catch(e => { clearTimeout(t); throw e; });
}

function get(path, params = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const q = new URLSearchParams({ init_data: State.initData, ...params });
  return fetch(`${API}${path}?${q}`, { signal: ctrl.signal })
    .then(r => {
      clearTimeout(t);
      return r.json().catch(() => ({ ok: false, _httpStatus: r.status }));
    })
    .catch(e => { clearTimeout(t); throw e; });
}

/* ─── WebSocket ─────────────────────────────────────────────── */
function connectWS(userId, onMessage) {
  // Переиспользуем открытое соединение — просто меняем обработчик
  if (State.ws && State.ws.readyState === WebSocket.OPEN) {
    State.ws.onmessage = e => onMessage(JSON.parse(e.data));
    return State.ws;
  }
  // Закрываем "зависшее" соединение без авто-переподключения
  if (State.ws && State.ws.readyState !== WebSocket.CLOSED) {
    State.ws.onclose = null;
    State.ws.close();
  }

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const host  = API.replace(/^https?:/, '') || `//${location.host}`;
  const url   = `${proto}:${host}/ws/${userId}`;
  const ws    = new WebSocket(url);
  ws.onmessage = e => onMessage(JSON.parse(e.data));
  ws.onclose   = () => {
    // Переподключаемся только если это ещё активное соединение
    if (State.ws === ws) {
      setTimeout(() => connectWS(userId, onMessage), 3000);
    }
  };
  State.ws = ws;
  return ws;
}

/* ─── Вспомогательные Phaser-функции ────────────────────────── */
function makePanel(scene, x, y, w, h, radius = 14, alpha = 0.92) {
  const g = scene.add.graphics();
  g.fillStyle(C.bgPanel, alpha);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(1.5, C.gold, 0.25);
  g.strokeRoundedRect(x, y, w, h, radius);
  return g;
}

function makeBar(scene, x, y, w, h, pct, fillColor, bgColor = C.dark, radius = 4) {
  const g = scene.add.graphics();
  g.fillStyle(bgColor, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  const fw = Math.max(radius * 2, Math.round(w * Math.min(1, Math.max(0, pct))));
  g.fillStyle(fillColor, 1);
  g.fillRoundedRect(x, y, fw, h, radius);
  return g;
}

/* tCol() — заглушка (тема всегда тёмная, адаптация не нужна) */
function tCol(color) { return color; }

/* txt() — универсальный хелпер текста.
   stroke='#000' (опц.) добавляет обводку — для текста поверх цветных баров. */
function txt(scene, x, y, str, size = 14, color = '#f0f0fa', bold = false, stroke = null) {
  const style = {
    fontSize:   `${size}px`,
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontStyle:  bold ? 'bold' : 'normal',
    color:      tCol(color),
    resolution: 2,
  };
  if (stroke) { style.stroke = stroke; style.strokeThickness = Math.max(2, Math.round(size * 0.22)); }
  return scene.add.text(x, y, str, style);
}

/* makeBackBtn() — компактная кнопка «‹» в левом верхнем углу шапки.
   Всегда на верхнем слое (depth 20), не перекрывается контентом. */
function makeBackBtn(scene, label, onClick) {
  const bx = 10, bY = 14, bW = 44, bH = 44;
  const cx = bx + bW / 2, cy = bY + bH / 2;
  const D  = 20;   // depth выше панелей (depth 0) и контента
  const bg = scene.add.graphics().setDepth(D);
  const _draw = (pressed) => {
    bg.clear();
    /* Всегда рисуем видимый фон */
    bg.fillStyle(pressed ? 0x3a5080 : 0x1e3050, pressed ? 1 : 0.88);
    bg.fillRoundedRect(bx, bY, bW, bH, 10);
    bg.lineStyle(1.5, 0x5096ff, pressed ? 1 : 0.65);
    bg.strokeRoundedRect(bx, bY, bW, bH, 10);
  };
  _draw(false);
  const t = txt(scene, cx, cy, '‹', 26, '#c0d8ff', true).setOrigin(0.5).setDepth(D + 1);
  const z = scene.add.zone(cx, cy, bW, bH)
    .setInteractive({ useHandCursor: true })
    .setDepth(D + 2);   // zone выше всего — гарантирует перехват тапов
  z.on('pointerdown', () => { _draw(true);  tg?.HapticFeedback?.impactOccurred('light'); });
  z.on('pointerup',   () => { _draw(false); onClick(); });
  z.on('pointerout',  () => _draw(false));
  return { bg, t, z };
}

/* ═══════════════════════════════════════════════════════════
   BOOT SCENE — загрузка ресурсов + инициализация
   ═══════════════════════════════════════════════════════════ */
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Прогресс-бар загрузки
    const bar = document.getElementById('loading-bar');
    this.load.on('progress', v => { if (bar) bar.style.width = (v * 100) + '%'; });

    // Генерируем текстуры программно (без внешних файлов)
    this.load.on('complete', () => this._generateTextures());
  }

  _generateTextures() {
    /* Воин P1 (синий) */
    this._warrior('warrior_blue', '#4488ff', '#2255cc');
    /* Воин P2 / бот (красный) */
    this._warrior('warrior_red', '#ff4455', '#cc2233');
    /* Эффект удара */
    this._hitFx();
    /* Эффект крита */
    this._critFx();
    /* Эффект уворота */
    this._dodgeFx();
    /* Кнопка зоны */
    this._zoneBtn();
    /* Фон арены */
    this._arenaBg();
    /* Монета */
    this._coin();
  }

  _warrior(key, bodyColor, shadowColor) {
    const g = this.add.graphics({ x: -9999, y: -9999 });
    const W = 80, H = 120;
    g.generateTexture(key + '_tmp', W, H);

    const rt = this.add.renderTexture(0, 0, W, H).setVisible(false);
    const draw = this.add.graphics().setVisible(false);

    // Тень
    draw.fillStyle(parseInt(shadowColor.replace('#',''), 16), 0.3);
    draw.fillEllipse(40, 110, 50, 12);
    // Ноги
    draw.fillStyle(parseInt(bodyColor.replace('#',''), 16), 1);
    draw.fillRect(28, 80, 10, 32);
    draw.fillRect(42, 80, 10, 32);
    // Тело
    draw.fillRoundedRect(22, 40, 36, 42, 8);
    // Щит
    draw.fillStyle(0x3366cc, 1);
    draw.fillRoundedRect(4, 42, 18, 30, 5);
    draw.lineStyle(2, 0x88aaff, 1);
    draw.strokeRoundedRect(4, 42, 18, 30, 5);
    draw.lineStyle(2, 0xffffff, 0.5);
    draw.lineBetween(4+9, 42, 4+9, 72);
    // Рука с мечом
    draw.fillStyle(parseInt(bodyColor.replace('#',''), 16), 1);
    draw.fillRect(58, 44, 8, 6);
    // Меч
    draw.lineStyle(4, 0xffc83c, 1);
    draw.lineBetween(62, 50, 76, 22);
    draw.lineStyle(2, 0xffc83c, 0.6);
    draw.lineBetween(57, 42, 70, 42);
    // Голова
    draw.fillStyle(parseInt(bodyColor.replace('#',''), 16), 1);
    draw.fillCircle(40, 26, 16);
    // Шлем
    draw.fillStyle(parseInt(shadowColor.replace('#',''), 16), 1);
    draw.fillRect(24, 14, 32, 8);
    draw.fillStyle(0xffc83c, 1);
    draw.fillRect(34, 10, 12, 6);
    // Глаза
    draw.fillStyle(0xffffff, 1);
    draw.fillCircle(34, 26, 4);
    draw.fillCircle(46, 26, 4);
    draw.fillStyle(0x111122, 1);
    draw.fillCircle(35, 26, 2);
    draw.fillCircle(47, 26, 2);

    rt.draw(draw, 0, 0);
    rt.saveTexture(key);
    draw.destroy();
    rt.destroy();
    g.destroy();
  }

  _hitFx() {
    const g = this.add.graphics().setVisible(false);
    g.lineStyle(3, 0xff4444, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r1 = 10, r2 = 22;
      g.lineBetween(Math.cos(a)*r1+30, Math.sin(a)*r1+30, Math.cos(a)*r2+30, Math.sin(a)*r2+30);
    }
    g.generateTexture('hit_fx', 60, 60);
    g.destroy();
  }

  _critFx() {
    const g = this.add.graphics().setVisible(false);
    g.lineStyle(3, 0xffc83c, 1);
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = i % 2 === 0 ? 28 : 14;
      pts.push({ x: Math.cos(a)*r+30, y: Math.sin(a)*r+30 });
    }
    g.fillStyle(0xffc83c, 0.3);
    g.fillPoints(pts, true);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokePoints(pts, true);
    g.generateTexture('crit_fx', 60, 60);
    g.destroy();
  }

  _dodgeFx() {
    const g = this.add.graphics().setVisible(false);
    g.lineStyle(2, 0x3cc8dc, 0.8);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x3cc8dc, 0.15 - i * 0.02);
      g.fillEllipse(35 - i*6, 30, 30 - i*4, 20 - i*2);
    }
    g.generateTexture('dodge_fx', 70, 60);
    g.destroy();
  }

  _zoneBtn() {
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(0x2a2840, 1);
    g.fillRoundedRect(0, 0, 90, 44, 10);
    g.lineStyle(1.5, 0x5096ff, 0.5);
    g.strokeRoundedRect(0, 0, 90, 44, 10);
    g.generateTexture('zone_btn', 90, 44);
    g.destroy();
  }

  _arenaBg() {
    const W = 400, H = 240;
    const g = this.add.graphics().setVisible(false);
    // Пол
    g.fillStyle(0x1a1828, 1);
    g.fillRect(0, 0, W, H);
    // Арена (элипс пола)
    g.fillStyle(0x22203a, 1);
    g.fillEllipse(W/2, H*0.72, W*0.9, H*0.3);
    // Линия пола
    g.lineStyle(1, 0x5096ff, 0.15);
    g.strokeEllipse(W/2, H*0.72, W*0.9, H*0.3);
    // Факелы
    for (const fx of [60, W-60]) {
      g.fillStyle(0x2a2840, 1);
      g.fillRect(fx-4, H*0.2, 8, H*0.5);
      g.fillStyle(0xff8c00, 0.8);
      g.fillTriangle(fx-10, H*0.2, fx+10, H*0.2, fx, H*0.1);
    }
    g.generateTexture('arena_bg', W, H);
    g.destroy();
  }

  _coin() {
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(0xffc83c, 1);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0xcc9420, 1);
    g.fillCircle(12, 12, 9);
    g.fillStyle(0xffc83c, 1);
    g.fillText = () => {};
    g.generateTexture('coin', 24, 24);
    g.destroy();
  }

  create() {
    // Скрываем loading screen
    const ls = document.getElementById('loading-screen');
    if (ls) { ls.style.opacity = '0'; setTimeout(() => ls.remove(), 500); }
    this.scene.start('Menu');
  }
}

/* ── Менеджер in-game уведомлений ────────────────────────── */
const Notif = (() => {
  let _scene = null, _busy = false;
  const _q   = [];

  function _show() {
    if (_busy || !_q.length || !_scene) return;
    _busy = true;
    const { icon, msg, color, dur } = _q.shift();
    const W    = _scene.game.canvas.width;
    const panW = W - 28, panH = 48, panX = 14, panY = 82;
    const hexC = color || '#ffc83c';

    const g = _scene.add.graphics().setDepth(200).setY(-panH);
    g.fillStyle(C.bgPanel, 0.97);
    g.fillRoundedRect(panX, 0, panW, panH, 12);
    g.lineStyle(2, parseInt(hexC.replace('#','0x'), 16), 0.75);
    g.strokeRoundedRect(panX, 0, panW, panH, 12);

    const t = txt(_scene, panX + panW / 2, panH / 2, `${icon}  ${msg}`, 13, hexC, true)
      .setOrigin(0.5).setDepth(201).setY(panY - panH);

    _scene.tweens.add({
      targets: [g, t], y: `+=${panH}`,
      duration: 280, ease: 'Back.easeOut',
    });
    _scene.time.delayedCall(dur || 2600, () => {
      _scene.tweens.add({
        targets: [g, t], y: `-=${panH}`, alpha: 0,
        duration: 220, ease: 'Quad.easeIn',
        onComplete: () => { g.destroy(); t.destroy(); _busy = false; _show(); },
      });
    });
  }

  return {
    setScene(s) { _scene = s; _busy = false; },
    push(icon, msg, color, dur) { _q.push({ icon, msg, color, dur }); _show(); },
  };
})();

/* ═══════════════════════════════════════════════════════════
   MENU SCENE — главный экран
   ═══════════════════════════════════════════════════════════ */
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(data) {
    /* Если пришли из подсцены (Еще/Рейтинг/Статы) — запомним нужную вкладку */
    this._returnTab = (data && data.returnTab) ? data.returnTab : null;
  }

  async create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this.TAB_H = 76;
    this.CONTENT_H = H - this.TAB_H;
    this._panels = {};
    this._tabBtns = {};
    this._activeTab = null;

    this._drawBg(W, H);
    this._loadPlayer();
  }

  /* ── Загрузка профиля (с retry) ──────────────────────────── */
  async _loadPlayer() {
    const { W, H } = this;

    // Если Telegram ещё не передал initData — ждём до 2 сек
    if (!State.initData) {
      let waited = 0;
      while (!State.initData && waited < 2000) {
        await new Promise(r => setTimeout(r, 200));
        State.initData = window.Telegram?.WebApp?.initData || '';
        waited += 200;
      }
    }

    // Клиентский кэш профиля: если данные свежие (<30 сек) — не идём в сеть
    const _PROFILE_TTL = 30000;
    const cached = State.player && (Date.now() - State.playerLoadedAt) < _PROFILE_TTL;

    try {
      let playerOk = false;

      if (cached) {
        // Данные свежие — сразу рисуем UI, в фоне обновим квест-бейдж
        playerOk = true;
        get('/api/quests').catch(() => null).then(questRes => {
          if (!questRes?.ok) return;
          const q = questRes.quest || {};
          const d = questRes.daily || {};
          const badge = d.can_claim || (q.is_completed && !q.reward_claimed);
          if (badge !== this._questBadge) {
            this._questBadge = badge;
            // обновляем иконку таб-бара без перестройки всего UI
            if (this._tabBarObjs) this._buildTabBar();
          }
        });
        get('/api/version').catch(() => null).then(versionRes => {
          if (versionRes?.ok && versionRes.version) {
            State.appVersion = String(versionRes.version);
            if (this._panels?.more) { this._panels.more.destroy(); this._panels.more = null; }
            this._buildMorePanel();
            if (this._activeTab === 'more') this._switchTab('more');
            else if (this._panels?.more) this._panels.more.setVisible(false);
          }
        });
      } else {
        const playerRes = await post('/api/player');
        if (playerRes.ok) {
          State.player = playerRes.player;
          State.playerLoadedAt = Date.now();
          playerOk = true;

          // Неблокирующая догрузка второстепенных данных:
          // дашборд рисуем сразу после player, не ждём quests/version.
          get('/api/version').catch(() => null).then(versionRes => {
            if (versionRes?.ok && versionRes.version) {
              State.appVersion = String(versionRes.version);
              if (this._panels?.more) { this._panels.more.destroy(); this._panels.more = null; }
              this._buildMorePanel();
              if (this._activeTab === 'more') this._switchTab('more');
            }
          });

          this._questBadge = false;

          get('/api/quests').catch(() => null).then(questRes => {
            if (questRes?.ok) {
              const q = questRes.quest || {};
              const d = questRes.daily || {};
              this._questBadge = d.can_claim || (q.is_completed && !q.reward_claimed);
              if (this._tabBarObjs) this._buildTabBar();
              if (d.can_claim) {
                this.time.delayedCall(800, () =>
                  this._toast(`🎁 Ежедневный бонус доступен! +${d.bonus} 🪙`)
                );
              } else if (q.is_completed && !q.reward_claimed) {
                this.time.delayedCall(800, () =>
                  this._toast('🏆 Квест дня выполнен — забери награду!')
                );
              }
            }
          });
        }
      }

      if (playerOk) {
        try {
          this._buildTabBar();
          this._buildProfilePanel();
          this._buildBattlePanel();
          this._buildMorePanel();
          this._switchTab(this._returnTab || 'profile');
          this._setupWS();
          this._startRegenTick();
        } catch(buildErr) {
          console.error('UI build error:', buildErr);
          this._showError('Ошибка UI: ' + (buildErr?.message || buildErr));
        }
      } else {
        const code = playerRes?._httpStatus || playerRes?.detail || '';
        this._showError(code === 401 ? 'Открой через Telegram' : 'Ошибка сервера');
      }
    } catch(e) {
      const msg = e?.name === 'AbortError' ? 'Сервер не отвечает (таймаут)' : 'Нет соединения';
      this._showError(msg);
    }
  }

  /* ── Фон ─────────────────────────────────────────────── */
  _drawBg(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
    g.fillRect(0, 0, W, H);
    // Звёзды (в тёмной теме) или лёгкие блики (в светлой)
    const starAlpha = C._name === 'light' ? 0.08 : 0.5;
    for (let i = 0; i < 55; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.85);
      this.add.circle(x, y,
        Phaser.Math.FloatBetween(0.4, 1.8),
        C._name === 'light' ? C.blue : 0xffffff,
        Phaser.Math.FloatBetween(0.05, starAlpha));
    }
  }

  /* ══════════════════════════════════════════════════════
     ТАБ-БАР
     ══════════════════════════════════════════════════════ */
  _buildTabBar() {
    const { W, H, TAB_H } = this;
    const tabs = [
      { key: 'profile', icon: '🏠', label: 'Профиль' },
      { key: 'battle',  icon: '⚔️',  label: 'Бой'     },
      { key: 'stats',   icon: '📊',  label: 'Статы'   },
      { key: 'rating',  icon: '🏆',  label: 'Рейтинг' },
      { key: 'more',    icon: '☰',   label: 'Меню'    },
    ];

    // Подложка таб-бара — чуть светлее bg
    const bg = this.add.graphics();
    const tabBgCol = C._name === 'light' ? 0xe8ecff : 0x0e0d1a;
    bg.fillStyle(tabBgCol, 1);
    bg.fillRect(0, H - TAB_H, W, TAB_H);
    // Золотая черта сверху
    bg.lineStyle(1.5, C.gold, C._name === 'light' ? 0.35 : 0.22);
    bg.lineBetween(0, H - TAB_H, W, H - TAB_H);

    const tabW = W / tabs.length;
    tabs.forEach((tab, i) => {
      const cx = tabW * i + tabW / 2;
      const tabTop = H - TAB_H;

      // Фон активной вкладки
      const activeBg = this.add.graphics();
      activeBg.fillStyle(C.gold, 0.12);
      activeBg.fillRoundedRect(tabW * i + 5, tabTop + 5, tabW - 10, TAB_H - 10, 12);
      // Золотая черта-индикатор сверху
      const activeBar = this.add.graphics();
      activeBar.fillStyle(C.gold, 1);
      activeBar.fillRoundedRect(tabW * i + tabW * 0.2, tabTop + 1, tabW * 0.6, 3, 2);
      activeBg.setVisible(false);
      activeBar.setVisible(false);

      const iconTxt  = txt(this, cx, tabTop + 24, tab.icon, 24).setOrigin(0.5).setAlpha(0.45);
      const labelTxt = txt(this, cx, tabTop + 54, tab.label, 12, '#8888aa').setOrigin(0.5);

      this._tabBtns[tab.key] = { activeBg, activeBar, iconTxt, labelTxt };

      const zone = this.add.zone(cx, tabTop + TAB_H / 2, tabW, TAB_H).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        Sound.tab();
        tg?.HapticFeedback?.selectionChanged();
        if (tab.key === 'stats')  { this.scene.start('Stats',  { player: State.player }); return; }
        if (tab.key === 'rating') { this.scene.start('Rating'); return; }
        this._switchTab(tab.key);
      });
    });
  }

  _switchTab(key) {
    Object.entries(this._panels).forEach(([k, c]) => c?.setVisible(k === key));
    const inactiveCol = '#8888aa';
    const activeCol   = '#ffc83c';
    Object.entries(this._tabBtns).forEach(([k, btn]) => {
      const active = k === key;
      btn.activeBg.setVisible(active);
      btn.activeBar?.setVisible(active);
      btn.iconTxt.setAlpha(active ? 1 : 0.45);
      btn.labelTxt.setStyle({ color: active ? activeCol : inactiveCol });
    });
    this._activeTab = key;
  }

  /* ══════════════════════════════════════════════════════
     ПАНЕЛЬ: ПРОФИЛЬ
     ══════════════════════════════════════════════════════ */
  _buildProfilePanel() {
    const { W, CONTENT_H: CH } = this;
    const p   = State.player;
    const c   = this.add.container(0, 0);
    const pad = 14;

    /* ══ ШАПКА (header) ════════════════════════════════════ */
    const hH = 74, hY = 6;
    const hBg = this.add.graphics();
    hBg.fillStyle(C.bgPanel, 0.97);
    hBg.fillRoundedRect(pad, hY, W - pad * 2, hH, 14);
    hBg.lineStyle(2, C.gold, 0.28);
    hBg.strokeRoundedRect(pad, hY, W - pad * 2, hH, 14);

    // Бейдж уровня
    const lvlW = 60, lvlH = 30, lvlX = pad + 10, lvlY = hY + (hH - lvlH) / 2;
    const lvlG = this.add.graphics();
    lvlG.fillStyle(C.gold, 1);
    lvlG.fillRoundedRect(lvlX, lvlY, lvlW, lvlH, 9);
    const lvlTxt = txt(this, lvlX + lvlW / 2, hY + hH / 2, `УР.${p.level}`, 14, '#1a1a28', true).setOrigin(0.5);

    // Имя + статистика
    const nameX   = lvlX + lvlW + 10;
    const crown   = p.is_premium ? '👑 ' : '';
    const uname   = p.username.length > 15 ? p.username.slice(0, 14) + '…' : p.username;
    const nameTxt = txt(this, nameX, hY + 12, crown + uname, 18, p.is_premium ? '#c8a0ff' : '#f0f0fa', true);
    const premSub = p.is_premium ? `⭐ Premium · ${p.premium_days_left} дн.` : '';
    const titleBit = (!premSub && p.display_title) ? `🏵 ${p.display_title} · ` : '';
    const subTxt  = txt(this, nameX, hY + 38,
      premSub || `${titleBit}ELO ★ ${p.rating}  🏆 ${p.wins}W  💀 ${p.losses}L`, 12,
      p.is_premium ? '#b45aff' : '#ffc83c');

    // Золото и алмазы — справа вверху
    const goldTxt = txt(this, W - pad - 12, hY + 14, `💰 ${p.gold}`, 15, '#ffc83c', true).setOrigin(1, 0.5);
    txt(this, W - pad - 12, hY + 32, `💎 ${p.diamonds}`, 13, '#3cc8dc', true).setOrigin(1, 0.5);

    // Кнопка 🔊/🔇 — справа вверху
    const snX = W - pad - 16, snY = hY + 56;

    // Кнопка звука
    const snBg = this.add.graphics();
    snBg.fillStyle(C.dark, 0.7); snBg.fillCircle(snX, snY, 15);
    const snTxt = txt(this, snX, snY, Sound.muted ? '🔇' : '🔊', 13).setOrigin(0.5);
    const snZ = this.add.zone(snX, snY, 34, 34).setInteractive({ useHandCursor: true });
    snZ.on('pointerup', () => {
      const m = Sound.toggleMute();
      snTxt.setText(m ? '🔇' : '🔊');
      tg?.HapticFeedback?.selectionChanged();
    });

    /* ══ ПЕРСОНАЖ — по центру, увеличенный ════════════════ */
    const charY = 240;
    const warrior = this.add.image(W / 2, charY, 'warrior_blue').setScale(1.9).setOrigin(0.5);
    this.tweens.add({
      targets: warrior, y: charY - 9,
      duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Свечение под персонажем
    const glowG = this.add.graphics();
    glowG.fillStyle(C.blue, 0.06);
    glowG.fillEllipse(W / 2, charY + 115, 160, 28);

    /* ══ HP БАР — широкий, по центру ══════════════════════ */
    const hpW  = 200, hpH = 14;
    const hpX  = W / 2 - hpW / 2;
    const hpY  = charY + 122;
    const hpPct = p.hp_pct / 100;
    const hpCol = p.hp_pct > 50 ? C.green : p.hp_pct > 25 ? C.gold : C.red;
    const hpBg  = makeBar(this, hpX, hpY, hpW, hpH, hpPct, hpCol);
    const hpTxt = txt(this, W / 2, hpY + hpH / 2, `${p.current_hp} / ${p.max_hp} HP`, 11, '#ffffff', true, '#00000088').setOrigin(0.5);
    /* Сохраняем для live-обновления регеном без перезапуска сцены */
    this._liveHp = { g: hpBg, t: hpTxt, x: hpX, y: hpY, w: hpW, h: hpH };

    /* ── XP бар ── */
    let xpBg, xpTxt;
    const xpH = 14;
    const xpY = hpY + hpH + 6;
    if (!p.max_level) {
      xpBg  = makeBar(this, hpX, xpY, hpW, xpH, p.xp_pct / 100, C.blue, C.dark, 5);
      xpTxt = txt(this, W / 2, xpY + xpH / 2,
        `⭐ ${p.xp_pct}%  ·  ${p.exp} / ${p.exp_needed} XP`, 10, '#ffffff', true, '#00000088').setOrigin(0.5);
    } else {
      txt(this, W / 2, xpY + xpH / 2, '⭐ Макс. уровень', 11, '#ffc83c', true).setOrigin(0.5);
    }

    /* ══ СТАТЫ — 4 карточки в ряд ══════════════════════════ */
    const STATS = [
      { icon: '💪', label: 'СИЛ', val: p.strength,  color: C.red,    hex: '#dc3c46', sub: `~${p.dmg}ур`     },
      { icon: '🤸', label: 'ЛОВ', val: p.agility,   color: C.cyan,   hex: '#3cc8dc', sub: `${p.dodge_pct}%` },
      { icon: '💥', label: 'ИНТ', val: p.intuition, color: C.purple, hex: '#b45aff', sub: `${p.crit_pct}%`  },
      { icon: '🛡', label: 'ВЫН', val: p.stamina,   color: C.green,  hex: '#3cc864', sub: `${p.armor_pct}%` },
    ];
    const statsTop = xpBg ? xpY + 20 : xpY + 6;
    const scGap = 6, scH = 76;
    const scW   = (W - pad * 2 - scGap * 3) / 4;
    const maxV  = Math.max(1, 3 + p.level * 2);

    const statObjs = STATS.map((s, i) => {
      const scX  = pad + i * (scW + scGap);
      const scCX = scX + scW / 2;
      const hexC = s.hex;

      const sbg = this.add.graphics();
      sbg.fillStyle(C.bgPanel, 0.92);
      sbg.fillRoundedRect(scX, statsTop, scW, scH, 11);
      sbg.lineStyle(1.5, s.color, 0.28);
      sbg.strokeRoundedRect(scX, statsTop, scW, scH, 11);

      const icoT = txt(this, scCX, statsTop + 14, s.icon, 18).setOrigin(0.5);
      const valT = txt(this, scCX, statsTop + 36, String(s.val), 22, hexC, true).setOrigin(0.5);
      const subT = txt(this, scCX, statsTop + 58, s.sub, 13, hexC).setOrigin(0.5);

      // Прогресс-бар внутри карточки
      const pct = Math.min(1, s.val / maxV);
      const bW  = scW - 12;
      const bbrG = this.add.graphics();
      bbrG.fillStyle(C.dark, 1);
      bbrG.fillRoundedRect(scX + 6, statsTop + scH - 8, bW, 4, 2);
      bbrG.fillStyle(s.color, 0.85);
      bbrG.fillRoundedRect(scX + 6, statsTop + scH - 8, Math.max(4, bW * pct), 4, 2);

      return [sbg, icoT, valT, subT, bbrG];
    });

    /* ══ СВОБОДНЫЕ ОЧКИ СТАТОВ ═════════════════════════════ */
    let fsBadge = [];
    const fsY = statsTop + scH + 10;
    if (p.free_stats > 0) {
      const fsG = this.add.graphics();
      fsG.fillStyle(0x5520a0, 0.88);
      fsG.fillRoundedRect(W / 2 - 105, fsY, 210, 32, 10);
      fsG.lineStyle(1.5, C.purple, 0.8);
      fsG.strokeRoundedRect(W / 2 - 105, fsY, 210, 32, 10);
      const fsT = txt(this, W / 2, fsY + 16, `⚡ ${p.free_stats} свободных очка статов`, 12, '#ffc83c', true).setOrigin(0.5);
      this.tweens.add({ targets: fsG, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
      fsBadge = [fsG, fsT];
    }

    /* ══ РЕГЕН HP ═══════════════════════════════════════════ */
    let regenObjs = [];
    const regenBaseY = fsBadge.length ? fsY + 42 : fsY + 4;
    if (p.current_hp < p.max_hp) {
      const rate = p.regen_per_min || 0;
      let secsLeft = p.regen_secs_to_full || 0;
      const _fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const regenTxt = txt(this, W / 2, regenBaseY,
        `❤️ +${rate}/мин · полный через ${_fmt(secsLeft)}`, 11, '#cc6655').setOrigin(0.5);
      this._regenInterval = this.time.addEvent({
        delay: 1000, loop: true,
        callback: () => {
          if (secsLeft <= 0) { regenTxt.setText('✅ HP полный!').setStyle({ color: '#3cc864' }); return; }
          secsLeft = Math.max(0, secsLeft - 1);
          regenTxt.setText(secsLeft > 0
            ? `❤️ +${rate}/мин · полный через ${_fmt(secsLeft)}`
            : '✅ HP полный!');
        },
      });
      regenObjs = [regenTxt];
    }

    /* ══ КНОПКА АПТЕКА ══════════════════════════════════════ */
    let hpExtra = [];
    const apBtnY = regenBaseY + (regenObjs.length ? 20 : 4);
    if (p.hp_pct < 100) {
      const apW = 170, apH = 38, apX = W / 2 - apW / 2;
      const apBg = this.add.graphics();
      apBg.fillStyle(C.red, 0.88);
      apBg.fillRoundedRect(apX, apBtnY, apW, apH, 11);
      const apT = txt(this, W / 2, apBtnY + apH / 2, '🧪 Аптека', 14, '#ffffff', true).setOrigin(0.5);
      const apZ = this.add.zone(W / 2, apBtnY + apH / 2, apW, apH).setInteractive({ useHandCursor: true });
      apZ.on('pointerdown', () => { apBg.clear(); apBg.fillStyle(0x991a22, 1); apBg.fillRoundedRect(apX, apBtnY, apW, apH, 11); });
      apZ.on('pointerup',   () => { tg?.HapticFeedback?.impactOccurred('medium'); this.scene.start('Shop', { tab: 'potions' }); });
      apZ.on('pointerout',  () => { apBg.clear(); apBg.fillStyle(C.red, 0.88); apBg.fillRoundedRect(apX, apBtnY, apW, apH, 11); });
      hpExtra = [apBg, apT, apZ];
    }

    /* ══ КНОПКА ОБНОВИТЬ ════════════════════════════════════ */
    const refH = 44, refY = CH - refH - 6;
    const refW = W - 56, refX = 28;
    const refG = this.add.graphics();
    refG.fillStyle(C.dark, 0.85);
    refG.fillRoundedRect(refX, refY, refW, refH, 13);
    refG.lineStyle(1.5, C.blue, 0.35);
    refG.strokeRoundedRect(refX, refY, refW, refH, 13);
    const refT = txt(this, W / 2, refY + refH / 2, '🔄 Обновить данные', 14, '#7799cc', true).setOrigin(0.5);
    const refZ = this.add.zone(W / 2, refY + refH / 2, refW, refH).setInteractive({ useHandCursor: true });
    let _refBusy = false;
    refZ.on('pointerdown', () => { refG.clear(); refG.fillStyle(C.blue, 0.25); refG.fillRoundedRect(refX, refY, refW, refH, 13); tg?.HapticFeedback?.impactOccurred('light'); });
    refZ.on('pointerup',   () => { if (_refBusy) return; _refBusy = true; refT.setText('⏳'); this.time.delayedCall(400, () => this.scene.restart({ returnTab: this._activeTab || 'profile' })); });
    refZ.on('pointerout',  () => { refG.clear(); refG.fillStyle(C.dark, 0.85); refG.fillRoundedRect(refX, refY, refW, refH, 13); refG.lineStyle(1.5, C.blue, 0.35); refG.strokeRoundedRect(refX, refY, refW, refH, 13); });

    /* ══ СБОРКА ═════════════════════════════════════════════ */
    const children = [
      hBg, lvlG, lvlTxt, nameTxt, subTxt, goldTxt,
      snBg, snTxt, snZ,
      glowG, warrior, hpBg, hpTxt,
      ...statObjs.flat(),
      refG, refT, refZ,
    ];
    if (xpBg)        children.push(xpBg, xpTxt);
    if (fsBadge.length)   children.push(...fsBadge);
    if (regenObjs.length) children.push(...regenObjs);
    children.push(...hpExtra);
    children.forEach(o => c.add(o));

    this._panels.profile = c;
  }

  /* ══════════════════════════════════════════════════════
     ПАНЕЛЬ: БОЙ
     ══════════════════════════════════════════════════════ */
  _buildBattlePanel() {
    const { W, CONTENT_H: CH } = this;
    const p = State.player;
    const c = this.add.container(0, 0);
    const PAD = 16;

    // ── Заголовок
    const title = txt(this, W / 2, 26, '⚔️  ВЫБЕРИ БОЙ', 18, '#ffc83c', true).setOrigin(0.5);

    // ── PvP карточка (главная, крупнее)
    const pvpCY = CH * 0.20;
    const pvpCard = this._makeBattleCard(
      W / 2, pvpCY,
      '⚔️  ПОИСК СОПЕРНИКА',
      'Живой игрок · рейтинговый бой',
      '🏆 +рейтинг  💰+30%  ⭐+30% за победу',
      C.red, 0xdc3c46,
      () => this._onFight()
    );

    // ── Сетка вспомогательных кнопок ─────────────────────────────────────────
    // Две колонки одинаковой высоты + одна полная строка снизу
    const BH  = 38;
    const BG  = 8;
    const BW  = (W - PAD * 2 - BG) / 2;
    const GT  = pvpCY + 58;   // gridTop: сразу под картой PvP

    // Локальная фабрика полукнопки
    const secBtn = (col, row, label, fillHex, borderHex, textColor, cb) => {
      const bx = PAD + col * (BW + BG);
      const by = GT + row * (BH + BG);
      const bg = this.add.graphics();
      bg.fillStyle(fillHex, 0.92);
      bg.fillRoundedRect(bx, by, BW, BH, 9);
      bg.lineStyle(1.5, borderHex, 0.5);
      bg.strokeRoundedRect(bx, by, BW, BH, 9);
      const t = txt(this, bx + BW / 2, by + BH / 2, label, 11, textColor, true).setOrigin(0.5);
      const z = this.add.zone(bx, by, BW, BH).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { tg?.HapticFeedback?.impactOccurred('light'); });
      z.on('pointerup', cb);
      return [bg, t, z];
    };

    // Локальная фабрика кнопки полной ширины
    const secBtnFull = (row, label, fillHex, borderHex, textColor, cb) => {
      const bx = PAD, bw = W - PAD * 2;
      const by = GT + row * (BH + BG);
      const bg = this.add.graphics();
      bg.fillStyle(fillHex, 0.85);
      bg.fillRoundedRect(bx, by, bw, BH, 9);
      bg.lineStyle(1.5, borderHex, 0.4);
      bg.strokeRoundedRect(bx, by, bw, BH, 9);
      const t = txt(this, bx + bw / 2, by + BH / 2, label, 11, textColor, true).setOrigin(0.5);
      const z = this.add.zone(bx, by, bw, BH).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { tg?.HapticFeedback?.impactOccurred('light'); });
      z.on('pointerup', cb);
      return [bg, t, z];
    };

    // Строка 0: [🎯 Вызов по нику]  [📨 Мои вызовы]
    const btnCh  = secBtn(0, 0, '🎯 Вызов по нику', 0x2e2010, C.gold,   '#ffdca0', () => this._onChallengeByNick());
    const btnMyC = secBtn(1, 0, '📨 Мои вызовы',   0x161e38, C.blue,   '#b8d4ff', () => this._showOutgoingChallenges());
    // Строка 1: [🗿 Башня Титанов] — во всю ширину
    const btnTT  = secBtnFull(1, '🗿 Башня Титанов', 0x1e1630, C.purple, '#d8c0ff', () => this._onTitanFight());
    // Строка 2: [🔥 Натиск] — во всю ширину
    const btnNatisk = secBtnFull(2, '🔥 Натиск  —  Арена выживания', 0x2a1010, 0xdc3c46, '#ff9999', () => this.scene.start('Natisk'));

    // ── Бот карточка (главная, крупнее)
    const botCY = CH * 0.76;
    const botCard = this._makeBattleCard(
      W / 2, botCY,
      '🤖  БОЙ С БОТОМ',
      'Практика · нет рейтинга',
      '💰 +золото  ⭐ +опыт',
      C.blue, 0x2a4880,
      () => this._onBotFight()
    );

    // ── HP блок
    const hpBlockY = CH * 0.88;
    const hpBlockObjs = [];

    const hpPct = p.hp_pct / 100;
    const hpCol = p.hp_pct > 50 ? C.green : p.hp_pct > 25 ? C.gold : C.red;
    hpBlockObjs.push(makeBar(this, 20, hpBlockY, W - 40, 10, hpPct, hpCol));
    hpBlockObjs.push(
      txt(this, W / 2, hpBlockY + 5, `❤️ ${p.current_hp}/${p.max_hp} HP`, 9, '#f0f0fa').setOrigin(0.5)
    );

    if (p.hp_pct < 100) {
      const regenStr = p.regen_secs_to_full > 0
        ? `+${p.regen_per_min}/мин · полный через ${Math.ceil(p.regen_secs_to_full / 60)}мин`
        : `+${p.regen_per_min}/мин`;
      hpBlockObjs.push(txt(this, 20, hpBlockY + 14, regenStr, 8, '#cc7777'));
    }

    if (p.hp_pct < 30) {
      const canAfford = (p.gold || 0) >= 12;
      const btnBY = hpBlockY + 28;
      const qBg = this.add.graphics();
      qBg.fillStyle(canAfford ? C.red : C.dark, canAfford ? 0.88 : 0.55);
      qBg.fillRoundedRect(20, btnBY, W - 40, 38, 10);
      if (canAfford) { qBg.lineStyle(1.5, C.gold, 0.3); qBg.strokeRoundedRect(20, btnBY, W - 40, 38, 10); }
      const qLabel = canAfford
        ? `🧪 Выпить малое зелье  —  12 🪙`
        : `🧪 Нужно 12 🪙 (у вас ${p.gold || 0})`;
      const qT = txt(this, W / 2, btnBY + 19, qLabel, 11, canAfford ? '#ffffff' : '#cc8888', true).setOrigin(0.5);
      const qZ = this.add.zone(20, btnBY, W - 40, 38).setOrigin(0)
        .setInteractive({ useHandCursor: canAfford });
      if (canAfford) {
        qZ.on('pointerdown', () => { qBg.clear(); qBg.fillStyle(0x991a22,1); qBg.fillRoundedRect(20,btnBY,W-40,38,10); tg?.HapticFeedback?.impactOccurred('medium'); });
        qZ.on('pointerout',  () => { qBg.clear(); qBg.fillStyle(C.red,0.88); qBg.fillRoundedRect(20,btnBY,W-40,38,10); qBg.lineStyle(1.5,C.gold,0.3); qBg.strokeRoundedRect(20,btnBY,W-40,38,10); });
        qZ.on('pointerup',   () => this._quickHeal(qBg, qT, qZ, 20, btnBY, W - 40, 38));
      }
      hpBlockObjs.push(qBg, qT, qZ);
    }

    const children = [
      title,
      ...pvpCard,
      ...btnCh, ...btnMyC,
      ...btnTT,
      ...btnNatisk,
      ...botCard,
      ...hpBlockObjs,
    ];
    children.forEach(o => c.add(o));

    this._panels.battle = c;
    this._checkIncomingChallenge();
  }

  _makeBattleCard(cx, cy, title, sub, bonus, borderColor, fillColor, cb) {
    const { W } = this;
    const cw = W - 32, ch = 100;
    const x = cx - cw / 2, y = cy - ch / 2;
    const objs = [];

    const bg = this.add.graphics();
    bg.fillStyle(fillColor, 0.18);
    bg.fillRoundedRect(x, y, cw, ch, 14);
    bg.lineStyle(2, borderColor, 0.7);
    bg.strokeRoundedRect(x, y, cw, ch, 14);
    objs.push(bg);

    // Блик
    const shine = this.add.graphics();
    shine.fillStyle(0xffffff, 0.05);
    shine.fillRoundedRect(x + 4, y + 4, cw - 8, ch * 0.42, 11);
    objs.push(shine);

    objs.push(txt(this, cx, y + 26, title,  16, '#f0f0fa', true).setOrigin(0.5));
    objs.push(txt(this, cx, y + 50, sub,    11, '#8888aa').setOrigin(0.5));
    objs.push(txt(this, cx, y + 72, bonus,  10, `#${borderColor.toString(16).padStart(6,'0')}`).setOrigin(0.5));

    const zone = this.add.zone(cx, cy, cw, ch).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      bg.clear();
      bg.fillStyle(fillColor, 0.32);
      bg.fillRoundedRect(x, y, cw, ch, 14);
      bg.lineStyle(2, borderColor, 1);
      bg.strokeRoundedRect(x, y, cw, ch, 14);
      tg?.HapticFeedback?.impactOccurred('medium');
    });
    zone.on('pointerup', () => {
      bg.clear();
      bg.fillStyle(fillColor, 0.18);
      bg.fillRoundedRect(x, y, cw, ch, 14);
      bg.lineStyle(2, borderColor, 0.7);
      bg.strokeRoundedRect(x, y, cw, ch, 14);
      cb();
    });
    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(fillColor, 0.18);
      bg.fillRoundedRect(x, y, cw, ch, 14);
      bg.lineStyle(2, borderColor, 0.7);
      bg.strokeRoundedRect(x, y, cw, ch, 14);
    });
    objs.push(zone);
    return objs;
  }

  /* ══════════════════════════════════════════════════════
     ПАНЕЛЬ: ЕЩЁ
     ══════════════════════════════════════════════════════ */
  _buildMorePanel() {
    const { W, CONTENT_H: CH } = this;
    const c = this.add.container(0, 0);

    const items = [
      { icon: '📅', label: 'Задания',    cb: () => this.scene.start('Quests'),    badge: this._questBadge },
      { icon: '🛍️', label: 'Магазин',    cb: () => this.scene.start('Shop')       },
      { icon: '🌟', label: 'Боевой пропуск', cb: () => this.scene.start('BattlePass') },
      { icon: '⚔️', label: 'Клан',       cb: () => this.scene.start('Clan')       },
      { icon: '🔗', label: 'Рефералка',  cb: () => this._onInvite()               },
    ];

    const cols = 2;
    const gap  = 10;
    const bw   = (W - gap * 3) / cols;  // ширина карточки
    const bh   = 90;                    // высота карточки
    const startY = 16;

    items.forEach((item, i) => {
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const bx   = gap + col * (bw + gap);          // left edge
      const by   = startY + row * (bh + gap);       // top edge
      const bcx  = bx + bw / 2;                     // center x
      const bcy  = by + bh / 2;                     // center y

      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.93);
      bg.fillRoundedRect(bx, by, bw, bh, 14);
      bg.lineStyle(1.5, C.dark, 0.7);
      bg.strokeRoundedRect(bx, by, bw, bh, 14);
      c.add(bg);

      // Иконка (крупнее)
      c.add(txt(this, bcx, by + 26, item.icon, 30).setOrigin(0.5));
      // Подпись (крупнее, чётче)
      c.add(txt(this, bcx, by + 68, item.label, 13, '#d0d0ee').setOrigin(0.5));

      // Красный бейдж "!" если есть что забрать
      if (item.badge) {
        const bdg = this.add.graphics();
        bdg.fillStyle(C.red, 1);
        bdg.fillCircle(bx + bw - 14, by + 14, 10);
        c.add(bdg);
        c.add(txt(this, bx + bw - 14, by + 14, '!', 11, '#ffffff', true).setOrigin(0.5));
      }

      const zone = this.add.zone(bcx, bcy, bw, bh).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        bg.clear();
        bg.fillStyle(C.blue, 0.18);
        bg.fillRoundedRect(bx, by, bw, bh, 14);
        bg.lineStyle(1.5, C.blue, 0.6);
        bg.strokeRoundedRect(bx, by, bw, bh, 14);
        tg?.HapticFeedback?.selectionChanged();
      });
      zone.on('pointerup', () => {
        bg.clear();
        bg.fillStyle(C.bgPanel, 0.93);
        bg.fillRoundedRect(bx, by, bw, bh, 14);
        bg.lineStyle(1.5, C.dark, 0.7);
        bg.strokeRoundedRect(bx, by, bw, bh, 14);
        Sound.click();
        item.cb();
      });
      zone.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(C.bgPanel, 0.93);
        bg.fillRoundedRect(bx, by, bw, bh, 14);
        bg.lineStyle(1.5, C.dark, 0.7);
        bg.strokeRoundedRect(bx, by, bw, bh, 14);
      });
      c.add(zone);
    });

    // Версия — крупная, хорошо видна
    const verY = CH - 32;
    const verBg = this.add.graphics();
    verBg.fillStyle(0x1e1c30, 0.9);
    verBg.fillRoundedRect(W / 2 - 90, verY - 14, 180, 28, 8);
    verBg.lineStyle(1.5, C.gold, 0.35);
    verBg.strokeRoundedRect(W / 2 - 90, verY - 14, 180, 28, 8);
    c.add(verBg);
    c.add(txt(this, W / 2, verY, `⚔️  Duel Arena  v${State.appVersion || '1.01'}`, 13, '#ffc83c', true).setOrigin(0.5));
    c.add(txt(this, W / 2, CH - 10, '@ZenDuelArena_bot', 10, '#9999bb').setOrigin(0.5));

    this._panels.more = c;
  }

  /* ══════════════════════════════════════════════════════
     ЛОГИКА КНОПОК
     ══════════════════════════════════════════════════════ */
  async _onFight() {
    const p = State.player;
    if (!p) return;
    if (p.hp_pct < 30) {
      tg?.HapticFeedback?.notificationOccurred('error');
      this._toast('❤️ Нужно восстановить HP!');
      return;
    }
    this._toast('🔍 Ищем соперника...');
    try {
      const res = await post('/api/battle/find', { queue_only: true });
      if (!res.ok) {
        this._toast(res.reason === 'low_hp' ? '❤️ Нужно восстановить HP!' : '❌ Нет противников');
        return;
      }
      if (res.status === 'queued') { this.scene.start('Queue'); return; }
      State.battle = res.battle;
      this.scene.start('Battle');
    } catch(e) { this._toast('❌ Нет соединения'); }
  }

  async _onBotFight() {
    const p = State.player;
    if (!p) return;
    if (p.hp_pct < 30) {
      tg?.HapticFeedback?.notificationOccurred('error');
      this._toast('❤️ Нужно восстановить HP!');
      return;
    }
    this._toast('🤖 Запускаем бой с ботом...');
    try {
      const res = await post('/api/battle/find', { prefer_bot: true });
      if (!res.ok) { this._toast('❌ Ошибка'); return; }
      State.battle = res.battle;
      this.scene.start('Battle');
    } catch(e) { this._toast('❌ Нет соединения'); }
  }

  async _onTitanFight() {
    const p = State.player;
    if (!p) return;
    if (p.hp_pct < 30) {
      this._toast('❤️ Нужно восстановить HP!');
      return;
    }
    this._toast('🗿 Запускаем Башню титанов...');
    try {
      const res = await post('/api/titans/start', {});
      if (!res.ok) {
        this._toast(res.reason === 'low_hp' ? '❤️ Нужно восстановить HP!' : '❌ Башня недоступна');
        return;
      }
      State.battle = res.battle;
      this.scene.start('Battle');
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
  }

  async _onEndlessFight() {
    if (this._buying) return;
    this._buying = true;
    try {
      const res = await post('/api/endless/start', {});
      if (!res.ok) { this._toast('❌ ' + (res.reason || 'Ошибка')); this._buying = false; return; }
      State.battle = res.battle;
      State.endlessWave = res.wave;
      this.scene.start('Battle');
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
    this._buying = false;
  }

  async _showOutgoingChallenges() {
    try {
      const res = await get('/api/battle/challenge/outgoing');
      if (!res.ok) { this._toast('❌ Не удалось загрузить'); return; }
      const list = (res.challenges || []).slice(0, 5);
      if (!list.length) {
        tg?.showAlert?.('📭 У вас нет активных/последних вызовов.');
        return;
      }
      const lines = list.map((c, i) => `${i + 1}. @${c.target_username || 'Боец'} · ${c.status}`);
      tg?.showAlert?.(`📨 Мои вызовы:\n${lines.join('\n')}`);
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
  }

  _showPvpTop() {
    this.scene.start('Rating');
  }

  _showSummary() {
    const p = State.player;
    if (!p) return;
    const total = p.wins + p.losses;
    const wr = total > 0 ? Math.round(p.wins / total * 100) : 0;
    this._toast(`🏆 ${p.wins}W  💀 ${p.losses}L  · WR ${wr}%`);
  }

  _onInvite() {
    const { W, H } = this;

    /* ── Затемнение ── */
    const ov = this.add.graphics().setDepth(60);
    ov.fillStyle(0x000000, 0.55); ov.fillRect(0, 0, W, H);

    /* ── Панель — по высоте экрана с отступами ── */
    const pw = W - 32, ph = Math.min(410, H - 56), px = 16, py = Math.max(8, Math.round((H - ph) / 2));
    const D = 62;
    const panBg = this.add.graphics().setDepth(61);
    panBg.fillStyle(0x1e3a7a, 1);
    panBg.fillRoundedRect(px, py, pw, ph, 16);
    panBg.lineStyle(2.5, 0xffc83c, 0.9);
    panBg.strokeRoundedRect(px, py, pw, ph, 16);
    panBg.fillStyle(0xffffff, 0.06);
    panBg.fillRoundedRect(px+2, py+2, pw-4, 26, 14);

    const at = (x, y, s, sz, col, bold) =>
      txt(this, x, y, s, sz, col || '#f0f0fa', bold).setOrigin(0.5).setDepth(D);
    const atL = (x, y, s, sz, col, bold) =>
      txt(this, x, y, s, sz, col || '#f0f0fa', bold).setOrigin(0, 0.5).setDepth(D);

    /* ── Заголовок ── */
    at(px+pw/2, py+18, '🔗  РЕФЕРАЛКА', 15, '#ffc83c', true);

    /* ── Кнопка ✕ ── */
    const xBg = this.add.graphics().setDepth(D);
    xBg.fillStyle(0x2a50a0, 1); xBg.fillCircle(px+pw-18, py+18, 13);
    txt(this, px+pw-18, py+18, '✕', 13, '#f0f0fa', true).setOrigin(0.5).setDepth(D+1);

    const close = () => this.children.list
      .filter(o => o.depth >= 59)
      .forEach(o => { try { o.destroy(); } catch(_){} });
    this.add.zone(px+pw-32, py, 32, 32).setOrigin(0).setDepth(70)
      .setInteractive({ useHandCursor: true }).on('pointerup', close);
    this.add.zone(0, 0, W, H).setOrigin(0).setDepth(59).setInteractive()
      .on('pointerup', ptr => {
        if (ptr.x < px || ptr.x > px+pw || ptr.y < py || ptr.y > py+ph) close();
      });

    /* ─── ВКЛАДКИ ──────────────────────────────────────────── */
    const tabY = py + 36, tabH = 32, tabW = (pw - 24) / 2;
    let activeTab = 'stats';
    const statsObjs = [], infoObjs = [];

    /* фон вкладок */
    const tabBar = this.add.graphics().setDepth(D);
    tabBar.fillStyle(0x12245a, 1);
    tabBar.fillRoundedRect(px+8, tabY, pw-16, tabH, 8);

    /* отрисовка активной вкладки */
    const tabAct = this.add.graphics().setDepth(D);
    const drawTabAct = (tab) => {
      tabAct.clear();
      const tx = tab === 'stats' ? px+8 : px+8+tabW+4;
      tabAct.fillStyle(0x3a7aff, 1);
      tabAct.fillRoundedRect(tx+2, tabY+3, tabW-4, tabH-6, 6);
    };
    drawTabAct('stats');

    const t1 = at(px+8+tabW/2,     tabY+16, '📊 Статистика', 11, '#ffffff', true);
    const t2 = at(px+8+tabW+4+tabW/2, tabY+16, 'ℹ️ Условия',    11, '#a8c4ff');

    const switchTab = (tab) => {
      activeTab = tab;
      drawTabAct(tab);
      t1.setStyle({ color: tCol(tab==='stats' ? '#ffffff' : '#a8c4ff') });
      t2.setStyle({ color: tCol(tab==='info'  ? '#ffffff' : '#a8c4ff') });
      statsObjs.forEach(o => o?.setVisible?.(tab === 'stats'));
      infoObjs.forEach(o  => o?.setVisible?.(tab === 'info'));
      tg?.HapticFeedback?.impactOccurred('light');
    };

    this.add.zone(px+8, tabY, tabW, tabH).setOrigin(0).setDepth(70)
      .setInteractive({ useHandCursor: true }).on('pointerup', () => switchTab('stats'));
    this.add.zone(px+8+tabW+4, tabY, tabW, tabH).setOrigin(0).setDepth(70)
      .setInteractive({ useHandCursor: true }).on('pointerup', () => switchTab('info'));

    /* ─── СОДЕРЖИМОЕ: СТАТИСТИКА ─────────────────────────── */
    const cY = tabY + tabH + 10;  /* начало контента */

    const loadTxt = at(px+pw/2, cY+20, '⏳ Загрузка...', 11, '#a8c4ff');
    statsObjs.push(loadTxt);

    get('/api/referral').then(rd => {
      loadTxt.destroy();
      statsObjs.splice(statsObjs.indexOf(loadTxt), 1);

      const link         = rd.link || `https://t.me/ZenDuelArena_bot?start=ref_${State.player?.user_id}`;
      const inv          = rd.invited_count     || 0;
      const prem         = rd.paying_subscribers || 0;
      const usdtBal      = rd.usdt_balance       || 0;
      const usdtTotal    = rd.total_reward_usdt  || 0;
      const canWithdraw  = rd.can_withdraw       || false;
      const cooldownH    = rd.cooldown_hours     || 0;
      const withdrawMin  = rd.withdraw_min       || 5;

      /* плитки */
      const stW = (pw - 32) / 2;
      const s1x = px+12, s2x = px+16+stW, sH = 50;

      const s1 = this.add.graphics().setDepth(D);
      s1.fillStyle(0x2a50a0,1); s1.fillRoundedRect(s1x,cY,stW,sH,10);
      s1.lineStyle(1.5,0x5096ff,0.6); s1.strokeRoundedRect(s1x,cY,stW,sH,10);
      const s1l = at(s1x+stW/2, cY+14, '👥 Приглашено',  11, '#a8c4ff');
      const s1v = at(s1x+stW/2, cY+34, `${inv}`, 18, '#ffffff', true);

      const s2 = this.add.graphics().setDepth(D);
      s2.fillStyle(0x2a50a0,1); s2.fillRoundedRect(s2x,cY,stW,sH,10);
      s2.lineStyle(1.5,0xffc83c,0.5); s2.strokeRoundedRect(s2x,cY,stW,sH,10);
      const s2l = at(s2x+stW/2, cY+14, '💰 USDT заработано', 11, '#a8c4ff');
      const s2v = at(s2x+stW/2, cY+34, `$${usdtTotal.toFixed(2)}`, 18, '#ffc83c', true);

      let premTxt = null;
      if (prem > 0) premTxt = at(px+pw/2, cY+sH+10, `⭐ Из них купили Premium: ${prem}`, 11, '#ffc83c');

      /* Баланс USDT к выводу */
      const balY = cY + sH + (prem > 0 ? 28 : 12);
      let balObjs = [];
      if (usdtBal > 0) {
        const balBg = this.add.graphics().setDepth(D);
        balBg.fillStyle(0x1a4a18, 1); balBg.fillRoundedRect(px+10, balY, pw-20, 38, 9);
        balBg.lineStyle(1.5, 0x3cc864, 0.7); balBg.strokeRoundedRect(px+10, balY, pw-20, 38, 9);
        const balL = at(px+pw/2, balY+12, '💸 Доступно к выводу', 11, '#a8ffb8');
        const balV = at(px+pw/2, balY+28, `$${usdtBal.toFixed(4)} USDT`, 14, '#3cc864', true);
        balObjs = [balBg, balL, balV];
      } else {
        const noBalT = at(px+pw/2, balY+10, `Баланс: $0.00 — зарабатывай приглашая`, 11, '#8888cc');
        balObjs = [noBalT];
      }
      statsObjs.push(...balObjs);

      /* ссылка */
      const lbY = balY + (usdtBal > 0 ? 48 : 28);
      const lbLbl = at(px+pw/2, lbY, 'Твоя реферальная ссылка:', 11, '#a8c4ff');
      const lb = this.add.graphics().setDepth(D);
      lb.fillStyle(0x0e2060,1); lb.fillRoundedRect(px+10,lbY+12,pw-20,28,8);
      lb.lineStyle(1,0x5096ff,0.5); lb.strokeRoundedRect(px+10,lbY+12,pw-20,28,8);
      const lbTxt = at(px+pw/2, lbY+26, link.replace('https://',''), 10, '#7ab4ff');

      /* кнопки */
      const cbY = lbY + 50;
      const halfW = (pw - 28) / 2;
      const cbg = this.add.graphics().setDepth(D);
      cbg.fillStyle(0x3a7aff,1); cbg.fillRoundedRect(px+10,cbY,halfW,38,10);
      cbg.fillStyle(0xffffff,0.12); cbg.fillRoundedRect(px+10,cbY+2,halfW,16,8);
      const cbT = at(px+10+halfW/2, cbY+19, '📋 Скопировать', 12, '#ffffff', true);
      const cbZ = this.add.zone(px+10,cbY,halfW,38).setOrigin(0).setDepth(65)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { cbg.clear(); cbg.fillStyle(0x2060e0,1); cbg.fillRoundedRect(px+10,cbY,halfW,38,10); })
        .on('pointerout',  () => { cbg.clear(); cbg.fillStyle(0x3a7aff,1); cbg.fillRoundedRect(px+10,cbY,halfW,38,10); cbg.fillStyle(0xffffff,0.12); cbg.fillRoundedRect(px+10,cbY+2,halfW,16,8); })
        .on('pointerup', () => {
          tg?.HapticFeedback?.notificationOccurred('success');
          navigator.clipboard?.writeText(link)
            .then(() => this._toast('✅ Ссылка скопирована!'))
            .catch(() => { tg?.openLink?.(link); });
        });

      const sbx = px+12+halfW+6;
      const sbg = this.add.graphics().setDepth(D);
      sbg.fillStyle(0x1a7a48,1); sbg.fillRoundedRect(sbx,cbY,halfW,38,10);
      const sbT = at(sbx+halfW/2, cbY+19, '💬 Поделиться', 12, '#ffffff', true);
      const sbZ = this.add.zone(sbx,cbY,halfW,38).setOrigin(0).setDepth(65)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { sbg.clear(); sbg.fillStyle(0x0f5030,1); sbg.fillRoundedRect(sbx,cbY,halfW,38,10); })
        .on('pointerout',  () => { sbg.clear(); sbg.fillStyle(0x1a7a48,1); sbg.fillRoundedRect(sbx,cbY,halfW,38,10); })
        .on('pointerup', () => {
          const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('⚔️ Присоединяйся к Duel Arena — PvP-арена в Telegram!')}`;
          tg?.openLink?.(shareUrl);
        });

      /* Кнопка / строка вывода USDT */
      const wdY = cbY + 46;
      let wdObjs = [];

      if (canWithdraw) {
        /* ── Кнопка «Вывести» — активная ── */
        let wdBusy = false;
        const wdg = this.add.graphics().setDepth(D);
        wdg.fillStyle(0x1a5a30,1); wdg.fillRoundedRect(px+10,wdY,pw-20,38,10);
        wdg.lineStyle(1.5,0x3cc864,0.7); wdg.strokeRoundedRect(px+10,wdY,pw-20,38,10);
        const wdT = at(px+pw/2, wdY+19, `💸  Вывести $${usdtBal.toFixed(2)} USDT`, 13, '#3cc864', true);
        const wdZ = this.add.zone(px+10,wdY,pw-20,38).setOrigin(0).setDepth(65)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { wdg.clear(); wdg.fillStyle(0x0f3820,1); wdg.fillRoundedRect(px+10,wdY,pw-20,38,10); tg?.HapticFeedback?.impactOccurred('heavy'); })
          .on('pointerout',  () => { wdg.clear(); wdg.fillStyle(0x1a5a30,1); wdg.fillRoundedRect(px+10,wdY,pw-20,38,10); wdg.lineStyle(1.5,0x3cc864,0.7); wdg.strokeRoundedRect(px+10,wdY,pw-20,38,10); })
          .on('pointerup', async () => {
            if (wdBusy) return; wdBusy = true;
            wdT.setText('⏳ Переводим через @CryptoBot...');
            tg?.HapticFeedback?.impactOccurred('heavy');
            try {
              const res = await post('/api/referral/withdraw');
              if (res.ok) {
                tg?.HapticFeedback?.notificationOccurred('success');
                wdg.clear(); wdg.fillStyle(0x0f3030,1); wdg.fillRoundedRect(px+10,wdY,pw-20,38,10);
                wdT.setText(`✅ $${res.amount?.toFixed(2)} USDT отправлен!`).setStyle({ color:'#7affb8' });
                this._toast('✅ USDT отправлен через @CryptoBot!');
              } else if (res.cryptobot_required) {
                wdT.setText(`💸  Вывести $${usdtBal.toFixed(2)} USDT`);
                this._toast('📲 Откройте @CryptoBot в Telegram один раз');
                tg?.openLink?.('https://t.me/CryptoBot');
                wdBusy = false;
              } else {
                wdT.setText(`💸  Вывести $${usdtBal.toFixed(2)} USDT`);
                this._toast(`❌ ${res.reason}`);
                wdBusy = false;
              }
            } catch(_) {
              wdT.setText(`💸  Вывести $${usdtBal.toFixed(2)} USDT`);
              this._toast('❌ Нет соединения');
              wdBusy = false;
            }
          });
        wdObjs = [wdg, wdT, wdZ];
      } else if (cooldownH > 0) {
        /* ── Cooldown — ждите ── */
        const cdg = this.add.graphics().setDepth(D);
        cdg.fillStyle(0x1e2240, 1); cdg.fillRoundedRect(px+10,wdY,pw-20,38,10);
        cdg.lineStyle(1, 0x444488, 0.5); cdg.strokeRoundedRect(px+10,wdY,pw-20,38,10);
        const cdT = at(px+pw/2, wdY+13, `⏳ Следующий вывод через ${cooldownH}ч`, 12, '#6060aa');
        const cdS = at(px+pw/2, wdY+29, 'Вывод доступен раз в сутки', 10, '#8080aa');
        wdObjs = [cdg, cdT, cdS];
      } else {
        /* ── Ниже минимума — подсказка ── */
        const ng = this.add.graphics().setDepth(D);
        ng.fillStyle(0x1a1a30, 1); ng.fillRoundedRect(px+10,wdY,pw-20,38,10);
        ng.lineStyle(1, 0x333366, 0.5); ng.strokeRoundedRect(px+10,wdY,pw-20,38,10);
        const nT = at(px+pw/2, wdY+13, `💰 Минимум $${withdrawMin} для вывода`, 12, '#8888cc');
        const nS = at(px+pw/2, wdY+29, `У вас: $${usdtBal.toFixed(2)} USDT · зарабатывай больше`, 10, '#8080aa');
        wdObjs = [ng, nT, nS];
      }
      statsObjs.push(...wdObjs);

      statsObjs.push(s1,s1l,s1v, s2,s2l,s2v, lb,lbLbl,lbTxt, cbg,cbT,cbZ, sbg,sbT,sbZ);
      if (premTxt) statsObjs.push(premTxt);
      /* применяем видимость если пользователь уже переключил вкладку */
      statsObjs.forEach(o => o?.setVisible?.(activeTab === 'stats'));

    }).catch(() => { loadTxt.setText('❌ Нет соединения').setStyle({ color:'#ff6666' }); });

    /* ─── СОДЕРЖИМОЕ: УСЛОВИЯ (статично) ────────────────── */
    const iY = cY;
    const rows = [
      { icon:'1️⃣', title:'Поделись ссылкой с другом',              sub:'Кнопка «Скопировать» на вкладке «Статистика»' },
      { icon:'2️⃣', title:'Друг регистрируется по ссылке',          sub:'Один раз — привязка навсегда' },
      { icon:'3️⃣', title:'Друг покупает Premium — ты получаешь USDT', sub:'Бонус USDT зачисляется автоматически' },
    ];
    rows.forEach((r, i) => {
      const ry = iY + i * 44;  /* компактнее: 44px вместо 52 */
      const rg = this.add.graphics().setDepth(D).setVisible(false);
      rg.fillStyle(0x2a50a0,1); rg.fillRoundedRect(px+10,ry,pw-20,40,9);
      const ri = at(px+28, ry+20, r.icon, 14).setVisible(false);
      const rt = txt(this, px+48, ry+11, r.title, 12, '#f0f0fa', true).setDepth(D).setVisible(false);
      const rs = txt(this, px+48, ry+27, r.sub,   10, '#a8c4ff').setDepth(D).setVisible(false);
      infoObjs.push(rg, ri, rt, rs);
    });

    /* схема вознаграждений */
    const schY = iY + rows.length * 44 + 6;
    const schTitleBg = this.add.graphics().setDepth(D).setVisible(false);
    schTitleBg.fillStyle(0x0e2060,1);
    schTitleBg.fillRoundedRect(px+10, schY, pw-20, 26, 8);
    const schTitle = at(px+pw/2, schY+13, '💰 СХЕМА ВОЗНАГРАЖДЕНИЙ', 12, '#ffc83c', true).setVisible(false);
    infoObjs.push(schTitleBg, schTitle);

    const tiers = [
      { range:'1–10 Premium-покупок',  pct:'5% разово с покупки → USDT',         col:'#7adfaa' },
      { range:'11–30 Premium-покупок', pct:'7% разово с покупки → USDT',         col:'#5ac8f0' },
      { range:'31+ Premium-покупок',   pct:'10% всегда с каждой покупки → USDT', col:'#ffc83c' },
    ];
    tiers.forEach((t, i) => {
      const ty = schY + 30 + i * 34;  /* 34px на ряд */
      const tg2 = this.add.graphics().setDepth(D).setVisible(false);
      tg2.fillStyle(i%2===0 ? 0x243878 : 0x1e3060, 1);
      tg2.fillRoundedRect(px+10, ty, pw-20, 30, 6);
      const tl = txt(this, px+16, ty+9,  t.range, 10, '#dce8ff').setOrigin(0,0).setDepth(D).setVisible(false);
      const tv = txt(this, px+16, ty+21, t.pct,   11, t.col, true).setOrigin(0,0).setDepth(D).setVisible(false);
      infoObjs.push(tg2, tl, tv);
    });
  }

  _soon(name) { this._toast(`🚧 ${name} — скоро!`); }

  _toast(msg) {
    const { W, H } = this;
    const t = txt(this, W / 2, H - this.TAB_H - 22, msg, 12, '#ffc83c', true)
      .setOrigin(0.5).setAlpha(0).setDepth(20);
    this.tweens.add({ targets: t, alpha: 1, duration: 200, hold: 1600, yoyo: true,
      onComplete: () => t.destroy() });
  }

  _setupWS() {
    const p = State.player;
    if (!p) return;
    Notif.setScene(this);
    connectWS(p.user_id, msg => {
      if (msg.event === 'battle_started') {
        State.battle = msg.battle;
        this.scene.start('Battle');
        return;
      }
      if (msg.event === 'challenge_incoming') {
        this._showIncomingChallenge(msg.challenge);
        return;
      }
      if (msg.event === 'challenge_declined') {
        this._toast('🚫 Вызов отклонён');
        return;
      }
      // Уведомления пока игрок на главной
      if (msg.event === 'level_up') {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.questDone();
        Notif.push('🎊', `Новый уровень ${msg.level}! +${msg.free_stats || 1} стат`, '#b45aff', 3500);
      }
      if (msg.event === 'quest_complete') {
        Notif.push('📅', 'Квест дня выполнен — забери награду!', '#3cc864', 3000);
        this._questBadge = true;
        // Обновить бейдж на кнопке "Ещё"
        const btn = this._tabBtns?.more;
        if (btn) btn.activeBar?.setVisible(false);
      }
      if (msg.event === 'clan_event') {
        Notif.push('⚔️', msg.text || 'Событие в клане', '#5096ff', 3000);
      }
      if (msg.event === 'diamonds_credited') {
        tg?.HapticFeedback?.notificationOccurred('success');
        Notif.push('💎', `+${msg.diamonds} алмазов зачислено!`, '#3cc8dc', 3500);
        State.playerLoadedAt = 0;
        post('/api/player').then(d => { if (d.ok && d.player) { State.player = d.player; State.playerLoadedAt = Date.now(); } }).catch(() => {});
      }
      if (msg.event === 'premium_activated') {
        tg?.HapticFeedback?.notificationOccurred('success');
        const bonusTxt = msg.bonus_diamonds > 0 ? ` +${msg.bonus_diamonds} 💎` : '';
        Notif.push('👑', `Premium активирован!${bonusTxt}`, '#b45aff', 5000);
        State.playerLoadedAt = 0;
        post('/api/player').then(d => { if (d.ok && d.player) { State.player = d.player; State.playerLoadedAt = Date.now(); } }).catch(() => {});
      }
      if (msg.event === 'usdt_slot_reset') {
        tg?.HapticFeedback?.notificationOccurred('success');
        State.playerLoadedAt = 0;
        post('/api/player').then(d => { if (d.ok && d.player) { State.player = d.player; State.playerLoadedAt = Date.now(); } }).catch(() => {});
        // Обновить гардероб если открыт, иначе toast
        if (this._avatarOverlay) {
          this._openAvatarPanel();
        } else {
          this._showToast?.('🔄 Сброс выполнен — зайди в Гардероб');
        }
      }
      if (msg.event === 'usdt_slot_created') {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (this._avatarOverlay) {
          this._openAvatarPanel();
        } else {
          this._showToast?.('💠 USDT-образ получен — открой Гардероб');
        }
      }
    });
  }

  async _checkIncomingChallenge() {
    try {
      const r = await get('/api/battle/challenge/pending');
      if (r.ok && r.pending && r.challenge) this._showIncomingChallenge(r.challenge);
    } catch (_) {}
  }

  _showIncomingChallenge(ch) {
    if (!ch || !ch.id) return;
    const uname = ch.from_username || 'Боец';
    const text = `Вызов от @${uname} (ур.${ch.from_level || 1}, рейтинг ${ch.from_rating || 1000}). Принять?`;
    const respond = async (accept) => {
      try {
        const res = await post('/api/battle/challenge/respond', { challenge_id: ch.id, accept: !!accept });
        if (!res.ok) { this._toast('❌ Вызов устарел или недоступен'); return; }
        if (!accept) { this._toast('🚫 Вызов отклонён'); return; }
        if (res.battle) {
          State.battle = res.battle;
          this.scene.start('Battle');
          return;
        }
      } catch (_) {
        this._toast('❌ Нет соединения');
      }
    };
    if (tg?.showPopup) {
      tg.showPopup({
        title: '⚔️ PvP-вызов',
        message: text,
        buttons: [
          { id: 'decline', type: 'destructive', text: 'Отклонить' },
          { id: 'accept', type: 'default', text: 'Принять' },
        ],
      }, btnId => { respond(btnId === 'accept'); });
    } else {
      const ok = window.confirm(text);
      respond(ok);
    }
  }

  async _onChallengeByNick() {
    const nickRaw = window.prompt('Введите ник соперника (без @):', '');
    if (nickRaw == null) return;
    const nickname = (nickRaw || '').trim().replace(/^@+/, '');
    if (!nickname) {
      this._toast('❌ Ник не указан');
      return;
    }
    this._toast('📨 Отправляем вызов...');
    try {
      const res = await post('/api/battle/challenge/send', { nickname });
      if (!res.ok) {
        if (res.reason === 'multiple_candidates' && Array.isArray(res.candidates) && res.candidates.length) {
          const list = res.candidates.slice(0, 5).map(c => `@${c.username} (ур.${c.level}, ⭐${c.rating})`).join('\n');
          tg?.showAlert?.(`Найдено несколько игроков:\n${list}\n\nВведи точный ник.`);
          return;
        }
        const m = {
          target_not_found: '❌ Игрок не найден',
          cannot_challenge_self: '❌ Нельзя вызвать самого себя',
          target_offline: '📴 Игрок офлайн',
          target_busy: '⏳ Игрок уже в бою',
          target_low_hp: '❤️ У соперника мало HP',
          target_has_pending: '⏳ У игрока уже есть входящий вызов',
          low_hp: '❤️ Нужно восстановить HP',
          already_in_battle: '⚔️ Вы уже в бою',
        };
        this._toast(m[res.reason] || '❌ Не удалось отправить вызов');
        return;
      }
      this._toast('✅ Вызов отправлен');
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
  }

  /* ── Авто-реген HP каждые 30 сек (без запроса на сервер) ── */
  _startRegenTick() {
    const p = State.player;
    if (!p || !p.regen_per_min) return;
    const regenPerTick = p.regen_per_min / 2; // каждые 30 сек = 1/2 минуты
    this.time.addEvent({
      delay: 30_000, loop: true,
      callback: () => {
        const sp = State.player;
        if (!sp || sp.current_hp >= sp.max_hp) return;
        sp.current_hp = Math.min(sp.max_hp, Math.round(sp.current_hp + regenPerTick));
        sp.hp_pct     = Math.round(sp.current_hp / sp.max_hp * 100);

        /* Обновляем HP-бар напрямую — без перезапуска всей сцены */
        if (this._activeTab === 'profile' && this._liveHp) {
          const { g, t, x, y, w, h } = this._liveHp;
          const col = sp.hp_pct > 50 ? C.green : sp.hp_pct > 25 ? C.gold : C.red;
          g.clear();
          g.fillStyle(C.dark, 1); g.fillRoundedRect(x, y, w, h, 4);
          const fw = Math.max(8, Math.round(w * sp.hp_pct / 100));
          g.fillStyle(col, 1);   g.fillRoundedRect(x, y, fw, h, 4);
          t.setText(`${sp.current_hp} / ${sp.max_hp} HP`);
        }
      },
    });
  }

  /* ── Быстрое зелье из BattlePanel ─────────────────────── */
  async _quickHeal(btnBg, btnTxt, zone, bx, by, bw, bh) {
    zone.disableInteractive();
    btnTxt.setText('Пьём зелье...');
    try {
      const res = await post('/api/shop/buy', { item_id: 'hp_small' });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (res.player) State.player = res.player;
        this._toast(`❤️ +${res.hp_restored} HP! Теперь ${res.player?.current_hp}/${res.player?.max_hp}`);
        this.time.delayedCall(700, () => this.scene.restart({ returnTab: this._activeTab || 'profile' }));
      } else {
        tg?.HapticFeedback?.notificationOccurred('error');
        btnTxt.setText(res.reason || 'Ошибка');
        this.time.delayedCall(1500, () => {
          btnTxt.setText('🧪 Выпить малое зелье  —  12 🪙');
          zone.setInteractive({ useHandCursor: true });
        });
      }
    } catch (_) {
      btnTxt.setText('❌ Нет соединения');
      zone.setInteractive({ useHandCursor: true });
    }
  }

  _showError(msg) {
    const { W, H } = this;
    txt(this, W / 2, H / 2 - 48, '⚠️', 32, '#ff4455').setOrigin(0.5);
    txt(this, W / 2, H / 2,      msg, 15, '#ff4455', true).setOrigin(0.5);

    // Кнопка "Повторить"
    const bw = 160, bh = 40, bx = W / 2 - bw / 2, by = H / 2 + 24;
    const bg = this.add.graphics();
    bg.fillStyle(0x2a2840, 1);
    bg.fillRoundedRect(bx, by, bw, bh, 10);
    bg.lineStyle(1.5, 0x5096ff, 0.7);
    bg.strokeRoundedRect(bx, by, bw, bh, 10);
    const btnTxt = txt(this, W / 2, by + bh / 2, '🔄 Повторить', 13, '#a0c0ff', true).setOrigin(0.5);
    const zone = this.add.zone(bx, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.restart();
    });

    // Авто-retry через 5 сек
    let countdown = 5;
    const cntTxt = txt(this, W / 2, by + bh + 16, `Авто-повтор через ${countdown}с`, 10, '#9999bb').setOrigin(0.5);
    const timer = this.time.addEvent({
      delay: 1000, repeat: 4,
      callback: () => {
        countdown--;
        if (countdown <= 0) {
          this.scene.restart();
        } else {
          cntTxt.setText(`Авто-повтор через ${countdown}с`);
        }
      },
    });
  }

  shutdown() {
    this.time.removeAllEvents();
  }
}

/* ═══════════════════════════════════════════════════════════
   BATTLE LOG — компактный DOM-оверлей над панелью выбора
   ═══════════════════════════════════════════════════════════ */
/* BattleLog: показывает последний раунд как 2 строки (ваш удар / удар врага).
   Простая архитектура: один div, replace innerHTML — без списков/скролла/счётчиков. */
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
      /* 3 колонки: Вы | Раунд | Враг */
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
      .bl-miss-col  { color: #888888; }
    `;
    document.head.appendChild(style);
    overlay = document.createElement('div');
    overlay.id = 'battle-log-overlay';
    inner = document.createElement('div');
    inner.id = 'battle-log-inner';
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
  }

  /* Маркер → цветной HTML.
     Формат: «Р{N} Вы→Зона {m1} · Враг→Зона {m2}»
     Маркеры: −{N}, −{N}⚡, −{N}⚡💥, −{N}×2, −{N}🪓, 💨уклон, 🛡блок, ✕мимо, ⏱, 0 */
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
      _shown = false;
    },
    clear() {
      _init();
      if (inner) inner.innerHTML = '';
    },
    /* entries — массив webapp_log; показываем только последний элемент */
    update(entries) {
      if (!_shown || !entries || !entries.length) return;
      _render(entries[entries.length - 1]);
    },
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
  }

  /* ── Карточка игрока / соперника ────────────────────────── */
  _showCard(who) {
    if (this._oppCardOpen) return;
    this._oppCardOpen = true;
    tg?.HapticFeedback?.impactOccurred('light');

    const { W, H } = this;
    const b  = State.battle || {};
    const me = State.player || {};

    // Данные в зависимости от чьей карточки
    const isMe = (who === 'me');
    const isPrem = isMe ? !!me.is_premium   : !!b.opp_is_premium;
    const isBot  = isMe ? false              : !!b.opp_is_bot;
    const name   = isMe ? (me.username || 'Вы')      : (b.opp_name  || 'Соперник');
    const level  = isMe ? (me.level    || 1)          : (b.opp_level || 1);
    const rating = isMe ? (me.rating   || '—')        : (b.opp_rating || '—');
    const curHp  = isMe ? (me.current_hp || b.my_hp)  : (b.opp_hp  || 0);
    const maxHp  = isMe ? (me.max_hp   || b.my_max_hp): (b.opp_max_hp || 1);
    const stats  = isMe
      ? [
          { icon: '💪', label: 'Сила',     val: me.strength  || 0, col: '#dc3c46' },
          { icon: '🤸', label: 'Ловкость', val: me.agility   || 0, col: '#3cc8dc' },
          { icon: '💥', label: 'Интуиция', val: me.intuition || 0, col: '#b45aff' },
          { icon: '🛡', label: 'Выносл.',  val: me.stamina   || 0, col: '#3cc864' },
        ]
      : [
          { icon: '💪', label: 'Сила',     val: b.opp_strength  || 0, col: '#dc3c46' },
          { icon: '🤸', label: 'Ловкость', val: b.opp_agility   || 0, col: '#3cc8dc' },
          { icon: '💥', label: 'Интуиция', val: b.opp_intuition || 0, col: '#b45aff' },
          { icon: '🛡', label: 'Выносл.',  val: b.opp_stamina   || 0, col: '#3cc864' },
        ];
    const spriteKey = isMe ? 'warrior_blue' : 'warrior_red';
    const typeStr   = isMe ? '🧑 Вы'        : (isBot ? '🤖 Бот' : '⚔️ Игрок');
    const typeCol   = isMe ? '#5096ff'       : (isBot ? '#8888aa' : '#3cc864');
    // Цвет бордера: золото(premium) / синий(я) / тёмный(враг)
    const borderCol = isPrem ? 0xffc83c : (isMe ? 0x5096ff : 0x444466);
    const bgCol     = isPrem ? 0x1a1508 : (isMe ? 0x0a1428 : 0x141420);

    const objs = [];
    const add  = o => { objs.push(o); return o; };

    // Размеры
    const cw = W - 36, ch = 242;
    const cx = 18, cy = Math.round(H * 0.17);

    // Затемнение
    const overlay = add(this.add.graphics());
    overlay.fillStyle(0x000000, 0.60);
    overlay.fillRect(0, 0, W, H);

    // Фон карточки
    const card = add(this.add.graphics());
    card.fillStyle(bgCol, 1);
    card.fillRoundedRect(cx, cy, cw, ch, 14);
    card.lineStyle(2, borderCol, isPrem ? 1 : 0.8);
    card.strokeRoundedRect(cx, cy, cw, ch, 14);
    if (isPrem) {
      card.lineStyle(8, 0xffc83c, 0.10);
      card.strokeRoundedRect(cx - 3, cy - 3, cw + 6, ch + 6, 16);
    }

    // Закрытие по тапу ВНЕ карточки (depth ниже карточки)
    const bgZone = add(this.add.zone(0, 0, W, H).setOrigin(0).setInteractive());
    bgZone.on('pointerup', (ptr) => {
      if (ptr.x < cx || ptr.x > cx+cw || ptr.y < cy || ptr.y > cy+ch) this._hideCard();
    });

    const D = 2; // глубина внутри контейнера

    // Всё содержимое — в контейнер поверх overlay+card
    const con = add(this.add.container(0, 0));

    const t = (x, y, str, sz, col = '#f0f0fa', bold = false) => {
      const o = this.add.text(x, y, str, {
        fontSize: `${sz}px`, color: col,
        fontFamily: 'system-ui, sans-serif',
        fontStyle: bold ? 'bold' : 'normal',
        resolution: 2,
      }).setOrigin(0);
      con.add(o);
      return o;
    };
    const tC = (x, y, str, sz, col, bold) => t(x, y, str, sz, col, bold).setOrigin(0.5);
    const tR = (x, y, str, sz, col) => t(x, y, str, sz, col).setOrigin(1, 0);

    // Тип
    t(cx + 14, cy + 11, typeStr, 10, typeCol, true);

    // ✕ кнопка
    tR(cx + cw - 12, cy + 10, '✕', 16, '#9999bb');

    // Имя
    const nameStr = (isPrem ? '👑 ' : '') + name;
    tC(cx + cw / 2, cy + 34, nameStr, 17, isPrem ? '#ffc83c' : '#f0f0fa', true);

    // Уровень + рейтинг
    tC(cx + cw / 2, cy + 55, `Ур. ${level}  ·  ★ ${rating}`, 11, isPrem ? '#cc9900' : '#8888aa');

    // Разделитель
    const divG = this.add.graphics();
    divG.lineStyle(1, isPrem ? 0xffc83c : 0x2a2850, 0.5);
    divG.lineBetween(cx + 12, cy + 68, cx + cw - 12, cy + 68);
    con.add(divG);

    // Спрайт персонажа
    const spr = this.add.image(cx + 58, cy + 128, spriteKey)
      .setScale(1.4).setFlipX(!isMe);
    con.add(spr);
    this.tweens.add({ targets: spr, y: cy + 122, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // HP
    const hpPct = Math.min(1, Math.max(0, curHp / maxHp));
    const hpCol = hpPct > 0.5 ? '#3cc864' : hpPct > 0.25 ? '#ffc83c' : '#dc3c46';
    const hpHex = hpPct > 0.5 ? 0x3cc864 : hpPct > 0.25 ? 0xffc83c : 0xdc3c46;
    const hpX = cx + 114, hpY = cy + 76, hpW = cw - 126;
    t(hpX, hpY, '❤️ HP', 10, '#aaaacc');
    tR(cx + cw - 12, hpY, `${curHp} / ${maxHp}`, 10, hpCol);
    const hpG = this.add.graphics();
    hpG.fillStyle(0x0a0a18, 1); hpG.fillRoundedRect(hpX, hpY + 16, hpW, 11, 4);
    hpG.fillStyle(hpHex, 1); hpG.fillRoundedRect(hpX, hpY + 16, Math.max(6, Math.round(hpW * hpPct)), 11, 4);
    con.add(hpG);

    // Статы 2×2
    const sY0 = cy + 108, sX0 = cx + 114, sX1 = sX0 + Math.round((cw - 126) / 2);
    stats.forEach((s, i) => {
      const sx = i % 2 === 0 ? sX0 : sX1;
      const sy = sY0 + Math.floor(i / 2) * 42;
      t(sx,      sy,      s.icon,  17);
      t(sx + 22, sy + 1,  s.label, 11, '#8888aa');
      t(sx + 22, sy + 14, String(s.val), 15, s.col, true);
    });

    // Premium подпись внизу
    if (isPrem) {
      tC(cx + cw / 2, cy + ch - 16, '✨ Premium', 12, '#cc9900', true);
    }

    // Зона закрытия по ✕
    const closeZ = add(this.add.zone(cx + cw - 44, cy, 44, 38).setOrigin(0).setInteractive({ useHandCursor: true }));
    closeZ.on('pointerup', () => this._hideCard());

    this._cardObjs = objs;
  }

  _hideCard() {
    if (!this._oppCardOpen) return;
    this._oppCardOpen = false;
    (this._cardObjs || []).forEach(o => { try { o.destroy(); } catch(_){} });
    this._cardObjs = [];
  }

  _buildMuteBtn() {
    const { W } = this;
    const bx = W - 38, by = 8, bw = 30, bh = 30;
    const bg = this.add.graphics();
    const draw = () => {
      bg.clear();
      bg.fillStyle(0x000000, 0.45);
      bg.fillRoundedRect(bx, by, bw, bh, 8);
    };
    draw();
    this._muteTxt = this.add.text(bx + bw/2, by + bh/2,
      Sound.muted ? '🔇' : '🔊', { fontSize: '14px' }).setOrigin(0.5).setDepth(10);
    this.add.zone(bx, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        const m = Sound.toggleMute();
        this._muteTxt.setText(m ? '🔇' : '🔊');
        tg?.HapticFeedback?.selectionChanged();
      });
  }

  _buildArena() {
    const { W, H } = this;
    // Фон
    const bg = this.add.image(W/2, H * 0.36, 'arena_bg').setDisplaySize(W, H * 0.5);

    // Факелы — анимированное пламя
    [W * 0.12, W * 0.88].forEach(fx => {
      for (let i = 0; i < 3; i++) {
        const flame = this.add.circle(fx, H * 0.16 - i * 6, 5 - i, 0xff8c00, 0.8 - i*0.2);
        this.tweens.add({
          targets: flame,
          x: fx + Phaser.Math.Between(-4, 4),
          scaleX: Phaser.Math.FloatBetween(0.8, 1.2),
          alpha: 0.5 + Math.random() * 0.4,
          duration: 200 + i * 80,
          yoyo: true, repeat: -1,
        });
      }
    });

    /* Персонажи */
    this.warrior1 = this.add.image(W * 0.28, H * 0.35, 'warrior_blue').setScale(1.5).setFlipX(false);
    this.warrior2 = this.add.image(W * 0.72, H * 0.35, 'warrior_red').setScale(1.5).setFlipX(true);

    // Покачивание персонажей
    [this.warrior1, this.warrior2].forEach(w => {
      this.tweens.add({ targets: w, y: w.y - 4, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  _buildHUDs() {
    const { W, H } = this;
    const b = State.battle;
    if (!b) return;

    const hudH = 72;  // высота HUD-панелей

    /* Игрок (P1) */
    makePanel(this, 8, 8, W/2 - 14, hudH, 10);
    txt(this, 16, 13, 'ВЫ', 10, '#8888aa', true);
    this.p1Name = txt(this, 16, 24, State.player?.username || 'Вы', 13, '#f0f0fa', true);
    this.p1Hp   = txt(this, 16, 40, `${b.my_hp} / ${b.my_max_hp}`, 11, '#3cc864');
    this.p1Bar  = this._hpBar(12, 56, W/2 - 22, b.my_max_hp > 0 ? b.my_hp / b.my_max_hp : 0, C.green);
    txt(this, 10, 10, '👁', 10).setAlpha(0.55);
    this.add.zone(8, 8, W/2 - 14, hudH).setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._showCard('me'));

    /* Соперник (P2) */
    makePanel(this, W/2 + 6, 8, W/2 - 14, hudH, 10);
    txt(this, W - 16, 13, 'СОПЕРНИК', 10, '#8888aa', true).setOrigin(1, 0);
    this.p2Name = txt(this, W - 16, 24, b.opp_name || 'Соперник', 13, '#f0f0fa', true).setOrigin(1, 0);
    this.p2Hp   = txt(this, W - 16, 40, `${b.opp_hp} / ${b.opp_max_hp}`, 11, '#dc3c46').setOrigin(1, 0);
    this.p2Bar  = this._hpBar(W/2 + 10, 56, W/2 - 22, b.opp_max_hp > 0 ? b.opp_hp / b.opp_max_hp : 0, C.red);
    // Подсказка "посмотреть карточку"
    txt(this, W/2 + 10, 10, '👁', 10).setAlpha(0.55);
    // Тап на панель соперника → карточка
    this.add.zone(W/2 + 6, 8, W/2 - 14, hudH).setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._showCard('opp'));

    /* Раунд + таймер */
    this.roundTxt = txt(this, W/2, 76, `РАУНД ${b.round || 1}`, 14, '#ffc83c', true).setOrigin(0.5);
    this.timerTxt = txt(this, W/2, 93, '15', 22, '#ffffff', true).setOrigin(0.5);

    /* VS */
    txt(this, W/2, H * 0.32, 'VS', 20, '#ffc83c', true).setOrigin(0.5).setAlpha(0.5);
  }

  /** HP с «призраком»: заливка скачет к новому HP, светлый хвост догоняет (ghost health). */
  _hpBar(x, y, w, pct, color) {
    const h = 10;
    const bg = this.add.graphics();
    bg.fillStyle(C.dark, 1);
    bg.fillRoundedRect(x, y, w, h, 3);

    const ghost = this.add.graphics();
    const fill = this.add.graphics();

    const bar = {
      bg, ghost, fill, _x: x, _y: y, _w: w, _h: h, _baseColor: color, _ghostTween: null, _ghostProxy: null,
    };
    this._redrawHpGhost(ghost, x, y, w, h, pct);
    this._redrawHpFill(fill, x, y, w, h, pct, color);
    return bar;
  }

  _hpFillColor(pct, baseColor) {
    return pct > 0.5 ? baseColor : (pct > 0.25 ? C.gold : C.red);
  }

  _redrawHpGhost(g, x, y, w, h, pct) {
    g.clear();
    const fw = Math.max(6, Math.round(w * Math.min(1, Math.max(0, pct))));
    g.fillStyle(0xe8e8ff, 0.5);
    g.fillRoundedRect(x, y, fw, h, 3);
  }

  _redrawHpFill(g, x, y, w, h, pct, baseColor) {
    g.clear();
    const fw = Math.max(6, Math.round(w * Math.min(1, Math.max(0, pct))));
    const col = this._hpFillColor(pct, baseColor);
    g.fillStyle(col, 1);
    g.fillRoundedRect(x, y, fw, h, 3);
  }

  /** Старый одиночный бар (меню и т.д.) */
  _redrawBar(g, x, y, w, h, pct, color) {
    g.clear();
    g.fillStyle(C.dark, 1);
    g.fillRoundedRect(x, y, w, h, 3);
    const fw = Math.max(6, Math.round(w * Math.min(1, Math.max(0, pct))));
    const col = this._hpFillColor(pct, color);
    g.fillStyle(col, 1);
    g.fillRoundedRect(x, y, fw, h, 3);
  }

  _setGhostHpBar(bar, newPct, prevPct, baseColor) {
    if (!bar || !bar.fill) return;
    const { _x: x, _y: y, _w: w, _h: h, ghost, fill } = bar;
    const np = Math.min(1, Math.max(0, newPct));
    const pp = Math.min(1, Math.max(0, prevPct));

    this._redrawHpFill(fill, x, y, w, h, np, baseColor);

    if (bar._ghostProxy) {
      this.tweens.killTweensOf(bar._ghostProxy);
      bar._ghostProxy = null;
    }
    bar._ghostTween = null;

    if (Math.abs(np - pp) < 0.0005) {
      this._redrawHpGhost(ghost, x, y, w, h, np);
      return;
    }

    if (pp > np) {
      const startW = Math.max(6, Math.round(w * pp));
      const endW = Math.max(6, Math.round(w * np));
      this._redrawHpGhost(ghost, x, y, w, h, pp);
      const proxy = { fw: startW };
      bar._ghostProxy = proxy;
      bar._ghostTween = this.tweens.add({
        targets: proxy,
        fw: endW,
        duration: 520,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          const gPct = Math.min(1, Math.max(0, proxy.fw / w));
          this._redrawHpGhost(ghost, x, y, w, h, gPct);
        },
        onComplete: () => {
          this._redrawHpGhost(ghost, x, y, w, h, np);
          bar._ghostTween = null;
        },
      });
    } else {
      this._redrawHpGhost(ghost, x, y, w, h, np);
    }
  }

  _buildChoicePanel() {
    const { W, H } = this;
    const panY = H * 0.6;

    makePanel(this, 8, panY - 4, W - 16, H - panY - 8, 14);

    txt(this, W/2, panY + 10, 'ВЫБЕРИ АТАКУ', 12, '#8888aa', true).setOrigin(0.5);
    txt(this, W/2, panY + H * 0.18 + 6, 'ВЫБЕРИ ЗАЩИТУ', 12, '#8888aa', true).setOrigin(0.5);

    const zones = [
      { key: 'HEAD',  label: '👤 Голова', x: W * 0.18 },
      { key: 'TORSO', label: '🧥 Тело',   x: W * 0.50 },
      { key: 'LEGS',  label: '🦵 Ноги',   x: W * 0.82 },
    ];

    this._attackBtns  = zones.map(z => this._zoneButton(z.x, panY + 36, z.key, z.label, 'attack'));
    this._defenseBtns = zones.map(z => this._zoneButton(z.x, panY + H * 0.18 + 32, z.key, z.label, 'defense'));

    /* Кнопка АВТО — внизу панели, во всю ширину */
    const autoBtnY = H - 34;
    const autoBg = this.add.graphics();
    autoBg.fillStyle(0x2a2050, 1);
    autoBg.fillRoundedRect(12, autoBtnY - 18, W - 24, 36, 10);
    autoBg.lineStyle(1.5, C.purple, 0.5);
    autoBg.strokeRoundedRect(12, autoBtnY - 18, W - 24, 36, 10);
    const autoT = txt(this, W/2, autoBtnY, '🎲  Случайный ход', 14, '#c0a0ff', true).setOrigin(0.5);
    const autoZ = this.add.zone(W/2, autoBtnY, W - 24, 36).setInteractive({ useHandCursor: true });
    autoZ.on('pointerdown', () => { autoBg.clear(); autoBg.fillStyle(C.purple, 0.28); autoBg.fillRoundedRect(12, autoBtnY-18, W-24, 36, 10); tg?.HapticFeedback?.impactOccurred('light'); });
    autoZ.on('pointerup',   () => { autoBg.clear(); autoBg.fillStyle(0x2a2050, 1); autoBg.fillRoundedRect(12, autoBtnY-18, W-24, 36, 10); autoBg.lineStyle(1.5, C.purple, 0.5); autoBg.strokeRoundedRect(12, autoBtnY-18, W-24, 36, 10); this._onAuto(); });
    autoZ.on('pointerout',  () => { autoBg.clear(); autoBg.fillStyle(0x2a2050, 1); autoBg.fillRoundedRect(12, autoBtnY-18, W-24, 36, 10); autoBg.lineStyle(1.5, C.purple, 0.5); autoBg.strokeRoundedRect(12, autoBtnY-18, W-24, 36, 10); });
    this._autoBtn = { g: autoBg, t: autoT, zone: autoZ };

    /* Статус ожидания */
    this._waitTxt = txt(this, W/2, panY + 80, '', 13, '#ffc83c', true)
      .setOrigin(0.5).setAlpha(0);
  }

  _zoneButton(x, y, key, label, type) {
    const BW = 90, BH = 44;
    const g = this.add.graphics();
    this._drawZoneBtn(g, x, y, BW, BH, false);
    const t = txt(this, x, y, label, 12, '#f0f0fa').setOrigin(0.5);
    const zone = this.add.zone(x, y, BW, BH).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this._onZone(key, label, type, g, t));
    return { key, g, t, zone, type, x, y, BW, BH };
  }

  _drawZoneBtn(g, x, y, BW, BH, selected, selectedColor = C.blue) {
    g.clear();
    if (selected) {
      g.fillStyle(selectedColor, 0.25);
      g.fillRoundedRect(x - BW/2, y - BH/2, BW, BH, 10);
      g.lineStyle(2, selectedColor, 1);
      g.strokeRoundedRect(x - BW/2, y - BH/2, BW, BH, 10);
    } else {
      g.fillStyle(C.dark, 0.9);
      g.fillRoundedRect(x - BW/2, y - BH/2, BW, BH, 10);
      g.lineStyle(1, C.gray, 0.3);
      g.strokeRoundedRect(x - BW/2, y - BH/2, BW, BH, 10);
    }
  }

  _miniBtn(x, y, label, cb) {
    const W = 70, H = 28;
    const g = this.add.graphics();
    g.fillStyle(C.dark, 0.9);
    g.fillRoundedRect(x - W/2, y - H/2, W, H, 7);
    g.lineStyle(1, C.gray, 0.4);
    g.strokeRoundedRect(x - W/2, y - H/2, W, H, 7);
    const t = txt(this, x, y, label, 10, '#8888aa').setOrigin(0.5);
    const zone = this.add.zone(x, y, W, H).setInteractive({ useHandCursor: true });
    zone.on('pointerup', cb);
    return { g, t, zone };
  }

  _buildLog() {
    const { W, H } = this;
    // 1 строка × 10px × 1.3 + padding 6px top/bottom = ~26px
    const logH = 26;
    const logY = Math.round(H * 0.6 - logH - 4);
    BattleLog.clear();
    BattleLog.show(this.game.canvas, 4, logY, W - 8, logH);
  }

  _onZone(key, label, type, g, t) {
    if (!this._choosing || this._submitting) return;
    tg?.HapticFeedback?.selectionChanged();

    if (type === 'attack') {
      // Сброс предыдущего
      this._attackBtns.forEach(b => this._drawZoneBtn(b.g, b.x, b.y, b.BW, b.BH, false));
      this._selAttack = key;
      this._drawZoneBtn(g, g._x || 0, g._y || 0, 90, 44, true, C.red);
      // Пересчитаем через кнопку
      const btn = this._attackBtns.find(b => b.key === key);
      if (btn) this._drawZoneBtn(btn.g, btn.x, btn.y, btn.BW, btn.BH, true, C.red);
    } else {
      this._defenseBtns.forEach(b => this._drawZoneBtn(b.g, b.x, b.y, b.BW, b.BH, false));
      this._selDefense = key;
      const btn = this._defenseBtns.find(b => b.key === key);
      if (btn) this._drawZoneBtn(btn.g, btn.x, btn.y, btn.BW, btn.BH, true, C.blue);
    }

    if (this._selAttack && this._selDefense) {
      this._submitChoice();
    }
  }

  async _submitChoice() {
    if (this._submitting) return;   // защита от параллельных вызовов
    this._submitting = true;
    this._choosing = false;
    this._showWait('Ход отправлен...');
    try {
      const res = await post('/api/battle/choice', {
        attack: this._selAttack,
        defense: this._selDefense,
      });
      if (res.status === 'waiting_opponent') {
        this._showWait('⏳ Ждём соперника...');
        this._waitingSince = Date.now();   // Метка для WS-recovery
        return;
      }
      if (res.status === 'round_completed') {
        this._hideCard();
        this._updateFromState(res.battle);
        this._resetChoices();
        this._choosing = true;
        this._startTimer();
      } else if (res.status === 'battle_ended') {
        // WS-событие перезапишет это позже если придёт раньше;
        // всегда обновляем чтобы не показывать результат прошлого боя при разрыве WS
        State.lastResult = res;
        BattleLog.hide();
        this.scene.start('Result');
      } else {
        // Неизвестный статус: rate-limit 429, duplicate_choice, ошибки — не зависаем
        this._choosing = true;
        const hint = res.detail || res.message || res.error || '';
        this._showWait(hint ? `⚠️ ${hint}` : 'Ошибка. Попробуй ещё раз.');
      }
    } catch(e) {
      this._choosing = true;
      this._showWait('Ошибка. Попробуй ещё раз.');
    } finally {
      this._submitting = false;
    }
  }

  _onAuto() {
    if (!this._choosing || this._submitting) return;
    const zones = ['HEAD', 'TORSO', 'LEGS'];
    if (!this._selAttack)  this._selAttack  = zones[Phaser.Math.Between(0,2)];
    if (!this._selDefense) this._selDefense = zones[Phaser.Math.Between(0,2)];
    this._submitChoice();
  }

  _showWait(msg) {
    this._waitTxt.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this._waitTxt, alpha: 1, duration: 200 });
  }

  _resetChoices() {
    this._selAttack  = null;
    this._selDefense = null;
    this._waitTxt.setAlpha(0);
    this._attackBtns.forEach(b => this._drawZoneBtn(b.g, b.x, b.y, b.BW, b.BH, false));
    this._defenseBtns.forEach(b => this._drawZoneBtn(b.g, b.x, b.y, b.BW, b.BH, false));
  }

  _updateFromState(b) {
    if (!b) return;

    // Запоминаем дельты ДО обновления UI
    const myDelta  = this._prevMyHp  != null ? (this._prevMyHp  - b.my_hp)  : 0;
    const oppDelta = this._prevOppHp != null ? (this._prevOppHp - b.opp_hp) : 0;
    this._prevMyHp  = b.my_hp;
    this._prevOppHp = b.opp_hp;

    State.battle = b;

    const p1n = b.my_max_hp > 0 ? b.my_hp / b.my_max_hp : 0;
    const p1p = this._p1PrevPct != null ? this._p1PrevPct : p1n;
    const p2n = b.opp_max_hp > 0 ? b.opp_hp / b.opp_max_hp : 0;
    const p2p = this._p2PrevPct != null ? this._p2PrevPct : p2n;

    /* HP игрока */
    if (this.p1Hp) this.p1Hp.setText(`${b.my_hp} / ${b.my_max_hp}`);
    if (this.p1Bar) {
      this._setGhostHpBar(this.p1Bar, p1n, p1p, C.green);
      this._p1PrevPct = p1n;
    }

    /* HP соперника */
    if (this.p2Hp) this.p2Hp.setText(`${b.opp_hp} / ${b.opp_max_hp}`);
    if (this.p2Bar) {
      this._setGhostHpBar(this.p2Bar, p2n, p2p, C.red);
      this._p2PrevPct = p2n;
    }

    /* Раунд */
    if (this.roundTxt) this.roundTxt.setText(`РАУНД ${(b.round || 0) + 1}`);

    /* Лог — DOM-оверлей */
    const log = b.combat_log || [];
    BattleLog.update(log);

    /* Анимации раунда */
    if ((myDelta > 0 || oppDelta > 0) && log.length) {
      const lastLog = log[log.length - 1].replace(/<[^>]+>/g, '').toLowerCase();
      const isCrit  = lastLog.includes('крит');
      const isDodge = lastLog.includes('увор');
      this._playRoundAnimation(myDelta, oppDelta, isCrit, isDodge);
    }
  }

  /* ── Система анимаций ─────────────────────────────────── */

  _playRoundAnimation(myDelta, oppDelta, isCrit, isDodge) {
    // Соперник получил урон → P1 атакует P2
    if (oppDelta > 0) {
      if (isDodge) {
        Sound.dodge();
        this._animDodge(this.warrior2);
        this._floatText(this.warrior2.x, this.warrior2.y - 55, '💨 Уворот!', '#3cc8dc');
      } else {
        this._animLunge(this.warrior1, this.warrior2, () => {
          if (isCrit) {
            Sound.crit();
            this._flashTint(this.warrior2, 0xff8800, 220);
            this._shakeX(this.warrior2, 12, 4);
            this._burst(this.warrior2.x, this.warrior2.y, 'crit_fx', 0.7, 520);
            this._floatText(this.warrior2.x, this.warrior2.y - 60, `💥 −${oppDelta}`, '#ffc83c');
            this.cameras.main.shake(280, 0.007);
          } else {
            Sound.hit();
            this._flashTint(this.warrior2, 0xff3333, 140);
            this._shakeX(this.warrior2, 7, 3);
            this._burst(this.warrior2.x, this.warrior2.y, 'hit_fx', 0.9, 380);
            this._floatText(this.warrior2.x, this.warrior2.y - 55, `−${oppDelta}`, '#ff4455');
          }
        });
      }
    }

    // Я получил урон → P2 атакует P1
    if (myDelta > 0) {
      this.time.delayedCall(oppDelta > 0 ? 320 : 0, () => {
        if (isDodge && oppDelta <= 0) {
          Sound.dodge();
          this._animDodge(this.warrior1);
          this._floatText(this.warrior1.x, this.warrior1.y - 55, '💨 Уворот!', '#3cc8dc');
        } else {
          this._animLunge(this.warrior2, this.warrior1, () => {
            if (isCrit && oppDelta <= 0) {
              Sound.crit();
              this._flashTint(this.warrior1, 0xff8800, 220);
              this._shakeX(this.warrior1, 12, 4);
              this._burst(this.warrior1.x, this.warrior1.y, 'crit_fx', 0.7, 520);
              this._floatText(this.warrior1.x, this.warrior1.y - 60, `💥 −${myDelta}`, '#ffc83c');
              this.cameras.main.shake(280, 0.007);
            } else {
              Sound.hit();
              this._flashTint(this.warrior1, 0xff3333, 140);
              this._shakeX(this.warrior1, 7, 3);
              this._burst(this.warrior1.x, this.warrior1.y, 'hit_fx', 0.9, 380);
              this._floatText(this.warrior1.x, this.warrior1.y - 55, `−${myDelta}`, '#ff6666');
            }
          });
        }
      });
    }
  }

  /* воин делает выпад к сопернику и возвращается */
  _animLunge(attacker, defender, onImpact) {
    const origX   = attacker.x;
    const midX    = attacker.x + (defender.x - attacker.x) * 0.42;
    this.tweens.add({
      targets: attacker, x: midX, scaleX: attacker.scaleX * 1.08,
      duration: 110, ease: 'Power2.easeOut',
      onComplete: () => {
        if (onImpact) onImpact();
        this.tweens.add({
          targets: attacker, x: origX, scaleX: attacker.scaleX / 1.08,
          duration: 190, ease: 'Back.easeOut',
        });
      },
    });
  }

  /* воин уклоняется: скользит в сторону и обратно с призраком */
  _animDodge(warrior) {
    const origX = warrior.x;
    const dir   = warrior === this.warrior2 ? 1 : -1;
    // Призрак
    const ghost = this.add.image(origX, warrior.y, warrior === this.warrior2 ? 'warrior_red' : 'warrior_blue')
      .setScale(warrior.scaleX).setFlipX(warrior.flipX).setAlpha(0.35).setTint(0x3cc8dc);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 380, onComplete: () => ghost.destroy() });
    // Скольжение
    this.tweens.add({
      targets: warrior, x: origX + dir * 30, alpha: 0.55,
      duration: 130, ease: 'Power2.easeOut', yoyo: true,
      onComplete: () => { warrior.setX(origX).setAlpha(1); },
    });
  }

  /* мгновенная смена тинта с откатом */
  _flashTint(warrior, color, ms) {
    warrior.setTint(color);
    this.time.delayedCall(ms, () => warrior.clearTint());
  }

  /* горизонтальная тряска */
  _shakeX(target, px, count) {
    const ox = target.x;
    this.tweens.add({
      targets: target, x: ox + px,
      duration: 40, yoyo: true, repeat: count - 1,
      ease: 'Sine.easeInOut',
      onComplete: () => target.setX(ox),
    });
  }

  /* всплывающее число урона */
  _floatText(x, y, str, color = '#ff4455') {
    const t = txt(this, x, y, str, 21, color, true).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: t, y: y - 72, alpha: 0,
      duration: 820, ease: 'Power2.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /* взрыв текстуры-эффекта */
  _burst(x, y, texKey, startScale, duration) {
    const fx = this.add.image(x, y, texKey)
      .setAlpha(0.95).setScale(startScale).setDepth(9);
    this.tweens.add({
      targets: fx, alpha: 0, scale: startScale * 2.6,
      duration, ease: 'Power2.easeOut',
      onComplete: () => fx.destroy(),
    });
  }

  /* ── Таймер синхронизирован с сервером ─────────────────── */
  _startTimer(serverSecs = null) {
    if (this._timerEvent) this._timerEvent.remove();

    // Берём время с сервера; -1с запас на сетевую задержку
    const b    = State.battle;
    let secs   = serverSecs ?? (b?.deadline_sec ?? 15);
    secs       = Math.max(1, Math.min(15, secs - 1)); // клamp + буфер 1с

    this.timerTxt?.setText(secs).setColor('#ffffff');
    this._timerEvent = this.time.addEvent({
      delay: 1000, repeat: secs - 1,
      callback: () => {
        secs--;
        this.timerTxt?.setText(Math.max(0, secs));
        if (secs <= 5 && secs > 0) {
          this.timerTxt?.setColor('#ff4455');
          Sound.countdown(secs);
          tg?.HapticFeedback?.impactOccurred('light');
        }
        if (secs <= 0) {
          // Авто-ход если игрок не успел
          if (this._choosing) this._onAuto();
        }
      },
    });
  }

  _setupWSBattle() {
    const p = State.player;
    if (!p) return;

    const handleMsg = msg => {
      if (msg.event === 'round_result') {
        this._lastServerMsg = Date.now();
        this._updateFromState(msg.battle);
        this._resetChoices();
        this._choosing = true;
        this._startTimer(msg.battle?.deadline_sec);
      } else if (msg.event === 'battle_ended' || msg.event === 'battle_ended_afk') {
        this._lastServerMsg = Date.now();
        State.lastResult = msg;
        BattleLog.hide();
        this.scene.start('Result');
      }
    };

    if (!State.player) return;
    connectWS(State.player.user_id, handleMsg);

    // ── Polling fallback ─────────────────────────────────────────
    // Опрашивает сервер когда:
    //   a) Выбираем ход, но сигнала от сервера не было > 8 сек
    //   b) Ждём соперника (WS мог упасть) > 10 сек
    this._lastServerMsg = Date.now();
    this._waitingSince  = null;
    this._pollEvent = this.time.addEvent({
      delay: 3000, loop: true,
      callback: async () => {
        const now = Date.now();

        // Режим ожидания соперника (после отправки хода)
        if (!this._choosing) {
          if (!this._waitingSince) return;
          if (now - this._waitingSince < 10000) return;  // ждём до 10 сек
          // WS, похоже, упал — принудительно опрашиваем
        } else {
          // Обычный режим: опрашиваем только если давно не было сигнала
          if (now - this._lastServerMsg < 8000) return;
        }

        try {
          const res = await get('/api/battle/state');
          if (!res?.active) {
            const last = await get('/api/battle/last_result').catch(() => null);
            State.lastResult = last || { human_won: false, result: {} };
            BattleLog.hide();
            this.scene.start('Result');
          } else {
            this._lastServerMsg = now;
            this._updateFromState(res);
            if (!this._choosing) {
              this._waitingSince = null;
              this._resetChoices();
              this._choosing = true;
              this._startTimer(res.deadline_sec);
            }
          }
        } catch(_) {}
      },
    });
  }

  shutdown() {
    BattleLog.hide();
  }
}

/* ═══════════════════════════════════════════════════════════
   RESULT SCENE — итог боя
   ═══════════════════════════════════════════════════════════ */
class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  async create() {
    const { width: W, height: H } = this.game.canvas;
    const res   = State.lastResult;
    const won   = res?.human_won ?? false;
    const r     = res?.result    ?? {};
    const isAfk = res?.afk_loss  === true;
    const isEndless    = res?.mode === 'endless';
    const endlessWave  = res?.mode_meta?.wave || State.endlessWave || 0;
    const endlessProgress = res?.endless_progress;

    /* ── Фон (зелёный / красный оттенок) ── */
    const bg = this.add.graphics();
    if (won) {
      bg.fillGradientStyle(0x0d1f09, 0x0d1f09, 0x121c0a, 0x121c0a, 1);
    } else {
      bg.fillGradientStyle(0x1a0808, 0x1a0808, 0x120a0a, 0x120a0a, 1);
    }
    bg.fillRect(0, 0, W, H);
    // Звёзды
    const starCol = won ? 0xffc83c : 0xff6655;
    for (let i = 0; i < 45; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.85),
        Phaser.Math.FloatBetween(0.4, 1.8), starCol,
        Phaser.Math.FloatBetween(0.06, 0.35)
      );
    }

    /* ── Звук + хаптика ── */
    tg?.HapticFeedback?.notificationOccurred(won ? 'success' : 'error');
    if (won) Sound.victory(); else Sound.defeat();

    /* ── Конфетти ── */
    if (won) this._celebrate(W, H);

    /* ── Заголовок ── */
    const titleStr = won ? '🏆  ПОБЕДА!' : isAfk ? '⏱️  ТАЙМАУТ' : '💀  ПОРАЖЕНИЕ';
    const titleCol = won ? '#ffc83c' : isAfk ? '#ff8855' : '#ff4455';
    const title = txt(this, W / 2, H * 0.17, titleStr, 34, titleCol, true)
      .setOrigin(0.5).setScale(0).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 550, ease: 'Back.easeOut' });

    /* ── Карточка результата ── */
    const panH = won ? (r.level_up ? 185 : (r.win_streak > 1 ? 175 : 155))
                     : (isAfk ? 128 : (isEndless ? 120 : 132));
    const panY  = H * 0.28;
    makePanel(this, 16, panY, W - 32, panH, 16);

    if (won) {
      txt(this, W / 2, panY + 18, 'НАГРАДЫ', 11, '#8888aa', true).setOrigin(0.5);

      // Gold — счётчик
      const goldTxt = txt(this, W / 2, panY + 50, '💰 +0 золота', 22, '#ffc83c', true).setOrigin(0.5);
      this._countUp(goldTxt, r.gold || 0, '💰 +', ' золота', 200);

      // XP — счётчик (в Натиске XP не начисляется, вместо него — урон)
      if (isEndless) {
        txt(this, W / 2, panY + 86, `⚔️  Урон нанесён: ${r.damage || 0}`, 17, '#ddaa66', true).setOrigin(0.5);
      } else {
        const expTxt = txt(this, W / 2, panY + 86, '⭐ +0 опыта', 18, '#5096ff', true).setOrigin(0.5);
        this._countUp(expTxt, r.exp || 0, '⭐ +', ' опыта', 450);
      }

      // Раунды
      txt(this, W / 2, panY + 118, `⚔️  Раундов: ${r.rounds || 0}`, 12, '#9999bb').setOrigin(0.5);

      // ELO изменение
      if (r.rating_change && r.rating_change !== 0) {
        const eloSign = r.rating_change > 0 ? '+' : '';
        txt(this, W / 2, panY + 138, `★ ${eloSign}${r.rating_change} ELO`, 12,
          r.rating_change > 0 ? '#3cc864' : '#ff4455', true).setOrigin(0.5);
      }

      let extraY = panY + (r.rating_change && r.rating_change !== 0 ? 158 : 138);

      // Streak bonus
      if ((r.streak_bonus || 0) > 0) {
        const sbt = txt(this, W / 2, extraY, `🎉 +${r.streak_bonus} бонус серии!`, 12, '#ff8855', true)
          .setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: sbt, alpha: 1, delay: 700, duration: 300 });
        extraY += 24;
      }

      // Win streak
      if ((r.win_streak || 0) > 1) {
        txt(this, W / 2, extraY, `🔥 Серия: ${r.win_streak} побед подряд!`, 13, '#ff8044', true)
          .setOrigin(0.5);
      }

      // Level up flash
      if (r.level_up) this.time.delayedCall(900, () => this._levelUpFlash(W, H));

      // Endless wave info
      if (isEndless && endlessWave > 0) {
        const waveLabel = `🔥 Волна ${endlessWave} пройдена!`;
        txt(this, W / 2, panY + 160, waveLabel, 13, '#ff6644', true).setOrigin(0.5);
        if (endlessWave % 5 === 0) {
          txt(this, W / 2, panY + 178, '💚 +10% HP восстановлено!', 12, '#3cc864').setOrigin(0.5);
        }
      }

    } else if (isAfk) {
      txt(this, W / 2, panY + 24, '⏱️ Поражение по таймауту', 14, '#ff8855', true).setOrigin(0.5);
      txt(this, W / 2, panY + 54, '3 раунда прошли без хода', 12, '#cc6633').setOrigin(0.5);
      txt(this, W / 2, panY + 76, 'Нажимай кнопки быстрее!', 11, '#8888aa').setOrigin(0.5);
      txt(this, W / 2, panY + 102, `Раундов: ${r.rounds || 0}`, 11, '#9999bb').setOrigin(0.5);
      if (r.rating_change && r.rating_change !== 0) {
        const eloSign = r.rating_change > 0 ? '+' : '';
        txt(this, W / 2, panY + 120, `★ ${eloSign}${r.rating_change} ELO`, 11, '#ff4455', true).setOrigin(0.5);
      }
    } else if (isEndless) {
      // ── Endless loss — показываем итоги захода ──
      txt(this, W / 2, panY + 14, 'ИТОГИ ЗАХОДА', 10, '#8888aa', true).setOrigin(0.5);
      txt(this, W / 2, panY + 42, `💀 Волна ${endlessWave > 0 ? endlessWave : '?'} — конец`, 16, '#ff4455', true).setOrigin(0.5);
      txt(this, W / 2, panY + 74, `⚔️  Урон нанесён: ${r.damage || 0}`, 13, '#ddaa66', true).setOrigin(0.5);
      txt(this, W / 2, panY + 98, `⏱️  Раундов: ${r.rounds || 0}`, 12, '#9999bb').setOrigin(0.5);
      // Лучший результат добавляется асинхронно (см. ниже endlessStatus)
    } else {
      txt(this, W / 2, panY + 18, '💪  Не сдавайся!', 14, '#8888aa', true).setOrigin(0.5);
      txt(this, W / 2, panY + 42, 'Утешительные награды', 10, '#666688').setOrigin(0.5);
      if ((r.gold || 0) > 0) {
        const cGold = txt(this, W / 2, panY + 64, '💰 +0 золота', 18, '#cc9922', true).setOrigin(0.5);
        this._countUp(cGold, r.gold, '💰 +', ' золота', 200);
      }
      if ((r.exp || 0) > 0) {
        const cExp = txt(this, W / 2, panY + 90, '⭐ +0 опыта', 15, '#3366cc', true).setOrigin(0.5);
        this._countUp(cExp, r.exp, '⭐ +', ' опыта', 400);
      }
      txt(this, W / 2, panY + 114, `Раундов: ${r.rounds || 0}`, 11, '#9999bb').setOrigin(0.5);
      if (r.rating_change && r.rating_change !== 0) {
        const eloSign = r.rating_change > 0 ? '+' : '';
        txt(this, W / 2, panY + 130, `★ ${eloSign}${r.rating_change} ELO`, 11, '#ff4455', true).setOrigin(0.5);
      }
    }

    /* ── Обновляем профиль ── */
    State.playerLoadedAt = 0;
    let endlessStatus = null;
    try {
      const fresh = await post('/api/player');
      if (fresh.ok) { State.player = fresh.player; State.playerLoadedAt = Date.now(); }
    } catch (_) {}
    if (isEndless) {
      try { endlessStatus = await get('/api/endless/status'); } catch (_) {}
    }

    /* ── Рекорд + оставшиеся попытки (Натиск) ── */
    if (isEndless && endlessStatus?.ok) {
      const bestWave = endlessStatus.progress?.best_wave ?? endlessProgress?.best_wave ?? 0;

      // Личный рекорд — в панели поражения
      if (!won && endlessWave > 0) {
        const isNewRecord = endlessWave > 0 && bestWave === endlessWave;
        if (isNewRecord) {
          txt(this, W / 2, panY + 108, '🆕 Новый рекорд!', 12, '#ffc83c', true).setOrigin(0.5);
        } else if (bestWave > endlessWave) {
          txt(this, W / 2, panY + 108, `🏆 Твой рекорд: ${bestWave} волн`, 11, '#9999bb').setOrigin(0.5);
        }
      }

      // При победе — новый рекорд если побил
      if (won && isEndless && endlessWave > 0 && bestWave === endlessWave && endlessWave > 1) {
        txt(this, W / 2, panY + 178, '🆕 Новый рекорд волны!', 11, '#ffc83c', true).setOrigin(0.5);
      }

      // Оставшиеся попытки
      const left = endlessStatus.attempts_left ?? 0;
      const attColor = left > 0 ? '#88ddaa' : '#cc5555';
      txt(this, W / 2, H * 0.72, `🔥 Осталось попыток: ${left}`, 12, attColor, true).setOrigin(0.5);
    }

    /* ── Кнопки ── */
    const bigBtnLabel = (isEndless && won) ? '🔥  Следующая волна!' : '⚔️  Ещё бой!';
    const bigBtnCb = (isEndless && won)
      ? () => {
          post('/api/endless/next_wave', {}).then(r => {
            if (!r.ok) { this.scene.start('Natisk'); return; }
            State.battle      = r.battle;
            State.endlessWave = r.wave;
            tg?.HapticFeedback?.impactOccurred('heavy');
            this.scene.start('Battle');
          }).catch(() => this.scene.start('Natisk'));
        }
      : (isEndless)
      ? () => { this.scene.start('Natisk'); }
      : () => { this.scene.start('Menu', { returnTab: 'profile' }); };
    this._bigBtn(W / 2, H * 0.79,
      bigBtnLabel,
      won ? C.gold : 0x881a22,
      won ? '#1a1a28' : '#ffffff',
      bigBtnCb
    );
    if (isEndless && won) {
      // В Натиске после победы над волной: "Завершить заход" = abandon + возврат в меню Натиска
      this._mainBtn(W / 2, H * 0.89, '🚪  Завершить заход', () => {
        post('/api/endless/abandon', {}).catch(() => {}).finally(() => this.scene.start('Natisk'));
      });
    } else {
      this._mainBtn(W / 2, H * 0.89, '🏠  Главная', () => this.scene.start('Menu', { returnTab: 'profile' }));
    }

    /* ── Поделиться (только при победе) ── */
    if (won) {
      const shareY = H * 0.96;
      const shareT = txt(this, W / 2, shareY, '📤 Поделиться победой', 11, '#9999bb').setOrigin(0.5);
      const shareZ = this.add.zone(W / 2, shareY, 200, 24).setInteractive({ useHandCursor: true });
      shareZ.on('pointerup', () => {
        const p = State.player;
        const text = `🏆 Победил в Duel Arena! Ур.${p?.level || '?'} · ★${p?.rating || '?'}\nЗаходи: https://t.me/ZenDuelArena_bot`;
        tg?.switchInlineQuery ? tg.switchInlineQuery(text) : null;
      });
    }
  }

  _countUp(textObj, target, prefix, suffix, delay) {
    if (!target || target <= 0) { textObj.setText(`${prefix}0${suffix}`); return; }
    const steps = 22, stepMs = 35;
    this.time.delayedCall(delay, () => {
      let s = 0;
      this.time.addEvent({
        delay: stepMs, repeat: steps - 1,
        callback: () => {
          s++;
          textObj.setText(`${prefix}${Math.round(target * s / steps)}${suffix}`);
          if (s >= steps) textObj.setText(`${prefix}${target}${suffix}`);
        },
      });
    });
  }

  _levelUpFlash(W, H) {
    const flash = this.add.graphics().setDepth(50);
    flash.fillStyle(C.purple, 0.55);
    flash.fillRect(0, 0, W, H);
    this.tweens.add({ targets: flash, alpha: 0, duration: 350, onComplete: () => flash.destroy() });

    const t = txt(this, W / 2, H * 0.48, '🎊  НОВЫЙ УРОВЕНЬ!', 30, '#cc88ff', true)
      .setOrigin(0.5).setScale(0).setAlpha(0).setDepth(51);
    this.tweens.add({
      targets: t, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut',
      onComplete: () => this.time.delayedCall(1400, () => {
        this.tweens.add({ targets: t, alpha: 0, y: t.y - 50, duration: 500, onComplete: () => t.destroy() });
      }),
    });
    Sound.questDone();
    tg?.HapticFeedback?.notificationOccurred('success');
  }

  _celebrate(W, H) {
    const cols = [0xffc83c, 0x5096ff, 0xb45aff, 0x3cc864, 0xff8800, 0xff4488, 0x3cc8dc];
    for (let i = 0; i < 55; i++) {
      const c    = this.add.graphics();
      const col  = Phaser.Math.RND.pick(cols);
      const sz   = Phaser.Math.Between(4, 10);
      const rect = Math.random() > 0.45;
      const sx   = Phaser.Math.Between(0, W);
      c.fillStyle(col, 0.92);
      if (rect) c.fillRect(-sz / 2, -sz / 2, sz, sz * 1.7);
      else      c.fillCircle(0, 0, sz / 2);
      c.x = sx; c.y = Phaser.Math.Between(-40, 0);
      c.angle = Phaser.Math.Between(0, 360);
      this.tweens.add({
        targets: c,
        y: H + 40, alpha: 0,
        x: sx + Phaser.Math.Between(-90, 90),
        angle: c.angle + Phaser.Math.Between(-200, 200),
        duration: Phaser.Math.Between(1500, 3000),
        delay: Phaser.Math.Between(0, 1000),
        ease: 'Quad.easeIn',
        onComplete: () => c.destroy(),
      });
    }
  }

  _bigBtn(x, y, label, fillColor, textColor, cb) {
    const BW = 260, BH = 52;
    const g = this.add.graphics();
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x - BW / 2, y - BH / 2, BW, BH, 14);
    g.fillStyle(0xffffff, 0.14);
    g.fillRoundedRect(x - BW / 2 + 4, y - BH / 2 + 4, BW - 8, BH * 0.46, 10);
    txt(this, x, y, label, 17, textColor, true).setOrigin(0.5);
    const z = this.add.zone(x, y, BW, BH).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => { g.clear(); g.fillStyle(fillColor, 0.65); g.fillRoundedRect(x-BW/2, y-BH/2, BW, BH, 14); tg?.HapticFeedback?.impactOccurred('medium'); });
    z.on('pointerup',   () => { g.clear(); g.fillStyle(fillColor, 1); g.fillRoundedRect(x-BW/2, y-BH/2, BW, BH, 14); g.fillStyle(0xffffff,0.14); g.fillRoundedRect(x-BW/2+4, y-BH/2+4, BW-8, BH*0.46, 10); cb(); });
    z.on('pointerout',  () => { g.clear(); g.fillStyle(fillColor, 1); g.fillRoundedRect(x-BW/2, y-BH/2, BW, BH, 14); g.fillStyle(0xffffff,0.14); g.fillRoundedRect(x-BW/2+4, y-BH/2+4, BW-8, BH*0.46, 10); });
  }

  _mainBtn(x, y, label, cb) {
    const BW = 200, BH = 38;
    const g = this.add.graphics();
    g.fillStyle(C.dark, 0.9);
    g.fillRoundedRect(x - BW / 2, y - BH / 2, BW, BH, 10);
    g.lineStyle(1.5, C.blue, 0.4);
    g.strokeRoundedRect(x - BW / 2, y - BH / 2, BW, BH, 10);
    txt(this, x, y, label, 14, '#f0f0fa', true).setOrigin(0.5);
    const z = this.add.zone(x, y, BW, BH).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); cb(); });
  }
}

/* ═══════════════════════════════════════════════════════════
   RATING SCENE — рейтинг: Топ PvP + Башня Титанов
   ═══════════════════════════════════════════════════════════ */
class RatingScene extends Phaser.Scene {
  constructor() { super('Rating'); }

  init(data) {
    this._tab = (data && data.tab) ? data.tab : (RatingScene._lastTab || 'pvp');
    RatingScene._lastTab = this._tab;
    /* Кеш данных живёт 60 сек, не делаем повторный запрос при смене вкладки */
    const now = Date.now();
    if (!RatingScene._cache || (now - (RatingScene._cacheTs || 0)) > 60_000) {
      RatingScene._cache   = {};
      RatingScene._cacheTs = now;
    }
  }

  async create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._alive = true;

    /* Фон — как в ShopScene */
    _extraBg(this, W, H);
    _extraHeader(this, W, '🏆', 'РЕЙТИНГ', 'Топ PvP · Башня Титанов · Сезон');
    _extraBack(this, 'Menu', 'profile');

    /* Вкладки — точно как в Магазине */
    this._buildTabBar(W);

    /* Контент */
    if (this._tab === 'pvp') {
      await this._buildPvpTab(W, H);
    } else if (this._tab === 'natisk') {
      this._buildNatiskTab(W, H);
    } else if (this._tab === 'season') {
      await this._buildSeasonTab(W, H);
    } else {
      this._buildTitansTab(W, H);
    }
  }

  shutdown() {
    this._alive = false;
  }

  _buildTabBar(W) {
    const tabs = [
      { key: 'pvp',    label: '👑 Слава'  },
      { key: 'titans', label: '🗿 Башня'  },
      { key: 'natisk', label: '🔥 Натиск' },
      { key: 'season', label: '🌟 Сезон'  },
    ];
    const tw  = (W - 24) / tabs.length;
    const ty  = 76;
    tabs.forEach((tab, i) => {
      const tx     = 12 + i * tw;
      const active = tab.key === this._tab;
      const bg = this.add.graphics();
      bg.fillStyle(active ? C.blue : C.dark, active ? 0.92 : 0.55);
      bg.fillRoundedRect(tx, ty, tw - 4, 30, 8);
      if (active) { bg.lineStyle(1.5, C.blue, 0.6); bg.strokeRoundedRect(tx, ty, tw - 4, 30, 8); }
      txt(this, tx + (tw - 4) / 2, ty + 15, tab.label, 11,
        active ? '#ffffff' : '#8888aa', active).setOrigin(0.5);
      this.add.zone(tx, ty, tw - 4, 30).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this._tab === tab.key) return;
          tg?.HapticFeedback?.selectionChanged();
          this.scene.restart({ tab: tab.key });
        });
    });
  }

  async _buildPvpTab(W, H) {
    const startY = 114;   /* ниже шапки + табов, как в магазине */
    try {
      const res = RatingScene._cache.pvp || (RatingScene._cache.pvp = await get('/api/pvp/top'));
      if (!this._alive) return;   // пользователь нажал «Назад» пока шла загрузка
      if (!res.ok) throw new Error('bad');
      const players = res.elo_top || [];
      const myUid   = State.player?.user_id;

      /* ── TOP-3 подиум ── */
      if (players.length >= 3) {
        this._buildPodium(players.slice(0, 3), W, startY);
      }

      /* ── Список с 4-го места ── */
      const listFrom = Math.min(players.length, 3);
      const listY    = players.length >= 3 ? startY + 136 : startY;
      const rowH     = 44;

      players.slice(listFrom, listFrom + 8).forEach((p, i) => {
        const rank = listFrom + i + 1;
        const ry   = listY + i * rowH;
        const isMe = p.user_id === myUid;
        const rg = this.add.graphics();
        rg.fillStyle(isMe ? 0x1e2840 : C.bgPanel, isMe ? 0.98 : 0.8);
        rg.fillRoundedRect(10, ry, W - 20, rowH - 4, 9);
        if (isMe) { rg.lineStyle(1.5, C.blue, 0.7); rg.strokeRoundedRect(10, ry, W - 20, rowH - 4, 9); }
        txt(this, 28, ry + (rowH - 4) / 2, `${rank}.`, 12, '#9999bb', true).setOrigin(0.5);
        txt(this, 52, ry + 10, p.username || `User${p.user_id}`, 13, isMe ? '#5096ff' : '#f0f0fa', isMe);
        txt(this, 52, ry + 26, `🏆 ${p.wins || 0}W  💀 ${p.losses || 0}L`, 10, '#9999bb');
        txt(this, W - 14, ry + (rowH - 4) / 2, `★ ${p.rating}`, 14, '#ffc83c', true).setOrigin(1, 0.5);
      });

      if (players.length === 0) {
        txt(this, W / 2, H / 2, '📭 Пока нет PvP-боёв', 14, '#9999bb').setOrigin(0.5);
      }

      /* ── Моя позиция (над кнопкой Назад) ── */
      const myElo  = State.player?.rating || 1000;
      const myIdx  = players.findIndex(p => p.user_id === myUid);
      const myRank = myIdx >= 0 ? myIdx + 1 : null;
      if (!myRank || myRank > 10) {
        const myBY = H - 108;
        const myBG = this.add.graphics();
        myBG.fillStyle(0x1a2030, 0.97);
        myBG.fillRoundedRect(10, myBY, W - 20, 44, 10);
        myBG.lineStyle(1.5, C.gold, 0.5);
        myBG.strokeRoundedRect(10, myBY, W - 20, 44, 10);
        txt(this, W / 2, myBY + 13, 'Ваш ELO рейтинг', 10, '#888899').setOrigin(0.5);
        txt(this, W / 2, myBY + 31,
          `${myRank ? '#' + myRank : 'не в топ'}  ·  ★ ${myElo}`, 15, '#ffc83c', true).setOrigin(0.5);
      }
    } catch (e) {
      txt(this, W / 2, H / 2, '❌ Нет соединения', 14, '#ff4455').setOrigin(0.5);
    }
  }

  _buildTitansTab(W, H) {
    const startY = 114;
    if (RatingScene._cache.titans) {
      this._renderTitans(RatingScene._cache.titans, W, H, startY);
      return;
    }
    const loadT = txt(this, W / 2, H / 2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    get('/api/titans/top').then(data => {
      RatingScene._cache.titans = data;
      loadT.destroy();
      if (!data.ok) { txt(this, W / 2, H / 2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }
      this._renderTitans(data, W, H, startY);
    }).catch(() => loadT.setText('❌ Нет соединения'));
  }

  _renderTitans(data, W, H, startY) {
    const lb = data.leaders || [];
    txt(this, W / 2, startY + 4, `Неделя: ${data.week_key || '-'}`, 11, '#8888aa').setOrigin(0.5);
    makePanel(this, 8, startY + 16, W - 16, 54, 10, 0.95);
    txt(this, 16, startY + 26, '🎁 Награды недели:', 12, '#ffc83c', true);
    txt(this, 16, startY + 43, '🥇 400💰+150💎  🥈 250💰+90💎  🥉 150💰+60💎  4-10: 60💰+25💎', 10, '#c0c0e0');
    txt(this, 16, startY + 57, 'Титулы: Покоритель / Гроза / Титаноборец', 10, '#9999bb');
    const listY   = startY + 80;
    const rowH    = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 100) / rowH));
    lb.slice(0, maxShow).forEach((row, i) => {
      const ry = listY + i * rowH;
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.86);
      bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      txt(this, 18, ry + 11, medal, i < 3 ? 14 : 11, '#ffc83c').setOrigin(0);
      txt(this, 52, ry + 9,  row.username || `User${row.user_id}`, 12, '#d0d0ee', true);
      txt(this, 52, ry + 24, `🗿 Этаж: ${row.weekly_best_floor || 0}`, 11, '#777799');
      txt(this, W - 16, ry + 17, `${row.weekly_best_floor || 0}`, 12, '#ffc83c', true).setOrigin(1, 0.5);
    });
    if (!lb.length) {
      txt(this, W / 2, H / 2 + 20, '😴 Пока никто не прошёл Башню', 13, '#9999bb').setOrigin(0.5);
    }
  }

  _buildNatiskTab(W, H) {
    const startY = 114;
    if (RatingScene._cache.natisk) { this._renderNatisk(RatingScene._cache.natisk, W, H, startY); return; }
    const loadT = txt(this, W/2, H/2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    get('/api/endless/top').then(data => {
      RatingScene._cache.natisk = data;
      loadT.destroy();
      if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }
      this._renderNatisk(data, W, H, startY);
    }).catch(() => loadT.setText('❌ Нет соединения'));
  }

  _renderNatisk(data, W, H, startY) {
    const leaders = data.weekly || data.leaders || [];
    const myUid   = State.player?.user_id;

    /* ── Неделя + награды ── */
    txt(this, W / 2, startY + 4, `Неделя: ${data.week_key || '-'}`, 11, '#8888aa').setOrigin(0.5);
    makePanel(this, 8, startY + 16, W - 16, 54, 10, 0.95);
    txt(this, 16, startY + 26, '🎁 Награды недели:', 12, '#ffc83c', true);
    txt(this, 16, startY + 43, '🥇 300💰+100💎  🥈 200💰+60💎  🥉 100💰+40💎  4-10: 50💰+15💎', 10, '#c0c0e0');
    txt(this, 16, startY + 57, 'Титулы: Покоритель Волн / Штормовой / Волновой', 10, '#9999bb');

    const listY  = startY + 80;
    const rowH   = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 100) / rowH));

    if (!leaders.length) {
      txt(this, W/2, listY + 40, '🔥 Первым войди в историю!', 13, '#ff9999').setOrigin(0.5);
      return;
    }
    leaders.slice(0, maxShow).forEach((row, i) => {
      const ry   = listY + i * rowH;
      const isMe = row.user_id === myUid;
      const bg   = this.add.graphics();
      bg.fillStyle(isMe ? 0x2a1010 : C.bgPanel, isMe ? 0.98 : 0.85);
      bg.fillRoundedRect(8, ry, W-16, rowH-4, 9);
      if (isMe) { bg.lineStyle(1.5, 0xff4444, 0.6); bg.strokeRoundedRect(8, ry, W-16, rowH-4, 9); }
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
      txt(this, 20, ry+(rowH-4)/2, medal, i<3?15:11, '#ffc83c').setOrigin(0, 0.5);
      txt(this, 52, ry+9,  row.username||`User${row.user_id}`, 13, isMe?'#ff6666':'#f0f0fa', isMe);
      txt(this, 52, ry+24, `\uD83D\uDD25 \u0412\u043e\u043b\u043d\u0430 ${row.best_wave}`, 11, '#cc6644');
      txt(this, W-14, ry+(rowH-4)/2, `${row.best_wave}`, 15, '#ff6644', true).setOrigin(1, 0.5);
    });
  }

  async _buildSeasonTab(W, H) {
    const startY = 114;
    try {
      const res = RatingScene._cache.season || (RatingScene._cache.season = await get('/api/season'));
      if (!this._alive) return;
      if (!res.ok) throw new Error('bad');
      this._renderSeason(res, W, H, startY);
    } catch (e) {
      txt(this, W / 2, H / 2, '❌ Нет соединения', 14, '#ff4455').setOrigin(0.5);
    }
  }

  _renderSeason(res, W, H, startY) {
    const season = res.season;
    const lb     = res.leaderboard || [];
    const myUid  = State.player?.user_id;

    /* ── Нет сезона ── */
    if (!season) {
      txt(this, W / 2, H / 2, '⏳ Сезон скоро начнётся', 14, '#9999bb').setOrigin(0.5);
      return;
    }

    /* ── Шапка: имя + дней до конца ── */
    const startedMs  = new Date(String(season.started_at).replace(' ', 'T')).getTime();
    const endsMs     = startedMs + 14 * 24 * 3600 * 1000;
    const daysLeft   = Math.max(0, Math.ceil((endsMs - Date.now()) / (24 * 3600 * 1000)));
    txt(this, W / 2, startY + 4,  season.name || 'Текущий сезон', 13, '#ffc83c', true).setOrigin(0.5);
    txt(this, W / 2, startY + 20, `⏳ До конца: ${daysLeft} дн.`, 11, '#8888aa').setOrigin(0.5);

    /* ── Награды (компактная полоска) ── */
    makePanel(this, 8, startY + 30, W - 16, 40, 8, 0.9);
    txt(this, 16, startY + 40, '🎁 Награды сезона:', 11, '#ffc83c', true);
    txt(this, 16, startY + 55, '🥇500💰+200💎  🥈300💰+120💎  🥉200💰+75💎  4-10: 50💰+20💎', 9, '#c0c0e0');

    /* ── Список топ-10 ── */
    const listY = startY + 78;
    const rowH  = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 112) / rowH));

    if (!lb.length) {
      txt(this, W / 2, listY + 40, '📭 Никто ещё не сыграл в этом сезоне', 12, '#9999bb').setOrigin(0.5);
    }

    lb.slice(0, maxShow).forEach((p, i) => {
      const ry   = listY + i * rowH;
      const isMe = p.user_id === myUid;
      const bg   = this.add.graphics();
      bg.fillStyle(isMe ? 0x1e2840 : C.bgPanel, isMe ? 0.98 : 0.82);
      bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
      if (isMe) { bg.lineStyle(1.5, C.blue, 0.7); bg.strokeRoundedRect(8, ry, W - 16, rowH - 4, 8); }
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      txt(this, 20,     ry + (rowH - 4) / 2, medal, i < 3 ? 15 : 11, '#ffc83c').setOrigin(0, 0.5);
      txt(this, 52,     ry + 10, p.username || `User${p.user_id}`, 13, isMe ? '#5096ff' : '#f0f0fa', isMe);
      txt(this, 52,     ry + 25, `🏆 ${p.wins || 0}П`, 10, '#9999bb');
      txt(this, W - 14, ry + (rowH - 4) / 2, `\u2605 ${p.rating}`, 13, '#ffc83c', true).setOrigin(1, 0.5);
    });

    /* ── Моя позиция если не в топе ── */
    const myPos = res.my_pos;
    const myStat = res.my_stats;
    if (!myPos || myPos > maxShow) {
      const myBY = H - 108;
      const myBG = this.add.graphics();
      myBG.fillStyle(0x1a2030, 0.97);
      myBG.fillRoundedRect(10, myBY, W - 20, 44, 10);
      myBG.lineStyle(1.5, C.gold, 0.5);
      myBG.strokeRoundedRect(10, myBY, W - 20, 44, 10);
      txt(this, W / 2, myBY + 12, 'Ваша позиция в сезоне', 10, '#888899').setOrigin(0.5);
      const posLabel = myPos ? `#${myPos}` : 'не в топ';
      const myRating = myStat ? myStat.rating : (State.player?.rating || 1000);
      txt(this, W / 2, myBY + 30, `${posLabel}  ·  \u2605 ${myRating}`, 14, '#ffc83c', true).setOrigin(0.5);
    }
  }

  _buildPodium(top3, W, y) {
    const order     = [top3[1], top3[0], top3[2]];
    const podH      = [80, 104, 64];
    const medals    = ['🥈', '🥇', '🥉'];
    const podColors = [0x666688, 0xcc9900, 0x885533];
    const posX      = [W * 0.20, W * 0.50, W * 0.80];
    const myUid     = State.player?.user_id;
    const baseY     = y + 128;

    order.forEach((p, i) => {
      if (!p) return;
      const px   = posX[i];
      const ph   = podH[i];
      const isMe = p.user_id === myUid;
      const pg = this.add.graphics();
      pg.fillStyle(podColors[i], isMe ? 1 : 0.75);
      pg.fillRoundedRect(px - 38, baseY - ph, 76, ph, 6);
      if (isMe) { pg.lineStyle(2, C.blue, 0.8); pg.strokeRoundedRect(px - 38, baseY - ph, 76, ph, 6); }
      txt(this, px, baseY - ph - 28, medals[i], 24).setOrigin(0.5);
      const name = (p.username || 'User').slice(0, 9);
      txt(this, px, baseY - ph - 10, name, 10, isMe ? '#88ccff' : '#f0f0fa', isMe).setOrigin(0.5);
      txt(this, px, baseY + 12, `★ ${p.rating}`, 13, '#ffc83c', true).setOrigin(0.5);
      txt(this, px, baseY + 30, `Ур.${p.level}`, 10, '#8888aa').setOrigin(0.5);
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   ЗАПУСК PHASER
   ═══════════════════════════════════════════════════════════ */
const config = {
  type: Phaser.AUTO,
  backgroundColor: C._name === 'light' ? '#f0f2ff' : '#12121c',
  parent: document.body,
  scene: [BootScene, MenuScene, BattleScene, ResultScene, RatingScene, StatsScene, QueueScene,
          QuestsScene, SummaryScene, TitanTopScene, BattlePassScene, ClanScene, ShopScene, NatiskScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 700,
  },
  dom: { createContainer: false },
  render: {
    antialias: true,
    pixelArt: false,
  },
};

/* ── Запуск: ждём пока Telegram расширит окно ──────────────── */
let _gameStarted = false;

function _launchPhaser() {
  if (_gameStarted) return;
  _gameStarted = true;
  new Phaser.Game(config);
}

if (tg) {
  tg.ready();
  tg.expand();

  // Ждём события расширения viewport
  tg.onEvent('viewportChanged', function _onVp() {
    if (tg.viewportHeight > 100) {          // viewport уже нормальный
      tg.offEvent('viewportChanged', _onVp);
      _launchPhaser();
    }
  });

  // Если уже развёрнут — стартуем сразу, иначе fallback через 700ms
  if (tg.isExpanded && tg.viewportHeight > 100) {
    _launchPhaser();
  } else {
    setTimeout(_launchPhaser, 700);
  }
} else {
  // Браузер (не Telegram) — запускаем сразу
  _launchPhaser();
}
