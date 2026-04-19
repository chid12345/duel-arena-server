/* ═══════════════════════════════════════════════════════════
   ShopScene ext2 — _buildStarsPanel, _buildSpecialPanel
   Game Cards дизайн (v4): header с rarity badge, body, footer с ценой
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  /* ── Общие карточные хелперы (Game Cards стиль) ─────── */
  _gcColors() {
    return {
      bg:     0x0a1628, bgCard: 0x1a3060, border: 0x2a4a8a,
      gold:   0xffc040, orange: 0xff8020,
      cyan:   0x3cc8dc, purple: 0x8a5aff, red: 0xff4444,
      hdrEpic: 0x5a1aaa, hdrRare: 0x1a4a8a, hdrLeg: 0x6a4a10,
      hdrPrem: 0x3a1a7a, hdrDanger: 0x5a1818,
      footBg: 0x050e1a,
    };
  },

  /** Рисует "карточку" с header/body/footer */
  _gcCard(c, x, y, w, h, hdrColor, borderColor, opts = {}) {
    const gc = this._gcColors();
    const bg = this.add.graphics();
    const hdrH = opts.hdrH || 20;
    // Body
    bg.fillStyle(gc.bgCard, 0.7); bg.fillRect(x, y + hdrH, w, h - hdrH - 22);
    // Header
    bg.fillStyle(hdrColor, 0.95); bg.fillRect(x, y, w, hdrH);
    bg.lineStyle(1, borderColor, 0.5); bg.strokeRect(x, y, w, hdrH);
    // Footer
    bg.fillStyle(gc.footBg, 0.8); bg.fillRect(x, y + h - 22, w, 22);
    // Border
    bg.lineStyle(1.5, borderColor, 0.6); bg.strokeRect(x, y, w, h);
    c.add(bg);
    return bg;
  },

  /** Бейдж редкости */
  _gcBadge(c, x, y, label, bgColor) {
    const g = this.add.graphics();
    const tw = label.length * 5 + 8;
    g.fillStyle(bgColor, 1); g.fillRoundedRect(x, y, tw, 13, 3);
    c.add(g);
    c.add(txt(this, x + tw / 2, y + 2, label, 7, '#fff', true).setOrigin(0.5, 0));
  },

  /** Кнопка цены */
  _gcPriceBtn(c, x, y, w, label, colors) {
    const g = this.add.graphics();
    g.fillStyle(colors.bg, 1); g.fillRoundedRect(x, y, w, 16, 4);
    c.add(g);
    c.add(txt(this, x + w / 2, y + 2, label, 10, colors.text, true).setOrigin(0.5, 0));
  },

  /** Заголовок секции */
  _gcSection(c, y, W, icon, title) {
    const gc = this._gcColors();
    const bg = this.add.graphics();
    bg.fillStyle(gc.border, 0.15); bg.fillRect(0, y, W, 22);
    bg.lineStyle(0.5, gc.border, 0.4);
    bg.strokeRect(0, y, W, 22);
    c.add(bg);
    c.add(txt(this, W / 2, y + 5, `${icon}  ${title}`, 11, '#ffffff', true).setOrigin(0.5, 0));
    return y + 28;
  },

  /* ═════════════════════════════════════════════════════
     Вкладка "⭐ Звёзды" — Game Cards + все товары
     ═════════════════════════════════════════════════════ */
  async _buildStarsPanel(W, H) {
    const gen = this._gen;
    let d;
    try { d = await get('/api/shop/packages'); }
    catch(_) { if (this.scene?.isActive('Shop')) txt(this, W/2, H/2, '❌ Нет соединения', 13, '#dc3c46').setOrigin(0.5); return; }
    if (gen !== this._gen || !this.scene?.isActive('Shop') || this._tab !== 'stars') return;
    const gc = this._gcColors();
    const starsPkgs = d.stars || [];
    const scrollPkgs = d.stars_scrolls || [];
    const p = State.player;
    const pkgMain = starsPkgs.filter(pkg => pkg.id !== 'premium');
    const premPkg = starsPkgs.find(pkg => pkg.id === 'premium');
    const taps = [];
    const startY = 162;
    const { container, setContentH } = this._makeScrollZone(W, H, startY, {
      onTap: (relY, relX) => {
        for (const t of taps) {
          if (relY >= t.y && relY < t.y + t.h && relX >= t.x && relX < t.x + t.w) { t.fn(); return; }
        }
      },
    });
    let y = 0;

    // Premium badge
    if (p?.is_premium) {
      const sb = this.add.graphics();
      sb.fillStyle(gc.hdrPrem, 0.9); sb.fillRoundedRect(8, y, W - 16, 28, 6);
      sb.lineStyle(1, gc.purple, 0.5); sb.strokeRoundedRect(8, y, W - 16, 28, 6);
      container.add(sb);
      container.add(txt(this, 16, y + 7, '👑 Premium активен', 11, '#c8a0ff', true));
      container.add(txt(this, W - 14, y + 7, `ещё ${p.premium_days_left} дн.`, 10, '#bbbbdd').setOrigin(1, 0));
      y += 34;
    }

    // ── Premium (первым — главный продукт) ──
    if (premPkg) {
      y = this._gcSection(container, y, W, '👑', 'PREMIUM');
      this._gcCard(container, 8, y, W - 16, 72, gc.hdrPrem, gc.purple);
      this._gcBadge(container, 12, y + 3, 'VIP', gc.purple);
      container.add(txt(this, 40, y + 26, '👑', 18));
      container.add(txt(this, 60, y + 24, 'Premium подписка', 12, '#c8a0ff', true));
      container.add(txt(this, 60, y + 38, '+15% XP · ящик · скидки · значок', 9, '#a888dd'));
      const isPrem = !!(State.player || {}).is_premium;
      const prLabel = isPrem ? '✅ Активен' : `⭐ ${premPkg.stars}`;
      this._gcPriceBtn(container, W - 80, y + 52, 66, prLabel, { bg: isPrem ? 0x4a2a8a : gc.purple, text: '#fff' });
      container.add(txt(this, 12, y + 54, '21 день', 9, '#7755aa'));
      taps.push({ x: 8, y, w: W - 16, h: 72, fn: () => {
        showItemDetailPopup(this, {
          icon: '👑', name: 'Premium подписка',
          desc: '⚔️ +15% XP за каждый бой\n📦 Бесплатный ящик каждый день\n🏷️ Скидки в магазине\n👑 Значок Premium у имени',
          actionLabel: isPrem ? '✅ Уже активен' : `⭐ ${premPkg.stars} — Купить`,
          canAct: !isPrem,
          actionFn: () => { closeItemDetailPopup(this); if (!isPrem) this._buyStars(premPkg); },
        });
      }});
      y += 80;
    }

    // ── Ящики ──
    const onlyBoxes = scrollPkgs.filter(p => (p.scroll_id || '').startsWith('box_'));
    if (onlyBoxes.length > 0) {
      y = this._gcSection(container, y, W, '🎲', 'ЭПИЧЕСКИЕ ЯЩИКИ');
      const iw = (W - 24) / 2;
      onlyBoxes.forEach((pkg, i) => {
        const col = i % 2, ix = 8 + col * (iw + 8), iy = y;
        this._gcCard(container, ix, iy, iw, 82, gc.hdrEpic, gc.purple);
        this._gcBadge(container, ix + 4, iy + 3, 'EPIC', gc.purple);
        container.add(txt(this, ix + iw / 2, iy + 30, pkg.label.replace(/^[^\s]+\s/, ''), 10, '#fff', true).setOrigin(0.5).setWordWrapWidth(iw - 8));
        this._gcPriceBtn(container, ix + (iw - 60) / 2, iy + 60, 60, `⭐ ${pkg.stars}`, { bg: gc.orange, text: '#1a0a00' });
        taps.push({ x: ix, y: iy, w: iw, h: 82, fn: () => {
          showItemDetailPopup(this, {
            icon: '🎲', name: pkg.label,
            desc: 'Эпический ящик с множеством наград.\nВнутри: USDT-свитки, алмазные свитки, шанс на Титана и Premium.\n\nДобавляется в инвентарь → Особые.',
            actionLabel: `⭐ ${pkg.stars} — Купить`, canAct: true,
            actionFn: () => { closeItemDetailPopup(this); this._buyStars(pkg); },
          });
        }});
        if (col === 1 || i === onlyBoxes.length - 1) y += 90;
      });
    }

    // ── Свитки ──
    const onlyScrolls = scrollPkgs.filter(p => !(p.scroll_id || '').startsWith('box_'));
    const titanPkg = onlyScrolls.find(p => p.id === 'ss_titan');
    const normalScrolls = onlyScrolls.filter(p => p.id !== 'ss_titan');
    if (onlyScrolls.length > 0) {
      y = this._gcSection(container, y, W, '📜', 'БОЕВЫЕ СВИТКИ');
      const iw = (W - 24) / 2;
      normalScrolls.forEach((pkg, i) => {
        const col = i % 2, ix = 8 + col * (iw + 8), iy = y + Math.floor(i / 2) * 72;
        this._gcCard(container, ix, iy, iw, 66, gc.hdrRare, gc.cyan);
        this._gcBadge(container, ix + 4, iy + 3, 'RARE', 0x3a8aff);
        container.add(txt(this, ix + iw / 2, iy + 28, pkg.label.replace(/^[^\s]+\s/, ''), 9, '#fff', true).setOrigin(0.5).setWordWrapWidth(iw - 8));
        this._gcPriceBtn(container, ix + (iw - 54) / 2, iy + 46, 54, `⭐ ${pkg.stars}`, { bg: gc.orange, text: '#1a0a00' });
        taps.push({ x: ix, y: iy, w: iw, h: 66, fn: () => {
          showItemDetailPopup(this, {
            icon: '📜', name: pkg.label,
            desc: 'Мощный боевой свиток.\nДаёт прирост статов на несколько боёв.\n\nДобавляется в инвентарь → Особые.',
            actionLabel: `⭐ ${pkg.stars} — Купить`, canAct: true,
            actionFn: () => { closeItemDetailPopup(this); this._buyStars(pkg); },
          });
        }});
      });
      y += Math.ceil(normalScrolls.length / 2) * 72 + 4;

      // Титан — отдельная карточка LEGENDARY
      if (titanPkg) {
        this._gcCard(container, 8, y, W - 16, 72, gc.hdrLeg, gc.gold);
        this._gcBadge(container, 12, y + 3, 'LEGENDARY', gc.orange);
        container.add(txt(this, W / 2, y + 30, '🏔️ СВИТОК ТИТАНА', 12, '#ffd060', true).setOrigin(0.5));
        container.add(txt(this, W / 2, y + 44, '3 боя · все статы +15', 9, '#aa8844').setOrigin(0.5));
        this._gcPriceBtn(container, (W - 70) / 2, y + 54, 70, `⭐ ${titanPkg.stars}`, { bg: gc.orange, text: '#1a0a00' });
        taps.push({ x: 8, y, w: W - 16, h: 72, fn: () => {
          showItemDetailPopup(this, {
            icon: '🏔️', name: 'Свиток Титана',
            desc: 'Легендарный свиток!\nСила, Ловкость, Интуиция, Выносливость +15 на 3 боя.\n\nДобавляется в инвентарь → Особые.',
            actionLabel: `⭐ ${titanPkg.stars} — Купить`, canAct: true,
            actionFn: () => { closeItemDetailPopup(this); this._buyStars(titanPkg); },
          });
        }});
        y += 80;
      }
    }

    // ── Алмазы ──
    y = this._gcSection(container, y, W, '💎', 'АЛМАЗЫ');
    const pkgW = (W - 32) / Math.max(1, pkgMain.length);
    pkgMain.forEach((pkg, i) => {
      const px = 8 + i * (pkgW + 4);
      this._gcCard(container, px, y, pkgW - 2, 68, gc.hdrRare, gc.cyan);
      container.add(txt(this, px + (pkgW - 2) / 2, y + 28, `💎 ${pkg.diamonds}`, 13, '#f0f0fa', true).setOrigin(0.5));
      this._gcPriceBtn(container, px + ((pkgW - 2) - 54) / 2, y + 48, 54, `⭐ ${pkg.stars}`, { bg: gc.orange, text: '#1a0a00' });
      taps.push({ x: px, y, w: pkgW - 2, h: 68, fn: () => {
        showItemDetailPopup(this, {
          icon: '💎', name: `${pkg.diamonds} алмазов`,
          desc: `Мгновенное начисление ${pkg.diamonds} алмазов на ваш счёт.\n\nАлмазы — премиальная валюта для покупки свитков, ящиков и особых предметов.`,
          actionLabel: `⭐ ${pkg.stars} — Купить`, canAct: true,
          actionFn: () => { closeItemDetailPopup(this); this._buyStars(pkg); },
        });
      }});
    });
    y += 78;

    container.add(txt(this, W / 2, y, '⭐ Telegram Stars — моментальная оплата', 10, '#5577aa').setOrigin(0.5));
    y += 20;
    setContentH(y + 10);
  },

  /* ═════════════════════════════════════════════════════
     Вкладка "💵 Купить" (USDT) — Game Cards стиль
     ═════════════════════════════════════════════════════ */
  async _buildSpecialPanel(W, H) {
    const gen = this._gen;
    let d;
    try { d = await get('/api/shop/packages'); }
    catch(_) { if (this.scene?.isActive('Shop')) txt(this, W/2, H/2, '❌ Нет соединения', 13, '#dc3c46').setOrigin(0.5); return; }
    if (gen !== this._gen || !this.scene?.isActive('Shop') || this._tab !== 'special') return;
    const gc = this._gcColors();
    const cryptoPkgs = d.crypto || [];
    const scrollPkgs = d.usdt_scrolls || [];
    const cryptoOn   = d.cryptopay_enabled;
    const p = State.player;
    const startY = 162;

    if (!cryptoOn) {
      let y = startY;
      if (p?.is_premium) y += 40;
      const cg = this.add.graphics();
      cg.fillStyle(gc.bgCard, 0.6); cg.fillRoundedRect(8, y, W - 16, 56, 10);
      txt(this, W / 2, y + 18, '⚙️ CryptoPay не подключён', 11, '#ccccdd').setOrigin(0.5);
      txt(this, W / 2, y + 36, 'Нужна переменная CRYPTOPAY_TOKEN', 11, '#ddddff').setOrigin(0.5);
      return;
    }

    const taps = [];
    const { container, setContentH } = this._makeScrollZone(W, H, startY, {
      onTap: (relY, relX) => {
        for (const t of taps) {
          if (relY >= t.y && relY < t.y + t.h && relX >= t.x && relX < t.x + t.w) { t.fn(); return; }
        }
      },
    });
    let y = 0;

    // Premium badge
    if (p?.is_premium) {
      const sb = this.add.graphics();
      sb.fillStyle(gc.hdrPrem, 0.9); sb.fillRoundedRect(8, y, W - 16, 28, 6);
      sb.lineStyle(1, gc.purple, 0.5); sb.strokeRoundedRect(8, y, W - 16, 28, 6);
      container.add(sb);
      container.add(txt(this, 16, y + 7, '👑 Premium активен', 11, '#c8a0ff', true));
      container.add(txt(this, W - 14, y + 7, `ещё ${p.premium_days_left} дн.`, 10, '#bbbbdd').setOrigin(1, 0));
      y += 34;
    }

    const onlyScrolls = scrollPkgs.filter(p => !(p.scroll_id || '').startsWith('box_'));
    const onlyBoxes   = scrollPkgs.filter(p => (p.scroll_id || '').startsWith('box_'));
    const iw = (W - 24) / 2;

    // ── Premium (первым — главный продукт) ──
    const cpPrem = cryptoPkgs.find(pkg => pkg.premium);
    if (cpPrem) {
      y = this._gcSection(container, y, W, '👑', 'PREMIUM');
      this._gcCard(container, 8, y, W - 16, 72, gc.hdrPrem, gc.purple);
      this._gcBadge(container, 12, y + 3, 'VIP', gc.purple);
      container.add(txt(this, 40, y + 26, '👑', 18));
      container.add(txt(this, 60, y + 24, 'Premium подписка', 12, '#c8a0ff', true));
      container.add(txt(this, 60, y + 38, '+15% XP · ящик · скидки · значок', 9, '#a888dd'));
      const isPremC = !!(State.player || {}).is_premium;
      const prLabelC = isPremC ? '✅ Активен' : `${cpPrem.usdt} USDT`;
      this._gcPriceBtn(container, W - 86, y + 52, 72, prLabelC, { bg: isPremC ? 0x4a2a8a : gc.purple, text: '#fff' });
      container.add(txt(this, 12, y + 54, '21 день', 9, '#7755aa'));
      taps.push({ x: 8, y, w: W - 16, h: 72, fn: () => {
        showItemDetailPopup(this, {
          icon: '👑', name: 'Premium подписка',
          desc: '⚔️ +15% XP за каждый бой\n📦 Бесплатный ящик каждый день\n🏷️ Скидки в магазине\n👑 Значок Premium у имени',
          actionLabel: isPremC ? '✅ Уже активен' : `${cpPrem.usdt} USDT — Купить`,
          canAct: !isPremC,
          actionFn: () => { closeItemDetailPopup(this); if (!isPremC) this._buyCrypto(cpPrem); },
        });
      }});
      y += 80;
    }

    // ── Ящики ──
    if (onlyBoxes.length > 0) {
      y = this._gcSection(container, y, W, '🎲', 'ЭПИЧЕСКИЕ ЯЩИКИ');
      onlyBoxes.forEach((pkg, i) => {
        const col = i % 2, ix = 8 + col * (iw + 8), iy = y;
        this._gcCard(container, ix, iy, iw, 82, gc.hdrEpic, gc.purple);
        this._gcBadge(container, ix + 4, iy + 3, 'EPIC', gc.purple);
        container.add(txt(this, ix + iw / 2, iy + 30, pkg.label.replace(/^[^\s]+\s/, ''), 10, '#fff', true).setOrigin(0.5).setWordWrapWidth(iw - 8));
        this._gcPriceBtn(container, ix + (iw - 60) / 2, iy + 60, 60, `${pkg.usdt} USDT`, { bg: gc.orange, text: '#1a0a00' });
        taps.push({ x: ix, y: iy, w: iw, h: 82, fn: () => {
          showItemDetailPopup(this, {
            icon: '🎲', name: pkg.label,
            desc: 'Эпический ящик с множеством наград.\nВнутри: USDT-свитки, алмазные свитки, шанс на Титана и Premium.\n\nДобавляется в инвентарь → Особые.',
            actionLabel: `${pkg.usdt} USDT — Купить`, canAct: true,
            actionFn: () => { closeItemDetailPopup(this); this._buyCrypto(pkg); },
          });
        }});
        if (col === 1 || i === onlyBoxes.length - 1) y += 90;
      });
    }

    // ── Свитки ──
    const titanUPkg = onlyScrolls.find(p => p.id === 'us_titan');
    const normalUScrolls = onlyScrolls.filter(p => p.id !== 'us_titan');
    if (onlyScrolls.length > 0) {
      y = this._gcSection(container, y, W, '📜', 'БОЕВЫЕ СВИТКИ');
      normalUScrolls.forEach((pkg, i) => {
        const col = i % 2, ix = 8 + col * (iw + 8), iy = y + Math.floor(i / 2) * 72;
        this._gcCard(container, ix, iy, iw, 66, gc.hdrRare, gc.cyan);
        this._gcBadge(container, ix + 4, iy + 3, 'RARE', 0x3a8aff);
        container.add(txt(this, ix + iw / 2, iy + 28, pkg.label.replace(/^[^\s]+\s/, ''), 9, '#fff', true).setOrigin(0.5).setWordWrapWidth(iw - 8));
        this._gcPriceBtn(container, ix + (iw - 60) / 2, iy + 46, 60, `${pkg.usdt} USDT`, { bg: gc.orange, text: '#1a0a00' });
        taps.push({ x: ix, y: iy, w: iw, h: 66, fn: () => {
          showItemDetailPopup(this, {
            icon: '📜', name: pkg.label,
            desc: 'Мощный боевой свиток USDT-класса.\nДаёт значительный прирост статов на несколько боёв.\n\nДобавляется в инвентарь → Особые.',
            actionLabel: `${pkg.usdt} USDT — Купить`, canAct: true,
            actionFn: () => { closeItemDetailPopup(this); this._buyCrypto(pkg); },
          });
        }});
      });
      y += Math.ceil(normalUScrolls.length / 2) * 72 + 4;

      // Титан
      if (titanUPkg) {
        this._gcCard(container, 8, y, W - 16, 72, gc.hdrLeg, gc.gold);
        this._gcBadge(container, 12, y + 3, 'LEGENDARY', gc.orange);
        container.add(txt(this, W / 2, y + 30, '🏔️ СВИТОК ТИТАНА', 12, '#ffd060', true).setOrigin(0.5));
        container.add(txt(this, W / 2, y + 44, '3 боя · все статы +15', 9, '#aa8844').setOrigin(0.5));
        this._gcPriceBtn(container, (W - 70) / 2, y + 54, 70, `${titanUPkg.usdt} USDT`, { bg: gc.orange, text: '#1a0a00' });
        taps.push({ x: 8, y, w: W - 16, h: 72, fn: () => {
          showItemDetailPopup(this, {
            icon: '🏔️', name: 'Свиток Титана',
            desc: 'Легендарный свиток!\nСила, Ловкость, Интуиция, Выносливость +15 на 3 боя.\n\nДобавляется в инвентарь → Особые.',
            actionLabel: `${titanUPkg.usdt} USDT — Купить`, canAct: true,
            actionFn: () => { closeItemDetailPopup(this); this._buyCrypto(titanUPkg); },
          });
        }});
        y += 80;
      }
    }

    // ── Алмазы ──
    y = this._gcSection(container, y, W, '💎', 'АЛМАЗЫ / USDT');
    const cpMain = cryptoPkgs.filter(pkg => !pkg.premium && !pkg.full_reset);
    const cpW = (W - 32) / Math.max(1, cpMain.length);
    cpMain.forEach((pkg, i) => {
      const px = 8 + i * (cpW + 4);
      this._gcCard(container, px, y, cpW - 2, 68, gc.hdrRare, gc.cyan);
      container.add(txt(this, px + (cpW - 2) / 2, y + 28, `💎 ${pkg.diamonds}`, 13, '#f0f0fa', true).setOrigin(0.5));
      this._gcPriceBtn(container, px + ((cpW - 2) - 60) / 2, y + 48, 60, `${pkg.usdt} USDT`, { bg: gc.orange, text: '#1a0a00' });
      taps.push({ x: px, y, w: cpW - 2, h: 68, fn: () => {
        showItemDetailPopup(this, {
          icon: '💎', name: `${pkg.diamonds} алмазов`,
          desc: `Мгновенное начисление ${pkg.diamonds} алмазов.\n\nОплата через CryptoPay (USDT). Алмазы приходят автоматически после подтверждения.`,
          actionLabel: `${pkg.usdt} USDT — Купить`, canAct: true,
          actionFn: () => { closeItemDetailPopup(this); this._buyCrypto(pkg); },
        });
      }});
    });
    y += 78;

    // ── Сброс ──
    const cpReset = cryptoPkgs.find(pkg => pkg.full_reset);
    if (cpReset) {
      y = this._gcSection(container, y, W, '⚠️', 'DANGER ZONE');
      this._gcCard(container, 8, y, W - 16, 72, gc.hdrDanger, gc.red);
      this._gcBadge(container, 12, y + 3, 'DANGER', gc.red);
      container.add(txt(this, W / 2, y + 28, '🔄 Полный сброс прогресса', 11, '#ff8888', true).setOrigin(0.5));
      container.add(txt(this, W / 2, y + 42, 'Уровень с нуля · золото и 💎 сохраняются', 8, '#aa6666').setOrigin(0.5));
      this._gcPriceBtn(container, (W - 70) / 2, y + 54, 70, `${cpReset.usdt} USDT`, { bg: 0xdd2222, text: '#fff' });
      taps.push({ x: 8, y, w: W - 16, h: 72, fn: () => {
        showItemDetailPopup(this, {
          icon: '🔄', name: cpReset.label || 'Сброс прогресса',
          desc: `${cpReset.hint || 'Уровень с нуля; 💰💎 сохраняются'}\n\n⚠️ Действие необратимо! Ваш уровень, статы и боевой опыт будут сброшены. Золото и алмазы сохраняются.`,
          badge: '⚠️ ОПАСНО', badgeRisk: true,
          actionLabel: `${cpReset.usdt} USDT — Сбросить`, canAct: true,
          actionFn: () => { closeItemDetailPopup(this); this._buyCrypto(cpReset); },
        });
      }});
      y += 80;
    }

    container.add(txt(this, W / 2, y, '💡 После оплаты товар придёт автоматически', 10, '#5577aa').setOrigin(0.5));
    y += 22;
    const pendingId = parseInt(localStorage.getItem('cryptoPendingInvoice') || '0');
    if (pendingId) {
      const checkG = this.add.graphics();
      checkG.fillStyle(gc.bgCard, 0.9); checkG.fillRoundedRect(8, y, W - 16, 32, 6);
      checkG.lineStyle(1, gc.cyan, 0.5); checkG.strokeRoundedRect(8, y, W - 16, 32, 6);
      container.add(checkG);
      container.add(txt(this, W / 2, y + 10, '🔄 Проверить оплату', 11, '#3cc8dc', true).setOrigin(0.5));
      taps.push({ x: 8, y, w: W - 16, h: 32, fn: () => this._checkPendingInvoice(pendingId) });
      y += 40;
      // Авто-проверка при загрузке — если пользователь вернулся после оплаты
      this.time.delayedCall(3000, () => {
        if (this.scene?.isActive?.('Shop')) {
          this._checkPendingInvoice(pendingId);
        }
      });
    }
    setContentH(y + 10);
  },

});
