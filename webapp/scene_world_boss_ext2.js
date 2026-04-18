/* ============================================================
   WorldBossScene — ext2: _renderResShop (покупка свитков воскрешения)
   Показывается в Waiting/Idle — чтобы купить ДО смерти в рейде.
   ============================================================ */

Object.assign(WorldBossScene.prototype, {

  _renderResShop(s, W, y) {
    const RES = [
      { id: 'res_30',  icon: '🕯️', label: '30% HP', price: 500, cur: '💰' },
      { id: 'res_60',  icon: '🔮', label: '60% HP', price: 40,  cur: '💎' },
      { id: 'res_100', icon: '✨', label: '100% HP', price: 80,  cur: '💎' },
    ];
    const inv = s?.res_scrolls_inv || {};

    this._addText(16, y, '🕯️ Свитки воскрешения', 11, '#ffaaaa', true);
    y += 18;

    const bw = Math.floor((W - 32 - 16) / 3);
    RES.forEach((sc, i) => {
      const x   = 16 + i * (bw + 8);
      const qty = inv[sc.id] || 0;

      const bg = this.add.graphics(); bg._wbChild = true;
      bg.fillStyle(qty > 0 ? 0x3a1a1a : 0x1a1a2a, 0.95);
      bg.fillRoundedRect(x, y, bw, 48, 8);
      bg.lineStyle(1, qty > 0 ? 0xcc4444 : 0x333355, 0.8);
      bg.strokeRoundedRect(x, y, bw, 48, 8);

      this._addText(x + bw / 2, y + 11, `${sc.icon} ${sc.label}`, 10, '#ffffff', true).setOrigin(0.5);
      this._addText(x + bw / 2, y + 25, `${sc.price}${sc.cur}`, 10,
        qty > 0 ? '#ffc83c' : '#8888aa').setOrigin(0.5);
      this._addText(x + bw / 2, y + 38, `×${qty}`, 9,
        qty > 0 ? '#ff8888' : '#555577').setOrigin(0.5);

      const z = this.add.zone(x, y, bw, 48).setOrigin(0).setInteractive({ useHandCursor: true });
      z._wbChild = true;
      z.on('pointerup', () => this._buyResScroll(sc.id));
    });
  },

  async _buyResScroll(iid) {
    if (this._buying) return;
    this._buying = true;
    try {
      const r = await post('/api/shop/buy', { item_id: iid });
      if (r.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast('🕯️ Свитки → инвентарь');
        this._refresh();
      } else {
        this._toast('❌ ' + (r.reason || r.detail || 'Ошибка'));
      }
    } catch (_) { this._toast('❌ Ошибка сети'); }
    this._buying = false;
  },

});
