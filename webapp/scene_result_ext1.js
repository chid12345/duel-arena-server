/* ============================================================
   ResultScene ext1 — _countUp, _levelUpFlash, _celebrate,
                      _bigBtn, _mainBtn, _histBtn
   [cyberpunk redesign]
   ============================================================ */

Object.assign(ResultScene.prototype, {

  _cyberPanel(x, y, w, h, col) {
    const g = this.add.graphics(), cut = 11;
    g.fillStyle(col, 0.09); g.fillRoundedRect(x-5, y-5, w+10, h+10, 5);
    g.fillStyle(0x060610, 0.94); g.fillRect(x, y, w, h);
    g.lineStyle(1.5, col, 0.9);
    g.beginPath();
    g.moveTo(x+cut, y); g.lineTo(x+w-cut, y); g.lineTo(x+w, y+cut);
    g.lineTo(x+w, y+h-cut); g.lineTo(x+w-cut, y+h);
    g.lineTo(x+cut, y+h); g.lineTo(x, y+h-cut); g.lineTo(x, y+cut);
    g.closePath(); g.strokePath();
    g.lineStyle(1, col, 0.22); g.moveTo(x+cut+4, y+2); g.lineTo(x+w-cut-4, y+2); g.strokePath();
  },

  _countUp(textObj, target, prefix, suffix, delay) {
    if (!target || target <= 0) { textObj.setText(`${prefix}0${suffix}`); return; }
    const steps = 22, stepMs = 35;
    this.time.delayedCall(delay, () => {
      let s = 0;
      this.time.addEvent({
        delay: stepMs, repeat: steps - 1,
        callback: () => {
          s++;
          textObj.setText(`${prefix}${Math.round(target * s / steps)}${suffix}`);
          if (s >= steps) textObj.setText(`${prefix}${target}${suffix}`);
        },
      });
    });
  },

  _levelUpFlash(W, H) {
    const flash = this.add.graphics().setDepth(50);
    flash.fillStyle(0x8800cc, 0.52);
    flash.fillRect(0, 0, W, H);
    this.tweens.add({ targets: flash, alpha: 0, duration: 360, onComplete: () => flash.destroy() });

    const glow = this.add.graphics().setDepth(51).setAlpha(0);
    glow.fillStyle(0xcc88ff, 0.18);
    glow.fillRoundedRect(W/2-158, H*0.445, 316, 58, 8);
    this.tweens.add({ targets: glow, alpha: 1, duration: 280 });

    const t = this.add.text(W/2, H*0.476, '🎊  НОВЫЙ УРОВЕНЬ!', {
      fontFamily: 'Arial Black, Arial', fontSize: '27px', fontStyle: 'bold', color: '#cc88ff',
      shadow: { offsetX: 0, offsetY: 0, color: '#cc88ff', blur: 22, fill: true }
    }).setOrigin(0.5).setScale(0).setAlpha(0).setDepth(51);
    this.tweens.add({
      targets: t, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut',
      onComplete: () => this.time.delayedCall(1400, () => {
        this.tweens.add({ targets: [t, glow], alpha: 0, y: t.y - 48, duration: 500,
          onComplete: () => { t.destroy(); glow.destroy(); } });
      }),
    });
    Sound.questDone();
    tg?.HapticFeedback?.notificationOccurred('success');
  },

  _celebrate(W, H) {
    const cols = [0x00ffcc, 0xff00aa, 0xffd700, 0x00e5ff, 0x88ff00, 0xff4488, 0xcc00ff];
    for (let i = 0; i < 52; i++) {
      const c = this.add.graphics();
      const col = Phaser.Math.RND.pick(cols);
      const sz = Phaser.Math.Between(3, 9);
      const sx = Phaser.Math.Between(0, W);
      c.fillStyle(col, 0.92);
      if (Math.random() > 0.45) c.fillRect(-sz/2, -sz/2, sz, sz*1.6);
      else c.fillCircle(0, 0, sz/2);
      c.x = sx; c.y = Phaser.Math.Between(-40, 0);
      c.angle = Phaser.Math.Between(0, 360);
      this.tweens.add({
        targets: c, y: H + 40, alpha: 0,
        x: sx + Phaser.Math.Between(-90, 90),
        angle: c.angle + Phaser.Math.Between(-200, 200),
        duration: Phaser.Math.Between(1500, 3000),
        delay: Phaser.Math.Between(0, 1000),
        ease: 'Quad.easeIn',
        onComplete: () => c.destroy(),
      });
    }
  },

  // Floating glow button — icon + text, no frame
  _floatBtn(x, y, iconKey, label, col, cb, iconSz, txtSz) {
    const gap = 11;
    const colHex = '#' + col.toString(16).padStart(6, '0');

    // Create text first to measure its width
    const lbl = this.add.text(-9999, y, label, {
      fontFamily: 'Arial Black, Arial', fontSize: txtSz + 'px', fontStyle: 'bold',
      color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 0, color: colHex, blur: 20, fill: true }
    }).setOrigin(0, 0.5);

    const totalW = iconSz + gap + lbl.width;
    const startX = x - totalW / 2;
    const iconX  = startX + iconSz / 2;

    // Soft glow blob behind icon
    const g = this.add.graphics();
    g.fillStyle(col, 0.22); g.fillCircle(iconX, y, iconSz * 0.58);
    g.fillStyle(col, 0.08); g.fillCircle(iconX, y, iconSz * 0.88);

    // Icon
    if (this.textures?.exists(iconKey))
      this.add.image(iconX, y, iconKey).setDisplaySize(iconSz, iconSz);

    // Reposition text
    lbl.setPosition(startX + iconSz + gap, y);

    // Hit zone
    const z = this.add.zone(x, y, totalW + 28, Math.max(iconSz, 40) + 10)
      .setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => {
      lbl.setAlpha(0.65);
      tg?.HapticFeedback?.impactOccurred('light');
    });
    z.on('pointerup',  () => { lbl.setAlpha(1); cb(); });
    z.on('pointerout', () => { lbl.setAlpha(1); });
  },

  _bigBtn(x, y, label, nCol, cb) {
    this._floatBtn(x, y, 'btn_fight', label, nCol, cb, 44, 17);
  },

  _mainBtn(x, y, label, cb) {
    this._floatBtn(x, y, 'btn_home', label, 0x7eb8ff, cb, 32, 14);
  },

  _histBtn(x, y, label, cb) {
    this._floatBtn(x, y, 'btn_history', label, 0x4499ff, cb, 30, 13);
  },

  _logBtn(x, y, label, cb) {
    this._floatBtn(x, y, 'btn_battle_log', label, 0xcc44ff, cb, 30, 13);
  },

});
