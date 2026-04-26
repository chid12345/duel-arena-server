/* ============================================================
   WorldBossScene — вкладка рейда «⚔️ Мировой босс»
   Три состояния: Waiting / Fighting / Results.
   WS /ws/world_boss/{uid} → event=wb_tick/wb_idle раз в сек.
   Остальные методы (render/helpers/actions) — scene_world_boss_ext.js.
   ============================================================ */

class WorldBossScene extends Phaser.Scene {
  constructor() { super('WorldBoss'); }

  shutdown() {
    this._alive = false;
    try { this._ws?.close?.(); } catch(_) {}
    try { this._timer?.remove?.(); } catch(_) {}
    try { this._pollTimer?.remove?.(); } catch(_) {}
    try { this._clearBossBg?.(); } catch(_) {}
    try { window.WBHtml?.close(); } catch(_) {}
    this._ws = null; this._timer = null; this._pollTimer = null; this._enrageShown = false;
    this._refreshBusy = false;
    // Сбрасываем, иначе TabBar._enableScroll при повторном входе увидит
    // _tbScrollOn=true и не навесит pointerdown/wheel — жесты не проходят.
    this._tbScrollOn = false;
    if (this._splashEl) {
      this._splashEl.forEach(o => { try { o.destroy(); } catch(_) {} });
      this._splashEl = null;
    }
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._alive = true;
    // Zombie-overlay страховка: закрываем overlay'и предыдущих вкладок
    // (ClanHTML/StatsHTML/WardrobeHTML) — иначе они перекроют WorldBoss.
    try { window._closeAllTabOverlays?.(); } catch(_) {}
    _extraBg(this, W, H);
    // Neon Arcade overlay — фиксируется, чтобы не уезжал при скролле.
    const _arcBg = this.add.graphics();
    _arcBg.fillGradientStyle(0x0d0020, 0x0d0020, 0x050015, 0x050015, 1);
    _arcBg.fillRect(0, 0, W, H);
    _arcBg.fillStyle(0xff0088, 1); _arcBg.fillRect(0, 0, W, 3);
    try { _arcBg.setScrollFactor?.(0); } catch(_) {}
    _extraHeader(this, W, '👾', 'МИРОВОЙ БОСС', 'Общий рейд каждые 4 часа');
    // Back: во время боя (живой) — заблокировано; иначе — в меню
    makeBackBtn(this, 'Назад', () => {
      const ps = this._state?.player_state;
      const inFight = !!this._state?.active;
      if (inFight && ps && !ps.is_dead) {
        this._toast('⚔️ Нельзя покинуть бой — ты ещё жив!');
        tg?.HapticFeedback?.notificationOccurred('warning');
        return;
      }
      tg?.HapticFeedback?.impactOccurred('light');
      try { window.WBHtml?.close?.(); } catch(_) {}
      this.scene.start('Menu', { returnTab: 'more' });
    });

    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#ddddff').setOrigin(0.5);
    this._tabBarResult = TabBar.build(this, { activeKey: 'boss' });
    this._refresh();
    this._timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this._tickSecond() });
    // Авто-рефреш каждые 5с если WS мёртв — подхватывает смену Waiting→Fighting
    this._pollTimer = this.time.addEvent({ delay: 5000, loop: true, callback: () => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) this._refresh();
    }});
  }

  async _refresh() {
    if (this._refreshBusy) return;
    this._refreshBusy = true;
    try {
      const d = await get('/api/world_boss/state');
      if (!this._alive) return;
      if (d && d.ok === false) {
        // Сервер ответил 200 но с ошибкой внутри — показываем и повторяем
        if (this._loading) { try { this._loading.setText('⚠️ Ошибка сервера\n(повтор через 5с)'); } catch(_) {} }
        setTimeout(() => { if (this._alive) this._refresh(); }, 5000);
        return;
      }
      this._state = d;
      try { this._render(); } catch(e) { console.warn('WB render error:', e); }
      this._openWS();
    } catch(_) {
      if (this._alive && this._loading) {
        try { this._loading.setText('❌ Нет соединения\n(повтор через 5с)'); } catch(_) {}
      }
      setTimeout(() => { if (this._alive) this._refresh(); }, 5000);
    } finally {
      this._refreshBusy = false;
    }
  }

  _openWS() {
    if (this._ws) return;
    const uid = State.player?.user_id;
    if (!uid) return;
    try {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      // init_data обязателен — бэк закрывает сокет с code 1008 без подписи.
      const q = State.initData ? `?init_data=${encodeURIComponent(State.initData)}` : '';
      this._ws = new WebSocket(`${proto}://${location.host}/ws/world_boss/${uid}${q}`);
      this._ws.onmessage = (m) => {
        try {
          const p = JSON.parse(m.data);
          if (p.event === 'wb_tick') this._onWsTick(p);
          else if (p.event === 'wb_preparing') this._onWsPreparing(p);
          else if (p.event === 'wb_idle') this._onWsIdle(p);
        } catch(_) {}
      };
      this._ws.onerror = () => { try { this._ws?.close?.(); } catch(_) {} this._ws = null; };
      this._ws.onclose = () => { this._ws = null; };
    } catch(_) { this._ws = null; }
  }

  _onWsPreparing(p) {
    if (this._state?.active) return;
    if (!this._state) this._state = {};
    const wasPrep = (this._state.prep_seconds_left || 0) > 0;
    this._state.prep_seconds_left = p.prep_seconds_left;
    if (p.registrants_count != null) this._state.registrants_count = p.registrants_count;
    if (this._prepCountT) this._prepCountT.setText(`Старт через ${p.prep_seconds_left} сек`);
    if (this._regCountT) this._regCountT.setText(`👥 ${p.registrants_count || 0} в рейде`);
    try { window.WBHtml?.updateHUD(this._state); } catch(_) {}
    if (!wasPrep) this._render();
  }

  _onWsIdle(p) {
    if (this._state?.active) { this._refresh(); return; }
    if (p.registrants_count != null && this._state) {
      this._state.registrants_count = p.registrants_count;
      if (this._regCountT) this._regCountT.setText(`👥 ${p.registrants_count} в рейде`);
    }
    // Live-обновление счётчиков в HTML лобби (без перерисовки всего экрана).
    try { window.WBHtml?.updateLobbyCounters?.({ registrants_count: p.registrants_count }); } catch(_) {}
  }

  _onWsTick(p) {
    if (!this._state?.active) { this._refresh(); return; }
    // Live-обновление счётчиков в HTML-лобби (если игрок наблюдает а не бьёт).
    try { window.WBHtml?.updateLobbyCounters?.({
      registrants_count: p.registrants_count,
      fighters_count: p.fighters_count,
    }); } catch(_) {}
    try { this._applyWsEffects?.(p); } catch(_) {}
    const _wasDeadBefore = !!this._state.player_state?.is_dead;
    const _hadPsBefore = !!this._state.player_state;
    this._state.active.current_hp = p.boss.hp;
    this._state.active.max_hp = p.boss.max_hp;
    this._state.active.crown_flags = p.boss.crown_flags;
    this._state.active.seconds_left = p.boss.seconds_left;
    this._state.active.vulnerable = p.boss.vulnerable;
    this._state.active.stage = p.boss.stage || 1;
    if (p.boss.boss_bg_hex) this._state.active.boss_bg_hex = p.boss.boss_bg_hex;
    if (p.player) this._state.player_state = p.player;
    if (p.top) this._state.top = p.top;
    const _isDeadNow = !!this._state.player_state?.is_dead;
    const _hasPsNow = !!this._state.player_state;
    // Смена живой↔мёртвый ИЛИ первое появление ps (вход в бой) —
    // перерисовываем полностью: меняется кнопка и раскрывается HUD/слоты.
    if (_isDeadNow !== _wasDeadBefore || _hasPsNow !== _hadPsBefore) {
      try { this._render(); } catch(_) {}
    } else {
      try { window.WBHtml?.updateHUD(this._state); } catch(_) {}
    }
    try {
      const mx = Math.max(1, p.boss.max_hp || 1);
      this._updateBossBg?.(Math.max(0, p.boss.hp) / mx);
    } catch(_) {}
  }

  _render() {
    if (this._loading) { try { this._loading.destroy(); } catch(_){} this._loading = null; }
    this.children.getAll().filter(o => o._wbChild).forEach(o => { try { o.destroy(); } catch(_){} });
    try { window.WBHtml?.render(this, this._state); } catch(e) { console.warn('WBHtml render error:', e); }
  }

  _renderFighting(s, W, H) {
    const a = s.active, ps = s.player_state;
    try {
      const mx = Math.max(1, a.max_hp || 1);
      this._updateBossBg?.(Math.max(0, a.current_hp) / mx);
    } catch(_) {}
    let y = 88;

    // Портрет босса — медальон с эмодзи перед панелью с HP
    const _portH = this._renderBossPortrait?.(
      W, y,
      a.boss_emoji || '🐉',
      (a.boss_bg_hex || 0x4a3a5a)
    ) || 0;
    y += _portH;

    this._addPanel(8, y, W-16, 62);
    const _em = a.boss_emoji || '🐉';
    const _tpl = a.boss_type_label ? ` · ${a.boss_type_label}` : '';
    this._bossNameT = this._addText(16, y+8, `${_em} ${a.boss_name || 'Titan'}${_tpl}`, 13, '#ffc83c', true);
    this._vulnIndT  = this._addText(W-16, y+10, a.vulnerable ? '⚡ УЯЗВИМ x3' : '🛡 защита', 10,
      a.vulnerable ? '#3cff8c' : '#ddddff', true).setOrigin(1, 0);
    this._bossHpBar = this._addBarPair(16, y+28, W-32, 14, a.current_hp, a.max_hp, 0xdc3c46);
    this._secLeftT  = this._addText(W/2, y+50, `⏱ ${this._fmtSec(a.seconds_left)}`, 10, '#aaddff').setOrigin(0.5);
    y += 72;

    this._crownRow = this._addCrownRow(16, y, W-32, a.crown_flags || 0); y += 24;

    if (!ps) {
      this._hitBtn = this._bigBtn(16, y, W-32, 64, 0xbb0066, '⚔️ Войти в бой!', () => this._onHit());
      y += 74;
    } else if (!ps.is_dead) {
      this._hitBtn = this._bigBtn(16, y, W-32, 64, 0xcc0055, '⚔️  УДАРИТЬ', () => this._onHit());
      y += 74;
    } else {
      this._addPanel(16, y, W-32, 48);
      this._addText(W/2, y+24, '💀 Вы мертвы', 13, '#ff6672', true).setOrigin(0.5);
      y += 58;
      this._renderResurrectRow(s, W, y); y += 54;
      // Кнопка "Покинуть бой" — только когда мёртв
      this._bigBtn(16, y, W-32, 36, 0x1a0030, '🚪 Покинуть бой',
        () => { tg?.HapticFeedback?.impactOccurred('light'); this.scene.start('WorldBoss'); });
      y += 46;
    }

    if (ps) {
      this._plHpT  = this._addText(16,   y+4, `❤️ ${ps.current_hp}/${ps.max_hp}`, 11, '#f0f0fa');
      this._plDmgT = this._addText(W-16, y+4, `🗡 урон: ${ps.total_damage}`, 11, '#ffc83c').setOrigin(1, 0);
      y += 22;
      this._renderScrollSlots(s, W, y, ps); y += 62;
    }

    if (s.top && s.top.length) this._renderTop(s.top, W, y);
  }
}
