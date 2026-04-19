/* ============================================================
   MenuScene — ext4: _buildProfilePanel  (RPG Dark UI)
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _buildProfilePanel() {
    const { W, CONTENT_H: CH } = this;
    const p   = State.player;
    const c   = new Phaser.GameObjects.Container(this, 0, 0);
    const PAD = 12;

    const mkG = () => this.make.graphics({}, false);
    const mkT = (x, y, s, sz, col, bold) => {
      const style = { fontSize: `${sz}px`, fontFamily: 'Arial, Helvetica, sans-serif',
        fontStyle: bold ? 'bold' : 'normal', color: col || '#ffffff', resolution: 2 };
      return this.make.text({ x, y, text: String(s), style }, false);
    };
    const mkZ = (x, y, w, h) => {
      const z = this.add.zone(x, y, w, h);
      try { z.removeFromDisplayList(); } catch(_) {}
      return z;
    };
    const mkI = (x, y, key) => this.make.image({ x, y, key }, false);
    const ca = o => { c.add(o); return o; };

    /* ── 1. PROFILE CARD ──────────────────────────────────── */
    const CARD_H = 108, CR = 16;
    const cardBg = ca(mkG());
    cardBg.fillStyle(0x14121e, 0.92); cardBg.fillRoundedRect(PAD, 6, W - PAD * 2, CARD_H, CR);
    cardBg.lineStyle(1, 0x2a2050, 1); cardBg.strokeRoundedRect(PAD, 6, W - PAD * 2, CARD_H, CR);
    const cardTopLine = ca(mkG());
    cardTopLine.lineStyle(1, 0xffffff, 0.1);
    cardTopLine.lineBetween(PAD + CR, 6, W - PAD - CR, 6);
    const cardGlow = ca(mkG()); cardGlow.fillStyle(0x7c3aed, 0.07); cardGlow.fillEllipse(W - PAD - 50, 6, 220, 110);

    // Avatar ring
    const avX = PAD + 16, avY = 18, avS = 44;
    const avRing = ca(mkG());
    avRing.lineStyle(2, 0x8b5cf6, 0.6); avRing.strokeCircle(avX + avS / 2, avY + avS / 2, avS / 2 + 3);
    this._drawAvatarPreview(c, avX + avS / 2, avY + avS / 2, avS / 2, null, p.level);
    const avZ = this.add.zone(avX + avS / 2, avY + avS / 2, avS + 8, avS + 8);
    try { avZ.removeFromDisplayList(); } catch(_) {}
    avZ.setInteractive({ useHandCursor: true });
    avZ.on('pointerup', () => { Sound.click(); this.scene.start('Avatar'); });
    c.add(avZ);

    // Name + premium
    const niX = avX + avS + 14;
    const crown = p.is_premium ? '👑 ' : '';
    const uname = p.username.length > 13 ? p.username.slice(0, 12) + '…' : p.username;
    ca(mkT(niX, avY + 3, crown + uname, 16, '#ffffff', true));
    if (p.is_premium) {
      const pBg = ca(mkG());
      pBg.fillStyle(0x78350f, 0.85); pBg.fillRoundedRect(niX, avY + 23, 76, 16, 5);
      pBg.lineStyle(1, 0xfbbf24, 0.45); pBg.strokeRoundedRect(niX, avY + 23, 76, 16, 5);
      ca(mkT(niX + 38, avY + 31, `⭐ Premium · ${p.premium_days_left}д`, 9, '#fbbf24', true)).setOrigin(0.5);
    } else {
      ca(mkT(niX, avY + 25, `★ ELO ${p.rating}`, 10, 'rgba(255,255,255,0.4)'));
    }

    // Resource chips
    let cx = niX;
    [['💰', p.gold, 0x78350f, 0xfbbf24], ['💎', p.diamonds, 0x1e3a5f, 0x60a5fa]].forEach(([ico, val, bg, border]) => {
      const label = `${ico} ${val}`;
      const cw = Math.min(85, String(val).length * 6 + 28);
      const chipBg = ca(mkG());
      chipBg.fillStyle(bg, 0.7); chipBg.fillRoundedRect(cx, avY + 44, cw, 18, 5);
      chipBg.lineStyle(1, border, 0.35); chipBg.strokeRoundedRect(cx, avY + 44, cw, 18, 5);
      ca(mkT(cx + cw / 2, avY + 53, label, 9, border === 0xfbbf24 ? '#fde68a' : '#93c5fd', true)).setOrigin(0.5);
      cx += cw + 5;
    });

    // Level badge + sound
    const lvlBg = ca(mkG());
    lvlBg.fillGradientStyle(0x7c3aed, 0x4f46e5, 0x7c3aed, 0x4f46e5, 1);
    lvlBg.fillRoundedRect(W - PAD - 52, avY + 2, 52, 26, 8);
    ca(mkT(W - PAD - 26, avY + 15, `УР.${p.level}`, 12, '#ffffff', true)).setOrigin(0.5);
    const snX = W - PAD - 14, snY = avY + 48;
    ca(mkG()).fillStyle(0x000000, 0.4); // (not added to c, just for glow)
    const snBg = ca(mkG()); snBg.fillStyle(0x000000, 0.4); snBg.fillCircle(snX, snY, 12);
    const snTxt = ca(mkT(snX, snY, Sound.muted ? '🔇' : '🔊', 12)).setOrigin(0.5);
    const snZ = ca(mkZ(snX, snY, 28, 28).setInteractive({ useHandCursor: true }));
    snZ.on('pointerup', () => { snTxt.setText(Sound.toggleMute() ? '🔇' : '🔊'); tg?.HapticFeedback?.selectionChanged(); });

    // Battle stats row inside card
    const wins = p.wins || 0, losses = p.losses || 0, total = wins + losses;
    const wr = total > 0 ? Math.round(wins / total * 100) : 0;
    const sY = 6 + CARD_H - 42, sH = 36;
    const scW = (W - PAD * 2) / 4;
    [
      { v: String(wins),              sub: 'Победы',  col: '#4ade80' },
      { v: String(losses),            sub: 'Пораж.',  col: '#f87171' },
      { v: `${wr}%`,                  sub: 'Винрейт', col: '#a78bfa' },
      { v: `${p.win_streak || 0}🔥`, sub: 'Серия',   col: '#fb923c' },
    ].forEach((d, i) => {
      const wx = PAD + i * scW;
      if (i > 0) { const sep = ca(mkG()); sep.lineStyle(1, 0xffffff, 0.05); sep.lineBetween(wx, sY + 4, wx, sY + sH - 4); }
      ca(mkT(wx + scW / 2, sY + 11, d.v, 16, d.col, true)).setOrigin(0.5);
      ca(mkT(wx + scW / 2, sY + 28, d.sub, 8, 'rgba(255,255,255,0.3)')).setOrigin(0.5);
    });

    /* ── 2. WARRIOR ────────────────────────────────────────── */
    const czY = 6 + CARD_H + 10, czH = 246;
    const charCY = czY + czH * 0.42;

    const aura1 = ca(mkG()); aura1.fillStyle(0x7c3aed, 0.11); aura1.fillEllipse(W / 2, charCY, 190, 190);
    const aura2 = ca(mkG()); aura2.fillStyle(0xec4899, 0.05); aura2.fillEllipse(W / 2, charCY + 10, 130, 130);
    const floorG = ca(mkG()); floorG.fillStyle(0x7c3aed, 0.28); floorG.fillEllipse(W / 2, charCY + 67, 160, 22);
    const ring1 = ca(mkG()); ring1.lineStyle(1, 0x8b5cf6, 0.22); ring1.strokeEllipse(W / 2, charCY + 62, 142, 42);
    const ring2 = ca(mkG()); ring2.lineStyle(1, 0x8b5cf6, 0.1);  ring2.strokeEllipse(W / 2, charCY + 64, 102, 28);

    const warrior = ca(mkI(W / 2, charCY, getWarriorKey(p.warrior_type)).setScale(2.0).setOrigin(0.5));
    this.tweens.add({ targets: warrior, y: charCY - 9, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    ca(mkT(W / 2, charCY + 74, '✏️  сменить воина', 9, 'rgba(255,255,255,0.22)').setOrigin(0.5));
    const wZone = ca(mkZ(W / 2, charCY, 90, 130).setInteractive({ useHandCursor: true }));
    wZone.on('pointerup', () => { Sound.click(); this._openWarriorSelect(); });

    // HP bar
    const hpW = W - PAD * 2, hpH = 9, hpX = PAD, hpY = czY + czH - 40;
    const hpPct = p.hp_pct / 100;
    const hpCol = p.hp_pct > 50 ? 0x22c55e : p.hp_pct > 25 ? 0xf59e0b : 0xef4444;
    ca(mkT(hpX, hpY - 14, '❤️ HP', 9, 'rgba(255,255,255,0.45)'));
    const hpValTxt = ca(mkT(W - PAD, hpY - 14, `${p.current_hp} / ${p.max_hp_effective ?? p.max_hp}`, 9, 'rgba(255,255,255,0.45)')).setOrigin(1, 0);
    const hpBarG = ca(mkG());
    const _drawHpBar = (g, hp, col) => {
      g.clear();
      g.fillStyle(0x0d0a1e, 1); g.fillRoundedRect(hpX, hpY, hpW, hpH, 5);
      const fw = Math.max(10, Math.round(hpW * Math.min(1, hp)));
      g.fillStyle(col, 1); g.fillRoundedRect(hpX, hpY, fw, hpH, 5);
      g.fillStyle(col, 0.25); g.fillRoundedRect(hpX, hpY - 1, fw, hpH + 2, 5);
      g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(hpX, hpY, fw, 3, 5);
    };
    _drawHpBar(hpBarG, hpPct, hpCol);
    this._liveHp = { g: hpBarG, t: hpValTxt, x: hpX, y: hpY, w: hpW, h: hpH, drawFn: _drawHpBar };

    // XP bar
    const xpY = hpY + hpH + 12;
    if (!p.max_level) {
      ca(mkT(hpX, xpY - 14, '✨ XP', 9, 'rgba(255,255,255,0.45)'));
      ca(mkT(W - PAD, xpY - 14, `${p.xp_pct}%  ·  ${p.exp}/${p.exp_needed}`, 9, 'rgba(255,255,255,0.35)')).setOrigin(1, 0);
      const xpG = ca(mkG());
      xpG.fillStyle(0x0d0a1e, 1); xpG.fillRoundedRect(hpX, xpY, hpW, hpH, 5);
      const xpFw = Math.max(10, Math.round(hpW * p.xp_pct / 100));
      xpG.fillStyle(0x7c3aed, 1); xpG.fillRoundedRect(hpX, xpY, xpFw, hpH, 5);
      xpG.fillStyle(0x7c3aed, 0.25); xpG.fillRoundedRect(hpX, xpY - 1, xpFw, hpH + 2, 5);
      xpG.fillStyle(0xffffff, 0.18); xpG.fillRoundedRect(hpX, xpY, xpFw, 3, 5);
    } else {
      ca(mkT(W / 2, xpY + 4, '⭐ Макс. уровень', 10, '#fbbf24', true)).setOrigin(0.5);
    }

    // Free stats badge
    const fsBadgeH = p.free_stats > 0 ? 28 : 0;
    if (p.free_stats > 0) {
      const fsY = czY + czH + 2;
      const fsG = ca(mkG());
      fsG.fillStyle(0x2d1a5e, 1); fsG.fillRoundedRect(PAD, fsY, W - PAD * 2, 24, 8);
      fsG.lineStyle(1.5, 0x7c3aed, 0.9); fsG.strokeRoundedRect(PAD, fsY, W - PAD * 2, 24, 8);
      ca(mkT(W / 2, fsY + 12, `⚡ ${p.free_stats} своб. очка — нажми чтобы улучшить!`, 11, '#c084fc', true)).setOrigin(0.5);
      this.tweens.add({ targets: fsG, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });
      const fsZ = ca(mkZ(W / 2, fsY + 12, W - PAD * 2, 24).setInteractive({ useHandCursor: true }));
      fsZ.on('pointerup', () => this.scene.start('Stats', { player: State.player }));
    }

    /* ── 3. ATTRIBUTES CARD ───────────────────────────────── */
    const STATS = [
      { icon: '💪', label: 'Сила',     color: 0xef4444, hex: '#f87171', val: p.strength_effective  ?? p.strength,   sub: `~${p.dmg}ур`     },
      { icon: '🤸', label: 'Ловкость', color: 0x22d3ee, hex: '#67e8f9', val: p.agility_effective   ?? p.agility,    sub: `${p.dodge_pct}%` },
      { icon: '💥', label: 'Интуиция', color: 0xa855f7, hex: '#c084fc', val: p.intuition_effective ?? p.intuition,  sub: `${p.crit_pct}%`  },
      { icon: '🛡', label: 'Выносл.',  color: 0x22c55e, hex: '#4ade80', val: p.stamina_effective   ?? p.stamina,    sub: `${p.armor_pct}%` },
    ];
    const attrY = czY + czH + fsBadgeH + 10;
    const attrH = 120, attrR = 14;
    const attrBg = ca(mkG());
    attrBg.fillStyle(0x14121e, 0.9); attrBg.fillRoundedRect(PAD, attrY, W - PAD * 2, attrH, attrR);
    attrBg.lineStyle(1, 0x2a2050, 1); attrBg.strokeRoundedRect(PAD, attrY, W - PAD * 2, attrH, attrR);
    ca(mkT(W / 2, attrY + 9, 'ХАРАКТЕРИСТИКИ', 8, 'rgba(255,255,255,0.22)')).setOrigin(0.5);

    const sbY0 = attrY + 22, sbRH = 22, sbGap = 4;
    const maxV = Math.max(1, 3 + p.level * 2);
    const nameW = 66, trkX = PAD + 20 + nameW + 2;
    const valW = 30, pctW = 40, trkW = W - trkX - valW - pctW - PAD - 4;
    this._profileStatSubs = [];
    STATS.forEach((s, i) => {
      const ry = sbY0 + i * (sbRH + sbGap);
      ca(mkT(PAD, ry + sbRH / 2, s.icon, 13)).setOrigin(0, 0.5);
      ca(mkT(PAD + 20, ry + sbRH / 2, s.label, 10, 'rgba(255,255,255,0.5)')).setOrigin(0, 0.5);
      const trBg = ca(mkG()); trBg.fillStyle(0x0a0818, 1); trBg.fillRoundedRect(trkX, ry + 8, trkW, 8, 4);
      const pct = Math.min(1, s.val / maxV), fw = Math.max(8, Math.round(trkW * pct));
      const trFill = ca(mkG()); trFill.fillStyle(s.color, 0.9); trFill.fillRoundedRect(trkX, ry + 8, fw, 8, 4);
      const trGlow = ca(mkG()); trGlow.fillStyle(s.color, 0.2); trGlow.fillRoundedRect(trkX, ry + 7, fw, 10, 4);
      const trShin = ca(mkG()); trShin.fillStyle(0xffffff, 0.18); trShin.fillRoundedRect(trkX, ry + 8, fw, 3, 4);
      ca(mkT(trkX + trkW + 5, ry + sbRH / 2, String(s.val), 13, s.hex, true)).setOrigin(0, 0.5);
      this._profileStatSubs[i] = ca(mkT(W - PAD, ry + sbRH / 2, s.sub, 10, 'rgba(255,255,255,0.35)')).setOrigin(1, 0.5);
    });

    /* ── HP REGEN ─────────────────────────────────────────── */
    if (p.current_hp < p.max_hp) {
      const rate = p.regen_per_min || 0;
      let secsLeft = p.regen_secs_to_full || 0;
      const _fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const regenTxt = ca(mkT(W / 2, attrY + attrH + 5,
        `❤️ +${rate}/мин · полный через ${_fmt(secsLeft)}`, 10, 'rgba(255,160,140,0.8)')).setOrigin(0.5);
      this._regenInterval = this.time.addEvent({
        delay: 1000, loop: true,
        callback: () => {
          if (secsLeft <= 0) { regenTxt.setText('✅ HP полный!').setStyle({ color: '#4ade80' }); return; }
          secsLeft = Math.max(0, secsLeft - 1);
          regenTxt.setText(secsLeft > 0 ? `❤️ +${rate}/мин · полный через ${_fmt(secsLeft)}` : '✅ HP полный!');
        },
      });
    }

    /* ── 4. ACTION BUTTONS ────────────────────────────────── */
    const regenH = p.current_hp < p.max_hp ? 20 : 0;
    const actY = attrY + attrH + regenH + 10;
    const actH = 52, halfW = (W - PAD * 2 - 8) / 2;

    // FIGHT button with pulse glow
    const fBg = ca(mkG());
    const fGlow = ca(mkG());
    const _drawFight = (pressed) => {
      fBg.clear();
      if (pressed) { fBg.fillStyle(0x3730a3, 1); fBg.fillRoundedRect(PAD, actY, halfW, actH, 14); }
      else { fBg.fillGradientStyle(0x9333ea, 0x7c3aed, 0x6d28d9, 0x4f46e5, 1); fBg.fillRoundedRect(PAD, actY, halfW, actH, 14); }
    };
    _drawFight(false);
    fGlow.fillStyle(0x7c3aed, 0.3); fGlow.fillRoundedRect(PAD - 4, actY - 4, halfW + 8, actH + 8, 18);
    this.tweens.add({ targets: fGlow, alpha: 0, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const fShine = ca(mkG()); fShine.fillStyle(0xffffff, 0.1); fShine.fillRoundedRect(PAD + 2, actY + 2, halfW - 4, actH / 2 - 2, 12);
    ca(mkT(PAD + halfW / 2, actY + actH / 2, '⚔️  В БОЙ', 16, '#ffffff', true)).setOrigin(0.5);
    const fZ = ca(mkZ(PAD + halfW / 2, actY + actH / 2, halfW, actH).setInteractive({ useHandCursor: true }));
    fZ.on('pointerdown', () => { _drawFight(true); tg?.HapticFeedback?.impactOccurred('medium'); });
    fZ.on('pointerout', () => _drawFight(false));
    fZ.on('pointerup', () => { _drawFight(false); this._switchTab('battle'); });

    // SHOP button
    const shopX = PAD + halfW + 8;
    const sBg = ca(mkG());
    const _drawShop = (pressed) => {
      sBg.clear();
      sBg.fillStyle(pressed ? 0x2d2460 : 0x1e1a3a, 1); sBg.fillRoundedRect(shopX, actY, halfW, actH, 14);
      sBg.lineStyle(1.5, 0x7c3aed, pressed ? 0.9 : 0.4); sBg.strokeRoundedRect(shopX, actY, halfW, actH, 14);
    };
    _drawShop(false);
    ca(mkT(shopX + halfW / 2, actY + actH / 2, '🏪  Магазин', 15, '#c084fc', true)).setOrigin(0.5);
    const sZ = ca(mkZ(shopX + halfW / 2, actY + actH / 2, halfW, actH).setInteractive({ useHandCursor: true }));
    sZ.on('pointerdown', () => _drawShop(true));
    sZ.on('pointerout', () => _drawShop(false));
    sZ.on('pointerup', () => { _drawShop(false); this.scene.start('Shop'); });

    this._addEquipmentSlots(c, W, czY, czH, PAD, mkG, mkT, mkZ, ca);
    this._panels.profile = c;
    this._loadProfileBuffs();
  },

});
