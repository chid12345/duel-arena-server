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
    const mkBar = (x, y, w, h, pct, fillColor, r, fillColor2) => {
      r = r || 4;
      const safe = Math.max(0, Math.min(1, isNaN(pct) ? 0 : pct));
      const g = mkG();
      g.fillStyle(0x07050f, 1); g.fillRoundedRect(x, y, w, h, r);
      const fw = Math.max(r * 2, Math.round(w * safe));
      if (fillColor2) {
        g.fillGradientStyle(fillColor, fillColor2, fillColor, fillColor2, 1);
      } else {
        g.fillStyle(fillColor, 1);
      }
      g.fillRoundedRect(x, y, fw, h, r);
      g.fillStyle(0xffffff, 0.14); g.fillRoundedRect(x, y, fw, Math.ceil(h / 2), r);
      return g;
    };
    const mkBarGlow = (x, y, w, h, pct, c1, c2, glowC) => {
      const rr = Math.ceil(h / 2) + 2;
      const safe = Math.max(0, Math.min(1, isNaN(pct) ? 0 : pct));
      const g = mkG();
      g.fillStyle(0x000000, 0.72); g.fillRoundedRect(x, y, w, h, rr);
      g.lineStyle(1, glowC, 0.12); g.strokeRoundedRect(x, y, w, h, rr);
      const fw = Math.max(rr * 2, Math.round(w * safe));
      g.fillStyle(glowC, 0.22); g.fillRoundedRect(x, y - 1, fw, h + 2, rr);
      g.fillGradientStyle(c1, c2, c1, c2, 1); g.fillRoundedRect(x, y, fw, h, rr);
      g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(x, y, fw, Math.ceil(h / 2), rr);
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
    avZ.on('pointerup', () => { Sound.click(); this.scene.start('Avatar', {}); });
    c.add(avZ);

    // Name row
    const niX = avX + avS + 12;
    const uname = (p.username || '?').length > 13 ? (p.username || '?').slice(0, 12) + '…' : (p.username || '?');
    let nameX = niX;
    if (p.is_premium) {
      const crG = ca(mkG());
      crG.fillStyle(0xf59e0b, 1);
      crG.fillTriangle(niX,      avY+15, niX+2,    avY+7, niX+5,    avY+15);
      crG.fillTriangle(niX+5.5,  avY+15, niX+7.5,  avY+4, niX+9.5,  avY+15);
      crG.fillTriangle(niX+10,   avY+15, niX+12,   avY+7, niX+15,   avY+15);
      crG.fillRect(niX, avY+13, 15, 4);
      crG.fillStyle(0xfde68a, 1);
      crG.fillCircle(niX+2,   avY+7, 1.5);
      crG.fillCircle(niX+7.5, avY+4, 1.5);
      crG.fillCircle(niX+13,  avY+7, 1.5);
      nameX = niX + 18;
    }
    ca(mkT(nameX, avY + 2, uname, 17, p.is_premium ? '#c4b5fd' : '#ffffff', true));
    if (p.is_premium) {
      const pBg = ca(mkG());
      pBg.fillGradientStyle(0xb45309, 0xd97706, 0xb45309, 0xd97706, 1);
      pBg.fillRoundedRect(niX, avY + 23, 84, 17, 6);
      pBg.lineStyle(1.5, 0xfbbf24, 0.65); pBg.strokeRoundedRect(niX, avY + 23, 84, 17, 6);
      ca(mkT(niX + 42, avY + 31, `⭐ Premium · ${p.premium_days_left}д`, 9, '#fff8e7', true)).setOrigin(0.5);
    } else {
      ca(mkT(niX, avY + 25, `★ ELO ${p.rating}`, 10, 'rgba(255,255,255,0.4)'));
    }

    // Resource chips — рисованные иконки (монета + кристалл)
    let cx = niX;
    [
      { val: p.gold,     border: 0xfbbf24, col: '#fde68a', type: 'coin' },
      { val: p.diamonds, border: 0x60a5fa, col: '#93c5fd', type: 'gem'  },
    ].forEach(({ val, border, col, type }) => {
      const cw = Math.min(82, String(val).length * 6 + 32);
      const chipBg = ca(mkG());
      chipBg.fillStyle(0x000000, 0.4); chipBg.fillRoundedRect(cx, avY + 44, cw, 18, 5);
      chipBg.lineStyle(1, border, 0.4); chipBg.strokeRoundedRect(cx, avY + 44, cw, 18, 5);
      const iG = ca(mkG()); const ix = cx + 8, iy = avY + 53;
      if (type === 'coin') {
        iG.fillStyle(0xd97706, 1); iG.fillCircle(ix, iy, 5.5);
        iG.fillStyle(0xfbbf24, 1); iG.fillCircle(ix, iy, 4);
        iG.fillStyle(0xfde68a, 1); iG.fillCircle(ix, iy, 2.8);
        iG.fillStyle(0x92400e, 0.7); iG.fillRect(ix-2, iy-0.6, 4, 1.2); iG.fillRect(ix-0.6, iy-2, 1.2, 4);
      } else {
        iG.fillStyle(0x3b82f6, 0.9); iG.fillTriangle(ix, iy-6, ix-5, iy, ix+5, iy);
        iG.fillStyle(0x93c5fd, 0.7); iG.fillTriangle(ix, iy-6, ix-4.5, iy, ix, iy-3);
        iG.fillStyle(0x1d4ed8, 0.9); iG.fillTriangle(ix-5, iy, ix+5, iy, ix, iy+4);
      }
      ca(mkT(cx + cw / 2 + 5, avY + 53, String(val), 9, col, true)).setOrigin(0.5);
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
      { v: String(losses),           sub: 'Топчик',  col: '#f87171' },
      { v: `${wr}%`,                 sub: 'Выигрыш', col: '#a78bfa' },
      { v: String(p.win_streak || 0), sub: 'Серия',   col: '#fb923c' },
    ].forEach((d, i) => {
      const wx = PAD + i * scW;
      if (i > 0) { const sep = ca(mkG()); sep.lineStyle(1, 0xffffff, 0.06); sep.lineBetween(wx, sY + 4, wx, sY + 34); }
      ca(mkT(wx + scW / 2, sY + 11, d.v, 15, d.col, true)).setOrigin(0.5);
      ca(mkT(wx + scW / 2, sY + 27, d.sub, 8, 'rgba(255,255,255,0.35)')).setOrigin(0.5);
    });
    // Flame icon next to streak number
    { const fx = PAD + 3 * scW + scW * 0.68, fy = sY + 11;
      const fG = ca(mkG());
      fG.fillStyle(0xf97316, 0.85); fG.fillEllipse(fx, fy, 7, 12);
      fG.fillStyle(0xfbbf24, 0.9); fG.fillEllipse(fx, fy + 1.5, 4, 7);
      fG.fillStyle(0xfef9c3, 0.5); fG.fillCircle(fx, fy + 2, 1.5); }

    /* ── 2. EQUIPMENT CARD — radial gradient bg, premium ── */
    const czY = 6 + CARD_H + 10, czH = 330;
    // Radial gradient background simulation (center lighter, edges darker)
    const eqBg = ca(mkG());
    eqBg.fillGradientStyle(0x130f22, 0x130f22, 0x07060f, 0x07060f, 1);
    eqBg.fillRoundedRect(PAD, czY, W - PAD * 2, czH, 14);
    eqBg.lineStyle(1.5, 0x5b21b6, 0.85); eqBg.strokeRoundedRect(PAD, czY, W - PAD * 2, czH, 14);
    // inner radial glow (central light pool)
    const eqGlow = ca(mkG()); eqGlow.fillStyle(0x6d28d9, 0.08); eqGlow.fillEllipse(W / 2, czY + czH * 0.4, W * 0.7, czH * 0.7);
    // top accent line
    const eqLine = ca(mkG()); eqLine.lineStyle(2, 0x8b5cf6, 0.5); eqLine.lineBetween(PAD + 14, czY, W - PAD - 14, czY);
    const charCY = czY + czH * 0.42;
    // Aura colour per warrior class
    const _auraCols = { tank: 0xff5522, agile: 0x00cc55, crit: 0x7c3aed };
    // tank_1/agile_2/crit_0 → базовый класс, чтобы аура совпадала с цветом класса
    const _auraCol  = _auraCols[String(p?.warrior_type||'').split('_')[0]] || 0x7c3aed;
    const aura1 = ca(mkG()); aura1.fillStyle(_auraCol, 0.1);  aura1.fillEllipse(W / 2, charCY, 150, 150);
    const aura2 = ca(mkG()); aura2.fillStyle(_auraCol, 0.05); aura2.fillEllipse(W / 2, charCY + 8, 90, 90);
    const floorG = ca(mkG()); floorG.fillStyle(_auraCol, 0.32); floorG.fillEllipse(W / 2, charCY + 52, 120, 16);
    const ringG = ca(mkG()); ringG.lineStyle(1, _auraCol, 0.28); ringG.strokeEllipse(W / 2, charCY + 48, 104, 28);
    const _wKey = getWarriorKey(p.warrior_type);
    const warrior = ca(mkI(W / 2, charCY, _wKey).setDisplaySize(170, 250).setOrigin(0.5));
    this.tweens.add({ targets: warrior, y: charCY - 7, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const wZone = ca(mkZ(W / 2, charCY, 140, 210).setInteractive({ useHandCursor: true }));
    wZone.on('pointerup', () => { Sound.click(); this._openWarriorSelect(); });

    // HP / XP — inline layout: [icon] [LABEL] [====bar====] [value]
    const hpX = PAD, hpH = 8;
    const hpSepY = czY + czH - 56;
    { const sG = ca(mkG()); sG.lineStyle(1, 0xffffff, 0.06); sG.lineBetween(PAD, hpSepY, W - PAD, hpSepY); }

    const hpPct   = Math.max(0, Math.min(1, (p.hp_pct || 0) / 100));
    const hpCol   = (p.hp_pct || 0) > 50 ? 0x22c55e : (p.hp_pct || 0) > 25 ? 0xf59e0b : 0xef4444;
    const hpColStr = hpCol === 0x22c55e ? '#4ade80' : hpCol === 0xf59e0b ? '#fbbf24' : '#f87171';

    const hpRowCY = hpSepY + 15;
    { const hrtG = ca(mkG()); const hic = hpX + 8, hiy = hpRowCY;
      hrtG.fillStyle(hpCol, 0.9);
      hrtG.fillCircle(hic - 2.5, hiy - 1.5, 3); hrtG.fillCircle(hic + 2.5, hiy - 1.5, 3);
      hrtG.fillTriangle(hic - 5, hiy, hic + 5, hiy, hic, hiy + 6); }
    ca(mkT(hpX + 18, hpRowCY - 5, 'HP', 9, hpColStr));
    const hpValStr = `${p.current_hp} / ${p.max_hp_effective ?? p.max_hp}`;
    const hpValTxt = ca(mkT(W - PAD, hpRowCY - 5, hpValStr, 9, 'rgba(255,255,255,0.5)')).setOrigin(1, 0);
    const hpBX = hpX + 36, hpBW = W - PAD * 2 - 36 - 76;
    const hpBg = ca(mkBarGlow(hpBX, hpRowCY - Math.ceil(hpH / 2), hpBW, hpH, hpPct, 0x15803d, 0x86efac, 0x4ade80));
    this._liveHp = { g: hpBg, t: hpValTxt, x: hpBX, y: hpRowCY - Math.ceil(hpH / 2), w: hpBW, h: hpH };

    const xpRowCY = hpRowCY + 22;
    if (!p.max_level) {
      { const stG = ca(mkG()); const six = hpX + 8, siy = xpRowCY;
        stG.fillStyle(0xa855f7, 0.9);
        stG.fillTriangle(six, siy-5, six-2, siy-1, six+2, siy-1);
        stG.fillTriangle(six, siy+5, six-2, siy+1, six+2, siy+1);
        stG.fillTriangle(six-5, siy, six-1, siy-2, six-1, siy+2);
        stG.fillTriangle(six+5, siy, six+1, siy-2, six+1, siy+2);
        stG.fillStyle(0xc4b5fd, 0.5); stG.fillCircle(six, siy, 1.5); }
      ca(mkT(hpX + 18, xpRowCY - 5, 'XP', 9, '#a78bfa'));
      const xpValStr = `${p.exp} / ${p.exp_needed}`;
      ca(mkT(W - PAD, xpRowCY - 5, xpValStr, 9, 'rgba(255,255,255,0.35)')).setOrigin(1, 0);
      ca(mkBarGlow(hpBX, xpRowCY - Math.ceil(hpH / 2), hpBW, hpH, Math.max(0, Math.min(1, (p.xp_pct || 0) / 100)), 0x4c1d95, 0xa855f7, 0xa855f7));
    } else {
      ca(mkT(W / 2, xpRowCY, '⭐ Макс. уровень', 10, '#fbbf24', true)).setOrigin(0.5);
    }

    // Free stats badge (below equipment card)
    if (p.free_stats > 0) {
      const fsByXp = czY + czH + 4;
      const fsG = ca(mkG());
      fsG.fillStyle(0x2d1a5e, 1); fsG.fillRoundedRect(PAD, fsByXp, W - PAD * 2, 24, 8);
      fsG.lineStyle(1.5, 0x7c3aed, 0.9); fsG.strokeRoundedRect(PAD, fsByXp, W - PAD * 2, 24, 8);
      ca(mkT(W / 2, fsByXp + 12,
        `⚡ ${p.free_stats} своб. очка — нажми чтобы улучшить!`, 11, '#c084fc', true)).setOrigin(0.5);
      this.tweens.add({ targets: fsG, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });
      const fsZ = ca(mkZ(W / 2, fsByXp + 12, W - PAD * 2, 24).setInteractive({ useHandCursor: true }));
      fsZ.on('pointerup', () => this.scene.start('Stats', { player: State.player }));
    }

    /* ── HP REGEN ────────────────────────────────────────── */
    const fsBadgeH = p.free_stats > 0 ? 30 : 0;
    const regenY = czY + czH + fsBadgeH + 8;
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

    // В БОЙ — живая кнопка: тень·пульс·шиммер·перелив
    const fDrop=ca(mkG()); fDrop.fillStyle(0x6d28d9,0.45); fDrop.fillEllipse(W/2,actY+actH+6,actW*0.78,14);
    this.tweens.add({targets:fDrop,scaleX:1.18,alpha:0.12,duration:1100,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    const fGlow=ca(mkG()); fGlow.fillStyle(0x7c3aed,0.22); fGlow.fillRoundedRect(PAD-6,actY-6,actW+12,actH+12,22);
    this.tweens.add({targets:fGlow,alpha:0.04,duration:1600,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    const fHalo=ca(mkG()); fHalo.fillStyle(0xa78bfa,0.12); fHalo.fillRoundedRect(PAD-2,actY-2,actW+4,actH+4,18);
    this.tweens.add({targets:fHalo,alpha:0.02,duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut',delay:350});
    const fBg=ca(mkG()); fBg.fillGradientStyle(0xc4b5fd,0xa29bfe,0x7c3aed,0x6d28d9,1); fBg.fillRoundedRect(PAD,actY,actW,actH,16);
    const fShine=ca(mkG()); fShine.fillStyle(0xffffff,0.22); fShine.fillRoundedRect(PAD+2,actY+2,actW-4,actH*0.42,14);
    // Shimmer sweep — диагональный блик, маскирован по форме кнопки
    const _mG=this.make.graphics({},false); _mG.fillStyle(0xffffff,1); _mG.fillRoundedRect(PAD,actY,actW,actH,16); c.add(_mG); _mG.setVisible(false);
    const shimG=this.make.graphics({},false); shimG.fillStyle(0xffffff,0.2); shimG.beginPath(); shimG.moveTo(-18,actY-2); shimG.lineTo(18,actY-2); shimG.lineTo(8,actY+actH+2); shimG.lineTo(-26,actY+actH+2); shimG.closePath(); shimG.fillPath(); shimG.setMask(_mG.createGeometryMask()); c.add(shimG);
    this.tweens.add({targets:shimG,x:{from:PAD-25,to:PAD+actW+35},duration:2300,repeat:-1,repeatDelay:1900,ease:'Quad.easeIn'});
    const fBdr=ca(mkG()); fBdr.lineStyle(2,0xe9d5ff,0.9); fBdr.strokeRoundedRect(PAD,actY,actW,actH,16);
    this.tweens.add({targets:fBdr,alpha:0.2,duration:1000,yoyo:true,repeat:-1,ease:'Sine.easeInOut',delay:200});
    const fiG=ca(mkG()); const fix=W/2-46,fiy=actY+actH/2;
    fiG.fillStyle(0xf0eeff,0.92); fiG.beginPath(); fiG.moveTo(fix+6,fiy-8); fiG.lineTo(fix+9,fiy-5); fiG.lineTo(fix-2,fiy+7); fiG.lineTo(fix-5,fiy+7); fiG.lineTo(fix-5,fiy+4); fiG.closePath(); fiG.fillPath();
    fiG.fillStyle(0xffffff,0.25); fiG.beginPath(); fiG.moveTo(fix+6,fiy-7); fiG.lineTo(fix+8,fiy-5); fiG.lineTo(fix-1,fiy+6); fiG.lineTo(fix-2,fiy+5); fiG.closePath(); fiG.fillPath();
    fiG.lineStyle(3,0xfde68a,0.9); fiG.lineBetween(fix-3,fiy+2,fix-8,fiy+7); fiG.fillStyle(0xfde68a,1); fiG.fillCircle(fix-9,fiy+8,2.5);
    const fTxt=ca(mkT(W/2+8,actY+actH/2,'В БОЙ',20,'#ffffff',true)).setOrigin(0.5);
    this.tweens.add({targets:fTxt,scaleX:1.04,scaleY:1.04,duration:1300,yoyo:true,repeat:-1,ease:'Sine.easeInOut',delay:600});
    const fZ=ca(mkZ(W/2,actY+actH/2,actW,actH).setInteractive({useHandCursor:true}));
    fZ.on('pointerdown',()=>{fBg.clear();fBg.fillStyle(0x3730a3,1);fBg.fillRoundedRect(PAD,actY,actW,actH,16);tg?.HapticFeedback?.impactOccurred('medium');});
    fZ.on('pointerout', ()=>{fBg.clear();fBg.fillGradientStyle(0xc4b5fd,0xa29bfe,0x7c3aed,0x6d28d9,1);fBg.fillRoundedRect(PAD,actY,actW,actH,16);});
    fZ.on('pointerup',  ()=>{fBg.clear();fBg.fillGradientStyle(0xc4b5fd,0xa29bfe,0x7c3aed,0x6d28d9,1);fBg.fillRoundedRect(PAD,actY,actW,actH,16);this._tryBattle();});

    // Магазин + Задания — slot-style, two half-width
    const btn2Y = actY + actH + 8, b2H = 46, b2W = (actW - 8) / 2;
    const _drawSlotBtn = (bx, by, bw, bh, borderC, borderA) => {
      const g = mkG();
      g.fillStyle(0x1a1828, 1); g.fillRoundedRect(bx, by, bw, bh, 12);
      g.lineStyle(1.5, borderC, borderA); g.strokeRoundedRect(bx, by, bw, bh, 12);
      return g;
    };

    // Shop button
    const sBg = ca(_drawSlotBtn(PAD, btn2Y, b2W, b2H, 0x7c3aed, 0.5));
    // Bag icon
    const siG = ca(mkG()); const six = PAD + b2W / 2 - 34, siy = btn2Y + b2H / 2;
    siG.fillStyle(0xc084fc, 0.85); siG.fillRoundedRect(six-7,siy-5,14,11,2);
    siG.lineStyle(1.5,0xc084fc,0.9); siG.strokeRoundedRect(six-7,siy-5,14,11,2);
    siG.lineStyle(2,0xc084fc,0.8); siG.beginPath(); siG.arc(six,siy-5,4,Math.PI,Math.PI*2,false); siG.strokePath();
    siG.fillStyle(0x1a1828,1); siG.fillRect(six-5,siy-5,10,3);
    ca(mkT(PAD + b2W / 2 + 8, btn2Y + b2H / 2, 'Магазин', 14, '#c084fc', true)).setOrigin(0.5);
    const sZ = ca(mkZ(PAD + b2W / 2, btn2Y + b2H / 2, b2W, b2H).setInteractive({ useHandCursor: true }));
    sZ.on('pointerdown', () => { sBg.clear(); sBg.fillStyle(0x2a1f40,1); sBg.fillRoundedRect(PAD,btn2Y,b2W,b2H,12); sBg.lineStyle(1.5,0x7c3aed,1); sBg.strokeRoundedRect(PAD,btn2Y,b2W,b2H,12); });
    sZ.on('pointerout',  () => { sBg.clear(); sBg.fillStyle(0x1a1828,1); sBg.fillRoundedRect(PAD,btn2Y,b2W,b2H,12); sBg.lineStyle(1.5,0x7c3aed,0.5); sBg.strokeRoundedRect(PAD,btn2Y,b2W,b2H,12); });
    sZ.on('pointerup',   () => { sBg.clear(); sBg.fillStyle(0x1a1828,1); sBg.fillRoundedRect(PAD,btn2Y,b2W,b2H,12); sBg.lineStyle(1.5,0x7c3aed,0.5); sBg.strokeRoundedRect(PAD,btn2Y,b2W,b2H,12); this.scene.start('Shop', {}); });

    // Tasks button
    const tasksX = PAD + b2W + 8;
    const tBg = ca(_drawSlotBtn(tasksX, btn2Y, b2W, b2H, 0x3b82f6, 0.5));
    // Document icon
    const tiG = ca(mkG()); const tix = tasksX + b2W / 2 - 34, tiy = btn2Y + b2H / 2;
    tiG.fillStyle(0x93c5fd,0.15); tiG.fillRoundedRect(tix-7,tiy-8,13,16,2);
    tiG.lineStyle(1.5,0x93c5fd,0.85); tiG.strokeRoundedRect(tix-7,tiy-8,13,16,2);
    tiG.lineStyle(1.2,0x93c5fd,0.7); tiG.lineBetween(tix-4,tiy-4,tix+3,tiy-4);
    tiG.lineBetween(tix-4,tiy-1,tix+3,tiy-1);
    tiG.lineBetween(tix-4,tiy+2,tix+1,tiy+2);
    ca(mkT(tasksX + b2W / 2 + 8, btn2Y + b2H / 2, 'Задания', 14, '#93c5fd', true)).setOrigin(0.5);
    const tskZ = ca(mkZ(tasksX + b2W / 2, btn2Y + b2H / 2, b2W, b2H).setInteractive({ useHandCursor: true }));
    tskZ.on('pointerdown', () => { tBg.clear(); tBg.fillStyle(0x1a2d40,1); tBg.fillRoundedRect(tasksX,btn2Y,b2W,b2H,12); tBg.lineStyle(1.5,0x3b82f6,1); tBg.strokeRoundedRect(tasksX,btn2Y,b2W,b2H,12); });
    tskZ.on('pointerout',  () => { tBg.clear(); tBg.fillStyle(0x1a1828,1); tBg.fillRoundedRect(tasksX,btn2Y,b2W,b2H,12); tBg.lineStyle(1.5,0x3b82f6,0.5); tBg.strokeRoundedRect(tasksX,btn2Y,b2W,b2H,12); });
    tskZ.on('pointerup',   () => { tBg.clear(); tBg.fillStyle(0x1a1828,1); tBg.fillRoundedRect(tasksX,btn2Y,b2W,b2H,12); tBg.lineStyle(1.5,0x3b82f6,0.5); tBg.strokeRoundedRect(tasksX,btn2Y,b2W,b2H,12); this.scene.start('Tasks', {}); });

    // Badge on Tasks button in profile
    const pfBdgBg  = ca(this.add.graphics());
    const pfBdgTxt = ca(this.add.text(0, 0, '', { fontFamily: 'Arial', fontSize: '9px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    this._profileTasksBadgeObjs = { bg: pfBdgBg, txt: pfBdgTxt, bx: tasksX + b2W - 12, by: btn2Y + 10 };
    this._updateProfileTasksBadge();

    this._addEquipmentSlots(c, W, czY, czH, PAD, mkG, mkT, mkZ, ca);
    this._panels.profile = c;
    this._loadProfileBuffs();
  },

  _updateProfileTasksBadge() {
    const b = this._profileTasksBadgeObjs;
    if (!b) return;
    b.bg.clear();
    if ((this._tasksBadgeCount || 0) > 0) {
      b.bg.fillStyle(0xe03030, 1);
      b.bg.fillCircle(b.bx, b.by, 8);
      b.txt.setText(String(this._tasksBadgeCount));
      b.txt.setPosition(b.bx, b.by);
      b.txt.setVisible(true);
    } else {
      b.txt.setVisible(false);
    }
  },

});
