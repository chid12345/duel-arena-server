/* ═══════════════════════════════════════════════════════════
   ShopScene ext2 — _buildStarsPanel, _buildSpecialPanel,
                    _makeUsdtScrollCard
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  /* ── Вкладка "⭐ Звёзды" — единая страница ──────────── */
  async _buildStarsPanel(W, H) {
    let d;
    try { d = await get('/api/shop/packages'); }
    catch(_) { if (this.scene?.isActive('Shop')) txt(this, W/2, H/2, '❌ Нет соединения', 13, '#dc3c46').setOrigin(0.5); return; }
    if (!this.scene?.isActive('Shop') || this._tab !== 'stars') return;
    const starsPkgs = d.stars || [];
    let y = 162;
    const p = State.player;
    const pkgMain = starsPkgs.filter(pkg => pkg.id !== 'premium');
    const premPkg = starsPkgs.find(pkg => pkg.id === 'premium');

    // Премиум-бейдж
    if (p?.is_premium) {
      const sb = this.add.graphics();
      sb.fillStyle(0x1a0a30, 0.95); sb.fillRoundedRect(8, y, W-16, 32, 9);
      sb.lineStyle(2, C.purple, 0.7); sb.strokeRoundedRect(8, y, W-16, 32, 9);
      txt(this, 20, y+10, '👑 Premium активен', 12, '#c8a0ff', true);
      txt(this, W-14, y+10, `ещё ${p.premium_days_left} дн.`, 11, '#8888aa').setOrigin(1, 0);
      y += 40;
    }

    // ── Секция: Алмазы за Stars ──
    makePanel(this, 8, y, W-16, 22, 8, 0.6);
    txt(this, 20, y+5, '⭐  TELEGRAM STARS', 12, '#ffc83c', true);
    txt(this, W-12, y+5, 'мгновенно', 11, '#9999bb').setOrigin(1, 0);
    y += 30;
    const pkgW = (W - 32) / Math.max(1, pkgMain.length);
    pkgMain.forEach((pkg, i) => {
      const px = 8 + i * (pkgW + 8 / Math.max(1, pkgMain.length));
      this._makeStarsCard(pkg, px, y, pkgW - 4, 80);
    });
    y += 98;
    txt(this, W/2, y, '⭐ Telegram Stars — простая и быстрая оплата', 11, '#9999bb').setOrigin(0.5);
    y += 28;

    // ── Секция: Premium подписка ──
    if (premPkg) {
      makePanel(this, 8, y, W-16, 22, 8, 0.6);
      txt(this, 20, y+5, '👑  PREMIUM ПОДПИСКА', 12, '#c8a0ff', true);
      txt(this, W-12, y+5, '⭐ Stars', 11, '#9999bb').setOrigin(1, 0);
      y += 30;
      this._makePremiumCard(premPkg, 8, y, W-16, 52); y += 62;
      y += 8;
      const perks = [
        '⚔️ +15% XP за каждый бой',
        '📦 Бесплатный ящик каждый день',
        '🏷️ Скидки в магазине',
        '👑 Значок Premium у имени',
      ];
      perks.forEach(line => {
        txt(this, 28, y, line, 11, '#b0a0d0'); y += 18;
      });
    }
  },

  /* ── Вкладка "💵 Купить" (USDT) — 2 страницы ────────── */
  async _buildSpecialPanel(W, H) {
    let d;
    try { d = await get('/api/shop/packages'); }
    catch(_) { if (this.scene?.isActive('Shop')) txt(this, W/2, H/2, '❌ Нет соединения', 13, '#dc3c46').setOrigin(0.5); return; }
    if (!this.scene?.isActive('Shop') || this._tab !== 'special') return;
    const cryptoPkgs = d.crypto || [];
    const scrollPkgs = d.usdt_scrolls || [];
    const cryptoOn   = d.cryptopay_enabled;
    const pg = this._shopPage || 0;
    let y = 162;
    const p = State.player;

    // Премиум-бейдж — на обеих страницах
    if (p?.is_premium) {
      const sb = this.add.graphics();
      sb.fillStyle(0x1a0a30, 0.95); sb.fillRoundedRect(8, y, W-16, 32, 9);
      sb.lineStyle(2, C.purple, 0.7); sb.strokeRoundedRect(8, y, W-16, 32, 9);
      txt(this, 20, y+10, '👑 Premium активен', 12, '#c8a0ff', true);
      txt(this, W-14, y+10, `ещё ${p.premium_days_left} дн.`, 11, '#8888aa').setOrigin(1, 0);
      y += 40;
    }

    if (!cryptoOn) {
      const cg = this.add.graphics();
      cg.fillStyle(C.bgPanel, 0.6); cg.fillRoundedRect(8, y, W-16, 56, 10);
      txt(this, W/2, y+18, '⚙️ CryptoPay не подключён', 11, '#9999bb').setOrigin(0.5);
      txt(this, W/2, y+36, 'Нужна переменная CRYPTOPAY_TOKEN', 11, '#7777aa').setOrigin(0.5);
      return;
    }

    const hasScrolls = scrollPkgs.length > 0;
    const pageCount  = hasScrolls ? 2 : 1;
    const page       = Math.min(pg, pageCount - 1);

    // Свайп для переключения Special-страниц
    if (pageCount > 1 && !this._specSwipeSetup) {
      this._specSwipeSetup = true;
      let sx = 0, sy = 0;
      this.input.on('pointerdown', p => { sx = p.x; sy = p.y; });
      this.input.on('pointerup',   p => {
        const dx = p.x - sx, dy = p.y - sy;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          const next = page + (dx < 0 ? 1 : -1);
          if (next >= 0 && next < pageCount) {
            tg?.HapticFeedback?.selectionChanged?.();
            ShopScene._lastPage = next;
            this.scene.restart({ tab: 'special', page: next });
          }
        }
      });
    }
    const mkSpecNav = (navY) => {
      for (let pi = 0; pi < pageCount; pi++) {
        const dg = this.add.graphics();
        dg.fillStyle(pi === page ? 0x3cc8dc : 0x333355, 1);
        dg.fillCircle(W/2 - (pageCount-1)*8 + pi*16, navY + 6, pi === page ? 5 : 3.5);
      }
    };

    if (page === 0 && hasScrolls) {
      // ── Страница 1: USDT свитки ──
      makePanel(this, 8, y, W-16, 22, 8, 0.6);
      txt(this, 20, y+5, '📜  ОСОБЫЕ СВИТКИ', 12, '#3cc8dc', true);
      txt(this, W-12, y+5, 'USDT', 11, '#9999bb').setOrigin(1, 0);
      y += 30;
      const iw = (W - 32) / 2;
      scrollPkgs.forEach((pkg, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const ix = 8 + col * (iw + 8), iy = y + row * 74;
        this._makeUsdtScrollCard(pkg, ix, iy, iw - 4, 68);
      });
      y += Math.ceil(scrollPkgs.length / 2) * 74 + 12;
      mkSpecNav(y);
    } else {
      // ── Страница 2: Алмазы / Premium / Сброс ──
      makePanel(this, 8, y, W-16, 22, 8, 0.6);
      txt(this, 20, y+5, '💎  АЛМАЗЫ / USDT', 12, '#3cc8dc', true);
      y += 30;
      const cpMain = cryptoPkgs.filter(pkg => !pkg.premium && !pkg.full_reset);
      const cpW = (W - 32) / Math.max(1, cpMain.length);
      cpMain.forEach((pkg, i) => {
        this._makeCryptoCard(pkg, 8 + i * (cpW + 8 / Math.max(1,cpMain.length)), y, cpW - 4, 80);
      });
      y += 90;
      const cpReset = cryptoPkgs.find(pkg => pkg.full_reset);
      if (cpReset) { this._makeCryptoResetCard(cpReset, 8, y, W-16, 88); y += 98; }
      const cpPrem = cryptoPkgs.find(pkg => pkg.premium);
      if (cpPrem) { this._makeCryptoPremiumCard(cpPrem, 8, y, W-16, 52); y += 62; }
      txt(this, W/2, y+4, '💡 После оплаты товар придёт автоматически', 11, '#9999bb').setOrigin(0.5);
      y += 22;
      const pendingId = parseInt(localStorage.getItem('cryptoPendingInvoice') || '0');
      if (pendingId) {
        const checkG = this.add.graphics();
        checkG.fillStyle(0x1a4055, 0.9); checkG.fillRoundedRect(8, y, W-16, 36, 9);
        checkG.lineStyle(1.5, 0x3cc8dc, 0.5); checkG.strokeRoundedRect(8, y, W-16, 36, 9);
        const checkT = txt(this, W/2, y+18, '🔄 Проверить оплату', 12, '#3cc8dc', true).setOrigin(0.5);
        this.add.zone(8, y, W-16, 36).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { checkG.clear(); checkG.fillStyle(0x0a2535,1); checkG.fillRoundedRect(8,y,W-16,36,9); })
          .on('pointerup', () => { checkT.setText('⏳ Проверяем...'); this._checkPendingInvoice(pendingId); });
        y += 44;
      }
      if (hasScrolls) mkSpecNav(y);
    }
  },

  /* ── USDT-свиток карточка ─────────────────────────────── */
  _makeUsdtScrollCard(pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x0d2535, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 10);
    bg.lineStyle(1.5, 0x3cc8dc, 0.5); bg.strokeRoundedRect(ix, iy, iw, ih, 10);
    txt(this, ix + iw/2, iy + 18, pkg.label, 10, '#c8e8ff', true).setOrigin(0.5).setWordWrapWidth(iw-8);
    const btnG = this.add.graphics();
    btnG.fillStyle(0x1a6080, 1); btnG.fillRoundedRect(ix+4, iy+ih-22, iw-8, 17, 5);
    txt(this, ix+iw/2, iy+ih-14, `${pkg.usdt} USDT`, 11, '#3ce8ff', true).setOrigin(0.5);
    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x163548,1); bg.fillRoundedRect(ix,iy,iw,ih,10); tg?.HapticFeedback?.impactOccurred('medium'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x0d2535,0.95); bg.fillRoundedRect(ix,iy,iw,ih,10); bg.lineStyle(1.5,0x3cc8dc,0.5); bg.strokeRoundedRect(ix,iy,iw,ih,10); })
      .on('pointerup',   () => this._buyCrypto(pkg));
  },

});
