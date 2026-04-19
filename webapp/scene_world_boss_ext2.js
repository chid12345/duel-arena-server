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

    this._addText(16, y, '★ 1-UP SCROLLS — ВОСКРЕШЕНИЕ ★', 11, '#ff4488', true);
    y += 18;

    const bw = Math.floor((W - 32 - 16) / 3);
    RES.forEach((sc, i) => {
      const x   = 16 + i * (bw + 8);
      const qty = inv[sc.id] || 0;

      const bg = this.add.graphics(); bg._wbChild = true;
      bg.fillStyle(qty > 0 ? 0x1a0010 : 0x080018, 0.97);
      bg.fillRoundedRect(x, y, bw, 48, 6);
      bg.lineStyle(qty > 0 ? 2 : 1, qty > 0 ? 0x880022 : 0x220044, qty > 0 ? 0.9 : 0.7);
      bg.strokeRoundedRect(x, y, bw, 48, 6);

      this._addText(x + bw / 2, y + 11, `${sc.icon} ${sc.label}`, 10, qty > 0 ? '#ff44cc' : '#bb88ee', true).setOrigin(0.5);
      this._addText(x + bw / 2, y + 25, `${sc.price}${sc.cur}`, 10,
        qty > 0 ? '#ffee00' : '#9977cc').setOrigin(0.5);
      this._addText(x + bw / 2, y + 38, `×${qty}`, 9,
        qty > 0 ? '#ff0088' : '#8866aa').setOrigin(0.5);

      const z = this.add.zone(x, y, bw, 48).setOrigin(0).setInteractive({ useHandCursor: true });
      z._wbChild = true;
      z.on('pointerup', () => this._buyResScroll(sc.id));
    });
  },

  async _buyResScroll(iid) {
    if (this._buying) return;
    this._buying = true;
    let ok = false;
    try {
      const r = await post('/api/shop/buy', { item_id: iid });
      if (r.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast('🕯️ Свитки → инвентарь');
        this._refresh();
        ok = true;
      } else {
        this._toast('❌ ' + (r.reason || r.detail || 'Ошибка'));
      }
    } catch (_) { this._toast('❌ Ошибка сети'); }
    // После успешной покупки держим блокировку пока refresh не завершится (~1.5с)
    if (ok) { setTimeout(() => { this._buying = false; }, 1500); }
    else { this._buying = false; }
  },

});
