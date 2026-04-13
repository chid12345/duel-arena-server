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
        // Включаем input на всех зонах контейнера
        c.list.forEach(child => { if (child.input) this.input.enable(child); });
      } else {
        this.sys.displayList.remove(c);
        // Отключаем input — без этого зоны скрытой панели ловят тапы (ghost input)
        c.list.forEach(child => { if (child.input) this.input.disable(child); });
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
