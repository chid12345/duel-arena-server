/* ═══════════════════════════════════════════════════════════
   ShopScene ext3 — покупки Stars/Crypto, polling, toast
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  /* ── Покупки ─────────────────────────────────────────── */
  async _buyStars(pkg) {
    if (_globalCooldown('shop_buy')) return;
    if (this._buying) return;
    this._buying = true;
    this._toast('⏳ Открываем оплату...');
    try {
      const res = await post('/api/shop/stars_invoice', { package_id: pkg.id });
      if (!res.ok) { this._toast(`❌ ${res.reason || res.detail || 'Ошибка'}`); this._buying = false; return; }
      if (typeof tg?.openInvoice !== 'function') {
        this._toast('❌ Оплата Stars недоступна — откройте через Telegram');
        this._buying = false;
        return;
      }
      tg.openInvoice(res.invoice_url, async (status) => {
        this._buying = false;
        if (status === 'paid') {
          tg?.HapticFeedback?.notificationOccurred('success');
          Sound.levelUp?.();
          this._toast('⏳ Активируем...');
          try {
            const confirm = await post('/api/shop/stars_confirm', { package_id: pkg.id });
            if (confirm.ok) {
              if (confirm.player) State.player = confirm.player;
              if (confirm.scroll_received) {
                const isBox = (confirm.scroll_id || '').startsWith('box_');
                this._bumpInvBadge();
                this._toast(isBox ? '✅ Ящик получен! Герой → Моё → Особые' : '✅ Свиток получен! Герой → Моё → Особые');
              } else if (confirm.premium_activated) {
                this._toast(`👑 Premium активирован!`);
              } else {
                this._toast(`✅ +${confirm.diamonds_added || pkg.diamonds} 💎 начислено!`);
              }
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
    if (_globalCooldown('shop_buy')) return;
    if (this._buying) return;
    this._buying = true;
    this._toast('⏳ Создаём счёт...');
    try {
      const res = await post('/api/shop/crypto_invoice', { package_id: pkg.id });
      if (!res.ok) { this._toast(`❌ ${res.reason || res.detail || 'Ошибка'}`); this._buying = false; return; }
      if (!res.invoice_url) {
        this._toast('❌ CryptoPay не вернул ссылку — проверьте токен');
        this._buying = false;
        return;
      }
      localStorage.setItem('cryptoPendingInvoice', String(res.invoice_id));
      // mini_app_invoice_url (startapp=) → openLink держит мини-апп живым
      // bot_invoice_url (testnet/fallback) → openTelegramLink открывает прямо в Telegram
      res.invoice_url.includes('startapp=') ? tg?.openLink?.(res.invoice_url) : tg?.openTelegramLink?.(res.invoice_url);
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
      } else {
        this._toast('⏳ Ждём подтверждения CryptoPay...');
        this._startCryptoPolling(invoiceId, null);
      }
    } catch(_) { this._toast('❌ Нет соединения'); }
  },

  _onScrollReceived(scrollId, invoiceId) {
    tg?.HapticFeedback?.notificationOccurred('success');
    Sound.levelUp?.();
    localStorage.removeItem('cryptoPendingInvoice');
    const isBox = (scrollId || '').startsWith('box_');
    this._bumpInvBadge();
    this._toast(isBox ? '✅ Ящик получен! Герой → Моё → Особые' : '✅ Свиток получен! Герой → Моё → Особые');
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
