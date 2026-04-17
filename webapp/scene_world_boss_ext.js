/* ============================================================
   WorldBossScene — ext: рендер (Waiting/Idle/Top/Unclaimed),
   хелперы (панели/бары/короны/свитки), действия (hit/reminder/claim).
   ============================================================ */

Object.assign(WorldBossScene.prototype, {

  _renderWaiting(s, W, H) {
    let y = 92;
    const next = s.next_scheduled;
    this._addPanel(8, y, W-16, 70);
    const _em = next.boss_emoji || '⏳';
    const _hint = next.boss_type_label ? `${_em} Следующий: ${next.boss_type_label}` : '⏳ Следующий рейд';
    this._addText(W/2, y+16, _hint, 12, '#aaddff').setOrigin(0.5);
    this._countdownTxt = this._addText(W/2, y+40, this._fmtCountdown(next.scheduled_at), 22, '#ffc83c', true).setOrigin(0.5);
    this._nextSchedAt = next.scheduled_at;
    y += 80;

    const optIn = !!s.reminder_opt_in;
    this._bigBtn(16, y, W-32, 48, optIn ? 0x2a6a20 : 0x5096ff,
      optIn ? '🔔 Напомню за 5 мин (вкл)' : '🔕 Напомни за 5 мин',
      () => this._toggleReminder());
    y += 60;

    ['Рейд длится 10 минут.',
     'Бей босса → получи долю награды.',
     'Смерть в бою → свиток воскрешения.'].forEach((l, i) => {
      this._addText(W/2, y + i*16, l, 11, '#ddddff').setOrigin(0.5);
    });
    y += 56;
    this._renderRecentRaids?.(s, W, y);
  },

  _renderIdle(W, H) {
    this._addText(W/2, H/2 - 20, '🐉', 48, '#888899').setOrigin(0.5);
    this._addText(W/2, H/2 + 30, 'Нет активного рейда', 14, '#ddddff').setOrigin(0.5);
    this._addText(W/2, H/2 + 50, 'Следующий скоро будет', 11, '#aaaacc').setOrigin(0.5);
  },

  _renderTop(top, W, y) {
    this._addText(16, y, '🏆 Топ-3 по урону:', 11, '#aaddff', true);
    top.slice(0, 3).forEach((t, i) => {
      this._addText(16, y+18+i*16, `${i+1}. uid${t.user_id} — ${t.total_damage}`, 10, '#ddddff');
    });
  },

  _renderResurrectRow(s, W, y) {
    const scrolls = s.res_scrolls_inv || {};
    const items = [['res_30', '30%'], ['res_60', '60%'], ['res_100', '100%']];
    const bw = (W - 32 - 16) / 3;
    items.forEach(([id, label], i) => {
      const x = 16 + i * (bw + 8);
      const n = scrolls[id] || 0;
      const col = n > 0 ? 0x5096ff : 0x3a3a4a;
      this._bigBtn(x, y, bw, 44, col, `${label} (${n})`, () => this._resurrect(id));
    });
  },

  _renderScrollSlots(s, W, y, ps) {
    const sw = (W - 32 - 8) / 2;
    [['raid_scroll_1', 1], ['raid_scroll_2', 2]].forEach(([k, slot], i) => {
      const x = 16 + i * (sw + 8);
      const v = ps[k];
      const label = v ? `📜 ${v}` : `+ свиток в слот ${slot}`;
      const col = v ? 0x4a3a6a : 0x2a2a3a;
      this._bigBtn(x, y, sw, 42, col, label, () => v ? null : this._openScrollPicker(slot));
    });
  },

  _openScrollPicker(slot) {
    const inv = this._state?.raid_scrolls_inv || {};
    const ids = Object.keys(inv).filter(k => (inv[k] || 0) > 0);
    if (!ids.length) { this._toast('Нет свитков в инвентаре'); return; }
    const pickId = ids[0];
    this._useScroll(pickId, slot);
  },

  // ==== Actions ====
  async _onHit() {
    if (this._hitBusy) return;
    this._hitBusy = true;
    try {
      const r = await post('/api/world_boss/hit', { init_data: tg?.initData || '' });
      if (r.ok) {
        tg?.HapticFeedback?.impactOccurred(r.is_crit ? 'heavy' : 'light');
        this._toast(`-${r.damage}${r.is_crit ? ' 💥' : ''}${r.vulnerable ? ' x3' : ''}`);
        if (this._state?.active) { this._state.active.current_hp = r.boss_hp; this._updateFightingHUD(); }
      } else if (r.reason !== 'Слишком быстро') {
        this._toast('❌ ' + r.reason);
      }
    } catch(_) {}
    this._hitBusy = false;
  },

  async _toggleReminder() {
    const cur = !!this._state?.reminder_opt_in;
    try {
      const r = await post('/api/world_boss/reminder_toggle', { init_data: tg?.initData || '', enabled: !cur });
      if (r.ok) { this._state.reminder_opt_in = r.enabled; this._render(); }
    } catch(_) {}
  },

  async _claimReward(reward_id) {
    try {
      const r = await post('/api/world_boss/claim_reward', { init_data: tg?.initData || '', reward_id });
      if (r.ok) { this._toast(`✅ +💰${r.gold} +⭐${r.exp} +💎${r.diamonds}`); this._refresh(); }
      else this._toast('❌ ' + r.reason);
    } catch(_) {}
  },

  async _resurrect(scroll_id) {
    try {
      const r = await post('/api/world_boss/resurrect', { init_data: tg?.initData || '', scroll_id });
      if (r.ok) { this._toast('✨ Воскрешение!'); this._refresh(); }
      else this._toast('❌ ' + r.reason);
    } catch(_) {}
  },

  async _useScroll(scroll_name, slot) {
    try {
      const r = await post('/api/world_boss/use_scroll', { init_data: tg?.initData || '', scroll_name, slot });
      if (r.ok) { this._toast('📜 Свиток активен'); this._refresh(); }
      else this._toast('❌ ' + r.reason);
    } catch(_) {}
  },

  _tickSecond() {
    if (this._state?.next_scheduled && this._countdownTxt) {
      this._countdownTxt.setText(this._fmtCountdown(this._nextSchedAt));
    }
    if (this._state?.active?.seconds_left != null) {
      this._state.active.seconds_left = Math.max(0, this._state.active.seconds_left - 1);
      if (this._secLeftT) this._secLeftT.setText(`⏱ ${this._fmtSec(this._state.active.seconds_left)}`);
    }
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
