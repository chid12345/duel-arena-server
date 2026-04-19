/* ============================================================
   MenuScene — equipment: слоты экипировки на профиле
   Левая колонка: Меч / Пояс / Ботинки
   Правая колонка: Щит / Броня / Кольцо1 + Кольцо2
   ============================================================ */

const _EQ_LEFT  = [
  { slot: 'weapon', icon: '🗡️' },
  { slot: 'belt',   icon: '🪢' },
  { slot: 'boots',  icon: '👟' },
];
const _EQ_RIGHT = [
  { slot: 'shield', icon: '🛡️' },
  { slot: 'armor',  icon: '🥋' },
];
const _EQ_RINGS = ['ring1', 'ring2'];

const _EQ_RARITY_COLOR = {
  common:  0x667799,
  rare:    0x3399ee,
  epic:    0xaa55ff,
};
const _EQ_EMPTY_COLOR = 0x303050;
const _EQ_EMPTY_BORDER = 0x444466;

Object.assign(MenuScene.prototype, {

  _addEquipmentSlots(c, W, czY, czH, PAD, mkG, mkT, mkZ, ca) {
    const eq    = State.equipment || {};
    const SW    = 40, SH = 44;  // slot size
    const RW    = 18, RH = 32;  // ring size

    // Vertical positions: top / mid / bottom within character area
    const sTop = czY + 10;
    const sMid = czY + Math.round(czH * 0.38);
    const sBot = czY + czH - SH - 38;  // above HP bar

    // LEFT column x
    const lx = 2;
    // RIGHT column x
    const rx = W - SW - 2;

    // Draw each main slot
    _EQ_LEFT.forEach((s, i) => {
      const sy = [sTop, sMid, sBot][i];
      this._drawEqSlot(c, lx, sy, SW, SH, s.slot, s.icon, eq[s.slot], mkG, mkT, mkZ, ca);
    });
    _EQ_RIGHT.forEach((s, i) => {
      const sy = [sTop, sMid][i];
      this._drawEqSlot(c, rx, sy, SW, SH, s.slot, s.icon, eq[s.slot], mkG, mkT, mkZ, ca);
    });

    // Rings: two small slots side by side at bottom right
    const ringsY = sBot;
    const r1x = W - RW * 2 - 4;
    const r2x = W - RW - 2;
    this._drawEqSlot(c, r1x, ringsY, RW, RH, 'ring1', '💍', eq['ring1'], mkG, mkT, mkZ, ca, true);
    this._drawEqSlot(c, r2x, ringsY, RW, RH, 'ring2', '💍', eq['ring2'], mkG, mkT, mkZ, ca, true);
  },

  _drawEqSlot(c, x, y, w, h, slot, icon, item, mkG, mkT, mkZ, ca, small = false) {
    const g = mkG();
    const r = small ? 6 : 8;

    if (item) {
      const bc = _EQ_RARITY_COLOR[item.rarity] || _EQ_EMPTY_BORDER;
      // Glow background
      g.fillStyle(bc, 0.18); g.fillRoundedRect(x, y, w, h, r);
      g.lineStyle(1.5, bc, 0.9); g.strokeRoundedRect(x, y, w, h, r);
      c.add(g);
      // Item emoji
      const fontSize = small ? 13 : 19;
      ca(mkT(x + w / 2, y + h / 2, item.emoji, fontSize)).setOrigin(0.5);
    } else {
      // Empty slot — dashed border look
      g.fillStyle(_EQ_EMPTY_COLOR, 0.7); g.fillRoundedRect(x, y, w, h, r);
      g.lineStyle(1, _EQ_EMPTY_BORDER, 0.6); g.strokeRoundedRect(x, y, w, h, r);
      c.add(g);
      const fontSize = small ? 11 : 16;
      const ict = mkT(x + w / 2, y + h / 2, icon, fontSize);
      ict.setOrigin(0.5).setAlpha(0.28);
      c.add(ict);
    }

    // Tap zone → open equipment scene
    const zone = mkZ(x + w / 2, y + h / 2, w + 4, h + 4).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      Sound.click();
      this.scene.start('Equipment', { slot });
    });
    c.add(zone);
  },

});
