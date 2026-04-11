/* ============================================================
   MenuScene — ext3: _setupWS, _checkIncomingChallenge,
     _showIncomingChallenge, _onChallengeByNick,
     _startRegenTick, _quickHeal, _showError, shutdown
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _setupWS() {
    const p = State.player;
    if (!p) return;
    Notif.setScene(this);
    connectWS(p.user_id, msg => {
      if (msg.event === 'battle_started') {
        State.battle = msg.battle;
        this.scene.start('Battle');
        return;
      }
      if (msg.event === 'challenge_incoming') {
        this._showIncomingChallenge(msg.challenge);
        return;
      }
      if (msg.event === 'challenge_declined') {
        this._toast('🚫 Вызов отклонён');
        return;
      }
      if (msg.event === 'level_up') {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.questDone();
        Notif.push('🎊', `Новый уровень ${msg.level}! +${msg.free_stats || 1} стат`, '#b45aff', 3500);
      }
      if (msg.event === 'quest_complete') {
        Notif.push('📅', 'Квест дня выполнен — забери награду!', '#3cc864', 3000);
        this._questBadge = true;
        const btn = this._tabBtns?.more;
        if (btn) btn.activeBar?.setVisible(false);
      }
      if (msg.event === 'clan_event') {
        Notif.push('⚔️', msg.text || 'Событие в клане', '#5096ff', 3000);
      }
      if (msg.event === 'diamonds_credited') {
        tg?.HapticFeedback?.notificationOccurred('success');
        Notif.push('💎', `+${msg.diamonds} алмазов зачислено!`, '#3cc8dc', 3500);
        State.playerLoadedAt = 0;
        post('/api/player').then(d => { if (d.ok && d.player) { State.player = d.player; State.playerLoadedAt = Date.now(); } }).catch(() => {});
      }
      if (msg.event === 'premium_activated') {
        tg?.HapticFeedback?.notificationOccurred('success');
        const bonusTxt = msg.bonus_diamonds > 0 ? ` +${msg.bonus_diamonds} 💎` : '';
        Notif.push('👑', `Premium активирован!${bonusTxt}`, '#b45aff', 5000);
        State.playerLoadedAt = 0;
        post('/api/player').then(d => { if (d.ok && d.player) { State.player = d.player; State.playerLoadedAt = Date.now(); } }).catch(() => {});
      }
      if (msg.event === 'usdt_slot_reset') {
        tg?.HapticFeedback?.notificationOccurred('success');
        State.playerLoadedAt = 0;
        post('/api/player').then(d => { if (d.ok && d.player) { State.player = d.player; State.playerLoadedAt = Date.now(); } }).catch(() => {});
        if (this._avatarOverlay) {
          this._openAvatarPanel();
        } else {
          this._showToast?.('🔄 Сброс выполнен — зайди в Гардероб');
        }
      }
      if (msg.event === 'usdt_slot_created') {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (this._avatarOverlay) {
          this._openAvatarPanel();
        } else {
          this._showToast?.('💠 USDT-образ получен — открой Гардероб');
        }
      }
    });
  },

  async _checkIncomingChallenge() {
    try {
      const r = await get('/api/battle/challenge/pending');
      if (r.ok && r.pending && r.challenge) this._showIncomingChallenge(r.challenge);
    } catch (_) {}
  },

  _showIncomingChallenge(ch) {
    if (!ch || !ch.id) return;
    const uname = ch.from_username || 'Боец';
    const text = `Вызов от @${uname} (ур.${ch.from_level || 1}, рейтинг ${ch.from_rating || 1000}). Принять?`;
    const respond = async (accept) => {
      try {
        const res = await post('/api/battle/challenge/respond', { challenge_id: ch.id, accept: !!accept });
        if (!res.ok) { this._toast('❌ Вызов устарел или недоступен'); return; }
        if (!accept) { this._toast('🚫 Вызов отклонён'); return; }
        if (res.battle) {
          State.battle = res.battle;
          this.scene.start('Battle');
          return;
        }
      } catch (_) {
        this._toast('❌ Нет соединения');
      }
    };
    if (tg?.showPopup) {
      tg.showPopup({
        title: '⚔️ PvP-вызов',
        message: text,
        buttons: [
          { id: 'decline', type: 'destructive', text: 'Отклонить' },
          { id: 'accept', type: 'default', text: 'Принять' },
        ],
      }, btnId => { respond(btnId === 'accept'); });
    } else {
      const ok = window.confirm(text);
      respond(ok);
    }
  },

  async _onChallengeByNick() {
    const nickRaw = window.prompt('Введите ник соперника (без @):', '');
    if (nickRaw == null) return;
    const nickname = (nickRaw || '').trim().replace(/^@+/, '');
    if (!nickname) {
      this._toast('❌ Ник не указан');
      return;
    }
    this._toast('📨 Отправляем вызов...');
    try {
      const res = await post('/api/battle/challenge/send', { nickname });
      if (!res.ok) {
        if (res.reason === 'multiple_candidates' && Array.isArray(res.candidates) && res.candidates.length) {
          const list = res.candidates.slice(0, 5).map(c => `@${c.username} (ур.${c.level}, ⭐${c.rating})`).join('\n');
          tg?.showAlert?.(`Найдено несколько игроков:\n${list}\n\nВведи точный ник.`);
          return;
        }
        const m = {
          target_not_found: '❌ Игрок не найден',
          cannot_challenge_self: '❌ Нельзя вызвать самого себя',
          target_offline: '📴 Игрок офлайн',
          target_busy: '⏳ Игрок уже в бою',
          target_low_hp: '❤️ У соперника мало HP',
          target_has_pending: '⏳ У игрока уже есть входящий вызов',
          low_hp: '❤️ Нужно восстановить HP',
          already_in_battle: '⚔️ Вы уже в бою',
        };
        this._toast(m[res.reason] || '❌ Не удалось отправить вызов');
        return;
      }
      this._toast('✅ Вызов отправлен');
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
  },

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
          g.fillStyle(C.dark, 1); g.fillRoundedRect(x, y, w, h, 4);
          const fw = Math.max(8, Math.round(w * sp.hp_pct / 100));
          g.fillStyle(col, 1);   g.fillRoundedRect(x, y, fw, h, 4);
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
    const cntTxt = txt(this, W / 2, by + bh + 16, `Авто-повтор через ${countdown}с`, 10, '#9999bb').setOrigin(0.5);
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
  },

});
