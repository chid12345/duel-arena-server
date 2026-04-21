/* ============================================================
   Duel Arena TMA — Phaser 3
   Глобальные константы, State, API-функции, Phaser-хелперы.
   Должен загружаться первым перед всеми сценами.
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
  avatarId: (() => { try { return parseInt(localStorage.getItem('da_avatar') || '3', 10); } catch(_) { return 3; } })(),
  wardrobeEquipped: (() => { try { const s = localStorage.getItem('da_wardrobe_eq'); return s ? JSON.parse(s) : null; } catch(_) { return null; } })(),
};

/* Сохраняет экипированную броню в State + localStorage */
function setWardrobeEquipped(v) {
  State.wardrobeEquipped = v;
  try {
    if (v) localStorage.setItem('da_wardrobe_eq', JSON.stringify(v));
    else    localStorage.removeItem('da_wardrobe_eq');
  } catch(_) {}
}

/* Ключ Phaser-текстуры по редкости брони */
function getArmorTextureKey(rarity) {
  if (rarity === 'rare')   return 'armor_gold';
  if (rarity === 'epic')   return 'armor_epic';
  if (rarity === 'mythic') return 'armor_mythic';
  return 'armor_common';
}

/* Ключ Phaser-текстуры оружия по item_id */
const _WEAPON_TEXTURE_MAP = {
  sword_free:'weapon_sword_free', sword_gold:'weapon_sword_rare',
  sword_diamond:'weapon_sword_epic', sword_mythic:'weapon_sword_mythic',
  axe_free:'weapon_axe_free', axe_gold:'weapon_axe_rare',
  axe_diamond:'weapon_axe_epic', axe_mythic:'weapon_axe_mythic',
  club_free:'weapon_club_free', club_gold:'weapon_club_rare',
  club_diamond:'weapon_club_epic', club_mythic:'weapon_club_mythic',
  gs_free:'weapon_gs_free', gs_gold:'weapon_gs_rare',
  gs_diamond:'weapon_gs_epic', gs_mythic:'weapon_gs_mythic',
};
function getWeaponTextureKey(item_id) { return _WEAPON_TEXTURE_MAP[item_id] || null; }

/* Ключ Phaser-текстуры шлема по item_id */
const _HELMET_TEXTURE_MAP = {
  helmet_free1:'helmet_free1', helmet_free2:'helmet_free2',
  helmet_free3:'helmet_free3', helmet_free4:'helmet_free4',
  helmet_gold1:'helmet_gold1', helmet_gold2:'helmet_gold2',
  helmet_gold3:'helmet_gold3', helmet_gold4:'helmet_gold4',
  helmet_dia1:'helmet_dia1',   helmet_dia2:'helmet_dia2',
  helmet_dia3:'helmet_dia3',   helmet_dia4:'helmet_dia4',
  helmet_mythic1:'helmet_mythic1', helmet_mythic2:'helmet_mythic2',
  helmet_mythic3:'helmet_mythic3', helmet_mythic4:'helmet_mythic4',
};
function getHelmetTextureKey(item_id) { return _HELMET_TEXTURE_MAP[item_id] || null; }

/* Ключ Phaser-текстуры сапог по item_id */
const _BOOTS_TEXTURE_MAP = {
  boots_free1:'boots_free1', boots_free2:'boots_free2',
  boots_free3:'boots_free3', boots_free4:'boots_free4',
  boots_gold1:'boots_gold1', boots_gold2:'boots_gold2',
  boots_gold3:'boots_gold3', boots_gold4:'boots_gold4',
  boots_dia1:'boots_dia1',   boots_dia2:'boots_dia2',
  boots_dia3:'boots_dia3',   boots_dia4:'boots_dia4',
  boots_mythic1:'boots_mythic1', boots_mythic2:'boots_mythic2',
  boots_mythic3:'boots_mythic3', boots_mythic4:'boots_mythic4',
};
function getBootsTextureKey(item_id) { return _BOOTS_TEXTURE_MAP[item_id] || null; }

/* Ключ текстуры воина по типу */
function getWarriorKey(type) {
  if (type === 'tank')    return 'warrior_tank';
  if (type === 'agile')   return 'warrior_agile';
  if (type === 'crit')    return 'warrior_crit';
  return 'warrior_tank';
}

/* PNG-скин воина для главного экрана */
function getWarriorDisplayKey(type) {
  if (type === 'tank')  return 'warrior_tank_png';
  if (type === 'agile') return 'warrior_agile_png';
  if (type === 'crit')  return 'warrior_crit_png';
  return 'warrior_tank_png';
}

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

/** Глобальный cooldown: блокирует повторный claim/buy 1.5с после последнего запроса */
function _globalCooldown(key, ms) {
  const now = Date.now();
  const k = '_lock_' + key;
  if (State[k] && now - State[k] < (ms || 1500)) return true;
  State[k] = now;
  return false;
}
function _globalCooldownReset(key) { State['_lock_' + key] = 0; }

function get(path, params = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const q = new URLSearchParams({ init_data: State.initData, ...params });
  return fetch(`${API}${path}?${q}`, { signal: ctrl.signal, cache: 'no-store' })
    .then(r => {
      clearTimeout(t);
      return r.json().catch(() => ({ ok: false, _httpStatus: r.status }));
    })
    .catch(e => { clearTimeout(t); throw e; });
}

/* ─── WebSocket ─────────────────────────────────────────────── */
function connectWS(userId, onMessage) {
  // Переиспользуем открытое соединение — меняем обработчик и onclose
  if (State.ws && State.ws.readyState === WebSocket.OPEN) {
    State.ws.onmessage = e => onMessage(JSON.parse(e.data));
    // ВАЖНО: обновляем onclose чтобы переподключение использовало ТЕКУЩИЙ handler
    State.ws.onclose = () => {
      if (State.ws === State.ws) setTimeout(() => connectWS(userId, onMessage), 3000);
    };
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
