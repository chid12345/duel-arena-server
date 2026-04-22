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
      if (this._passLine3) this._passLine3.setText('');
      if (this._passLine4) this._passLine4.setText('');

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
        row.valTxt.setText(String(row.s.valFn(p))).setColor('#88ffbb');
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

      // ── passLine3: Двойной удар + Точность (только если есть бафы) ──
      if (this._passLine3) {
        const parts3 = [];
        if (B.double_pct) parts3.push(`⚡ Двойной +${B.double_pct}%`);
        if (B.accuracy)   parts3.push(`👁 Точность +${B.accuracy}`);
        if (parts3.length) this._passLine3.setText(parts3.join('  ·  ')).setColor('#88ddff');
      }

      // ── passLine4: time-based бафы (Охота за золотом / опытом) ──
      if (this._passLine4) {
        const timeBased = buffs.filter(b => b.expires_at != null);
        const parts4 = timeBased.map(b => {
          const msLeft = Math.max(0, new Date(b.expires_at + 'Z') - Date.now());
          const hLeft = Math.floor(msLeft / 3600000);
          const mLeft = Math.floor((msLeft % 3600000) / 60000);
          const t = hLeft > 0 ? `${hLeft}ч` : `${mLeft}м`;
          if (b.buff_type === 'gold_pct') return `💰 Золото+${b.value}% · ${t}`;
          if (b.buff_type === 'xp_pct')  return `📚 Опыт+${b.value}% · ${t}`;
          return `${b.buff_type}+${b.value}% · ${t}`;
        });
        if (parts4.length) this._passLine4.setText(parts4.join('  ·  ')).setColor('#ffcc55');
      }
    } catch {}
  },

  _buildAvatarBtn(W, H) {
    const y = H * 0.935, h = 38;
    const totalW = Math.min(W - 32, 320);
    const x0 = (W - totalW) / 2;

    // Рюкзак — полная ширина
    const g2 = this.add.graphics();
    g2.fillStyle(0x081410, 0.97);
    g2.fillRoundedRect(x0, y, totalW, h, 10);
    g2.lineStyle(1.5, C.green, 0.45);
    g2.strokeRoundedRect(x0, y, totalW, h, 10);
    txt(this, x0 + totalW / 2, y + h / 2, '🎒 Рюкзак', 13, '#60cc80', true).setOrigin(0.5);
    const z2 = this.add.zone(x0 + totalW / 2, y + h / 2, totalW, h).setInteractive({ useHandCursor: true });
    z2.on('pointerdown', () => {
      g2.clear();
      g2.fillStyle(C.green, 0.15); g2.fillRoundedRect(x0, y, totalW, h, 10);
      g2.lineStyle(1.5, C.green, 0.9); g2.strokeRoundedRect(x0, y, totalW, h, 10);
      tg?.HapticFeedback?.selectionChanged();
    });
    z2.on('pointerout', () => {
      g2.clear();
      g2.fillStyle(0x081410, 0.97); g2.fillRoundedRect(x0, y, totalW, h, 10);
      g2.lineStyle(1.5, C.green, 0.45); g2.strokeRoundedRect(x0, y, totalW, h, 10);
    });
    z2.on('pointerup', () => {
      g2.clear();
      g2.fillStyle(0x081410, 0.97); g2.fillRoundedRect(x0, y, totalW, h, 10);
      g2.lineStyle(1.5, C.green, 0.45); g2.strokeRoundedRect(x0, y, totalW, h, 10);
      this._openInventoryPanel();
    });
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
