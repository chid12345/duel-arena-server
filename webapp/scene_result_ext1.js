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

  // Primary CTA button — cyberpunk neon angular
  _bigBtn(x, y, label, borderColor, cb) {
    const BW = 268, BH = 50, cut = 10;
    const g = this.add.graphics();
    const draw = () => {
      g.clear();
      g.fillStyle(borderColor, 0.11); g.fillRoundedRect(x-BW/2-5, y-BH/2-5, BW+10, BH+10, 5);
      g.fillStyle(borderColor, 0.16); g.fillRect(x-BW/2, y-BH/2, BW, BH);
      g.fillStyle(0xffffff, 0.06); g.fillRect(x-BW/2, y-BH/2, BW, BH*0.42);
      g.lineStyle(2, borderColor, 0.92);
      g.beginPath();
      g.moveTo(x-BW/2+cut, y-BH/2); g.lineTo(x+BW/2-cut, y-BH/2);
      g.lineTo(x+BW/2, y-BH/2+cut); g.lineTo(x+BW/2, y+BH/2-cut);
      g.lineTo(x+BW/2-cut, y+BH/2); g.lineTo(x-BW/2+cut, y+BH/2);
      g.lineTo(x-BW/2, y+BH/2-cut); g.lineTo(x-BW/2, y-BH/2+cut);
      g.closePath(); g.strokePath();
      g.lineStyle(1, borderColor, 0.35);
      g.moveTo(x-BW/2+cut+6, y+BH/2-3); g.lineTo(x+BW/2-cut-6, y+BH/2-3); g.strokePath();
    };
    draw();

    const colorHex = '#' + borderColor.toString(16).padStart(6, '0');
    this.add.text(x, y, label, {
      fontFamily: 'Arial Black, Arial', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 0, color: colorHex, blur: 14, fill: false }
    }).setOrigin(0.5);

    const z = this.add.zone(x, y, BW, BH).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => {
      g.clear(); g.fillStyle(borderColor, 0.32); g.fillRect(x-BW/2, y-BH/2, BW, BH);
      g.lineStyle(2, borderColor, 1); g.strokeRect(x-BW/2, y-BH/2, BW, BH);
      tg?.HapticFeedback?.impactOccurred('medium');
    });
    z.on('pointerup',  () => { draw(); cb(); });
    z.on('pointerout', () => { draw(); });
  },

  // Secondary button — dark with left accent stripe
  _mainBtn(x, y, label, cb) {
    const BW = 214, BH = 40;
    const g = this.add.graphics();
    g.fillStyle(0x08081a, 0.92); g.fillRect(x-BW/2, y-BH/2, BW, BH);
    g.lineStyle(1.5, 0x223355, 0.85); g.strokeRect(x-BW/2, y-BH/2, BW, BH);
    g.lineStyle(3, 0x0099cc, 0.9);
    g.moveTo(x-BW/2, y-BH/2+7); g.lineTo(x-BW/2, y+BH/2-7); g.strokePath();
    this.add.text(x, y, label, {
      fontFamily: 'Arial', fontSize: '14px', color: '#aac0dd'
    }).setOrigin(0.5);
    const z = this.add.zone(x, y, BW, BH).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); cb(); });
  },

  // Small side-by-side history buttons
  _histBtn(x, y, label, cb) {
    const BW = 158, BH = 34;
    const g = this.add.graphics();
    g.fillStyle(0x060614, 0.88); g.fillRect(x-BW/2, y-BH/2, BW, BH);
    g.lineStyle(1, 0x1a2840, 0.9); g.strokeRect(x-BW/2, y-BH/2, BW, BH);
    this.add.text(x, y, label, {
      fontFamily: 'Arial', fontSize: '12px', color: '#6677aa'
    }).setOrigin(0.5);
    const z = this.add.zone(x, y, BW, BH).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); cb(); });
  },

});
