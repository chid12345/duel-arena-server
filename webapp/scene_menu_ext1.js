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
    const PAD = 14;

    // ── Заголовок ──
    const title = txt(this, W / 2, 24, '⚔️  ВЫБЕРИ БОЙ', 17, '#ffc83c', true).setOrigin(0.5);

    let curY = 46;
    const GAP = 8;

    // ── Карточки с полосой-акцентом ──
    const cards = [
      this._makeBattleStrip(PAD, curY, W - PAD * 2, 72,
        0xdc3c46, '#ff6672', '⚔️  Поиск соперника',
        'Живой игрок · рейтинговый бой',
        '🏆 +рейтинг  💰 +30%  ⭐ +30% за победу',
        () => this._onFight()),
      // advance curY
    ];
    curY += 72 + GAP;

    cards.push(this._makeBattleStrip(PAD, curY, W - PAD * 2, 62,
      0xb45aff, '#c97aff', '🗿  Башня Титанов',
      'PvE · прогрессия уровней · редкие награды',
      null, () => this._onTitanFight()));
    curY += 62 + GAP;

    cards.push(this._makeBattleStrip(PAD, curY, W - PAD * 2, 62,
      0xff5533, '#ff7755', '🔥  Натиск',
      'Арена выживания · волны врагов',
      null, () => this.scene.start('Natisk')));
    curY += 62 + GAP;

    // ── 2 малые кнопки в ряд ──
    const BH  = 52;
    const BW  = (W - PAD * 2 - GAP) / 2;

    const smBtn = (x, y, w, h, stripCol, nameCol, emo, name, sub, cb) => {
      const objs = [];
      const bg = this.add.graphics();
      bg.fillStyle(0x1a1828, 1);
      bg.fillRoundedRect(x, y, w, h, 10);
      objs.push(bg);

      const strip = this.add.graphics();
      strip.fillStyle(stripCol, 1);
      strip.fillRoundedRect(x, y, 4, h, { tl: 10, bl: 10, tr: 2, br: 2 });
      objs.push(strip);

      objs.push(txt(this, x + 14, y + 14, emo + ' ' + name, 11, nameCol, true));
      objs.push(txt(this, x + 14, y + 32, sub, 9, '#ddddff'));

      const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { tg?.HapticFeedback?.impactOccurred('light'); bg.clear(); bg.fillStyle(0x221f36, 1); bg.fillRoundedRect(x, y, w, h, 10); });
      z.on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a1828, 1); bg.fillRoundedRect(x, y, w, h, 10); });
      z.on('pointerup',   () => { bg.clear(); bg.fillStyle(0x1a1828, 1); bg.fillRoundedRect(x, y, w, h, 10); cb(); });
      objs.push(z);
      return objs;
    };

    const smLeft  = smBtn(PAD,            curY, BW, BH, 0xffc83c, '#ffdca0', '🎯', 'Вызов по нику', 'PvP дуэль',      () => this._onChallengeByNick());
    const smRight = smBtn(PAD + BW + GAP, curY, BW, BH, 0x5096ff, '#b8d4ff', '📨', 'Мои вызовы',    'Входящие вызовы',() => this._showOutgoingChallenges());
    curY += BH + GAP;

    // ── Бот ──
    const botCard = this._makeBattleStrip(PAD, curY, W - PAD * 2, 62,
      0x5096ff, '#7ab4ff', '🤖  Бой с ботом',
      'Практика · без рейтинга · 💰 +золото',
      null, () => this._onBotFight());
    curY += 62 + GAP;

    // ── HP блок ──
    const hpBlockY = curY;
    const hpBlockObjs = [];

    const hpPct = p.hp_pct / 100;
    const hpCol = p.hp_pct > 50 ? C.green : p.hp_pct > 25 ? C.gold : C.red;
    hpBlockObjs.push(makeBar(this, PAD, hpBlockY, W - PAD * 2, 10, hpPct, hpCol));
    hpBlockObjs.push(
      txt(this, W / 2, hpBlockY + 5, `❤️ ${p.current_hp}/${p.max_hp_effective ?? p.max_hp} HP`, 9, '#f0f0fa').setOrigin(0.5)
    );

    if (p.hp_pct < 100) {
      const regenStr = p.regen_secs_to_full > 0
        ? `+${p.regen_per_min}/мин · полный через ${Math.ceil(p.regen_secs_to_full / 60)}мин`
        : `+${p.regen_per_min}/мин`;
      hpBlockObjs.push(txt(this, PAD, hpBlockY + 14, regenStr, 8, '#ddddff'));
    }

    if (p.hp_pct < 15) {
      const canAfford = (p.gold || 0) >= 12;
      const btnBY = hpBlockY + 28;
      const qBg = this.add.graphics();
      qBg.fillStyle(canAfford ? C.red : C.dark, canAfford ? 0.88 : 0.55);
      qBg.fillRoundedRect(PAD, btnBY, W - PAD * 2, 38, 10);
      if (canAfford) { qBg.lineStyle(1.5, C.gold, 0.3); qBg.strokeRoundedRect(PAD, btnBY, W - PAD * 2, 38, 10); }
      const qLabel = canAfford
        ? `🧪 Выпить малое зелье  —  12 🪙`
        : `🧪 Нужно 12 🪙 (у вас ${p.gold || 0})`;
      const qT = txt(this, W / 2, btnBY + 19, qLabel, 11, canAfford ? '#ffffff' : '#cc8888', true).setOrigin(0.5);
      const qZ = this.add.zone(PAD, btnBY, W - PAD * 2, 38).setOrigin(0)
        .setInteractive({ useHandCursor: canAfford });
      if (canAfford) {
        qZ.on('pointerdown', () => { qBg.clear(); qBg.fillStyle(0x991a22,1); qBg.fillRoundedRect(PAD,btnBY,W-PAD*2,38,10); tg?.HapticFeedback?.impactOccurred('medium'); });
        qZ.on('pointerout',  () => { qBg.clear(); qBg.fillStyle(C.red,0.88); qBg.fillRoundedRect(PAD,btnBY,W-PAD*2,38,10); qBg.lineStyle(1.5,C.gold,0.3); qBg.strokeRoundedRect(PAD,btnBY,W-PAD*2,38,10); });
        qZ.on('pointerup',   () => this._quickHeal(qBg, qT, qZ, PAD, btnBY, W - PAD * 2, 38));
      }
      hpBlockObjs.push(qBg, qT, qZ);
    }

    const children = [
      title,
      ...cards.flat(),
      ...smLeft, ...smRight,
      ...botCard,
      ...hpBlockObjs,
    ];
    children.forEach(o => c.add(o));

    this._panels.battle = c;
    this._checkIncomingChallenge();
  },

  /* Карточка с цветной полосой слева */
  _makeBattleStrip(x, y, w, h, stripColorHex, nameColor, name, sub, bonus, cb) {
    const objs = [];

    // Фон карточки
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1828, 1);
    bg.fillRoundedRect(x, y, w, h, 12);
    objs.push(bg);

    // Полоса слева
    const strip = this.add.graphics();
    strip.fillStyle(stripColorHex, 1);
    strip.fillRoundedRect(x, y, 5, h, { tl: 12, bl: 12, tr: 2, br: 2 });
    objs.push(strip);

    // Текст
    const tx = x + 16;
    objs.push(txt(this, tx, y + 16, name, 13, nameColor, true));
    objs.push(txt(this, tx, y + 34, sub, 10, '#ddddff'));
    if (bonus) {
      objs.push(txt(this, tx, y + 52, bonus, 9, '#ffc83c'));
    }

    // Зона клика
    const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => {
      tg?.HapticFeedback?.impactOccurred('medium');
      bg.clear(); bg.fillStyle(0x221f36, 1); bg.fillRoundedRect(x, y, w, h, 12);
    });
    z.on('pointerout', () => {
      bg.clear(); bg.fillStyle(0x1a1828, 1); bg.fillRoundedRect(x, y, w, h, 12);
    });
    z.on('pointerup', () => {
      bg.clear(); bg.fillStyle(0x1a1828, 1); bg.fillRoundedRect(x, y, w, h, 12);
      cb();
    });
    objs.push(z);
    return objs;
  },

  // Оставляем _makeBattleCard для совместимости (не используется в новом дизайне)
  _makeBattleCard(cx, cy, title, sub, bonus, borderColor, fillColor, cb) {
    return this._makeBattleStrip(cx - 140, cy - 50, 280, 100, borderColor, '#f0f0fa', title, sub, bonus, cb);
  },

});
