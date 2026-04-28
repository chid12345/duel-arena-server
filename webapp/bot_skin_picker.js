/* ============================================================
   BotSkinPicker — выбор скина бота для боёв с PvE-противниками
     pick()         — случайный id из набора без повтора последних 3
     shouldFlip(id) — нужно ли отзеркалить (boss смотрит на игрока)
     scaleFor(id)   — индивидуальный масштаб (OVERRIDE)
     nudgeFor(id)   — сдвиг вниз в px карты-превью (для арены делим на 4)
     bgKey(id) / skinKey(id) — ключи Phaser-текстур
     ALL_IDS, BG_EXT — для preload
   Используется только если State.battle.opp_is_bot === true.
   PvP-бои не затрагиваются.
   ============================================================ */

const BotSkinPicker = (() => {
  // Пропуски: #6 удалён по запросу, #19 отсутствует в наборе ассетов
  const SKIP = new Set([6, 19]);
  const ALL_IDS = [];
  for (let id = 1; id <= 33; id++) if (!SKIP.has(id)) ALL_IDS.push(id);

  // Те, что в наборе изначально смотрят вправо — флипаем лицом к игроку
  const FLIP_IDS = new Set([1,2,3,4,5,7,8,9,10,11,13,16,17,18,22,28,29,30]);

  // Индивидуальные правки по id
  const OVERRIDE = {
    16: { scale: 1.12, nudge: 8 }, // лавовый гигант: чуть крупнее, опустить
  };

  // Расширение фона: 1..25 — png, 26..33 — jpg
  const BG_EXT = id => id <= 25 ? 'png' : 'jpg';

  // Антирепит: не повторять последние 3 id (через localStorage)
  const RECENT_KEY = 'da_recent_bot_skins';
  const RECENT_MAX = 3;

  function _readRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch(_) { return []; }
  }
  function _writeRecent(arr) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, RECENT_MAX))); }
    catch(_) {}
  }

  function pick() {
    const recent = _readRecent();
    const pool = ALL_IDS.filter(id => !recent.includes(id));
    const src  = pool.length ? pool : ALL_IDS;
    const id = src[Math.floor(Math.random() * src.length)];
    _writeRecent([id, ...recent]);
    return id;
  }

  function preloadInto(scene, V = '') {
    ALL_IDS.forEach(id => {
      scene.load.image(`bot_skin_${id}`, `bot_skins/${id}.png${V}`);
      scene.load.image(`bot_bg_${id}`,   `bot_skins/bg/${id}.${BG_EXT(id)}${V}`);
    });
  }

  return {
    ALL_IDS,
    BG_EXT,
    pick,
    preloadInto,
    shouldFlip: id => FLIP_IDS.has(id),
    scaleFor:   id => (OVERRIDE[id] && OVERRIDE[id].scale) || 1,
    nudgeFor:   id => (OVERRIDE[id] && OVERRIDE[id].nudge) || 0,
    bgKey:      id => `bot_bg_${id}`,
    skinKey:    id => `bot_skin_${id}`,
  };
})();

if (typeof window !== 'undefined') window.BotSkinPicker = BotSkinPicker;
