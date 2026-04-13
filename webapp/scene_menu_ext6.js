/* ============================================================
   MenuScene — ext6: _switchTab
   ============================================================ */

Object.assign(MenuScene.prototype, {

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
