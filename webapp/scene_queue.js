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

    // Сетка киберпанк
    g.lineStyle(1, 0x00e5ff, 0.035);
    const gs = 34;
    for (let x = 0; x <= W; x += gs) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += gs) g.lineBetween(0, y, W, y);

    // Scanlines (горизонтальные полосы, каждые 4px)
    g.lineStyle(1, 0x000000, 0.06);
    for (let y = 0; y <= H; y += 4) g.lineBetween(0, y, W, y);

    // Частицы-точки (не звёзды — квадратики данных)
    for (let i = 0; i < 38; i++) {
      const px = Phaser.Math.Between(0, W);
      const py = Phaser.Math.Between(0, H * 0.88);
      const pr = Phaser.Math.FloatBetween(0.4, 1.4);
      const pa = Phaser.Math.FloatBetween(0.06, 0.28);
      this.add.rectangle(px, py, pr * 2, pr * 2, 0x00e5ff, pa);
    }
  }

  /* ── Центральный UI с радаром ──────────────────────────── */
  _buildSearchUI(W, H) {
    const cx = W / 2;
    const cy = H * 0.36;
    this._cx = cx;
    this._cy = cy;

    // Заголовок — стиль HUD
    this.add.text(cx, H * 0.09, '// ПОИСК СОПЕРНИКА', {
      fontFamily: "'Orbitron', 'Arial', sans-serif",
      fontSize: '16px', fontStyle: 'bold',
      color: '#00e5ff', resolution: 2,
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 10, false, true);

    // Подзаголовок
    txt(this, cx, H * 0.155, 'SCANNING FOR TARGET...', 10, '#4ab8cc')
      .setOrigin(0.5).setAlpha(0.7);

    // Статические кольца радара — cyan
    const rg = this.add.graphics();
    const rings = [90, 62, 38];
    const CY = 0x00e5ff;
    rings.forEach((r, i) => {
      const alpha = 0.45 - i * 0.1;
      rg.lineStyle(1.2 - i * 0.2, CY, alpha);
      rg.strokeCircle(cx, cy, r);
    });

    // Перекрестие
    rg.lineStyle(1, CY, 0.12);
    rg.lineBetween(cx - 96, cy, cx + 96, cy);
    rg.lineBetween(cx, cy - 96, cx, cy + 96);

    // Диаманды по кольцам (угловые засечки)
    const diaSz = 3;
    rg.lineStyle(1, CY, 0.55);
    [90, 62].forEach(r => {
      [0, 90, 180, 270].forEach(deg => {
        const rad = (deg * Math.PI) / 180;
        const dx = cx + Math.cos(rad) * r;
        const dy = cy + Math.sin(rad) * r;
        rg.strokeRect(dx - diaSz, dy - diaSz, diaSz * 2, diaSz * 2);
      });
    });

    // Угловые скобки вокруг радара
    this._drawCornerBrackets(rg, cx, cy, 104, 104, CY, 0.6);

    // Пульсирующее кольцо (обновляется в update)
    this._pulseG = this.add.graphics();
    this._pulseR = 0;

    // Вращающийся луч сканера (обновляется в update)
    this._scanAngle = 0;
    this._scanG     = this.add.graphics();

    // Воин в центре
    const warrior = this.add.image(cx, cy, 'warrior_blue')
      .setScale(1.1).setOrigin(0.5);
    this.tweens.add({
      targets: warrior,
      y: cy - 5,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Метка TARGET LOCK под воином
    txt(this, cx, cy + 58, 'TARGET LOCK', 7, '#00e5ff')
      .setOrigin(0.5).setAlpha(0.4);

    // Статус и таймер — крупнее и ярче
    this._statusTxt = this.add.text(cx, cy + 114, 'Ищем соперника...', {
      fontFamily: "'Share Tech Mono', 'Courier New', monospace",
      fontSize: '13px', color: '#c8d8ff', resolution: 2,
    }).setOrigin(0.5);

    this._timerTxt = this.add.text(cx, cy + 134, '0:00', {
      fontFamily: "'Orbitron', 'Arial', sans-serif",
      fontSize: '18px', fontStyle: 'bold',
      color: '#00e5ff', resolution: 2,
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 8, false, true);

    // Анимация точек в тексте
    this._dotsTimer = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        if (!this._searching) return;
        this._dots = (this._dots + 1) % 4;
        const d = '.'.repeat(this._dots || 1);
        this._statusTxt?.setText(`Ищем соперника${d}`);
      },
    });

    // Разделитель — неон-линия
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x00e5ff, 0.15);
    sep.lineBetween(30, H * 0.60, W - 30, H * 0.60);
    // Центральная точка разделителя
    sep.fillStyle(0x00e5ff, 0.4);
    sep.fillRect(W / 2 - 3, H * 0.60 - 1, 6, 2);
  }

  /* ── Угловые скобки ───────────────────────────────────── */
  _drawCornerBrackets(g, cx, cy, hw, hh, color, alpha) {
    const bx = cx - hw, by = cy - hh;
    const bw = hw * 2, bh = hh * 2;
    const L = 14;
    g.lineStyle(1.5, color, alpha);
    g.lineBetween(bx, by + L, bx, by); g.lineBetween(bx, by, bx + L, by);
    g.lineBetween(bx + bw - L, by, bx + bw, by); g.lineBetween(bx + bw, by, bx + bw, by + L);
    g.lineBetween(bx, by + bh - L, bx, by + bh); g.lineBetween(bx, by + bh, bx + L, by + bh);
    g.lineBetween(bx + bw - L, by + bh, bx + bw, by + bh); g.lineBetween(bx + bw, by + bh, bx + bw, by + bh - L);
  }

  /* ── Кнопки ───────────────────────────────────────────── */
  _buildButtons(W, H) {
    const cy1 = H * 0.68;
    const cy2 = H * 0.80;

    // Кнопка: Бой с ботом (угловая киберпанк)
    this._makeCyberBtn(
      W / 2, cy1, 230, 46,
      '🤖  БОЙ С БОТОМ', 0xff2244,
      () => this._onBotFight()
    );

    // Подсказка
    txt(this, W / 2, cy2,
      'Матч найдётся автоматически — можешь подождать',
      9, '#4ab8cc').setOrigin(0.5).setAlpha(0.6);

    // Кнопка: Отмена (внизу)
    makeBackBtn(this, 'Отменить поиск', () => this._onCancel());
  }

  /* ── Угловая кнопка киберпанк ─────────────────────────── */
  _makeCyberBtn(x, y, w, h, label, color, cb) {
    const cut = 10;
    const pts = [
      new Phaser.Geom.Point(x - w / 2 + cut, y - h / 2),
      new Phaser.Geom.Point(x + w / 2,       y - h / 2),
      new Phaser.Geom.Point(x + w / 2,       y + h / 2 - cut),
      new Phaser.Geom.Point(x + w / 2 - cut, y + h / 2),
      new Phaser.Geom.Point(x - w / 2,       y + h / 2),
      new Phaser.Geom.Point(x - w / 2,       y - h / 2 + cut),
    ];

    const bg = this.add.graphics();
    const _draw = (fillAlpha) => {
      bg.clear();
      bg.fillStyle(color, fillAlpha);
      bg.fillPoints(pts, true);
      // Неон-обводка
      bg.lineStyle(1.5, color, 0.85);
      bg.strokePoints(pts, true);
      // Блик (верхняя треть)
      bg.fillStyle(0xffffff, 0.08);
      bg.fillPoints([
        new Phaser.Geom.Point(x - w / 2 + cut, y - h / 2),
        new Phaser.Geom.Point(x + w / 2,       y - h / 2),
        new Phaser.Geom.Point(x + w / 2,       y),
        new Phaser.Geom.Point(x - w / 2,       y),
        new Phaser.Geom.Point(x - w / 2,       y - h / 2 + cut),
      ], true);
    };
    _draw(1);

    this.add.text(x, y, label, {
      fontFamily: "'Orbitron', 'Arial', sans-serif",
      fontSize: '13px', fontStyle: 'bold',
      color: '#ffffff', resolution: 2,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown',  () => { _draw(0.7); tg?.HapticFeedback?.impactOccurred('medium'); });
    zone.on('pointerup',    () => { _draw(1); cb(); });
    zone.on('pointerout',   () => { _draw(1); });
  }

  /* ── Старый _makeBtn (используется другими сценами если нужно) */
  _makeBtn(x, y, w, h, label, bgColor, textColor, cb,
           borderColor = null, borderAlpha = 0.6) {
    const g = this.add.graphics();
    const fillAlpha = bgColor === C.dark ? 0.82 : 1;
    g.fillStyle(bgColor, fillAlpha);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    if (borderColor) {
      g.lineStyle(1.5, borderColor, borderAlpha);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    }
    txt(this, x, y, label, 15, textColor, true).setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      g.clear();
      const dark = Phaser.Display.Color.IntegerToColor(bgColor).darken(25).color;
      g.fillStyle(dark, fillAlpha);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      tg?.HapticFeedback?.impactOccurred('medium');
    });
    zone.on('pointerup',  () => { g.clear(); g.fillStyle(bgColor, fillAlpha); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12); cb(); });
    zone.on('pointerout', () => { g.clear(); g.fillStyle(bgColor, fillAlpha); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12); });
  }

  shutdown() {
    this.time.removeAllEvents();
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
