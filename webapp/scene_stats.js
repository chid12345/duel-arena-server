/* ============================================================
   StatsScene — распределение свободных статов
   Открывается из MenuScene: this.scene.start('Stats')
   ============================================================ */

class StatsScene extends Phaser.Scene {
  constructor() { super('Stats'); }

  init(data) {
    if (data && data.player) State.player = data.player;
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W;
    this.H = H;
    this._busy = false;
    this._statRows = {};

    this._drawBg(W, H);
    this._buildHeader(W);
    this._buildStatRows(W, H);
    this._buildCombatPreview(W, H);
    this._buildBackBtn(W, H);
  }

  /* ── Фон ─────────────────────────────────────────────── */
  _drawBg(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
    g.fillRect(0, 0, W, H);
    g.lineStyle(1, 0x5096ff, 0.04);
    for (let x = 0; x < W; x += 32) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 32) g.lineBetween(0, y, W, y);
  }

  /* ── Шапка ───────────────────────────────────────────── */
  _buildHeader(W) {
    const p = State.player;
    makePanel(this, 8, 8, W - 16, 62, 12);

    // Бейдж уровня
    const bg = this.add.graphics();
    bg.fillStyle(C.gold, 1);
    bg.fillRoundedRect(16, 18, 54, 26, 7);
    txt(this, 43, 31, `УР.${p.level}`, 13, '#1a1a28', true).setOrigin(0.5);

    txt(this, 82, 20, p.username, 15, '#f0f0fa', true);
    txt(this, 82, 38, `★ ${p.rating}  ·  📊 СТАТЫ`, 11, '#8888aa');

    // Счётчик свободных статов
    this._fsBadge = this._makeFsBadge(W, p.free_stats);
  }

  _makeFsBadge(W, count) {
    if (this._fsBadgeObjs) {
      this._fsBadgeObjs.forEach(o => o.destroy());
    }
    const active = count > 0;
    const bx = W - 16;
    const bg = this.add.graphics();
    bg.fillStyle(active ? C.purple : C.dark, active ? 0.85 : 0.5);
    bg.fillRoundedRect(bx - 78, 19, 78, 30, 9);
    if (active) {
      bg.lineStyle(1.5, C.purple, 0.7);
      bg.strokeRoundedRect(bx - 78, 19, 78, 30, 9);
    }
    const label = txt(this, bx - 39, 34,
      active ? `⚡ ${count} свободн.` : '✅ все вложены',
      10, active ? '#f0f0fa' : '#555577', active
    ).setOrigin(0.5);

    if (active) {
      this.tweens.add({
        targets: bg, alpha: 0.55,
        duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    this._fsBadgeObjs = [bg, label];
    return { bg, label };
  }

  /* ── Строки статов ───────────────────────────────────── */
  _buildStatRows(W, H) {
    const p = State.player;

    const STATS = [
      {
        key:      'strength',
        icon:     '💪',
        label:    'Сила',
        color:    C.red,
        valFn:    q => q.strength,
        effectFn: q => `~${q.dmg} урона`,
        desc:     'Увеличивает урон по противнику',
      },
      {
        key:      'agility',
        icon:     '🤸',
        label:    'Ловкость',
        color:    C.cyan,
        valFn:    q => q.agility,
        effectFn: q => `${q.dodge_pct}% уворот`,
        desc:     'Шанс уклониться от удара',
      },
      {
        key:      'intuition',
        icon:     '💥',
        label:    'Интуиция',
        color:    C.purple,
        valFn:    q => q.intuition,
        effectFn: q => `${q.crit_pct}% крит`,
        desc:     'Шанс нанести критический удар',
      },
      {
        key:      'stamina',
        icon:     '🛡',
        label:    'Выносливость',
        color:    C.green,
        valFn:    q => q.stamina,
        effectFn: q => `${q.armor_pct}% броня`,
        desc:     '+3 HP за каждое вложение',
      },
    ];

    // Область: от 82px до начала combat preview
    const areaTop = 82;
    const areaBot = H * 0.62;
    const rowH    = (areaBot - areaTop) / STATS.length;

    STATS.forEach((s, i) => {
      const y = areaTop + i * rowH;
      this._statRows[s.key] = this._buildStatRow(s, 8, y, W - 16, rowH - 5, p);
    });
  }

  _buildStatRow(s, x, y, w, h, p) {
    const hasStats = State.player.free_stats > 0;
    // Конвертируем число-цвет в CSS-строку для txt()
    const hex = `#${s.color.toString(16).padStart(6, '0')}`;

    /* Панель */
    const panel = this.add.graphics();
    panel.fillStyle(C.bgPanel, 0.92);
    panel.fillRoundedRect(x, y, w, h, 10);
    panel.lineStyle(2, s.color, 0.30);
    panel.strokeRoundedRect(x, y, w, h, 10);

    /* Цветная полоска слева */
    const stripe = this.add.graphics();
    stripe.fillStyle(s.color, 1);
    stripe.fillRoundedRect(x + 2, y + 8, 5, h - 16, 2);

    /* Иконка + название */
    txt(this, x + 16, y + 9, `${s.icon} ${s.label}`, 13, '#f0f0fa', true);

    /* Значение — крупно, в цвете стата */
    const valTxt = txt(this, x + 16, y + 28, String(s.valFn(p)), 24, hex, true);

    /* Мини-бар */
    const barX = x + 16;
    const barY = y + h - 13;
    const barW = Math.round(w * 0.42);
    const maxExp = Math.max(1, 3 + p.level * 2);
    const pct = Math.min(1, s.valFn(p) / maxExp);
    const barBg = this.add.graphics();
    barBg.fillStyle(C.dark, 1);
    barBg.fillRoundedRect(barX, barY, barW, 5, 2);
    const barFill = this.add.graphics();
    barFill.fillStyle(s.color, 0.85);
    barFill.fillRoundedRect(barX, barY, Math.max(5, Math.round(barW * pct)), 5, 2);

    /* Эффект + описание (правая часть, перед кнопкой) */
    const midRight = x + w - 62;
    const effectTxt = txt(this, midRight, y + 14, s.effectFn(p), 13, hex, true).setOrigin(1, 0.5);
    txt(this, midRight, y + 30, s.desc, 9, '#666688').setOrigin(1, 0);

    /* Кнопка +1 */
    const btnW = 48;
    const btnH = h - 14;
    const btnX = x + w - btnW - 4;
    const btnY = y + 7;
    const btn  = this.add.graphics();
    this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, hasStats, false);

    const btnTxt = txt(this, btnX + btnW / 2, btnY + btnH / 2,
      hasStats ? '+1' : '—', 16,
      hasStats ? '#ffffff' : '#444466', true
    ).setOrigin(0.5);

    /* Интерактив */
    const zone = this.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH);
    if (hasStats) {
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, true, true);
      });
      zone.on('pointerup', () => {
        this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, true, false);
        this._onTrain(s.key);
      });
      zone.on('pointerout', () => {
        this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, true, false);
      });
    }

    return { s, valTxt, barFill, effectTxt, btn, btnTxt, zone,
             barX, barY, barW, btnX, btnY, btnW, btnH };
  }

  _drawPlusBtn(g, x, y, w, h, color, active, pressed) {
    g.clear();
    if (!active) {
      g.fillStyle(C.dark, 0.45);
      g.fillRoundedRect(x, y, w, h, 9);
      g.lineStyle(1, 0x333355, 0.5);
      g.strokeRoundedRect(x, y, w, h, 9);
      return;
    }
    const col = pressed
      ? Phaser.Display.Color.IntegerToColor(color).darken(30).color
      : color;
    g.fillStyle(col, 1);
    g.fillRoundedRect(x, y, w, h, 9);
    // Блик
    g.fillStyle(0xffffff, pressed ? 0.06 : 0.14);
    g.fillRoundedRect(x + 3, y + 3, w - 6, Math.round(h * 0.45), 7);
    // Рамка
    g.lineStyle(1.5, 0xffffff, 0.15);
    g.strokeRoundedRect(x, y, w, h, 9);
  }

  /* ── Боевые показатели ───────────────────────────────── */
  _buildCombatPreview(W, H) {
    const p   = State.player;
    const py  = H * 0.63;
    const ph  = H * 0.205;

    makePanel(this, 8, py, W - 16, ph, 12);

    txt(this, W / 2, py + 10, 'БОЕВЫЕ ПОКАЗАТЕЛИ', 11, '#666688', true).setOrigin(0.5);

    const divider = this.add.graphics();
    divider.lineStyle(1, C.gold, 0.12);
    divider.lineBetween(20, py + 24, W - 20, py + 24);

    const cells = [
      { key: 'dmg',   label: '⚔️ Урон',   valFn: q => `~${q.dmg}`,       color: C.red,    hex: '#dc3c46' },
      { key: 'armor', label: '🛡 Броня',   valFn: q => `-${q.armor_pct}%`, color: C.green,  hex: '#3cc864' },
      { key: 'dodge', label: '🤸 Уворот',  valFn: q => `${q.dodge_pct}%`,  color: C.cyan,   hex: '#3cc8dc' },
      { key: 'crit',  label: '💥 Крит',    valFn: q => `${q.crit_pct}%`,   color: C.purple, hex: '#b45aff' },
    ];

    this._combatCells = {};
    cells.forEach((c, i) => {
      const cx   = W * (0.13 + i * 0.25);
      const cHex = `#${c.color.toString(16).padStart(6, '0')}`;
      txt(this, cx, py + 34, c.label, 9, '#8888aa').setOrigin(0.5);
      const valT = txt(this, cx, py + 52, c.valFn(p), 18, cHex, true).setOrigin(0.5);
      this._combatCells[c.key] = { t: valT, fn: c.valFn };
    });

    txt(this, W / 2, py + ph - 12,
      'относительно среднего противника вашего уровня',
      9, '#555577').setOrigin(0.5);
  }

  /* ── Кнопка назад ────────────────────────────────────── */
  _buildBackBtn(W, H) {
    const y = H - 28;
    const bw = 190, bh = 38;
    const g = this.add.graphics();
    g.fillStyle(C.dark, 0.9);
    g.fillRoundedRect(W / 2 - bw / 2, y - bh / 2, bw, bh, 10);
    g.lineStyle(1.5, C.blue, 0.35);
    g.strokeRoundedRect(W / 2 - bw / 2, y - bh / 2, bw, bh, 10);
    txt(this, W / 2, y, '← Главное меню', 13, '#a0a0cc').setOrigin(0.5);

    const zone = this.add.zone(W / 2, y, bw, bh).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.start('Menu');
    });
  }

  /* ── Прокачка ─────────────────────────────────────────── */
  async _onTrain(statKey) {
    if (this._busy) return;
    if (State.player.free_stats <= 0) {
      this._showToast('❌ Нет свободных статов!');
      return;
    }

    this._busy = true;
    tg?.HapticFeedback?.impactOccurred('medium');

    let res;
    try {
      res = await post('/api/player/train', { stat: statKey });
    } catch(e) {
      this._showToast('❌ Нет соединения');
      this._busy = false;
      return;
    }

    if (!res.ok) {
      this._showToast(res.reason === 'no_free_stats' ? '❌ Нет свободных статов!' : '❌ Ошибка');
      this._busy = false;
      return;
    }

    // Обновляем данные
    const prev = State.player;
    State.player = res.player;
    tg?.HapticFeedback?.notificationOccurred('success');

    // Анимируем строку
    const row = this._statRows[statKey];
    if (row) this._animateRow(row, res.player, prev.free_stats - 1);

    // Обновляем боевые %
    this._refreshCombat(res.player);

    // Обновляем бейдж
    this._makeFsBadge(this.W, res.player.free_stats);

    // Летящий +1
    if (row) this._spawnFloat(row.btnX + row.btnW / 2, row.btnY, '+1');

    // Если статов не осталось — перерисовать все кнопки
    if (res.player.free_stats <= 0) this._disableAllBtns();

    this._busy = false;
  }

  _animateRow(row, p, newFree) {
    const { s, valTxt, barFill, effectTxt, barX, barY, barW } = row;

    // Значение
    valTxt.setText(String(s.valFn(p)));
    this.tweens.add({
      targets: valTxt, scaleX: 1.35, scaleY: 1.35,
      duration: 130, yoyo: true, ease: 'Back.easeOut',
    });

    // Полоска
    barFill.clear();
    const maxExp = Math.max(1, 3 + p.level * 2);
    const pct    = Math.min(1, s.valFn(p) / maxExp);
    barFill.fillStyle(s.color, 0.75);
    barFill.fillRoundedRect(barX, barY, Math.max(5, Math.round(barW * pct)), 5, 2);

    // Эффект
    effectTxt.setText(s.effectFn(p));
    this.tweens.add({ targets: effectTxt, alpha: 0.2, duration: 80, yoyo: true });
  }

  _disableAllBtns() {
    Object.values(this._statRows).forEach(row => {
      row.zone.disableInteractive();
      this._drawPlusBtn(row.btn, row.btnX, row.btnY, row.btnW, row.btnH, row.s.color, false, false);
      row.btnTxt.setText('—').setStyle({ color: '#444466' });
    });
  }

  _refreshCombat(p) {
    Object.values(this._combatCells).forEach(cell => {
      const newVal = cell.fn(p);
      if (cell.t.text !== newVal) {
        cell.t.setText(newVal);
        this.tweens.add({ targets: cell.t, alpha: 0.15, duration: 80, yoyo: true });
      }
    });
  }

  /* ── Вспомогательные ─────────────────────────────────── */
  _spawnFloat(x, y, msg) {
    const t = txt(this, x, y, msg, 22, '#ffc83c', true).setOrigin(0.5).setAlpha(1);
    this.tweens.add({
      targets: t, y: y - 70, alpha: 0,
      duration: 850, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  _showToast(msg) {
    const t = txt(this, this.W / 2, this.H - 52, msg, 12, '#ff4455', true)
      .setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1,
      duration: 200, hold: 1400, yoyo: true,
      onComplete: () => t.destroy(),
    });
  }
}
