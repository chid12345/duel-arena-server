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
    g.fillGradientStyle(0x02030a, 0x02030a, 0x04060f, 0x04060f, 1);
    g.fillRect(0, 0, W, H);

    // Сетка — менее заметная (0.025)
    g.lineStyle(1, 0x00e5ff, 0.025);
    const gs = 34;
    for (let x = 0; x <= W; x += gs) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += gs) g.lineBetween(0, y, W, y);

    // Scanlines
    g.lineStyle(1, 0x000000, 0.055);
    for (let y = 0; y <= H; y += 4) g.lineBetween(0, y, W, y);

    // Частицы
    for (let i = 0; i < 32; i++) {
      const px = Phaser.Math.Between(0, W);
      const py = Phaser.Math.Between(0, H * 0.88);
      const pr = Phaser.Math.FloatBetween(0.4, 1.2);
      this.add.rectangle(px, py, pr * 2, pr * 2, 0x00e5ff,
        Phaser.Math.FloatBetween(0.05, 0.22));
    }
  }

  /* ── Центральный UI с радаром ──────────────────────────── */
  _buildSearchUI(W, H) {
    const cx = W / 2;
    const cy = H * 0.38;
    this._cx = cx;
    this._cy = cy;

    // Заголовок
    this.add.text(cx, H * 0.09, '// ПОИСК СОПЕРНИКА', {
      fontFamily: "'Orbitron','Arial',sans-serif",
      fontSize: '16px', fontStyle: 'bold', color: '#00e5ff', resolution: 2,
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 10, false, true);

    txt(this, cx, H * 0.155, 'SCANNING FOR TARGET...', 10, '#4ab8cc')
      .setOrigin(0.5).setAlpha(0.65);

    // ── Координатный лог НАД радаром ──
    this._coordTop = this.add.text(cx, H * 0.22, '', {
      fontFamily: "'Share Tech Mono','Courier New',monospace",
      fontSize: '8px', color: '#ffa040', resolution: 2, align: 'center',
    }).setOrigin(0.5).setAlpha(0.7);

    // ── Пульсирующее оранжевое свечение (слои) ──
    this._glowG = this.add.graphics();
    this._glowPhase = 0;

    // ── Изображение радара (вращается) ──
    const radarSize = Math.min(W, 200);
    const radar = this.add.image(cx, cy, 'radar_target')
      .setDisplaySize(radarSize, radarSize)
      .setOrigin(0.5);

    // Медленное вращение: 30 секунд на круг
    this.tweens.add({
      targets: radar,
      angle: 360,
      duration: 30000,
      repeat: -1,
      ease: 'Linear',
    });

    // ── Координатный лог ПОД радаром ──
    this._coordBot = this.add.text(cx, cy + radarSize / 2 + 10, '', {
      fontFamily: "'Share Tech Mono','Courier New',monospace",
      fontSize: '8px', color: '#00e5ff', resolution: 2, align: 'center',
    }).setOrigin(0.5).setAlpha(0.65);

    // Статус и таймер
    this._statusTxt = this.add.text(cx, cy + radarSize / 2 + 28, 'Ищем соперника...', {
      fontFamily: "'Share Tech Mono','Courier New',monospace",
      fontSize: '13px', color: '#c8d8ff', resolution: 2,
    }).setOrigin(0.5);

    this._timerTxt = this.add.text(cx, cy + radarSize / 2 + 48, '0:00', {
      fontFamily: "'Orbitron','Arial',sans-serif",
      fontSize: '18px', fontStyle: 'bold', color: '#00e5ff', resolution: 2,
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 8, false, true);

    // Анимация точек
    this._dotsTimer = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        if (!this._searching) return;
        this._dots = (this._dots + 1) % 4;
        this._statusTxt?.setText(`Ищем соперника${'.'.repeat(this._dots || 1)}`);
      },
    });

    // Обновление координат каждые 1.2с
    this._coordTimer = this.time.addEvent({
      delay: 1200, loop: true,
      callback: () => this._updateCoords(),
    });
    this._updateCoords();

    // Разделитель
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x00e5ff, 0.12);
    sep.lineBetween(30, H * 0.62, W - 30, H * 0.62);
    sep.fillStyle(0x00e5ff, 0.35);
    sep.fillRect(W / 2 - 3, H * 0.62 - 1, 6, 2);
  }

  /* ── Случайные координаты ──────────────────────────────── */
  _updateCoords() {
    const rnd = (n, d) => (n + (Math.random() - 0.5) * 0.04).toFixed(d);
    const lat  = rnd(52.2297, 4);
    const lon  = rnd(21.0122, 4);
    const alt  = (400 + Math.floor(Math.random() * 8));
    const ping = (18 + Math.floor(Math.random() * 30));
    this._coordTop?.setText(`LAT: ${lat}  |  LONG: ${lon}`);
    this._coordBot?.setText(`ALT: ${alt}km  |  PING: ${ping}ms`);
  }

  /* ── Кнопки ───────────────────────────────────────────── */
  _buildButtons(W, H) {
    this._makeIconBtn(W / 2, H * 0.72, () => this._onBotFight());

    txt(this, W / 2, H * 0.855,
      'Матч найдётся автоматически — можешь подождать',
      9, '#4ab8cc').setOrigin(0.5).setAlpha(0.5);

    makeBackBtn(this, 'Отменить поиск', () => this._onCancel());
  }

  /* ── 3D Icon-кнопка: робот + текст, масштаб по Container ── */
  _makeIconBtn(x, y, cb) {
    const SZ  = 90;   // размер иконки
    const R   = 18;   // скругление фона

    // Container — всё внутри масштабируется из центра
    const cont = this.add.container(x, y);

    // 1. Тень-свечение снизу (парящий эффект)
    const shadowG = this.add.graphics();
    for (let i = 8; i >= 1; i--) {
      const ew = SZ * 0.7 * (i / 8);
      const eh = 10 * (i / 8);
      const a  = 0.06 * i / 8;
      shadowG.fillStyle(0xff0000, a);
      shadowG.fillEllipse(0, SZ / 2 + 6 - (8 - i) * 0.5, ew, eh);
    }
    cont.add(shadowG);

    // 2. Тёмный фон с скруглением (имитация border-radius)
    const bgG = this.add.graphics();
    bgG.fillStyle(0x120000, 0.55);
    bgG.fillRoundedRect(-SZ / 2, -SZ / 2, SZ, SZ, R);
    // Тонкая красная обводка
    bgG.lineStyle(1, 0xff2020, 0.3);
    bgG.strokeRoundedRect(-SZ / 2, -SZ / 2, SZ, SZ, R);
    cont.add(bgG);

    // 3. Изображение робота
    const robot = this.add.image(0, -2, 'bot_icon')
      .setDisplaySize(SZ * 0.82, SZ * 0.82)
      .setOrigin(0.5);
    cont.add(robot);

    // Плавное парение вверх-вниз
    this.tweens.add({
      targets: cont,
      y: y - 4,
      duration: 1800, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 4. Текст "ИИ-БОЙ" под роботом
    const label = this.add.text(0, SZ / 2 + 14, 'ИИ-БОЙ', {
      fontFamily: "'Orbitron','Arial',sans-serif",
      fontSize: '12px', fontStyle: 'bold',
      color: '#00e5ff', resolution: 2,
    }).setOrigin(0.5)
      .setShadow(0, 0, '#00e5ff', 10, false, true);
    cont.add(label);

    // 5. Интерактивная зона на весь контейнер
    const hitW = SZ + 16, hitH = SZ + 36;
    cont.setInteractive(
      new Phaser.Geom.Rectangle(-hitW / 2, -SZ / 2 - 4, hitW, hitH),
      Phaser.Geom.Rectangle.Contains
    );

    const _reset = () => {
      this.tweens.add({ targets: cont, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.easeOut' });
      robot.clearTint();
      label.setStyle({ color: '#00e5ff' });
      bgG.clear();
      bgG.fillStyle(0x120000, 0.55);
      bgG.fillRoundedRect(-SZ / 2, -SZ / 2, SZ, SZ, R);
      bgG.lineStyle(1, 0xff2020, 0.3);
      bgG.strokeRoundedRect(-SZ / 2, -SZ / 2, SZ, SZ, R);
    };

    cont.on('pointerdown', () => {
      tg?.HapticFeedback?.impactOccurred('medium');
      this.tweens.add({ targets: cont, scaleX: 0.88, scaleY: 0.88, duration: 90, ease: 'Power2' });
      robot.setTint(0xff3333);
      label.setStyle({ color: '#ff4444' });
      // Вспышка фона
      bgG.clear();
      bgG.fillStyle(0xff0000, 0.18);
      bgG.fillRoundedRect(-SZ / 2, -SZ / 2, SZ, SZ, R);
      bgG.lineStyle(2, 0xff0000, 0.9);
      bgG.strokeRoundedRect(-SZ / 2, -SZ / 2, SZ, SZ, R);
    });

    cont.on('pointerup',  () => { _reset(); cb(); });
    cont.on('pointerout', () => _reset());
  }

  /* ── Старый _makeBtn (совместимость) ──────────────────── */
  _makeBtn(x, y, w, h, label, bgColor, textColor, cb,
           borderColor = null, borderAlpha = 0.6) {
    const g = this.add.graphics();
    const fa = bgColor === C.dark ? 0.82 : 1;
    g.fillStyle(bgColor, fa);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    if (borderColor) {
      g.lineStyle(1.5, borderColor, borderAlpha);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    }
    txt(this, x, y, label, 15, textColor, true).setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      g.clear(); const d = Phaser.Display.Color.IntegerToColor(bgColor).darken(25).color;
      g.fillStyle(d, fa); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      tg?.HapticFeedback?.impactOccurred('medium');
    });
    zone.on('pointerup',  () => { g.clear(); g.fillStyle(bgColor, fa); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12); cb(); });
    zone.on('pointerout', () => { g.clear(); g.fillStyle(bgColor, fa); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12); });
  }

  shutdown() {
    this.time.removeAllEvents();
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
