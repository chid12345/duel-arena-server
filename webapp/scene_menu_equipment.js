/* ============================================================
   MenuScene — equipment: слоты экипировки на профиле
   Левая колонка: Меч / Пояс / Сапоги
   Правая колонка: Щит / Броня / Кольцо1 + Кольцо2
   ============================================================ */

const _EQ_LEFT  = [{ slot: 'weapon' }, { slot: 'belt' }, { slot: 'boots' }];
const _EQ_RIGHT = [{ slot: 'shield' }, { slot: 'armor' }, { slot: 'ring1' }];

const _EQ_SLOT_LABELS = {
  weapon: 'Меч', belt: 'Пояс', boots: 'Сапоги',
  shield: 'Щит', armor: 'Броня', ring1: 'Кольцо', ring2: 'Кольцо',
};
const _EQ_RARITY_COLOR = { common: 0x667799, rare: 0x3399ee, epic: 0xaa55ff };

Object.assign(MenuScene.prototype, {

  _addEquipmentSlots(c, W, czY, czH, PAD, mkG, mkT, mkZ, ca) {
    const eq = State.equipment || {};
    const SW = 60, SH = 64;

    // 1fr / 2fr / 1fr grid — same math as CSS Grid in the HTML mockup
    const colW = Math.round((W - PAD * 2) / 4);
    const lx   = PAD + Math.round((colW - SW) / 2);
    const rx   = W - PAD - colW + Math.round((colW - SW) / 2);

    // 3 slots spaced across column height, clear of HP/XP bars
    const slotZoneH = czH - 80;   // leave 80px for HP/XP at bottom
    const sTop = czY + 14;
    const sMid = czY + Math.round((slotZoneH - SH) / 2);
    const sBot = czY + slotZoneH - SH;

    _EQ_LEFT.forEach((s, i) => {
      this._drawEqSlot(c, lx, [sTop, sMid, sBot][i], SW, SH, s.slot, eq[s.slot], mkG, mkT, mkZ, ca, false);
    });
    _EQ_RIGHT.forEach((s, i) => {
      this._drawEqSlot(c, rx, [sTop, sMid, sBot][i], SW, SH, s.slot, eq[s.slot], mkG, mkT, mkZ, ca, false);
    });
  },

  _drawEqSlot(c, x, y, w, h, slot, item, mkG, mkT, mkZ, ca, small) {
    const g  = mkG();
    const r  = small ? 7 : 10;
    const cx = x + w / 2, cy = y + h / 2 - (small ? 1 : 4);

    if (item) {
      const bc = _EQ_RARITY_COLOR[item.rarity] || 0x6677aa;
      // outer glow
      const glG = mkG(); glG.fillStyle(bc, 0.2); glG.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, r + 2); c.add(glG);
      g.fillStyle(bc, 0.18); g.fillRoundedRect(x, y, w, h, r);
      g.lineStyle(2, bc, 1); g.strokeRoundedRect(x, y, w, h, r);
      c.add(g);
      // glass top highlight
      const hlG = mkG(); hlG.fillStyle(0xffffff, 0.12); hlG.fillRoundedRect(x + 2, y + 2, w - 4, Math.floor(h * 0.4), r - 1); c.add(hlG);
      ca(mkT(cx, cy, item.emoji, small ? 13 : 20)).setOrigin(0.5);
      const dG = mkG(); dG.fillStyle(bc, 1); dG.fillCircle(x + w - 5, y + h - 5, 3); c.add(dG);
    } else {
      // outer glow — matches CSS box-shadow
      const glG = mkG(); glG.fillStyle(0x4834d4, 0.14); glG.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, r + 2); c.add(glG);
      // slot body — linear-gradient(145deg, #1a1a2e, #16213e)
      g.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 0.97);
      g.fillRoundedRect(x, y, w, h, r);
      g.lineStyle(1.5, 0x4834d4, 0.65); g.strokeRoundedRect(x, y, w, h, r);
      c.add(g);
      // inset glow — rgba(72,52,212,0.3) equivalent
      const igG = mkG(); igG.fillStyle(0x4834d4, 0.18); igG.fillRoundedRect(x + 3, y + 3, w - 6, h - 6, r - 2); c.add(igG);
      // glass top highlight
      const hlG = mkG(); hlG.fillStyle(0xffffff, 0.07); hlG.fillRoundedRect(x + 2, y + 2, w - 4, Math.floor(h * 0.38), r - 1); c.add(hlG);
      // icon glow halo
      const haloG = mkG(); haloG.fillStyle(0x7c3aed, 0.1); haloG.fillCircle(cx, cy - 2, 18); c.add(haloG);
      this._drawSlotIcon(c, cx, cy, slot, mkG, ca, small);
      const dG = mkG(); dG.fillStyle(0x4834d4, 0.55); dG.fillCircle(x + w - 5, y + h - 5, 3); c.add(dG);
    }

    if (!small) {
      ca(mkT(cx, y + h - 9, _EQ_SLOT_LABELS[slot] || slot, 7, 'rgba(255,255,255,0.38)')).setOrigin(0.5);
    }

    const zone = mkZ(x + w / 2, y + h / 2, w + 4, h + 4).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => { Sound.click(); this.scene.start('Equipment', { slot }); });
    c.add(zone);
  },

  _drawSlotIcon(c, cx, cy, slot, mkG, ca, small) {
    const g = mkG();
    const s = small ? 0.65 : 1;
    switch (slot) {
      case 'weapon':
        g.lineStyle(3.5 * s, 0xb8cadf, 0.82); g.lineBetween(cx + 10 * s, cy - 13 * s, cx - 6 * s, cy + 8 * s);
        g.lineStyle(1.2 * s, 0xffffff, 0.32); g.lineBetween(cx + 9 * s, cy - 12 * s, cx - 5 * s, cy + 7 * s);
        g.lineStyle(3 * s, 0xf59e0b, 0.9); g.lineBetween(cx - 2 * s, cy - 2 * s, cx - 10 * s, cy + 6 * s);
        g.fillStyle(0xf59e0b, 1); g.fillCircle(cx - 9 * s, cy + 9 * s, 4 * s);
        g.fillStyle(0xfde68a, 0.55); g.fillCircle(cx - 8 * s, cy + 8 * s, 1.8 * s);
        break;
      case 'belt':
        g.fillStyle(0x78350f, 0.88); g.fillRoundedRect(cx - 12 * s, cy - 4 * s, 24 * s, 8 * s, 2 * s);
        g.lineStyle(1, 0xd97706, 0.8); g.strokeRoundedRect(cx - 12 * s, cy - 4 * s, 24 * s, 8 * s, 2 * s);
        g.fillStyle(0xfbbf24, 1); g.fillRoundedRect(cx - 3.5 * s, cy - 6 * s, 7 * s, 12 * s, 2 * s);
        g.fillStyle(0x92400e, 1); g.fillRoundedRect(cx - 2 * s, cy - 4 * s, 4 * s, 8 * s, 1 * s);
        g.fillStyle(0x0d0a1e, 1); g.fillRect(cx - 0.6 * s, cy - 4 * s, 1.2 * s, 8 * s);
        break;
      case 'boots':
        g.fillStyle(0x78350f, 0.9);
        g.fillRect(cx - 8 * s, cy - 13 * s, 11 * s, 15 * s);
        g.fillRect(cx - 8 * s, cy + 1 * s, 15 * s, 7 * s);
        g.fillStyle(0x1c0a03, 1); g.fillRect(cx - 9 * s, cy + 7 * s, 17 * s, 3.5 * s);
        g.fillStyle(0xd97706, 1); g.fillRect(cx - 9 * s, cy - 3 * s, 12 * s, 2.5 * s);
        g.lineStyle(1.2, 0xffffff, 0.1); g.lineBetween(cx - 5 * s, cy - 12 * s, cx - 5 * s, cy);
        break;
      case 'shield':
        g.fillStyle(0x1d4ed8, 0.9);
        g.beginPath(); g.moveTo(cx - 11 * s, cy - 12 * s); g.lineTo(cx + 11 * s, cy - 12 * s);
        g.lineTo(cx + 11 * s, cy + 1 * s); g.lineTo(cx, cy + 14 * s); g.lineTo(cx - 11 * s, cy + 1 * s);
        g.closePath(); g.fillPath();
        g.lineStyle(1.5, 0x60a5fa, 0.85);
        g.beginPath(); g.moveTo(cx - 11 * s, cy - 12 * s); g.lineTo(cx + 11 * s, cy - 12 * s);
        g.lineTo(cx + 11 * s, cy + 1 * s); g.lineTo(cx, cy + 14 * s); g.lineTo(cx - 11 * s, cy + 1 * s);
        g.closePath(); g.strokePath();
        g.lineStyle(1, 0xffffff, 0.2); g.lineBetween(cx - 11 * s, cy - 12 * s, cx - 11 * s, cy + 1 * s);
        g.fillStyle(0x7c3aed, 1); g.fillCircle(cx, cy - 2 * s, 5.5 * s);
        g.fillStyle(0xc4b5fd, 0.5); g.fillCircle(cx - 1 * s, cy - 3 * s, 2.2 * s);
        break;
      case 'armor':
        g.fillStyle(0x6b7280, 0.9);
        g.beginPath(); g.moveTo(cx - 11 * s, cy - 9 * s); g.lineTo(cx + 11 * s, cy - 9 * s);
        g.lineTo(cx + 11 * s, cy + 8 * s); g.lineTo(cx + 7 * s, cy + 12 * s);
        g.lineTo(cx - 7 * s, cy + 12 * s); g.lineTo(cx - 11 * s, cy + 8 * s);
        g.closePath(); g.fillPath();
        g.fillStyle(0xe5e7eb, 0.18); g.fillRect(cx - 9 * s, cy - 8 * s, 18 * s, 8 * s);
        g.lineStyle(1.2, 0xd1d5db, 0.75);
        g.beginPath(); g.moveTo(cx - 11 * s, cy - 9 * s); g.lineTo(cx + 11 * s, cy - 9 * s);
        g.lineTo(cx + 11 * s, cy + 8 * s); g.lineTo(cx + 7 * s, cy + 12 * s);
        g.lineTo(cx - 7 * s, cy + 12 * s); g.lineTo(cx - 11 * s, cy + 8 * s);
        g.closePath(); g.strokePath();
        g.lineStyle(1, 0xf3f4f6, 0.35); g.lineBetween(cx, cy - 9 * s, cx, cy + 12 * s);
        g.fillStyle(0x7c3aed, 0.9); g.fillEllipse(cx, cy - 1 * s, 8 * s, 7 * s);
        g.fillStyle(0xc4b5fd, 0.5); g.fillCircle(cx - 1 * s, cy - 2 * s, 2 * s);
        break;
      case 'ring1': case 'ring2': {
        const rr = 6 * s;
        g.lineStyle(3.5 * s, 0xf59e0b, 0.9); g.strokeCircle(cx, cy + 2 * s, rr);
        g.fillStyle(0x7c3aed, 1); g.fillCircle(cx, cy - rr, 4.5 * s);
        g.fillStyle(0xa855f7, 1); g.fillCircle(cx, cy - rr, 3 * s);
        g.fillStyle(0xc4b5fd, 0.55); g.fillCircle(cx - 0.8 * s, cy - rr - 0.8 * s, 1.3 * s);
        break;
      }
    }
    c.add(g);
  },

});
