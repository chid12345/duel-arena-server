/* ============================================================
   RatingScene — тонкая оболочка: фон + нижнее меню.
   Весь рейтинг рендерит RatingHTML (rating_html_overlay.js).
   ============================================================ */

class RatingScene extends Phaser.Scene {
  constructor() { super('Rating'); }

  init(data) {
    this._tab = (data && data.tab) ? data.tab : (RatingScene._lastTab || 'season');
    RatingScene._lastTab = this._tab;
    try { window._tabPlaceholderShow?.('rt-placeholder', { bg: 'linear-gradient(180deg,#12121c 0%,#0d001a 100%)' }); } catch(_) {}
  }

  async create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._alive = true;

    try { window._closeAllTabOverlays?.(); } catch(_) {}

    _extraBg(this, W, H);
    TabBar.build(this, { activeKey: 'rating' });
    window._tabPlaceholderHideNextFrame?.('rt-placeholder');

    if (await window._redirectIfInBattle?.(this)) return;
    if (!this._alive) return;

    if (typeof ScreenHints !== 'undefined') ScreenHints.show('rating');

    window.RatingHTML?.open(this._tab);
  }

  shutdown() {
    this._alive = false;
    try { window._tabPlaceholderHide?.('rt-placeholder'); } catch(_) {}
    try { window.RatingHTML?.close(); } catch(_) {}
    try { this.cameras.main.setScroll(0, 0); } catch(_) {}
    this._tbScrollOn = false;
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
