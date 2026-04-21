/* ============================================================
   MenuScene — equipment: слоты экипировки на профиле
   Левая колонка: Меч / Шлем / Сапоги
   Правая колонка: Щит / Броня / Кольцо1 + Кольцо2
   ============================================================ */

const _EQ_LEFT  = [{ slot: 'weapon' }, { slot: 'belt' }, { slot: 'boots' }];
const _EQ_RIGHT = [{ slot: 'shield' }, { slot: 'armor' }, { slot: 'ring1' }];

// Inset glow color per slot type — matches icon palette
const _EQ_SLOT_GLOW = {
  weapon: { c: 0xf59e0b, a: 0.09 },
  belt:   { c: 0x6b7280, a: 0.09 },
  boots:  { c: 0x92400e, a: 0.06 },
  shield: { c: 0x3b82f6, a: 0.10 },
  armor:  { c: 0x9ca3af, a: 0.07 },
  ring1:  { c: 0xf59e0b, a: 0.09 },
};

const _EQ_SLOT_LABELS = {
  weapon: 'Оружие', belt: 'Шлем', boots: 'Сапоги',
  shield: 'Щит', armor: 'Броня', ring1: 'Кольцо', ring2: 'Кольцо',
};
const _EQ_RARITY_COLOR = { common: 0xa0aec0, rare: 0xfbbf24, epic: 0xc084fc, mythic: 0xff6b2b };

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

    // Для слота брони — используем wardrobeEquipped (косметика), а не статовый предмет
    const wardrobeEq = slot === 'armor' ? State.wardrobeEquipped : null;
    const weaponTexKey = slot === 'weapon' && item ? getWeaponTextureKey(item.item_id) : null;
    const displayRarity = wardrobeEq ? wardrobeEq.rarity : item?.rarity;
    const hasDisplay = wardrobeEq || item;

    if (hasDisplay) {
      const bc = _EQ_RARITY_COLOR[displayRarity] || 0x6677aa;
      // ambient halo — широкое мягкое свечение вокруг
      const haG = mkG(); haG.fillStyle(bc, 0.12); haG.fillRoundedRect(x - 5, y - 5, w + 10, h + 10, r + 4); c.add(haG);
      // outer glow ring — чёткое кольцо
      const glG = mkG(); glG.lineStyle(1.5, bc, 0.55); glG.strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, r + 3); c.add(glG);
      // card fill + border
      g.fillStyle(bc, 0.18); g.fillRoundedRect(x, y, w, h, r);
      g.lineStyle(2, bc, 1); g.strokeRoundedRect(x, y, w, h, r);
      c.add(g);
      // glass top highlight
      const hlG = mkG(); hlG.fillStyle(0xffffff, 0.12); hlG.fillRoundedRect(x + 2, y + 2, w - 4, Math.floor(h * 0.4), r - 1); c.add(hlG);

      // Броня: показываем реальное изображение из wardrobeEquipped
      // Оружие: показываем реальное изображение по item_id
      const imgKey = (wardrobeEq && this.textures.exists(wardrobeEq.textureKey))
        ? wardrobeEq.textureKey
        : (weaponTexKey && this.textures.exists(weaponTexKey)) ? weaponTexKey : null;
      if (imgKey) {
        const imgSize = small ? 36 : 46;
        const img = this.make.image({ x: cx, y: cy - 2, key: imgKey }, false);
        img.setDisplaySize(imgSize, imgSize);
        ca(img);
      } else {
        // Остальные слоты или fallback — emoji
        const emoji = item?.emoji || { common:'🛡', rare:'⚔️', epic:'💜', mythic:'🔥' }[displayRarity] || '🛡';
        ca(mkT(cx, cy, emoji, small ? 13 : 20)).setOrigin(0.5);
      }

      const dG = mkG(); dG.fillStyle(bc, 1); dG.fillCircle(x + w - 5, y + h - 5, 3); c.add(dG);
    } else {
      // Пустой слот — стандартный вид
      g.fillStyle(0x1c1c2e, 0.98); g.fillRoundedRect(x, y, w, h, r);
      g.lineStyle(1, 0xffffff, 0.1); g.strokeRoundedRect(x, y, w, h, r);
      c.add(g);
      const sg = _EQ_SLOT_GLOW[slot] || { c: 0x6c5ce7, a: 0.18 };
      const igG = mkG(); igG.fillStyle(sg.c, sg.a); igG.fillRoundedRect(x + 4, y + 4, w - 8, h - 8, r - 2); c.add(igG);
      const haloG = mkG(); haloG.fillStyle(sg.c, 0.05); haloG.fillCircle(cx, cy - 2, 18); c.add(haloG);
      this._drawSlotIcon(c, cx, cy, slot, mkG, ca, small);
      const dG = mkG(); dG.fillStyle(sg.c, 0.6); dG.fillCircle(x + w - 5, y + h - 5, 3); c.add(dG);
    }

    if (!small) {
      ca(mkT(cx, y + h - 9, _EQ_SLOT_LABELS[slot] || slot, 7, 'rgba(255,255,255,0.38)')).setOrigin(0.5);
    }

    const zone = mkZ(x + w / 2, y + h / 2, w + 4, h + 4).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      Sound.click();
      if (slot === 'armor') {
        this.scene.start('Stats', { player: State.player, openWardrobe: true });
      } else if (slot === 'weapon' && typeof WeaponHTML !== 'undefined') {
        WeaponHTML.open(this);
      } else {
        this.scene.start('Equipment', { slot });
      }
    });
    c.add(zone);
  },

  _drawSlotIcon(c, cx, cy, slot, mkG, ca, small) {
    const g = mkG();
    const s = small ? 0.65 : 1;
    switch (slot) {

      case 'weapon': {
        // Blade body (silver polygon)
        g.fillStyle(0xd4dce8, 0.92);
        g.beginPath();
        g.moveTo(cx + 8*s,  cy - 12*s);
        g.lineTo(cx + 12*s, cy - 8*s);
        g.lineTo(cx - 3*s,  cy + 10*s);
        g.lineTo(cx - 7*s,  cy + 10*s);
        g.closePath(); g.fillPath();
        // Shine strip
        g.fillStyle(0xffffff, 0.28);
        g.beginPath();
        g.moveTo(cx + 8*s,  cy - 11*s);
        g.lineTo(cx + 10*s, cy - 9*s);
        g.lineTo(cx - 3*s,  cy + 8*s);
        g.lineTo(cx - 4*s,  cy + 7*s);
        g.closePath(); g.fillPath();
        // Cross-guard
        g.lineStyle(4*s, 0xf59e0b, 0.95);
        g.lineBetween(cx - 7*s, cy + 4*s, cx + 4*s, cy - 5*s);
        // Handle
        g.lineStyle(3.5*s, 0x7c2d12, 1);
        g.lineBetween(cx - 5*s, cy + 6*s, cx - 8*s, cy + 12*s);
        // Pommel
        g.fillStyle(0xf59e0b, 1); g.fillCircle(cx - 9*s, cy + 13*s, 3*s);
        g.fillStyle(0xffffff, 0.5); g.fillCircle(cx - 9.5*s, cy + 12.3*s, 1.2*s);
        break;
      }

      case 'belt': {
        // Dome top
        g.fillStyle(0x6b7280, 1);
        g.fillEllipse(cx, cy - 5*s, 26*s, 18*s);
        // Gold rim band
        g.fillStyle(0xf59e0b, 1);
        g.fillRoundedRect(cx - 13*s, cy + 2*s, 26*s, 5*s, 1.5*s);
        // Dome highlight
        g.fillStyle(0xffffff, 0.12);
        g.fillEllipse(cx - 3*s, cy - 9*s, 10*s, 7*s);
        // Visor slit
        g.fillStyle(0x111827, 1);
        g.fillRoundedRect(cx - 8*s, cy - 3*s, 16*s, 3.5*s, 1*s);
        // Nose guard
        g.fillStyle(0x9ca3af, 1);
        g.fillRoundedRect(cx - 1.5*s, cy - 3*s, 3*s, 9*s, 1*s);
        // Rim shine
        g.lineStyle(0.8*s, 0xfde68a, 0.5);
        g.lineBetween(cx - 12*s, cy + 2.5*s, cx + 12*s, cy + 2.5*s);
        break;
      }

      case 'boots': {
        // Shaft
        g.fillStyle(0x7c2d12, 1);
        g.fillRoundedRect(cx - 5*s, cy - 13*s, 10*s, 16*s, 2*s);
        // Front face lighter
        g.fillStyle(0xffffff, 0.08);
        g.fillRect(cx - 5*s, cy - 12*s, 2*s, 14*s);
        // Toe/foot
        g.fillStyle(0x6b1a07, 1);
        g.fillRoundedRect(cx - 8*s, cy + 2*s, 16*s, 6*s, 2*s);
        // Sole
        g.fillStyle(0x1c0a03, 1);
        g.fillRoundedRect(cx - 9*s, cy + 7*s, 18*s, 3*s, 1.5*s);
        // Strap
        g.fillStyle(0xd97706, 1);
        g.fillRoundedRect(cx - 5*s, cy - 2*s, 10*s, 2.5*s, 1.2*s);
        // Buckle
        g.fillStyle(0xfde68a, 1);
        g.fillRoundedRect(cx + 0.5*s, cy - 3.5*s, 3.5*s, 4.5*s, 1*s);
        g.fillStyle(0x92400e, 1);
        g.fillRoundedRect(cx + 0.5*s, cy - 3*s, 2.5*s, 3.5*s, 0.6*s);
        break;
      }

      case 'shield': {
        // Shield body (heater shape)
        g.fillStyle(0x2563eb, 1);
        g.beginPath();
        g.moveTo(cx,        cy - 14*s);
        g.lineTo(cx - 12*s, cy - 8*s);
        g.lineTo(cx - 12*s, cy + 2*s);
        g.lineTo(cx,        cy + 15*s);
        g.lineTo(cx + 12*s, cy + 2*s);
        g.lineTo(cx + 12*s, cy - 8*s);
        g.closePath(); g.fillPath();
        // Rim
        g.lineStyle(1.5, 0x60a5fa, 0.85);
        g.beginPath();
        g.moveTo(cx,        cy - 14*s);
        g.lineTo(cx - 12*s, cy - 8*s);
        g.lineTo(cx - 12*s, cy + 2*s);
        g.lineTo(cx,        cy + 15*s);
        g.lineTo(cx + 12*s, cy + 2*s);
        g.lineTo(cx + 12*s, cy - 8*s);
        g.closePath(); g.strokePath();
        // Top shine
        g.lineStyle(1.2, 0xffffff, 0.25);
        g.lineBetween(cx - 8*s, cy - 10*s, cx + 8*s, cy - 10*s);
        // Star emblem
        g.fillStyle(0xbfdbfe, 0.9);
        g.beginPath();
        g.moveTo(cx,        cy - 7.25*s);
        g.lineTo(cx + 1.5*s, cy - 2.75*s);
        g.lineTo(cx + 6*s,   cy - 2.75*s);
        g.lineTo(cx + 2.5*s, cy + 0.25*s);
        g.lineTo(cx + 3.5*s, cy + 4.75*s);
        g.lineTo(cx,         cy + 2.25*s);
        g.lineTo(cx - 3.5*s, cy + 4.75*s);
        g.lineTo(cx - 2.5*s, cy + 0.25*s);
        g.lineTo(cx - 6*s,   cy - 2.75*s);
        g.lineTo(cx - 1.5*s, cy - 2.75*s);
        g.closePath(); g.fillPath();
        // Star inner highlight
        g.fillStyle(0xffffff, 0.45);
        g.beginPath();
        g.moveTo(cx,        cy - 5.5*s);
        g.lineTo(cx + 1*s,   cy - 2.5*s);
        g.lineTo(cx + 4*s,   cy - 2.5*s);
        g.lineTo(cx + 1.8*s, cy - 0.7*s);
        g.lineTo(cx + 2.5*s, cy + 2.3*s);
        g.lineTo(cx,         cy + 0.8*s);
        g.lineTo(cx - 2.5*s, cy + 2.3*s);
        g.lineTo(cx - 1.8*s, cy - 0.7*s);
        g.lineTo(cx - 4*s,   cy - 2.5*s);
        g.lineTo(cx - 1*s,   cy - 2.5*s);
        g.closePath(); g.fillPath();
        break;
      }

      case 'armor': {
        // Shoulders
        g.fillStyle(0xc0c8d4, 0.9);
        g.fillEllipse(cx - 9*s, cy - 5*s, 10*s, 8*s);
        g.fillEllipse(cx + 9*s, cy - 5*s, 10*s, 8*s);
        g.lineStyle(1, 0xffffff, 0.4);
        g.lineBetween(cx - 13*s, cy - 7*s, cx - 7*s, cy - 7*s);
        g.lineBetween(cx + 7*s,  cy - 7*s, cx + 13*s, cy - 7*s);
        // Chest body
        g.fillStyle(0xc0c8d4, 0.9);
        g.beginPath();
        g.moveTo(cx - 7*s, cy - 7*s);
        g.lineTo(cx + 7*s, cy - 7*s);
        g.lineTo(cx + 7*s, cy + 10*s);
        g.lineTo(cx + 5*s, cy + 12*s);
        g.lineTo(cx - 5*s, cy + 12*s);
        g.lineTo(cx - 7*s, cy + 10*s);
        g.closePath(); g.fillPath();
        // Center ridge
        g.fillStyle(0xffffff, 0.15);
        g.fillRect(cx - 1*s, cy - 7*s, 2*s, 19*s);
        // Pec lines
        g.lineStyle(1.2, 0xffffff, 0.2);
        g.lineBetween(cx - 7*s, cy - 2*s, cx - 1*s, cy - 3*s);
        g.lineBetween(cx + 7*s, cy - 2*s, cx + 1*s, cy - 3*s);
        // Belly plates
        g.lineStyle(1.5, 0x000000, 0.3);
        g.lineBetween(cx - 6*s, cy + 4*s,  cx + 6*s, cy + 4*s);
        g.lineStyle(1.2, 0x000000, 0.22);
        g.lineBetween(cx - 6*s, cy + 8*s,  cx + 6*s, cy + 8*s);
        // Purple gem
        g.fillStyle(0x9333ea, 1); g.fillCircle(cx, cy - 0.5*s, 3*s);
        g.fillStyle(0xffffff, 0.5); g.fillCircle(cx - 0.8*s, cy - 1.3*s, 1.2*s);
        // Top shine
        g.lineStyle(1, 0xffffff, 0.22);
        g.lineBetween(cx - 6*s, cy - 6*s, cx + 6*s, cy - 6*s);
        break;
      }

      case 'ring1': case 'ring2': {
        // Gold band ellipse
        g.lineStyle(3.5*s, 0xfbbf24, 0.9);
        g.strokeEllipse(cx, cy + 5*s, 16*s, 12*s);
        // Inner shadow
        g.lineStyle(1*s, 0x000000, 0.35);
        g.strokeEllipse(cx, cy + 5*s, 12*s, 8.4*s);
        // Band top shine
        g.lineStyle(1, 0xffffff, 0.4);
        g.lineBetween(cx - 5*s, cy + 2*s, cx + 5*s, cy + 2*s);
        // Gem setting (amber star base)
        g.fillStyle(0xb45309, 1);
        g.beginPath();
        g.moveTo(cx,        cy - 11*s);
        g.lineTo(cx + 3*s,  cy - 6*s);
        g.lineTo(cx + 7*s,  cy - 6*s);
        g.lineTo(cx + 4*s,  cy - 2*s);
        g.lineTo(cx + 5*s,  cy + 3*s);
        g.lineTo(cx,        cy + 0);
        g.lineTo(cx - 5*s,  cy + 3*s);
        g.lineTo(cx - 4*s,  cy - 2*s);
        g.lineTo(cx - 7*s,  cy - 6*s);
        g.lineTo(cx - 3*s,  cy - 6*s);
        g.closePath(); g.fillPath();
        // Gem (red faceted)
        g.fillStyle(0xfb7185, 0.9);
        g.beginPath();
        g.moveTo(cx,        cy - 10*s);
        g.lineTo(cx + 2.5*s, cy - 6*s);
        g.lineTo(cx + 6*s,   cy - 6*s);
        g.lineTo(cx + 3.5*s, cy - 3*s);
        g.lineTo(cx + 4.5*s, cy + 1*s);
        g.lineTo(cx,         cy - 1.5*s);
        g.lineTo(cx - 4.5*s, cy + 1*s);
        g.lineTo(cx - 3.5*s, cy - 3*s);
        g.lineTo(cx - 6*s,   cy - 6*s);
        g.lineTo(cx - 2.5*s, cy - 6*s);
        g.closePath(); g.fillPath();
        // Facet lines
        g.lineStyle(0.7, 0xff9da8, 0.4);
        g.lineBetween(cx, cy - 10*s, cx, cy - 1.5*s);
        g.lineBetween(cx - 6*s, cy - 6*s, cx + 6*s, cy - 6*s);
        // Gem highlight
        g.fillStyle(0xffffff, 0.6);
        g.fillEllipse(cx - 1.5*s, cy - 7.5*s, 3*s, 2*s);
        break;
      }
    }
    c.add(g);
  },

});
