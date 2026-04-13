/* ============================================================
   MenuScene — ext6: _switchTab
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _switchTab(key) {
    Object.entries(this._panels).forEach(([k, c]) => {
      if (!c) return;
      const v = k === key;
      c.setVisible(v);
      c.setAlpha(v ? 1 : 0);
      // Принудительно прячем каждый дочерний объект — защита от Phaser-бага с Container
      if (c.list) c.list.forEach(child => {
        if (child?.setVisible) child.setVisible(v);
      });
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
