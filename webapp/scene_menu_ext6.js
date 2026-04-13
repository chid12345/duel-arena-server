/* ============================================================
   MenuScene — ext6: _switchTab
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _switchTab(key) {
    Object.entries(this._panels).forEach(([k, c]) => {
      if (!c) return;
      const v = k === key;
      if (v) {
        this.sys.displayList.add(c);  // re-add if previously removed (handles duplicates safely)
        c.setVisible(true);
        c.setAlpha(1);
        c.setPosition(0, 0);
      } else {
        // Remove from display list entirely — guaranteed no rendering, zero ghost
        this.sys.displayList.remove(c);
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
