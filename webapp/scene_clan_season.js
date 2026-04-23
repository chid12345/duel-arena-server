/* ============================================================
   ClanScene._renderSeason — тонкая обёртка над HTML-оверлеем
   Реализация — clan_html_subviews.js (ClanHTML.openSeason)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _formatTimeLeft(endsAt) {
    if (!endsAt) return '—';
    try {
      const s = (typeof endsAt === 'string') ? endsAt.replace(' ','T').replace('Z','+00:00') : endsAt;
      const ms = new Date(s).getTime() - Date.now();
      if (ms <= 0) return 'обновляется...';
      const d = Math.floor(ms/86400000), h = Math.floor((ms%86400000)/3600000), m = Math.floor((ms%3600000)/60000);
      if (d > 0) return `${d}д ${h}ч`;
      if (h > 0) return `${h}ч ${m}м`;
      return `${m}м`;
    } catch(_) { return '—'; }
  },

  _renderSeason(W, H) {
    this.W = W; this.H = H;
    this._loading?.destroy();
    if (window.ClanHTML?.openSeason) {
      window.ClanHTML.openSeason(this);
      this.events.once('shutdown', () => { try { window.ClanHTML.close(); } catch(_) {} });
    } else {
      txt(this, W/2, H/2, '⚠️ UI не загружен', 12, '#dc3c46').setOrigin(0.5);
    }
  },
});
