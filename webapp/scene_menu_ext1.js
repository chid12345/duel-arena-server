/* ============================================================
   MenuScene — ext1: _loadProfileBuffs, _buildBattlePanel,
                     _makeBattleCard
   ============================================================ */

Object.assign(MenuScene.prototype, {

  async _loadProfileBuffs() {
    try {
      const [d, pd] = await Promise.all([get('/api/shop/inventory'), post('/api/player')]);
      if (!this.scene?.isActive?.()) return;

      const buffs = d?.ok ? (d.active_buffs || []) : [];
      if (pd?.ok && pd.player) {
        State.player = pd.player;
        const p = pd.player;
        if (this._liveHp?.t)
          this._liveHp.t.setText(`${p.current_hp} / ${p.max_hp_effective ?? p.max_hp} HP`);
      }
      if (!buffs.length) return;

      const B = {};
      for (const b of buffs) B[b.buff_type] = (B[b.buff_type] || 0) + b.value;
      const p = State.player;

      if (B.strength   && this._profileStatSubs?.[0]) this._profileStatSubs[0].setText(`~${p.dmg}🧪`).setStyle({ color: '#ffaa66' });
      if (B.endurance  && this._profileStatSubs?.[1]) this._profileStatSubs[1].setText(`${p.dodge_pct}%🧪`).setStyle({ color: '#88ffcc' });
      if (B.crit       && this._profileStatSubs?.[2]) this._profileStatSubs[2].setText(`${p.crit_pct}%🧪`).setStyle({ color: '#cc88ff' });
      if (B.stamina    && this._profileStatSubs?.[3]) this._profileStatSubs[3].setText(`${p.armor_pct}%🧪`).setStyle({ color: '#aaffaa' });
    } catch {}
  },

  _buildBattlePanel() {
    const { W, CONTENT_H: CH } = this;
    const p = State.player;
    const c = this.add.container(0, 0);
    const PAD = 16;

    const title = txt(this, W / 2, 26, '⚔️  ВЫБЕРИ БОЙ', 18, '#ffc83c', true).setOrigin(0.5);

    const pvpCY = CH * 0.20;
    const pvpCard = this._makeBattleCard(
      W / 2, pvpCY,
      '⚔️  ПОИСК СОПЕРНИКА',
      'Живой игрок · рейтинговый бой',
      '🏆 +рейтинг  💰+30%  ⭐+30% за победу',
      C.red, 0xdc3c46,
      () => this._onFight()
    );

    const BH  = 38;
    const BG  = 8;
    const BW  = (W - PAD * 2 - BG) / 2;
    const GT  = pvpCY + 58;

    const secBtn = (col, row, label, fillHex, borderHex, textColor, cb) => {
      const bx = PAD + col * (BW + BG);
      const by = GT + row * (BH + BG);
      const bg = this.add.graphics();
      bg.fillStyle(fillHex, 0.92);
      bg.fillRoundedRect(bx, by, BW, BH, 9);
      bg.lineStyle(1.5, borderHex, 0.5);
      bg.strokeRoundedRect(bx, by, BW, BH, 9);
      const t = txt(this, bx + BW / 2, by + BH / 2, label, 11, textColor, true).setOrigin(0.5);
      const z = this.add.zone(bx, by, BW, BH).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { tg?.HapticFeedback?.impactOccurred('light'); });
      z.on('pointerup', cb);
      return [bg, t, z];
    };

    const secBtnFull = (row, label, fillHex, borderHex, textColor, cb) => {
      const bx = PAD, bw = W - PAD * 2;
      const by = GT + row * (BH + BG);
      const bg = this.add.graphics();
      bg.fillStyle(fillHex, 0.85);
      bg.fillRoundedRect(bx, by, bw, BH, 9);
      bg.lineStyle(1.5, borderHex, 0.4);
      bg.strokeRoundedRect(bx, by, bw, BH, 9);
      const t = txt(this, bx + bw / 2, by + BH / 2, label, 11, textColor, true).setOrigin(0.5);
      const z = this.add.zone(bx, by, bw, BH).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { tg?.HapticFeedback?.impactOccurred('light'); });
      z.on('pointerup', cb);
      return [bg, t, z];
    };

    const btnCh  = secBtn(0, 0, '🎯 Вызов по нику', 0x2e2010, C.gold,   '#ffdca0', () => this._onChallengeByNick());
    const btnMyC = secBtn(1, 0, '📨 Мои вызовы',   0x161e38, C.blue,   '#b8d4ff', () => this._showOutgoingChallenges());
    const btnTT  = secBtnFull(1, '🗿 Башня Титанов', 0x1e1630, C.purple, '#d8c0ff', () => this._onTitanFight());
    const btnNatisk = secBtnFull(2, '🔥 Натиск  —  Арена выживания', 0x2a1010, 0xdc3c46, '#ff9999', () => this.scene.start('Natisk'));

    const botCY = CH * 0.76;
    const botCard = this._makeBattleCard(
      W / 2, botCY,
      '🤖  БОЙ С БОТОМ',
      'Практика · нет рейтинга',
      '💰 +золото  ⭐ +опыт',
      C.blue, 0x2a4880,
      () => this._onBotFight()
    );

    const hpBlockY = CH * 0.88;
    const hpBlockObjs = [];

    const hpPct = p.hp_pct / 100;
    const hpCol = p.hp_pct > 50 ? C.green : p.hp_pct > 25 ? C.gold : C.red;
    hpBlockObjs.push(makeBar(this, 20, hpBlockY, W - 40, 10, hpPct, hpCol));
    hpBlockObjs.push(
      txt(this, W / 2, hpBlockY + 5, `❤️ ${p.current_hp}/${p.max_hp_effective ?? p.max_hp} HP`, 9, '#f0f0fa').setOrigin(0.5)
    );

    if (p.hp_pct < 100) {
      const regenStr = p.regen_secs_to_full > 0
        ? `+${p.regen_per_min}/мин · полный через ${Math.ceil(p.regen_secs_to_full / 60)}мин`
        : `+${p.regen_per_min}/мин`;
      hpBlockObjs.push(txt(this, 20, hpBlockY + 14, regenStr, 8, '#cc7777'));
    }

    if (p.hp_pct < 15) {
      const canAfford = (p.gold || 0) >= 12;
      const btnBY = hpBlockY + 28;
      const qBg = this.add.graphics();
      qBg.fillStyle(canAfford ? C.red : C.dark, canAfford ? 0.88 : 0.55);
      qBg.fillRoundedRect(20, btnBY, W - 40, 38, 10);
      if (canAfford) { qBg.lineStyle(1.5, C.gold, 0.3); qBg.strokeRoundedRect(20, btnBY, W - 40, 38, 10); }
      const qLabel = canAfford
        ? `🧪 Выпить малое зелье  —  12 🪙`
        : `🧪 Нужно 12 🪙 (у вас ${p.gold || 0})`;
      const qT = txt(this, W / 2, btnBY + 19, qLabel, 11, canAfford ? '#ffffff' : '#cc8888', true).setOrigin(0.5);
      const qZ = this.add.zone(20, btnBY, W - 40, 38).setOrigin(0)
        .setInteractive({ useHandCursor: canAfford });
      if (canAfford) {
        qZ.on('pointerdown', () => { qBg.clear(); qBg.fillStyle(0x991a22,1); qBg.fillRoundedRect(20,btnBY,W-40,38,10); tg?.HapticFeedback?.impactOccurred('medium'); });
        qZ.on('pointerout',  () => { qBg.clear(); qBg.fillStyle(C.red,0.88); qBg.fillRoundedRect(20,btnBY,W-40,38,10); qBg.lineStyle(1.5,C.gold,0.3); qBg.strokeRoundedRect(20,btnBY,W-40,38,10); });
        qZ.on('pointerup',   () => this._quickHeal(qBg, qT, qZ, 20, btnBY, W - 40, 38));
      }
      hpBlockObjs.push(qBg, qT, qZ);
    }

    const children = [
      title,
      ...pvpCard,
      ...btnCh, ...btnMyC,
      ...btnTT,
      ...btnNatisk,
      ...botCard,
      ...hpBlockObjs,
    ];
    children.forEach(o => c.add(o));

    this._panels.battle = c;
    this._checkIncomingChallenge();
  },

  _makeBattleCard(cx, cy, title, sub, bonus, borderColor, fillColor, cb) {
    const { W } = this;
    const cw = W - 32, ch = 100;
    const x = cx - cw / 2, y = cy - ch / 2;
    const objs = [];

    const bg = this.add.graphics();
    bg.fillStyle(fillColor, 0.18);
    bg.fillRoundedRect(x, y, cw, ch, 14);
    bg.lineStyle(2, borderColor, 0.7);
    bg.strokeRoundedRect(x, y, cw, ch, 14);
    objs.push(bg);

    const shine = this.add.graphics();
    shine.fillStyle(0xffffff, 0.05);
    shine.fillRoundedRect(x + 4, y + 4, cw - 8, ch * 0.42, 11);
    objs.push(shine);

    objs.push(txt(this, cx, y + 26, title,  16, '#f0f0fa', true).setOrigin(0.5));
    objs.push(txt(this, cx, y + 50, sub,    11, '#8888aa').setOrigin(0.5));
    objs.push(txt(this, cx, y + 72, bonus,  10, `#${borderColor.toString(16).padStart(6,'0')}`).setOrigin(0.5));

    const zone = this.add.zone(cx, cy, cw, ch).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      bg.clear();
      bg.fillStyle(fillColor, 0.32);
      bg.fillRoundedRect(x, y, cw, ch, 14);
      bg.lineStyle(2, borderColor, 1);
      bg.strokeRoundedRect(x, y, cw, ch, 14);
      tg?.HapticFeedback?.impactOccurred('medium');
    });
    zone.on('pointerup', () => {
      bg.clear();
      bg.fillStyle(fillColor, 0.18);
      bg.fillRoundedRect(x, y, cw, ch, 14);
      bg.lineStyle(2, borderColor, 0.7);
      bg.strokeRoundedRect(x, y, cw, ch, 14);
      cb();
    });
    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(fillColor, 0.18);
      bg.fillRoundedRect(x, y, cw, ch, 14);
      bg.lineStyle(2, borderColor, 0.7);
      bg.strokeRoundedRect(x, y, cw, ch, 14);
    });
    objs.push(zone);
    return objs;
  },

});
