/* ============================================================
   MenuScene — equipment: слоты экипировки на профиле
   Левая колонка:  Голова / Тело / Ноги
   Правая колонка: Оружие / Щит / Кольцо
   ============================================================ */

const _EQ_LEFT  = [{ slot: 'belt' }, { slot: 'armor' }, { slot: 'boots' }];
const _EQ_RIGHT = [{ slot: 'weapon' }, { slot: 'shield' }, { slot: 'ring1' }];

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
  weapon: 'ОРУЖИЕ', belt: 'ГОЛОВА', boots: 'НОГИ',
  shield: 'ЩИТ',    armor: 'ТЕЛО',  ring1: 'КОЛЬЦО', ring2: 'КОЛЬЦО',
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
    const cx = x + w / 2, cy = y + h / 2 - (small ? 1 : 4);

    // Для слота брони — используем wardrobeEquipped (косметика), а не статовый предмет
    const wardrobeEq = slot === 'armor' ? State.wardrobeEquipped : null;
    // Фолбэк по rarity: если item_id отсутствует в карте текстур (legacy/новые ID) —
    // показываем PNG нужного тира, а не emoji. Решает "пропадание скина" в профиле.
    const _rar = item?.rarity;
    const weaponTexKey = slot === 'weapon' && item ? (getWeaponTextureKey(item.item_id) || getWeaponTextureKeyByRarity(_rar)) : null;
    const helmetTexKey = slot === 'belt'   && item ? (getHelmetTextureKey(item.item_id) || getHelmetTextureKeyByRarity(_rar)) : null;
    const bootsTexKey  = slot === 'boots'  && item ? (getBootsTextureKey(item.item_id)  || getBootsTextureKeyByRarity(_rar))  : null;
    const shieldTexKey = slot === 'shield' && item ? (getShieldTextureKey(item.item_id) || getShieldTextureKeyByRarity(_rar)) : null;
    const ringTexKey   = (slot === 'ring1' || slot === 'ring2') && item ? (getRingTextureKey(item.item_id) || getRingTextureKeyByRarity(_rar)) : null;
    // Для слота брони: если косметика не надета — показываем статовую броню по rarity (PNG, не emoji)
    const armorTexKey  = slot === 'armor' && !wardrobeEq && item ? getArmorTextureKey(_rar) : null;
    const displayRarity = wardrobeEq ? wardrobeEq.rarity : item?.rarity;
    const hasDisplay = wardrobeEq || item;

    if (hasDisplay) {
      const bc = _EQ_RARITY_COLOR[displayRarity] || 0x6677aa;
      // Подсветки временно убраны: нет пятна света и нет glow.
      // bc держим только на случай если понадобится для значков.

      // Броня: wardrobeEquipped (косметика) → armor-по-rarity → PNG из карты по слоту
      const rawKey = (wardrobeEq && this.textures.exists(wardrobeEq.textureKey))
        ? wardrobeEq.textureKey
        : (armorTexKey  && this.textures.exists(armorTexKey))  ? armorTexKey
        : (weaponTexKey && this.textures.exists(weaponTexKey)) ? weaponTexKey
        : (helmetTexKey && this.textures.exists(helmetTexKey)) ? helmetTexKey
        : (bootsTexKey  && this.textures.exists(bootsTexKey))  ? bootsTexKey
        : (shieldTexKey && this.textures.exists(shieldTexKey)) ? shieldTexKey
        : (ringTexKey   && this.textures.exists(ringTexKey))   ? ringTexKey
        : null;
      // Чистка тёмного фона у скинов один раз через canvas. Сейчас триггерится
      // только если у PNG 2+ тёмных непрозрачных угла — для PNG с прозрачными
      // углами (большинство наших) это NO-OP, для JPG-сапог реально чистит.
      const imgKey = rawKey && typeof cleanEquipmentTexture === 'function'
        ? cleanEquipmentTexture(this, rawKey) : rawKey;
      if (imgKey) {
        // 1) Ambient — мягкое цветное пятно под иконкой ("предмет подсвечивает
        //    поверхность"). Без круга — это размытое подсветка у нижней грани.
        this._drawSlotHalo(c, cx, cy, slot, mkG, bc);
        const imgSize = small ? 38 : 50;
        // Считаем aspect-fit размеры один раз — для ауры и иконки.
        let dispW = imgSize, dispH = imgSize;
        try {
          const tex = this.textures.get(imgKey);
          const src = tex?.getSourceImage?.();
          if (src) {
            const sw = src.width || imgSize, sh = src.height || imgSize;
            const sc = Math.min(imgSize / sw, imgSize / sh);
            dispW = Math.round(sw * sc); dispH = Math.round(sh * sc);
          }
        } catch(_) {}
        // 2) Aura — "сияние силуэта": та же иконка, цветом редкости (tintFill),
        //    масштаб +18%, alpha с лёгким pulse 1.6с. Делает предмет металлически
        //    "живым" — никакой геометрии-рамки, светится сама сталь.
        try {
          const aura = this.make.image({ x: cx, y: cy - 2, key: imgKey }, false);
          aura.setDisplaySize(Math.round(dispW * 1.18), Math.round(dispH * 1.18));
          aura.setTintFill(bc);
          aura.setAlpha(0.40);
          ca(aura);
          // Стаггер по слоту — чтобы все 6 ауры не пульсировали в унисон
          this.tweens.add({
            targets: aura, alpha: 0.62, duration: 1500,
            ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
            delay: Math.floor(Math.random() * 1800),
          });
        } catch(_) {}
        // 3) Main icon — поверх ауры, в пропорции (без сжатия в квадрат).
        const img = this.make.image({ x: cx, y: cy - 2, key: imgKey }, false);
        img.setDisplaySize(dispW, dispH);
        // preFX-glow ОТКЛЮЧЁН для всех слотов: на Android Telegram WebView
        // комбинация PNG + preFX.addGlow стабильно роняет рендер случайного
        // спрайта в "белый квадрат". Tinted-aura через обычный sprite — safe.
        ca(img);
      } else {
        // PNG ещё не пришёл (lazy-загрузка). Halo + векторный значок
        // защищает от регрессии, когда картинка не пришла на медленной сети.
        this._drawSlotHalo(c, cx, cy, slot, mkG);
        this._drawSlotIcon(c, cx, cy, slot, mkG, ca, small);
        // Мягкий pulse (0.65↔1.0) — коммуницирует «идёт загрузка»,
        // без него переход emoji→PNG читался как «глитч».
        const iconG = c.list[c.list.length - 1];
        if (iconG && this.tweens) {
          try {
            this.tweens.add({ targets: iconG, alpha: 0.65, duration: 1100,
              yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          } catch(_) {}
        }
      }

      // Точка-индикатор удалена вместе с подложкой — без квадрата
      // ей не за что держаться, и редкость уже видна по цвету ауры.
    } else {
      // Пустой слот — векторный значок + мягкий halo под ним.
      // Без halo слот сливался с тёмным фоном профиля и читался как
      // "белый пустой квадрат" (баг "Голова не показывает иконку").
      // Halo не образует рамку — это просто свет под значком.
      this._drawSlotHalo(c, cx, cy, slot, mkG);
      this._drawSlotIcon(c, cx, cy, slot, mkG, ca, small);
    }

    if (!small) {
      ca(mkT(cx, y + h - 9, _EQ_SLOT_LABELS[slot] || slot, 9, 'rgba(210,215,235,0.9)', true)).setOrigin(0.5);
    }

    const zone = mkZ(x + w / 2, y + h / 2, w + 4, h + 4).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      Sound.click();
      if (slot === 'armor') {
        this.scene.start('Stats', { player: State.player, openWardrobe: true });
      } else if (slot === 'weapon' && typeof WeaponHTML !== 'undefined') {
        WeaponHTML.open(this);
      } else if (slot === 'belt' && typeof HelmetHTML !== 'undefined') {
        HelmetHTML.open(this);
      } else if (slot === 'boots' && typeof BootsHTML !== 'undefined') {
        BootsHTML.open(this);
      } else if (slot === 'shield' && typeof ShieldHTML !== 'undefined') {
        ShieldHTML.open(this);
      } else if ((slot === 'ring1' || slot === 'ring2') && typeof RingHTML !== 'undefined') {
        RingHTML.open(this);
      } else {
        this.scene.start('Equipment', { slot });
      }
    });
    c.add(zone);
  },

  // Мягкий тройной halo под иконкой слота — якорит её визуально, не
  // образуя "рамки". Используется и в пустом слоте, и под filled-иконкой,
  // и при fallback на векторный значок (race с lazy-загрузкой).
  // colorOverride — для filled-слотов передаём цвет редкости предмета,
  // чтобы halo подсвечивал, кто там надет (mythic/epic/rare).
  _drawSlotHalo(c, cx, cy, slot, mkG, colorOverride) {
    const sg = _EQ_SLOT_GLOW[slot] || { c: 0x6c5ce7, a: 0.18 };
    const col = (typeof colorOverride === 'number') ? colorOverride : sg.c;
    const g = mkG();
    // Ambient floor light — "предмет подсвечивает поверхность под собой".
    // Это НЕ круг и НЕ рамка — размытое цветное пятно у нижней грани иконки.
    // Силуэт-аура (свечение самой стали) делается отдельно в _drawEqSlot
    // через tintFill-копию иконки.
    g.fillStyle(col, 0.22); g.fillEllipse(cx, cy + 22, 32, 6);
    g.fillStyle(col, 0.10); g.fillEllipse(cx, cy + 22, 50, 9);
    c.add(g);
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
