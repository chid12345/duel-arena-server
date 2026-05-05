/* ═══════════════════════════════════════════════════════════
   AvatarScene — тонкая обёртка: загружает данные и открывает
   HTML overlay (AvatarHTML). Вся UI-логика в avatar_html_*.js
   ═══════════════════════════════════════════════════════════ */

class AvatarScene extends Phaser.Scene {
  constructor() { super('Avatar'); }

  init() {
    try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.hide(); } catch (_) {}
    try { window._tabPlaceholderShow?.('av-placeholder', { bg: 'linear-gradient(180deg,#0d0020 0%,#05050a 100%)' }); } catch (_) {}
  }

  create(data) {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._initTab = (data && data.tab) || 'free';

    _extraBg(this, W, H);
    try { window._tabPlaceholderHideNextFrame?.('av-placeholder'); } catch (_) {}

    this._loading = txt(this, W / 2, H / 2, 'Загрузка...', 14, '#aaa').setOrigin(0.5);
    this._loadData();
  }

  async _loadData() {
    const _AVATAR_TTL = 60000;
    const cached = State.avatarsCache
      && Array.isArray(State.avatarsCache.avatars)
      && State.avatarsCache.avatars.length > 0
      && (Date.now() - (State.avatarsCache.at || 0)) < _AVATAR_TTL;

    if (cached) {
      this._avatars = State.avatarsCache.avatars;
    } else {
      try {
        const j = await get('/api/avatars');
        if (!j.ok) throw new Error(j.reason || 'err');
        this._avatars = j.avatars || [];
        if (this._avatars.length > 0) {
          State.avatarsCache = { avatars: this._avatars, at: Date.now() };
        }
      } catch (e) {
        if (State.avatarsCache?.avatars?.length > 0) {
          this._avatars = State.avatarsCache.avatars;
        } else {
          this._avatars = [];
          if (this._loading) { this._loading.setText('Ошибка загрузки'); }
          return;
        }
      }
    }

    if (this._loading) { this._loading.destroy(); this._loading = null; }
    AvatarHTML.open(this, this._avatars, State.avatarsCache?.equipped, this._initTab);
  }

  shutdown() {
    try { window._tabPlaceholderHide?.('av-placeholder'); } catch (_) {}
    try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.show(); } catch (_) {}
    try { window._closeAllTabOverlays?.(); } catch (_) {}
    AvatarHTML.close();
    this.children.getAll().forEach(o => { try { o.destroy(); } catch (_) {} });
  }
}
