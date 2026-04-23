/* ============================================================
   ClanScene._renderCreate — тонкая обёртка над HTML-оверлеем
   Реализация — clan_html_create.js (ClanHTML.openCreate)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _renderCreate(W, H) {
    this.W = W; this.H = H;
    this._loading?.destroy();
    if (window.ClanHTML?.openCreate) {
      window.ClanHTML.openCreate(this);
      this.events.once('shutdown', () => { try { window.ClanHTML.close(); } catch(_) {} });
    }
  },

});
