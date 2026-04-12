/* ═══════════════════════════════════════════════════════════
   ShopScene ext3 — Stars/Crypto карточки, покупки, polling, toast
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  /* ── Stars карточки ──────────────────────────────────── */
  _makeStarsCard(pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x231e09, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(1.5, 0xffc83c, 0.6); bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    txt(this, ix+iw/2, iy+22, `💎 ${pkg.diamonds}`, 15, '#f0f0fa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+40, 'алмазов', 11, '#ffe088').setOrigin(0.5);
    const btnG = this.add.graphics();
    btnG.fillStyle(0xffa000, 1); btnG.fillRoundedRect(ix+4, iy+56, iw-8, 18, 6);
    txt(this, ix+iw/2, iy+65, `⭐ ${pkg.stars}`, 12, '#1a1208', true).setOrigin(0.5);
    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x332d10,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('medium'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x231e09,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(1.5,0xffc83c,0.6); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
      .on('pointerup',   () => this._buyStars(pkg));
  },

  _makePremiumCard(pkg, ix, iy, iw, ih) {
    const p = State.player || {}, isActive = !!p.is_premium;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a30, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, isActive ? 0xb45aff : C.purple, isActive ? 1.0 : 0.7);
    bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    txt(this, ix+20, iy+ih/2-2, '👑', 20).setOrigin(0, 0.5);
    txt(this, ix+50, iy+ih/2-8, 'Premium подписка', 12, '#c8a0ff', true);
    if (isActive) {
      txt(this, ix+50, iy+ih/2+8, `✅ Активна · ${p.premium_days_left} дн.`, 11, '#b45aff');
      txt(this, iw-4, iy+ih/2-2, '— куплено —', 11, '#ccccdd').setOrigin(1, 0.5);
    } else {
      txt(this, ix+50, iy+ih/2+8, '+15% XP · ежедн. ящик · скидки', 11, '#ccbbee');
      txt(this, iw-4, iy+ih/2-2, `⭐ ${pkg.stars}`, 12, '#ffc83c', true).setOrigin(1, 0.5);
      this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x2a0a40,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('heavy'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a0a30,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(2,C.purple,0.7); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
        .on('pointerup',   () => this._buyStars(pkg));
    }
  },

  _makeCryptoPremiumCard(pkg, ix, iy, iw, ih) {
    const p = State.player || {}, isActive = !!p.is_premium;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a30, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, isActive ? 0xb45aff : C.purple, isActive ? 1.0 : 0.7);
    bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    txt(this, ix+20, iy+ih/2-2, '👑', 20).setOrigin(0, 0.5);
    txt(this, ix+50, iy+ih/2-8, 'Premium подписка', 12, '#c8a0ff', true);
    if (isActive) {
      txt(this, ix+50, iy+ih/2+8, `✅ Активна · ${p.premium_days_left} дн.`, 11, '#b45aff');
      txt(this, iw-4, iy+ih/2-2, '— куплено —', 11, '#ccccdd').setOrigin(1, 0.5);
    } else {
      txt(this, ix+50, iy+ih/2+8, '+15% XP · ежедн. ящик · скидки', 11, '#ccbbee');
      txt(this, iw-4, iy+ih/2-2, `${pkg.usdt} USDT`, 12, '#3cc8dc', true).setOrigin(1, 0.5);
      this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x2a0a40,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('heavy'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a0a30,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(2,C.purple,0.7); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
        .on('pointerup',   () => this._buyCrypto(pkg));
    }
  },

  _makeCryptoCard(pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x0d2535, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(1.5, 0x3cc8dc, 0.6); bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    txt(this, ix+iw/2, iy+22, `💎 ${pkg.diamonds}`, 15, '#f0f0fa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+40, 'алмазов', 11, '#88ddee').setOrigin(0.5);
    const btnG = this.add.graphics();
    btnG.fillStyle(0x1a6080, 1); btnG.fillRoundedRect(ix+4, iy+56, iw-8, 18, 6);
    txt(this, ix+iw/2, iy+65, `${pkg.usdt} USDT`, 12, '#3ce8ff', true).setOrigin(0.5);
    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x163548,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('medium'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x0d2535,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(1.5,0x3cc8dc,0.6); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
      .on('pointerup',   () => this._buyCrypto(pkg));
  },

  _makeCryptoResetCard(pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1010, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, 0xff4444, 0.85); bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    txt(this, ix+iw/2, iy+12, pkg.label || '🔄 Сброс прогресса', 12, '#ffaaaa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+30, pkg.hint || 'Уровень с нуля; 💰💎 сохраняются', 9, '#ccaaaa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+48, `Оплата: ${pkg.usdt} USDT`, 11, '#3ce8ff', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+66, 'После оплаты — /start или обновите приложение', 9, '#ccbbbb').setOrigin(0.5);
    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x351818,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x2a1010,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(2,0xff4444,0.85); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
      .on('pointerup',   () => this._buyCrypto(pkg));
  },

  /* ── Container-версии карточек (для scroll zone) ──── */
  _makeStarsCardC(c, pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x231e09, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(1.5, 0xffc83c, 0.6); bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    c.add(bg);
    c.add(txt(this, ix+iw/2, iy+22, `💎 ${pkg.diamonds}`, 15, '#f0f0fa', true).setOrigin(0.5));
    c.add(txt(this, ix+iw/2, iy+40, 'алмазов', 11, '#ffe088').setOrigin(0.5));
    const btnG = this.add.graphics();
    btnG.fillStyle(0xffa000, 1); btnG.fillRoundedRect(ix+4, iy+56, iw-8, 18, 6);
    c.add(btnG);
    c.add(txt(this, ix+iw/2, iy+65, `⭐ ${pkg.stars}`, 12, '#1a1208', true).setOrigin(0.5));
  },

  _makePremiumCardC(c, pkg, ix, iy, iw, ih) {
    const p = State.player || {}, isActive = !!p.is_premium;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a30, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, isActive ? 0xb45aff : C.purple, isActive ? 1.0 : 0.7);
    bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    c.add(bg);
    c.add(txt(this, ix+20, iy+ih/2-2, '👑', 20).setOrigin(0, 0.5));
    c.add(txt(this, ix+50, iy+ih/2-8, 'Premium подписка', 12, '#c8a0ff', true));
    if (isActive) {
      c.add(txt(this, ix+50, iy+ih/2+8, `✅ Активна · ${p.premium_days_left} дн.`, 11, '#b45aff'));
      c.add(txt(this, iw-4, iy+ih/2-2, '— куплено —', 11, '#ccccdd').setOrigin(1, 0.5));
    } else {
      c.add(txt(this, ix+50, iy+ih/2+8, '+15% XP · ежедн. ящик · скидки', 11, '#ccbbee'));
      c.add(txt(this, iw-4, iy+ih/2-2, `⭐ ${pkg.stars}`, 12, '#ffc83c', true).setOrigin(1, 0.5));
    }
  },

  _makeCryptoCardC(c, pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x0d2535, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(1.5, 0x3cc8dc, 0.6); bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    c.add(bg);
    c.add(txt(this, ix+iw/2, iy+22, `💎 ${pkg.diamonds}`, 15, '#f0f0fa', true).setOrigin(0.5));
    c.add(txt(this, ix+iw/2, iy+40, 'алмазов', 11, '#88ddee').setOrigin(0.5));
    const btnG = this.add.graphics();
    btnG.fillStyle(0x1a6080, 1); btnG.fillRoundedRect(ix+4, iy+56, iw-8, 18, 6);
    c.add(btnG);
    c.add(txt(this, ix+iw/2, iy+65, `${pkg.usdt} USDT`, 12, '#3ce8ff', true).setOrigin(0.5));
  },

  _makeCryptoResetCardC(c, pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1010, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, 0xff4444, 0.85); bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    c.add(bg);
    c.add(txt(this, ix+iw/2, iy+12, pkg.label || '🔄 Сброс прогресса', 12, '#ffaaaa', true).setOrigin(0.5));
    c.add(txt(this, ix+iw/2, iy+30, pkg.hint || 'Уровень с нуля; 💰💎 сохраняются', 9, '#ccaaaa', true).setOrigin(0.5));
    c.add(txt(this, ix+iw/2, iy+48, `Оплата: ${pkg.usdt} USDT`, 11, '#3ce8ff', true).setOrigin(0.5));
    c.add(txt(this, ix+iw/2, iy+66, 'После оплаты — /start или обновите приложение', 9, '#ccbbbb').setOrigin(0.5));
  },

  _makeCryptoPremiumCardC(c, pkg, ix, iy, iw, ih) {
    const p = State.player || {}, isActive = !!p.is_premium;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a30, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, isActive ? 0xb45aff : C.purple, isActive ? 1.0 : 0.7);
    bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    c.add(bg);
    c.add(txt(this, ix+20, iy+ih/2-2, '👑', 20).setOrigin(0, 0.5));
    c.add(txt(this, ix+50, iy+ih/2-8, 'Premium подписка', 12, '#c8a0ff', true));
    if (isActive) {
      c.add(txt(this, ix+50, iy+ih/2+8, `✅ Активна · ${p.premium_days_left} дн.`, 11, '#b45aff'));
      c.add(txt(this, iw-4, iy+ih/2-2, '— куплено —', 11, '#ccccdd').setOrigin(1, 0.5));
    } else {
      c.add(txt(this, ix+50, iy+ih/2+8, '+15% XP · ежедн. ящик · скидки', 11, '#ccbbee'));
      c.add(txt(this, iw-4, iy+ih/2-2, `${pkg.usdt} USDT`, 12, '#3cc8dc', true).setOrigin(1, 0.5));
    }
  },

  _makeUsdtScrollCardC(c, pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x0d2535, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 10);
    bg.lineStyle(1.5, 0x3cc8dc, 0.5); bg.strokeRoundedRect(ix, iy, iw, ih, 10);
    c.add(bg);
    c.add(txt(this, ix+iw/2, iy+18, pkg.label, 10, '#ffffff', true).setOrigin(0.5).setWordWrapWidth(iw-8));
    const btnG = this.add.graphics();
    btnG.fillStyle(0x1a6080, 1); btnG.fillRoundedRect(ix+4, iy+ih-22, iw-8, 17, 5);
    c.add(btnG);
    c.add(txt(this, ix+iw/2, iy+ih-14, `${pkg.usdt} USDT`, 11, '#3ce8ff', true).setOrigin(0.5));
  },

  /* ── Покупки ─────────────────────────────────────────── */
  async _buyStars(pkg) {
    if (this._buying) return;
    this._buying = true;
    this._toast('⏳ Открываем оплату...');
    try {
      const res = await post('/api/shop/stars_invoice', { package_id: pkg.id });
      if (!res.ok) { this._toast(`❌ ${res.reason}`); this._buying = false; return; }
      tg?.openInvoice(res.invoice_url, async (status) => {
        this._buying = false;
        if (status === 'paid') {
          tg?.HapticFeedback?.notificationOccurred('success');
          Sound.levelUp?.();
          this._toast('⏳ Активируем...');
          try {
            const confirm = await post('/api/shop/stars_confirm', { package_id: pkg.id });
            if (confirm.ok) {
              if (confirm.player) State.player = confirm.player;
              if (confirm.premium_activated) this._toast(`👑 Premium активирован!`);
              else this._toast(`✅ +${confirm.diamonds_added || pkg.diamonds} 💎 начислено!`);
            } else {
              this._toast('✅ Оплата прошла! Обновите профиль.');
            }
          } catch(_) { this._toast('✅ Оплата прошла! Обновите профиль.'); }
          this.time.delayedCall(1200, () => this.scene.restart({ tab: 'stars' }));
        } else if (status === 'cancelled') {
          this._toast('❌ Оплата отменена');
        }
      });
    } catch(_) { this._toast('❌ Нет соединения'); this._buying = false; }
  },

  async _buyCrypto(pkg) {
    if (this._buying) return;
    this._buying = true;
    this._toast('⏳ Создаём счёт...');
    try {
      const res = await post('/api/shop/crypto_invoice', { package_id: pkg.id });
      if (!res.ok) { this._toast(`❌ ${res.reason}`); this._buying = false; return; }
      localStorage.setItem('cryptoPendingInvoice', String(res.invoice_id));
      if (res.invoice_url) tg?.openLink?.(res.invoice_url);
      this._toast('💳 Счёт открыт — оплатите и вернитесь');
      this._buying = false;
      this._startCryptoPolling(res.invoice_id, pkg);
    } catch(_) { this._toast('❌ Нет соединения'); this._buying = false; }
  },

  _startCryptoPolling(invoiceId, pkg) {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const r = await get(`/api/shop/crypto_check/${invoiceId}`);
        if (r.ok && r.paid) {
          if (r.scroll_received) {
            this._onScrollReceived(r.scroll_id, invoiceId);
          } else {
            this._onCryptoPaid(r.diamonds || 0, invoiceId, r.premium_activated, r.bonus_diamonds || 0, !!r.profile_reset);
          }
          return;
        }
      } catch(_) {}
      if (attempts < 24 && this.scene.isActive?.('Shop')) this.time.delayedCall(5000, poll);
    };
    this.time.delayedCall(5000, poll);
  },

  async _checkPendingInvoice(invoiceId) {
    try {
      const r = await get(`/api/shop/crypto_check/${invoiceId}`);
      if (r.ok && r.paid) {
        if (r.scroll_received) this._onScrollReceived(r.scroll_id, invoiceId);
        else this._onCryptoPaid(r.diamonds || 0, invoiceId, r.premium_activated, r.bonus_diamonds || 0, !!r.profile_reset);
      } else { this._toast('⏳ Оплата ещё не подтверждена'); }
    } catch(_) { this._toast('❌ Нет соединения'); }
  },

  _onScrollReceived(scrollId, invoiceId) {
    tg?.HapticFeedback?.notificationOccurred('success');
    Sound.levelUp?.();
    localStorage.removeItem('cryptoPendingInvoice');
    this._toast('✅ Свиток получен! Открой «Герой → Моё → Особые»');
    post('/api/player').then(d => {
      if (d.ok && d.player) State.player = d.player;
      this.time.delayedCall(800, () => this.scene.restart({ tab: 'special' }));
    }).catch(() => this.time.delayedCall(800, () => this.scene.restart({ tab: 'special' })));
  },

  _onCryptoPaid(diamonds, invoiceId, isPremium, bonusDiamonds = 0, profileReset = false) {
    tg?.HapticFeedback?.notificationOccurred('success');
    Sound.levelUp?.();
    localStorage.removeItem('cryptoPendingInvoice');
    let msg = profileReset ? '🔄 Аккаунт сброшен.'
      : isPremium ? (bonusDiamonds > 0 ? `👑 Premium! +${bonusDiamonds} 💎` : '👑 Premium активирован!')
      : `✅ +${diamonds} 💎 начислено!`;
    this._toast(msg);
    post('/api/player').then(d => {
      if (d.ok && d.player) State.player = d.player;
      this.time.delayedCall(800, () => this.scene.restart({ tab: 'special' }));
    }).catch(() => this.time.delayedCall(800, () => this.scene.restart({ tab: 'special' })));
  },

  _toast(msg) {
    const t = txt(this, this.W / 2, this.H - 80, msg, 12, '#ffc83c', true).setOrigin(0.5);
    t.setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 36, duration: 2200, onComplete: () => t.destroy() });
  },

});
