/* ============================================================
   MenuScene — ext5: _onInvite → ReferralHTML overlay
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _onInvite() {
    try { ReferralHTML.show(); } catch(e) { console.error('[Invite]', e); }
  },

});
