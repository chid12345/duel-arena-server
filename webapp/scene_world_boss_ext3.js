/* ============================================================
   WorldBossScene — ext3: пикер свитков + экран подготовки + сводка запасов
   ============================================================ */

// Глобальная карта: id → метаданные для рейд-свитков
const RAID_SCROLL_META = {
  damage_25:  { icon: '⚔️', label: '+25% урон',   desc: 'Урон ×1.25 весь рейд' },
  power_10:   { icon: '💪', label: '+10% урон',   desc: 'Урон ×1.10 весь рейд' },
  defense_20: { icon: '🛡', label: '+20% защита', desc: 'Защита ×1.20 весь рейд' },
  dodge_10:   { icon: '💨', label: '+10% уворот', desc: 'Уворот +10% весь рейд' },
  crit_10:    { icon: '🎯', label: '+10% крит',   desc: 'Крит +10% весь рейд' },
};

Object.assign(WorldBossScene.prototype, {

  // ─── Пикер свитков (попап выбора при нажатии на пустой слот) ────────────

  _showScrollPickerPopup(slot, available) {
    this._closeScrollPicker();
    const W = this.W;
    const popY = 110, itemH = 54, popH = 50 + available.length * (itemH + 6) + 12;
    const pop = [];

    const bg = this.add.graphics().setDepth(50); bg._wbChild = true;
    bg.fillStyle(0x07071a, 0.97);
    bg.fillRoundedRect(12, popY, W - 24, popH, 10);
    bg.lineStyle(2, 0x5096ff, 0.9);
    bg.strokeRoundedRect(12, popY, W - 24, popH, 10);
    pop.push(bg);

    const title = this._addText(W / 2, popY + 18, `📜 Слот ${slot} — выбери свиток`, 12, '#aaddff', true);
    title.setOrigin(0.5).setDepth(51); pop.push(title);

    const cg = this.add.graphics().setDepth(51); cg._wbChild = true;
    cg.fillStyle(0x5a1a10, 1);
    cg.fillRoundedRect(W - 44, popY + 7, 28, 22, 6);
    cg.lineStyle(1, 0xcc4422, 0.9);
    cg.strokeRoundedRect(W - 44, popY + 7, 28, 22, 6);
    pop.push(cg);
    const cx = this._addText(W - 30, popY + 18, '✕', 11, '#ffaa88', true);
    cx.setOrigin(0.5).setDepth(52); pop.push(cx);
    const cz = this.add.zone(W - 30, popY + 18, 28, 22).setInteractive({ useHandCursor: true }).setDepth(53);
    cz._wbChild = true; cz.on('pointerup', () => this._closeScrollPicker()); pop.push(cz);

    available.forEach(([id, qty], i) => {
      const meta = RAID_SCROLL_META[id] || { icon: '📜', label: id, desc: '' };
      const iy = popY + 38 + i * (itemH + 6);

      const ibg = this.add.graphics().setDepth(51); ibg._wbChild = true;
      ibg.fillStyle(0x12122e, 0.95);
      ibg.fillRoundedRect(20, iy, W - 40, itemH, 7);
      ibg.lineStyle(1, 0x3a4a8a, 0.8);
      ibg.strokeRoundedRect(20, iy, W - 40, itemH, 7);
      pop.push(ibg);

      const nt = this._addText(32, iy + 12, `${meta.icon} ${meta.label}`, 12, '#ffffff', true);
      nt.setDepth(52); pop.push(nt);
      const dt = this._addText(32, iy + 30, meta.desc, 10, '#8888cc');
      dt.setDepth(52); pop.push(dt);
      const qt = this._addText(W - 28, iy + 14, `×${qty}`, 11, '#ffc83c', true);
      qt.setOrigin(1, 0).setDepth(52); pop.push(qt);

      const iz = this.add.zone(20, iy, W - 40, itemH).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(53);
      iz._wbChild = true;
      iz.on('pointerup', () => { this._closeScrollPicker(); this._useScroll(id, slot); });
      pop.push(iz);
    });

    this._scrollPickerPop = pop;
  },

  _closeScrollPicker() {
    if (!this._scrollPickerPop) return;
    this._scrollPickerPop.forEach(o => { try { o.destroy(); } catch (_) {} });
    this._scrollPickerPop = null;
  },

  // ─── Экран подготовки (за 30с до старта рейда) ──────────────────────────

  _renderPrepPhase(s, W, H) {
    let y = 92;
    this._addPanel(8, y, W - 16, 68);
    this._addText(W / 2, y + 12, '⚔️ ПОДГОТОВКА К РЕЙДУ', 13, '#ffc83c', true).setOrigin(0.5);
    this._prepCountT = this._addText(W / 2, y + 34, `Старт через ${s.prep_seconds_left || 0} сек`, 15, '#ff8888', true).setOrigin(0.5);
    this._regCountT = this._addText(W / 2, y + 56, `👥 ${s.registrants_count || 0} игроков записалось`, 10, '#88cc88').setOrigin(0.5);
    y += 80;

    this._addText(W / 2, y, '📌 Свитки применяй в слоты после первого удара по боссу', 9, '#aaaacc').setOrigin(0.5);
    y += 20;

    const inv = s.raid_scrolls_inv || {};
    const ownedRaid = Object.entries(inv).filter(([, qty]) => qty > 0);
    if (ownedRaid.length) {
      this._addText(16, y, '📜 Свитки рейда (готовы к бою)', 11, '#aaddff', true);
      y += 18;
      const bw = Math.floor((W - 32 - 8) / 2);
      ownedRaid.forEach(([id, qty], i) => {
        const meta = RAID_SCROLL_META[id] || { icon: '📜', label: id };
        const xi = 16 + (i % 2) * (bw + 8), yi = y + Math.floor(i / 2) * 50;
        const pbg = this.add.graphics(); pbg._wbChild = true;
        pbg.fillStyle(0x0e2e0e, 0.95);
        pbg.fillRoundedRect(xi, yi, bw, 42, 8);
        pbg.lineStyle(1, 0x3caa5c, 0.8);
        pbg.strokeRoundedRect(xi, yi, bw, 42, 8);
        this._addText(xi + bw / 2, yi + 13, `${meta.icon} ${meta.label}`, 10, '#ccffcc', true).setOrigin(0.5);
        this._addText(xi + bw / 2, yi + 29, `×${qty} шт.`, 10, '#88cc88').setOrigin(0.5);
      });
      y += Math.ceil(ownedRaid.length / 2) * 50 + 8;
    }

    const resInv = s.res_scrolls_inv || {};
    const ownedRes = [['res_30', '🕯️', '30% HP'], ['res_60', '🔮', '60% HP'], ['res_100', '✨', '100% HP']]
      .filter(([id]) => (resInv[id] || 0) > 0);
    if (ownedRes.length) {
      this._addText(16, y, '🕯️ Свитки воскрешения (применятся при смерти)', 11, '#ffaaaa', true);
      y += 18;
      const bw2 = Math.floor((W - 32 - 16) / 3);
      ownedRes.forEach(([id, icon, label], i) => {
        const xi = 16 + i * (bw2 + 8), qty = resInv[id] || 0;
        const rbg = this.add.graphics(); rbg._wbChild = true;
        rbg.fillStyle(0x2e0e0e, 0.95);
        rbg.fillRoundedRect(xi, y, bw2, 42, 8);
        rbg.lineStyle(1, 0xcc4444, 0.8);
        rbg.strokeRoundedRect(xi, y, bw2, 42, 8);
        this._addText(xi + bw2 / 2, y + 13, `${icon} ${label}`, 10, '#ffffff', true).setOrigin(0.5);
        this._addText(xi + bw2 / 2, y + 29, `×${qty}`, 10, '#ff8888').setOrigin(0.5);
      });
      y += 52;
    }

    if (!ownedRaid.length && !ownedRes.length) {
      this._addPanel(16, y, W - 32, 58);
      this._addText(W / 2, y + 18, '🛒 Нет свитков', 12, '#8888aa', true).setOrigin(0.5);
      this._addText(W / 2, y + 38, 'Купить можно между рейдами в разделах ниже', 10, '#555577').setOrigin(0.5);
    }
  },

  // ─── Сводка запасов на экране ожидания ──────────────────────────────────

  _renderMyScrollsSummary(s, W, y) {
    const inv = s.raid_scrolls_inv || {};
    const resInv = s.res_scrolls_inv || {};
    const ownedRaid = Object.entries(inv).filter(([, qty]) => qty > 0);
    const ownedRes = Object.entries(resInv).filter(([, qty]) => qty > 0);
    if (!ownedRaid.length && !ownedRes.length) return 0;

    const RES_META = { res_30: '🕯️×', res_60: '🔮×', res_100: '✨×' };
    const parts = [
      ...ownedRaid.map(([id, qty]) => `${RAID_SCROLL_META[id]?.icon || '📜'}×${qty}`),
      ...ownedRes.map(([id, qty]) => `${RES_META[id] || '?×'}${qty}`),
    ];

    const bg = this.add.graphics(); bg._wbChild = true;
    bg.fillStyle(0x0a1a0a, 0.92);
    bg.fillRoundedRect(16, y, W - 32, 38, 7);
    bg.lineStyle(1, 0x2a4a2a, 0.8);
    bg.strokeRoundedRect(16, y, W - 32, 38, 7);
    this._addText(20, y + 9, '📦 Мои запасы:', 10, '#88cc88', true);
    this._addText(20, y + 25, parts.join('  '), 10, '#ccffcc');
    return 48;
  },

  // ─── Кнопка регистрации на рейд (за 5 мин до старта) ───────────────────

  _renderRegistrationBtn(s, W, y) {
    const until = s.seconds_until_raid;
    if (until == null || until > 300) return 0;

    const isReg = !!s.is_registered;
    const count = s.registrants_count || 0;

    const btnH = 56, totalH = btnH + 32;
    const btnCol = isReg ? 0x1a4a1a : 0x1a2a5a;
    const btnBorder = isReg ? 0x3caa5c : 0x5096ff;
    const btnLabel = isReg ? '✅ Ты в рейде! (нажми чтобы отменить)' : '⚔️ Участвую в рейде!';
    const btnTxt   = isReg ? '#88ff88' : '#aaddff';

    const bg = this.add.graphics(); bg._wbChild = true;
    bg.fillStyle(btnCol, 0.15);
    bg.fillRoundedRect(16, y, W - 32, totalH, 8);
    bg.lineStyle(1.5, btnBorder, 0.7);
    bg.strokeRoundedRect(16, y, W - 32, totalH, 8);

    this._bigBtn(16, y, W - 32, btnH, btnCol, btnLabel, () => this._registerForRaid());
    const btnT = this._addText(W - 32, y + btnH + 8, `👥 ${count} игроков записалось`, 10, '#aaaacc');
    btnT.setOrigin(1, 0);
    this._regCountT = btnT;
    return totalH + 8;
  },

  async _registerForRaid() {
    if (this._regBusy) return;
    this._regBusy = true;
    try {
      const r = await post('/api/world_boss/register', { init_data: tg?.initData || '' });
      if (r.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (this._state) {
          this._state.is_registered = r.is_registered;
          this._state.registrants_count = r.registrants_count;
        }
        this._toast(r.is_registered ? '✅ Записался в рейд!' : '↩️ Запись отменена');
        this._render();
      } else {
        this._toast('❌ ' + (r.reason || 'Ошибка'));
      }
    } catch (_) { this._toast('❌ Нет соединения'); }
    this._regBusy = false;
  },

  // ─── Тик обратного отсчёта подготовки ───────────────────────────────────

  _tickPrep() {
    if (!(this._state?.prep_seconds_left > 0)) return;
    this._state.prep_seconds_left = Math.max(0, this._state.prep_seconds_left - 1);
    if (this._prepCountT) this._prepCountT.setText(`Старт через ${this._state.prep_seconds_left} сек`);
    if (this._state.prep_seconds_left === 0) this._refresh();
  },

});
