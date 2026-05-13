/* ============================================================
   BoxIcons — единый мапинг item_id → картинка ящика.
   Используется в премиум-окне, рюкзаке, любой карточке наград,
   чтобы везде показывался тот же ящик что и в магазине.
   ============================================================ */

window.BoxIcons = {
  // item_id → путь к PNG (относительно webapp/)
  MAP: {
    'box_common':       'chest_gold.png',
    'box_rare':         'chest_diamond.png',
    'box_rare_c':       'chest_diamond.png',
    'box_epic_e2':      'chest_epic.png',
    'box_epic_e3':      'chest_epic.png',
    'wb_gold_chest':    'chest_gold.png',
    'wb_diamond_chest': 'chest_diamond.png',
    'prem_box':         'prem_box.png',
  },

  /** Вернуть путь к картинке или null если не ящик. */
  imageFor(itemId) {
    return this.MAP[itemId] || null;
  },

  /** HTML <img> или эмодзи-фолбэк для DOM-окон.
   *  size — размер картинки в px. */
  htmlIcon(itemId, fallbackEmoji = '🎁', size = 32) {
    const img = this.imageFor(itemId);
    if (img) {
      return `<img src="${img}" style="width:${size}px;height:${size}px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(255,200,80,.45));flex-shrink:0" alt="">`;
    }
    return `<span style="font-size:${Math.round(size*0.7)}px;flex-shrink:0">${fallbackEmoji}</span>`;
  },
};
