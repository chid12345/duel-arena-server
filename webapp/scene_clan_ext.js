/* ============================================================
   ClanScene — расширение: _makeInput, _sendChatMsg,
   _doSearch, _showSearchResults, _joinClan, _doCreate, _leaveClan
   Продолжение: scene_clan_ext3.js
   ============================================================ */

Object.assign(ClanScene.prototype, {

  /* gameX — необязательная x-координата в игровых пикселях; если null — центрирует */
  _makeInput(W, y, w, h, placeholder, maxLen = 20, gameX = null) {
    const el = document.createElement('input');
    el.type = 'text'; el.placeholder = placeholder; el.maxLength = maxLen;
    const canvasLeft = Math.round((window.innerWidth - W) / 2);
    const left = gameX !== null
      ? Math.round(canvasLeft + gameX)
      : Math.round((window.innerWidth - w) / 2);
    const top  = Math.round(y + (window.innerHeight - this.H) / 2);
    el.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:${w}px;height:${h}px;
      padding:0 12px;background:#1e3878;color:#f0f0fa;border:2px solid #5096ffaa;
      border-radius:10px;font-size:14px;outline:none;z-index:999;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      box-sizing:border-box;`;
    document.body.appendChild(el);
    this.events.once('shutdown', () => el.remove());
    this.events.once('destroy',  () => el.remove());
    return el;
  },

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
        txt(this, W/2, y0+20, '😔 Ничего не найдено', 12, '#3a4060').setOrigin(0.5)
      );
      return;
    }
    const rowH = 52;
    clans.forEach((c, i) => {
      const ry = y0 + i * rowH;
      const bg = this.add.graphics();
      bg.fillStyle(0x141720, 1);
      bg.fillRoundedRect(8, ry, W-16, rowH-4, 8);
      bg.lineStyle(1, 0x1e2230, 0.9);
      bg.strokeRoundedRect(8, ry, W-16, rowH-4, 8);

      // Кнопка Вступить
      const bw = 70, bx = W-14-bw, bh = 28, by2 = ry + (rowH-4)/2 - 14;
      const joinG = this.add.graphics();
      joinG.fillStyle(0x1e3028, 1); joinG.fillRoundedRect(bx, by2, bw, bh, 7);
      joinG.lineStyle(1, 0x304838, 0.9); joinG.strokeRoundedRect(bx, by2, bw, bh, 7);
      const joinT = txt(this, bx+bw/2, by2+bh/2, 'Вступить', 10, '#608050', true).setOrigin(0.5);

      const trunc = s => s && s.length > 18 ? s.slice(0,18)+'…' : (s||'');
      this._resultsContainer.add([
        bg,
        txt(this, 18, ry+9,  `[${c.tag}]`, 12, '#c0c8e8', true),
        txt(this, 18, ry+27, trunc(c.name), 11, '#3a4060'),
        txt(this, bx-8, ry+9,  `👥 ${c.member_count}/20`, 10, '#3a4060').setOrigin(1,0),
        txt(this, bx-8, ry+27, `🏆 ${c.wins}`, 10, '#5070a0').setOrigin(1,0),
        joinG, joinT,
        this.add.zone(bx, by2, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { joinG.clear(); joinG.fillStyle(0x253a30,1); joinG.fillRoundedRect(bx,by2,bw,bh,7); tg?.HapticFeedback?.impactOccurred('medium'); })
          .on('pointerout',  () => { joinG.clear(); joinG.fillStyle(0x1e3028,1); joinG.fillRoundedRect(bx,by2,bw,bh,7); joinG.lineStyle(1,0x304838,0.9); joinG.strokeRoundedRect(bx,by2,bw,bh,7); })
          .on('pointerup',   () => this._joinClan(c.id, c.name, joinT)),
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
