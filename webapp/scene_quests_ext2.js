/* ============================================================
   QuestsScene — ext2: _buildDailyBonus (логин-бонус)
   ============================================================ */

Object.assign(QuestsScene.prototype, {

  /* ── Логин-бонус ─────────────────────────────────────────── */
  _buildDailyBonus(d, W, y) {
    const canClaim = d.can_claim, streak = d.streak || 0, bonus = d.bonus || 40;
    const bh = 80;
    const bg = this.add.graphics();
    bg.fillStyle(canClaim ? 0x0e2010 : C.bgPanel, 0.95);
    bg.fillRoundedRect(8, y, W-16, bh, 12);
    bg.lineStyle(2, canClaim ? C.green : C.dark, canClaim ? 0.7 : 0.25);
    bg.strokeRoundedRect(8, y, W-16, bh, 12);
    txt(this, 22, y+11, '🎁', 18);
    txt(this, 48, y+10, 'Ежедневный бонус', 12, canClaim ? '#3cc864' : '#ccccee', true);
    txt(this, 48, y+26, `Серия: ${streak} ${streak >= 7 ? '🔥' : '📅'} дней`, 10, '#ddddff');
    const dotW = (W - 72) / 7;
    for (let i = 0; i < 7; i++) {
      const dx = 48 + i * dotW;
      const ok = i < (streak % 7 || (streak > 0 && streak % 7 === 0 ? 7 : 0));
      const dg = this.add.graphics();
      dg.fillStyle(ok ? C.gold : C.dark, 1); dg.fillRoundedRect(dx, y+44, dotW-3, 7, 3);
      txt(this, dx+(dotW-3)/2, y+57, String(i+1), 7, ok ? '#ffc83c' : '#aaaaee').setOrigin(0.5);
    }
    if (canClaim) {
      /* Кнопка сбора — широкая, сразу бросается в глаза */
      const bw = W-32, bh2 = 28, bx = 16, by2 = y + bh + 4;
      const btnG = this.add.graphics();
      btnG.fillStyle(C.green, 1); btnG.fillRoundedRect(bx, by2, bw, bh2, 8);
      btnG.fillStyle(0xffffff, 0.12); btnG.fillRoundedRect(bx+2, by2+2, bw-4, 12, 6);
      const btnT = txt(this, bx+bw/2, by2+bh2/2, `🎁 Забрать ежедневный бонус  +${bonus}🪙`, 12, '#1a1a28', true).setOrigin(0.5);
      this.tweens.add({ targets: btnG, alpha: 0.82, duration: 750, yoyo: true, repeat: -1 });
      const zone = this.add.zone(bx, by2, bw, bh2).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => { btnG.clear(); btnG.fillStyle(0x20a050,1); btnG.fillRoundedRect(bx,by2,bw,bh2,8); tg?.HapticFeedback?.impactOccurred('medium'); });
      zone.on('pointerout',  () => { btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh2,8); });
      zone.on('pointerup', () => {
        if (this._claimBusy) return;
        this._claimBusy = true;
        zone.disableInteractive();
        btnT.setText('⏳...');
        this._claimDaily(btnG, btnT, bx, by2, bw, bh2, bonus);
      });
      return y + bh + bh2 + 8;
    } else {
      txt(this, W-24, y+bh/2, '✅', 15).setOrigin(1, 0.5);
      return y + bh;
    }
  },

});
