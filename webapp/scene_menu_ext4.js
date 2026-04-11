/* ============================================================
   MenuScene — ext4: _buildProfilePanel
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _buildProfilePanel() {
    const { W, CONTENT_H: CH } = this;
    const p   = State.player;
    const c   = this.add.container(0, 0);
    const pad = 14;

    const hH = 74, hY = 6;
    const hBg = this.add.graphics();
    hBg.fillStyle(C.bgPanel, 0.97);
    hBg.fillRoundedRect(pad, hY, W - pad * 2, hH, 14);
    hBg.lineStyle(2, C.gold, 0.28);
    hBg.strokeRoundedRect(pad, hY, W - pad * 2, hH, 14);

    const lvlW = 60, lvlH = 30, lvlX = pad + 10, lvlY = hY + (hH - lvlH) / 2;
    const lvlG = this.add.graphics();
    lvlG.fillStyle(C.gold, 1);
    lvlG.fillRoundedRect(lvlX, lvlY, lvlW, lvlH, 9);
    const lvlTxt = txt(this, lvlX + lvlW / 2, hY + hH / 2, `УР.${p.level}`, 14, '#1a1a28', true).setOrigin(0.5);

    const nameX   = lvlX + lvlW + 10;
    const crown   = p.is_premium ? '👑 ' : '';
    const uname   = p.username.length > 15 ? p.username.slice(0, 14) + '…' : p.username;
    const nameTxt = txt(this, nameX, hY + 12, crown + uname, 18, p.is_premium ? '#c8a0ff' : '#f0f0fa', true);
    const premSub = p.is_premium ? `⭐ Premium · ${p.premium_days_left} дн.` : '';
    const titleBit = (!premSub && p.display_title) ? `🏵 ${p.display_title} · ` : '';
    const subTxt  = txt(this, nameX, hY + 38,
      premSub || `${titleBit}ELO ★ ${p.rating}  🏆 ${p.wins}W  💀 ${p.losses}L`, 12,
      p.is_premium ? '#b45aff' : '#ffc83c');

    const goldTxt = txt(this, W - pad - 12, hY + 14, `💰 ${p.gold}`, 15, '#ffc83c', true).setOrigin(1, 0.5);
    txt(this, W - pad - 12, hY + 32, `💎 ${p.diamonds}`, 13, '#3cc8dc', true).setOrigin(1, 0.5);

    const snX = W - pad - 16, snY = hY + 56;
    const snBg = this.add.graphics();
    snBg.fillStyle(C.dark, 0.7); snBg.fillCircle(snX, snY, 15);
    const snTxt = txt(this, snX, snY, Sound.muted ? '🔇' : '🔊', 13).setOrigin(0.5);
    const snZ = this.add.zone(snX, snY, 34, 34).setInteractive({ useHandCursor: true });
    snZ.on('pointerup', () => {
      const m = Sound.toggleMute();
      snTxt.setText(m ? '🔇' : '🔊');
      tg?.HapticFeedback?.selectionChanged();
    });

    const charY = 240;
    const warrior = this.add.image(W / 2, charY, 'warrior_blue').setScale(1.9).setOrigin(0.5);
    this.tweens.add({
      targets: warrior, y: charY - 9,
      duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const glowG = this.add.graphics();
    glowG.fillStyle(C.blue, 0.06);
    glowG.fillEllipse(W / 2, charY + 115, 160, 28);

    const hpW  = 200, hpH = 14;
    const hpX  = W / 2 - hpW / 2;
    const hpY  = charY + 122;
    const hpPct = p.hp_pct / 100;
    const hpCol = p.hp_pct > 50 ? C.green : p.hp_pct > 25 ? C.gold : C.red;
    const hpBg  = makeBar(this, hpX, hpY, hpW, hpH, hpPct, hpCol);
    const hpTxt = txt(this, W / 2, hpY + hpH / 2, `${p.current_hp} / ${p.max_hp_effective ?? p.max_hp} HP`, 11, '#ffffff', true, '#00000088').setOrigin(0.5);
    this._liveHp = { g: hpBg, t: hpTxt, x: hpX, y: hpY, w: hpW, h: hpH };

    let xpBg, xpTxt;
    const xpH = 14;
    const xpY = hpY + hpH + 6;
    if (!p.max_level) {
      xpBg  = makeBar(this, hpX, xpY, hpW, xpH, p.xp_pct / 100, C.blue, C.dark, 5);
      xpTxt = txt(this, W / 2, xpY + xpH / 2,
        `⭐ ${p.xp_pct}%  ·  ${p.exp} / ${p.exp_needed} XP`, 10, '#ffffff', true, '#00000088').setOrigin(0.5);
    } else {
      txt(this, W / 2, xpY + xpH / 2, '⭐ Макс. уровень', 11, '#ffc83c', true).setOrigin(0.5);
    }

    const STATS = [
      { icon: '💪', label: 'СИЛ', val: p.strength_effective  ?? p.strength,  color: C.red,    hex: '#dc3c46', sub: `~${p.dmg}ур`     },
      { icon: '🤸', label: 'ЛОВ', val: p.agility_effective   ?? p.agility,   color: C.cyan,   hex: '#3cc8dc', sub: `${p.dodge_pct}%` },
      { icon: '💥', label: 'ИНТ', val: p.intuition_effective ?? p.intuition, color: C.purple, hex: '#b45aff', sub: `${p.crit_pct}%`  },
      { icon: '🛡', label: 'ВЫН', val: p.stamina_effective   ?? p.stamina,   color: C.green,  hex: '#3cc864', sub: `${p.armor_pct}%` },
    ];
    const statsTop = xpBg ? xpY + 20 : xpY + 6;
    const scGap = 6, scH = 76;
    const scW   = (W - pad * 2 - scGap * 3) / 4;
    const maxV  = Math.max(1, 3 + p.level * 2);

    this._profileStatSubs = [];
    const statObjs = STATS.map((s, i) => {
      const scX  = pad + i * (scW + scGap);
      const scCX = scX + scW / 2;
      const hexC = s.hex;

      const sbg = this.add.graphics();
      sbg.fillStyle(C.bgPanel, 0.92);
      sbg.fillRoundedRect(scX, statsTop, scW, scH, 11);
      sbg.lineStyle(1.5, s.color, 0.28);
      sbg.strokeRoundedRect(scX, statsTop, scW, scH, 11);

      const icoT = txt(this, scCX, statsTop + 14, s.icon, 18).setOrigin(0.5);
      const valT = txt(this, scCX, statsTop + 36, String(s.val), 22, hexC, true).setOrigin(0.5);
      const subT = txt(this, scCX, statsTop + 58, s.sub, 13, hexC).setOrigin(0.5);
      this._profileStatSubs[i] = subT;

      const pct = Math.min(1, s.val / maxV);
      const bW  = scW - 12;
      const bbrG = this.add.graphics();
      bbrG.fillStyle(C.dark, 1);
      bbrG.fillRoundedRect(scX + 6, statsTop + scH - 8, bW, 4, 2);
      bbrG.fillStyle(s.color, 0.85);
      bbrG.fillRoundedRect(scX + 6, statsTop + scH - 8, Math.max(4, bW * pct), 4, 2);

      return [sbg, icoT, valT, subT, bbrG];
    });

    let fsBadge = [];
    const fsY = statsTop + scH + 10;
    if (p.free_stats > 0) {
      const fsG = this.add.graphics();
      fsG.fillStyle(0x5520a0, 0.88);
      fsG.fillRoundedRect(W / 2 - 105, fsY, 210, 32, 10);
      fsG.lineStyle(1.5, C.purple, 0.8);
      fsG.strokeRoundedRect(W / 2 - 105, fsY, 210, 32, 10);
      const fsT = txt(this, W / 2, fsY + 16, `⚡ ${p.free_stats} свободных очка статов`, 12, '#ffc83c', true).setOrigin(0.5);
      this.tweens.add({ targets: fsG, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
      fsBadge = [fsG, fsT];
    }

    let regenObjs = [];
    const regenBaseY = fsBadge.length ? fsY + 42 : fsY + 4;
    if (p.current_hp < p.max_hp) {
      const rate = p.regen_per_min || 0;
      let secsLeft = p.regen_secs_to_full || 0;
      const _fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const regenTxt = txt(this, W / 2, regenBaseY,
        `❤️ +${rate}/мин · полный через ${_fmt(secsLeft)}`, 11, '#cc6655').setOrigin(0.5);
      this._regenInterval = this.time.addEvent({
        delay: 1000, loop: true,
        callback: () => {
          if (secsLeft <= 0) { regenTxt.setText('✅ HP полный!').setStyle({ color: '#3cc864' }); return; }
          secsLeft = Math.max(0, secsLeft - 1);
          regenTxt.setText(secsLeft > 0
            ? `❤️ +${rate}/мин · полный через ${_fmt(secsLeft)}`
            : '✅ HP полный!');
        },
      });
      regenObjs = [regenTxt];
    }

    let hpExtra = [];
    const apBtnY = regenBaseY + (regenObjs.length ? 20 : 4);
    if (p.hp_pct < 100) {
      const apW = 170, apH = 38, apX = W / 2 - apW / 2;
      const apBg = this.add.graphics();
      apBg.fillStyle(C.red, 0.88);
      apBg.fillRoundedRect(apX, apBtnY, apW, apH, 11);
      const apT = txt(this, W / 2, apBtnY + apH / 2, '🧪 Аптека', 14, '#ffffff', true).setOrigin(0.5);
      const apZ = this.add.zone(W / 2, apBtnY + apH / 2, apW, apH).setInteractive({ useHandCursor: true });
      apZ.on('pointerdown', () => { apBg.clear(); apBg.fillStyle(0x991a22, 1); apBg.fillRoundedRect(apX, apBtnY, apW, apH, 11); });
      apZ.on('pointerup',   () => { tg?.HapticFeedback?.impactOccurred('medium'); this.scene.start('Shop', { tab: 'consumables' }); });
      apZ.on('pointerout',  () => { apBg.clear(); apBg.fillStyle(C.red, 0.88); apBg.fillRoundedRect(apX, apBtnY, apW, apH, 11); });
      hpExtra = [apBg, apT, apZ];
    }

    const refH = 44, refY = CH - refH - 6;
    const refW = W - 56, refX = 28;
    const refG = this.add.graphics();
    refG.fillStyle(C.dark, 0.85);
    refG.fillRoundedRect(refX, refY, refW, refH, 13);
    refG.lineStyle(1.5, C.blue, 0.35);
    refG.strokeRoundedRect(refX, refY, refW, refH, 13);
    const refT = txt(this, W / 2, refY + refH / 2, '🔄 Обновить данные', 14, '#7799cc', true).setOrigin(0.5);
    const refZ = this.add.zone(W / 2, refY + refH / 2, refW, refH).setInteractive({ useHandCursor: true });
    let _refBusy = false;
    refZ.on('pointerdown', () => { refG.clear(); refG.fillStyle(C.blue, 0.25); refG.fillRoundedRect(refX, refY, refW, refH, 13); tg?.HapticFeedback?.impactOccurred('light'); });
    refZ.on('pointerup',   () => { if (_refBusy) return; _refBusy = true; refT.setText('⏳'); this.time.delayedCall(400, () => this.scene.restart({ returnTab: this._activeTab || 'profile' })); });
    refZ.on('pointerout',  () => { refG.clear(); refG.fillStyle(C.dark, 0.85); refG.fillRoundedRect(refX, refY, refW, refH, 13); refG.lineStyle(1.5, C.blue, 0.35); refG.strokeRoundedRect(refX, refY, refW, refH, 13); });

    const children = [
      hBg, lvlG, lvlTxt, nameTxt, subTxt, goldTxt,
      snBg, snTxt, snZ,
      glowG, warrior, hpBg, hpTxt,
      ...statObjs.flat(),
      refG, refT, refZ,
    ];
    if (xpBg)        children.push(xpBg, xpTxt);
    if (fsBadge.length)   children.push(...fsBadge);
    if (regenObjs.length) children.push(...regenObjs);
    children.push(...hpExtra);
    children.forEach(o => c.add(o));

    this._panels.profile = c;
    this._loadProfileBuffs();
  }

});
