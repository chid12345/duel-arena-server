/* ═══════════════════════════════════════════════════════════
   AvatarScene ext2 — покупка, экипировка, подтверждение
   ═══════════════════════════════════════════════════════════ */

Object.assign(AvatarScene.prototype, {

  _onAvatarTap(av) {
    if (!av) return;
    tg?.HapticFeedback?.selectionChanged();
    Sound.click();
    if (av.equipped) return;
    if (av.unlocked) return this._doEquip(av);
    if (av.currency === 'free') return this._doBuyGold(av);
    if (av.currency === 'subscription' || av.currency === 'referral' || av.currency === 'usdt_stars') {
      return this._showInfo(av);
    }
    this._showBuyConfirm(av);
  },

  _showBuyConfirm(av) {
    if (this._overlay) return;
    const W = this.W, H = this.H, layer = [];
    const dim = this.add.graphics().setDepth(50);
    dim.fillStyle(0x000000, 0.7); dim.fillRect(0, 0, W, H); layer.push(dim);

    const pw = W - 40, ph = 210, px = 20, py = H / 2 - ph / 2;
    const rclr = _AV_RARITY_CLR[av.rarity] || _AV_RARITY_CLR.common;
    const pg = this.add.graphics().setDepth(51);
    pg.fillStyle(0x14112a, 0.98); pg.fillRoundedRect(px, py, pw, ph, 14);
    pg.lineStyle(2, rclr.border, 1); pg.strokeRoundedRect(px, py, pw, ph, 14);
    layer.push(pg);

    const addT = (x, y, s, sz, col, bold) => {
      const t = txt(this, x, y, s, sz, col, bold).setDepth(52); layer.push(t); return t;
    };

    addT(W / 2, py + 16, `${av.badge} ${(av.name || '').replace(/^[^\s]+\s/, '')}`, 14, rclr.text, true).setOrigin(0.5);
    addT(W / 2, py + 36, av.description || '', 10, '#aaa').setOrigin(0.5);
    const sLine = `С+${av.effective_strength} Л+${av.effective_endurance} И+${av.effective_crit} В+${av.effective_hp_flat}`;
    addT(W / 2, py + 56, sLine, 11, '#ccc').setOrigin(0.5);
    addT(W / 2, py + 80, this._priceText(av), 14, '#ffc83c', true).setOrigin(0.5);

    const btnY = py + 105, btnW = 120, btnH = 36, btnX = W / 2 - btnW / 2;
    const btnG = this.add.graphics().setDepth(51);
    btnG.fillStyle(0x3366aa, 1); btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    layer.push(btnG);
    addT(W / 2, btnY + btnH / 2, 'Купить', 13, '#ffffff', true).setOrigin(0.5);
    const bz = this.add.zone(W / 2, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true }).setDepth(53)
      .on('pointerup', () => {
        this._closeOverlay();
        if (av.currency === 'gold' || av.currency === 'diamonds') this._doBuyGold(av);
        else if (av.currency === 'stars') this._doBuyStars(av);
      });
    layer.push(bz);

    if (av.currency === 'stars') {
      const uY = btnY + btnH + 8;
      const uG = this.add.graphics().setDepth(51);
      uG.fillStyle(0x2a5a2a, 1); uG.fillRoundedRect(btnX, uY, btnW, 28, 8);
      layer.push(uG);
      addT(W / 2, uY + 14, `$${av.usdt_price || '1'} USDT`, 11, '#4ade80', true).setOrigin(0.5);
      const uz = this.add.zone(W / 2, uY + 14, btnW, 28).setInteractive({ useHandCursor: true }).setDepth(53)
        .on('pointerup', () => { this._closeOverlay(); this._doBuyCrypto(av); });
      layer.push(uz);
    }

    addT(W / 2, py + ph - 18, 'Отмена', 11, '#888').setOrigin(0.5);
    const cz = this.add.zone(W / 2, py + ph - 18, 100, 24).setInteractive({ useHandCursor: true }).setDepth(53)
      .on('pointerup', () => this._closeOverlay());
    layer.push(cz);
    this._overlay = layer;
  },

  _showInfo(av) {
    if (this._overlay) return;
    const W = this.W, H = this.H, layer = [];
    const dim = this.add.graphics().setDepth(50);
    dim.fillStyle(0x000000, 0.7); dim.fillRect(0, 0, W, H); layer.push(dim);
    const pw = W - 60, ph = 110, px = 30, py = H / 2 - ph / 2;
    const pg = this.add.graphics().setDepth(51);
    pg.fillStyle(0x14112a, 0.98); pg.fillRoundedRect(px, py, pw, ph, 14);
    pg.lineStyle(2, 0xaa8822, 1); pg.strokeRoundedRect(px, py, pw, ph, 14);
    layer.push(pg);
    let info = '';
    if (av.currency === 'subscription') info = 'Разблокируется при Premium подписке';
    else if (av.currency === 'referral') info = 'Пригласи 5+ друзей';
    else if (av.currency === 'usdt_stars') info = 'Покупается на вкладке Элитный';
    txt(this, W / 2, py + 30, info, 12, '#ffc83c', true).setDepth(52).setOrigin(0.5);
    txt(this, W / 2, py + 55, av.description || '', 10, '#aaa').setDepth(52).setOrigin(0.5);
    txt(this, W / 2, py + ph - 16, 'Закрыть', 11, '#888').setDepth(52).setOrigin(0.5);
    const cz = this.add.zone(W / 2, py + ph / 2, pw, ph).setInteractive({ useHandCursor: true }).setDepth(53)
      .on('pointerup', () => this._closeOverlay());
    layer.push(cz);
    this._overlay = layer;
  },

  _closeOverlay() {
    if (this._overlay) {
      this._overlay.forEach(o => { try { o.destroy(); } catch(_) {} });
      this._overlay = null;
    }
  },

  async _doBuyGold(av) {
    try {
      const j = await post('/api/avatars/buy', { avatar_id: av.id });
      if (j.ok) {
        if (j.player) State.player = j.player;
        tg?.HapticFeedback?.notificationOccurred('success');
        this.scene.restart({ tab: this._tab });
      } else { tg?.showAlert?.(j.reason || 'Ошибка'); }
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
    try {
      const j = await post('/api/avatars/premium/stars_invoice', { avatar_id: av.id });
      if (j.ok && j.invoice_url) {
        tg?.openInvoice?.(j.invoice_url, async (status) => {
          if (status === 'paid') {
            await post('/api/avatars/premium/stars_confirm', { avatar_id: av.id });
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
