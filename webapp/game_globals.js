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

/* Ключ Phaser-текстуры брони по class_id (fallback — по rarity) */
const _ARMOR_TEXTURE_MAP = {
  tank_free:'armor_free1',      agile_free:'armor_free2',
  crit_free:'armor_free3',      universal_free:'armor_free4',
  berserker_gold:'armor_gold1', assassin_gold:'armor_gold2',
  mage_gold:'armor_gold3',      paladin_gold:'armor_gold4',
  dragonknight_diamonds:'armor_dia1', shadowdancer_diamonds:'armor_dia2',
  archmage_diamonds:'armor_dia3',     universal_diamonds:'armor_dia4',
  berserker_mythic:'armor_mythic1',   assassin_mythic:'armor_mythic2',
  archmage_mythic:'armor_mythic3',    legendary_usdt:'armor_mythic4',
};
function getArmorTextureKey(classIdOrRarity) {
  const key = String(classIdOrRarity || '').trim();
  if (_ARMOR_TEXTURE_MAP[key]) return _ARMOR_TEXTURE_MAP[key];
  // fallback по rarity → первая картинка соотв. тира
  if (key === 'rare')   return 'armor_gold1';
  if (key === 'epic')   return 'armor_dia1';
  if (key === 'mythic') return 'armor_mythic1';
  // usdt_custom_* → 4-й мифик
  if (key.startsWith('usdt_custom_')) return 'armor_mythic4';
  return 'armor_free1';
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
/* Фолбэк по rarity: если item_id не в карте (legacy/новые ID) — показываем PNG нужного тира */
function getWeaponTextureKeyByRarity(rarity) {
  const r = String(rarity || '').toLowerCase();
  if (r === 'rare')   return 'weapon_sword_rare';
  if (r === 'epic')   return 'weapon_sword_epic';
  if (r === 'mythic') return 'weapon_sword_mythic';
  return 'weapon_sword_free';
}

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
function getHelmetTextureKeyByRarity(rarity) {
  const r = String(rarity || '').toLowerCase();
  if (r === 'rare')   return 'helmet_gold1';
  if (r === 'epic')   return 'helmet_dia1';
  if (r === 'mythic') return 'helmet_mythic1';
  return 'helmet_free1';
}

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
function getBootsTextureKeyByRarity(rarity) {
  const r = String(rarity || '').toLowerCase();
  if (r === 'rare')   return 'boots_gold1';
  if (r === 'epic')   return 'boots_dia1';
  if (r === 'mythic') return 'boots_mythic1';
  return 'boots_free1';
}

/* Ключ Phaser-текстуры щита по item_id */
const _SHIELD_TEXTURE_MAP = {
  shield_free1:'shield_free1', shield_free2:'shield_free2',
  shield_free3:'shield_free3', shield_free4:'shield_free4',
  shield_gold1:'shield_gold1', shield_gold2:'shield_gold2',
  shield_gold3:'shield_gold3', shield_gold4:'shield_gold4',
  shield_dia1:'shield_dia1',   shield_dia2:'shield_dia2',
  shield_dia3:'shield_dia3',   shield_dia4:'shield_dia4',
  shield_mythic1:'shield_mythic1', shield_mythic2:'shield_mythic2',
  shield_mythic3:'shield_mythic3', shield_mythic4:'shield_mythic4',
};
function getShieldTextureKey(item_id) { return _SHIELD_TEXTURE_MAP[item_id] || null; }
function getShieldTextureKeyByRarity(rarity) {
  const r = String(rarity || '').toLowerCase();
  if (r === 'rare')   return 'shield_gold1';
  if (r === 'epic')   return 'shield_dia1';
  if (r === 'mythic') return 'shield_mythic1';
  return 'shield_free1';
}

/* Ключ Phaser-текстуры кольца по item_id */
const _RING_TEXTURE_MAP = {
  ring_free1:'ring_free1', ring_free2:'ring_free2',
  ring_free3:'ring_free3', ring_free4:'ring_free4',
  ring_gold1:'ring_gold1', ring_gold2:'ring_gold2',
  ring_gold3:'ring_gold3', ring_gold4:'ring_gold4',
  ring_dia1:'ring_dia1',   ring_dia2:'ring_dia2',
  ring_dia3:'ring_dia3',   ring_dia4:'ring_dia4',
  ring_mythic1:'ring_mythic1', ring_mythic2:'ring_mythic2',
  ring_mythic3:'ring_mythic3', ring_mythic4:'ring_mythic4',
};
function getRingTextureKey(item_id) { return _RING_TEXTURE_MAP[item_id] || null; }
function getRingTextureKeyByRarity(rarity) {
  const r = String(rarity || '').toLowerCase();
  if (r === 'rare')   return 'ring_gold1';
  if (r === 'epic')   return 'ring_dia1';
  if (r === 'mythic') return 'ring_mythic1';
  return 'ring_free1';
}

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
  // Без init_data бэк теперь закрывает сокет с code 1008 — передаём подпись Telegram.
  const q     = State.initData ? `?init_data=${encodeURIComponent(State.initData)}` : '';
  const url   = `${proto}:${host}/ws/${userId}${q}`;
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
  // Защита от ghost-tap: pointerup после перехода сцен мог прилететь сюда
  // с pointerdown'ом от другого элемента старой сцены.
  let _pressed = false;
  const _createdAt = Date.now();
  z.on('pointerdown', () => { _pressed = true; _draw(true); tg?.HapticFeedback?.impactOccurred('light'); });
  z.on('pointerup',   () => {
    _draw(false);
    if (!_pressed) return;
    if (Date.now() - _createdAt < 200) return;
    _pressed = false;
    onClick();
  });
  z.on('pointerout',  () => { _pressed = false; _draw(false); });
  // Back-кнопка зафиксирована на экране — не уезжает при drag-скролле.
  try { bg.setScrollFactor?.(0); t.setScrollFactor?.(0); z.setScrollFactor?.(0); } catch(_) {}
  return { bg, t, z };
}

