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
    const hex = `#${s.color.toString(16).padStart(6, '0')}`;

    /* ── Панель ─────────────────────────────── */
    const panel = this.add.graphics();
    panel.fillStyle(0x0c0a18, 0.92);
    panel.fillRoundedRect(x, y + 2, w, h - 4, 8);
    panel.lineStyle(1, s.color, 0.18);
    panel.strokeRoundedRect(x, y + 2, w, h - 4, 8);

    /* Левый акцент */
    const stripe = this.add.graphics();
    stripe.fillStyle(s.color, 1);
    stripe.fillRoundedRect(x + 3, y + 10, 4, h - 20, 2);

    /* ── Верхняя строка: иконка + название ──── */
    const ROW1_Y = y + 18;
    txt(this, x + 18, ROW1_Y, s.icon, 14).setOrigin(0.5);
    txt(this, x + 32, ROW1_Y, s.label, 11, '#ffffff').setOrigin(0, 0.5);

    /* ── Кнопка +1 (фиксированные размеры) ─── */
    const btnW = 40;
    const btnH = 34;
    const btnX = x + w - btnW - 4;
    const btnY = y + (h - btnH) / 2;
    const btn  = this.add.graphics();
    this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, hasStats, false);
    const btnTxt = txt(this, btnX + btnW / 2, btnY + btnH / 2,
      hasStats ? '+1' : '—', 14,
      hasStats ? '#ffffff' : '#555577', true
    ).setOrigin(0.5);

    /* ── Эффект (правее от бара, выровнен по верху) ─ */
    const effX = btnX - 6;
    const effW = 58;
    const effectTxt = txt(this, effX, ROW1_Y, s.effectFn(p), 11, hex, true).setOrigin(1, 0.5);

    /* ── Скан-бар ──────────────────────────── */
    const barX  = x + 32;
    const barW  = effX - effW - barX - 6;
    const barH  = 18;
    const barY  = y + h / 2 - 2;   // центр чуть вниз

    const barBgG = this.add.graphics();
    barBgG.fillStyle(0x080614, 1);
    barBgG.fillRoundedRect(barX, barY, barW, barH, 3);
    barBgG.lineStyle(1, s.color, 0.12);
    barBgG.strokeRoundedRect(barX, barY, barW, barH, 3);

    const maxExp = Math.max(1, 3 + p.level * 2);
    const pct    = Math.min(1, s.valFn(p) / maxExp);
    const fillW  = Math.max(barH, Math.round(barW * pct));

    const barFill = this.add.graphics();
    barFill.fillStyle(s.color, 0.38);
    barFill.fillRoundedRect(barX, barY, fillW, barH, 3);

    /* Значение внутри бара */
    const valTxt = txt(this, barX + 8, barY + barH / 2,
      String(s.valFn(p)), 12, hex, true).setOrigin(0, 0.5);

    /* ── Разбивка база|бонусы ──────────────── */
    const baseVal   = this._statBase(p, s.key);
    const bonusVal  = this._statBonus(p, s.key);
    const breakdownTxt = txt(this, barX, barY + barH + 4,
      `база ${baseVal} | бонусы +${bonusVal}`, 9, '#aaaacc');

    /* ── Интерактив ────────────────────────── */
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
             barX, barY, barW, barH, btnX, btnY, btnW, btnH };
  },

  _drawPlusBtn(g, x, y, w, h, color, active, pressed) {
    g.clear();
    if (!active) {
      g.fillStyle(0x0c0a18, 0.9);
      g.fillRoundedRect(x, y, w, h, 7);
      g.lineStyle(1, 0x1e1c30, 0.8);
      g.strokeRoundedRect(x, y, w, h, 7);
      return;
    }
    const col = pressed
      ? Phaser.Display.Color.IntegerToColor(color).darken(30).color
      : color;
    g.fillStyle(col, 0.2);
    g.fillRoundedRect(x, y, w, h, 7);
    g.lineStyle(1.5, col, pressed ? 0.9 : 0.7);
    g.strokeRoundedRect(x, y, w, h, 7);
  },

  /* ── Боевые показатели (sci-fi стиль) ──── */
  _buildCombatPreview(W, H) {
    const p   = State.player;
    const py  = H * 0.73;
    const ph  = H * 0.19;

    /* Ячейки */
    const cells = [
      { key: 'dmg',   label: '⚔️ Урон',  valFn: q => `~${q.dmg}`,        hex: '#dc3c46' },
      { key: 'hp',    label: '❤️ HP',     valFn: q => String((q.max_hp_effective ?? q.max_hp) || 0), hex: '#e05050' },
      { key: 'armor', label: '🛡 Броня',  valFn: q => `${q.armor_pct}%`,   hex: '#3cc864' },
      { key: 'dodge', label: '🤸 Уворот', valFn: q => `${q.dodge_pct}%`,   hex: '#3cc8dc' },
      { key: 'crit',  label: '💥 Крит',   valFn: q => `${q.crit_pct}%`,    hex: '#b45aff' },
    ];
    const cellW = Math.floor((W - 16) / cells.length);
    const cellY = py + 22;
    const cellH = 48;

    const cellBg = this.add.graphics();
    cellBg.fillStyle(0x080614, 0.85);
    cellBg.fillRoundedRect(8, cellY, W - 16, cellH, 8);
    cellBg.lineStyle(1, 0x1a2a50, 0.8);
    cellBg.strokeRoundedRect(8, cellY, W - 16, cellH, 8);

    this._combatCells = {};
    cells.forEach((c, i) => {
      const cx = 8 + cellW * i + cellW / 2;
      if (i > 0) {
        const sepL = this.add.graphics();
        sepL.lineStyle(1, 0x1a2a50, 0.5);
        sepL.lineBetween(8 + cellW * i, cellY + 6, 8 + cellW * i, cellY + cellH - 6);
      }
      txt(this, cx, cellY + 12, c.label, 9, '#bbccee').setOrigin(0.5);
      const valT = txt(this, cx, cellY + 32, c.valFn(p), 15, c.hex, true).setOrigin(0.5);
      this._combatCells[c.key] = { t: valT, fn: c.valFn, origColor: c.hex };
    });

    this._refreshBuffDisplay();
  },

});
