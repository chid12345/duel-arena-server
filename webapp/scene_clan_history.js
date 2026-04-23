/* ============================================================
   ClanScene._renderHistory — тонкая обёртка над HTML-оверлеем
   Реализация — clan_html_subviews.js (ClanHTML.openHistory)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _renderHistory(W, H) {
    this.W = W; this.H = H;
    this._loading?.destroy();
    if (window.ClanHTML?.openHistory) {
      window.ClanHTML.openHistory(this);
      this.events.once('shutdown', () => { try { window.ClanHTML.close(); } catch(_) {} });
    } else {
      txt(this, W/2, H/2, '⚠️ UI не загружен', 12, '#dc3c46').setOrigin(0.5);
    }
  },
});