/* ════════════════════════════════════════════════════════════
   Zombie-overlay страховка.
   HTML-оверлеи (ClanHTML/StatsHTML/WardrobeHTML/*_html_overlay) имеют
   z-index:9000 и покрывают весь canvas кроме TabBar. Если предыдущая
   сцена не закрыла свой оверлей (exception в shutdown, гонка при
   scene.start во время анимации, модалка покупки над оверлеем),
   новый экран получает «чёрное небо + нижнее меню» — ровно то, что
   чинили в v2.0.38–v2.0.40, но точечно по одному overlay за раз.
   Этот helper — единая страховка: вызывается в create() КАЖДОЙ
   TabBar-сцены. Закрытие overlay'а, которого нет — безопасный no-op.
   ════════════════════════════════════════════════════════════ */
/**
 * Анти-эксплойт: если игрок в активном бою (рейд/PvP/натиск/башня) и
 * пытается зайти на не-боевую сцену — возвращаем в нужную сцену.
 * Возвращает Promise<boolean>: true если был редирект, false если можно
 * остаться. Используется в начале create() каждой TabBar-сцены.
 */
window._redirectIfInBattle = async function(scene) {
  const now = Date.now();
  // Кэш на 30 сек: если только что проверяли и боя не было — не стучимся снова
  if (window._ribCache && now - window._ribCache.ts < 30000 && !window._ribCache.inBattle) {
    return false;
  }
  try {
    const sess = await post('/api/player/active_session', {});
    const inBattle = !!(sess?.ok && sess.scene && sess.scene !== scene.scene.key);
    window._ribCache = { ts: now, inBattle };
    if (inBattle) {
      scene.scene.start(sess.scene, sess.openTab ? { returnTab: sess.openTab } : {});
      return true;
    }
  } catch(_) {
    window._ribCache = { ts: now, inBattle: false };
  }
  return false;
};

window._closeAllTabOverlays = function() {
  try { window.ClanHTML?.close?.(); } catch(_) {}
  try { window.StatsHTML?.close?.(); } catch(_) {}
  try { window.WardrobeHTML?.close?.(); } catch(_) {}
  try { window.WeaponHTML?.close?.(); } catch(_) {}
  try { window.HelmetHTML?.close?.(); } catch(_) {}
  try { window.BootsHTML?.close?.(); } catch(_) {}
  try { window.ShieldHTML?.close?.(); } catch(_) {}
  try { window.RingHTML?.close?.(); } catch(_) {}
  try { window.WBHtml?.close?.(); } catch(_) {}
};
