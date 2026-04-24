/* ============================================================
   Dev Mode — `?dev=1` в URL включает автономный мок.
   Цель: визуальная верификация UI без Telegram initData и сервера.
   - Подменяет window.Telegram.WebApp.initData на заглушку
   - Перехватывает window.fetch для /api/* → возвращает моки
   - WebSocket глушится (onopen не срабатывает)
   Продакшн не трогаем: активируется ТОЛЬКО по ?dev=1.
   ============================================================ */
(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('dev') !== '1') return;

  window.__DEV_MODE__ = true;
  console.log('[DevMode] ON — API calls are mocked, no Telegram auth');

  // --- 1. Telegram stub ---------------------------------------------------
  const tgStub = {
    initData: 'dev_mock_init_data',
    initDataUnsafe: { user: { id: 777000001, first_name: 'DevHero', username: 'dev_hero' } },
    ready: () => {}, expand: () => {},
    viewportStableHeight: window.innerHeight,
    viewportHeight: window.innerHeight,
    onEvent: () => {}, offEvent: () => {},
    HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {}, selectionChanged: () => {} },
    setHeaderColor: () => {}, setBottomBarColor: () => {},
    showAlert: (msg, cb) => { alert(msg); cb?.(); },
    showConfirm: (msg, cb) => { cb?.(confirm(msg)); },
    openInvoice: () => {}, openLink: (url) => window.open(url, '_blank'),
    close: () => {},
  };
  if (!window.Telegram) window.Telegram = {};
  // Замораживаем Telegram.WebApp нашим stub: если Telegram SDK загрузится
  // позже (script async) и попытается переопределить — сеттер игнорит.
  // initData возвращается геттером — assignment извне тоже игнорируется.
  Object.defineProperty(tgStub, 'initData', {
    configurable: false,
    get: () => 'dev_mock_init_data',
    set: () => {},
  });
  try {
    Object.defineProperty(window.Telegram, 'WebApp', {
      configurable: true,
      get: () => tgStub,
      set: () => {},
    });
  } catch (_) {
    window.Telegram.WebApp = tgStub;
  }

  // --- 2. Mock player data ------------------------------------------------
  const MOCK_PLAYER = {
    tg_id: 777000001, user_id: 777000001, username: 'DevHero',
    level: 15, rating: 1420, warrior_type: 'tank',
    gold: 1250, diamonds: 42,
    is_premium: false, premium_days_left: 0,
    avatar_badge: '💀', avatar_tier: 'base',
    strength: 25, agility: 14, intuition: 11, stamina: 18,
    free_stats: 3,
    current_hp: 1171, max_hp: 1451, max_hp_effective: 1451,
    hp_pct: 80, exp: 79, exp_needed: 1975, xp_pct: 4, max_level: false,
    wins: 23, losses: 12, win_streak: 4,
    dmg: 215, dodge_pct: 12, crit_pct: 18, armor_pct: 22,
    stats_base: { strength: 25, agility: 14, intuition: 11, stamina: 18 },
    stats_bonus_total: { strength: 0, agility: 0, intuition: 0, stamina: 0 },
    regen_per_min: 40, regen_secs_to_full: 420,
    current_class: 'tank_free', clan_id: null, clan_name: null,
    eq_stats: {}, usdt_passive_type: '',
  };
  const MOCK_EQUIPMENT = {
    belt:   { item_id: 'helmet_gold1', rarity: 'rare',   name: 'Золотой шлем' },
    armor:  { item_id: 'armor_gold',   rarity: 'rare',   name: 'Золотая броня' },
    boots:  { item_id: 'boots_gold1',  rarity: 'rare',   name: 'Золотые сапоги' },
    weapon: { item_id: 'sword_gold',   rarity: 'rare',   name: 'Золотой меч', emoji: '⚔️' },
    shield: { item_id: 'shield_gold1', rarity: 'rare',   name: 'Золотой щит' },
    ring1:  { item_id: 'ring_gold1',   rarity: 'rare',   name: 'Золотое кольцо' },
  };

  // --- 3. Response map ----------------------------------------------------
  const R = (data) => ({ ok: true, ...data });
  const handlers = {
    'POST /api/player':          () => R({ player: MOCK_PLAYER, equipment: MOCK_EQUIPMENT, owned_weapons: ['sword_gold'] }),
    'GET  /api/version':         () => R({ version: '2.0.32' }),
    'GET  /api/tasks/status':    () => R({ claimable_count: 0, tasks: [] }),
    'GET  /api/shop/inventory':  () => R({ inventory: [], active_buffs: [], eq_stats: {}, clan_bonus: null }),
    'GET  /api/daily/status':    () => R({ can_claim: false, streak: 0, reward: null }),
    'GET  /api/player/buffs':    () => R({ buffs: [] }),
    'GET  /api/shop/owned_weapons': () => R({ owned: ['sword_gold'] }),
    'POST /api/shop/apply':      () => R({ msg: 'Мок: применено' }),
    'GET  /api/rating':          () => R({ players: [] }),
    'GET  /api/clan/mine':       () => R({ clan: null }),
    'POST /api/warrior-type':    () => R({}),
  };
  const DEFAULT = () => R({ _dev: 'no-mock', data: null });

  // --- 4. Fetch interceptor ----------------------------------------------
  const origFetch = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    try {
      const u = String(url);
      if (u.includes('/api/')) {
        const method = (opts?.method || 'GET').toUpperCase();
        const path = u.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
        const key = method.padEnd(4) + ' ' + path;
        const h = handlers[key] || handlers[method + ' ' + path] || DEFAULT;
        const body = JSON.stringify(h());
        console.log('[DevMode] mock', key, '→', body.length, 'bytes');
        return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
    } catch (e) { console.warn('[DevMode] fetch handler error:', e); }
    return origFetch(url, opts);
  };

  // --- 5. WebSocket stub -------------------------------------------------
  const OrigWS = window.WebSocket;
  window.WebSocket = function DevWS(url) {
    console.log('[DevMode] WebSocket stub for', url);
    const ws = { readyState: 3, send: () => {}, close: () => {}, onmessage: null, onclose: null, onopen: null, onerror: null };
    return ws;
  };
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN       = 1;
  window.WebSocket.CLOSING    = 2;
  window.WebSocket.CLOSED     = 3;

  // --- 6. Watchdog: форс-старт Menu ---------------------------------------
  // В preview-среде Boot.create → scene.start('Menu') иногда не срабатывает
  // (не успевает Phaser-тик). Если через 3 сек после создания game Menu
  // всё ещё не активна — стартуем вручную. В Telegram/проде ветка не нужна.
  const _tryForceMenu = () => {
    const g = window.__game;
    if (!g) return false;
    const menu = g.scene.getScene('Menu');
    if (!menu) return false;
    if (menu.sys.settings.status >= 3) return true; // уже стартовала
    console.log('[DevMode] Menu не стартовала — форсим scene.start("Menu")');
    try { g.scene.start('Menu'); } catch (e) { console.warn('[DevMode] force-start err:', e); }
    return true;
  };
  setTimeout(() => { if (!_tryForceMenu()) setTimeout(_tryForceMenu, 2000); }, 3000);
})();
