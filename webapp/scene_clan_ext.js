/* ============================================================
   ClanScene — расширение: _sendChatMsg, _doSearch,
   _showSearchResults, _joinClan, _doCreate, _leaveClan
   _makeInput вынесен в scene_clan_input.js
   Продолжение: scene_clan_ext3.js
   ============================================================ */

Object.assign(ClanScene.prototype, {

  async _sendChatMsg(msgAreaY, msgAreaH, W) {
    if (this._busy) return;
    const msg = this._chatInput?.value?.trim() || '';
    if (!msg) { this._toast('✏️ Введите сообщение'); return; }
    this._busy = true;
    try {
      const res = await post('/api/clan/chat/send', { message: msg });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (this._chatInput) this._chatInput.value = '';
        if (this._chatLoad) this._chatLoad(msgAreaY, msgAreaH, W);
      } else { this._toast('❌ ' + (res.reason || 'Ошибка')); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  },

  async _doSearch(W) {
    if (this._busy) return;
    this._busy = true;
    const q = this._inputEl?.value?.trim() || '';
    try {
      const d = await get('/api/clan/search', { q });
      this._showSearchResults(d.clans || [], W);
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  },

  _showSearchResults(clans, W) {
    this._resultsContainer?.removeAll(true);
    const y0 = this._resultsY || 236;
    if (!clans.length) {
      this._resultsContainer.add(
        txt(this, W/2, y0+20, '😔 Ничего не найдено', 12, '#a8b4d8').setOrigin(0.5)
      );
      return;
    }
    const EM = { light:{i:'☀️',c:0xffd166}, dark:{i:'🌑',c:0xa06bff}, neutral:{i:'⚖️',c:0x7ec8ff} };
    const rowH = 56;
    clans.forEach((c, i) => {
      const ry = y0 + i * rowH;
      const em = EM[c.emblem] || EM.neutral;
      const bg = this.add.graphics();
      bg.fillStyle(0x141720, 1);
      bg.fillRoundedRect(8, ry, W-16, rowH-4, 8);
      bg.lineStyle(1.5, em.c, 0.45);
      bg.strokeRoundedRect(8, ry, W-16, rowH-4, 8);

      // Кнопки справа: 👁 (превью) + Вступить
      const eyeW = 30, joinW = 70, gap = 4, bh = 28, by2 = ry + (rowH-4)/2 - 14;
      const joinX = W - 14 - joinW;
      const eyeX  = joinX - gap - eyeW;

      const eyeG = this.add.graphics();
      eyeG.fillStyle(0x1c2238, 1); eyeG.fillRoundedRect(eyeX, by2, eyeW, bh, 7);
      eyeG.lineStyle(1, 0x2a3460, 0.9); eyeG.strokeRoundedRect(eyeX, by2, eyeW, bh, 7);
      const eyeT = txt(this, eyeX+eyeW/2, by2+bh/2, '👁', 13, '#a8c4ff').setOrigin(0.5);

      const isClosed = (c.closed|0) === 1;
      const joinG = this.add.graphics();
      joinG.fillStyle(isClosed ? 0x2a2010 : 0x1e3028, 1);
      joinG.fillRoundedRect(joinX, by2, joinW, bh, 7);
      joinG.lineStyle(1, isClosed ? 0xffc83c : 0x304838, 0.9);
      joinG.strokeRoundedRect(joinX, by2, joinW, bh, 7);
      const joinT = txt(this, joinX+joinW/2, by2+bh/2,
        isClosed ? '🔒 Заявка' : 'Вступить',
        10, isClosed ? '#ffc83c' : '#a0e0a0', true).setOrigin(0.5);

      const trunc = s => s && s.length > 14 ? s.slice(0,14)+'…' : (s||'');
      const desc = (c.description||'').slice(0,28);
      this._resultsContainer.add([
        bg,
        txt(this, 14, ry+10, em.i, 16),
        txt(this, 36, ry+8,  `[${c.tag}]`, 12, '#ffc83c', true),
        txt(this, 78, ry+8,  trunc(c.name), 13, '#ffffff', true),
        txt(this, 14, ry+30, desc || `🏆 ${c.wins}  ·  👥 ${c.member_count}/20  ·  🟢 ${c.online_count||0}`, 10, '#a8b4d8'),
        joinG, joinT, eyeG, eyeT,
        this.add.zone(eyeX, by2, eyeW, bh).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.scene.restart({ sub:'preview', clanId: c.id })),
        this.add.zone(joinX, by2, joinW, bh).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { joinG.clear(); joinG.fillStyle(0x253a30,1); joinG.fillRoundedRect(joinX,by2,joinW,bh,7); tg?.HapticFeedback?.impactOccurred('medium'); })
          .on('pointerout',  () => { joinG.clear(); joinG.fillStyle(isClosed?0x2a2010:0x1e3028,1); joinG.fillRoundedRect(joinX,by2,joinW,bh,7); joinG.lineStyle(1,isClosed?0xffc83c:0x304838,0.9); joinG.strokeRoundedRect(joinX,by2,joinW,bh,7); })
          .on('pointerup',   () => isClosed
            ? this._toast('🔒 Закрытый клан — пока без заявок')
            : this._joinClan(c.id, c.name, joinT)),
      ]);
    });
  },

  async _joinClan(clanId, clanName, btnT) {
    if (this._busy) return; this._busy = true;
    btnT?.setText('...');
    try {
      const res = await post('/api/clan/join', { clan_id: clanId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success'); Sound.questDone();
        if (res.player) State.player = res.player;
        this._toast(`⚔️ Вы вступили в клан ${clanName}!`);
        this.time.delayedCall(700, () => this.scene.restart());
      } else { this._toast(`❌ ${res.reason}`); btnT?.setText('Вступить'); }
    } catch(_) { this._toast('❌ Нет соединения'); btnT?.setText('Вступить'); }
    this._busy = false;
  },

  async _doCreate(btnT) {
    if (this._busy) return;
    const name = this._nameEl?.value?.trim() || '';
    const tag  = this._tagEl?.value?.trim()  || '';
    if (name.length < 3) { this._toast('❌ Название минимум 3 символа'); return; }
    if (tag.length  < 2) { this._toast('❌ Тег минимум 2 символа'); return; }
    this._busy = true; btnT?.setText('Создаём...');
    try {
      const res = await post('/api/clan/create', { name, tag });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success'); Sound.levelUp();
        if (res.player) State.player = res.player;
        this._toast(`🏰 Клан [${res.tag}] ${res.name} основан!`);
        this.time.delayedCall(700, () => this.scene.restart());
      } else { this._toast(`❌ ${res.reason}`); btnT?.setText('⚔️  Основать клан  (200 🪙)'); }
    } catch(_) { this._toast('❌ Нет соединения'); btnT?.setText('⚔️  Основать клан  (200 🪙)'); }
    this._busy = false;
  },

  async _leaveClan() {
    if (this._busy) return; this._busy = true;
    try {
      const res = await post('/api/clan/leave');
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (res.player) State.player = res.player;
        this._toast('🚪 Вы покинули клан');
        this.time.delayedCall(600, () => this.scene.restart());
      } else { this._toast(`❌ ${res.reason}`); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  },

});
