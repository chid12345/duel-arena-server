/* ═══════════════════════════════════════════════════════════
   GuideScene — тонкая обёртка, UI отдано GuideHTML overlay.
   ═══════════════════════════════════════════════════════════ */

class GuideScene extends Phaser.Scene {
  constructor() { super('Guide'); }

  init() {
    try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.hide(); } catch(_) {}
    try { window._tabPlaceholderShow?.('gd-placeholder', { bg: '#05050a' }); } catch(_) {}
  }

  create() {
    try { window._closeAllTabOverlays?.(); } catch(_) {}
    try { window._tabPlaceholderHideNextFrame?.('gd-placeholder'); } catch(_) {}
    try { GuideHTML.show(this); } catch(e) { console.error('[Guide]', e); }
  }

  shutdown() {
    try { window._tabPlaceholderHide?.('gd-placeholder'); } catch(_) {}
    try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.show(); } catch(_) {}
    try { GuideHTML.close(); } catch(_) {}
    this.time.removeAllEvents();
  }
}
