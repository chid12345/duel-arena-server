/* ═══════════════════════════════════════════════════════════
   ShopScene ext1 — _makeItemCard, _drawCardBg, _canAfford,
                    _doBuy, _toastNoMoney
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  /* ── Карточка товара ─────────────────────────────────── */
  _makeItemCard(item, ix, iy, iw, ih) {
    const canBuy = this._canAfford(item);
    const bg = this.add.graphics();
    this._drawCardBg(bg, ix, iy, iw, ih, true, canBuy);

    txt(this, ix + iw / 2, iy + 20, item.icon, 24).setOrigin(0.5);

    const name = txt(this, ix + iw / 2, iy + 50, item.name, 10, '#c0c0e0')
      .setOrigin(0.5).setWordWrapWidth(iw - 10);

    if (item.badge) {
      const bx = ix + iw - 4, by2 = iy + 4;
      const badgeG = this.add.graphics();
      badgeG.fillStyle(item.risk ? 0x7a1a1a : 0x1a3a6a, 0.9);
      badgeG.fillRoundedRect(bx - 34, by2, 34, 13, 4);
      txt(this, bx - 17, by2 + 6, item.badge, 8, item.risk ? '#ff8888' : '#88aaff').setOrigin(0.5);
    }

    if (item.hpPct && State.player) {
      const p = State.player;
      const cur = Math.min(1, (p.current_hp || 0) / Math.max(1, p.max_hp || 1));
      const addPct = Math.min(item.hpPct, 1 - cur);
      makeBar(this, ix + 8, iy + 68, iw - 16, 5, cur, C.red, C.dark, 3);
      if (addPct > 0) {
        const bw = iw - 16, prev = Math.round(bw * cur), add = Math.round(bw * addPct);
        const addG = this.add.graphics();
        addG.fillStyle(C.green, 0.75);
        addG.fillRoundedRect(ix + 8 + prev, iy + 68, add, 5, 2);
      }
    }

    // Цена
    const pIcon  = item.currency === 'diamonds' ? '💎' : '🪙';
    const pColor = item.currency === 'diamonds' ? '#3cc8dc' : '#ffc83c';
    txt(this, ix + iw / 2, iy + 90, `${pIcon} ${item.price}`,
      12, canBuy ? pColor : '#cc8888', true).setOrigin(0.5);

    // Зона клика
    this.add.zone(ix, iy, iw, ih).setOrigin(0)
      .setInteractive({ useHandCursor: canBuy })
      .on('pointerdown', () => {
        if (!canBuy || this._buying) return;
        this._drawCardBg(bg, ix, iy, iw, ih, true, true, true);
        tg?.HapticFeedback?.impactOccurred('medium');
      })
      .on('pointerup', () => {
        this._drawCardBg(bg, ix, iy, iw, ih, true, canBuy);
        if (this._swiping) return; // свайп — не покупаем
        if (!canBuy) { this._toastNoMoney(item); return; }
        if (this._buying) return;
        this._doBuy(item);
      })
      .on('pointerout', () => this._drawCardBg(bg, ix, iy, iw, ih, true, canBuy));
  },

  /* ── Карточка товара (для scroll-контейнера) ──────────── */
  _makeItemCardInContainer(container, item, ix, iy, iw, ih) {
    const canBuy = this._canAfford(item);
    const bg = this.add.graphics();
    this._drawCardBg(bg, ix, iy, iw, ih, true, canBuy);
    container.add(bg);

    container.add(txt(this, ix + iw / 2, iy + 20, item.icon, 24).setOrigin(0.5));
    container.add(txt(this, ix + iw / 2, iy + 50, item.name, 10, '#c0c0e0')
      .setOrigin(0.5).setWordWrapWidth(iw - 10));

    if (item.badge) {
      const bx = ix + iw - 4, by2 = iy + 4;
      const badgeG = this.add.graphics();
      badgeG.fillStyle(item.risk ? 0x7a1a1a : 0x1a3a6a, 0.9);
      badgeG.fillRoundedRect(bx - 34, by2, 34, 13, 4);
      container.add(badgeG);
      container.add(txt(this, bx - 17, by2 + 6, item.badge, 8, item.risk ? '#ff8888' : '#88aaff').setOrigin(0.5));
    }

    if (item.hpPct && State.player) {
      const p = State.player;
      const cur = Math.min(1, (p.current_hp || 0) / Math.max(1, p.max_hp || 1));
      const addPct = Math.min(item.hpPct, 1 - cur);
      container.add(makeBar(this, ix + 8, iy + 68, iw - 16, 5, cur, C.red, C.dark, 3));
      if (addPct > 0) {
        const bw = iw - 16, prev = Math.round(bw * cur), add = Math.round(bw * addPct);
        const addG = this.add.graphics();
        addG.fillStyle(C.green, 0.75);
        addG.fillRoundedRect(ix + 8 + prev, iy + 68, add, 5, 2);
        container.add(addG);
      }
    }

    const pIcon  = item.currency === 'diamonds' ? '💎' : '🪙';
    const pColor = item.currency === 'diamonds' ? '#3cc8dc' : '#ffc83c';
    container.add(txt(this, ix + iw / 2, iy + 90, `${pIcon} ${item.price}`,
      12, canBuy ? pColor : '#cc8888', true).setOrigin(0.5));
  },

  _drawCardBg(bg, ix, iy, iw, ih, avail, canBuy, pressed = false) {
    bg.clear();
    bg.fillStyle(pressed ? C.dark : C.bgPanel, avail ? 0.92 : 0.55);
    bg.fillRoundedRect(ix, iy, iw, ih, 12);
    if (canBuy) {
      bg.lineStyle(1.5, C.gold, pressed ? 0.7 : 0.35);
    } else if (avail) {
      bg.lineStyle(1, 0x553333, 0.5);
    }
    bg.strokeRoundedRect(ix, iy, iw, ih, 12);
  },

  _canAfford(item) {
    const p = State.player;
    if (!p) return false;
    return item.currency === 'diamonds'
      ? (p.diamonds || 0) >= item.price
      : (p.gold || 0) >= item.price;
  },

  /* ── Покупка ─────────────────────────────────────────── */
  async _doBuy(item) {
    if (this._buying) return;
    this._buying = true;
    try {
      const res = await post('/api/shop/buy', { item_id: item.id });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.buy();
        if (res.player) State.player = res.player;
        let msg = `✅ Куплено: ${item.name}`;
        if (res.hp_restored > 0) msg = `❤️ +${res.hp_restored} HP восстановлено!`;
        if (res.gold_gained)     msg = `💰 +${res.gold_gained} золота!`;
        if (res.added_to_inventory) msg = `📦 ${item.icon} ${item.name} → в инвентарь (открой в «Моё»)`;
        this._toast(msg);
        this._goldTxt?.setText(`🪙 ${State.player?.gold || 0}`);
        this._diaTxt?.setText(`💎 ${State.player?.diamonds || 0}`);
        this.time.delayedCall(400, () => this.scene.restart({ tab: this._tab }));
      } else {
        tg?.HapticFeedback?.notificationOccurred('error');
        const detail = res._httpStatus ? ` (HTTP ${res._httpStatus})` : '';
        this._toast(`❌ ${res.reason || res.detail || 'Ошибка'}${detail}`);
        this._buying = false;
      }
    } catch(e) {
      this._toast(`❌ Сеть: ${e.message || 'нет соединения'}`);
      this._buying = false;
    }
  },

  _toastNoMoney(item) {
    const cur = item.currency === 'diamonds' ? 'алмазов' : 'золота';
    this._toast(`Нужно ${item.price} ${cur}`);
  },

});
