/* ============================================================
   WorldBossScene — ext2: _renderResShop (покупка свитков воскрешения)
   Показывается в Waiting/Idle — чтобы купить ДО смерти в рейде.
   ============================================================ */

Object.assign(WorldBossScene.prototype, {

  _renderResShop(s, W, y) {
    const RES = [
      { id: 'res_30',  icon: '🕯️', label: '30% HP', price: 60,  cur: '💰' },
      { id: 'res_60',  icon: '🔮', label: '60% HP', price: 80,  cur: '💰' },
      { id: 'res_100', icon: '✨', label: '100% HP', price: 100, cur: '💰' },
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
      z.on('pointerup', () => this._showResDetail(sc));
    });
  },

  _showResDetail(sc) {
    const pIcon = sc.cur === '💎' ? '💎' : '🪙';
    const cur   = sc.cur === '💎' ? 'diamonds' : 'gold';
    const pLabel = sc.cur === '💎' ? 'алмазов' : 'золота';
    const hpMap = { res_30:'30%', res_60:'60%', res_100:'100%' };
    const rows =
      `<div class="spd-row"><span class="spd-row-ico">❤️</span><span class="spd-row-txt">Восстанавливает HP</span><span class="spd-row-val vc">${hpMap[sc.id] || sc.label}</span></div>`
    + `<div class="spd-row"><span class="spd-row-ico">⚡</span><span class="spd-row-txt">Срабатывает при гибели</span><span class="spd-row-val vg">автоматически</span></div>`
    + `<div class="spd-row"><span class="spd-row-ico">🎒</span><span class="spd-row-txt">Выдаётся</span><span class="spd-row-val vc">×10 зарядов</span></div>`;
    ShopHtml.showDetail({
      icon: sc.icon || '🕯️',
      name: `Свиток воскрешения ${sc.label}`,
      rows,
      price: sc.price,
      currency: cur,
      rarity: sc.cur === '💎' ? 'e' : 'r',
      actionLabel: `Купить за ${sc.price} ${pIcon}`,
      action: () => this._buyResScroll(sc.id),
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
        this._toast('🕯️ +1 свиток воскрешения в инвентаре!');
        // Оптимистично обновляем стейт и DOM — _shapeKey не включает инвентарь,
        // поэтому _refresh не вызовет _render, лобби осталось бы со старыми ×0.
        if (this._state?.res_scrolls_inv) {
          this._state.res_scrolls_inv[iid] = (this._state.res_scrolls_inv[iid] || 0) + 1;
        }
        try {
          const card = document.querySelector(`[data-act="buy-res"][data-id="${iid}"]`);
          if (card) {
            const cnt = card.querySelector('.wb-rb-cnt');
            if (cnt) {
              const qty = this._state?.res_scrolls_inv?.[iid] || 1;
              cnt.textContent = `×${qty}`;
              cnt.style.color = '#22dd88';
            }
          }
        } catch(_) {}
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
