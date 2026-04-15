/* ============================================================
   MenuScene — ext1b: _buildMorePanel
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _buildMorePanel() {
    const { W, CONTENT_H: CH } = this;
    const c = new Phaser.GameObjects.Container(this, 0, 0);
    const rmdl = o => { try { o.removeFromDisplayList(); } catch(_) {} return o; };

    const items = [
      { icon: '🛍️', label: 'Магазин',   cb: () => this.scene.start('Shop')   },
      { icon: '⚔️', label: 'Клан',      cb: () => this.scene.start('Clan')   },
      { icon: '🎭', label: 'Аватарки',  cb: () => this.scene.start('Avatar') },
      { icon: '🔗', label: 'Рефералка', cb: () => this._onInvite()           },
      { icon: '📖', label: 'Справка',   cb: () => this.scene.start('Guide')  },
    ];

    const cols = 2;
    const gap  = 10;
    const bw   = (W - gap * 3) / cols;
    const bh   = 90;
    const startY = 16;

    items.forEach((item, i) => {
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const bx   = gap + col * (bw + gap);
      const by   = startY + row * (bh + gap);
      const bcx  = bx + bw / 2;
      const bcy  = by + bh / 2;

      const bg = rmdl(this.add.graphics());
      bg.fillStyle(C.bgPanel, 0.93);
      bg.fillRoundedRect(bx, by, bw, bh, 14);
      bg.lineStyle(1.5, C.dark, 0.7);
      bg.strokeRoundedRect(bx, by, bw, bh, 14);
      c.add(bg);

      c.add(rmdl(txt(this, bcx, by + 26, item.icon, 30).setOrigin(0.5)));
      c.add(rmdl(txt(this, bcx, by + 68, item.label, 13, '#d0d0ee').setOrigin(0.5)));

      const zone = rmdl(this.add.zone(bcx, bcy, bw, bh).setInteractive({ useHandCursor: true }));
      zone.on('pointerdown', () => {
        bg.clear();
        bg.fillStyle(C.blue, 0.18);
        bg.fillRoundedRect(bx, by, bw, bh, 14);
        bg.lineStyle(1.5, C.blue, 0.6);
        bg.strokeRoundedRect(bx, by, bw, bh, 14);
        tg?.HapticFeedback?.selectionChanged();
      });
      zone.on('pointerup', () => {
        bg.clear();
        bg.fillStyle(C.bgPanel, 0.93);
        bg.fillRoundedRect(bx, by, bw, bh, 14);
        bg.lineStyle(1.5, C.dark, 0.7);
        bg.strokeRoundedRect(bx, by, bw, bh, 14);
        Sound.click();
        item.cb();
      });
      zone.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(C.bgPanel, 0.93);
        bg.fillRoundedRect(bx, by, bw, bh, 14);
        bg.lineStyle(1.5, C.dark, 0.7);
        bg.strokeRoundedRect(bx, by, bw, bh, 14);
      });
      c.add(zone);
    });

    const verY = CH - 32;
    const verBg = rmdl(this.add.graphics());
    verBg.fillStyle(0x1e1c30, 0.9);
    verBg.fillRoundedRect(W / 2 - 90, verY - 14, 180, 28, 8);
    verBg.lineStyle(1.5, C.gold, 0.35);
    verBg.strokeRoundedRect(W / 2 - 90, verY - 14, 180, 28, 8);
    c.add(verBg);
    c.add(rmdl(txt(this, W / 2, verY, `⚔️  Duel Arena  v${State.appVersion || '1.01'}`, 13, '#ffc83c', true).setOrigin(0.5)));
    c.add(rmdl(txt(this, W / 2, CH - 10, '@ZenDuelArena_bot', 10, '#ddddff').setOrigin(0.5)));

    this._panels.more = c;
  },

});
