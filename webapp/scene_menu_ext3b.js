/* ============================================================
   MenuScene — ext3b: _startRegenTick, _quickHeal,
                      _showError, shutdown
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _startRegenTick() {
    const p = State.player;
    if (!p || !p.regen_per_min) return;
    const regenPerTick = p.regen_per_min / 2;
    this.time.addEvent({
      delay: 30_000, loop: true,
      callback: () => {
        const sp = State.player;
        if (!sp || sp.current_hp >= sp.max_hp) return;
        sp.current_hp = Math.min(sp.max_hp, Math.round(sp.current_hp + regenPerTick));
        const effMax = sp.max_hp_effective ?? sp.max_hp;
        sp.hp_pct     = Math.round(sp.current_hp / effMax * 100);

        if (this._activeTab === 'profile' && this._liveHp) {
          const { g, t, x, y, w, h } = this._liveHp;
          const col = sp.hp_pct > 50 ? C.green : sp.hp_pct > 25 ? C.gold : C.red;
          g.clear();
          g.fillStyle(0x16122a, 1); g.fillRoundedRect(x, y, w, h, 4);
          const fw = Math.max(8, Math.round(w * sp.hp_pct / 100));
          g.fillStyle(col, 1);      g.fillRoundedRect(x, y, fw, h, 4);
          t.setText(`${sp.current_hp} / ${effMax} HP`);
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
    this.time.removeAllEvents();
    // Явно уничтожаем все панели вместе с их make.* дочерними объектами
    Object.values(this._panels || {}).forEach(c => { try { c?.destroy(true); } catch(_){} });
    this._panels = {};
  },

});
