/* ============================================================
   MenuScene — Premium Box: кнопка в профиле рядом с Premium-бейджем
   ============================================================ */

Object.assign(MenuScene.prototype, {

  async _claimPremBoxProfile(boxTxt, boxZone) {
    if (this._premBoxBusy) return;
    this._premBoxBusy = true;
    try { boxZone.disableInteractive(); } catch(_) {}
    this.tweens.killTweensOf(boxTxt);
    boxTxt.setAlpha(0.5);

    try {
      const box = await post('/api/shop/premium_daily_box', {});
      if (box?.ok && box?.box_opened) {
        boxTxt.setAlpha(0.3);
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
        // Показываем что получили
        if (typeof ShopHtml !== 'undefined') {
          ShopHtml._showPremBoxReveal(box.items || []);
        } else {
          this._toast('📦 Ящик получен! Открой Рюкзак');
        }
      } else {
        this.tweens.killTweensOf(boxTxt);
        boxTxt.setAlpha(0.25);
        this._toast('📦 ' + (box?.reason || 'Уже получен сегодня'));
      }
    } catch(_) {
      this._premBoxBusy = false;
      boxTxt.setAlpha(1);
      try { boxZone.setInteractive({ useHandCursor: true }); } catch(_) {}
      this._toast('❌ Нет соединения');
    }
    this._premBoxBusy = false;
  },

});
