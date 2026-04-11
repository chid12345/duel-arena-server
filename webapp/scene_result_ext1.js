/* ============================================================
   ResultScene — ext1: _countUp, _levelUpFlash, _celebrate, _bigBtn, _mainBtn
   ============================================================ */

Object.assign(ResultScene.prototype, {

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
    flash.fillStyle(C.purple, 0.55);
    flash.fillRect(0, 0, W, H);
    this.tweens.add({ targets: flash, alpha: 0, duration: 350, onComplete: () => flash.destroy() });

    const t = txt(this, W / 2, H * 0.48, '🎊  НОВЫЙ УРОВЕНЬ!', 30, '#cc88ff', true)
      .setOrigin(0.5).setScale(0).setAlpha(0).setDepth(51);
    this.tweens.add({
      targets: t, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut',
      onComplete: () => this.time.delayedCall(1400, () => {
        this.tweens.add({ targets: t, alpha: 0, y: t.y - 50, duration: 500, onComplete: () => t.destroy() });
      }),
    });
    Sound.questDone();
    tg?.HapticFeedback?.notificationOccurred('success');
  },

  _celebrate(W, H) {
    const cols = [0xffc83c, 0x5096ff, 0xb45aff, 0x3cc864, 0xff8800, 0xff4488, 0x3cc8dc];
    for (let i = 0; i < 55; i++) {
      const c    = this.add.graphics();
      const col  = Phaser.Math.RND.pick(cols);
      const sz   = Phaser.Math.Between(4, 10);
      const rect = Math.random() > 0.45;
      const sx   = Phaser.Math.Between(0, W);
      c.fillStyle(col, 0.92);
      if (rect) c.fillRect(-sz / 2, -sz / 2, sz, sz * 1.7);
      else      c.fillCircle(0, 0, sz / 2);
      c.x = sx; c.y = Phaser.Math.Between(-40, 0);
      c.angle = Phaser.Math.Between(0, 360);
      this.tweens.add({
        targets: c,
        y: H + 40, alpha: 0,
        x: sx + Phaser.Math.Between(-90, 90),
        angle: c.angle + Phaser.Math.Between(-200, 200),
        duration: Phaser.Math.Between(1500, 3000),
        delay: Phaser.Math.Between(0, 1000),
        ease: 'Quad.easeIn',
        onComplete: () => c.destroy(),
      });
    }
  },

  _bigBtn(x, y, label, fillColor, textColor, cb) {
    const BW = 260, BH = 52;
    const g = this.add.graphics();
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x - BW / 2, y - BH / 2, BW, BH, 14);
    g.fillStyle(0xffffff, 0.14);
    g.fillRoundedRect(x - BW / 2 + 4, y - BH / 2 + 4, BW - 8, BH * 0.46, 10);
    txt(this, x, y, label, 17, textColor, true).setOrigin(0.5);
    const z = this.add.zone(x, y, BW, BH).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => { g.clear(); g.fillStyle(fillColor, 0.65); g.fillRoundedRect(x-BW/2, y-BH/2, BW, BH, 14); tg?.HapticFeedback?.impactOccurred('medium'); });
    z.on('pointerup',   () => { g.clear(); g.fillStyle(fillColor, 1); g.fillRoundedRect(x-BW/2, y-BH/2, BW, BH, 14); g.fillStyle(0xffffff,0.14); g.fillRoundedRect(x-BW/2+4, y-BH/2+4, BW-8, BH*0.46, 10); cb(); });
    z.on('pointerout',  () => { g.clear(); g.fillStyle(fillColor, 1); g.fillRoundedRect(x-BW/2, y-BH/2, BW, BH, 14); g.fillStyle(0xffffff,0.14); g.fillRoundedRect(x-BW/2+4, y-BH/2+4, BW-8, BH*0.46, 10); });
  },

  _mainBtn(x, y, label, cb) {
    const BW = 200, BH = 38;
    const g = this.add.graphics();
    g.fillStyle(C.dark, 0.9);
    g.fillRoundedRect(x - BW / 2, y - BH / 2, BW, BH, 10);
    g.lineStyle(1.5, C.blue, 0.4);
    g.strokeRoundedRect(x - BW / 2, y - BH / 2, BW, BH, 10);
    txt(this, x, y, label, 14, '#f0f0fa', true).setOrigin(0.5);
    const z = this.add.zone(x, y, BW, BH).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); cb(); });
  }

});
