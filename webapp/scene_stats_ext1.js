/* ============================================================
   StatsScene — расширение 1: _statBase/_statBonus,
   _buildStatRow, _drawPlusBtn, _buildCombatPreview
   ============================================================ */

Object.assign(StatsScene.prototype, {

  _statBase(p, key) {
    return Number(p?.stats_base?.[key] ?? p?.[key] ?? 0);
  },

  _statBonus(p, key) {
    return Number(p?.stats_bonus_total?.[key] ?? 0);
  },

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
    const valTxt = txt(this, x + 16, y + 26, String(s.valFn(p)), 24, hex, true);
    const baseVal = this._statBase(p, s.key);
    const bonusVal = this._statBonus(p, s.key);
    const breakdownTxt = txt(this, x + 16, y + 49, `база ${baseVal} | бонусы +${bonusVal}`, 8, '#ddddff');

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
    txt(this, midRight, y + 30, s.desc, 9, '#ddddff').setOrigin(1, 0);

    /* Кнопка +1 */
    const btnW = 48;
    const btnH = h - 14;
    const btnX = x + w - btnW - 4;
    const btnY = y + 7;
    const btn  = this.add.graphics();
    this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, hasStats, false);

    const btnTxt = txt(this, btnX + btnW / 2, btnY + btnH / 2,
      hasStats ? '+1' : '—', 16,
      hasStats ? '#ffffff' : '#ccccee', true
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

    return { s, valTxt, breakdownTxt, barFill, effectTxt, btn, btnTxt, zone,
             barX, barY, barW, btnX, btnY, btnW, btnH };
  },

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
  },

  /* ── Боевые показатели ───────────────────────────────── */
  _buildCombatPreview(W, H) {
    const p   = State.player;
    const py  = H * 0.63;
    const ph  = H * 0.205;

    makePanel(this, 8, py, W - 16, ph, 12);

    txt(this, W / 2, py + 10, 'БОЕВЫЕ ПОКАЗАТЕЛИ', 11, '#ddddff', true).setOrigin(0.5);

    const divider = this.add.graphics();
    divider.lineStyle(1, C.gold, 0.12);
    divider.lineBetween(20, py + 24, W - 20, py + 24);

    const cells = [
      { key: 'dmg',   label: '⚔️ Урон',   valFn: q => `~${q.dmg}`,        color: C.red,    hex: '#dc3c46' },
      { key: 'hp',    label: '❤️ HP',      valFn: q => String((q.max_hp_effective ?? q.max_hp) || 0), color: 0xe05050, hex: '#e05050' },
      { key: 'armor', label: '🛡 Броня',   valFn: q => `${q.armor_pct}%`,   color: C.green,  hex: '#3cc864' },
      { key: 'dodge', label: '🤸 Уворот',  valFn: q => `${q.dodge_pct}%`,   color: C.cyan,   hex: '#3cc8dc' },
      { key: 'crit',  label: '💥 Крит',    valFn: q => `${q.crit_pct}%`,    color: C.purple, hex: '#b45aff' },
    ];

    this._combatCells = {};
    cells.forEach((c, i) => {
      const cx   = W * (0.1 + i * 0.2);
      const cHex = c.hex || `#${c.color.toString(16).padStart(6, '0')}`;
      txt(this, cx, py + 34, c.label, 9, '#ccccee').setOrigin(0.5);
      const valT = txt(this, cx, py + 52, c.valFn(p), 16, cHex, true).setOrigin(0.5);
      this._combatCells[c.key] = { t: valT, fn: c.valFn, origColor: cHex };
    });

    txt(this, W / 2, py + ph - 12,
      'относительно среднего противника вашего уровня',
      9, '#ddddff').setOrigin(0.5);

    // Блок пассивных способностей — 4 строки: базовые + бафы
    const passY = py + ph + 6;
    const passH = 86;
    const passW = W - 24;
    const passBg = this.add.graphics();
    passBg.fillStyle(0x1a1830, 0.9);
    passBg.fillRoundedRect(12, passY, passW, passH, 10);
    passBg.lineStyle(1.5, 0x4a4870, 0.6);
    passBg.strokeRoundedRect(12, passY, passW, passH, 10);

    txt(this, W / 2, passY + 9, '⚡ Пассивные способности', 10, '#bbbbff', true).setOrigin(0.5);
    this._passLine1 = txt(this, W / 2, passY + 23,
      `💥 Крит ${parseFloat(p.crit_pct || 0).toFixed(0)}%  ·  🤸 Уворот ${parseFloat(p.dodge_pct || 0).toFixed(1)}%`,
      10, '#c8a0ff').setOrigin(0.5);
    this._passLine2 = txt(this, W / 2, passY + 38,
      `🛡 Броня ${parseFloat(p.armor_pct || 0).toFixed(1)}%  ·  ⚔️ Урон ~${p.dmg || 0}`,
      10, '#ffc870').setOrigin(0.5);
    // passLine3: Двойной удар + Точность (показывается если есть бафы)
    this._passLine3 = txt(this, W / 2, passY + 53, '', 10, '#88ddff').setOrigin(0.5);
    // passLine4: Охота за золотом + Охота за опытом (time-based бафы)
    this._passLine4 = txt(this, W / 2, passY + 68, '', 10, '#ffcc55').setOrigin(0.5);

    this._refreshBuffDisplay();
  },

});
