/* ============================================================
   QueueScene — ожидание PvP соперника
   Открывается из MenuScene после попадания в очередь
   Продолжение: scene_queue_ext.js
   ============================================================ */

class QueueScene extends Phaser.Scene {
  constructor() { super('Queue'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._searching = true;
    this._dots      = 0;

    this._drawBg(W, H);
    this._buildSearchUI(W, H);
    this._buildButtons(W, H);
    this._setupWS();
    this._startSearchTimer();
  }

  /* ── Фон ──────────────────────────────────────────────── */
  _drawBg(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
    g.fillRect(0, 0, W, H);
    // Звёзды
    for (let i = 0; i < 55; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.85);
      const r = Phaser.Math.FloatBetween(0.4, 1.8);
      this.add.circle(x, y, r, 0xffffff, Phaser.Math.FloatBetween(0.15, 0.65));
    }
  }

  /* ── Центральный UI с радаром ──────────────────────────── */
  _buildSearchUI(W, H) {
    const cx = W / 2;
    const cy = H * 0.37;
    this._cx = cx;
    this._cy = cy;

    // Заголовок
    txt(this, cx, H * 0.10, '⚔️ ПОИСК СОПЕРНИКА', 18, '#ffc83c', true).setOrigin(0.5);
    txt(this, cx, H * 0.16, 'Ищем живого игрока...', 12, '#9999bb').setOrigin(0.5);

    // Статические кольца радара
    const rg = this.add.graphics();
    const rings = [90, 62, 38];
    rings.forEach((r, i) => {
      const alpha = 0.5 - i * 0.13;
      rg.lineStyle(1.5 - i * 0.3, C.blue, alpha);
      rg.strokeCircle(cx, cy, r);
    });
    // Перекрестие
    rg.lineStyle(1, C.blue, 0.18);
    rg.lineBetween(cx - 95, cy, cx + 95, cy);
    rg.lineBetween(cx, cy - 95, cx, cy + 95);

    // Пульсирующее кольцо (обновляется в update)
    this._pulseG = this.add.graphics();
    this._pulseR = 0;

    // Вращающийся луч сканера (обновляется в update)
    this._scanAngle = 0;
    this._scanG     = this.add.graphics();

    // Воин в центре
    const warrior = this.add.image(cx, cy, 'warrior_blue')
      .setScale(1.15)
      .setOrigin(0.5);
    this.tweens.add({
      targets: warrior,
      y: cy - 5,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Статус и таймер
    this._statusTxt = txt(this, cx, cy + 112, 'Ищем соперника...', 13, '#8888aa')
      .setOrigin(0.5);
    this._timerTxt  = txt(this, cx, cy + 132, '0:00', 12, '#8888aa')
      .setOrigin(0.5);

    // Анимация точек в тексте
    this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        if (!this._searching) return;
        this._dots = (this._dots + 1) % 4;
        const d = '.'.repeat(this._dots || 1);
        this._statusTxt?.setText(`Ищем соперника${d}`);
      },
    });

    // Разделитель перед кнопками
    const sep = this.add.graphics();
    sep.lineStyle(1, C.gold, 0.1);
    sep.lineBetween(40, H * 0.60, W - 40, H * 0.60);
  }

  /* ── Кнопки ───────────────────────────────────────────── */
  _buildButtons(W, H) {
    const cy1 = H * 0.68;
    const cy2 = H * 0.80;

    // Кнопка: Бой с ботом (главная)
    this._makeBtn(
      W / 2, cy1, 230, 50,
      '🤖  Бой с ботом', C.red, '#ffffff',
      () => this._onBotFight()
    );

    // Подсказка
    txt(this, W / 2, cy2,
      'Матч найдётся автоматически — можешь подождать',
      9, '#8888aa').setOrigin(0.5);

    // Кнопка: Отмена (внизу)
    makeBackBtn(this, 'Отменить поиск', () => this._onCancel());
  }

  _makeBtn(x, y, w, h, label, bgColor, textColor, cb,
           borderColor = null, borderAlpha = 0.6) {
    const g = this.add.graphics();
    const fillAlpha = bgColor === C.dark ? 0.82 : 1;
    g.fillStyle(bgColor, fillAlpha);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    if (bgColor === C.red) {
      // Блик на кнопке "В бой"
      g.fillStyle(0xffffff, 0.12);
      g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, Math.round(h * 0.42), 10);
    }
    if (borderColor) {
      g.lineStyle(1.5, borderColor, borderAlpha);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    }

    txt(this, x, y, label, 15, textColor, true).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });

    zone.on('pointerdown', () => {
      g.clear();
      const dark = bgColor === C.dark
        ? 0x1c1a2c
        : Phaser.Display.Color.IntegerToColor(bgColor).darken(25).color;
      g.fillStyle(dark, fillAlpha);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      tg?.HapticFeedback?.impactOccurred('medium');
    });
    zone.on('pointerup', () => {
      g.clear();
      g.fillStyle(bgColor, fillAlpha);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      cb();
    });
    zone.on('pointerout', () => {
      g.clear();
      g.fillStyle(bgColor, fillAlpha);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    });
  }
}
