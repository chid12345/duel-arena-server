/* ============================================================
   StatsScene — распределение статов
   Открывается из MenuScene по кнопке 📊 СТАТЫ
   ============================================================ */

class StatsScene extends Phaser.Scene {
  constructor() { super('Stats'); }

  init(data) {
    // Можно принять свежего игрока из MenuScene
    if (data && data.player) State.player = data.player;
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._busy = false;        // блокировка пока идёт запрос
    this._floats = [];         // летящие числа (+1)

    this._drawBg(W, H);
    this._buildHeader(W);
    this._buildStatRows(W, H);
    this._buildCombatPreview(W, H);
    this._buildBackBtn(W, H);
  }

  // ── Фон ─────────────────────────────────────────────────
  _drawBg(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
    g.fillRect(0, 0, W, H);
    // Тонкая сетка для антуражу
    g.lineStyle(1, 0x5096ff, 0.04);
    for (let x = 0; x < W; x += 32) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 32) g.lineBetween(0, y, W, y);
  }

  // ── Шапка ───────────────────────────────────────────────
  _buildHeader(W) {
    const p = State.player;

    makePanel(this, 8, 8, W - 16, 64, 12);

    // Имя и уровень
    const badgeG = this.add.graphics();
    badgeG.fillStyle(C.gold, 1);
    badgeG.fillRoundedRect(16, 18, 50, 24, 7);
    txt(this, 41, 30, `УР.${p.level}`, 12, '#1a1a28', true).setOrigin(0.5);

    txt(this, 78, 20, p.username, 15, '#f0f0fa', true);
    txt(this, 78, 37, `★ ${p.rating}`, 11, '#ffc83c');

    // Свободные статы — большой счётчик справа
    this._freeStatsBadge = this._drawFreeStatsBadge(W, p.free_stats);
  }

  _drawFreeStatsBadge(W, count) {
    // Удаляем старый если есть
    if (this._fsGroup) this._fsGroup.forEach(o => o.destroy());
    this._fsGroup = [];

    const bx = W - 16, by = 22;
    const pulse = count > 0;

    const bg = this.add.graphics();
    bg.fillStyle(pulse ? C.purple : C.dark, pulse ? 0.9 : 0.6);
    bg.fillRoundedRect(bx - 74, by - 14, 74, 32, 9);
    if (pulse) {
      bg.lineStyle(1.5, C.purple, 0.8);
      bg.strokeRoundedRect(bx - 74, by - 14, 74, 32, 9);
    }
    const label = txt(this, bx - 37, by, count > 0 ? `⚡ ${count} свободн.` : '✅ все вложены',
      10, pulse ? '#f0f0fa' : '#666688', pulse).setOrigin(0.5);

    this._fsGroup = [bg, label];

    if (pulse) {
      this.tweens.add({
        targets: [bg, label],
        alpha: 0.6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    return { bg, label };
  }

  // ── Строки статов ────────────────────────────────────────
  _buildStatRows(W, H) {
    const p = State.player;
    this._statRows = {};

    const STATS = [
      {
        key:   'strength',
        icon:  '💪',
        label: 'Сила',
        color: C.red,
        valFn: p => p.strength,
        effectFn: p => `~${p.dmg} урона`,
        desc:  'Увеличивает урон по противнику',
      },
      {
        key:   'agility',
        icon:  '🤸',
        label: 'Ловкость',
        color: C.cyan,
        valFn: p => p.agility,
        effectFn: p => `${p.dodge_pct}% уворот`,
        desc:  'Шанс уклониться от удара',
      },
      {
        key:   'intuition',
        icon:  '💥',
        label: 'Интуиция',
        color: C.purple,
        valFn: p => p.intuition,
        effectFn: p => `${p.crit_pct}% крит`,
        desc:  'Шанс нанести критический урон',
      },
      {
        key:   'stamina',
        icon:  '🛡',
        label: 'Выносливость',
        color: C.green,
        valFn: p => p.stamina,
        effectFn: p => `${p.armor_pct}% броня`,
        desc:  `+${3} HP за каждое вложение`,
      },
    ];

    const startY = 84;
    const rowH   = (H * 0.52) / STATS.length;

    STATS.forEach((s, i) => {
      const y = startY + i * rowH;
      this._statRows[s.key] = this._buildStatRow(s, 8, y, W - 16, rowH - 6, p);
    });
  }

  _buildStatRow(s, x, y, w, h, p) {
    const row = {};
    const hasStats = State.player.free_stats > 0;

    // Панель
    const panel = this.add.graphics();
    panel.fillStyle(C.bgPanel, 0.9);
    panel.fillRoundedRect(x, y, w, h, 10);
    panel.lineStyle(1.5, s.color, 0.2);
    panel.strokeRoundedRect(x, y, w, h, 10);

    // Цветная полоска слева
    const stripe = this.add.graphics();
    stripe.fillStyle(s.color, 0.9);
    stripe.fillRoundedRect(x + 2, y + 8, 4, h - 16, 2);

    // Иконка + название
    txt(this, x + 18, y + 10, s.icon + ' ' + s.label, 14, '#f0f0fa', true);

    // Значение (большое)
    const valTxt = txt(this, x + 18, y + 30, String(s.valFn(p)), 24, s.color, true);

    // Мини-бар прокачки
    const barX = x + 18, barY = y + h - 14, barW = w * 0.45;
    const maxExpected = Math.max(1, 3 + (p.level * 2));
    const pct = Math.min(1, s.valFn(p) / maxExpected);
    const barBg = this.add.graphics();
    barBg.fillStyle(C.dark, 1);
    barBg.fillRoundedRect(barX, barY, barW, 6, 3);
    const barFill = this.add.graphics();
    barFill.fillStyle(s.color, 0.8);
    barFill.fillRoundedRect(barX, barY, Math.max(6, barW * pct), 6, 3);

    // Эффект справа
    const effectTxt = txt(this, x + w - 14, y + 20,
      s.effectFn(p), 12, s.color).setOrigin(1, 0.5);

    // Описание
    txt(this, x + w - 14, y + 36, s.desc, 9, '#666688').setOrigin(1, 0);

    // Кнопка +1
    const btnW = 48, btnH = h - 16;
    const btnX = x + w - btnW - 6, btnY = y + 8;
    const btn = this.add.graphics();
    this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, hasStats);

    const btnTxt = txt(this, btnX + btnW/2, btnY + btnH/2,
      hasStats ? '+1' : '—', 15, hasStats ? '#ffffff' : '#444466', true
    ).setOrigin(0.5);

    // Интерактив
    const zone = this.add.zone(btnX + btnW/2, btnY + btnH/2, btnW, btnH)
      .setInteractive({ useHandCursor: hasStats });

    if (hasStats) {
      zone.on('pointerdown', () => {
        btn.clear();
        this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, true, true);
      });
      zone.on('pointerup', () => {
        btn.clear();
        this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, true, false);
        this._onTrain(s.key);
      });
    }

    row = { panel, stripe, valTxt, barFill, effectTxt, btn, btnTxt, zone, s,
            barX, barY, barW, btnX, btnY, btnW, btnH };
    return row;
  }

  _drawPlusBtn(g, x, y, w, h, color, active, pressed = false) {
    g.clear();
    if (!active) {
      g.fillStyle(C.dark, 0.5);
      g.fillRoundedRect(x, y, w, h, 9);
      return;
    }
    const fill = pressed
      ? Phaser.Display.Color.IntegerToColor(color).darken(25).color
      : color;
    g.fillStyle(fill, 1);
    g.fillRoundedRect(x, y, w, h, 9);
    // Блик
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(x + 2, y + 2, w - 4, h/2 - 2, 7);
  }

  // ── Блок боевых % ────────────────────────────────────────
  _buildCombatPreview(W, H) {
    const p  = State.player;
    const py = H * 0.64;
    const ph = H * 0.21;

    makePanel(this, 8, py, W - 16, ph, 12);
    txt(this, W/2, py + 10, 'БОЕВЫЕ ПОКАЗАТЕЛИ', 11, '#8888aa', true).setOrigin(0.5);

    // Разделитель
    const g = this.add.graphics();
    g.lineStyle(1, C.gold, 0.15);
    g.lineBetween(20, py + 24, W - 20, py + 24);

    const cols = [
      { label: '⚔️ Урон',   val: `~${p.dmg}`,        color: '#dc3c46', x: W * 0.14 },
      { label: '🛡 Броня',  val: `-${p.armor_pct}%`,  color: '#3cc864', x: W * 0.38 },
      { label: '🤸 Уворот', val: `${p.dodge_pct}%`,   color: '#3cc8dc', x: W * 0.62 },
      { label: '💥 Крит',   val: `${p.crit_pct}%`,    color: '#b45aff', x: W * 0.86 },
    ];

    this._combatTxts = {};
    cols.forEach(c => {
      txt(this, c.x, py + 36, c.label, 9, '#8888aa').setOrigin(0.5);
      this._combatTxts[c.label] = txt(this, c.x, py + 54, c.val, 18, c.color, true).setOrigin(0.5);
    });

    txt(this, W/2, py + ph - 12,
      'показатели против среднего противника вашего уровня',
      9, '#555577').setOrigin(0.5);
  }

  // ── Кнопка Назад ─────────────────────────────────────────
  _buildBackBtn(W, H) {
    const y = H - 28;
    const g = this.add.graphics();
    g.fillStyle(C.dark, 0.9);
    g.fillRoundedRect(W/2 - 90, y - 18, 180, 36, 10);
    g.lineStyle(1.5, C.blue, 0.4);
    g.strokeRoundedRect(W/2 - 90, y - 18, 180, 36, 10);
    txt(this, W/2, y, '← Главное меню', 13, '#f0f0fa').setOrigin(0.5);

    const zone = this.add.zone(W/2, y, 180, 36).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.start('Menu');
    });
  }

  // ── Прокачка ─────────────────────────────────────────────
  async _onTrain(statKey) {
    if (this._busy) return;
    if (State.player.free_stats <= 0) return;

    this._busy = true;
    tg?.HapticFeedback?.impactOccurred('medium');

    try {
      const res = await post('/api/player/train', { stat: statKey });
      if (!res.ok) {
        this._showToast(res.reason === 'no_free_stats' ? '❌ Нет свободных статов!' : '❌ Ошибка');
        this._busy = false;
        return;
      }

      // Обновляем State
      State.player = res.player;
      tg?.HapticFeedback?.notificationOccurred('success');

      // Анимируем строку
      const row = this._statRows[statKey];
      if (row) {
        this._animateStatIncrease(row, statKey, res.player);
      }

      // Обновляем блок боевых %
      this._refreshCombatPreview(res.player);

      // Обновляем бейдж свободных статов
      this._drawFreeStatsBadge(this.W, res.player.free_stats);

      // Летящий +1
      if (row) this._spawnFloat(row.btnX + row.btnW/2, row.btnY, '+1');

    } catch(e) {
      this._showToast('❌ Нет соединения');
    }

    this._busy = false;
  }

  _animateStatIncrease(row, statKey, p) {
    const s   = row.s;
    const val = s.valFn(p);

    // Обновить текст значения
    row.valTxt.setText(String(val));

    // Вспышка цветом
    this.tweens.add({
      targets: row.valTxt,
      scaleX: 1.4, scaleY: 1.4,
      duration: 120, yoyo: true, ease: 'Back.easeOut',
    });

    // Перерисовать полоску
    row.barFill.clear();
    const maxExpected = Math.max(1, 3 + (p.level * 2));
    const pct = Math.min(1, val / maxExpected);
    row.barFill.fillStyle(s.color, 0.8);
    row.barFill.fillRoundedRect(
      row.barX, row.barY,
      Math.max(6, row.barW * pct), 6, 3
    );

    // Эффект
    row.effectTxt.setText(s.effectFn(p));
    this.tweens.add({
      targets: row.effectTxt,
      alpha: 0.3, duration: 80, yoyo: true,
    });

    // Кнопка: если статов больше нет — отключить
    if (p.free_stats <= 0) {
      row.zone.disableInteractive();
      row.btn.clear();
      this._drawPlusBtn(row.btn, row.btnX, row.btnY, row.btnW, row.btnH, s.color, false);
      row.btnTxt.setText('—').setColor('#444466');
    }
  }

  _refreshCombatPreview(p) {
    const map = {
      '⚔️ Урон':   `~${p.dmg}`,
      '🛡 Броня':  `-${p.armor_pct}%`,
      '🤸 Уворот': `${p.dodge_pct}%`,
      '💥 Крит':   `${p.crit_pct}%`,
    };
    Object.entries(map).forEach(([label, val]) => {
      const t = this._combatTxts[label];
      if (!t) return;
      t.setText(val);
      this.tweens.add({ targets: t, alpha: 0.2, duration: 80, yoyo: true });
    });
  }

  // Летящее число (+1)
  _spawnFloat(x, y, msg) {
    const t = txt(this, x, y, msg, 20, '#ffc83c', true)
      .setOrigin(0.5).setAlpha(1);
    this.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  _showToast(msg) {
    const { W, H } = this;
    const t = txt(this, W/2, H - 50, msg, 12, '#ff4455', true)
      .setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, duration: 200, hold: 1500, yoyo: true,
      onComplete: () => t.destroy(),
    });
  }
}
