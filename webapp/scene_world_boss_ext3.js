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
    bg.fillStyle(0x0d0020, 0.98);
    bg.fillRoundedRect(12, popY, W - 24, popH, 8);
    bg.lineStyle(2, 0xff0088, 0.9);
    bg.strokeRoundedRect(12, popY, W - 24, popH, 8);
    pop.push(bg);

    const title = this._addText(W / 2, popY + 18, `★ СЛОТ ${slot} — ВЫБЕРИ СВИТОК ★`, 12, '#cc44ff', true);
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
      ibg.fillStyle(0x150025, 0.97);
      ibg.fillRoundedRect(20, iy, W - 40, itemH, 6);
      ibg.lineStyle(1, 0x440088, 0.8);
      ibg.strokeRoundedRect(20, iy, W - 40, itemH, 6);
      pop.push(ibg);

      const nt = this._addText(32, iy + 12, `${meta.icon} ${meta.label}`, 12, '#ff44cc', true);
      nt.setDepth(52); pop.push(nt);
      const dt = this._addText(32, iy + 30, meta.desc, 10, '#bb88ee');
      dt.setDepth(52); pop.push(dt);
      const qt = this._addText(W - 28, iy + 14, `×${qty}`, 11, '#ffee00', true);
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
    const _prepBg = this.add.graphics(); _prepBg._wbChild = true;
    _prepBg.fillStyle(0x050015, 0.98); _prepBg.fillRoundedRect(8, y, W - 16, 68, 6);
    _prepBg.lineStyle(2, 0xff0088, 0.8); _prepBg.strokeRoundedRect(8, y, W - 16, 68, 6);
    this._addText(W / 2, y + 12, '★ ПОДГОТОВКА К РЕЙДУ ★', 13, '#ffee00', true).setOrigin(0.5);
    this._prepCountT = this._addText(W / 2, y + 34, `Старт через ${s.prep_seconds_left || 0} сек`, 15, '#ff0088', true).setOrigin(0.5);
    this._regCountT = this._addText(W / 2, y + 56, `👥 ${s.registrants_count || 0} в рейде`, 10, '#cc44ff').setOrigin(0.5);
    y += 80;

    this._addText(W / 2, y, '📌 Свитки применяй в слоты после первого удара по боссу', 9, '#aaaacc').setOrigin(0.5);
    y += 20;

    const inv = s.raid_scrolls_inv || {};
    const ownedRaid = Object.entries(inv).filter(([, qty]) => qty > 0);
    if (ownedRaid.length) {
      this._addText(16, y, '★ СВИТКИ РЕЙДА — ГОТОВ ★', 11, '#cc44ff', true);
      y += 18;
      const bw = Math.floor((W - 32 - 8) / 2);
      ownedRaid.forEach(([id, qty], i) => {
        const meta = RAID_SCROLL_META[id] || { icon: '📜', label: id };
        const xi = 16 + (i % 2) * (bw + 8), yi = y + Math.floor(i / 2) * 50;
        const pbg = this.add.graphics(); pbg._wbChild = true;
        pbg.fillStyle(0x150025, 0.97);
        pbg.fillRoundedRect(xi, yi, bw, 42, 6);
        pbg.lineStyle(2, 0xff0088, 0.8);
        pbg.strokeRoundedRect(xi, yi, bw, 42, 6);
        this._addText(xi + bw / 2, yi + 13, `${meta.icon} ${meta.label}`, 10, '#ff44cc', true).setOrigin(0.5);
        this._addText(xi + bw / 2, yi + 29, `×${qty} шт.`, 10, '#ffee00').setOrigin(0.5);
      });
      y += Math.ceil(ownedRaid.length / 2) * 50 + 8;
    }

    const resInv = s.res_scrolls_inv || {};
    const ownedRes = [['res_30', '🕯️', '30% HP'], ['res_60', '🔮', '60% HP'], ['res_100', '✨', '100% HP']]
      .filter(([id]) => (resInv[id] || 0) > 0);
    if (ownedRes.length) {
      this._addText(16, y, '★ 1-UP — ВОСКРЕШЕНИЕ ★', 11, '#ff4488', true);
      y += 18;
      const bw2 = Math.floor((W - 32 - 16) / 3);
      ownedRes.forEach(([id, icon, label], i) => {
        const xi = 16 + i * (bw2 + 8), qty = resInv[id] || 0;
        const rbg = this.add.graphics(); rbg._wbChild = true;
        rbg.fillStyle(0x1a0010, 0.97);
        rbg.fillRoundedRect(xi, y, bw2, 42, 6);
        rbg.lineStyle(2, 0x880022, 0.8);
        rbg.strokeRoundedRect(xi, y, bw2, 42, 6);
        this._addText(xi + bw2 / 2, y + 13, `${icon} ${label}`, 10, '#ff44cc', true).setOrigin(0.5);
        this._addText(xi + bw2 / 2, y + 29, `×${qty}`, 10, '#ff0088').setOrigin(0.5);
      });
      y += 52;
    }

    if (!ownedRaid.length && !ownedRes.length) {
      this._addPanel(16, y, W - 32, 58);
      this._addText(W / 2, y + 18, '🛒 Нет свитков', 12, '#cc88ff', true).setOrigin(0.5);
      this._addText(W / 2, y + 38, 'Купить можно между рейдами в разделах ниже', 10, '#9977bb').setOrigin(0.5);
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
    bg.fillStyle(0x080018, 0.97);
    bg.fillRoundedRect(16, y, W - 32, 38, 6);
    bg.lineStyle(1, 0x2a0055, 0.8);
    bg.strokeRoundedRect(16, y, W - 32, 38, 6);
    this._addText(20, y + 9, '★ МОИ ЗАПАСЫ:', 10, '#cc44ff', true);
    this._addText(20, y + 25, parts.join('  '), 10, '#ff44cc');
    return 48;
  },

  // ─── Кнопка регистрации на рейд (за 5 мин до старта) ───────────────────

  _renderRegistrationBtn(s, W, y) {
    const until = s.seconds_until_raid;
    if (until == null || until > 300) return 0;

    const isReg = !!s.is_registered;
    const count = s.registrants_count || 0;

    const btnH = 56, totalH = btnH + 32;
    const btnCol = isReg ? 0x2a0050 : 0x0d0030;
    const btnBorder = isReg ? 0xff0088 : 0x440088;
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
    let _r = null, _err = null;
    try {
      _r = await post('/api/world_boss/register', { init_data: tg?.initData || '' });
      if (_r.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (this._state) {
          this._state.is_registered = _r.is_registered;
          this._state.registrants_count = _r.registrants_count;
        }
        this._toast(_r.is_registered ? '✅ Записался в рейд!' : '↩️ Запись отменена');
        this._render();
      } else {
        this._toast('❌ ' + (_r.reason || 'Ошибка'));
        this._render();
      }
    } catch (e) {
      _err = e;
      this._toast('❌ Нет соединения');
      this._render();
    }
    // ДИАГНОСТИКА: видимое окошко с ответом сервера на 6 секунд.
    try { window.WBHtml?._showDebugBox?.(_r, _err); } catch(_) {}
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
