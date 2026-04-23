/* ============================================================
   ClanScene — заявки: тонкая обёртка над HTML-оверлеем
   Реализация — clan_html_subviews.js (ClanHTML.openRequests)
   Сабмит заявки в закрытый клан остаётся здесь (вызывается из превью)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  async _submitJoinRequest(clanId, btnT) {
    if (this._busy) return; this._busy = true;
    btnT?.setText('...');
    try {
      const res = await post('/api/clan/request_join', { clan_id: clanId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        (window.ClanHTML?._toast || this._toast.bind(this))('📨 Заявка отправлена!');
        btnT?.setText('✔ Заявка отправлена');
      } else {
        (window.ClanHTML?._toast || this._toast.bind(this))('❌ ' + (res.reason||'Ошибка'), false);
        btnT?.setText('🔒 Подать заявку');
      }
    } catch(_) {
      (window.ClanHTML?._toast || this._toast.bind(this))('❌ Нет соединения', false);
      btnT?.setText('🔒 Подать заявку');
    }
    this._busy = false;
  },

  _renderRequests(W, H) {
    this.W = W; this.H = H;
    this._loading?.destroy();
    if (window.ClanHTML?.openRequests) {
      window.ClanHTML.openRequests(this);
      this.events.once('shutdown', () => { try { window.ClanHTML.close(); } catch(_) {} });
    } else {
      txt(this, W/2, H/2, '⚠️ UI не загружен', 12, '#dc3c46').setOrigin(0.5);
    }
  },
});
