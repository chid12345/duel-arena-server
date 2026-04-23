/* ============================================================
   ClanScene._renderChat — тонкая обёртка над HTML-оверлеем
   Реализация — clan_html_chat.js (ClanHTML.openChat)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _renderChat(data, W, H) {
    this.W = W; this.H = H;
    this._loading?.destroy();
    if (window.ClanHTML?.openChat) {
      window.ClanHTML.openChat(this, data);
      this.events.once('shutdown', () => { try { window.ClanHTML.close(); } catch(_) {} });
      this.events.once('destroy',  () => { try { window.ClanHTML.close(); } catch(_) {} });
    } else {
      txt(this, W/2, H/2, '⚠️ UI не загружен', 12, '#dc3c46').setOrigin(0.5);
    }
  },
});
