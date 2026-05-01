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

  /* ── update: пульсирующее оранжевое свечение вокруг радара ── */
  update() {
    if (!this._searching || !this._glowG) return;
    const { _cx: cx, _cy: cy, W } = this;
    const baseR = Math.min(W, 200) / 2;

    this._glowPhase = (this._glowPhase || 0) + 0.04;
    const pulse = 0.5 + 0.5 * Math.sin(this._glowPhase);   // 0..1
    const pulse2 = 0.5 + 0.5 * Math.sin(this._glowPhase * 1.7 + 1); // сдвинутый

    const g = this._glowG;
    g.clear();

    // Многослойное оранжевое свечение (6 колец, разный размер и альфа)
    const layers = [
      { dr: 8,  w: 22, a: 0.04 * pulse },
      { dr: 4,  w: 14, a: 0.07 * pulse },
      { dr: 2,  w: 8,  a: 0.12 * pulse2 },
      { dr: 1,  w: 4,  a: 0.22 * pulse },
      { dr: 0,  w: 2.5, a: 0.45 * pulse2 },
      { dr: -2, w: 1.5, a: 0.6  * pulse },
    ];
    layers.forEach(({ dr, w, a }) => {
      if (a < 0.01) return;
      g.lineStyle(w, 0xff8c00, a);
      g.strokeCircle(cx, cy, baseR + dr);
    });

    // Внутренний cyan-пульс (тонкий)
    const innerA = 0.15 * pulse2;
    g.lineStyle(2, 0x00e5ff, innerA);
    g.strokeCircle(cx, cy, baseR * 0.55 + pulse * 6);
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
