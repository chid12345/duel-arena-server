/* ============================================================
   MenuScene — ext5b: _soon, _toast
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _soon(name) { this._toast(`🚧 ${name} — скоро!`); },

  _toast(msg) {
    const { W, H } = this;
    const t = txt(this, W / 2, H - this.TAB_H - 22, msg, 12, '#ffc83c', true)
      .setOrigin(0.5).setAlpha(0).setDepth(20);
    this.tweens.add({ targets: t, alpha: 1, duration: 200, hold: 1600, yoyo: true,
      onComplete: () => t.destroy() });
  },

});
