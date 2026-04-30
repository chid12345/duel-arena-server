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
        try { this._closeWaitingChallenge?.(); } catch (_) {}
        State.battle = msg.battle;
        this.scene.start('Battle', {});
        return;
      }
      if (msg.event === 'challenge_incoming') {
        this._drawChallengesBadge(true);
        this._showIncomingChallenge(msg.challenge);
        return;
      }
      if (msg.event === 'challenge_declined') {
        try { this._closeWaitingChallenge?.(); } catch (_) {}
        this._toast('🚫 Вызов отклонён');
        this._refreshChallengesBadge();
        return;
      }
      if (msg.event === 'level_up') {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.questDone();
        Notif.push('🎊', `Новый уровень ${msg.level}! +${msg.free_stats || 1} стат`, '#b45aff', 3500);
      }
      if (msg.event === 'quest_complete') {
        Notif.push('📋', 'Задание выполнено — забери награду!', '#3cc864', 3000);
        // Обновить бейдж: перезапросить актуальный счётчик
        get('/api/tasks/status').catch(() => null).then(r => {
          if (!r?.ok) return;
          const cnt = r.claimable_count || 0;
          if (cnt !== this._tasksBadgeCount) {
            this._tasksBadgeCount = cnt;
            if (this._tabBarObjs) this._buildTabBar();
          }
        });
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
          this._showToast?.('💠 Легендарный образ получен — открой Гардероб');
        }
      }
      if (msg.event === 'weapon_equipped') {
        tg?.HapticFeedback?.notificationOccurred('success');
        Notif.push('⚔️', 'Мифическое оружие получено! Открой раздел «Оружие»', '#fb923c', 4500);
        post('/api/player').then(d => {
          if (!d?.ok) return;
          if (d.player) { State.player = d.player; State.playerLoadedAt = Date.now(); }
          if (d.equipment) State.equipment = d.equipment;
          if (Array.isArray(d.owned_weapons)) State.ownedWeapons = d.owned_weapons;
          if (typeof WeaponHTML !== 'undefined') WeaponHTML.refresh?.();
        }).catch(() => {});
      }
    });
  },

  async _checkIncomingChallenge() {
    try {
      const r = await get('/api/battle/challenge/pending');
      const has = !!(r && r.ok && r.pending);
      this._drawChallengesBadge(has);
      if (has && r.challenge) this._showIncomingChallenge(r.challenge);
    } catch (_) {}
  },

  _showIncomingChallenge(ch) {
    if (!ch || !ch.id) return;
    const uname = ch.from_username || 'Боец';
    const text = `Вызов от @${uname} (ур.${ch.from_level || 1}, рейтинг ${ch.from_rating || 1000}). Принять?`;
    const respond = async (accept) => {
      try {
        const res = await post('/api/battle/challenge/respond', { challenge_id: ch.id, accept: !!accept });
        this._drawChallengesBadge(false);
        if (!res.ok) { this._toast('❌ Вызов устарел или недоступен'); return; }
        if (!accept) { this._toast('🚫 Вызов отклонён'); return; }
        if (res.battle) {
          State.battle = res.battle;
          this.scene.start('Battle', {});
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

  _onChallengeByNick() {
    this._promptNickname((raw) => {
      if (raw == null) return;
      const nickname = (raw || '').trim().replace(/^@+/, '');
      if (!nickname) { this._toast('❌ Ник не указан'); return; }
      this._sendChallengeByNick(nickname);
    });
  },

  async _sendChallengeByNick(nickname) {
    this._toast('📨 Отправляем вызов...');
    try {
      const res = await post('/api/battle/challenge/send', { nickname });
      if (!res.ok) {
        if (res.reason === 'multiple_candidates' && Array.isArray(res.candidates) && res.candidates.length) {
          this._showCandidatesPopup(res.candidates, (picked) => this._sendChallengeByNick(picked));
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
      // Полоска ожидания: live-countdown до expires_at + кнопка «Отменить».
      // Закрывается из WS battle_started / challenge_declined или сама на 0.
      if (res.challenge_id && res.expires_at) {
        this._showWaitingChallenge(nickname, res.challenge_id, res.expires_at);
      }
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
  },

});
