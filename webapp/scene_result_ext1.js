/* ============================================================
   ResultScene ext1 — _countUp, _levelUpFlash, _celebrate,
                      _cyberPanel, _iconBtn
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

  // Vertical card button — icon on top, neon glow, no background shapes
  _iconBtn(x, y, iconKey, label, color, cb, iconSize = 72) {
    const col32 = parseInt(color.replace('#', ''), 16);
    const img = this.textures?.exists(iconKey)
      ? this.add.image(x, y, iconKey).setDisplaySize(iconSize, iconSize)
      : null;
    // Neon drop-shadow glow follows icon shape (Phaser 3.60+ preFX)
    try { img?.preFX?.addGlow(col32, 12, 0, false, 0.1, 28); } catch(_) {}
    this.add.text(x, y + iconSize / 2 + 14, label, {
      fontFamily: 'Arial Black, Arial', fontSize: '12px', fontStyle: 'bold',
      color, align: 'center',
      shadow: { offsetX: 0, offsetY: 0, color, blur: 14, fill: true },
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y + 10, iconSize + 22, iconSize + 34)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => { img?.setAlpha(0.7); tg?.HapticFeedback?.impactOccurred('light'); });
    zone.on('pointerup',   () => { img?.setAlpha(1); cb(); });
    zone.on('pointerout',  () => { img?.setAlpha(1); });
  },

});
