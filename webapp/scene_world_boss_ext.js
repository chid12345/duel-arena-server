/* ============================================================
   WorldBossScene — ext: рендер (Waiting/Idle/Top/Unclaimed),
   хелперы (панели/бары/короны/свитки), действия (hit/reminder/claim).
   ============================================================ */

Object.assign(WorldBossScene.prototype, {

  _renderWaiting(s, W, H) {
    let y = 92;
    const next = s.next_scheduled;
    // Timer hero panel — bigger, arcade style
    const _timerPanelH = 96;
    const _tpBg = this.add.graphics(); _tpBg._wbChild = true;
    _tpBg.fillStyle(0x050015, 0.98); _tpBg.fillRoundedRect(8, y, W-16, _timerPanelH, 6);
    _tpBg.lineStyle(2, 0xff0088, 0.7); _tpBg.strokeRoundedRect(8, y, W-16, _timerPanelH, 6);
    // corner diamonds
    [[16, y+8], [W-16, y+8], [16, y+_timerPanelH-8], [W-16, y+_timerPanelH-8]].forEach(([cx, cy]) => {
      const _d = this.add.graphics(); _d._wbChild = true;
      _d.fillStyle(0x330055, 1); _d.fillTriangle(cx, cy-5, cx-5, cy, cx, cy+5).fillTriangle(cx, cy-5, cx+5, cy, cx, cy+5);
    });
    const _em = next.boss_emoji || '⏳';
    const _hint = next.boss_type_label ? `★ СЛЕДУЮЩИЙ: ${next.boss_type_label} ★` : '★ СЛЕДУЮЩИЙ РЕЙД ★';
    this._addText(W/2, y+14, _hint, 10, '#cc44ff', true).setOrigin(0.5);
    this._countdownTxt = this._addText(W/2, y+54, this._fmtCountdown(next.scheduled_at), 32, '#ffee00', true).setOrigin(0.5);
    this._addText(W/2, y+80, '▶ INSERT COIN TO PLAY ◀', 9, '#8855cc').setOrigin(0.5);
    this._nextSchedAt = next.scheduled_at;
    y += _timerPanelH + 12;

    const optIn = !!s.reminder_opt_in;
    const _remBg = this.add.graphics(); _remBg._wbChild = true;
    _remBg.fillStyle(optIn ? 0x2a0050 : 0x0d0028, 0.97);
    _remBg.fillRoundedRect(16, y, W-32, 44, 6);
    _remBg.lineStyle(1.5, optIn ? 0xff0088 : 0x6633aa, 0.9);
    _remBg.strokeRoundedRect(16, y, W-32, 44, 6);
    const _remT = this._addText(W/2, y+22, optIn ? '🔔 Напомню за 5 мин (вкл)' : '🔕 Напомни за 5 мин',
      13, optIn ? '#ffffff' : '#cc99ff', true).setOrigin(0.5);
    const _remZ = this.add.zone(16, y, W-32, 44).setOrigin(0).setInteractive({ useHandCursor: true });
    _remZ._wbChild = true;
    _remZ.on('pointerdown', () => tg?.HapticFeedback?.impactOccurred('medium'));
    _remZ.on('pointerup', () => this._toggleReminder());
    y += 56;

    const rh = this._renderRegistrationBtn?.(s, W, y) || 0; y += rh;
    const msh = this._renderMyScrollsSummary?.(s, W, y) || 0; y += msh;
    this._renderScrollShop(s, W, y); y += 185;
    this._renderResShop(s, W, y); y += 74;
    this._renderRecentRaids?.(s, W, y);
  },

  _renderIdle(s, W, H) {
    let y = 92;
    const S = [0,4,8,12,16,20], n = new Date(), h = n.getUTCHours() + n.getUTCMinutes()/60;
    const d = new Date(n), nH = S.find(v => v > h);
    if (nH != null) { d.setUTCHours(nH,0,0,0); } else { d.setUTCDate(d.getUTCDate()+1); d.setUTCHours(0,0,0,0); }
    this._nextSchedAt = d.toISOString();
    const _tpBg2 = this.add.graphics(); _tpBg2._wbChild = true;
    _tpBg2.fillStyle(0x050015, 0.98); _tpBg2.fillRoundedRect(8, y, W-16, 80, 6);
    _tpBg2.lineStyle(2, 0xff0088, 0.7); _tpBg2.strokeRoundedRect(8, y, W-16, 80, 6);
    this._addText(W/2, y+14, '★ СЛЕДУЮЩИЙ РЕЙД ★', 10, '#cc44ff', true).setOrigin(0.5);
    this._countdownTxt = this._addText(W/2, y+50, this._fmtCountdown(this._nextSchedAt), 32, '#ffee00', true).setOrigin(0.5);
    this._addText(W/2, y+72, '▶ INSERT COIN TO PLAY ◀', 8, '#8855cc').setOrigin(0.5);
    y += 92;
    this._renderScrollShop(s, W, y); y += 185;
    this._renderResShop(s, W, y);
  },

  _renderTop(top, W, y) {
    this._addText(16, y, '★ ТОП-3 ПО УРОНУ:', 11, '#cc44ff', true);
    top.slice(0, 3).forEach((t, i) => {
      const name = t.name || `Игрок ${i+1}`;
      const dmg = (t.damage || t.total_damage || 0).toLocaleString('ru');
      this._addText(16, y+18+i*16, `${i+1}. ${name} — ${dmg}`, 10, '#ff44cc');
    });
  },

  _renderResurrectRow(s, W, y) {
    const scrolls = s.res_scrolls_inv || {};
    const items = [['res_30', '30%'], ['res_60', '60%'], ['res_100', '100%']];
    const hasAny = items.some(([id]) => (scrolls[id] || 0) > 0);
    if (!hasAny) {
      this._addPanel(16, y, W - 32, 38);
      this._addText(W / 2, y + 11, '🕯️ Свитков воскрешения нет', 11, '#cc88ff').setOrigin(0.5);
      this._addText(W / 2, y + 26, 'Купить можно до рейда в магазине', 9, '#9977bb').setOrigin(0.5);
      return;
    }
    const bw = (W - 32 - 16) / 3;
    items.forEach(([id, label], i) => {
      const x = 16 + i * (bw + 8);
      const n = scrolls[id] || 0;
      const col = n > 0 ? 0x880022 : 0x0d0030;
      this._bigBtn(x, y, bw, 44, col, `${label} (${n})`, n > 0 ? () => this._resurrect(id) : null);
    });
  },

  _renderScrollSlots(s, W, y, ps) {
    const sw = (W - 32 - 8) / 2;
    [['raid_scroll_1', 1], ['raid_scroll_2', 2]].forEach(([k, slot], i) => {
      const x = 16 + i * (sw + 8);
      const v = ps[k];
      const meta = v ? (typeof RAID_SCROLL_META !== 'undefined' ? RAID_SCROLL_META[v] : null) : null;
      const label = meta ? `${meta.icon} ${meta.label}` : (v ? `📜 ${v}` : `+ слот ${slot}`);
      const col = v ? 0x1a3a1a : 0x2a2a3a;
      this._bigBtn(x, y, sw, 42, col, label, () => v ? null : this._openScrollPicker(slot));
    });
  },

  _openScrollPicker(slot) {
    const inv = this._state?.raid_scrolls_inv || {};
    const available = Object.entries(inv).filter(([, qty]) => qty > 0);
    if (!available.length) { this._toast('Нет свитков рейда в инвентаре'); return; }
    if (available.length === 1) { this._useScroll(available[0][0], slot); return; }
    this._showScrollPickerPopup?.(slot, available);
  },

  _renderScrollShop(s, W, y) {
    const SCROLLS = [
      { id: 'damage_25',  icon: '⚔️', short: '+25% урон',   price: 60 },
      { id: 'power_10',   icon: '💪', short: '+10% урон',   price: 30 },
      { id: 'defense_20', icon: '🛡', short: '+20% защита', price: 45 },
      { id: 'dodge_10',   icon: '💨', short: '+10% уворот', price: 35 },
      { id: 'crit_10',    icon: '🎯', short: '+10% крит',   price: 40 },
    ];
    const inv = s?.raid_scrolls_inv || {};
    this._addText(16, y, '★ POWER-UPS — СВИТКИ РЕЙДА ★', 11, '#cc44ff', true); y += 18;
    const bw = Math.floor((W - 32 - 8) / 2);
    SCROLLS.forEach((sc, i) => {
      const isLast = i === SCROLLS.length - 1 && SCROLLS.length % 2 === 1;
      const xItem = isLast ? 16 + Math.floor((W - 32 - bw) / 2) : 16 + (i % 2) * (bw + 8);
      const yItem = y + Math.floor(i / 2) * 50;
      const qty = inv[sc.id] || 0;
      const bg = this.add.graphics(); bg._wbChild = true;
      bg.fillStyle(qty > 0 ? 0x150025 : 0x080018, 0.97); bg.fillRoundedRect(xItem, yItem, bw, 42, 6);
      bg.lineStyle(qty > 0 ? 2 : 1, qty > 0 ? 0xff0088 : 0x220044, qty > 0 ? 0.9 : 0.7);
      bg.strokeRoundedRect(xItem, yItem, bw, 42, 6);
      this._addText(xItem + bw/2, yItem + 13, `${sc.icon} ${sc.short}`, 10, qty > 0 ? '#ff44cc' : '#bb88ee', true).setOrigin(0.5);
      this._addText(xItem + bw/2, yItem + 29, `${sc.price}💎  ×${qty}`, 10, qty > 0 ? '#ffee00' : '#9977cc').setOrigin(0.5);
      const z = this.add.zone(xItem, yItem, bw, 42).setOrigin(0).setInteractive({ useHandCursor: true });
      z._wbChild = true;
      z.on('pointerup', () => this._buyScroll(sc.id));
    });
  },

  // ==== Actions ====
  async _onHit() {
    if (this._hitBusy) return;
    this._hitBusy = true;
    // Снимок «был ли player_state ДО запроса» — WS-тик может добавить ps
    // параллельно, и тогда проверка `!this._state?.player_state` после await
    // соврёт, рефреш не стартует и кнопка навсегда остаётся «Войти в бой!».
    const hadPsBefore = !!this._state?.player_state;
    try {
      const r = await post('/api/world_boss/hit');
      if (r.ok) {
        tg?.HapticFeedback?.impactOccurred(r.is_crit ? 'heavy' : 'light');
        if (this._state?.active) this._state.active.current_hp = r.boss_hp;
        try { window.WBHtml?.addHitLog(r.damage, r.is_crit); } catch(_) {}
        if (!hadPsBefore) {
          // Первый вход в рейд — нужен полный рефреш чтобы показать УДАРИТЬ + HP игрока
          setTimeout(() => { if (this._alive) this._refresh(); }, 400);
        } else {
          try { window.WBHtml?.updateHUD(this._state); } catch(_) {}
        }
      } else if (r.reason !== 'Слишком быстро') {
        this._toast('❌ ' + r.reason);
      }
    } catch(_) {}
    this._hitBusy = false;
  },

  async _toggleReminder() {
    const cur = !!this._state?.reminder_opt_in;
    try {
      const r = await post('/api/world_boss/reminder_toggle', { enabled: !cur });
      if (r.ok) { this._state.reminder_opt_in = r.enabled; this._render(); }
    } catch(_) {}
  },

  async _claimReward(reward_id) {
    try {
      const r = await post('/api/world_boss/claim_reward', { reward_id });
      if (r.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        // Закрываем overlay немедленно (убираем reward из стейта)
        if (this._state?.unclaimed_rewards) {
          this._state.unclaimed_rewards = this._state.unclaimed_rewards.filter(
            rw => rw.reward_id !== reward_id
          );
        }
        this._render();  // Перерисовываем без overlay

        // Строим сплэш-тост (3.5с, не убивается render)
        const lines = [
          { text: r.is_victory ? '🏆 Награда за победу!' : '💀 Утешительная награда', size: 13, bold: true, color: r.is_victory ? '#ffc83c' : '#ff8888' },
          { text: `💰 ${r.gold}   ⭐ ${r.exp}${r.diamonds ? '   💎 ' + r.diamonds : ''}`, size: 12, color: '#ffffff' },
        ];
        if (r.chest_type) {
          const isScroll = r.chest_type === 'scroll_all_12';
          const chIcon = isScroll ? '✨' : '💠';
          const chName = isScroll ? 'Свиток: +12 ко всем пассивкам' : 'Алмазный сундук';
          const chHint = isScroll ? 'Инвентарь → 🏆 Особые' : 'Инвентарь → 🏆 Особые → 🎲 Открыть';
          if (r.chest_added) {
            lines.push({ text: `${chIcon} ${chName}!`, size: 12, bold: true, color: '#3cff8c' });
            lines.push({ text: chHint, size: 10, color: '#aaddff' });
          } else {
            lines.push({ text: `❌ Награда не выдана`, size: 11, color: '#ff6666' });
            if (r.chest_error) lines.push({ text: r.chest_error.slice(0, 50), size: 9, color: '#ff4444' });
          }
        }
        this._toastSplash(lines);
        // Refresh через 3с — после прочтения сплэша
        setTimeout(() => { if (this._alive) this._refresh(); }, 3000);
      } else {
        this._toast('❌ ' + r.reason);
      }
    } catch(_) { this._toast('❌ Ошибка сети'); }
  },

  async _resurrect(scroll_id) {
    try {
      const r = await post('/api/world_boss/resurrect', { scroll_id });
      if (r.ok) { this._toast('✨ Воскрешение!'); this._refresh(); }
      else this._toast('❌ ' + r.reason);
    } catch(_) {}
  },

  async _useScroll(scroll_name, slot) {
    try {
      const r = await post('/api/world_boss/use_scroll', { scroll_name, slot });
      if (r.ok) { this._toast('📜 Свиток активен'); this._refresh(); }
      else this._toast('❌ ' + r.reason);
    } catch(_) {}
  },

  async _buyScroll(iid) {
    if (this._buying) return;
    this._buying = true;
    let ok = false;
    try {
      const r = await post('/api/shop/buy', { item_id: iid });
      if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); this._toast('📦 Свиток → инвентарь'); this._refresh(); ok = true; }
      else this._toast('❌ ' + (r.reason || r.detail || 'Ошибка'));
    } catch(_) { this._toast('❌ Ошибка сети'); }
    // После успешной покупки держим блокировку пока refresh не завершится (~1.5с)
    if (ok) { setTimeout(() => { this._buying = false; }, 1500); }
    else { this._buying = false; }
  },

  _tickSecond() {
    if (this._nextSchedAt && this._countdownTxt) {
      this._countdownTxt.setText(this._fmtCountdown(this._nextSchedAt));
      // Отсчёт до 0 и бой ещё не стартовал — рефреш (WS мог умереть)
      if (!this._state?.active && !this._refreshBusy) {
        const msLeft = new Date(this._nextSchedAt).getTime() - Date.now();
        if (msLeft < 2000) this._refresh();
      }
    }
    if (this._state?.active?.seconds_left != null) {
      this._state.active.seconds_left = Math.max(0, this._state.active.seconds_left - 1);
      if (this._secLeftT) this._secLeftT.setText(`⏱ ${this._fmtSec(this._state.active.seconds_left)}`);
      // Бой должен закончиться (HP=0 или время=0) — рефрешим пока сервер не подтвердит
      const _shouldEnd = this._state.active.seconds_left === 0
                      || (this._state.active.current_hp || 0) <= 0;
      if (_shouldEnd && !this._refreshBusy) this._refresh();
    }
    this._tickPrep?.();
  },

  async _wbTestSchedule() {
    if (this._testBusy) return;
    this._testBusy = true;
    try {
      const d = await get('/api/admin/wb_test_schedule', { in_minutes: 0 });
      if (d.ok) {
        this._toast('⚔️ Рейд стартовал! Босс: ' + (d.boss_name || ''));
        setTimeout(() => this._refresh(), 2000);
      } else { this._toast('❌ ' + (d.reason || 'Ошибка')); }
    } catch (e) { this._toast('❌ ' + (e?.message || 'Нет соединения')); }
    this._testBusy = false;
  },

  _updateFightingHUD() {
    const a = this._state?.active, ps = this._state?.player_state;
    if (!a) return;
    if (this._bossHpBar) this._bossHpBar.update(a.current_hp, a.max_hp);
    if (this._vulnIndT) {
      this._vulnIndT.setText(a.vulnerable ? '⚡ УЯЗВИМ x3' : '🛡 защита');
      this._vulnIndT.setStyle({ color: a.vulnerable ? '#3cff8c' : '#ddddff' });
    }
    if (this._secLeftT && a.seconds_left != null) this._secLeftT.setText(`⏱ ${this._fmtSec(a.seconds_left)}`);
    if (ps && this._plHpT) this._plHpT.setText(`❤️ ${ps.current_hp}/${ps.max_hp}`);
    if (ps && this._plDmgT) this._plDmgT.setText(`🗡 урон: ${ps.total_damage}`);
  },

});
