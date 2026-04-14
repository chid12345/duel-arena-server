/* ═══════════════════════════════════════════════════════════
   ShopScene ext4 — List+Preview карточки:
   _renderSectionLabel, _renderFeaturedCard, _renderRowCard
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  /* ── Заголовок секции ────────────────────────────────── */
  _renderSectionLabel(container, x, y, W, label) {
    const bg = this.add.graphics();
    bg.fillStyle(C.bgPanel, 0.6);
    bg.fillRoundedRect(x, y, W - x * 2, 22, 8);
    container.add(bg);
    container.add(txt(this, x + 10, y + 5, label, 10, '#ffc83c', true));
    return y + 28;
  },

  /* ── Крупная карточка (featured) ─────────────────────── */
  _renderFeaturedCard(container, item, x, y, w) {
    const canBuy = this._canAfford(item);
    const isDia  = item.currency === 'diamonds';
    const h = 66;
    const bg = this.add.graphics();
    bg.fillStyle(C.bgPanel, 0.95);
    bg.fillRoundedRect(x, y, w, h, 10);
    bg.lineStyle(1.5, isDia ? 0x1a3048 : 0x3a3010, canBuy ? 0.5 : 0.25);
    bg.strokeRoundedRect(x, y, w, h, 10);
    container.add(bg);

    container.add(txt(this, x + 22, y + h / 2, item.icon, 22).setOrigin(0.5));
    container.add(txt(this, x + 44, y + 14, item.name, 13, canBuy ? '#ffffff' : '#ccccdd', true));
    container.add(txt(this, x + 44, y + 32, item.desc || '', 11, '#ffffff'));

    if (item.badge) {
      const badgeG = this.add.graphics();
      badgeG.fillStyle(item.risk ? 0x7a1a1a : 0x1a3a6a, 0.9);
      badgeG.fillRoundedRect(x + 44, y + 46, 38, 14, 4);
      container.add(badgeG);
      container.add(txt(this, x + 63, y + 53, item.badge, 9, item.risk ? '#ff8888' : '#88aaff').setOrigin(0.5));
    }

    if (item.hpPct && State.player) {
      const p = State.player;
      const cur = Math.min(1, (p.current_hp || 0) / Math.max(1, p.max_hp || 1));
      const addPct = Math.min(item.hpPct, 1 - cur);
      container.add(makeBar(this, x + 44, y + 48, w - 120, 5, cur, C.red, C.dark, 3));
      if (addPct > 0) {
        const bw = w - 120, prev = Math.round(bw * cur), add = Math.round(bw * addPct);
        const addG = this.add.graphics();
        addG.fillStyle(C.green, 0.75);
        addG.fillRoundedRect(x + 44 + prev, y + 48, add, 5, 2);
        container.add(addG);
      }
    }

    const btnW = 64, btnH = 28, btnX = x + w - btnW - 10, btnY = y + (h - btnH) / 2;
    const btnG = this.add.graphics();
    btnG.fillStyle(isDia ? 0x0e1828 : 0x2a2208, canBuy ? 1 : 0.5);
    btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
    btnG.lineStyle(1, isDia ? 0x1a3048 : 0x3a3010, 0.6);
    btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 6);
    container.add(btnG);
    const pIcon = isDia ? '💎' : '🪙';
    const pCol  = canBuy ? (isDia ? '#3cc8dc' : '#ffc83c') : '#cc8888';
    container.add(txt(this, btnX + btnW / 2, btnY + btnH / 2, `${pIcon} ${item.price}`, 12, pCol, true).setOrigin(0.5));
    return { btnX, btnY, btnW, btnH };
  },

  /* ── Компактная строка (row) ─────────────────────────── */
  _renderRowCard(container, item, x, y, w) {
    const canBuy = this._canAfford(item);
    const isDia  = item.currency === 'diamonds';
    const h = 38;
    const bg = this.add.graphics();
    bg.fillStyle(0x161422, 0.9);
    bg.fillRoundedRect(x, y, w, h, 7);
    bg.lineStyle(1, 0x2a2844, 0.4);
    bg.strokeRoundedRect(x, y, w, h, 7);
    container.add(bg);

    container.add(txt(this, x + 16, y + h / 2, item.icon, 14).setOrigin(0.5));
    container.add(txt(this, x + 32, y + h / 2, item.name, 11, canBuy ? '#ffffff' : '#ccccdd', true).setOrigin(0, 0.5));
    const shortDesc = (item.desc || '').split('·')[0].trim();
    container.add(txt(this, x + w - 70, y + h / 2, shortDesc, 10, '#ffffff').setOrigin(1, 0.5));
    const pIcon = isDia ? '💎' : '🪙';
    const pCol  = canBuy ? (isDia ? '#3cc8dc' : '#ffc83c') : '#cc8888';
    container.add(txt(this, x + w - 8, y + h / 2, `${pIcon}${item.price}`, 11, pCol, true).setOrigin(1, 0.5));
    const btnX = x + w - 70, btnW = 70, btnY = y, btnH = h;
    return { btnX, btnY, btnW, btnH };
  },

});
