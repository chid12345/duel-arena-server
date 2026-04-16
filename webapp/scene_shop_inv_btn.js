/* ═══════════════════════════════════════════════════════════
   ShopScene ext — кнопка "🎒 Моё" в шапке магазина.
   Ведёт в Герой → Инвентарь. Бейдж показывает число новых
   предметов, добавленных в инвентарь с момента последнего входа.
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  _INV_KEY: 'shop_inv_new_count',
  _INV_ONBOARD_KEY: 'shop_inv_onboarded',

  _readInvCount() {
    // Приоритет: серверное поле State.player.inventory_unseen
    const sv = State?.player?.inventory_unseen;
    if (typeof sv === 'number') return Math.max(0, sv | 0);
    // Fallback: localStorage (старые клиенты / оффлайн-бамп)
    try { return parseInt(localStorage.getItem(this._INV_KEY) || '0', 10) || 0; }
    catch(_) { return 0; }
  },

  _writeInvCount(n) {
    try { localStorage.setItem(this._INV_KEY, String(Math.max(0, n | 0))); }
    catch(_) {}
  },

  _bumpInvBadge() {
    // Сервер уже инкрементил счётчик в add_to_inventory и вернул новый State.player.
    // Локальный localStorage бампим как fallback (на случай отсутствия поля).
    const hasSv = typeof State?.player?.inventory_unseen === 'number';
    if (!hasSv) {
      const n = this._readInvCount() + 1;
      this._writeInvCount(n);
    }
    this._updateInvBadgeText(this._readInvCount());
    this._pulseInvBtn();
    this._showInvOnboardingOnce();
  },

  _showInvOnboardingOnce() {
    try { if (localStorage.getItem(this._INV_ONBOARD_KEY) === '1') return; } catch(_) {}
    if (!this._invBtn || this._invHintGroup) return;
    try { localStorage.setItem(this._INV_ONBOARD_KEY, '1'); } catch(_) {}

    const cx = this._invBtn.x, cy = this._invBtn.y;
    // Подсказка под кнопкой: стрелочка + текст «Смотри сюда!»
    const hintY = cy + 30;
    const arrow = txt(this, cx, hintY, '▲', 14, '#ffc83c', true).setOrigin(0.5).setDepth(8);
    const bubble = this.add.graphics().setDepth(7);
    const label = txt(this, cx, hintY + 20, 'Твои покупки тут!', 10, '#ffe9a0', true).setOrigin(1, 0.5).setDepth(8);
    // Пузырь — под текстом (правый край у края кнопки, чтобы не уезжал за экран)
    const lblW = label.width + 16, lblH = 18, lblX = cx + 14 - lblW, lblY = hintY + 11;
    bubble.fillStyle(0x1a2030, 0.95); bubble.fillRoundedRect(lblX, lblY, lblW, lblH, 8);
    bubble.lineStyle(1.5, C.gold, 0.7); bubble.strokeRoundedRect(lblX, lblY, lblW, lblH, 8);
    label.setX(lblX + lblW - 8);

    this._invHintGroup = [arrow, bubble, label];
    this.tweens.add({ targets: arrow, y: hintY + 4, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Авто-закрытие через 4с
    this.time.delayedCall(4000, () => this._hideInvOnboarding());
  },

  _hideInvOnboarding() {
    if (!this._invHintGroup) return;
    const group = this._invHintGroup; this._invHintGroup = null;
    this.tweens.add({
      targets: group, alpha: 0, duration: 300,
      onComplete: () => group.forEach(o => { try { o.destroy(); } catch(_) {} }),
    });
  },

  _updateInvBadgeText(n) {
    if (!this._invBadgeG || !this._invBadgePos) return;
    const g = this._invBadgeG, t = this._invBadgeTxt;
    g.clear();
    if (n <= 0) { t?.setText(''); return; }
    const { bx, by } = this._invBadgePos;
    g.fillStyle(0xe64c4c, 1); g.fillCircle(bx, by, 8);
    g.lineStyle(1.5, 0xffffff, 0.9); g.strokeCircle(bx, by, 8);
    t.setText(n > 9 ? '9+' : String(n));
    t.setPosition(bx, by);
  },

  _pulseInvBtn() {
    if (!this._invBtn) return;
    this.tweens.add({
      targets: this._invBtn,
      scaleX: 1.15, scaleY: 1.15,
      duration: 140, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
    });
  },

  _buildInventoryBtn(W) {
    const w = 44, h = 40;
    const x = W - 10 - w, y = 14;
    const cx = x + w / 2, cy = y + h / 2;

    // Контейнер для пульс-анимации (фон + иконка)
    const c = this.add.container(cx, cy);
    const bg = this.add.graphics();
    bg.fillStyle(0x1a2030, 0.95); bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(1.5, C.gold, 0.55); bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    c.add(bg);
    const icon = txt(this, 0, -2, '🎒', 18, '#ffc83c', true).setOrigin(0.5);
    c.add(icon);

    // Мини-подпись, чтобы новичок понял назначение
    txt(this, cx, y + h - 9, 'Моё', 8, '#ffc83c', true).setOrigin(0.5);

    // Бейдж вне контейнера, чтобы пульс не размазывал мелкую графику
    this._invBadgeG = this.add.graphics().setDepth(5);
    this._invBadgeTxt = txt(this, 0, 0, '', 9, '#ffffff', true).setOrigin(0.5).setDepth(6);
    this._invBadgePos = { bx: x + w - 4, by: y + 4 };
    this._invBtn = c;

    this._updateInvBadgeText(this._readInvCount());

    this.add.zone(x, y, w, h).setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        tg?.HapticFeedback?.impactOccurred('light');
        Sound?.click?.();
        this._hideInvOnboarding();
        // Счётчик обнулится внутри StatsScene при авто-открытии инвентаря
        this.scene.start('Stats', { player: State.player, openInventory: true });
      });
  },

});
