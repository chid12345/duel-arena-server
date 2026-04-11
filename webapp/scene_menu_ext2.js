/* ============================================================
   MenuScene — ext2: _onFight, _onBotFight, _onTitanFight,
     _onEndlessFight, _showOutgoingChallenges, _showPvpTop,
     _showSummary, _onInvite, _soon, _toast
   ============================================================ */

Object.assign(MenuScene.prototype, {

  async _onFight() {
    const p = State.player;
    if (!p) return;
    if (p.hp_pct < 15) {
      tg?.HapticFeedback?.notificationOccurred('error');
      this._toast('❤️ Нужно восстановить HP!');
      return;
    }
    this._toast('🔍 Ищем соперника...');
    try {
      const res = await post('/api/battle/find', { queue_only: true });
      if (!res.ok) {
        this._toast(res.reason === 'low_hp' ? '❤️ Нужно восстановить HP!' : '❌ Нет противников');
        return;
      }
      if (res.status === 'queued') { this.scene.start('Queue'); return; }
      State.battle = res.battle;
      this.scene.start('Battle');
    } catch(e) { this._toast('❌ Нет соединения'); }
  },

  async _onBotFight() {
    const p = State.player;
    if (!p) return;
    if (p.hp_pct < 15) {
      tg?.HapticFeedback?.notificationOccurred('error');
      this._toast('❤️ Нужно восстановить HP!');
      return;
    }
    this._toast('🤖 Запускаем бой с ботом...');
    try {
      const res = await post('/api/battle/find', { prefer_bot: true });
      if (!res.ok) { this._toast('❌ Ошибка'); return; }
      State.battle = res.battle;
      this.scene.start('Battle');
    } catch(e) { this._toast('❌ Нет соединения'); }
  },

  async _onTitanFight() {
    const p = State.player;
    if (!p) return;
    if (p.hp_pct < 15) {
      this._toast('❤️ Нужно восстановить HP!');
      return;
    }
    this._toast('🗿 Запускаем Башню титанов...');
    try {
      const res = await post('/api/titans/start', {});
      if (!res.ok) {
        this._toast(res.reason === 'low_hp' ? '❤️ Нужно восстановить HP!' : '❌ Башня недоступна');
        return;
      }
      State.battle = res.battle;
      this.scene.start('Battle');
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
  },

  async _onEndlessFight() {
    if (this._buying) return;
    this._buying = true;
    try {
      const res = await post('/api/endless/start', {});
      if (!res.ok) { this._toast('❌ ' + (res.reason || 'Ошибка')); this._buying = false; return; }
      State.battle = res.battle;
      State.endlessWave = res.wave;
      this.scene.start('Battle');
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
    this._buying = false;
  },

  async _showOutgoingChallenges() {
    try {
      const res = await get('/api/battle/challenge/outgoing');
      if (!res.ok) { this._toast('❌ Не удалось загрузить'); return; }
      const list = (res.challenges || []).slice(0, 5);
      if (!list.length) {
        tg?.showAlert?.('📭 У вас нет активных/последних вызовов.');
        return;
      }
      const lines = list.map((c, i) => `${i + 1}. @${c.target_username || 'Боец'} · ${c.status}`);
      tg?.showAlert?.(`📨 Мои вызовы:\n${lines.join('\n')}`);
    } catch (_) {
      this._toast('❌ Нет соединения');
    }
  },

  _showPvpTop() {
    this.scene.start('Rating');
  },

  _showSummary() {
    const p = State.player;
    if (!p) return;
    const total = p.wins + p.losses;
    const wr = total > 0 ? Math.round(p.wins / total * 100) : 0;
    this._toast(`🏆 ${p.wins}W  💀 ${p.losses}L  · WR ${wr}%`);
  },

});
