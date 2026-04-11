/* ============================================================
   MenuScene — ext3: _setupWS, _checkIncomingChallenge,
     _showIncomingChallenge, _onChallengeByNick
   Продолжение: scene_menu_ext3b.js
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

});
