/* ═══════════════════════════════════════════════════════════
   AvatarScene ext2 — попап детали через showItemDetailPopup
                      + покупка/экипировка
   ═══════════════════════════════════════════════════════════ */

Object.assign(AvatarScene.prototype, {

  _onAvatarTap(av) {
    if (!av) return;
    tg?.HapticFeedback?.selectionChanged();
    Sound.click();
    this._showAvatarDetail(av);
  },

  _showAvatarDetail(av) {
    const isEq = av.equipped, isUn = av.unlocked;
    const tier = _AV_TIER[av.rarity] || _AV_TIER.common;
    const pl = this._priceLabel(av);

    // Stats pills
    const stats = [];
    if (av.effective_strength)  stats.push({ label: `С +${av.effective_strength}`,  color: '#ff8888', bg: 0x441111 });
    if (av.effective_endurance) stats.push({ label: `Л +${av.effective_endurance}`, color: '#55ddff', bg: 0x113344 });
    if (av.effective_crit)      stats.push({ label: `И +${av.effective_crit}`,      color: '#cc77ff', bg: 0x331155 });
    if (av.effective_hp_flat)   stats.push({ label: `В +${av.effective_hp_flat}`,   color: '#55ff99', bg: 0x114422 });

    // Badge по редкости
    const badge = tier.label;
    const badgeRisk = false;

    // Action
    let actionLabel = null, actionFn = null, canAct = true;
    if (isEq) {
      actionLabel = '✓ Уже экипирован';
      canAct = false;
      actionFn = () => closeItemDetailPopup(this);
    } else if (isUn) {
      actionLabel = '⚔️ Экипировать';
      actionFn = () => { closeItemDetailPopup(this); this._doEquip(av); };
    } else if (av.currency === 'free') {
      actionLabel = '🆓 Получить бесплатно';
      actionFn = () => { closeItemDetailPopup(this); this._doBuyGold(av); };
    } else if (av.currency === 'gold') {
      const p = State.player;
      canAct = p && (p.gold || 0) >= av.price;
      actionLabel = canAct ? `🪙 ${av.price} — Купить` : `Нужно ${av.price} 💰`;
      actionFn = () => {
        if (!canAct) return;
        closeItemDetailPopup(this); this._doBuyGold(av);
      };
    } else if (av.currency === 'diamonds') {
      const p = State.player;
      canAct = p && (p.diamonds || 0) >= av.price;
      actionLabel = canAct ? `💎 ${av.price} — Купить` : `Нужно ${av.price} 💎`;
      actionFn = () => {
        if (!canAct) return;
        closeItemDetailPopup(this); this._doBuyGold(av);
      };
    } else if (av.currency === 'stars') {
      actionLabel = `⭐ ${av.price} Stars — Купить`;
      actionFn = () => { closeItemDetailPopup(this); this._doBuyStars(av); };
    } else if (av.currency === 'subscription') {
      actionLabel = '👑 Нужна Premium подписка';
      canAct = false;
    } else if (av.currency === 'referral') {
      actionLabel = '🤝 Пригласи 5+ друзей';
      canAct = false;
    } else if (av.currency === 'usdt_stars') {
      actionLabel = '👑 590 ⭐ / $11.99 — Элитный';
      actionFn = () => { closeItemDetailPopup(this); this._doBuyStars(av); };
    }

    const name = (av.name || av.id).replace(/^[^\s]+\s/, '');

    showItemDetailPopup(this, {
      icon: av.badge || '?',
      name: name,
      desc: av.description || '',
      stats: stats,
      badge: badge,
      badgeRisk: false,
      canAct: canAct,
      actionLabel: actionLabel,
      actionFn: actionFn,
      currency: av.currency === 'diamonds' ? 'diamonds' : 'gold',
    });
  },

  /* ─── API-вызовы ─── */
  async _doBuyGold(av) {
    try {
      const j = await post('/api/avatars/buy', { avatar_id: av.id });
      if (j.ok) {
        if (j.player) State.player = j.player;
        tg?.HapticFeedback?.notificationOccurred('success');
        this.scene.restart({ tab: this._tab });
      } else { tg?.showAlert?.(j.reason || 'Ошибка покупки'); }
    } catch (_) { tg?.showAlert?.('Ошибка сети'); }
  },

  async _doEquip(av) {
    try {
      const j = await post('/api/avatars/equip', { avatar_id: av.id });
      if (j.ok) {
        if (j.player) State.player = j.player;
        State.avatarId = av.id;
        try { localStorage.setItem('da_avatar', av.id); } catch(_) {}
        const menu = this.scene.get('Menu');
        if (menu?._panels?.profile) { menu._panels.profile.destroy(); menu._panels.profile = null; }
        tg?.HapticFeedback?.notificationOccurred('success');
        this.scene.restart({ tab: this._tab });
      } else { tg?.showAlert?.(j.reason || 'Ошибка'); }
    } catch (_) { tg?.showAlert?.('Ошибка сети'); }
  },

  async _doBuyStars(av) {
    const isElite = av.currency === 'usdt_stars';
    const url = isElite ? '/api/avatars/elite/stars_invoice' : '/api/avatars/premium/stars_invoice';
    try {
      const j = await post(url, { avatar_id: av.id });
      if (j.ok && j.invoice_url) {
        tg?.openInvoice?.(j.invoice_url, async (status) => {
          if (status === 'paid') {
            const confirmUrl = isElite ? '/api/avatars/elite/stars_confirm' : '/api/avatars/premium/stars_confirm';
            await post(confirmUrl, { avatar_id: av.id });
            tg?.HapticFeedback?.notificationOccurred('success');
            this.scene.restart({ tab: this._tab });
          }
        });
      } else { tg?.showAlert?.(j.reason || 'Ошибка'); }
    } catch (_) { tg?.showAlert?.('Ошибка сети'); }
  },

  async _doBuyCrypto(av) {
    try {
      const j = await post('/api/avatars/premium/crypto_invoice', { avatar_id: av.id });
      if (j.ok && j.invoice_url) { tg?.openLink?.(j.invoice_url); }
      else { tg?.showAlert?.(j.reason || 'Ошибка'); }
    } catch (_) { tg?.showAlert?.('Ошибка сети'); }
  },
});
