/* ═══════════════════════════════════════════════════════════
   ShopScene ext — кнопка "🎒 Моё" в шапке магазина.
   Ведёт в Герой → Инвентарь. Бейдж показывает число новых
   предметов, добавленных в инвентарь с момента последнего входа.
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  _INV_KEY: 'shop_inv_new_count',

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
        // Счётчик обнулится внутри StatsScene при авто-открытии инвентаря
        this.scene.start('Stats', { player: State.player, openInventory: true });
      });
  },

});
