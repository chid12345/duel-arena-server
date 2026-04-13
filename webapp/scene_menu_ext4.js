/* ============================================================
   MenuScene — ext4: _buildProfilePanel
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _buildProfilePanel() {
    const { W, CONTENT_H: CH } = this;
    const p   = State.player;
    const c   = this.add.container(0, 0);
    const pad = 14;

    /* make.* — объекты создаются БЕЗ добавления в display list сцены,
       только в контейнер. Это гарантирует что они не "гуляют" по вкладкам. */
    const mkG = ()           => this.make.graphics({}, false);
    const mkT = (x, y, s, sz, col, bold, stroke) => {
      const style = { fontSize: `${sz}px`, fontFamily: 'Arial, Helvetica, sans-serif',
        fontStyle: bold ? 'bold' : 'normal', color: col || '#f0f0fa', resolution: 2 };
      if (stroke) { style.stroke = stroke; style.strokeThickness = Math.max(2, Math.round(sz * 0.22)); }
      return this.make.text({ x, y, text: String(s), style }, false);
    };
    const mkZ = (x, y, w, h) => this.make.zone({ x, y, width: w, height: h }, false);
    const mkI = (x, y, key)  => this.make.image({ x, y, key }, false);
    const mkBar = (x, y, w, h, pct, fillColor, bgColor = C.dark, radius = 4) => {
      const g = mkG();
      g.fillStyle(bgColor, 1); g.fillRoundedRect(x, y, w, h, radius);
      const fw = Math.max(radius * 2, Math.round(w * Math.min(1, Math.max(0, pct))));
      g.fillStyle(fillColor, 1); g.fillRoundedRect(x, y, fw, h, radius);
      return g;
    };
    const ca = o => { c.add(o); return o; };

    /* ── Шапка ─────────────────────────────────────────── */
    const hH = 74, hY = 6;
    const hBg = ca(mkG());
    hBg.fillStyle(C.bgPanel, 0.97); hBg.fillRoundedRect(pad, hY, W - pad * 2, hH, 14);
    hBg.lineStyle(2, C.gold, 0.28);  hBg.strokeRoundedRect(pad, hY, W - pad * 2, hH, 14);

    const lvlW = 60, lvlH = 30, lvlX = pad + 10, lvlY = hY + (hH - lvlH) / 2;
    const lvlG = ca(mkG());
    lvlG.fillStyle(C.gold, 1); lvlG.fillRoundedRect(lvlX, lvlY, lvlW, lvlH, 9);
    ca(mkT(lvlX + lvlW / 2, hY + hH / 2, `УР.${p.level}`, 14, '#1a1a28', true)).setOrigin(0.5);

    const nameX  = lvlX + lvlW + 10;
    const crown  = p.is_premium ? '👑 ' : '';
    const uname  = p.username.length > 15 ? p.username.slice(0, 14) + '…' : p.username;
    ca(mkT(nameX, hY + 12, crown + uname, 18, p.is_premium ? '#c8a0ff' : '#f0f0fa', true));
    const premSub  = p.is_premium ? `⭐ Premium · ${p.premium_days_left} дн.` : '';
    const titleBit = (!premSub && p.display_title) ? `🏵 ${p.display_title} · ` : '';
    ca(mkT(nameX, hY + 38,
      premSub || `${titleBit}ELO ★ ${p.rating}  🏆 ${p.wins}W  💀 ${p.losses}L`,
      12, p.is_premium ? '#b45aff' : '#ffc83c'));

    ca(mkT(W - pad - 12, hY + 14, `💰 ${p.gold}`,     15, '#ffc83c', true)).setOrigin(1, 0.5);
    ca(mkT(W - pad - 12, hY + 32, `💎 ${p.diamonds}`, 13, '#3cc8dc', true)).setOrigin(1, 0.5);

    const snX = W - pad - 16, snY = hY + 56;
    const snBg = ca(mkG()); snBg.fillStyle(C.dark, 0.7); snBg.fillCircle(snX, snY, 15);
    const snTxt = ca(mkT(snX, snY, Sound.muted ? '🔇' : '🔊', 13)).setOrigin(0.5);
    const snZ   = ca(mkZ(snX, snY, 34, 34).setInteractive({ useHandCursor: true }));
    snZ.on('pointerup', () => { snTxt.setText(Sound.toggleMute() ? '🔇' : '🔊'); tg?.HapticFeedback?.selectionChanged(); });

    /* ── Персонаж ───────────────────────────────────────── */
    const charY  = 240;
    const warrior = ca(mkI(W / 2, charY, 'warrior_blue').setScale(1.9).setOrigin(0.5));
    this.tweens.add({ targets: warrior, y: charY - 9, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const glowG = ca(mkG()); glowG.fillStyle(C.blue, 0.06); glowG.fillEllipse(W / 2, charY + 115, 160, 28);

    /* ── HP / XP ────────────────────────────────────────── */
    const hpW = 200, hpH = 14, hpX = W / 2 - hpW / 2, hpY = charY + 122;
    const hpPct = p.hp_pct / 100;
    const hpCol = p.hp_pct > 50 ? C.green : p.hp_pct > 25 ? C.gold : C.red;
    const hpBg  = ca(mkBar(hpX, hpY, hpW, hpH, hpPct, hpCol));
    const hpTxt = ca(mkT(W / 2, hpY + hpH / 2,
      `${p.current_hp} / ${p.max_hp_effective ?? p.max_hp} HP`, 11, '#ffffff', true, '#00000088')).setOrigin(0.5);
    this._liveHp = { g: hpBg, t: hpTxt, x: hpX, y: hpY, w: hpW, h: hpH };

    const xpH = 14, xpY = hpY + hpH + 6;
    if (!p.max_level) {
      ca(mkBar(hpX, xpY, hpW, xpH, p.xp_pct / 100, C.blue, C.dark, 5));
      ca(mkT(W / 2, xpY + xpH / 2,
        `⭐ ${p.xp_pct}%  ·  ${p.exp} / ${p.exp_needed} XP`, 10, '#ffffff', true, '#00000088')).setOrigin(0.5);
    } else {
      ca(mkT(W / 2, xpY + xpH / 2, '⭐ Макс. уровень', 11, '#ffc83c', true)).setOrigin(0.5);
    }

    /* ── Статы ──────────────────────────────────────────── */
    const STATS = [
      { icon: '💪', val: p.strength_effective  ?? p.strength,  color: C.red,    hex: '#dc3c46', sub: `~${p.dmg}ур`     },
      { icon: '🤸', val: p.agility_effective   ?? p.agility,   color: C.cyan,   hex: '#3cc8dc', sub: `${p.dodge_pct}%` },
      { icon: '💥', val: p.intuition_effective ?? p.intuition, color: C.purple, hex: '#b45aff', sub: `${p.crit_pct}%`  },
      { icon: '🛡', val: p.stamina_effective   ?? p.stamina,   color: C.green,  hex: '#3cc864', sub: `${p.armor_pct}%` },
    ];
    const statsTop = xpY + 20, scGap = 6, scH = 76;
    const scW  = (W - pad * 2 - scGap * 3) / 4;
    const maxV = Math.max(1, 3 + p.level * 2);
    this._profileStatSubs = [];
    STATS.forEach((s, i) => {
      const scX = pad + i * (scW + scGap), scCX = scX + scW / 2;
      const sbg = ca(mkG());
      sbg.fillStyle(C.bgPanel, 0.92); sbg.fillRoundedRect(scX, statsTop, scW, scH, 11);
      sbg.lineStyle(1.5, s.color, 0.28); sbg.strokeRoundedRect(scX, statsTop, scW, scH, 11);
      ca(mkT(scCX, statsTop + 14, s.icon, 18)).setOrigin(0.5);
      ca(mkT(scCX, statsTop + 36, String(s.val), 22, s.hex, true)).setOrigin(0.5);
      const subT = ca(mkT(scCX, statsTop + 58, s.sub, 13, s.hex)).setOrigin(0.5);
      this._profileStatSubs[i] = subT;
      const bbrG = ca(mkG()); const bW = scW - 12, pct = Math.min(1, s.val / maxV);
      bbrG.fillStyle(C.dark, 1); bbrG.fillRoundedRect(scX + 6, statsTop + scH - 8, bW, 4, 2);
      bbrG.fillStyle(s.color, 0.85); bbrG.fillRoundedRect(scX + 6, statsTop + scH - 8, Math.max(4, bW * pct), 4, 2);
    });

    /* ── Свободные статы ─────────────────────────────────── */
    const fsY = statsTop + scH + 10;
    if (p.free_stats > 0) {
      const fsG = ca(mkG());
      fsG.fillStyle(0x5520a0, 0.88); fsG.fillRoundedRect(W / 2 - 105, fsY, 210, 32, 10);
      fsG.lineStyle(1.5, C.purple, 0.8); fsG.strokeRoundedRect(W / 2 - 105, fsY, 210, 32, 10);
      ca(mkT(W / 2, fsY + 16, `⚡ ${p.free_stats} свободных очка статов`, 12, '#ffc83c', true)).setOrigin(0.5);
      this.tweens.add({ targets: fsG, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
    }

    /* ── Реген HP ────────────────────────────────────────── */
    const regenBaseY = fsY + (p.free_stats > 0 ? 42 : 4);
    if (p.current_hp < p.max_hp) {
      const rate = p.regen_per_min || 0;
      let secsLeft = p.regen_secs_to_full || 0;
      const _fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const regenTxt = ca(mkT(W / 2, regenBaseY,
        `❤️ +${rate}/мин · полный через ${_fmt(secsLeft)}`, 11, '#cc6655')).setOrigin(0.5);
      this._regenInterval = this.time.addEvent({
        delay: 1000, loop: true,
        callback: () => {
          if (secsLeft <= 0) { regenTxt.setText('✅ HP полный!').setStyle({ color: '#3cc864' }); return; }
          secsLeft = Math.max(0, secsLeft - 1);
          regenTxt.setText(secsLeft > 0 ? `❤️ +${rate}/мин · полный через ${_fmt(secsLeft)}` : '✅ HP полный!');
        },
      });
    }

    /* ── Аптека ─────────────────────────────────────────── */
    const apBtnY = regenBaseY + (p.current_hp < p.max_hp ? 20 : 4);
    if (p.hp_pct < 100) {
      const apW = 170, apH = 38, apX = W / 2 - apW / 2;
      const apBg = ca(mkG()); apBg.fillStyle(C.red, 0.88); apBg.fillRoundedRect(apX, apBtnY, apW, apH, 11);
      ca(mkT(W / 2, apBtnY + apH / 2, '🧪 Аптека', 14, '#ffffff', true)).setOrigin(0.5);
      const apZ = ca(mkZ(W / 2, apBtnY + apH / 2, apW, apH).setInteractive({ useHandCursor: true }));
      apZ.on('pointerdown', () => { apBg.clear(); apBg.fillStyle(0x991a22, 1); apBg.fillRoundedRect(apX, apBtnY, apW, apH, 11); });
      apZ.on('pointerup',   () => { tg?.HapticFeedback?.impactOccurred('medium'); this.scene.start('Shop', { tab: 'consumables' }); });
      apZ.on('pointerout',  () => { apBg.clear(); apBg.fillStyle(C.red, 0.88); apBg.fillRoundedRect(apX, apBtnY, apW, apH, 11); });
    }

    /* ── Обновить данные ─────────────────────────────────── */
    const refH = 44, refY = CH - refH - 6, refW = W - 56, refX = 28;
    const refG = ca(mkG());
    refG.fillStyle(C.dark, 0.85); refG.fillRoundedRect(refX, refY, refW, refH, 13);
    refG.lineStyle(1.5, C.blue, 0.35); refG.strokeRoundedRect(refX, refY, refW, refH, 13);
    const refT = ca(mkT(W / 2, refY + refH / 2, '🔄 Обновить данные', 14, '#7799cc', true)).setOrigin(0.5);
    const refZ = ca(mkZ(W / 2, refY + refH / 2, refW, refH).setInteractive({ useHandCursor: true }));
    let _refBusy = false;
    refZ.on('pointerdown', () => { refG.clear(); refG.fillStyle(C.blue, 0.25); refG.fillRoundedRect(refX, refY, refW, refH, 13); tg?.HapticFeedback?.impactOccurred('light'); });
    refZ.on('pointerup',   () => { if (_refBusy) return; _refBusy = true; refT.setText('⏳'); this.time.delayedCall(400, () => this.scene.restart({ returnTab: this._activeTab || 'profile' })); });
    refZ.on('pointerout',  () => { refG.clear(); refG.fillStyle(C.dark, 0.85); refG.fillRoundedRect(refX, refY, refW, refH, 13); refG.lineStyle(1.5, C.blue, 0.35); refG.strokeRoundedRect(refX, refY, refW, refH, 13); });

    c.list.forEach(o => { try { this.sys.displayList.remove(o); } catch(_) {} });
    this.sys.displayList.remove(c);
    this._panels.profile = c;
    this._loadProfileBuffs();
  },

});
