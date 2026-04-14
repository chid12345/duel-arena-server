/* ============================================================
   ClanScene — ext3: управление составом и тосты
   ============================================================ */

Object.assign(ClanScene.prototype, {
  _showTransferConfirm(member, W, H) {
    this._showLeaderActionConfirm({
      title: '👑 Передача лидерства',
      subtitle: 'Передать лидерство игроку:',
      target: `${member.username || `User${member.user_id}`}`,
      note: 'Отменить нельзя. Вы станете участником.',
      confirmText: '👑 Передать',
      confirmColor: 0x3a2800,
      confirmStroke: 0xffc83c,
      onConfirm: () => this._transferLeader(member.user_id),
      W, H,
    });
  },

  _showKickConfirm(member, W, H) {
    this._showLeaderActionConfirm({
      title: '⛔ Исключить игрока',
      subtitle: 'Исключить из клана:',
      target: `${member.username || `User${member.user_id}`}`,
      note: 'Игрок сможет вступить обратно по приглашению.',
      confirmText: '⛔ Исключить',
      confirmColor: 0x2a1416,
      confirmStroke: 0xc06870,
      onConfirm: () => this._kickMember(member.user_id),
      W, H,
    });
  },

  _showDisbandConfirm(W, H) {
    this._showLeaderActionConfirm({
      title: '🧨 Распустить клан',
      subtitle: 'Все участники будут удалены из клана.',
      target: 'Действие необратимо',
      note: 'Клан и чат будут удалены полностью.',
      confirmText: '🧨 Распустить',
      confirmColor: 0x2a1416,
      confirmStroke: 0xc06870,
      onConfirm: () => this._disbandClan(),
      W, H,
    });
  },

  _showLeaderActionConfirm(opts) {
    const { title, subtitle, target, note, confirmText, confirmColor, confirmStroke, onConfirm, W, H } = opts;
    if (typeof this._leaderActionDestroy === 'function') {
      this._leaderActionDestroy();
    }
    const ov = this.add.graphics().setDepth(90);
    ov.fillStyle(0x000000, 0.6); ov.fillRect(0, 0, W, H);
    const pw = W - 48, ph = 170, px = 24, py = Math.round((H - ph) / 2);
    const D = 92;
    const bg = this.add.graphics().setDepth(D);
    bg.fillStyle(0x1e3060, 1); bg.fillRoundedRect(px, py, pw, ph, 14);
    bg.lineStyle(2, 0xffc83c, 0.9); bg.strokeRoundedRect(px, py, pw, ph, 14);
    const titleT = txt(this, px + pw / 2, py + 22, title, 14, '#ffc83c', true).setOrigin(0.5).setDepth(D);
    const subtitleT = txt(this, px + pw / 2, py + 46, subtitle, 11, '#a8c4ff').setOrigin(0.5).setDepth(D);
    const targetT = txt(this, px + pw / 2, py + 68, target, 13, '#f0f0fa', true).setOrigin(0.5).setDepth(D);
    const noteT = txt(this, px + pw / 2, py + 90, note, 10, '#cccccc').setOrigin(0.5).setDepth(D);

    const destroy = () => {
      (this._leaderActionObjs || []).forEach(o => { try { o.destroy(); } catch(_) {} });
      this._leaderActionObjs = [];
      this._leaderActionDestroy = null;
    };
    this._leaderActionDestroy = destroy;

    const cx = px + 8, cw = (pw - 24) / 2, ch = 38, cy = py + 118;
    const cBg = this.add.graphics().setDepth(D);
    cBg.fillStyle(0x303060, 1); cBg.fillRoundedRect(cx, cy, cw, ch, 9);
    const cT = txt(this, cx + cw / 2, cy + ch / 2, '❌ Отмена', 12, '#a0a0ff', true).setOrigin(0.5).setDepth(D);
    const cZ = this.add.zone(cx, cy, cw, ch).setOrigin(0).setDepth(D + 5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); destroy(); });

    const ox = cx + cw + 8, ow = cw;
    const oBg = this.add.graphics().setDepth(D);
    oBg.fillStyle(confirmColor, 1); oBg.fillRoundedRect(ox, cy, ow, ch, 9);
    oBg.lineStyle(1.5, confirmStroke, 0.8); oBg.strokeRoundedRect(ox, cy, ow, ch, 9);
    const oT = txt(this, ox + ow / 2, cy + ch / 2, confirmText, 12, '#ffc83c', true).setOrigin(0.5).setDepth(D);
    const oZ = this.add.zone(ox, cy, ow, ch).setOrigin(0).setDepth(D + 5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('heavy'); destroy(); onConfirm(); });

    const bgZ = this.add.zone(0, 0, W, H).setOrigin(0).setDepth(89).setInteractive()
      .on('pointerup', () => destroy());
    this._leaderActionObjs = [
      ov, bg, titleT, subtitleT, targetT, noteT,
      cBg, cT, cZ, oBg, oT, oZ, bgZ,
    ];
  },

  async _transferLeader(newLeaderId) {
    if (this._busy) return;
    this._busy = true;
    try {
      const res = await post('/api/clan/transfer_leader', { new_leader_id: newLeaderId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast('👑 Лидерство передано');
        this.time.delayedCall(700, () => this.scene.restart({ sub: 'main' }));
      } else this._toast(`❌ ${res.reason}`);
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
    this._busy = false;
  },

  async _kickMember(targetUserId) {
    if (this._busy) return;
    this._busy = true;
    try {
      const res = await post('/api/clan/kick', { target_user_id: targetUserId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast('⛔ Игрок исключен');
        this.time.delayedCall(500, () => this.scene.restart({ sub: 'main' }));
      } else this._toast(`❌ ${res.reason}`);
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
    this._busy = false;
  },

  async _disbandClan() {
    if (this._busy) return;
    this._busy = true;
    try {
      const res = await post('/api/clan/disband');
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (res.player) State.player = res.player;
        this._toast('🧨 Клан распущен');
        this.time.delayedCall(700, () => this.scene.restart({ sub: 'main' }));
      } else this._toast(`❌ ${res.reason}`);
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
    this._busy = false;
  },

  _toast(msg) {
    const t = txt(this, this.W / 2, this.H - 80, msg, 12, '#ffc83c', true).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 36, duration: 2400, onComplete: () => t.destroy() });
  },
});
