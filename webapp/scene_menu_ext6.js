/* ============================================================
   MenuScene — ext6: _switchTab
   ============================================================ */

Object.assign(MenuScene.prototype, {

  /* Рисует аватарку в container по центру (cx,cy) радиусом r.
     Берёт badge и tier из State.player (новая система образов). */
  _drawAvatarPreview(container, cx, cy, r, _unused, level) {
    const p = State.player || {};
    const badge = p.avatar_badge || '💀';
    const tier = (p.avatar_tier || 'base').toLowerCase();

    const tierColors = {
      base:      { fill: 0x1e1e3a, ring: 0x555588 },
      gold:      { fill: 0x1a2844, ring: 0x3388cc },
      diamond:   { fill: 0x2a1444, ring: 0x8844cc },
      premium:   { fill: 0x2a1800, ring: 0xcc8822 },
      sub:       { fill: 0x2a0a20, ring: 0xff6b9d },
      referral:  { fill: 0x0a2a1a, ring: 0x44cc66 },
      elite:     { fill: 0x2a2000, ring: 0xffd700 },
    };
    const tc = tierColors[tier] || tierColors.base;

    const g = this.make.graphics({}, false);
    g.fillStyle(tc.fill, 1); g.fillCircle(cx, cy, r);
    g.lineStyle(2, tc.ring, 0.9); g.strokeCircle(cx, cy, r);
    container.add(g);

    container.add(this.make.text({ x: cx, y: cy, text: badge,
      style: { fontSize: `${Math.round(r * 1.1)}px` },
    }, false).setOrigin(0.5));
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
    if (this._dailyBonusOverlay) this._dailyBonusOverlay.setVisible(key === 'profile');
    Object.entries(this._tabBtns).forEach(([k, btn]) => {
      const active = k === key;
      btn.activeBubble?.setVisible(active);
      if (btn.iconG && btn.iconName) {
        btn.iconG.clear();
        const col = active ? (btn.tabCol || 0x22d3ee) : 0x2e2b50;
        TAB_ICONS[btn.iconName](btn.iconG, 0, 0, col, active ? 2 : 1.5);
      }
      btn.labelTxt.setStyle({ color: active ? (btn.hexCol || '#c4b5fd') : '#2e2b50' });
    });
    this._activeTab = key;
    if (typeof ScreenHints !== 'undefined') ScreenHints.show('menu_' + key);
  },

});
