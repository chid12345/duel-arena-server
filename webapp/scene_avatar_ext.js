/* ═══════════════════════════════════════════════════════════
   AvatarScene ext — рендер крупных карточек + скролл
   ═══════════════════════════════════════════════════════════ */

Object.assign(AvatarScene.prototype, {

  _renderList() {
    this._layer.forEach(o => { try { o.destroy(); } catch(_) {} });
    this._layer = []; this._tapAreas = [];
    if (this._scrollTimer) { this._scrollTimer.destroy(); this._scrollTimer = null; }
    if (this._scrZ) { this._scrZ.destroy(); this._scrZ = null; }
    if (this._ctr) { try { this._ctr.clearMask(); } catch(_) {} this._ctr.destroy(); this._ctr = null; }
    if (this._mGfx) { this._mGfx.destroy(); this._mGfx = null; }

    const W = this.W, H = this.H;
    const cards = this._filterAvatars();
    const pad = 10, cardH = 130, gap = 8, cardW = W - pad * 2;
    const areaTop = 104, viewH = H - areaTop - 6;
    const totalH = cards.length * (cardH + gap) - gap;
    const maxScroll = Math.max(0, totalH - viewH);

    if (!cards.length) {
      const errMsg = this._loadError ? `Ошибка: ${this._loadError.slice(0, 60)}` : 'Нет образов';
      const e = txt(this, W / 2, areaTop + 50, errMsg, 12, this._loadError ? '#ff6666' : '#666').setOrigin(0.5);
      this._layer.push(e);
      if (this._loadError) {
        // Кнопка "Повторить"
        const rb = this.add.graphics();
        rb.fillStyle(0x2a1040, 0.9); rb.fillRoundedRect(W/2 - 55, areaTop + 72, 110, 30, 8);
        rb.lineStyle(1.5, 0x9955ee, 0.8); rb.strokeRoundedRect(W/2 - 55, areaTop + 72, 110, 30, 8);
        this._layer.push(rb);
        const rt = txt(this, W/2, areaTop + 87, '🔄 Повторить', 12, '#cc99ff', true).setOrigin(0.5);
        this._layer.push(rt);
        const rz = this.add.zone(W/2, areaTop + 87, 110, 30).setInteractive({ useHandCursor: true });
        rz.on('pointerup', () => { State.avatarsCache = null; this.scene.restart({ tab: this._tab }); });
        this._layer.push(rz);
      }
      return;
    }

    const ctr = this.add.container(0, areaTop).setDepth(5);
    this._ctr = ctr;
    // Маска через make.graphics({ add: false }) — объект НЕ добавляется в display list,
    // но stencil buffer записывается корректно (fix: setVisible(false) ломал WebGL stencil).
    const mGfx = this.make.graphics({ add: false });
    mGfx.fillStyle(0xffffff, 1); mGfx.fillRect(0, areaTop, W, viewH);
    ctr.setMask(mGfx.createGeometryMask());
    this._mGfx = mGfx;

    cards.forEach((av, i) => this._drawBigCard(ctr, pad, i * (cardH + gap), cardW, cardH, av));
    this._setupScroll(areaTop, viewH, maxScroll, ctr);
  },

  _drawBigCard(ctr, cx, cy, w, h, av) {
    const tier = _AV_TIER[av.rarity] || _AV_TIER.common;
    const isEq = av.equipped, isUn = av.unlocked;

    // Card background — куплен: чуть светлее фон
    const g = this.add.graphics();
    const bgColor = isUn ? (isEq ? 0x0d2a14 : 0x0a1a2e) : tier.bg;
    g.fillStyle(bgColor, 0.97); g.fillRoundedRect(cx, cy, w, h, 14);
    // Рамка: зелёная (экипирован), синяя (куплен), обычная (не куплен)
    const borderColor = isEq ? 0x3cc864 : (isUn ? 0x44aaff : tier.border);
    const borderW = (isEq || isUn) ? 2 : 1.5;
    const borderA = (isEq || isUn) ? 0.9 : 0.5;
    g.lineStyle(borderW, borderColor, borderA);
    g.strokeRoundedRect(cx, cy, w, h, 14);
    ctr.add(g); this._layer.push(g);

    // Shine accent
    const sg = this.add.graphics();
    sg.fillStyle(isUn ? borderColor : tier.border, isUn ? 0.07 : 0.04);
    sg.fillRoundedRect(cx + w * 0.5, cy, w * 0.5, h * 0.6, { tr: 14, br: 0, tl: 0, bl: 0 });
    ctr.add(sg); this._layer.push(sg);

    const addT = (x, y, s, sz, col, bold) => {
      const t = txt(this, x, y, s, sz, col, bold); ctr.add(t); this._layer.push(t); return t;
    };

    // Badge + Name + Rarity
    addT(cx + 12, cy + 8, av.badge || '?', 28, '#ffffff');
    const name = (av.name || av.id).replace(/^[^\s]+\s/, '');
    addT(cx + 48, cy + 10, name, 13, '#ffffff', true);
    addT(cx + 48, cy + 27, tier.label, 9, tier.lc, true);

    // Бейдж "КУПЛЕН" в правом верхнем углу
    if (isUn && !isEq) {
      const bw = 54, bh = 16, bx = cx + w - bw - 8, by = cy + 8;
      const bg2 = this.add.graphics();
      bg2.fillStyle(0x44aaff, 0.22); bg2.fillRoundedRect(bx, by, bw, bh, 6);
      bg2.lineStyle(1, 0x44aaff, 0.7); bg2.strokeRoundedRect(bx, by, bw, bh, 6);
      ctr.add(bg2); this._layer.push(bg2);
      addT(bx + bw / 2, by + bh / 2, '✔ КУПЛЕН', 8, '#88ddff', true).setOrigin(0.5, 0.5);
    }

    // Description
    addT(cx + 12, cy + 48, (av.description || '').slice(0, 45), 11, '#ffffff', true);

    // Stat bars
    const stats = [
      { l: 'СИЛА',  v: av.effective_strength || 0, c: 0xff6b6b, tc: '#ffaaaa' },
      { l: 'ЛОВК',  v: av.effective_endurance || 0, c: 0x4ecdc4, tc: '#88eeff' },
      { l: 'ИНТУ',  v: av.effective_crit || 0,      c: 0xb45aff, tc: '#dd99ff' },
      { l: 'ВЫНОС', v: av.effective_hp_flat || 0,    c: 0x4ade80, tc: '#88ffbb' },
    ];
    const barW = Math.floor((w - 36) / 4) - 4;
    const barY = cy + 66;
    stats.forEach((s, si) => {
      const bx = cx + 10 + si * (barW + 6);
      addT(bx, barY, s.l, 9, '#ffffff', true);
      // Track
      const tg = this.add.graphics();
      tg.fillStyle(0x000000, 0.35); tg.fillRoundedRect(bx, barY + 13, barW, 6, 3);
      ctr.add(tg); this._layer.push(tg);
      // Fill
      const maxStat = 14;
      const fillW = Math.max(2, Math.round(barW * Math.min(1, s.v / maxStat)));
      const fg = this.add.graphics();
      fg.fillStyle(s.c, 1); fg.fillRoundedRect(bx, barY + 13, fillW, 6, 3);
      ctr.add(fg); this._layer.push(fg);
      // Value
      addT(bx, barY + 22, `+${s.v}`, 11, s.tc, true);
    });

    // Bottom: price or status
    const pl = this._priceLabel(av);
    if (isEq) {
      addT(cx + 12, cy + h - 20, '✓ Экипирован', 12, '#55ff88', true);
    } else if (isUn) {
      addT(cx + 12, cy + h - 20, '👆 Нажми чтобы надеть', 11, '#66ccff', true);
    } else {
      addT(cx + 12, cy + h - 20, '🔒 ' + pl.text, 12, pl.color, true);
    }

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
        for (const a of this._tapAreas) {
          if (relX >= a.x && relX <= a.x + a.w && relY >= a.y && relY <= a.y + a.h) {
            this._onAvatarTap(a.avatar); return;
          }
        }
      }
    });
    this._scrollTimer = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (active || Math.abs(vel) < 0.5) return;
      scrollY = clamp(scrollY + vel); vel *= 0.88; ctr.setY(areaTop - scrollY);
    }});
  },
});
