/* ============================================================
   MenuScene — Premium Box: кнопка в профиле рядом с Premium-бейджем
   ============================================================ */

Object.assign(MenuScene.prototype, {

  async _claimPremBoxProfile(boxImg, boxGlow, boxZone, onSuccess) {
    if (this._premBoxBusy) return;
    this._premBoxBusy = true;
    try { boxZone.disableInteractive(); } catch(_) {}
    this.tweens.killTweensOf(boxImg);
    if (boxGlow) this.tweens.killTweensOf(boxGlow);
    boxImg.setAlpha(0.5);
    if (boxGlow) boxGlow.setAlpha(0);

    try {
      const box = await post('/api/shop/premium_daily_box', {});
      if (box?.ok && box?.box_opened) {
        boxImg.setAlpha(0.22);
        if (boxGlow) boxGlow.setAlpha(0);
        // Обновляем State.player из ответа — алмазы/предметы сразу видны на экране
        if (box.player && State.player) {
          State.player.diamonds = box.player.diamonds ?? State.player.diamonds;
          State.player.gold     = box.player.gold     ?? State.player.gold;
        }
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
        // Запускаем обратный отсчёт в кнопке — сколько секунд до следующего сброса
        if (typeof onSuccess === 'function') onSuccess(box.seconds_until_reset || 0);
        if (typeof ShopHtml !== 'undefined') {
          ShopHtml._showPremBoxReveal(box.items || []);
        } else {
          this._toast('👑 Ящик получен! Открой Рюкзак');
        }
      } else {
        this.tweens.killTweensOf(boxImg);
        if (boxGlow) this.tweens.killTweensOf(boxGlow);
        boxImg.setAlpha(0.22);
        if (boxGlow) boxGlow.setAlpha(0);
        this._toast('👑 ' + (box?.reason || 'Уже получен сегодня'));
      }
    } catch(_) {
      this._premBoxBusy = false;
      boxImg.setAlpha(1);
      if (boxGlow) boxGlow.setAlpha(0.28);
      try { boxZone.setInteractive({ useHandCursor: true }); } catch(_) {}
      this._toast('❌ Нет соединения');
    }
    this._premBoxBusy = false;
  },

});
