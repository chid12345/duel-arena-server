/* skin_prefetch — заранее греет HTML-кеш браузера 9 скинами воина (PNG).
   Phaser preload грузит их как текстуры по своим URL — браузер же `<img>`
   в HTML-overlay использует прямые `skins/{folder}/{N}.png`, и без префетча
   при первом PvP-бое с этим типом скин лагает 50-200мс пока загружается.
   Запускается при загрузке скрипта (defer), не блокирует парсинг. */
(function _prefetchWarriorSkins() {
  if (typeof window === 'undefined') return;
  const paths = [
    'skins/sila/1.webp',    'skins/sila/2.webp',    'skins/sila/3.webp',
    'skins/agility/1.webp', 'skins/agility/2.webp', 'skins/agility/3.webp',
    'skins/crit/1.webp',    'skins/crit/2.webp',    'skins/crit/3.webp',
  ];
  paths.forEach(p => { try { const img = new Image(); img.src = p; } catch (_) {} });
})();
