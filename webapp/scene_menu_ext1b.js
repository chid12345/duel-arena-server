/* ============================================================
   MenuScene — ext1b: _buildMorePanel
   Использует MoreMenuHTML overlay (киберпанк стиль без рамок)
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _buildMorePanel() {
    // Dummy-контейнер — Phaser-панели ожидают контейнер в this._panels.
    // setVisible перехватываем и делегируем HTML overlay.
    const scene = this;
    const c = new Phaser.GameObjects.Container(this, 0, 0);

    const origSetVisible = c.setVisible.bind(c);
    c.setVisible = function(v) {
      origSetVisible(v);
      try {
        if (typeof MoreMenuHTML !== 'undefined') {
          if (v) MoreMenuHTML.show(scene);
          else   MoreMenuHTML.close();
        }
      } catch(_) {}
      return c;
    };

    this.sys.displayList.add(c);
    c.setVisible(false);
    this._panels.more = c;
  },

});
