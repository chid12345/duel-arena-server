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
  const t = THEMES[name] || THEMES.dark;
  Object.assign(C, t);
  try { localStorage.setItem('da_theme', name); } catch (_) {}
  document.body.style.background = name === 'light' ? '#f0f2ff' : '#12121c';
}
// Применяем тему при старте (Telegram colorScheme или localStorage)
applyTheme(
  (() => { try { return localStorage.getItem('da_theme'); } catch(_){} return null; })() ||
  (tg?.colorScheme === 'light' ? 'light' : 'dark')
);

/* Shared state */
const State = {
  initData: tg?.initData || '',
  player: null,
  battle: null,
  lastResult: null,
  ws: null,
};

function post(path, body = {}) {
  return fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ init_data: State.initData, ...body }),
  }).then(r => r.json());
}

function get(path, params = {}) {
  const q = new URLSearchParams({ init_data: State.initData, ...params });
  return fetch(`${API}${path}?${q}`).then(r => r.json());
}

/* ─── WebSocket ─────────────────────────────────────────────── */
function connectWS(userId, onMessage) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const host  = API.replace(/^https?:/, '') || `//${location.host}`;
  const url   = `${proto}:${host}/ws/${userId}`;
  const ws    = new WebSocket(url);
  ws.onmessage = e => onMessage(JSON.parse(e.data));
  ws.onclose   = () => setTimeout(() => connectWS(userId, onMessage), 3000);
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

/* Адаптация цветов текста к светлой теме */
function tCol(color) {
  if (C._name !== 'light') return color;
  const m = {
    '#f0f0fa': '#1a1a2e', '#ffffff': '#0a0a1e',
    '#8888aa': '#333366', '#555577': '#444466',
    '#666688': '#445577', '#333355': '#555588',
    '#c0c0e0': '#1a1a44', '#7799cc': '#1144aa',
  };
  return m[color] || color;
}

