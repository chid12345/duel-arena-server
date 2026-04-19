/* ============================================================
   MenuScene — ext4: _buildProfilePanel  (Glass Dark v3)
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _buildProfilePanel() {
    const { W, CONTENT_H: CH } = this;
    const p   = State.player;
    const c   = new Phaser.GameObjects.Container(this, 0, 0);
    const PAD = 10;

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
    const mkBar = (x, y, w, h, pct, fillColor, r) => {
      r = r || 4;
      const safe = Math.max(0, Math.min(1, isNaN(pct) ? 0 : pct));
      const g = mkG();
      g.fillStyle(0x0d0a1e, 1); g.fillRoundedRect(x, y, w, h, r);
      const fw = Math.max(r * 2, Math.round(w * safe));
      g.fillStyle(fillColor, 1);    g.fillRoundedRect(x, y, fw, h, r);
      g.fillStyle(fillColor, 0.22); g.fillRoundedRect(x, y - 1, fw, h + 2, r);
      g.fillStyle(0xffffff,  0.16); g.fillRoundedRect(x, y, fw, Math.ceil(h / 2), r);
      return g;
    };
    const ca = o => { c.add(o); return o; };

    /* ── 1. PROFILE CARD (glass) ─────────────────────────── */
    const CARD_H = 120, CARD_R = 18;
    // Outer purple glow behind card
    const cardGlowOuter = ca(mkG());
    cardGlowOuter.fillStyle(0x7c3aed, 0.18); cardGlowOuter.fillRoundedRect(PAD - 3, 3, W - PAD * 2 + 6, CARD_H + 6, CARD_R + 2);
    const cardBg = ca(mkG());
    cardBg.fillGradientStyle(0x1a1030, 0x130e28, 0x0f0c20, 0x0d0a1e, 1);
    cardBg.fillRoundedRect(PAD, 6, W - PAD * 2, CARD_H, CARD_R);
    cardBg.lineStyle(1.5, 0x6d28d9, 0.8); cardBg.strokeRoundedRect(PAD, 6, W - PAD * 2, CARD_H, CARD_R);
    // Top shine line
    const cardShine = ca(mkG());
    cardShine.lineStyle(1, 0xffffff, 0.12); cardShine.lineBetween(PAD + CARD_R, 6, W - PAD - CARD_R, 6);

    // Avatar ring + preview
    const avX = PAD + 14, avY = 22, avS = 52;
    const avRing = ca(mkG());
    avRing.fillStyle(0x7c3aed, 0.15); avRing.fillCircle(avX + avS / 2, avY + avS / 2, avS / 2 + 5);
    avRing.lineStyle(2.5, 0xa78bfa, 0.9); avRing.strokeCircle(avX + avS / 2, avY + avS / 2, avS / 2 + 3);
    this._drawAvatarPreview(c, avX + avS / 2, avY + avS / 2, avS / 2, null, p.level);
    const avZ = this.add.zone(avX + avS / 2, avY + avS / 2, avS + 8, avS + 8);
    try { avZ.removeFromDisplayList(); } catch(_) {}
    avZ.setInteractive({ useHandCursor: true });
    avZ.on('pointerup', () => { Sound.click(); this.scene.start('Avatar'); });
    c.add(avZ);

    // Name row
    const niX = avX + avS + 12;
    const crown = p.is_premium ? '👑 ' : '';
    const uname = (p.username || '?').length > 13 ? (p.username || '?').slice(0, 12) + '…' : (p.username || '?');
    ca(mkT(niX, avY + 2, crown + uname, 17, p.is_premium ? '#c4b5fd' : '#ffffff', true));
    if (p.is_premium) {
      const pBg = ca(mkG());
      pBg.fillStyle(0x78350f, 0.85); pBg.fillRoundedRect(niX, avY + 23, 80, 16, 5);
      pBg.lineStyle(1, 0xfbbf24, 0.4); pBg.strokeRoundedRect(niX, avY + 23, 80, 16, 5);
      ca(mkT(niX + 40, avY + 31, `⭐ Premium · ${p.premium_days_left}д`, 9, '#fde68a', true)).setOrigin(0.5);
    } else {
      ca(mkT(niX, avY + 25, `★ ELO ${p.rating}`, 10, 'rgba(255,255,255,0.4)'));
    }

    // Resource chips
    let cx = niX;
    [['💰', p.gold, 0xfbbf24], ['💎', p.diamonds, 0x60a5fa]].forEach(([ico, val, border]) => {
      const cw = Math.min(82, String(val).length * 6 + 26);
      const chipBg = ca(mkG());
      chipBg.fillStyle(0x000000, 0.4); chipBg.fillRoundedRect(cx, avY + 44, cw, 18, 5);
      chipBg.lineStyle(1, border, 0.4); chipBg.strokeRoundedRect(cx, avY + 44, cw, 18, 5);
      ca(mkT(cx + cw / 2, avY + 53, `${ico} ${val}`, 9, border === 0xfbbf24 ? '#fde68a' : '#93c5fd', true)).setOrigin(0.5);
      cx += cw + 5;
    });

    // Level badge
    const lvlBg = ca(mkG());
    lvlBg.fillGradientStyle(0x7c3aed, 0x4f46e5, 0x7c3aed, 0x4f46e5, 1);
    lvlBg.fillRoundedRect(W - PAD - 52, avY + 2, 52, 26, 8);
    ca(mkT(W - PAD - 26, avY + 15, `УР.${p.level}`, 12, '#ffffff', true)).setOrigin(0.5);

    // Sound button
    const snX = W - PAD - 15, snY = avY + 48;
    const snBg = ca(mkG()); snBg.fillStyle(0x000000, 0.45); snBg.fillCircle(snX, snY, 12);
    const snTxt = ca(mkT(snX, snY, Sound.muted ? '🔇' : '🔊', 12)).setOrigin(0.5);
    const snZ = ca(mkZ(snX, snY, 28, 28).setInteractive({ useHandCursor: true }));
    snZ.on('pointerup', () => { snTxt.setText(Sound.toggleMute() ? '🔇' : '🔊'); tg?.HapticFeedback?.selectionChanged(); });

    // Battle stats row inside card
    const wins = p.wins || 0, losses = p.losses || 0, total = wins + losses;
    const wr = total > 0 ? Math.round(wins / total * 100) : 0;
    const sY = 6 + CARD_H - 40;
    const scW = (W - PAD * 2) / 4;
    [
      { v: String(wins),             sub: 'Победы',  col: '#4ade80' },
      { v: String(losses),           sub: 'Пораж.',  col: '#f87171' },
      { v: `${wr}%`,                 sub: 'Винрейт', col: '#a78bfa' },
      { v: `${p.win_streak || 0}🔥`, sub: 'Серия',   col: '#fb923c' },
    ].forEach((d, i) => {
      const wx = PAD + i * scW;
      if (i > 0) { const sep = ca(mkG()); sep.lineStyle(1, 0xffffff, 0.06); sep.lineBetween(wx, sY + 4, wx, sY + 34); }
      ca(mkT(wx + scW / 2, sY + 11, d.v, 15, d.col, true)).setOrigin(0.5);
      ca(mkT(wx + scW / 2, sY + 27, d.sub, 8, 'rgba(255,255,255,0.35)')).setOrigin(0.5);
    });

    /* ── 2. EQUIPMENT CARD ────────────────────────────────── */
    const czY = 6 + CARD_H + 10, czH = 258;
    const eqBg = ca(mkG());
    eqBg.fillStyle(0x0f0c1a, 0.95); eqBg.fillRoundedRect(PAD, czY, W - PAD * 2, czH, 16);
    eqBg.lineStyle(1.5, 0x4c1d95, 0.9); eqBg.strokeRoundedRect(PAD, czY, W - PAD * 2, czH, 16);
    ca(mkT(W / 2, czY + 10, 'ЭКИПИРОВКА ПЕРСОНАЖА', 8, '#7c3aed')).setOrigin(0.5);
    const charCY = czY + czH * 0.43;
    const aura1 = ca(mkG()); aura1.fillStyle(0x7c3aed, 0.1); aura1.fillEllipse(W / 2, charCY, 170, 170);
    const aura2 = ca(mkG()); aura2.fillStyle(0xec4899, 0.05); aura2.fillEllipse(W / 2, charCY + 8, 110, 110);
    const floorG = ca(mkG()); floorG.fillStyle(0x7c3aed, 0.3); floorG.fillEllipse(W / 2, charCY + 62, 158, 20);
    const ringG = ca(mkG()); ringG.lineStyle(1, 0x8b5cf6, 0.22); ringG.strokeEllipse(W / 2, charCY + 58, 138, 38);
    const _wKey = getWarriorKey(p.warrior_type);
    const warrior = ca(mkI(W / 2, charCY, _wKey).setScale(1.9).setOrigin(0.5));
    this.tweens.add({ targets: warrior, y: charCY - 9, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    ca(mkT(W / 2, charCY + 70, '✏️  сменить воина', 9, 'rgba(255,255,255,0.22)').setOrigin(0.5));
    const wZone = ca(mkZ(W / 2, charCY, 90, 130).setInteractive({ useHandCursor: true }));
    wZone.on('pointerup', () => { Sound.click(); this._openWarriorSelect(); });

    // HP bar — neon
    const hpW = W - PAD * 2, hpH = 13, hpX = PAD, hpY = czY + czH - 30;
    const hpPct = (p.hp_pct || 0) / 100;
    const hpCol = (p.hp_pct || 0) > 50 ? 0x22c55e : (p.hp_pct || 0) > 25 ? 0xf59e0b : 0xef4444;
    const hpBg = ca(mkBar(hpX, hpY, hpW, hpH, hpPct, hpCol, 5));
    const hpTxt = ca(mkT(W / 2, hpY + hpH / 2,
      `${p.current_hp} / ${p.max_hp_effective ?? p.max_hp} HP`, 10, '#ffffff', true)).setOrigin(0.5);
    this._liveHp = { g: hpBg, t: hpTxt, x: hpX, y: hpY, w: hpW, h: hpH };

    // XP bar — neon purple
    const xpY = hpY + hpH + 5, xpH = 9;
    if (!p.max_level) {
      ca(mkBar(hpX, xpY, hpW, xpH, (p.xp_pct || 0) / 100, 0x818cf8, 4));
      ca(mkT(W / 2, xpY + xpH / 2,
        `✨ ${p.xp_pct}%  ·  ${p.exp} / ${p.exp_needed} XP`, 9, 'rgba(200,180,255,0.8)', true)).setOrigin(0.5);
    } else {
      ca(mkT(W / 2, xpY + 5, '⭐ Макс. уровень', 10, '#fbbf24', true)).setOrigin(0.5);
    }

    // Free stats badge
    if (p.free_stats > 0) {
      const fsByXp = xpY + xpH + 5;
      const fsG = ca(mkG());
      fsG.fillStyle(0x2d1a5e, 1); fsG.fillRoundedRect(PAD, fsByXp, W - PAD * 2, 24, 8);
      fsG.lineStyle(1.5, 0x7c3aed, 0.9); fsG.strokeRoundedRect(PAD, fsByXp, W - PAD * 2, 24, 8);
      ca(mkT(W / 2, fsByXp + 12,
        `⚡ ${p.free_stats} своб. очка — нажми чтобы улучшить!`, 11, '#c084fc', true)).setOrigin(0.5);
      this.tweens.add({ targets: fsG, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });
      const fsZ = ca(mkZ(W / 2, fsByXp + 12, W - PAD * 2, 24).setInteractive({ useHandCursor: true }));
      fsZ.on('pointerup', () => this.scene.start('Stats', { player: State.player }));
    }

    /* ── 3. ATTRIBUTES CARD ──────────────────────────────── */
    const STATS = [
      { icon: '💪', label: 'Сила',     color: 0xef4444, hex: '#f87171', val: p.strength_effective  ?? p.strength,   sub: `~${p.dmg}ур`     },
      { icon: '🤸', label: 'Ловкость', color: 0x22d3ee, hex: '#67e8f9', val: p.agility_effective   ?? p.agility,    sub: `${p.dodge_pct}%` },
      { icon: '💥', label: 'Интуиция', color: 0xa855f7, hex: '#c084fc', val: p.intuition_effective ?? p.intuition,  sub: `${p.crit_pct}%`  },
      { icon: '🛡', label: 'Выносл.',  color: 0x22c55e, hex: '#4ade80', val: p.stamina_effective   ?? p.stamina,    sub: `${p.armor_pct}%` },
    ];
    const fsBadgeH = p.free_stats > 0 ? 30 : 0;
    const attrY = czY + czH + fsBadgeH + 8;
    const sbRH = 22, sbGap = 6;
    const attrH = 16 + STATS.length * (sbRH + sbGap) + 4;
    const attrBg = ca(mkG());
    attrBg.fillStyle(0x0f0c1a, 0.95); attrBg.fillRoundedRect(PAD, attrY, W - PAD * 2, attrH, 12);
    attrBg.lineStyle(1.5, 0x4c1d95, 0.9); attrBg.strokeRoundedRect(PAD, attrY, W - PAD * 2, attrH, 12);
    ca(mkT(W / 2, attrY + 9, '— ХАРАКТЕРИСТИКИ —', 8, '#7c3aed')).setOrigin(0.5);

    const maxV = Math.max(1, 3 + p.level * 2);
    const nameW = 66, trkX = PAD + 22 + nameW + 4;
    const valW = 28, pctW = 46, trkW = W - trkX - valW - pctW - PAD - 4;
    this._profileStatSubs = [];
    STATS.forEach((s, i) => {
      const ry = attrY + 16 + i * (sbRH + sbGap);
      ca(mkT(PAD,      ry + sbRH / 2, s.icon,  13)).setOrigin(0, 0.5);
      ca(mkT(PAD + 22, ry + sbRH / 2, s.label, 10, 'rgba(255,255,255,0.6)')).setOrigin(0, 0.5);
      const pct = Math.min(1, (s.val || 0) / maxV);
      const fw  = Math.max(8, Math.round(trkW * pct));
      const tbg = ca(mkG());
      tbg.fillStyle(0x0d0a1e, 1);   tbg.fillRoundedRect(trkX, ry + 8, trkW, 7, 3);
      tbg.fillStyle(s.color, 0.9);  tbg.fillRoundedRect(trkX, ry + 8, fw, 7, 3);
      tbg.fillStyle(s.color, 0.22); tbg.fillRoundedRect(trkX, ry + 7, fw, 9, 3);
      tbg.fillStyle(0xffffff, 0.15);tbg.fillRoundedRect(trkX, ry + 8, fw, 3, 3);
      ca(mkT(trkX + trkW + 5, ry + sbRH / 2, String(s.val), 13, s.hex, true)).setOrigin(0, 0.5);
      this._profileStatSubs[i] = ca(mkT(W - PAD, ry + sbRH / 2, s.sub, 10, 'rgba(255,255,255,0.4)')).setOrigin(1, 0.5);
    });

    /* ── HP REGEN ────────────────────────────────────────── */
    const regenY = attrY + attrH + 3;
    if (p.current_hp < p.max_hp) {
      const rate = p.regen_per_min || 0;
      let secsLeft = p.regen_secs_to_full || 0;
      const _fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const regenTxt = ca(mkT(W / 2, regenY,
        `❤️ +${rate}/мин · полный через ${_fmt(secsLeft)}`, 10, 'rgba(255,160,140,0.85)')).setOrigin(0.5);
      this._regenInterval = this.time.addEvent({
        delay: 1000, loop: true,
        callback: () => {
          if (secsLeft <= 0) { regenTxt.setText('✅ HP полный!').setStyle({ color: '#4ade80' }); return; }
          secsLeft = Math.max(0, secsLeft - 1);
          regenTxt.setText(secsLeft > 0 ? `❤️ +${rate}/мин · полный через ${_fmt(secsLeft)}` : '✅ HP полный!');
        },
      });
    }

    /* ── 4. ACTION BUTTONS ───────────────────────────────── */
    const extrasH = p.current_hp < p.max_hp ? 18 : 0;
    const actY = Math.min(CH - 110, regenY + extrasH + 6);
    const actW = W - PAD * 2, actH = 54;

    // В БОЙ — full width, purple gradient + pulse glow
    const fGlow = ca(mkG());
    fGlow.fillStyle(0x7c3aed, 0.28); fGlow.fillRoundedRect(PAD - 4, actY - 4, actW + 8, actH + 8, 18);
    this.tweens.add({ targets: fGlow, alpha: 0, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const fBg = ca(mkG());
    fBg.fillGradientStyle(0xa855f7, 0x8b5cf6, 0x7c3aed, 0x6d28d9, 1);
    fBg.fillRoundedRect(PAD, actY, actW, actH, 14);
    const fShine = ca(mkG());
    fShine.fillStyle(0xffffff, 0.12); fShine.fillRoundedRect(PAD + 2, actY + 2, actW - 4, actH / 2 - 2, 12);
    ca(mkT(W / 2, actY + actH / 2, '⚔️  В БОЙ', 20, '#ffffff', true)).setOrigin(0.5);
    const fZ = ca(mkZ(W / 2, actY + actH / 2, actW, actH).setInteractive({ useHandCursor: true }));
    fZ.on('pointerdown', () => { fBg.clear(); fBg.fillStyle(0x3730a3, 1); fBg.fillRoundedRect(PAD, actY, actW, actH, 14); tg?.HapticFeedback?.impactOccurred('medium'); });
    fZ.on('pointerout',  () => { fBg.clear(); fBg.fillGradientStyle(0xa855f7, 0x8b5cf6, 0x7c3aed, 0x6d28d9, 1); fBg.fillRoundedRect(PAD, actY, actW, actH, 14); });
    fZ.on('pointerup',   () => { fBg.clear(); fBg.fillGradientStyle(0xa855f7, 0x8b5cf6, 0x7c3aed, 0x6d28d9, 1); fBg.fillRoundedRect(PAD, actY, actW, actH, 14); this._switchTab('battle'); });

    // Магазин + Задания — two half-width buttons below
    const btn2Y = actY + actH + 8, b2H = 44, b2W = (actW - 8) / 2;

    // Shop
    const sBg = ca(mkG());
    sBg.fillStyle(0x1a1530, 1); sBg.fillRoundedRect(PAD, btn2Y, b2W, b2H, 12);
    sBg.lineStyle(1.5, 0x7c3aed, 0.5); sBg.strokeRoundedRect(PAD, btn2Y, b2W, b2H, 12);
    ca(mkT(PAD + b2W / 2, btn2Y + b2H / 2, '🏪  Магазин', 14, '#c084fc', true)).setOrigin(0.5);
    const sZ = ca(mkZ(PAD + b2W / 2, btn2Y + b2H / 2, b2W, b2H).setInteractive({ useHandCursor: true }));
    sZ.on('pointerdown', () => { sBg.clear(); sBg.fillStyle(0x2d2460, 1); sBg.fillRoundedRect(PAD, btn2Y, b2W, b2H, 12); sBg.lineStyle(1.5, 0x7c3aed, 1); sBg.strokeRoundedRect(PAD, btn2Y, b2W, b2H, 12); });
    sZ.on('pointerout',  () => { sBg.clear(); sBg.fillStyle(0x1a1530, 1); sBg.fillRoundedRect(PAD, btn2Y, b2W, b2H, 12); sBg.lineStyle(1.5, 0x7c3aed, 0.5); sBg.strokeRoundedRect(PAD, btn2Y, b2W, b2H, 12); });
    sZ.on('pointerup',   () => { sBg.clear(); sBg.fillStyle(0x1a1530, 1); sBg.fillRoundedRect(PAD, btn2Y, b2W, b2H, 12); sBg.lineStyle(1.5, 0x7c3aed, 0.5); sBg.strokeRoundedRect(PAD, btn2Y, b2W, b2H, 12); this.scene.start('Shop'); });

    // Tasks
    const tasksX = PAD + b2W + 8;
    const tBg = ca(mkG());
    tBg.fillStyle(0x0e1a2e, 1); tBg.fillRoundedRect(tasksX, btn2Y, b2W, b2H, 12);
    tBg.lineStyle(1.5, 0x3b82f6, 0.5); tBg.strokeRoundedRect(tasksX, btn2Y, b2W, b2H, 12);
    ca(mkT(tasksX + b2W / 2, btn2Y + b2H / 2, '📋  Задания', 14, '#93c5fd', true)).setOrigin(0.5);
    const tskZ = ca(mkZ(tasksX + b2W / 2, btn2Y + b2H / 2, b2W, b2H).setInteractive({ useHandCursor: true }));
    tskZ.on('pointerdown', () => { tBg.clear(); tBg.fillStyle(0x1a2d40, 1); tBg.fillRoundedRect(tasksX, btn2Y, b2W, b2H, 12); tBg.lineStyle(1.5, 0x3b82f6, 1); tBg.strokeRoundedRect(tasksX, btn2Y, b2W, b2H, 12); });
    tskZ.on('pointerout',  () => { tBg.clear(); tBg.fillStyle(0x0e1a2e, 1); tBg.fillRoundedRect(tasksX, btn2Y, b2W, b2H, 12); tBg.lineStyle(1.5, 0x3b82f6, 0.5); tBg.strokeRoundedRect(tasksX, btn2Y, b2W, b2H, 12); });
    tskZ.on('pointerup',   () => { tBg.clear(); tBg.fillStyle(0x0e1a2e, 1); tBg.fillRoundedRect(tasksX, btn2Y, b2W, b2H, 12); tBg.lineStyle(1.5, 0x3b82f6, 0.5); tBg.strokeRoundedRect(tasksX, btn2Y, b2W, b2H, 12); this._switchTab('quests'); });

    this._addEquipmentSlots(c, W, czY, czH, PAD, mkG, mkT, mkZ, ca);
    this._panels.profile = c;
    this._loadProfileBuffs();
  },

});
