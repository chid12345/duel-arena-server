/* ═══════════════════════════════════════════════════════════
   AvatarScene ext — сетка карточек + скролл
   ═══════════════════════════════════════════════════════════ */

Object.assign(AvatarScene.prototype, {

  _renderGrid() {
    this._layer.forEach(o => { try { o.destroy(); } catch(_) {} });
    this._layer = []; this._tapAreas = [];
    if (this._scrZ) { this._scrZ.destroy(); this._scrZ = null; }
    if (this._mGfx) { this._mGfx.destroy(); this._mGfx = null; }
    if (this._ctr) { this._ctr.destroy(); this._ctr = null; }

    const W = this.W, H = this.H;
    const cards = this._filterAvatars();
    const cols = 2, gap = 8, pad = 10;
    const cardW = Math.floor((W - pad * 2 - gap) / cols);
    const cardH = 110;
    const areaTop = 104, areaBot = H - 8, viewH = areaBot - areaTop;
    const rows = Math.ceil(cards.length / cols);
    const totalH = rows * (cardH + gap) - gap;
    const maxScroll = Math.max(0, totalH - viewH);

    if (!cards.length) {
      const e = txt(this, W / 2, areaTop + 40, 'Нет образов', 13, '#666').setOrigin(0.5);
      this._layer.push(e); return;
    }

    const ctr = this.add.container(0, areaTop).setDepth(5);
    this._ctr = ctr;
    const mGfx = this.add.graphics();
    mGfx.fillStyle(0xffffff, 1); mGfx.fillRect(0, areaTop, W, viewH);
    mGfx.setVisible(false);
    ctr.setMask(mGfx.createGeometryMask());
    this._mGfx = mGfx;

    cards.forEach((av, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      this._drawCard(ctr, pad + col * (cardW + gap), row * (cardH + gap), cardW, cardH, av);
    });

    this._setupScroll(areaTop, viewH, maxScroll, ctr);
  },

  _drawCard(ctr, cx, cy, w, h, av) {
    const rclr = _AV_RARITY_CLR[av.rarity] || _AV_RARITY_CLR.common;
    const isEq = av.equipped, isUn = av.unlocked;

    const g = this.add.graphics();
    g.fillStyle(rclr.bg, 0.95); g.fillRoundedRect(cx, cy, w, h, 10);
    g.lineStyle(isEq ? 2 : 1.5, isEq ? 0x3cc864 : rclr.border, isEq ? 1 : 0.6);
    g.strokeRoundedRect(cx, cy, w, h, 10);
    ctr.add(g); this._layer.push(g);

    const addT = (x, y, s, sz, col, bold) => {
      const t = txt(this, x, y, s, sz, col, bold); ctr.add(t); this._layer.push(t); return t;
    };

    addT(cx + 8, cy + 6, av.badge || '?', 18, '#ffffff');
    const name = (av.name || av.id).replace(/^[^\s]+\s/, '');
    addT(cx + 32, cy + 8, name.length > 14 ? name.slice(0, 13) + '…' : name, 10, rclr.text, true);

    // Stats pills
    const stats = [
      { l: `С${av.effective_strength || 0}`, c: '#ff8888', v: av.effective_strength },
      { l: `Л${av.effective_endurance || 0}`, c: '#55ddff', v: av.effective_endurance },
      { l: `И${av.effective_crit || 0}`, c: '#cc77ff', v: av.effective_crit },
      { l: `В${av.effective_hp_flat || 0}`, c: '#55ff99', v: av.effective_hp_flat },
    ];
    const pw = Math.floor((w - 20) / 4) - 2;
    stats.forEach((s, si) => {
      const px = cx + 6 + si * (pw + 3), py = cy + 30;
      const pg = this.add.graphics();
      pg.fillStyle(s.v > 0 ? 0x222244 : 0x181828, 0.9);
      pg.fillRoundedRect(px, py, pw, 16, 4);
      ctr.add(pg); this._layer.push(pg);
      addT(px + pw / 2, py + 8, s.l, 9, s.v > 0 ? s.c : '#555').setOrigin(0.5);
    });

    addT(cx + 8, cy + 52, (av.description || '').slice(0, 30), 8, 'rgba(255,255,255,0.5)');

    if (isEq) addT(cx + 8, cy + h - 26, '✓ Экипирован', 10, '#3cc864', true);
    else if (isUn) addT(cx + 8, cy + h - 26, '🔓 Доступен', 10, '#7ab4ff', true);
    else addT(cx + 8, cy + h - 26, '🔒 ' + this._priceText(av), 10, rclr.text, true);

    const rLabels = { common: 'C', rare: 'R', epic: 'E', legendary: 'L' };
    addT(cx + w - 16, cy + 8, rLabels[av.rarity] || '?', 9, rclr.text, true).setOrigin(0.5);

    this._tapAreas.push({ x: cx, y: cy, w, h, avatar: av });
  },

  _setupScroll(areaTop, viewH, maxScroll, ctr) {
    let scrollY = 0, sy0 = 0, sY0 = 0, active = false, vel = 0, lastY = 0, lastT = 0;
    const clamp = v => Math.max(0, Math.min(maxScroll, v));
    const scrZ = this.add.zone(this.W / 2, areaTop + viewH / 2, this.W, viewH)
      .setInteractive().setDepth(6);
    this._scrZ = scrZ;

    scrZ.on('pointerdown', p => { sy0 = p.y; sY0 = scrollY; active = true; vel = 0; lastY = p.y; lastT = this.game.loop.now; });
    scrZ.on('pointermove', p => {
      if (!active) return;
      const dt = this.game.loop.now - lastT;
      if (dt > 0) vel = (lastY - p.y) / dt * 16;
      lastY = p.y; lastT = this.game.loop.now;
      scrollY = clamp(sY0 - (p.y - sy0)); ctr.setY(areaTop - scrollY);
    });
    scrZ.on('pointerup', p => {
      if (!active) return; active = false;
      if (Math.abs(p.y - sy0) < 8) {
        const relY = p.y - areaTop + scrollY, relX = p.x;
        for (const area of this._tapAreas) {
          if (relX >= area.x && relX <= area.x + area.w && relY >= area.y && relY <= area.y + area.h) {
            this._onAvatarTap(area.avatar); return;
          }
        }
      }
    });
    this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (active || Math.abs(vel) < 0.5) return;
      scrollY = clamp(scrollY + vel); vel *= 0.88; ctr.setY(areaTop - scrollY);
    }});
  },

});
