/* ═══════════════════════════════════════════════════════════
   ShopScene ext2 — _buildStarsPanel, _buildSpecialPanel
   (контейнерные версии карточек в ext3)
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  /* ── Вкладка "⭐ Звёзды" — единая прокручиваемая страница ── */
  async _buildStarsPanel(W, H) {
    const gen = this._gen;
    let d;
    try { d = await get('/api/shop/packages'); }
    catch(_) { if (this.scene?.isActive('Shop')) txt(this, W/2, H/2, '❌ Нет соединения', 13, '#dc3c46').setOrigin(0.5); return; }
    if (gen !== this._gen || !this.scene?.isActive('Shop') || this._tab !== 'stars') return;
    const starsPkgs = d.stars || [];
    const p = State.player;
    const pkgMain = starsPkgs.filter(pkg => pkg.id !== 'premium');
    const premPkg = starsPkgs.find(pkg => pkg.id === 'premium');
    const taps = [];
    const startY = 162;
    const { container, setContentH } = this._makeScrollZone(W, H, startY, {
      onTap: (relY, relX) => {
        for (const t of taps) {
          if (relY >= t.y && relY < t.y + t.h && relX >= t.x && relX < t.x + t.w) {
            t.fn(); return;
          }
        }
      },
    });
    let y = 0;

    // Премиум-бейдж
    if (p?.is_premium) {
      const sb = this.add.graphics();
      sb.fillStyle(0x1a0a30, 0.95); sb.fillRoundedRect(8, y, W-16, 32, 9);
      sb.lineStyle(2, C.purple, 0.7); sb.strokeRoundedRect(8, y, W-16, 32, 9);
      container.add(sb);
      container.add(txt(this, 20, y+10, '👑 Premium активен', 12, '#c8a0ff', true));
      container.add(txt(this, W-14, y+10, `ещё ${p.premium_days_left} дн.`, 11, '#bbbbdd').setOrigin(1, 0));
      y += 40;
    }

    // ── Секция: Алмазы за Stars ──
    container.add(makePanel(this, 8, y, W-16, 22, 8, 0.6));
    container.add(txt(this, 20, y+5, '⭐  TELEGRAM STARS', 12, '#ffc83c', true));
    container.add(txt(this, W-12, y+5, 'мгновенно', 11, '#ccccdd').setOrigin(1, 0));
    y += 30;
    const pkgW = (W - 32) / Math.max(1, pkgMain.length);
    pkgMain.forEach((pkg, i) => {
      const px = 8 + i * (pkgW + 8 / Math.max(1, pkgMain.length));
      this._makeStarsCardC(container, pkg, px, y, pkgW - 4, 80);
      taps.push({ x: px, y, w: pkgW - 4, h: 80, fn: () => {
        showItemDetailPopup(this, {
          icon: '💎', name: `${pkg.diamonds} алмазов`,
          desc: `Мгновенное начисление ${pkg.diamonds} алмазов на ваш счёт.\n\nАлмазы — премиальная валюта для покупки свитков, ящиков и особых предметов.`,
          actionLabel: `⭐ ${pkg.stars} — Купить`, canAct: true,
          actionFn: () => { closeItemDetailPopup(this); this._buyStars(pkg); },
        });
      }});
    });
    y += 98;
    container.add(txt(this, W/2, y, '⭐ Telegram Stars — простая и быстрая оплата', 11, '#ccccdd').setOrigin(0.5));
    y += 28;

    // ── Секция: Premium подписка ──
    if (premPkg) {
      container.add(makePanel(this, 8, y, W-16, 22, 8, 0.6));
      container.add(txt(this, 20, y+5, '👑  PREMIUM ПОДПИСКА', 12, '#c8a0ff', true));
      container.add(txt(this, W-12, y+5, '⭐ Stars', 11, '#ccccdd').setOrigin(1, 0));
      y += 30;
      this._makePremiumCardC(container, premPkg, 8, y, W-16, 52);
      const isPrem = !!(State.player || {}).is_premium;
      taps.push({ x: 8, y, w: W-16, h: 52, fn: () => {
        showItemDetailPopup(this, {
          icon: '👑', name: 'Premium подписка',
          desc: '⚔️ +15% XP за каждый бой\n📦 Бесплатный ящик каждый день\n🏷️ Скидки в магазине\n👑 Значок Premium у имени',
          actionLabel: isPrem ? '✅ Уже активен' : `⭐ ${premPkg.stars} — Купить`,
          canAct: !isPrem,
          actionFn: () => { closeItemDetailPopup(this); if (!isPrem) this._buyStars(premPkg); },
        });
      }});
      y += 62;
      y += 8;
      const perks = [
        '⚔️ +15% XP за каждый бой',
        '📦 Бесплатный ящик каждый день',
        '🏷️ Скидки в магазине',
        '👑 Значок Premium у имени',
      ];
      perks.forEach(line => {
        container.add(txt(this, 28, y, line, 11, '#d4c8ee'));
        y += 18;
      });
    }
    setContentH(y + 10);
  },

  /* ── Вкладка "💵 Купить" (USDT) — единая прокручиваемая страница ── */
  async _buildSpecialPanel(W, H) {
    const gen = this._gen;
    let d;
    try { d = await get('/api/shop/packages'); }
    catch(_) { if (this.scene?.isActive('Shop')) txt(this, W/2, H/2, '❌ Нет соединения', 13, '#dc3c46').setOrigin(0.5); return; }
    if (gen !== this._gen || !this.scene?.isActive('Shop') || this._tab !== 'special') return;
    const cryptoPkgs = d.crypto || [];
    const scrollPkgs = d.usdt_scrolls || [];
    const cryptoOn   = d.cryptopay_enabled;
    const p = State.player;
    const startY = 162;

    if (!cryptoOn) {
      let y = startY;
      if (p?.is_premium) y += 40;
      const cg = this.add.graphics();
      cg.fillStyle(C.bgPanel, 0.6); cg.fillRoundedRect(8, y, W-16, 56, 10);
      txt(this, W/2, y+18, '⚙️ CryptoPay не подключён', 11, '#ccccdd').setOrigin(0.5);
      txt(this, W/2, y+36, 'Нужна переменная CRYPTOPAY_TOKEN', 11, '#ddddff').setOrigin(0.5);
      return;
    }

    const taps = [];
    const { container, setContentH } = this._makeScrollZone(W, H, startY, {
      onTap: (relY, relX) => {
        for (const t of taps) {
          if (relY >= t.y && relY < t.y + t.h && relX >= t.x && relX < t.x + t.w) {
            t.fn(); return;
          }
        }
      },
    });
    let y = 0;

    // Премиум-бейдж
    if (p?.is_premium) {
      const sb = this.add.graphics();
      sb.fillStyle(0x1a0a30, 0.95); sb.fillRoundedRect(8, y, W-16, 32, 9);
      sb.lineStyle(2, C.purple, 0.7); sb.strokeRoundedRect(8, y, W-16, 32, 9);
      container.add(sb);
      container.add(txt(this, 20, y+10, '👑 Premium активен', 12, '#c8a0ff', true));
      container.add(txt(this, W-14, y+10, `ещё ${p.premium_days_left} дн.`, 11, '#bbbbdd').setOrigin(1, 0));
      y += 40;
    }

    // ── Секция: USDT свитки ──
    if (scrollPkgs.length > 0) {
      container.add(makePanel(this, 8, y, W-16, 22, 8, 0.6));
      container.add(txt(this, 20, y+5, '📜  ОСОБЫЕ СВИТКИ', 12, '#3cc8dc', true));
      container.add(txt(this, W-12, y+5, 'USDT', 11, '#ccccdd').setOrigin(1, 0));
      y += 30;
      const iw = (W - 32) / 2;
      scrollPkgs.forEach((pkg, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const ix = 8 + col * (iw + 8), iy = y + row * 74;
        this._makeUsdtScrollCardC(container, pkg, ix, iy, iw - 4, 68);
        taps.push({ x: ix, y: iy, w: iw - 4, h: 68, fn: () => {
          const isBox = (pkg.scroll_id || '').startsWith('box_');
          const desc = isBox
            ? `Эпический ящик с множеством наград.\nВнутри: USDT-свитки, алмазные свитки, шанс на Титана и Premium.\n\nДобавляется в инвентарь → Особые.`
            : `Мощный боевой свиток USDT-класса.\nДаёт значительный прирост статов на несколько боёв.\n\nДобавляется в инвентарь → Особые.`;
          showItemDetailPopup(this, {
            icon: isBox ? '🎲' : '📜', name: pkg.label || 'Особый предмет',
            desc,
            actionLabel: `${pkg.usdt} USDT — Купить`, canAct: true,
            actionFn: () => { closeItemDetailPopup(this); this._buyCrypto(pkg); },
          });
        }});
      });
      y += Math.ceil(scrollPkgs.length / 2) * 74 + 12;
    }

    // ── Секция: Алмазы / Premium / Сброс ──
    container.add(makePanel(this, 8, y, W-16, 22, 8, 0.6));
    container.add(txt(this, 20, y+5, '💎  АЛМАЗЫ / USDT', 12, '#3cc8dc', true));
    y += 30;
    const cpMain = cryptoPkgs.filter(pkg => !pkg.premium && !pkg.full_reset);
    const cpW = (W - 32) / Math.max(1, cpMain.length);
    cpMain.forEach((pkg, i) => {
      const px = 8 + i * (cpW + 8 / Math.max(1, cpMain.length));
      this._makeCryptoCardC(container, pkg, px, y, cpW - 4, 80);
      taps.push({ x: px, y, w: cpW - 4, h: 80, fn: () => {
        showItemDetailPopup(this, {
          icon: '💎', name: `${pkg.diamonds} алмазов`,
          desc: `Мгновенное начисление ${pkg.diamonds} алмазов.\n\nОплата через CryptoPay (USDT). Алмазы приходят автоматически после подтверждения.`,
          actionLabel: `${pkg.usdt} USDT — Купить`, canAct: true,
          actionFn: () => { closeItemDetailPopup(this); this._buyCrypto(pkg); },
        });
      }});
    });
    y += 90;
    const cpReset = cryptoPkgs.find(pkg => pkg.full_reset);
    if (cpReset) {
      this._makeCryptoResetCardC(container, cpReset, 8, y, W-16, 88);
      taps.push({ x: 8, y, w: W-16, h: 88, fn: () => {
        showItemDetailPopup(this, {
          icon: '🔄', name: cpReset.label || 'Сброс прогресса',
          desc: `${cpReset.hint || 'Уровень с нуля; 💰💎 сохраняются'}\n\n⚠️ Действие необратимо! Ваш уровень, статы и боевой опыт будут сброшены. Золото и алмазы сохраняются.`,
          badge: '⚠️ ОПАСНО', badgeRisk: true,
          actionLabel: `${cpReset.usdt} USDT — Сбросить`, canAct: true,
          actionFn: () => { closeItemDetailPopup(this); this._buyCrypto(cpReset); },
        });
      }});
      y += 98;
    }
    const cpPrem = cryptoPkgs.find(pkg => pkg.premium);
    if (cpPrem) {
      this._makeCryptoPremiumCardC(container, cpPrem, 8, y, W-16, 52);
      const isPremC = !!(State.player || {}).is_premium;
      taps.push({ x: 8, y, w: W-16, h: 52, fn: () => {
        showItemDetailPopup(this, {
          icon: '👑', name: 'Premium подписка',
          desc: '⚔️ +15% XP за каждый бой\n📦 Бесплатный ящик каждый день\n🏷️ Скидки в магазине\n👑 Значок Premium у имени',
          actionLabel: isPremC ? '✅ Уже активен' : `${cpPrem.usdt} USDT — Купить`,
          canAct: !isPremC,
          actionFn: () => { closeItemDetailPopup(this); if (!isPremC) this._buyCrypto(cpPrem); },
        });
      }});
      y += 62;
    }
    container.add(txt(this, W/2, y+4, '💡 После оплаты товар придёт автоматически', 11, '#ccccdd').setOrigin(0.5));
    y += 22;
    const pendingId = parseInt(localStorage.getItem('cryptoPendingInvoice') || '0');
    if (pendingId) {
      const checkG = this.add.graphics();
      checkG.fillStyle(0x1a4055, 0.9); checkG.fillRoundedRect(8, y, W-16, 36, 9);
      checkG.lineStyle(1.5, 0x3cc8dc, 0.5); checkG.strokeRoundedRect(8, y, W-16, 36, 9);
      container.add(checkG);
      container.add(txt(this, W/2, y+18, '🔄 Проверить оплату', 12, '#3cc8dc', true).setOrigin(0.5));
      taps.push({ x: 8, y, w: W-16, h: 36, fn: () => this._checkPendingInvoice(pendingId) });
      y += 44;
    }
    setContentH(y + 10);
  },

});
