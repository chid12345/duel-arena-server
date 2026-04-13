/* ============================================================
   MenuScene — ext6: _switchTab
   ============================================================ */

Object.assign(MenuScene.prototype, {

  /* Рисует аватарку в container по центру (cx,cy) радиусом r.
     id: 1=Воин, 2=Ранг, 3=Череп(default), 4=Сфера */
  _drawAvatarPreview(container, cx, cy, r, avatarId, level) {
    const id = avatarId || 3;
    const g = this.make.graphics({}, false);

    if (id === 1) {
      // Pixel warrior — rounded rect frame
      g.fillStyle(0x080614, 1); g.fillRoundedRect(cx - r, cy - r, r * 2, r * 2, r * 0.35);
      g.lineStyle(2, 0x7ab4ff, 0.85); g.strokeRoundedRect(cx - r, cy - r, r * 2, r * 2, r * 0.35);
      container.add(g);
      const img = this.make.image({ x: cx, y: cy, key: 'warrior_blue_face' }, false);
      img.setScale((r * 2) / 56 * 0.85).setOrigin(0.5);
      container.add(img);
    } else if (id === 2) {
      // Rank hexagon
      const outerPts = [], innerPts = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        outerPts.push({ x: cx + Math.cos(a) * r,         y: cy + Math.sin(a) * r });
        innerPts.push({ x: cx + Math.cos(a) * r * 0.72,  y: cy + Math.sin(a) * r * 0.72 });
      }
      g.fillStyle(0xffc83c, 1); g.fillPoints(outerPts, true);
      g.fillStyle(0x12101e, 1); g.fillPoints(innerPts, true);
      container.add(g);
      container.add(this.make.text({ x: cx, y: cy, text: String(level || 1),
        style: { fontSize: `${Math.round(r * 0.9)}px`, fontFamily: 'Arial', fontStyle: 'bold', color: '#ffc83c' },
      }, false).setOrigin(0.5));
    } else if (id === 3) {
      // Skull with fire (default)
      g.fillStyle(0x0a0608, 1); g.fillCircle(cx, cy, r);
      g.lineStyle(2, 0xdc3c46, 0.7); g.strokeCircle(cx, cy, r);
      g.fillStyle(0xff4400, 0.45); g.fillEllipse(cx, cy + r * 0.65, r * 1.1, r * 0.55);
      container.add(g);
      container.add(this.make.text({ x: cx, y: cy - r * 0.08, text: '💀',
        style: { fontSize: `${Math.round(r * 1.15)}px` },
      }, false).setOrigin(0.5));
    } else {
      // Energy orb (id === 4)
      g.fillStyle(0x3a1080, 1); g.fillCircle(cx, cy, r);
      g.lineStyle(1.5, 0xb45aff, 0.6); g.strokeCircle(cx, cy, r);
      g.lineStyle(1, 0xffffff, 0.15); g.strokeCircle(cx, cy, r * 0.75);
      g.lineStyle(1, 0xb45aff, 0.25); g.strokeCircle(cx, cy, r * 0.5);
      g.fillStyle(0xffffff, 0.85); g.fillCircle(cx, cy, r * 0.28);
      container.add(g);
    }
  },

  _switchTab(key) {
    Object.entries(this._panels).forEach(([k, c]) => {
      if (!c) return;
      const v = k === key;
      if (v) {
        this.sys.displayList.add(c);
        c.setVisible(true);
        c.setAlpha(1);
        c.setPosition(0, 0);
        c.list.forEach(child => {
          if (child.input) { child.setActive(true); this.input.enable(child); }
        });
      } else {
        this.sys.displayList.remove(c);
        // Двойная защита от ghost-input: disable + setActive(false)
        c.list.forEach(child => {
          if (child.input) { this.input.disable(child); child.setActive(false); }
        });
      }
    });
    if (key === 'profile') this._loadProfileBuffs();
    const inactiveCol = '#ccccee';
    const activeCol   = '#ffc83c';
    Object.entries(this._tabBtns).forEach(([k, btn]) => {
      const active = k === key;
      btn.activeBg.setVisible(active);
      btn.activeBar?.setVisible(active);
      btn.iconTxt.setAlpha(active ? 1 : 0.85);
      btn.labelTxt.setStyle({ color: active ? activeCol : inactiveCol });
    });
    this._activeTab = key;
  },

});
