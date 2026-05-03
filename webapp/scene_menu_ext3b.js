/* ============================================================
   MenuScene — ext3b: _startRegenTick, _quickHeal,
                      _showError, shutdown
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _startRegenTick() {
    const p = State.player;
    if (!p || !p.regen_per_min) return;
    // Guard: prevent duplicate timers if called twice in same scene lifecycle.
    if (this._regenTimer) { this.time.removeEvent(this._regenTimer); this._regenTimer = null; }
    const regenPerTick = p.regen_per_min / 2;
    this._regenTimer = this.time.addEvent({
      delay: 30_000, loop: true,
      callback: () => {
        const sp = State.player;
        if (!sp || sp.current_hp >= sp.max_hp) return;
        sp.current_hp = Math.min(sp.max_hp, Math.round(sp.current_hp + regenPerTick));
        // hp_pct считаем от max_hp (база, до которой идёт реген), а не от effMax.
        // effMax включает бонус экипировки — он работает только в бою, не регенится.
        // Иначе при наличии +HP экипировки бар застывал ниже 100% (было sp.current_hp / effMax).
        sp.hp_pct = Math.round(sp.current_hp / Math.max(1, sp.max_hp) * 100);

        if (this._activeTab === 'profile' && this._liveHp) {
          const { g, t, x, y, w, h } = this._liveHp;
          g.clear();
          const rr2 = Math.ceil(h / 2) + 2;
          g.fillStyle(0x000000, 0.72); g.fillRoundedRect(x, y, w, h, rr2);
          const fw = Math.max(rr2 * 2, Math.round(w * sp.hp_pct / 100));
          g.fillStyle(0x4ade80, 0.22); g.fillRoundedRect(x, y - 1, fw, h + 2, rr2);
          g.fillGradientStyle(0x15803d, 0x86efac, 0x15803d, 0x86efac, 1);
          g.fillRoundedRect(x, y, fw, h, rr2);
          g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(x, y, fw, Math.ceil(h / 2), rr2);
          t.setText(`${sp.current_hp} / ${sp.max_hp} HP`);
        }
      },
    });
  },

  async _quickHeal(btnBg, btnTxt, zone, bx, by, bw, bh) {
    zone.disableInteractive();
    btnTxt.setText('Пьём зелье...');
    try {
      const res = await post('/api/shop/buy', { item_id: 'hp_small' });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (res.player) State.player = res.player;
        this._toast(`❤️ +${res.hp_restored} HP! Теперь ${res.player?.current_hp}/${res.player?.max_hp}`);
        this.time.delayedCall(700, () => this.scene.restart({ returnTab: this._activeTab || 'profile' }));
      } else {
        tg?.HapticFeedback?.notificationOccurred('error');
        btnTxt.setText(res.reason || 'Ошибка');
        this.time.delayedCall(1500, () => {
          btnTxt.setText('🧪 Выпить малое зелье  —  12 🪙');
          zone.setInteractive({ useHandCursor: true });
        });
      }
    } catch (_) {
      btnTxt.setText('❌ Нет соединения');
      zone.setInteractive({ useHandCursor: true });
    }
  },

  _showError(msg) {
    const { W, H } = this;
    if (this._loadingTxt) { try { this._loadingTxt.destroy(); } catch(_) {} this._loadingTxt = null; }
    txt(this, W / 2, H / 2 - 48, '⚠️', 32, '#ff4455').setOrigin(0.5);
    txt(this, W / 2, H / 2,      msg, 15, '#ff4455', true).setOrigin(0.5);

    const bw = 160, bh = 40, bx = W / 2 - bw / 2, by = H / 2 + 24;
    const bg = this.add.graphics();
    bg.fillStyle(0x2a2840, 1);
    bg.fillRoundedRect(bx, by, bw, bh, 10);
    bg.lineStyle(1.5, 0x5096ff, 0.7);
    bg.strokeRoundedRect(bx, by, bw, bh, 10);
    const btnTxt = txt(this, W / 2, by + bh / 2, '🔄 Повторить', 13, '#a0c0ff', true).setOrigin(0.5);
    const zone = this.add.zone(bx, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.restart();
    });

    let countdown = 5;
    const cntTxt = txt(this, W / 2, by + bh + 16, `Авто-повтор через ${countdown}с`, 10, '#ddddff').setOrigin(0.5);
    const timer = this.time.addEvent({
      delay: 1000, repeat: 4,
      callback: () => {
        countdown--;
        if (countdown <= 0) {
          this.scene.restart();
        } else {
          cntTxt.setText(`Авто-повтор через ${countdown}с`);
        }
      },
    });
  },

  shutdown() {
    // Порядок как в Stats/Rating/WorldBoss: сначала события/tween/таймеры,
    // затем panels и все остальные дети сцены. Без killAll + полной зачистки
    // детей между вкладками копятся tween-и (55 звёзд × repeat:-1 на каждый
    // create) и осиротевшие графики → UI зависает к 3–4-му переключению.
    try { this.time.removeAllEvents(); } catch(_) {}
    try { this.tweens.killAll(); } catch(_) {}
    // Fail-safe: убираем placeholder если не убрался через NextFrame (исключение и т.п.)
    try { window._tabPlaceholderHide?.('menu-placeholder'); } catch(_) {}
    // Глушим WS-обработчик: если сообщение придёт после shutdown (до того как
    // следующая сцена вызовет connectWS), мёртвые this-методы не упадут.
    try { if (State.ws) State.ws.onmessage = null; } catch(_) {}
    Object.values(this._panels || {}).forEach(c => { try { c?.destroy(true); } catch(_) {} });
    this._panels = {};
    this._tabBarObjs = null;
    this._tabBtns = {};
    this._dailyBonusOverlay = null;
    this._liveHp = null;
    this._verTxt = null;
    this._regenTimer = null;
    this._profileTasksBadgeObjs = null;
    this._tasksBadgeCount = 0;
    // Сброс throttle-флагов: Phaser переиспользует scene-инстанс между
    // scene.start. Без сброса повисший _profileBuffsBusy=true (например
    // после оборванной сети) после возврата в Меню молча скипал бы
    // _loadProfileBuffs — UI Профиля «застывал» бы на старых данных.
    this._profileBuffsBusy = false;
    this._profileBuffsAt = 0;
    this._rebuildProfileBusy = false;
    this._dailyClaimBusy = false;
    // _tbScrollOn сбрасываем: Phaser на shutdown очищает input-listeners,
    // флаг без сброса заблокировал бы повторное навешивание скролла.
    this._tbScrollOn = false;
    // Snapshot: destroy() выкидывает объект из children.list, живой итератор
    // пропустил бы половину, часть детей пережила бы shutdown.
    const kids = this.children?.getAll?.().slice() || [];
    kids.forEach(o => { try { o.destroy(); } catch(_) {} });
  },

});
