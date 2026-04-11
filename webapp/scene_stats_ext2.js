/* ============================================================
   StatsScene — расширение 2: _refreshBuffDisplay,
   _buildAvatarBtn, _buildBackBtn
   ============================================================ */

Object.assign(StatsScene.prototype, {

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
    } catch {}
  },

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
  },
  // Методы гардероба (_openAvatarPanel/_renderAvatarOverlay/_avatarAction/_closeAvatarOverlay)
  // вынесены в отдельный файл webapp/scene_wardrobe_overlay.js

  /* ── Кнопка назад ────────────────────────────────────── */
  _buildBackBtn(W, H) {
    makeBackBtn(this, 'Назад', () => {
      this.scene.start('Menu', { returnTab: 'profile' });
    });
  },

});
