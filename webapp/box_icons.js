/* ============================================================
   BoxIcons — единый мапинг item_id → картинка ящика.
   Используется в премиум-окне, рюкзаке, любой карточке наград,
   чтобы везде показывался тот же ящик что и в магазине.
   ============================================================ */

window.BoxIcons = {
  // item_id → путь к PNG (относительно webapp/)
  MAP: {
    'box_common':       'chest_gold.webp',
    'box_rare':         'chest_diamond.webp',
    'box_rare_c':       'chest_diamond.webp',
    'box_epic_e2':      'chest_epic.webp',
    'box_epic_e3':      'chest_epic.webp',
    'wb_gold_chest':    'chest_gold.webp',
    'wb_diamond_chest': 'chest_diamond.webp',
    'prem_box':         'prem_box.webp',
  },

  // item_id → цвет лёгкого свечения (по валюте: золото / алмазы / USDT / звёзды).
  GLOW: {
    'box_common':       'rgba(255,200,80,.55)',   // золото
    'wb_gold_chest':    'rgba(255,200,80,.55)',
    'box_rare':         'rgba(0,200,255,.55)',    // алмазы
    'box_rare_c':       'rgba(180,79,255,.55)',   // алмазы+
    'wb_diamond_chest': 'rgba(0,200,255,.55)',
    'box_epic_e2':      'rgba(0,255,136,.55)',    // USDT
    'box_epic_e3':      'rgba(0,255,136,.55)',
    'prem_box':         'rgba(255,150,220,.55)',  // звёзды (Telegram Stars)
  },

  /** Вернуть путь к картинке или null если не ящик. */
  imageFor(itemId) {
    return this.MAP[itemId] || null;
  },

  /** Цвет лёгкого свечения под иконкой ящика. */
  glowFor(itemId) {
    return this.GLOW[itemId] || 'rgba(255,200,80,.45)';
  },

  /** HTML <img> или эмодзи-фолбэк для DOM-окон.
   *  size — размер картинки в px. */
  htmlIcon(itemId, fallbackEmoji = '🎁', size = 32) {
    const img = this.imageFor(itemId);
    if (img) {
      const glow = this.glowFor(itemId);
      return `<img src="${img}" style="width:${size}px;height:${size}px;object-fit:contain;filter:drop-shadow(0 0 8px ${glow}) drop-shadow(0 0 2px ${glow});flex-shrink:0" alt="">`;
    }
    return `<span style="font-size:${Math.round(size*0.7)}px;flex-shrink:0">${fallbackEmoji}</span>`;
  },
};
