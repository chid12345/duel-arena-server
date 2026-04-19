/* ============================================================
   MenuScene — ext4: _buildProfilePanel  (Dark Modern v2)
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _buildProfilePanel() {
    const { W, CONTENT_H: CH } = this;
    const p   = State.player;
    const c   = new Phaser.GameObjects.Container(this, 0, 0);
    const PAD = 10;

    const mkG = () => this.make.graphics({}, false);
    const mkT = (x, y, s, sz, col, bold, stroke) => {
      const style = { fontSize: `${sz}px`, fontFamily: 'Arial, Helvetica, sans-serif',
        fontStyle: bold ? 'bold' : 'normal', color: col || '#ffffff', resolution: 2 };
      if (stroke) { style.stroke = stroke; style.strokeThickness = Math.max(2, Math.round(sz * 0.22)); }
      return this.make.text({ x, y, text: String(s), style }, false);
    };
    const mkZ = (x, y, w, h) => {
      const z = this.add.zone(x, y, w, h);
      try { z.removeFromDisplayList(); } catch(_) {}
      return z;
    };
    const mkI = (x, y, key) => this.make.image({ x, y, key }, false);
    const mkBar = (x, y, w, h, pct, fillColor, bgColor, r) => {
      bgColor = bgColor ?? 0x0d0a1e;
      r = r ?? 4;
      const g = mkG();
      g.fillStyle(bgColor, 1); g.fillRoundedRect(x, y, w, h, r);
      const fw = Math.max(r * 2, Math.round(w * Math.min(1, Math.max(0, pct))));
      g.fillStyle(fillColor, 1);    g.fillRoundedRect(x, y, fw, h, r);
      g.fillStyle(fillColor, 0.22); g.fillRoundedRect(x, y - 1, fw, h + 2, r);
      g.fillStyle(0xffffff,  0.16); g.fillRoundedRect(x, y, fw, Math.ceil(h / 2), r);
      return g;
    };
    const ca = o => { c.add(o); return o; };

    /* ── BANNER ─────────────────────────────────────────── */
    const BNH = 116;
    const bnBg = ca(mkG());
    bnBg.fillGradientStyle(0x1a0e40, 0x0f0828, 0x0d1a3a, 0x06040f, 1);
    bnBg.fillRect(0, 0, W, BNH);
    const trGlow = ca(mkG()); trGlow.fillStyle(0x7c3aed, 0.14); trGlow.fillEllipse(W, 0, 180, 130);
    const trGlow2 = ca(mkG()); trGlow2.fillStyle(0x3b82f6, 0.09); trGlow2.fillEllipse(0, 0, 150, 110);
    const bnFade = ca(mkG());
    bnFade.fillGradientStyle(0x0d0820, 0x0d0820, 0x0d0820, 0x0d0820, 0, 0, 1, 1);
    bnFade.fillRect(0, BNH - 26, W, 26);

    // Avatar block
    const avX = PAD + 8, avY = 18, avS = 42;
    const avRing = ca(mkG());
    avRing.lineStyle(2, 0x8b5cf6, 0.6); avRing.strokeCircle(avX + avS / 2, avY + avS / 2, avS / 2 + 3);
    this._drawAvatarPreview(c, avX + avS / 2, avY + avS / 2, avS / 2, null, p.level);
    const avZ = this.add.zone(avX + avS / 2, avY + avS / 2, avS + 8, avS + 8);
    try { avZ.removeFromDisplayList(); } catch(_) {}
    avZ.setInteractive({ useHandCursor: true });
    avZ.on('pointerup', () => { Sound.click(); this.scene.start('Avatar'); });
    c.add(avZ);

    // Name + premium
    const niX = avX + avS + 10;
    const crown = p.is_premium ? '👑 ' : '';
    const uname = p.username.length > 14 ? p.username.slice(0, 13) + '…' : p.username;
    ca(mkT(niX, avY + 4, crown + uname, 17, p.is_premium ? '#c8a0ff' : '#ffffff', true));
    const premSub = p.is_premium ? `⭐ Premium · ${p.premium_days_left} дн.` : '';
    ca(mkT(niX, avY + 26, premSub || `★ ELO ${p.rating}`, 11, p.is_premium ? '#b45aff' : 'rgba(255,255,255,0.55)'));

    // Resource badges
    const bads = [`💰 ${p.gold}`, `💎 ${p.diamonds}`, `УР.${p.level}`];
    const badCols = ['#fde68a', '#93c5fd', '#ffffff'];
    const badBords = [0xfbbf24, 0x60a5fa, 0x8b5cf6];
    let bx = niX;
    bads.forEach((bd, i) => {
      const bw = i === 2 ? 42 : 58;
      const bbg = ca(mkG());
      bbg.fillStyle(0x000000, 0.45); bbg.fillRoundedRect(bx, avY + 46, bw, 20, 6);
      bbg.lineStyle(1, badBords[i], 0.4); bbg.strokeRoundedRect(bx, avY + 46, bw, 20, 6);
      ca(mkT(bx + bw / 2, avY + 56, bd, 10, badCols[i], true)).setOrigin(0.5);
      bx += bw + 5;
    });

    // Sound btn
    const snX = W - PAD - 16, snY = avY + 16;
    const snBg = ca(mkG()); snBg.fillStyle(0x000000, 0.5); snBg.fillCircle(snX, snY, 13);
    const snTxt = ca(mkT(snX, snY, Sound.muted ? '🔇' : '🔊', 12)).setOrigin(0.5);
    const snZ = ca(mkZ(snX, snY, 30, 30).setInteractive({ useHandCursor: true }));
    snZ.on('pointerup', () => { snTxt.setText(Sound.toggleMute() ? '🔇' : '🔊'); tg?.HapticFeedback?.selectionChanged(); });

    /* ── WIN ROW ─────────────────────────────────────────── */
    const wrY = BNH + 8, wrH = 44;
    const wins = p.wins || 0, losses = p.losses || 0, total = wins + losses;
    const wr = total > 0 ? Math.round(wins / total * 100) : 0;
    const wrData = [
      { v: String(wins),             sub: 'Победы',  col: '#4ade80' },
      { v: String(losses),           sub: 'Пораж.',  col: '#f87171' },
      { v: `${wr}%`,                 sub: 'Винрейт', col: '#a78bfa' },
      { v: `${p.win_streak || 0}🔥`, sub: 'Серия',   col: '#fb923c' },
    ];
    const wcW = (W - PAD * 2 - 18) / 4;
    wrData.forEach((d, i) => {
      const wx = PAD + i * (wcW + 6);
      const wbg = ca(mkG());
      wbg.fillStyle(0x0e0c1a, 1); wbg.fillRoundedRect(wx, wrY, wcW, wrH, 10);
      wbg.lineStyle(1, 0x2d2460, 1); wbg.strokeRoundedRect(wx, wrY, wcW, wrH, 10);
      ca(mkT(wx + wcW / 2, wrY + 13, d.v, 15, d.col, true)).setOrigin(0.5);
      ca(mkT(wx + wcW / 2, wrY + 31, d.sub, 9, 'rgba(255,255,255,0.45)')).setOrigin(0.5);
    });

    /* ── CHARACTER ───────────────────────────────────────── */
    const czY = wrY + wrH + 8, czH = 264;
    const charCY = czY + czH * 0.44;
    const auraG = ca(mkG()); auraG.fillStyle(0x7c3aed, 0.1); auraG.fillEllipse(W / 2, charCY, 160, 160);
    const auraG2 = ca(mkG()); auraG2.fillStyle(0xec4899, 0.05); auraG2.fillEllipse(W / 2, charCY + 8, 110, 110);
    const glowG = ca(mkG()); glowG.fillStyle(0x7c3aed, 0.3); glowG.fillEllipse(W / 2, charCY + 64, 160, 22);
    const ringG = ca(mkG()); ringG.lineStyle(1, 0x8b5cf6, 0.2); ringG.strokeEllipse(W / 2, charCY + 60, 140, 40);
    const _wKey = getWarriorKey(p.warrior_type);
    const warrior = ca(mkI(W / 2, charCY, _wKey).setScale(1.9).setOrigin(0.5));
    this.tweens.add({ targets: warrior, y: charCY - 9, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    ca(mkT(W / 2, charCY + 70, '✏️  сменить воина', 9, 'rgba(255,255,255,0.25)').setOrigin(0.5));
    const wZone = ca(mkZ(W / 2, charCY, 90, 130).setInteractive({ useHandCursor: true }));
    wZone.on('pointerup', () => { Sound.click(); this._openWarriorSelect(); });

    // HP bar — neon green
    const hpW = W - PAD * 2, hpH = 11, hpX = PAD, hpY = czY + czH - 28;
    const hpPct = Math.max(0, Math.min(1, (p.hp_pct || 0) / 100));
    const hpCol = (p.hp_pct || 0) > 50 ? 0x22c55e : (p.hp_pct || 0) > 25 ? 0xf59e0b : 0xef4444;
    const hpBg = ca(mkBar(hpX, hpY, hpW, hpH, hpPct, hpCol, 0x0d0a1e, 5));
    const hpTxt = ca(mkT(W / 2, hpY + hpH / 2,
      `${p.current_hp} / ${p.max_hp_effective ?? p.max_hp} HP`, 10, '#ffffff', true)).setOrigin(0.5);
    this._liveHp = { g: hpBg, t: hpTxt, x: hpX, y: hpY, w: hpW, h: hpH };

    // XP bar — neon purple
    const xpY = hpY + hpH + 5, xpH = 9;
    if (!p.max_level) {
      ca(mkBar(hpX, xpY, hpW, xpH, Math.max(0, Math.min(1, (p.xp_pct || 0) / 100)), 0x818cf8, 0x0d0a1e, 4));
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

    /* ── STAT BARS ───────────────────────────────────────── */
    const STATS = [
      { icon: '💪', label: 'Сила',     color: 0xef4444, hex: '#f87171', val: p.strength_effective  ?? p.strength,   sub: `~${p.dmg}ур`     },
      { icon: '🤸', label: 'Ловкость', color: 0x22d3ee, hex: '#67e8f9', val: p.agility_effective   ?? p.agility,    sub: `${p.dodge_pct}%` },
      { icon: '💥', label: 'Интуиция', color: 0xa855f7, hex: '#c084fc', val: p.intuition_effective ?? p.intuition,  sub: `${p.crit_pct}%`  },
      { icon: '🛡', label: 'Выносл.',  color: 0x22c55e, hex: '#4ade80', val: p.stamina_effective   ?? p.stamina,    sub: `${p.armor_pct}%` },
    ];
    const fsBadgeH = p.free_stats > 0 ? 28 : 0;
    const sbY0 = czY + czH + 8 + fsBadgeH, sbRH = 24, sbGap = 5;
    const maxV = Math.max(1, 3 + p.level * 2);
    const nameW = 66, trkX = PAD + 22 + nameW + 4;
    const valW = 28, pctW = 48, trkW = W - trkX - valW - pctW - PAD - 4;
    this._profileStatSubs = [];
    STATS.forEach((s, i) => {
      const ry = sbY0 + i * (sbRH + sbGap);
      ca(mkT(PAD,      ry + sbRH / 2, s.icon,  14)).setOrigin(0, 0.5);
      ca(mkT(PAD + 22, ry + sbRH / 2, s.label, 11, 'rgba(255,255,255,0.65)')).setOrigin(0, 0.5);
      const pct = Math.min(1, (s.val || 0) / maxV);
      const fw  = Math.max(8, Math.round(trkW * pct));
      const tbg = ca(mkG());
      tbg.fillStyle(0x0d0a1e, 1);  tbg.fillRoundedRect(trkX, ry + 8, trkW, 8, 4);
      tbg.fillStyle(s.color, 0.9); tbg.fillRoundedRect(trkX, ry + 8, fw, 8, 4);
      tbg.fillStyle(s.color, 0.2); tbg.fillRoundedRect(trkX, ry + 7, fw, 10, 4);
      tbg.fillStyle(0xffffff, 0.15); tbg.fillRoundedRect(trkX, ry + 8, fw, 3, 4);
      ca(mkT(trkX + trkW + 6, ry + sbRH / 2, String(s.val), 13, s.hex, true)).setOrigin(0, 0.5);
      const subT = ca(mkT(W - PAD, ry + sbRH / 2, s.sub, 10, 'rgba(255,255,255,0.4)')).setOrigin(1, 0.5);
      this._profileStatSubs[i] = subT;
    });

    /* ── HP REGEN ────────────────────────────────────────── */
    const statsEndY = sbY0 + STATS.length * (sbRH + sbGap) - sbGap;
    if (p.current_hp < p.max_hp) {
      const rate = p.regen_per_min || 0;
      let secsLeft = p.regen_secs_to_full || 0;
      const _fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const regenTxt = ca(mkT(W / 2, statsEndY + 4,
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

    /* ── ACTION BUTTONS ──────────────────────────────────── */
    const extrasH = (p.current_hp < p.max_hp ? 18 : 0);
    const actY = Math.min(CH - 58, statsEndY + extrasH + 8);
    const actH = 52, halfW = (W - PAD * 2 - 8) / 2;

    // Fight button — bright gradient purple
    const fBg = ca(mkG());
    fBg.fillGradientStyle(0x9333ea, 0x7c3aed, 0x6d28d9, 0x4f46e5, 1);
    fBg.fillRoundedRect(PAD, actY, halfW, actH, 14);
    const fShine = ca(mkG());
    fShine.fillStyle(0xffffff, 0.08); fShine.fillRoundedRect(PAD + 2, actY + 2, halfW - 4, actH / 2 - 2, 12);
    ca(mkT(PAD + halfW / 2, actY + actH / 2, '⚔️  В БОЙ', 16, '#ffffff', true)).setOrigin(0.5);
    const fZ = ca(mkZ(PAD + halfW / 2, actY + actH / 2, halfW, actH).setInteractive({ useHandCursor: true }));
    fZ.on('pointerdown', () => {
      fBg.clear(); fBg.fillStyle(0x3730a3, 1); fBg.fillRoundedRect(PAD, actY, halfW, actH, 14);
      tg?.HapticFeedback?.impactOccurred('medium');
    });
    fZ.on('pointerout', () => {
      fBg.clear(); fBg.fillGradientStyle(0x9333ea, 0x7c3aed, 0x6d28d9, 0x4f46e5, 1); fBg.fillRoundedRect(PAD, actY, halfW, actH, 14);
    });
    fZ.on('pointerup', () => {
      fBg.clear(); fBg.fillGradientStyle(0x9333ea, 0x7c3aed, 0x6d28d9, 0x4f46e5, 1); fBg.fillRoundedRect(PAD, actY, halfW, actH, 14);
      this._switchTab('battle');
    });

    // Shop button — dark glass
    const shopX = PAD + halfW + 8;
    const sBg = ca(mkG());
    sBg.fillStyle(0x1a1530, 1); sBg.fillRoundedRect(shopX, actY, halfW, actH, 14);
    sBg.lineStyle(1.5, 0x7c3aed, 0.5); sBg.strokeRoundedRect(shopX, actY, halfW, actH, 14);
    ca(mkT(shopX + halfW / 2, actY + actH / 2, '🏪  Магазин', 15, '#c084fc', true)).setOrigin(0.5);
    const sZ = ca(mkZ(shopX + halfW / 2, actY + actH / 2, halfW, actH).setInteractive({ useHandCursor: true }));
    sZ.on('pointerdown', () => { sBg.clear(); sBg.fillStyle(0x2d2460, 1); sBg.fillRoundedRect(shopX, actY, halfW, actH, 14); sBg.lineStyle(1.5, 0x7c3aed, 0.9); sBg.strokeRoundedRect(shopX, actY, halfW, actH, 14); });
    sZ.on('pointerout',  () => { sBg.clear(); sBg.fillStyle(0x1a1530, 1); sBg.fillRoundedRect(shopX, actY, halfW, actH, 14); sBg.lineStyle(1.5, 0x7c3aed, 0.5); sBg.strokeRoundedRect(shopX, actY, halfW, actH, 14); });
    sZ.on('pointerup',   () => { sBg.clear(); sBg.fillStyle(0x1a1530, 1); sBg.fillRoundedRect(shopX, actY, halfW, actH, 14); sBg.lineStyle(1.5, 0x7c3aed, 0.5); sBg.strokeRoundedRect(shopX, actY, halfW, actH, 14); this.scene.start('Shop'); });

    this._addEquipmentSlots(c, W, czY, czH, PAD, mkG, mkT, mkZ, ca);
    this._panels.profile = c;
    this._loadProfileBuffs();
  },

});
