/* ═══════════════════════════════════════════════════════════
   SHOP SCENE — обёртка, запускает HTML-оверлей ShopHtml
   Вся логика: shop_html_overlay.js / shop_html_items.js / shop_html_pay.js
   ═══════════════════════════════════════════════════════════ */
class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) {
    this._tab = (data && data.tab) ? data.tab : (ShopScene._lastTab || 'consumables');
    ShopScene._lastTab = this._tab;
    this._gen = (this._gen || 0) + 1;
  }

  create() {
    _extraBg(this, this.game.canvas.width, this.game.canvas.height);
    if (typeof ShopHtml !== 'undefined') {
      ShopHtml.show(this._tab, this);
    } else {
      _extraHeader(this, this.game.canvas.width, '🛍️', 'МАГАЗИН', 'Загрузка...');
      _extraBack(this);
    }
  }

  shutdown() {
    // Оверлей живёт поверх Phaser — не скрываем, навигация через ShopHtml.hide()
  }
}
