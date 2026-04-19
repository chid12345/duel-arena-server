/* ═══════════════════════════════════════════════════════════
   AvatarScene ext3 — надёжное подтверждение Stars/USDT
   ═══════════════════════════════════════════════════════════ */

Object.assign(AvatarScene.prototype, {
  async _doBuyStars(av) {
    const isElite = av.currency === 'usdt_stars';
    const invoiceUrl = isElite ? '/api/avatars/elite/stars_invoice' : '/api/avatars/premium/stars_invoice';
    const confirmUrl = isElite ? '/api/avatars/elite/stars_confirm' : '/api/avatars/premium/stars_confirm';
    try {
      const j = await post(invoiceUrl, { avatar_id: av.id });
      if (!j.ok || !j.invoice_url) {
        tg?.showAlert?.(j.reason || 'Ошибка');
        return;
      }
      tg?.openInvoice?.(j.invoice_url, async (status) => {
        if (status === 'cancelled') return;
        if (status === 'pending') {
          tg?.showAlert?.('Платеж в обработке. Если Stars списались, проверьте образы через несколько секунд.');
          this._pollAvatarState(av.id, 6, 4000);
          return;
        }
        if (status !== 'paid') return;
        try {
          const r = await post(confirmUrl, { avatar_id: av.id });
          if (!r.ok) {
            tg?.showAlert?.(r.reason || 'Оплата прошла, но образ пока не выдан. Попробуйте открыть раздел позже.');
            this._pollAvatarState(av.id, 6, 3000);
            return;
          }
          if (r.player) State.player = r.player;
          if (Array.isArray(r.avatars) && r.avatars.length) {
            this._avatars = r.avatars;
            tg?.HapticFeedback?.notificationOccurred('success');
            closeItemDetailPopup(this);
            this._renderList();
            return;
          }
          this._pollAvatarState(av.id, 6, 2500);
        } catch (_) {
          tg?.showAlert?.('Оплата прошла, проверяем выдачу образа...');
          this._pollAvatarState(av.id, 6, 3000);
        }
      });
    } catch (_) {
      tg?.showAlert?.('Ошибка сети');
    }
  },

  async _doBuyCrypto(av) {
    const isElite = av.currency === 'usdt_stars';
    const url = isElite ? '/api/avatars/elite/crypto_invoice' : '/api/avatars/premium/crypto_invoice';
    try {
      const j = await post(url, { avatar_id: av.id });
      if (!j.ok || !j.invoice_url || !j.invoice_id) {
        tg?.showAlert?.(j.reason || 'Ошибка');
        return;
      }
      try {
        localStorage.setItem('avatarPendingInvoice', String(j.invoice_id));
        localStorage.setItem('avatarPendingId', String(av.id));
      } catch (_) {}
      const _u3 = j.invoice_url || '';
      if (j.web_app_url) tg?.openLink?.(j.web_app_url);
      else if (_u3.includes('startapp=')) tg?.openLink?.(_u3);
      else tg?.openTelegramLink?.(_u3);
      this._startAvatarCryptoPolling(j.invoice_id, av.id);
    } catch (_) {
      tg?.showAlert?.('Ошибка сети');
    }
  },

  _resumePendingAvatarCryptoPoll() {
    try {
      const invoiceId = parseInt(localStorage.getItem('avatarPendingInvoice') || '0', 10);
      const avatarId = localStorage.getItem('avatarPendingId') || '';
      if (invoiceId > 0 && avatarId) {
        this._startAvatarCryptoPolling(invoiceId, avatarId, true);
      }
    } catch (_) {}
  },

  _startAvatarCryptoPolling(invoiceId, avatarId, silent = false) {
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const r = await get(`/api/shop/crypto_check/${invoiceId}`);
        if (r.ok && r.paid) {
          try {
            localStorage.removeItem('avatarPendingInvoice');
            localStorage.removeItem('avatarPendingId');
          } catch (_) {}
          this._pollAvatarState(avatarId, 4, 1500, !silent);
          return;
        }
      } catch (_) {}
      if (attempts < 24 && this.scene.isActive?.('Avatar')) {
        this.time.delayedCall(5000, poll);
      } else if (!silent) {
        tg?.showAlert?.('Платеж найден, но подтверждение задерживается. Откройте образы позже.');
      }
    };
    this.time.delayedCall(silent ? 1200 : 4000, poll);
  },

  _pollAvatarState(avatarId, attempts, delayMs, notifyOnSuccess = true) {
    let left = attempts;
    const tick = async () => {
      left -= 1;
      try {
        const d = await get('/api/avatars');
        if (d.ok) {
          this._avatars = d.avatars || [];
          this._equipped = d.equipped_avatar_id || this._equipped;
          const got = this._avatars.some(a => a.id === avatarId && a.unlocked);
          if (got) {
            closeItemDetailPopup(this);
            if (notifyOnSuccess) tg?.HapticFeedback?.notificationOccurred('success');
            this._renderList();
            return;
          }
        }
      } catch (_) {}
      if (left > 0 && this.scene.isActive?.('Avatar')) {
        this.time.delayedCall(delayMs, tick);
      }
    };
    this.time.delayedCall(delayMs, tick);
  },
});
