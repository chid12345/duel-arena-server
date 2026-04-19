/* ============================================================
   MenuScene — ext4b: Карточка ежедневного бонуса на профиле
   Overlay поверх профиля, загружается асинхронно.
   ============================================================ */

Object.assign(MenuScene.prototype, {

  /** Загрузить статус бонуса и показать карточку */
  _loadDailyBonusCard() {
    get('/api/daily/status').catch(() => null).then(res => {
      if (!res?.ok || !res.can_claim) return;
      if (!this.scene.isActive()) return;
      this._showDailyBonusCard(res);
    });
  },

  _showDailyBonusCard(info) {
    if (this._dailyBonusOverlay) {
      try { this._dailyBonusOverlay.destroy(); } catch(_) {}
    }
    const { W } = this;
    const PAD = 12;
    const cardH = 56;
    const cardW = W - PAD * 2;
    const cardY = 120; // сразу под баннером профиля

    const oc = this.add.container(0, 0);

    // Тень / подложка
    const shadow = this.add.graphics();
    shadow.fillStyle(0x4f8ef7, 0.12);
    shadow.fillRoundedRect(PAD + 2, cardY + 3, cardW, cardH, 12);
    oc.add(shadow);

    // Фон карточки
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(PAD, cardY, cardW, cardH, 12);
    bg.lineStyle(1.5, C.gold, 0.7);
    bg.strokeRoundedRect(PAD, cardY, cardW, cardH, 12);
    oc.add(bg);

    // Акцентная полоска слева
    const accent = this.add.graphics();
    accent.fillStyle(0xffc83c, 1);
    accent.fillRoundedRect(PAD, cardY, 5, cardH, { tl: 12, bl: 12, tr: 0, br: 0 });
    oc.add(accent);

    // Иконка
    const icon = txt(this, PAD + 26, cardY + cardH / 2, '🎁', 22).setOrigin(0.5);
    oc.add(icon);

    // Заголовок
    const streakDay = info.streak || 1;
    oc.add(txt(this, PAD + 46, cardY + 14,
      `Ежедневный бонус! День ${streakDay}`, 12, '#8a6000', true).setOrigin(0, 0));

    // Награда
    const rewardStr = info.diamonds_bonus > 0
      ? `+${info.bonus} 💰  +${info.diamonds_bonus} 💎`
      : `+${info.bonus} 💰`;
    oc.add(txt(this, PAD + 46, cardY + 34, rewardStr, 10, '#666688').setOrigin(0, 0));

    // Кнопка "Забрать"
    const btnW = 80, btnH = 28;
    const btnX = W - PAD - btnW - 8, btnY = cardY + (cardH - btnH) / 2;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xffc83c, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    oc.add(btnBg);
    oc.add(txt(this, btnX + btnW / 2, btnY + btnH / 2,
      'Забрать', 12, '#1a1200', true).setOrigin(0.5));

    // Анимации
    this.tweens.add({ targets: bg, alpha: 0.85, duration: 800, yoyo: true, repeat: -1 });
    this.tweens.add({
      targets: icon, angle: -10, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Появление — slide down
    oc.setAlpha(0);
    oc.y = -20;
    this.tweens.add({ targets: oc, y: 0, alpha: 1, duration: 400, ease: 'Back.easeOut' });

    // Зона клика — на всю карточку
    const zone = this.add.zone(PAD + cardW / 2, cardY + cardH / 2, cardW, cardH)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      btnBg.clear();
      btnBg.fillStyle(0xddaa22, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
      tg?.HapticFeedback?.impactOccurred('medium');
    });
    zone.on('pointerup', () => this._claimDailyFromProfile(oc, zone));
    oc.add(zone);

    this._dailyBonusOverlay = oc;
  },

  _claimDailyFromProfile(overlay, zone) {
    if (this._dailyClaimBusy) return;
    this._dailyClaimBusy = true;

    post('/api/daily/claim').then(res => {
      this._dailyClaimBusy = false;
      if (res?.ok) {
        if (res.player) State.player = res.player;
        try { zone.disableInteractive(); } catch(_) {}
        tg?.HapticFeedback?.notificationOccurred('success');

        // Анимация — превращаем в "Получено!"
        overlay.each(ch => { if (ch.type === 'Text') ch.setVisible(false); });

        const bonus = res.bonus || 40;
        const dmnd = res.diamonds_bonus || 0;
        let msg = `✅ +${bonus} 💰`;
        if (dmnd) msg += `  +${dmnd} 💎`;
        const done = txt(this, this.W / 2, 148, msg, 14, '#3cc864', true).setOrigin(0.5);
        overlay.add(done);
        this.tweens.add({ targets: done, scaleX: 1.15, scaleY: 1.15, duration: 300, yoyo: true });

        // Убираем и перезагружаем через 1.5 сек
        this.time.delayedCall(1500, () => {
          State.playerLoadedAt = 0;
          this.scene.restart();
        });
      } else {
        this._toast('❌ ' + (res?.reason || 'Бонус уже получен'));
        this.tweens.add({ targets: overlay, alpha: 0, y: -30, duration: 300,
          onComplete: () => { try { overlay.destroy(); } catch(_) {} },
        });
      }
    }).catch(() => {
      this._dailyClaimBusy = false;
      this._toast('❌ Нет соединения');
    });
  },

});
