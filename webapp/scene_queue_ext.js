/* ============================================================
   QueueScene ext — _startSearchTimer, update, _setupWS,
                    _onMatchFound, _onCancel, _onBotFight
   ============================================================ */

Object.assign(QueueScene.prototype, {

  /* ── Таймер ожидания ──────────────────────────────────── */
  _startSearchTimer() {
    this._startTs = Date.now();
    this._searchTimer = this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        if (!this._searching) return;
        const sec = Math.floor((Date.now() - this._startTs) / 1000);
        const m   = Math.floor(sec / 60);
        const s   = sec % 60;
        this._timerTxt?.setText(`${m}:${String(s).padStart(2, '0')}`);
      },
    });
  },

  /* ── update: анимация радара ──────────────────────────── */
  update() {
    if (!this._searching) return;
    const { _cx: cx, _cy: cy } = this;
    const maxR = 90;

    // Вращающийся луч
    this._scanAngle += 0.038;
    const sg = this._scanG;
    sg.clear();
    // Шлейф
    for (let i = 0; i < 22; i++) {
      const a     = this._scanAngle - i * 0.09;
      const alpha = (1 - i / 22) * 0.32;
      sg.lineStyle(2, C.blue, alpha);
      sg.beginPath();
      sg.moveTo(cx, cy);
      sg.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      sg.strokePath();
    }
    // Яркий кончик луча
    sg.lineStyle(2.5, C.blue, 0.92);
    sg.beginPath();
    sg.moveTo(cx, cy);
    sg.lineTo(
      cx + Math.cos(this._scanAngle) * maxR,
      cy + Math.sin(this._scanAngle) * maxR
    );
    sg.strokePath();
    // Точка на кончике
    sg.fillStyle(C.blue, 0.9);
    sg.fillCircle(
      cx + Math.cos(this._scanAngle) * maxR,
      cy + Math.sin(this._scanAngle) * maxR,
      3
    );

    // Пульсирующее кольцо
    this._pulseR += 1.1;
    if (this._pulseR > maxR + 25) this._pulseR = 0;
    const palpha = Math.max(0, 0.55 - (this._pulseR / (maxR + 25)) * 0.55);
    this._pulseG.clear();
    this._pulseG.lineStyle(2, C.blue, palpha);
    this._pulseG.strokeCircle(cx, cy, this._pulseR);
  },

  /* ── WebSocket ────────────────────────────────────────── */
  _setupWS() {
    const handler = msg => {
      if (msg.event === 'battle_started') this._onMatchFound(msg.battle);
    };

    if (State.ws && State.ws.readyState === WebSocket.OPEN) {
      State.ws.onmessage = e => handler(JSON.parse(e.data));
    } else if (State.player) {
      connectWS(State.player.user_id, handler);
    }
  },

  /* ── Матч найден ──────────────────────────────────────── */
  _onMatchFound(battle) {
    if (!this._searching) return;
    this._searching = false;

    tg?.HapticFeedback?.notificationOccurred('success');

    // Вспышка + переход
    this._statusTxt?.setText('✅ Соперник найден!').setStyle({ color: '#3cc864' });
    this.cameras.main.flash(350, 80, 144, 255);

    State.battle = battle;
    this.time.delayedCall(420, () => this.scene.start('Battle', {}));
  },

  /* ── Отмена ────────────────────────────────────────────── */
  async _onCancel() {
    if (!this._searching) return;
    this._searching = false;
    try { await post('/api/battle/cancel_queue'); } catch (_) {}
    tg?.HapticFeedback?.impactOccurred('light');
    this.scene.start('Menu', {});
  },

  /* ── Бой с ботом ──────────────────────────────────────── */
  async _onBotFight() {
    if (!this._searching) return;
    this._searching = false;

    this._statusTxt?.setText('Запускаем бой с ботом...');

    try { await post('/api/battle/cancel_queue'); } catch (_) {}

    try {
      const res = await post('/api/battle/find', { prefer_bot: true });
      if (!this.scene?.isActive('Queue')) return;
      if (res.ok && res.battle) {
        State.battle = res.battle;
        tg?.HapticFeedback?.impactOccurred('medium');
        this.scene.start('Battle', {});
      } else {
        this._searching = true;
        this._statusTxt?.setText('Ошибка. Попробуй ещё раз.');
      }
    } catch (_) {
      this._searching = true;
      this._statusTxt?.setText('Нет соединения');
    }
  },

});
