/* ============================================================
   ClanScene — ext2: _renderSearch, _renderTop (тонкие обёртки)
   Реализация — clan_html_search.js / clan_html_top.js
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _renderSearch(W, H) {
    this.W = W; this.H = H;
    this._loading?.destroy();
    if (window.ClanHTML?.openSearch) {
      window.ClanHTML.openSearch(this);
      this.events.once('shutdown', () => { try { window.ClanHTML.close(); } catch(_) {} });
    }
  },

  _renderTop(W, H) {
    this.W = W; this.H = H;
    this._loading?.destroy();
    if (window.ClanHTML?.openTop) {
      window.ClanHTML.openTop(this);
      this.events.once('shutdown', () => { try { window.ClanHTML.close(); } catch(_) {} });
    }
  },

});
