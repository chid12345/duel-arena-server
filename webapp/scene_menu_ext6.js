/* ============================================================
   MenuScene — ext6: _switchTab
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _switchTab(key) {
    Object.entries(this._panels).forEach(([k, c]) => c?.setVisible(k === key));
    if (key === 'profile') this._loadProfileBuffs();
    const inactiveCol = '#8888aa';
    const activeCol   = '#ffc83c';
    Object.entries(this._tabBtns).forEach(([k, btn]) => {
      const active = k === key;
      btn.activeBg.setVisible(active);
      btn.activeBar?.setVisible(active);
      btn.iconTxt.setAlpha(active ? 1 : 0.45);
      btn.labelTxt.setStyle({ color: active ? activeCol : inactiveCol });
    });
    this._activeTab = key;
  },

});
