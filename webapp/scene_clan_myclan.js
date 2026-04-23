/* ============================================================
   ClanScene — рендер блока "Мой клан" через HTML-оверлей (киберпанк)
   Сам HTML/CSS — в clan_html_overlay.js
   ============================================================ */

Object.assign(ClanScene.prototype, {
  _renderMyClan(data, W, H) {
    this.W = W; this.H = H;
    /* Убираем Phaser-элементы (header/tabbar) чтобы не просвечивало под оверлеем */
    try { this.children.getAll().forEach(o => { if (o !== this._loading) o.destroy(); }); } catch(_) {}
    this._loading?.destroy();

    if (window.ClanHTML && typeof ClanHTML.openMyClan === 'function') {
      ClanHTML.openMyClan(this, data);
      /* Чистим оверлей при выходе из сцены */
      this.events.once('shutdown', () => { try { ClanHTML.close(); } catch(_) {} });
      this.events.once('destroy',  () => { try { ClanHTML.close(); } catch(_) {} });
    } else {
      /* Fallback: если overlay не загрузился — показать ошибку */
      txt(this, W / 2, H / 2, '⚠️ Не удалось загрузить интерфейс клана', 12, '#dc3c46').setOrigin(0.5);
    }
  },
});
