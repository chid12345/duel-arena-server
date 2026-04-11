/* ============================================================
   ClanScene — ext3: _showTransferConfirm, _transferLeader, _toast
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _showTransferConfirm(member, W, H) {
    /* Затемнение */
    const ov = this.add.graphics().setDepth(90);
    ov.fillStyle(0x000000, 0.6); ov.fillRect(0, 0, W, H);

    /* Попап */
    const pw = W - 48, ph = 168, px = 24, py = Math.round((H - ph) / 2);
    const D = 92;
    const bg = this.add.graphics().setDepth(D);
    bg.fillStyle(0x1e3060, 1); bg.fillRoundedRect(px, py, pw, ph, 14);
    bg.lineStyle(2, 0xffc83c, 0.9); bg.strokeRoundedRect(px, py, pw, ph, 14);

    txt(this, px+pw/2, py+22, '👑 Передача лидерства', 14, '#ffc83c', true)
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+46, 'Передать лидерство игроку:', 11, '#a8c4ff')
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+66, `${member.username || `User${member.user_id}`}`, 14, '#f0f0fa', true)
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+86, 'Отменить нельзя! Вы станете обычным участником.', 10, '#888888')
      .setOrigin(0.5).setDepth(D);

    const destroy = () => {
      [ov, bg, ...this._transferObjs].forEach(o => { try { o.destroy(); } catch(_){} });
      this._transferObjs = [];
    };

    /* Кнопка «Отмена» */
    const cx = px+8, cw = (pw-24)/2, ch = 38, cy = py+116;
    const cBg = this.add.graphics().setDepth(D);
    cBg.fillStyle(0x303060, 1); cBg.fillRoundedRect(cx, cy, cw, ch, 9);
    const cT = txt(this, cx+cw/2, cy+ch/2, '❌ Отмена', 12, '#a0a0ff', true)
      .setOrigin(0.5).setDepth(D);
    this.add.zone(cx, cy, cw, ch).setOrigin(0).setDepth(D+5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { cBg.clear(); cBg.fillStyle(0x202040,1); cBg.fillRoundedRect(cx,cy,cw,ch,9); })
      .on('pointerout',  () => { cBg.clear(); cBg.fillStyle(0x303060,1); cBg.fillRoundedRect(cx,cy,cw,ch,9); })
      .on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); destroy(); });

    /* Кнопка «Передать» */
    const ox = cx+cw+8, ow = cw;
    const oBg = this.add.graphics().setDepth(D);
    oBg.fillStyle(0x3a2800, 1); oBg.fillRoundedRect(ox, cy, ow, ch, 9);
    oBg.lineStyle(1.5, 0xffc83c, 0.8); oBg.strokeRoundedRect(ox, cy, ow, ch, 9);
    const oT = txt(this, ox+ow/2, cy+ch/2, '👑 Передать', 12, '#ffc83c', true)
      .setOrigin(0.5).setDepth(D);
    const oZ = this.add.zone(ox, cy, ow, ch).setOrigin(0).setDepth(D+5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { oBg.clear(); oBg.fillStyle(0x5a4000,1); oBg.fillRoundedRect(ox,cy,ow,ch,9); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  () => { oBg.clear(); oBg.fillStyle(0x3a2800,1); oBg.fillRoundedRect(ox,cy,ow,ch,9); oBg.lineStyle(1.5,0xffc83c,0.8); oBg.strokeRoundedRect(ox,cy,ow,ch,9); })
      .on('pointerup', () => { destroy(); this._transferLeader(member.user_id); });

    this._transferObjs = [cBg, cT, oBg, oT, oZ,
      this.add.zone(0, 0, W, H).setOrigin(0).setDepth(89).setInteractive()
        .on('pointerup', () => destroy()),
    ];
  },

  async _transferLeader(newLeaderId) {
    if (this._busy) return; this._busy = true;
    try {
      const res = await post('/api/clan/transfer_leader', { new_leader_id: newLeaderId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast('👑 Лидерство передано!');
        this.time.delayedCall(700, () => this.scene.restart({ sub: 'main' }));
      } else { this._toast(`❌ ${res.reason}`); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  },

  _toast(msg) {
    const t = txt(this, this.W/2, this.H-80, msg, 12, '#ffc83c', true).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y-36, duration: 2400, onComplete: () => t.destroy() });
  },

});
