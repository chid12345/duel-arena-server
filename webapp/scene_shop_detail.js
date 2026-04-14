/* ═══════════════════════════════════════════════════════════
   ShopScene detail — попап с подробностями предмета.
   Тап на карточку (не на кнопку цены) → открывает этот попап.
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  /* ── Открыть попап ──────────────────────────────────────── */
  _showItemDetail(item) {
    this._closeItemDetail();
    const { W, H } = this;
    const layer = []; this._detailLayer = layer;
    this._detailItem = item;

    const isDia = item.currency === 'diamonds';
    const canBuy = this._canAfford(item);

    // ── Dim overlay ──
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(200);
    dim.setInteractive();
    dim.on('pointerup', () => this._closeItemDetail());
    layer.push(dim);

    // ── Panel sizing ──
    const pW = W - 40, pX = 20;
    let contentH = 0;

    // Считаем высоту контента
    contentH += 16;          // top pad
    contentH += 36;          // icon
    contentH += 4;           // gap
    contentH += 20;          // name
    contentH += 16;          // divider + gap
    const descLines = Math.ceil((item.desc || '').length / 28);
    contentH += Math.max(1, descLines) * 16 + 4; // description
    if (item.badge) contentH += 22;   // badge
    if (item.hpPct && State.player) contentH += 18; // hp bar
    contentH += 12;          // gap before button
    contentH += 38;          // button
    contentH += 16;          // bottom pad

    const pH = contentH;
    const pY = Math.round((H - pH) / 2);

    // ── Panel bg ──
    const panel = this.add.graphics().setDepth(201);
    panel.fillStyle(C.bgPanel, 0.98);
    panel.fillRoundedRect(pX, pY, pW, pH, 14);
    panel.lineStyle(2, C.gold, 0.4);
    panel.strokeRoundedRect(pX, pY, pW, pH, 14);
    layer.push(panel);

    // Block zone — чтобы тап по панели не закрывал
    const blockZ = this.add.zone(pX + pW / 2, pY + pH / 2, pW, pH)
      .setInteractive().setDepth(201);
    blockZ.on('pointerup', () => {}); // eat event
    layer.push(blockZ);

    // ── Close button ✕ ──
    const cg = this.add.graphics().setDepth(202);
    cg.fillStyle(0x3a2020, 1);
    cg.fillRoundedRect(pX + pW - 34, pY + 8, 26, 22, 7);
    cg.lineStyle(1, 0xff6666, 0.6);
    cg.strokeRoundedRect(pX + pW - 34, pY + 8, 26, 22, 7);
    layer.push(cg);
    layer.push(txt(this, pX + pW - 21, pY + 19, '✕', 12, '#ffaaaa', true)
      .setOrigin(0.5).setDepth(203));
    const cz = this.add.zone(pX + pW - 21, pY + 19, 30, 26)
      .setInteractive({ useHandCursor: true }).setDepth(204);
    cz.on('pointerup', () => this._closeItemDetail());
    layer.push(cz);

    // ── Content layout ──
    let cy = pY + 16;
    const cx = W / 2;

    // Icon (large)
    layer.push(txt(this, cx, cy + 18, item.icon, 32).setOrigin(0.5).setDepth(202));
    cy += 40;

    // Name
    layer.push(txt(this, cx, cy, item.name, 14, '#ffe888', true).setOrigin(0.5).setDepth(202));
    cy += 22;

    // Divider line
    const divG = this.add.graphics().setDepth(202);
    divG.lineStyle(1, C.gold, 0.3);
    divG.lineBetween(pX + 24, cy, pX + pW - 24, cy);
    layer.push(divG);
    cy += 10;

    // Description (multiline wrap)
    const descText = item.desc || '';
    const descObj = this.add.text(cx, cy, descText, {
      fontSize: '12px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      color: '#c8a878',
      align: 'center',
      wordWrap: { width: pW - 48 },
      lineSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(202);
    layer.push(descObj);
    cy += descObj.height + 8;

    // Badge (if exists)
    if (item.badge) {
      const badgeColor = item.risk ? 0x7a1a1a : 0x1a3a6a;
      const badgeTextColor = item.risk ? '#ff8888' : '#88ccff';
      const badgeW = 70, badgeH = 18;
      const bg2 = this.add.graphics().setDepth(202);
      bg2.fillStyle(badgeColor, 0.9);
      bg2.fillRoundedRect(cx - badgeW / 2, cy, badgeW, badgeH, 6);
      layer.push(bg2);
      layer.push(txt(this, cx, cy + badgeH / 2, item.badge, 10, badgeTextColor, true)
        .setOrigin(0.5).setDepth(203));
      cy += badgeH + 6;
    }

    // HP bar (if potion)
    if (item.hpPct && State.player) {
      const p = State.player;
      const cur = Math.min(1, (p.current_hp || 0) / Math.max(1, p.max_hp || 1));
      const addPct = Math.min(item.hpPct, 1 - cur);
      const barW = pW - 60, barX = pX + 30;
      layer.push(makeBar(this, barX, cy, barW, 7, cur, C.red, C.dark, 4).setDepth(202));
      if (addPct > 0) {
        const prev = Math.round(barW * cur), add = Math.round(barW * addPct);
        const addG = this.add.graphics().setDepth(203);
        addG.fillStyle(C.green, 0.75);
        addG.fillRoundedRect(barX + prev, cy, add, 7, 3);
        layer.push(addG);
      }
      layer.push(txt(this, cx, cy + 9, `❤️ ${p.current_hp || 0}/${p.max_hp || 0}`, 9, '#ff8888')
        .setOrigin(0.5, 0).setDepth(203));
      cy += 22;
    }

    cy += 6;

    // ── Buy button ──
    const btnW = pW - 40, btnH = 36;
    const btnX = pX + 20, btnY = cy;
    const btnG = this.add.graphics().setDepth(202);
    if (canBuy) {
      btnG.fillStyle(isDia ? 0x0e2838 : 0x3a2a08, 1);
      btnG.lineStyle(2, isDia ? 0x3cc8dc : C.gold, 0.7);
    } else {
      btnG.fillStyle(0x1e1e2e, 0.7);
      btnG.lineStyle(1, 0x444466, 0.5);
    }
    btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 10);
    layer.push(btnG);

    const pIcon = isDia ? '💎' : '🪙';
    const buyLabel = canBuy
      ? `${pIcon} ${item.price} — Купить`
      : `Нужно ${item.price} ${isDia ? '💎' : '🪙'}`;
    const buyColor = canBuy ? (isDia ? '#3ce8ff' : '#ffe888') : '#888888';
    layer.push(txt(this, pX + pW / 2, btnY + btnH / 2, buyLabel, 13, buyColor, true)
      .setOrigin(0.5).setDepth(203));

    const buyZ = this.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true }).setDepth(204);
    buyZ.on('pointerup', () => {
      if (!canBuy) { this._toastNoMoney(item); return; }
      this._closeItemDetail();
      this._doBuy(item);
    });
    layer.push(buyZ);

    // Animate in
    layer.forEach(o => {
      if (o === dim) return;
      if (o.setAlpha) o.setAlpha(0);
    });
    this.tweens.add({
      targets: layer.filter(o => o !== dim && o.setAlpha),
      alpha: 1, duration: 180, ease: 'Power2',
    });
  },

  /* ── Закрыть попап ──────────────────────────────────────── */
  _closeItemDetail() {
    if (!this._detailLayer) return;
    this._detailLayer.forEach(o => { try { o.destroy(); } catch (_) {} });
    this._detailLayer = null;
    this._detailItem = null;
  },
});
