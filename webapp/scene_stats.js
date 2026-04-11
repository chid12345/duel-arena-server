/* ============================================================
   StatsScene — распределение свободных статов
   Открывается из MenuScene: this.scene.start('Stats')
   ============================================================ */

class StatsScene extends Phaser.Scene {
  constructor() { super('Stats'); }

  init(data) {
    this._initData = data || {};
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
    this._buildBattleStats(W);
    this._buildStatRows(W, H);
    this._buildCombatPreview(W, H);
    this._buildAvatarBtn(W, H);
    this._buildBackBtn(W, H);

    // После restart от wardrobe-действия — открыть гардероб заново
    const d = this._initData;
    if (d.reopenWardrobe && d.wardrobePayload) {
      this._renderAvatarOverlay(d.wardrobePayload);
      if (d.toast) this._showToast(d.toast);
    }
  }

  /* ── Фон ─────────────────────────────────────────────── */
  _drawBg(W, H) {
    /* Градиент без сетки — сетка давала 50+ draw-call и тормоза при входе */
    const g = this.add.graphics();
    g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
    g.fillRect(0, 0, W, H);
  }

  /* ── Шапка ───────────────────────────────────────────── */
  _buildHeader(W) {
    const p = State.player;
    makePanel(this, 8, 8, W - 16, 62, 12);

    /* Кнопка «‹» занимает x=10..54 — контент начинаем с x=60 */
    // Бейдж уровня (сдвинут вправо от кнопки «‹»)
    const bg = this.add.graphics();
    bg.fillStyle(C.gold, 1);
    bg.fillRoundedRect(60, 18, 52, 26, 7);
    txt(this, 86, 31, `УР.${p.level}`, 13, '#1a1a28', true).setOrigin(0.5);

    const uname = (p.username || '').slice(0, 14);
    txt(this, 122, 20, uname, 14, '#f0f0fa', true);
    const tline = p.display_title ? `🏵 ${p.display_title}  · ` : '';
    txt(this, 122, 38, `${tline}★ ${p.rating}  ·  ГЕРОЙ`, 10, '#ffc83c');

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
      10, active ? '#f0f0fa' : '#9999bb', active
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

  /* ── Боевая статистика (под заголовком) ──────────────── */
  _buildBattleStats(W) {
    const p     = State.player;
    const wins  = p.wins   || 0;
    const losses= p.losses || 0;
    const total = wins + losses;
    const wr    = total > 0 ? Math.round(wins / total * 100) : 0;
    const streak= p.win_streak || 0;

    const y = 74;
    makePanel(this, 8, y, W - 16, 34, 8, 0.85);

    const cols = [
      { v: String(wins),   sub: 'Победы',   col: '#3cc864' },
      { v: String(losses), sub: 'Пораж.',   col: '#dc3c46' },
      { v: `${wr}%`,       sub: 'Винрейт',  col: '#ffc83c' },
      { v: String(streak), sub: 'Серия 🔥', col: '#ff8844' },
    ];
    const cw = (W - 16) / cols.length;
    cols.forEach((c, i) => {
      const cx = 8 + cw * (i + 0.5);
      txt(this, cx, y + 10, c.v,   13, c.col, true).setOrigin(0.5);
      txt(this, cx, y + 24, c.sub,  8, '#9999bb').setOrigin(0.5);
    });
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
        desc:     '+2 HP за каждое вложение',
      },
    ];

    // Область: от 116px (после панели боевой статистики) до начала combat preview
    const areaTop = 116;
    const areaBot = H * 0.62;
    const rowH    = (areaBot - areaTop) / STATS.length;

