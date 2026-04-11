/* ============================================================
   BattleScene — ext1: _hpBar, _hpFillColor, _redrawHpGhost,
     _redrawHpFill, _redrawBar, _setGhostHpBar,
     _buildChoicePanel, _zoneButton, _drawZoneBtn,
     _miniBtn, _buildLog
   ============================================================ */

Object.assign(BattleScene.prototype, {

  _hpBar(x, y, w, pct, color) {
    const h = 10;
    const bg = this.add.graphics();
    bg.fillStyle(C.dark, 1);
    bg.fillRoundedRect(x, y, w, h, 3);

    const ghost = this.add.graphics();
    const fill = this.add.graphics();

    const bar = {
      bg, ghost, fill, _x: x, _y: y, _w: w, _h: h, _baseColor: color, _ghostTween: null, _ghostProxy: null,
    };
    this._redrawHpGhost(ghost, x, y, w, h, pct);
    this._redrawHpFill(fill, x, y, w, h, pct, color);
    return bar;
  },

  _hpFillColor(pct, baseColor) {
    return pct > 0.5 ? baseColor : (pct > 0.25 ? C.gold : C.red);
  },

  _redrawHpGhost(g, x, y, w, h, pct) {
    g.clear();
    const fw = Math.max(6, Math.round(w * Math.min(1, Math.max(0, pct))));
    g.fillStyle(0xe8e8ff, 0.5);
    g.fillRoundedRect(x, y, fw, h, 3);
  },

  _redrawHpFill(g, x, y, w, h, pct, baseColor) {
    g.clear();
    const fw = Math.max(6, Math.round(w * Math.min(1, Math.max(0, pct))));
    const col = this._hpFillColor(pct, baseColor);
    g.fillStyle(col, 1);
    g.fillRoundedRect(x, y, fw, h, 3);
  },

  _redrawBar(g, x, y, w, h, pct, color) {
    g.clear();
    g.fillStyle(C.dark, 1);
    g.fillRoundedRect(x, y, w, h, 3);
    const fw = Math.max(6, Math.round(w * Math.min(1, Math.max(0, pct))));
    const col = this._hpFillColor(pct, color);
    g.fillStyle(col, 1);
    g.fillRoundedRect(x, y, fw, h, 3);
  },

  _setGhostHpBar(bar, newPct, prevPct, baseColor) {
    if (!bar || !bar.fill) return;
    const { _x: x, _y: y, _w: w, _h: h, ghost, fill } = bar;
    const np = Math.min(1, Math.max(0, newPct));
    const pp = Math.min(1, Math.max(0, prevPct));

    this._redrawHpFill(fill, x, y, w, h, np, baseColor);

    if (bar._ghostProxy) {
      this.tweens.killTweensOf(bar._ghostProxy);
      bar._ghostProxy = null;
    }
    bar._ghostTween = null;

    if (Math.abs(np - pp) < 0.0005) {
      this._redrawHpGhost(ghost, x, y, w, h, np);
      return;
    }

    if (pp > np) {
      const startW = Math.max(6, Math.round(w * pp));
      const endW = Math.max(6, Math.round(w * np));
      this._redrawHpGhost(ghost, x, y, w, h, pp);
      const proxy = { fw: startW };
      bar._ghostProxy = proxy;
      bar._ghostTween = this.tweens.add({
        targets: proxy,
        fw: endW,
        duration: 520,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          const gPct = Math.min(1, Math.max(0, proxy.fw / w));
          this._redrawHpGhost(ghost, x, y, w, h, gPct);
        },
        onComplete: () => {
          this._redrawHpGhost(ghost, x, y, w, h, np);
          bar._ghostTween = null;
        },
      });
    } else {
      this._redrawHpGhost(ghost, x, y, w, h, np);
    }
  },

  _buildChoicePanel() {
    const { W, H } = this;
    const panY = H * 0.6;

    makePanel(this, 8, panY - 4, W - 16, H - panY - 8, 14);

    txt(this, W/2, panY + 10, 'ВЫБЕРИ АТАКУ', 12, '#8888aa', true).setOrigin(0.5);
    txt(this, W/2, panY + H * 0.18 + 6, 'ВЫБЕРИ ЗАЩИТУ', 12, '#8888aa', true).setOrigin(0.5);

    const zones = [
      { key: 'HEAD',  label: '👤 Голова', x: W * 0.18 },
      { key: 'TORSO', label: '🧥 Тело',   x: W * 0.50 },
      { key: 'LEGS',  label: '🦵 Ноги',   x: W * 0.82 },
    ];

    this._attackBtns  = zones.map(z => this._zoneButton(z.x, panY + 36, z.key, z.label, 'attack'));
    this._defenseBtns = zones.map(z => this._zoneButton(z.x, panY + H * 0.18 + 32, z.key, z.label, 'defense'));

    const autoBtnY = H - 34;
    const autoBg = this.add.graphics();
    autoBg.fillStyle(0x2a2050, 1);
    autoBg.fillRoundedRect(12, autoBtnY - 18, W - 24, 36, 10);
    autoBg.lineStyle(1.5, C.purple, 0.5);
    autoBg.strokeRoundedRect(12, autoBtnY - 18, W - 24, 36, 10);
    const autoT = txt(this, W/2, autoBtnY, '🎲  Случайный ход', 14, '#c0a0ff', true).setOrigin(0.5);
    const autoZ = this.add.zone(W/2, autoBtnY, W - 24, 36).setInteractive({ useHandCursor: true });
    autoZ.on('pointerdown', () => { autoBg.clear(); autoBg.fillStyle(C.purple, 0.28); autoBg.fillRoundedRect(12, autoBtnY-18, W-24, 36, 10); tg?.HapticFeedback?.impactOccurred('light'); });
    autoZ.on('pointerup',   () => { autoBg.clear(); autoBg.fillStyle(0x2a2050, 1); autoBg.fillRoundedRect(12, autoBtnY-18, W-24, 36, 10); autoBg.lineStyle(1.5, C.purple, 0.5); autoBg.strokeRoundedRect(12, autoBtnY-18, W-24, 36, 10); this._onAuto(); });
    autoZ.on('pointerout',  () => { autoBg.clear(); autoBg.fillStyle(0x2a2050, 1); autoBg.fillRoundedRect(12, autoBtnY-18, W-24, 36, 10); autoBg.lineStyle(1.5, C.purple, 0.5); autoBg.strokeRoundedRect(12, autoBtnY-18, W-24, 36, 10); });
    this._autoBtn = { g: autoBg, t: autoT, zone: autoZ };

    this._waitTxt = txt(this, W/2, panY + 80, '', 13, '#ffc83c', true)
      .setOrigin(0.5).setAlpha(0);
  },

  _zoneButton(x, y, key, label, type) {
    const BW = 90, BH = 44;
    const g = this.add.graphics();
    this._drawZoneBtn(g, x, y, BW, BH, false);
    const t = txt(this, x, y, label, 12, '#f0f0fa').setOrigin(0.5);
    const zone = this.add.zone(x, y, BW, BH).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this._onZone(key, label, type, g, t));
    return { key, g, t, zone, type, x, y, BW, BH };
  },

  _drawZoneBtn(g, x, y, BW, BH, selected, selectedColor = C.blue) {
    g.clear();
    if (selected) {
      g.fillStyle(selectedColor, 0.25);
      g.fillRoundedRect(x - BW/2, y - BH/2, BW, BH, 10);
      g.lineStyle(2, selectedColor, 1);
      g.strokeRoundedRect(x - BW/2, y - BH/2, BW, BH, 10);
    } else {
      g.fillStyle(C.dark, 0.9);
      g.fillRoundedRect(x - BW/2, y - BH/2, BW, BH, 10);
      g.lineStyle(1, C.gray, 0.3);
      g.strokeRoundedRect(x - BW/2, y - BH/2, BW, BH, 10);
    }
  },

  _miniBtn(x, y, label, cb) {
    const W = 70, H = 28;
    const g = this.add.graphics();
    g.fillStyle(C.dark, 0.9);
    g.fillRoundedRect(x - W/2, y - H/2, W, H, 7);
    g.lineStyle(1, C.gray, 0.4);
    g.strokeRoundedRect(x - W/2, y - H/2, W, H, 7);
    const t = txt(this, x, y, label, 10, '#8888aa').setOrigin(0.5);
    const zone = this.add.zone(x, y, W, H).setInteractive({ useHandCursor: true });
    zone.on('pointerup', cb);
    return { g, t, zone };
  },

  _buildLog() {
    const { W, H } = this;
    const logH = 26;
    const logY = Math.round(H * 0.6 - logH - 4);
    BattleLog.clear();
    BattleLog.show(this.game.canvas, 4, logY, W - 8, logH);
  },

});
