/* ============================================================
   BattlePassScene — прогресс Battle Pass
   ============================================================ */

class BattlePassScene extends Phaser.Scene {
  constructor() { super('BattlePass'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '🌟', 'БОЕВОЙ ПРОПУСК', 'Ежесезонные награды');
    _extraBack(this);
    this._claimBtns = {};
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    get('/api/battlepass').then(d => this._render(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _render(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }

    const bp             = data.bp             || {};
    const tiers          = data.tiers          || [];
    const endlessTiers   = data.endless_tiers  || [];
    const battles        = bp.battles_done     || 0;
    const wins           = bp.wins_done        || 0;
    const endlessDone    = data.endless_done   || 0;
    const endlessClaimed = data.endless_tier_claimed || 0;
    const claimed        = bp.last_claimed_tier || 0;

    txt(this, W/2, 84, `Боёв: ${battles}  ·  Побед: ${wins}  ·  🔥 Натиск: ${endlessDone}`, 11, '#8888aa').setOrigin(0.5);

    /* ── Обычные тиры ── */
    const startY = 104, rowH = 60;
    tiers.forEach((tier, i) => {
      const ry      = startY + i * rowH;
      const done    = battles >= tier.battles_needed && wins >= tier.wins_needed;
      const isClaim = done && claimed < tier.tier;
      const gotIt   = claimed >= tier.tier;
      const bg = this.add.graphics();
      const borderCol = gotIt ? C.gold : done ? C.green : C.dark;
      bg.fillStyle(C.bgPanel, 0.92);
      bg.fillRoundedRect(8, ry, W-16, rowH-6, 10);
      bg.lineStyle(1.5, borderCol, gotIt ? 0.7 : done ? 0.5 : 0.2);
      bg.strokeRoundedRect(8, ry, W-16, rowH-6, 10);
      const numBg = this.add.graphics();
      numBg.fillStyle(gotIt ? C.gold : done ? C.green : C.dark, 1);
      numBg.fillCircle(26, ry + (rowH-6)/2, 14);
      txt(this, 26, ry + (rowH-6)/2, String(tier.tier), 12, gotIt||done ? '#1a1a28' : '#8888aa', true).setOrigin(0.5);
      const condColor = done ? '#3cc864' : '#8888aa';
      txt(this, 48, ry + 8, `⚔️ ${tier.battles_needed} боёв  /  🏆 ${tier.wins_needed} побед`, 11, condColor);
      const barW = W - 156;
      makeBar(this, 48, ry + 24, barW, 5, Math.min(1, battles/tier.battles_needed), C.blue, C.dark, 3);
      makeBar(this, 48, ry + 33, barW, 5, Math.min(1, wins/tier.wins_needed), C.gold, C.dark, 3);
      txt(this, W-106, ry+8,  `💎${tier.diamonds}`, 11, '#3cc8dc');
      txt(this, W-106, ry+22, `💰${tier.gold}`,      11, '#ffc83c');
      if (gotIt) {
        txt(this, W-30, ry+(rowH-6)/2, '✅', 15).setOrigin(0.5);
      } else if (isClaim) {
        const bw=52, bh=24, bx=W-66, by2=ry+(rowH-6)/2-bh/2;
        const btnG = this.add.graphics();
        btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,7);
        const btnT = txt(this,bx+bw/2,by2+bh/2,'Взять',10,'#1a1a28',true).setOrigin(0.5);
        this.add.zone(bx,by2,bw,bh).setOrigin(0).setInteractive({useHandCursor:true})
          .on('pointerdown',()=>{btnG.clear();btnG.fillStyle(0x28a050,1);btnG.fillRoundedRect(bx,by2,bw,bh,7);})
          .on('pointerup',()=>this._claimTier(tier.tier,btnG,btnT,bg,bx,by2,bw,bh,ry,rowH))
          .on('pointerout',()=>{btnG.clear();btnG.fillStyle(C.green,1);btnG.fillRoundedRect(bx,by2,bw,bh,7);});
      } else {
        txt(this, W-30, ry+(rowH-6)/2, '🔒', 13).setOrigin(0.5);
      }
    });

    /* ── Натиск-бонусы ── */
    let ny = startY + tiers.length * rowH + 10;
    const sepG = this.add.graphics();
    sepG.lineStyle(1, 0xdc3c46, 0.4); sepG.lineBetween(8, ny, W-8, ny);
    txt(this, W/2, ny+4, '🔥 НАТИСК-БОНУСЫ', 10, '#ff8855', true).setOrigin(0.5);
    ny += 16;
    endlessTiers.forEach(et => {
      const ey    = ny;
      const done2 = endlessDone >= et.needed;
      const got   = endlessClaimed >= et.tier;
      const canCl = done2 && !got;
      const ebG   = this.add.graphics();
      ebG.fillStyle(got ? 0x1a1000 : done2 ? 0x1a0e00 : C.bgPanel, 0.92);
      ebG.fillRoundedRect(8, ey, W-16, 46, 9);
      ebG.lineStyle(1.5, got ? C.gold : done2 ? 0xdc3c46 : C.dark, got||done2 ? 0.6 : 0.2);
      ebG.strokeRoundedRect(8, ey, W-16, 46, 9);
      txt(this, 22, ey+23, '🔥', 16).setOrigin(0.5);
      txt(this, 40, ey+10, et.label, 11, done2 ? '#ff8855' : '#9999bb', done2);
      makeBar(this, 40, ey+26, W-148, 5, Math.min(1, endlessDone/et.needed), 0xdc3c46, C.dark, 3);
      txt(this, 40+(W-148)*Math.min(1,endlessDone/et.needed)+4, ey+22, `${Math.min(endlessDone,et.needed)}/${et.needed}`, 8, '#ff8855').setOrigin(0,0.5);
      txt(this, W-106, ey+6,  `💎${et.diamonds}`, 10, '#3cc8dc');
      txt(this, W-106, ey+20, `🪙${et.gold}`,      10, '#ffc83c');
      if (got) {
        txt(this, W-30, ey+23, '✅', 14).setOrigin(0.5);
      } else if (canCl) {
        const bw=52,bh=22,bx=W-66,by2=ey+12;
        const bG=this.add.graphics(); bG.fillStyle(0xdc3c46,1); bG.fillRoundedRect(bx,by2,bw,bh,7);
        const bT=txt(this,bx+bw/2,by2+bh/2,'Взять',10,'#ffffff',true).setOrigin(0.5);
        this.add.zone(bx,by2,bw,bh).setOrigin(0).setInteractive({useHandCursor:true})
          .on('pointerdown',()=>{bG.clear();bG.fillStyle(0xaa2020,1);bG.fillRoundedRect(bx,by2,bw,bh,7);tg?.HapticFeedback?.impactOccurred('medium');})
          .on('pointerup',()=>this._claimEndlessTier(et.tier,bG,bT,bx,by2,bw,bh))
          .on('pointerout',()=>{bG.clear();bG.fillStyle(0xdc3c46,1);bG.fillRoundedRect(bx,by2,bw,bh,7);});
      } else {
        txt(this, W-30, ey+23, '🔒', 13).setOrigin(0.5);
      }
      ny += 52;
    });
  }

  async _claimTier(tier, btnG, btnT, bg, bx, by2, bw, bh, ry, rowH) {
    tg?.HapticFeedback?.impactOccurred('medium');
    btnT?.setText('...');
    try {
      const res = await post('/api/battlepass/claim', { tier });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.questDone();
        btnG.setAlpha(0.4); btnT?.setText('✅');
        _rewardAnim(this, { gold: res.gold || 0, diamonds: res.diamonds || 0 },
          () => this.scene.restart());
      } else {
        btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,8);
        btnT?.setText(res.reason || 'Ошибка');
        this.time.delayedCall(1500, () => { btnT?.setText('Взять'); });
      }
    } catch (_) {
      btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,8);
      btnT?.setText('Ошибка');
    }
  }

  async _claimEndlessTier(tier, bG, bT, bx, by2, bw, bh) {
    tg?.HapticFeedback?.impactOccurred('medium');
    bT.setText('...');
    try {
      const res = await post('/api/battlepass/claim_endless', { tier });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.questDone();
        bG.setAlpha(0.4); bT.setText('✅');
        _rewardAnim(this, { gold: res.gold || 0, diamonds: res.diamonds || 0 },
          () => this.scene.restart());
      } else {
        bG.clear(); bG.fillStyle(0xdc3c46,1); bG.fillRoundedRect(bx,by2,bw,bh,7);
        bT.setText(res.reason || 'Ошибка');
        this.time.delayedCall(1500, () => bT.setText('Взять'));
      }
    } catch (_) {
      bG.clear(); bG.fillStyle(0xdc3c46,1); bG.fillRoundedRect(bx,by2,bw,bh,7);
      bT.setText('Ошибка');
    }
  }

  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 80, msg, 13, '#ffc83c', true).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, duration: 2500, onComplete: () => t.destroy() });
  }
}