    STATS.forEach((s, i) => {
      const y = areaTop + i * rowH;
      this._statRows[s.key] = this._buildStatRow(s, 8, y, W - 16, rowH - 5, p);
    });
  }

  _statBase(p, key) {
    return Number(p?.stats_base?.[key] ?? p?.[key] ?? 0);
  }

  _statBonus(p, key) {
    return Number(p?.stats_bonus_total?.[key] ?? 0);
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
    const valTxt = txt(this, x + 16, y + 26, String(s.valFn(p)), 24, hex, true);
    const baseVal = this._statBase(p, s.key);
    const bonusVal = this._statBonus(p, s.key);
    const breakdownTxt = txt(this, x + 16, y + 49, `база ${baseVal} | бонусы +${bonusVal}`, 8, '#a8a8c8');

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
    txt(this, midRight, y + 30, s.desc, 9, '#9999bb').setOrigin(1, 0);

    /* Кнопка +1 */
    const btnW = 48;
    const btnH = h - 14;
    const btnX = x + w - btnW - 4;
    const btnY = y + 7;
    const btn  = this.add.graphics();
    this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, hasStats, false);

    const btnTxt = txt(this, btnX + btnW / 2, btnY + btnH / 2,
      hasStats ? '+1' : '—', 16,
      hasStats ? '#ffffff' : '#8888aa', true
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

    txt(this, W / 2, py + 10, 'БОЕВЫЕ ПОКАЗАТЕЛИ', 11, '#9999bb', true).setOrigin(0.5);

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
      txt(this, cx, py + 34, c.label, 9, '#8888aa').setOrigin(0.5);
      const valT = txt(this, cx, py + 52, c.valFn(p), 16, cHex, true).setOrigin(0.5);
      this._combatCells[c.key] = { t: valT, fn: c.valFn, origColor: cHex };
    });

    txt(this, W / 2, py + ph - 12,
      'относительно среднего противника вашего уровня',
      9, '#9999bb').setOrigin(0.5);

    // Блок пассивных способностей — компактный, перед кнопкой
    const passY = py + ph + 6;
    const passH = 54;
    const passW = W - 24;
    const passBg = this.add.graphics();
    passBg.fillStyle(0x1a1830, 0.9);
    passBg.fillRoundedRect(12, passY, passW, passH, 10);
    passBg.lineStyle(1.5, 0x4a4870, 0.6);
    passBg.strokeRoundedRect(12, passY, passW, passH, 10);

    txt(this, W / 2, passY + 10, '⚡ Пассивные способности', 10, '#9090cc', true).setOrigin(0.5);
    this._passLine1 = txt(this, W / 2, passY + 26,
      `💥 Крит ${parseFloat(p.crit_pct || 0).toFixed(0)}%  ·  🤸 Уворот ${parseFloat(p.dodge_pct || 0).toFixed(1)}%`,
      10, '#c8a0ff').setOrigin(0.5);
    this._passLine2 = txt(this, W / 2, passY + 42,
      `🛡 Броня ${parseFloat(p.armor_pct || 0).toFixed(1)}%  ·  ⚔️ Урон ~${p.dmg || 0}`,
      10, '#ffc870').setOrigin(0.5);

    this._refreshBuffDisplay();
  }

  /* Загружает активные бафы и обновляет все отображения в сцене.
     Вызывается при create() и после apply/replace из оверлея Моё. */
  async _refreshBuffDisplay() {
    try {
      const d = await get('/api/shop/inventory');
      if (!this.scene || !this.scene.isActive()) return;

      const buffs = d?.ok ? (d.active_buffs || []) : [];

      // Если есть активные баффы — обновляем игрока с сервера,
      // чтобы crit_pct / dodge_pct / armor_pct уже включали бафф
      if (buffs.length) {
        const pd = await post('/api/player');
        if (pd?.ok && pd.player) State.player = pd.player;
      }
      if (!this.scene || !this.scene.isActive()) return;

      const p = State.player;

      // Сброс к базовым значениям (на случай повторного вызова после снятия бафа)
      const ROW_RESET = { strength: 'strength', endurance: 'agility', crit: 'intuition' };
      for (const rk of Object.values(ROW_RESET)) {
        const row = this._statRows[rk]; if (!row) continue;
        const base = this._statBase(p, rk);
        const perm = this._statBonus(p, rk);
        row.valTxt.setText(String(row.s.valFn(p))).setColor(`#${row.s.color.toString(16).padStart(6,'0')}`);
        row.breakdownTxt.setText(`база ${base} | бонусы +${perm}`);
      }
      // Сброс combat cells (setColor, не setStyle — иначе сбрасывается весь шрифт)
      if (this._combatCells) {
        for (const [, cell] of Object.entries(this._combatCells)) {
          cell.t.setText(cell.fn(p)).setColor(cell.origColor);
        }
        const rowStamina = this._statRows.stamina;
        const rowAgility = this._statRows.agility;
        if (rowStamina) rowStamina.effectTxt.setText(rowStamina.s.effectFn(p));
        if (rowAgility) rowAgility.effectTxt.setText(rowAgility.s.effectFn(p));
      }

      // Сброс пассивных строк к базовым значениям
      if (this._passLine1) {
        this._passLine1.setText(
          `💥 Крит ${parseFloat(p.crit_pct || 0).toFixed(0)}%  ·  🤸 Уворот ${parseFloat(p.dodge_pct || 0).toFixed(1)}%`
        ).setColor('#c8a0ff');
      }
      if (this._passLine2) {
        this._passLine2.setText(
          `🛡 Броня ${parseFloat(p.armor_pct || 0).toFixed(1)}%  ·  ⚔️ Урон ~${p.dmg || 0}`
        ).setColor('#ffc870');
      }

      if (!buffs.length) { return; }

      // Суммируем бонусы по типу
      const B = {};
      for (const b of buffs) B[b.buff_type] = (B[b.buff_type] || 0) + b.value;

      // ── Стат-строки: strength / endurance→agility / stamina→stamina / crit→intuition ──
      const STAT_MAP = { strength: 'strength', endurance: 'agility', crit: 'intuition', stamina: 'stamina' };
      for (const [bt, rk] of Object.entries(STAT_MAP)) {
        const bonus = B[bt]; if (!bonus) continue;
        const row = this._statRows[rk]; if (!row) continue;
        const base = this._statBase(p, rk);
        const perm = this._statBonus(p, rk);
        row.valTxt.setText(String(row.s.valFn(p) + bonus)).setColor('#88ffbb');
        row.breakdownTxt.setText(`база ${base} | +${perm} вложено | 🧪 +${bonus} свиток`);
      }
      // ── endurance buff → уворот пересчитан сервером ──
      if (B.endurance) {
        const dodgeV = parseFloat(p.dodge_pct || 0).toFixed(1);
        if (this._statRows.agility) this._statRows.agility.effectTxt.setText(`${dodgeV}% уворот🧪`);
        if (this._combatCells?.dodge) this._combatCells.dodge.t.setText(`${dodgeV}%`).setColor('#88ffcc');
      }
      // ── stamina buff → +HP и +броня (симулирует реальные вложения) ──
      if (B.stamina) {
        const armorV = parseFloat(p.armor_pct || 0).toFixed(1);
        const newHp  = p.max_hp_effective ?? p.max_hp;
        if (this._statRows.stamina) this._statRows.stamina.effectTxt.setText(`${armorV}% броня🧪`);
        if (this._combatCells?.armor) this._combatCells.armor.t.setText(`${armorV}%`).setColor('#88ffcc');
        if (this._combatCells?.hp)    this._combatCells.hp.t.setText(String(newHp)).setColor('#aaffaa');
      }
      // ── armor_pct → дополнительная броня поверх базовой ──
      if (B.armor_pct) {
        const v = (parseFloat(p.armor_pct || 0) + B.armor_pct).toFixed(1);
        if (this._statRows.stamina) this._statRows.stamina.effectTxt.setText(`${v}% броня🧪`);
        if (this._combatCells?.armor) this._combatCells.armor.t.setText(`${v}%`).setColor('#88ffcc');
      }
      // ── dodge_pct → Ловкость effectFn + Уворот в боевых ──
      if (B.dodge_pct) {
        const v = (parseFloat(p.dodge_pct || 0) + B.dodge_pct).toFixed(1);
        if (this._statRows.agility) this._statRows.agility.effectTxt.setText(`${v}% уворот🧪`);
        if (this._combatCells?.dodge) this._combatCells.dodge.t.setText(`${v}%`).setColor('#88ffcc');
      }
      // ── crit buff → Крит пересчитан сервером (p.crit_pct уже включает бафф) ──
      if (B.crit && this._combatCells?.crit) {
        this._combatCells.crit.t.setText(`${parseFloat(p.crit_pct || 0).toFixed(0)}%`).setColor('#cc88ff');
      }
      // ── strength buff → Урон пересчитан сервером (p.dmg уже включает бафф) ──
      if (B.strength && this._combatCells?.dmg) {
        this._combatCells.dmg.t.setText(String(p.dmg)).setColor('#ff9966');
      }
      // ── hp_bonus → HP ячейка (max_hp_effective уже включает hp_bonus) ──
      if (B.hp_bonus && this._combatCells?.hp) {
        this._combatCells.hp.t.setText(String(p.max_hp_effective ?? p.max_hp)).setColor('#ff8888');
      }

      // ── Пассивные способности: обновляем с учётом бафов ──
      if (this._passLine1) {
        const critV  = parseFloat(p.crit_pct  || 0).toFixed(0);
        const dodgeV = B.dodge_pct
          ? (parseFloat(p.dodge_pct || 0) + B.dodge_pct).toFixed(1)
          : parseFloat(p.dodge_pct || 0).toFixed(1);
        this._passLine1.setText(`💥 Крит ${critV}%  ·  🤸 Уворот ${dodgeV}%`).setColor('#ccaaff');
      }
      if (this._passLine2) {
        const armorV = B.armor_pct
          ? (parseFloat(p.armor_pct || 0) + B.armor_pct).toFixed(1)
          : parseFloat(p.armor_pct || 0).toFixed(1);
        this._passLine2.setText(`🛡 Броня ${armorV}%  ·  ⚔️ Урон ~${p.dmg || 0}`).setColor('#ffcc88');
      }

      // ── Форматируем строку активных бафов ──
      // Статовые бафы (заряды берём из первого charge-based бафа)
      const statParts = [
        B.strength   && `⚔️+${B.strength}`,
        B.endurance  && `🌀+${B.endurance}`,
        B.stamina    && `🛡+${B.stamina}`,
        B.crit       && `🎯+${B.crit}`,
        B.armor_pct  && `🔰+${B.armor_pct}%`,
        B.dodge_pct  && `💨+${B.dodge_pct}%`,
        B.hp_bonus   && `❤️+${B.hp_bonus}`,
        B.double_pct && `⚡+${B.double_pct}%`,
        B.accuracy   && `👁+${B.accuracy}`,
        B.lifesteal_pct && `🩸+${B.lifesteal_pct}%`,
      ].filter(Boolean).join(' ');
    } catch {}
  }

  _buildAvatarBtn(W, H) {
    const y = H * 0.935, h = 34, gap = 8;
    const totalW = Math.min(W - 32, 300);
    const btnW = Math.floor((totalW - gap) / 2);
    const x0 = (W - totalW) / 2;
    const x1 = x0 + btnW + gap;

    const g1 = this.add.graphics();
    g1.fillStyle(0x2a2840, 0.95); g1.fillRoundedRect(x0, y, btnW, h, 9);
    g1.lineStyle(1.5, C.purple, 0.75); g1.strokeRoundedRect(x0, y, btnW, h, 9);
    txt(this, x0 + btnW / 2, y + h / 2, '🧥 Гардероб', 12, '#f0f0fa', true).setOrigin(0.5);
    const z1 = this.add.zone(x0 + btnW / 2, y + h / 2, btnW, h).setInteractive({ useHandCursor: true });
    z1.on('pointerdown', () => this._openAvatarPanel());

    const g2 = this.add.graphics();
    g2.fillStyle(0x1e2a1e, 0.95); g2.fillRoundedRect(x1, y, btnW, h, 9);
    g2.lineStyle(1.5, 0x55cc66, 0.75); g2.strokeRoundedRect(x1, y, btnW, h, 9);
    txt(this, x1 + btnW / 2, y + h / 2, '👜 Моё', 12, '#d0ffd8', true).setOrigin(0.5);
    const z2 = this.add.zone(x1 + btnW / 2, y + h / 2, btnW, h).setInteractive({ useHandCursor: true });
    z2.on('pointerdown', () => this._openInventoryPanel());
  }
  // Методы гардероба (_openAvatarPanel/_renderAvatarOverlay/_avatarAction/_closeAvatarOverlay)
  // вынесены в отдельный файл webapp/scene_wardrobe_overlay.js

  /* ── Кнопка назад ────────────────────────────────────── */
  _buildBackBtn(W, H) {
    makeBackBtn(this, 'Назад', () => {
      this.scene.start('Menu', { returnTab: 'profile' });
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

    // Обновляем данные (и сбрасываем клиентский кэш меню)
    const prev = State.player;
    State.player = res.player;
    State.playerLoadedAt = Date.now();
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
    const { s, valTxt, breakdownTxt, barFill, effectTxt, barX, barY, barW } = row;

    // Значение
    valTxt.setText(String(s.valFn(p)));
    const baseVal = this._statBase(p, s.key);
    const bonusVal = this._statBonus(p, s.key);
    breakdownTxt.setText(`база ${baseVal} | бонусы +${bonusVal}`);
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
      row.btnTxt.setText('—').setStyle({ color: '#8888aa' });
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
