/* ============================================================
   ClanScene — расширение: _makeInput, _sendChatMsg,
   _doSearch, _showSearchResults, _joinClan, _doCreate,
   _leaveClan, _showTransferConfirm, _transferLeader, _toast
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
    const y0 = this._resultsY || 198;
    if (!clans.length) {
      this._resultsContainer.add(txt(this, W/2, y0+20, '😔 Ничего не найдено', 12, '#9999bb').setOrigin(0.5));
      return;
    }
    clans.forEach((c, i) => {
      const ry = y0 + i * 48;
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.9); bg.fillRoundedRect(8, ry, W-16, 44, 10);
      bg.lineStyle(1, C.dark, 0.6); bg.strokeRoundedRect(8, ry, W-16, 44, 10);
      const joinG = this.add.graphics();
      joinG.fillStyle(C.green, 0.85); joinG.fillRoundedRect(W-74, ry+8, 60, 28, 8);
      const joinT = txt(this, W-44, ry+22, 'Вступить', 11, '#1a1a28', true).setOrigin(0.5);
      this._resultsContainer.add([
        bg,
        txt(this, 18, ry+8,  `[${c.tag}]`, 12, '#ffc83c', true),
        txt(this, 18, ry+26, (s => s.length > 20 ? s.slice(0,20)+'…' : s)(c.name||''), 11, '#c0c0e0'),
        txt(this, W-82, ry+8,  `👥 ${c.member_count}/20`, 11, '#9999bb'),
        txt(this, W-82, ry+26, `🏆 ${c.wins}`, 11, '#ffc83c'),
        joinG, joinT,
        this.add.zone(W-74, ry+8, 60, 28).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { joinG.clear(); joinG.fillStyle(0x28a050,1); joinG.fillRoundedRect(W-74,ry+8,60,28,8); tg?.HapticFeedback?.impactOccurred('medium'); })
          .on('pointerout',  () => { joinG.clear(); joinG.fillStyle(C.green,0.85); joinG.fillRoundedRect(W-74,ry+8,60,28,8); })
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

  _showTransferConfirm(member, W, H) {
    /* Затемнение */
    const ov = this.add.graphics().setDepth(90);
    ov.fillStyle(0x000000, 0.6); ov.fillRect(0, 0, W, H);

    /* Попап */
    const pw = W - 48, ph = 168, px = 24, py = Math.round((H - ph) / 2);
    const D = 92;
    const bg = this.add.graphics().setDepth(D);
    bg.fillStyle(0x1e3060, 1); bg.fillRoundedRect(px, py, pw, ph, 14);
    bg.lineStyle(2, 0xffc83c, 0.9); bg.strokeRoundedRect(px, py, pw, ph, 14);

    txt(this, px+pw/2, py+22, '👑 Передача лидерства', 14, '#ffc83c', true)
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+46, 'Передать лидерство игроку:', 11, '#a8c4ff')
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+66, `${member.username || `User${member.user_id}`}`, 14, '#f0f0fa', true)
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+86, 'Отменить нельзя! Вы станете обычным участником.', 10, '#888888')
      .setOrigin(0.5).setDepth(D);

    const destroy = () => {
      [ov, bg, ...this._transferObjs].forEach(o => { try { o.destroy(); } catch(_){} });
      this._transferObjs = [];
    };

    /* Кнопка «Отмена» */
    const cx = px+8, cw = (pw-24)/2, ch = 38, cy = py+116;
    const cBg = this.add.graphics().setDepth(D);
    cBg.fillStyle(0x303060, 1); cBg.fillRoundedRect(cx, cy, cw, ch, 9);
    const cT = txt(this, cx+cw/2, cy+ch/2, '❌ Отмена', 12, '#a0a0ff', true)
      .setOrigin(0.5).setDepth(D);
    this.add.zone(cx, cy, cw, ch).setOrigin(0).setDepth(D+5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { cBg.clear(); cBg.fillStyle(0x202040,1); cBg.fillRoundedRect(cx,cy,cw,ch,9); })
      .on('pointerout',  () => { cBg.clear(); cBg.fillStyle(0x303060,1); cBg.fillRoundedRect(cx,cy,cw,ch,9); })
      .on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); destroy(); });

    /* Кнопка «Передать» */
    const ox = cx+cw+8, ow = cw;
    const oBg = this.add.graphics().setDepth(D);
    oBg.fillStyle(0x3a2800, 1); oBg.fillRoundedRect(ox, cy, ow, ch, 9);
    oBg.lineStyle(1.5, 0xffc83c, 0.8); oBg.strokeRoundedRect(ox, cy, ow, ch, 9);
    const oT = txt(this, ox+ow/2, cy+ch/2, '👑 Передать', 12, '#ffc83c', true)
      .setOrigin(0.5).setDepth(D);
    const oZ = this.add.zone(ox, cy, ow, ch).setOrigin(0).setDepth(D+5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { oBg.clear(); oBg.fillStyle(0x5a4000,1); oBg.fillRoundedRect(ox,cy,ow,ch,9); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  () => { oBg.clear(); oBg.fillStyle(0x3a2800,1); oBg.fillRoundedRect(ox,cy,ow,ch,9); oBg.lineStyle(1.5,0xffc83c,0.8); oBg.strokeRoundedRect(ox,cy,ow,ch,9); })
      .on('pointerup', () => { destroy(); this._transferLeader(member.user_id); });

    this._transferObjs = [cBg, cT, oBg, oT, oZ,
      this.add.zone(0, 0, W, H).setOrigin(0).setDepth(89).setInteractive()
        .on('pointerup', () => destroy()),
    ];
  },

  async _transferLeader(newLeaderId) {
    if (this._busy) return; this._busy = true;
    try {
      const res = await post('/api/clan/transfer_leader', { new_leader_id: newLeaderId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast('👑 Лидерство передано!');
        this.time.delayedCall(700, () => this.scene.restart({ sub: 'main' }));
      } else { this._toast(`❌ ${res.reason}`); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  },

  _toast(msg) {
    const t = txt(this, this.W/2, this.H-80, msg, 12, '#ffc83c', true).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y-36, duration: 2400, onComplete: () => t.destroy() });
  },

});
