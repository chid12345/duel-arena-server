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
    this._addPanel(8, y, W-16, 70);
    this._addText(W/2, y+16, '⏳ Следующий рейд', 12, '#aaddff').setOrigin(0.5);
    this._countdownTxt = this._addText(W/2, y+40, this._fmtCountdown(this._nextSchedAt), 22, '#ffc83c', true).setOrigin(0.5);
    y += 82;
    this._renderScrollShop(s, W, y); y += 185;
    this._renderResShop(s, W, y);
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
    this._addText(16, y, '📜 Свитки рейда', 11, '#aaddff', true); y += 18;
    const bw = Math.floor((W - 32 - 8) / 2);
    SCROLLS.forEach((sc, i) => {
      const isLast = i === SCROLLS.length - 1 && SCROLLS.length % 2 === 1;
      const xItem = isLast ? 16 + Math.floor((W - 32 - bw) / 2) : 16 + (i % 2) * (bw + 8);
      const yItem = y + Math.floor(i / 2) * 50;
      const qty = inv[sc.id] || 0;
      const bg = this.add.graphics(); bg._wbChild = true;
      bg.fillStyle(0x2a1a4a, 0.95); bg.fillRoundedRect(xItem, yItem, bw, 42, 8);
      bg.lineStyle(1, qty > 0 ? 0x7a4aaa : 0x333355, 0.8);
      bg.strokeRoundedRect(xItem, yItem, bw, 42, 8);
      this._addText(xItem + bw/2, yItem + 13, `${sc.icon} ${sc.short}`, 10, '#ffffff', true).setOrigin(0.5);
      this._addText(xItem + bw/2, yItem + 29, `${sc.price}💎  ×${qty}`, 10, qty > 0 ? '#ffc83c' : '#8888aa').setOrigin(0.5);
      const z = this.add.zone(xItem, yItem, bw, 42).setOrigin(0).setInteractive({ useHandCursor: true });
      z._wbChild = true;
      z.on('pointerup', () => this._buyScroll(sc.id));
    });
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

  async _buyScroll(iid) {
    if (this._buying) return;
    this._buying = true;
    try {
      const r = await post('/api/shop/buy', { item_id: iid });
      if (r.ok) { tg?.HapticFeedback?.notificationOccurred('success'); this._toast('📦 Свиток → инвентарь'); this._refresh(); }
      else this._toast('❌ ' + (r.reason || r.detail || 'Ошибка'));
    } catch(_) { this._toast('❌ Ошибка сети'); }
    this._buying = false;
  },

  _tickSecond() {
    if (this._nextSchedAt && this._countdownTxt) {
      this._countdownTxt.setText(this._fmtCountdown(this._nextSchedAt));
    }
    if (this._state?.active?.seconds_left != null) {
      this._state.active.seconds_left = Math.max(0, this._state.active.seconds_left - 1);
      if (this._secLeftT) this._secLeftT.setText(`⏱ ${this._fmtSec(this._state.active.seconds_left)}`);
    }
    this._tickPrep?.();
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