function txt(scene, x, y, str, size = 14, color = '#f0f0fa', bold = false) {
  return scene.add.text(x, y, str, {
    fontSize:   `${size}px`,
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontStyle:  bold ? 'bold' : 'normal',
    color:      tCol(color),
    resolution: 2,
  });
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

  async create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this.TAB_H = 76;
    this.CONTENT_H = H - this.TAB_H;
    this._panels = {};
    this._tabBtns = {};
    this._activeTab = null;

    this._drawBg(W, H);

    // Загружаем игрока + статус квестов параллельно
    try {
      const [playerRes, questRes] = await Promise.all([
        post('/api/player'),
        get('/api/quests').catch(() => null),
      ]);
      if (playerRes.ok) {
        State.player = playerRes.player;

        // Определяем нужно ли показать бейдж на кнопке Задания
        this._questBadge = false;
        if (questRes?.ok) {
          const q = questRes.quest || {};
          const d = questRes.daily || {};
          this._questBadge = d.can_claim || (q.is_completed && !q.reward_claimed);
          // Тост при ежедневном бонусе
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

        this._buildTabBar();
        this._buildProfilePanel();
        this._buildBattlePanel();
        this._buildMorePanel();
        this._switchTab('profile');
        this._setupWS();
        this._startRegenTick();
      } else {
        this._showError('Ошибка загрузки профиля');
      }
    } catch(e) {
      this._showError('Нет соединения');
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
      { key: 'more',    icon: '☰',   label: 'Ещё'     },
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
      activeBg.fillStyle(C.gold, C._name === 'light' ? 0.18 : 0.12);
      activeBg.fillRoundedRect(tabW * i + 5, tabTop + 5, tabW - 10, TAB_H - 10, 12);
      // Золотая черта-индикатор сверху
      const activeBar = this.add.graphics();
      activeBar.fillStyle(C.gold, 1);
      activeBar.fillRoundedRect(tabW * i + tabW * 0.2, tabTop + 1, tabW * 0.6, 3, 2);
      activeBg.setVisible(false);
      activeBar.setVisible(false);

      const iconTxt  = txt(this, cx, tabTop + 24, tab.icon, 24).setOrigin(0.5).setAlpha(0.45);
      const labelTxt = txt(this, cx, tabTop + 54, tab.label, 12,
        C._name === 'light' ? '#666699' : '#555577').setOrigin(0.5);

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
    Object.entries(this._panels).forEach(([k, c]) => c.setVisible(k === key));
    const inactiveCol = C._name === 'light' ? '#666699' : '#555577';
    const activeCol   = C._name === 'light' ? '#cc8800' : '#ffc83c';
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
    const isLight = C._name === 'light';

    /* ══ ШАПКА (header) ════════════════════════════════════ */
    const hH = 74, hY = 6;
    const hBg = this.add.graphics();
    hBg.fillStyle(C.bgPanel, 0.97);
    hBg.fillRoundedRect(pad, hY, W - pad * 2, hH, 14);
    hBg.lineStyle(2, C.gold, isLight ? 0.4 : 0.28);
    hBg.strokeRoundedRect(pad, hY, W - pad * 2, hH, 14);

    // Бейдж уровня
    const lvlW = 60, lvlH = 30, lvlX = pad + 10, lvlY = hY + (hH - lvlH) / 2;
    const lvlG = this.add.graphics();
    lvlG.fillStyle(C.gold, 1);
    lvlG.fillRoundedRect(lvlX, lvlY, lvlW, lvlH, 9);
    const lvlTxt = txt(this, lvlX + lvlW / 2, hY + hH / 2, `УР.${p.level}`, 14, '#1a1a28', true).setOrigin(0.5);

    // Имя + статистика
    const nameX = lvlX + lvlW + 10;
    const nameTxt = txt(this, nameX, hY + 12, p.username, 18, '#f0f0fa', true);
    const subTxt  = txt(this, nameX, hY + 38, `★ ${p.rating}  🏆 ${p.wins}W  💀 ${p.losses}L`, 12, '#8888aa');

    // Золото — справа вверху
    const goldTxt = txt(this, W - pad - 12, hY + 18, `💰 ${p.gold}`, 17, '#ffc83c', true).setOrigin(1, 0.5);

    // Кнопка переключения темы ☀️/🌙
    const thIcon = isLight ? '🌙' : '☀️';
    const thX = W - pad - 16, thY = hY + 56;
    const thBg = this.add.graphics();
    thBg.fillStyle(C.dark, isLight ? 1 : 0.7);
    thBg.fillCircle(thX, thY, 15);
    const thTxt = txt(this, thX, thY, thIcon, 14).setOrigin(0.5);
    const thZ   = this.add.zone(thX, thY, 34, 34).setInteractive({ useHandCursor: true });
    thZ.on('pointerup', () => {
      applyTheme(isLight ? 'dark' : 'light');
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.restart();
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
    const hpTxt = txt(this, W / 2, hpY + hpH / 2, `${p.current_hp} / ${p.max_hp} HP`, 11, '#f0f0fa', true).setOrigin(0.5);

    /* ── XP бар ── */
    let xpBg, xpTxt;
    const xpY = hpY + hpH + 7;
    if (!p.max_level) {
      xpBg  = makeBar(this, hpX, xpY, hpW, 6, p.xp_pct / 100, C.blue);
      xpTxt = txt(this, W / 2, xpY + 3,
        `⭐ XP ${p.exp} / ${p.exp_needed}  (${p.xp_pct}%)`, 10, '#5577cc').setOrigin(0.5);
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
      const hexC = isLight
        ? `#${Math.max(0, s.color - 0x222222).toString(16).padStart(6,'0')}`
        : s.hex;

      const sbg = this.add.graphics();
      sbg.fillStyle(C.bgPanel, 0.92);
      sbg.fillRoundedRect(scX, statsTop, scW, scH, 11);
      sbg.lineStyle(1.5, s.color, isLight ? 0.45 : 0.28);
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
    refG.fillStyle(C.dark, isLight ? 1 : 0.85);
    refG.fillRoundedRect(refX, refY, refW, refH, 13);
    refG.lineStyle(1.5, C.blue, isLight ? 0.5 : 0.35);
    refG.strokeRoundedRect(refX, refY, refW, refH, 13);
    const refT = txt(this, W / 2, refY + refH / 2, '🔄 Обновить данные', 14, '#7799cc', true).setOrigin(0.5);
    const refZ = this.add.zone(W / 2, refY + refH / 2, refW, refH).setInteractive({ useHandCursor: true });
    refZ.on('pointerdown', () => { refG.clear(); refG.fillStyle(C.blue, 0.25); refG.fillRoundedRect(refX, refY, refW, refH, 13); tg?.HapticFeedback?.impactOccurred('light'); });
    refZ.on('pointerup',   () => this.scene.restart());
    refZ.on('pointerout',  () => { refG.clear(); refG.fillStyle(C.dark, isLight ? 1 : 0.85); refG.fillRoundedRect(refX, refY, refW, refH, 13); refG.lineStyle(1.5, C.blue, isLight ? 0.5 : 0.35); refG.strokeRoundedRect(refX, refY, refW, refH, 13); });

    /* ══ СБОРКА ═════════════════════════════════════════════ */
    const children = [
      hBg, lvlG, lvlTxt, nameTxt, subTxt, goldTxt, thBg, thTxt, thZ,
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

    // Заголовок
    const title = txt(this, W / 2, 28, '⚔️  ВЫБЕРИ БОЙ', 18, '#ffc83c', true).setOrigin(0.5);

    /* ── Карточка PvP ── */
    const pvpCard = this._makeBattleCard(
      W / 2, CH * 0.28,
      '⚔️  ПОИСК СОПЕРНИКА',
      'Живой игрок · рейтинговый бой',
      '🏆 +рейтинг  💰 +золото  ⭐ +опыт',
      C.red, 0xdc3c46,
      () => this._onFight()
    );

    /* ── Карточка Бот ── */
    const botCard = this._makeBattleCard(
      W / 2, CH * 0.58,
      '🤖  БОЙ С БОТОМ',
      'Практика · нет рейтинга',
      '💰 +золото  ⭐ +опыт',
      C.blue, 0x2a4880,
      () => this._onBotFight()
    );

    /* ── HP блок (всегда показываем) ── */
    const hpBlockY = CH * 0.79;
    const hpBlockObjs = [];

    // Мини HP бар
    const hpPct = p.hp_pct / 100;
    const hpCol = p.hp_pct > 50 ? C.green : p.hp_pct > 25 ? C.gold : C.red;
    hpBlockObjs.push(makeBar(this, 20, hpBlockY, W - 40, 10, hpPct, hpCol));
    hpBlockObjs.push(
      txt(this, W / 2, hpBlockY + 5, `❤️ ${p.current_hp}/${p.max_hp} HP`, 9, '#f0f0fa').setOrigin(0.5)
    );

    if (p.hp_pct < 100) {
      // Реген-подсказка
      const regenStr = p.regen_secs_to_full > 0
        ? `+${p.regen_per_min}/мин · полный через ${Math.ceil(p.regen_secs_to_full / 60)}мин`
        : `+${p.regen_per_min}/мин`;
      hpBlockObjs.push(
        txt(this, 20, hpBlockY + 14, regenStr, 8, '#553333')
      );
    }

    if (p.hp_pct < 30) {
      // Большая кнопка "Выпить зелье" с ценой
      const canAfford = (p.gold || 0) >= 12;
      const btnBY = hpBlockY + 28;
      const qBg = this.add.graphics();
      qBg.fillStyle(canAfford ? C.red : C.dark, canAfford ? 0.88 : 0.55);
      qBg.fillRoundedRect(20, btnBY, W - 40, 38, 10);
      if (canAfford) { qBg.lineStyle(1.5, C.gold, 0.3); qBg.strokeRoundedRect(20, btnBY, W - 40, 38, 10); }
      const qLabel = canAfford
        ? `🧪 Выпить малое зелье  —  12 🪙`
        : `🧪 Нужно 12 🪙 (у вас ${p.gold || 0})`;
      const qT = txt(this, W / 2, btnBY + 19, qLabel, 11, canAfford ? '#ffffff' : '#664444', true).setOrigin(0.5);
      const qZ = this.add.zone(20, btnBY, W - 40, 38).setOrigin(0)
        .setInteractive({ useHandCursor: canAfford });
      if (canAfford) {
        qZ.on('pointerdown', () => { qBg.clear(); qBg.fillStyle(0x991a22,1); qBg.fillRoundedRect(20,btnBY,W-40,38,10); tg?.HapticFeedback?.impactOccurred('medium'); });
        qZ.on('pointerout',  () => { qBg.clear(); qBg.fillStyle(C.red,0.88); qBg.fillRoundedRect(20,btnBY,W-40,38,10); qBg.lineStyle(1.5,C.gold,0.3); qBg.strokeRoundedRect(20,btnBY,W-40,38,10); });
        qZ.on('pointerup',   () => this._quickHeal(qBg, qT, qZ, 20, btnBY, W - 40, 38));
      }
      hpBlockObjs.push(qBg, qT, qZ);
    }

    const children = [title, ...pvpCard, ...botCard, ...hpBlockObjs];
    children.forEach(o => c.add(o));

    this._panels.battle = c;
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
      { icon: '⭐',  label: 'Сезон',      cb: () => this.scene.start('Season')     },
      { icon: '🌟', label: 'Battle Pass', cb: () => this.scene.start('BattlePass') },
      { icon: '⚔️', label: 'Клан',       cb: () => this.scene.start('Clan')       },
      { icon: '🔗', label: 'Пригласить', cb: () => this._onInvite()               },
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

    // Версия
    c.add(txt(this, W / 2, CH - 18, 'Duel Arena · @ZenDuelArena_bot', 9, '#444466').setOrigin(0.5));

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

  _showSummary() {
    const p = State.player;
    if (!p) return;
    const total = p.wins + p.losses;
    const wr = total > 0 ? Math.round(p.wins / total * 100) : 0;
    this._toast(`🏆 ${p.wins}W  💀 ${p.losses}L  · WR ${wr}%`);
  }

  _onInvite() {
    const link = `https://t.me/ZenDuelArena_bot?start=ref_${State.player?.user_id || ''}`;
    tg?.openTelegramLink ? tg.openTelegramLink(link) : this._toast('Скопируй ссылку в боте');
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
        post('/api/player').then(d => { if (d.ok && d.player) State.player = d.player; }).catch(() => {});
      }
      if (msg.event === 'premium_activated') {
        tg?.HapticFeedback?.notificationOccurred('success');
        Notif.push('👑', 'Premium подписка активирована!', '#b45aff', 4000);
        post('/api/player').then(d => { if (d.ok && d.player) State.player = d.player; }).catch(() => {});
      }
    });
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
        // Если была открыта ProfilePanel — перерисуем сцену
        if (this._activeTab === 'profile') this.scene.restart();
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
        this.time.delayedCall(700, () => this.scene.restart());
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
    txt(this, this.W / 2, this.H / 2, msg, 16, '#ff4455').setOrigin(0.5);
  }
}

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
    this._logLines   = [];
    this._prevMyHp   = null;
    this._prevOppHp  = null;

    this._buildArena();
    this._buildHUDs();
    this._buildChoicePanel();
    this._buildLog();
    this._buildMuteBtn();
    this._updateFromState(State.battle);
    this._setupWSBattle();
    this._startTimer();
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

    /* Игрок (P1) */
    makePanel(this, 8, 8, W/2 - 14, 60, 10);
    txt(this, 16, 14, 'ВЫ', 10, '#8888aa', true);
    this.p1Name = txt(this, 16, 24, State.player?.username || 'Вы', 13, '#f0f0fa', true);
    this.p1Hp   = txt(this, 16, 40, `${b.my_hp} / ${b.my_max_hp}`, 11, '#3cc864');
    this.p1Bar  = this._hpBar(16, 54, W/2 - 28, b.my_hp / b.my_max_hp, C.green);

    /* Соперник (P2) */
    makePanel(this, W/2 + 6, 8, W/2 - 14, 60, 10);
    txt(this, W - 16, 14, 'СОПЕРНИК', 10, '#8888aa', true).setOrigin(1, 0);
    this.p2Name = txt(this, W - 16, 24, b.opp_name || 'Соперник', 13, '#f0f0fa', true).setOrigin(1, 0);
    this.p2Hp   = txt(this, W - 16, 40, `${b.opp_hp} / ${b.opp_max_hp}`, 11, '#dc3c46').setOrigin(1, 0);
    this.p2Bar  = this._hpBar(W/2 + 18, 54, W/2 - 28, b.opp_hp / b.opp_max_hp, C.red);

    /* Раунд + таймер */
    this.roundTxt = txt(this, W/2, 76, `РАУНД ${b.round || 1}`, 14, '#ffc83c', true).setOrigin(0.5);
    this.timerTxt = txt(this, W/2, 93, '15', 22, '#ffffff', true).setOrigin(0.5);

    /* VS */
    txt(this, W/2, H * 0.32, 'VS', 20, '#ffc83c', true).setOrigin(0.5).setAlpha(0.5);
  }

  _hpBar(x, y, w, pct, color) {
    const g = this.add.graphics();
    this._redrawBar(g, x, y, w, 7, pct, color);
    g._x = x; g._y = y; g._w = w; g._color = color;
    return g;
  }

  _redrawBar(g, x, y, w, h, pct, color) {
    g.clear();
    g.fillStyle(C.dark, 1);
    g.fillRoundedRect(x, y, w, h, 3);
    const fw = Math.max(6, Math.round(w * Math.min(1, Math.max(0, pct))));
    const col = pct > 0.5 ? color : (pct > 0.25 ? C.gold : C.red);
    g.fillStyle(col, 1);
    g.fillRoundedRect(x, y, fw, h, 3);
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
    const logY = H * 0.52;
    makePanel(this, 8, logY, W - 16, H * 0.08, 8, 0.7);
    this._logTxt = txt(this, W/2, logY + (H * 0.04), '', 11, '#ccccee').setOrigin(0.5);
  }

  _onZone(key, label, type, g, t) {
    if (!this._choosing) return;
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
    this._choosing = false;
    this._showWait('Ход отправлен...');
    try {
      const res = await post('/api/battle/choice', {
        attack: this._selAttack,
        defense: this._selDefense,
      });
      if (res.status === 'waiting_opponent') {
        this._showWait('⏳ Ждём соперника...');
        return;
      }
      if (res.status === 'round_completed') {
        this._updateFromState(res.battle);
        this._resetChoices();
        this._choosing = true;
        this._startTimer();
      } else if (res.status === 'battle_ended') {
        // Используем HTTP-ответ только если WS ещё не принёс данные с наградами
        // (WS приходит раньше HTTP примерно в 50% случаев)
        if (!State.lastResult?.result) {
          State.lastResult = res;
        }
        this.scene.start('Result');
      }
    } catch(e) {
      this._choosing = true;
      this._showWait('Ошибка. Попробуй ещё раз.');
    }
  }

  _onAuto() {
    if (!this._choosing) return;
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

    /* HP игрока */
    if (this.p1Hp) this.p1Hp.setText(`${b.my_hp} / ${b.my_max_hp}`);
    if (this.p1Bar) this._redrawBar(this.p1Bar, this.p1Bar._x, this.p1Bar._y,
      this.p1Bar._w, 7, b.my_hp / b.my_max_hp, C.green);

    /* HP соперника */
    if (this.p2Hp) this.p2Hp.setText(`${b.opp_hp} / ${b.opp_max_hp}`);
    if (this.p2Bar) this._redrawBar(this.p2Bar, this.p2Bar._x, this.p2Bar._y,
      this.p2Bar._w, 7, b.opp_hp / b.opp_max_hp, C.red);

    /* Раунд */
    if (this.roundTxt) this.roundTxt.setText(`РАУНД ${(b.round || 0) + 1}`);

    /* Лог */
    const log = b.combat_log || [];
    if (log.length && this._logTxt) {
      const clean = log[log.length - 1].replace(/<[^>]+>/g, '');
      this._logTxt.setText(clean.slice(0, 60));
    }

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
        this.scene.start('Result');
      }
    };

    if (State.ws) {
      State.ws.onmessage = e => handleMsg(JSON.parse(e.data));
    }
    if (!State.player) return;
    connectWS(State.player.user_id, handleMsg);

    // ── Polling fallback: если WS не пришёл за 7с после сабмита ──
    this._lastServerMsg = Date.now();
    this._pollEvent = this.time.addEvent({
      delay: 4000, loop: true,
      callback: async () => {
        if (!this._choosing) return; // ждём ответа — не опрашиваем
        const gap = Date.now() - this._lastServerMsg;
        if (gap < 8000) return;     // недавно был сигнал — норм
        try {
          const res = await get('/api/battle/state');
          if (!res?.active) {
            // Бой уже закончен — переходим на результат
            const last = await get('/api/battle/last_result').catch(() => null);
            State.lastResult = last || { human_won: false, result: {} };
            this.scene.start('Result');
          } else {
            this._lastServerMsg = Date.now();
            this._updateFromState(res);
            if (!this._choosing) {
              this._resetChoices();
              this._choosing = true;
              this._startTimer(res.deadline_sec);
            }
          }
        } catch(_) {}
      },
    });
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
                     : (isAfk ? 128 : 88);
    const panY  = H * 0.28;
    makePanel(this, 16, panY, W - 32, panH, 16);

    if (won) {
      txt(this, W / 2, panY + 18, 'НАГРАДЫ', 11, '#8888aa', true).setOrigin(0.5);

      // Gold — счётчик
      const goldTxt = txt(this, W / 2, panY + 50, '💰 +0 золота', 22, '#ffc83c', true).setOrigin(0.5);
      this._countUp(goldTxt, r.gold || 0, '💰 +', ' золота', 200);

      // XP — счётчик
      const expTxt = txt(this, W / 2, panY + 86, '⭐ +0 опыта', 18, '#5096ff', true).setOrigin(0.5);
      this._countUp(expTxt, r.exp || 0, '⭐ +', ' опыта', 450);

      // Раунды
      txt(this, W / 2, panY + 118, `⚔️  Раундов: ${r.rounds || 0}`, 12, '#666688').setOrigin(0.5);

      let extraY = panY + 138;

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

    } else if (isAfk) {
      txt(this, W / 2, panY + 24, '⏱️ Поражение по таймауту', 14, '#ff8855', true).setOrigin(0.5);
      txt(this, W / 2, panY + 54, '3 раунда прошли без хода', 12, '#cc6633').setOrigin(0.5);
      txt(this, W / 2, panY + 76, 'Нажимай кнопки быстрее!', 11, '#8888aa').setOrigin(0.5);
      txt(this, W / 2, panY + 102, `Раундов: ${r.rounds || 0}`, 11, '#555577').setOrigin(0.5);
    } else {
      txt(this, W / 2, panY + 30, '💪  Не сдавайся!', 16, '#8888aa', true).setOrigin(0.5);
      txt(this, W / 2, panY + 62, `Раундов: ${r.rounds || 0}`, 12, '#555577').setOrigin(0.5);
    }

    /* ── Обновляем профиль ── */
    try {
      const fresh = await post('/api/player');
      if (fresh.ok) State.player = fresh.player;
    } catch (_) {}

    /* ── Кнопки ── */
    this._bigBtn(W / 2, H * 0.79,
      '⚔️  Ещё бой!',
      won ? C.gold : 0x881a22,
      won ? '#1a1a28' : '#ffffff',
      () => { this.scene.start('Menu'); }
    );
    this._mainBtn(W / 2, H * 0.89, '🏠  Главная', () => this.scene.start('Menu'));

    /* ── Поделиться (только при победе) ── */
    if (won) {
      const shareY = H * 0.96;
      const shareT = txt(this, W / 2, shareY, '📤 Поделиться победой', 11, '#555577').setOrigin(0.5);
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
   RATING SCENE — топ игроков
   ═══════════════════════════════════════════════════════════ */
class RatingScene extends Phaser.Scene {
  constructor() { super('Rating'); }

  async create() {
    const { width: W, height: H } = this.game.canvas;

    /* Фон */
    const bg = this.add.graphics();
    bg.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
    bg.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.85),
        Phaser.Math.FloatBetween(0.3, 1.6), 0xffc83c,
        Phaser.Math.FloatBetween(0.04, 0.2)
      );
    }

    /* Шапка */
    makePanel(this, 8, 6, W - 16, 48, 11);
    txt(this, W / 2, 30, '🏆  ТОП ИГРОКОВ', 18, '#ffc83c', true).setOrigin(0.5);

    /* Кнопка назад */
    const backG = this.add.graphics();
    backG.fillStyle(C.dark, 0.85);
    backG.fillRoundedRect(12, 10, 80, 32, 8);
    txt(this, 52, 26, '← Назад', 12, '#8888aa').setOrigin(0.5);
    this.add.zone(12, 10, 80, 32).setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); this.scene.start('Menu'); });

    try {
      const res = await get('/api/rating', { limit: 20 });
      if (!res.ok) throw new Error('bad');

      const players  = res.players || [];
      const myRank   = res.my_rank;
      const myUid    = State.player?.user_id;

      /* ── TOP-3 подиум ── */
      if (players.length >= 3) {
        this._buildPodium(players.slice(0, 3), W, 62);
      }

      /* ── Список с 4-го места ── */
      const listFrom = Math.min(players.length, 3);
      const listY    = players.length >= 3 ? 198 : 62;
      const rowH     = 46;

      players.slice(listFrom).forEach((p, i) => {
        const rank = listFrom + i + 1;
        const ry   = listY + i * rowH;
        const isMe = p.user_id === myUid;

        const rg = this.add.graphics();
        rg.fillStyle(isMe ? 0x1e2840 : C.bgPanel, isMe ? 0.98 : 0.8);
        rg.fillRoundedRect(10, ry, W - 20, rowH - 4, 9);
        if (isMe) {
          rg.lineStyle(1.5, C.blue, 0.7);
          rg.strokeRoundedRect(10, ry, W - 20, rowH - 4, 9);
        }

        txt(this, 28, ry + (rowH - 4) / 2, `${rank}.`, 12, '#666688', true).setOrigin(0.5);
        txt(this, 52, ry + 10, p.username || `User${p.user_id}`, 13, isMe ? '#5096ff' : '#f0f0fa', isMe);
        txt(this, 52, ry + 27, `Ур.${p.level}  ·  🏆 ${p.wins}W  💀 ${p.losses}L`, 10, '#555577');
        txt(this, W - 14, ry + (rowH - 4) / 2, `★ ${p.rating}`, 13, '#ffc83c', true).setOrigin(1, 0.5);
      });

      if (players.length === 0) {
        txt(this, W / 2, H / 2, '📭 Нет данных', 14, '#555577').setOrigin(0.5);
      }

      /* ── Моя позиция (если не в топ-20) ── */
      if (myRank && myRank > 20) {
        const myBY = H - 50;
        const myBG = this.add.graphics();
        myBG.fillStyle(0x1a2030, 0.97);
        myBG.fillRoundedRect(10, myBY, W - 20, 42, 10);
        myBG.lineStyle(1.5, C.gold, 0.5);
        myBG.strokeRoundedRect(10, myBY, W - 20, 42, 10);
        txt(this, W / 2, myBY + 14, `Ваше место в рейтинге`, 10, '#888899').setOrigin(0.5);
        txt(this, W / 2, myBY + 30, `# ${myRank}  ·  ★ ${State.player?.rating || '?'}`, 15, '#ffc83c', true).setOrigin(0.5);
      }

    } catch (e) {
      txt(this, W / 2, H / 2, '❌ Нет соединения', 14, '#ff4455').setOrigin(0.5);
    }
  }

  _buildPodium(top3, W, y) {
    // Порядок: 2-е (слева), 1-е (центр), 3-е (справа)
    const order     = [top3[1], top3[0], top3[2]];
    const podH      = [80, 104, 64];
    const medals    = ['🥈', '🥇', '🥉'];
    const podColors = [0x666688, 0xcc9900, 0x885533];
    const posX      = [W * 0.20, W * 0.50, W * 0.80];
    const myUid     = State.player?.user_id;
    const baseY     = y + 128; // bottom of podium area

    order.forEach((p, i) => {
      if (!p) return;
      const px   = posX[i];
      const ph   = podH[i];
      const isMe = p.user_id === myUid;

      /* Подиум-столбик */
      const pg = this.add.graphics();
      pg.fillStyle(podColors[i], isMe ? 1 : 0.75);
      pg.fillRoundedRect(px - 38, baseY - ph, 76, ph, 6);
      if (isMe) { pg.lineStyle(2, C.blue, 0.8); pg.strokeRoundedRect(px - 38, baseY - ph, 76, ph, 6); }

      /* Медаль */
      txt(this, px, baseY - ph - 28, medals[i], 24).setOrigin(0.5);

      /* Имя */
      const name = (p.username || 'User').slice(0, 9);
      txt(this, px, baseY - ph - 10, name, 10, isMe ? '#88ccff' : '#f0f0fa', isMe).setOrigin(0.5);

      /* Рейтинг */
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
          QuestsScene, SummaryScene, SeasonScene, BattlePassScene, ClanScene, ShopScene],
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
