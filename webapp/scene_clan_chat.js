/* ============================================================
   ClanScene — рендер чата клана (вынесено из scene_clan_ext2)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _renderChat(data, W, H) {
    const clan = data.clan;
    this._chatMyId = data.my_user_id;

    const stopTimer = () => {
      if (this._chatTimer) { this._chatTimer.remove(false); this._chatTimer = null; }
    };

    /* ── Шапка (полная ширина) ── */
    const hdrH = 58;
    const hdrG = this.add.graphics();
    hdrG.fillStyle(0x1a3060, 1);
    hdrG.fillRoundedRect(0, 0, W, hdrH, 0);
    hdrG.lineStyle(1.5, 0xffc83c, 0.5);
    hdrG.lineBetween(0, hdrH, W, hdrH);

    /* ← В клан (слева) */
    const backG = this.add.graphics();
    backG.fillStyle(0x2a4a8a, 1); backG.fillRoundedRect(10, 12, 80, 34, 9);
    txt(this, 50, 29, '← В клан', 12, '#a8d4ff', true).setOrigin(0.5);
    this.add.zone(10, 12, 80, 34).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { backG.clear(); backG.fillStyle(0x1a2a5a,1); backG.fillRoundedRect(10,12,80,34,9); })
      .on('pointerout',  () => { backG.clear(); backG.fillStyle(0x2a4a8a,1); backG.fillRoundedRect(10,12,80,34,9); })
      .on('pointerup', () => {
        tg?.HapticFeedback?.impactOccurred('light');
        stopTimer();
        this.scene.restart({ sub: 'main' });
      });

    /* Название клана по центру */
    txt(this, W/2, 20, '💬 ЧАТ КЛАНА', 13, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, 40, `[${clan.tag}] ${clan.name}`, 11, '#a8b4d8').setOrigin(0.5);

    /* ── Поле ввода + кнопка ── */
    const inputH = 44, inputY = H - inputH - 56;
    const sendW  = 58, inpW = W - 16 - 8 - sendW - 8;

    const inpRowG = this.add.graphics();
    inpRowG.fillStyle(0x12204a, 1);
    inpRowG.fillRect(0, inputY - 6, W, inputH + 12);

    this._chatInput = this._makeInput(W, inputY, inpW, inputH, '✏️ Написать сообщение...', 200, 16);

    const sbx = 16 + inpW + 8;
    const sendG = this.add.graphics();
    sendG.fillStyle(0x3a7aff, 1); sendG.fillRoundedRect(sbx, inputY, sendW, inputH, 10);
    txt(this, sbx + sendW/2, inputY + inputH/2, '➤', 17, '#ffffff', true).setOrigin(0.5);
    this.add.zone(sbx, inputY, sendW, inputH).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { sendG.clear(); sendG.fillStyle(0x2050d0,1); sendG.fillRoundedRect(sbx,inputY,sendW,inputH,10); })
      .on('pointerout',  () => { sendG.clear(); sendG.fillStyle(0x3a7aff,1); sendG.fillRoundedRect(sbx,inputY,sendW,inputH,10); })
      .on('pointerup', () => this._sendChatMsg(msgAreaY, msgAreaH, W));

    /* 🔄 кнопка справа */
    const rG = this.add.graphics();
    rG.fillStyle(0x2a4a8a, 1); rG.fillRoundedRect(W-50, 12, 38, 34, 9);
    txt(this, W-31, 29, '🔄', 14).setOrigin(0.5);
    this.add.zone(W-50, 12, 38, 34).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._chatLoad(msgAreaY, msgAreaH, W));

    /* ── Область сообщений ── */
    const msgAreaY = hdrH + 6;
    const msgAreaH = inputY - 6 - msgAreaY - 6;

    const msgsG = this.add.graphics();
    msgsG.fillStyle(C.bgPanel, 0.4);
    msgsG.fillRoundedRect(8, msgAreaY, W-16, msgAreaH, 8);

    this._msgObjs = [];

    this._chatLoad = (aY, aH, cW) => {
      this._msgObjs.forEach(o => { try { o.destroy(); } catch(_){} });
      this._msgObjs = [];
      const spin = txt(this, cW/2, aY+aH/2, '⏳ Загрузка...', 12, '#bbbbff').setOrigin(0.5);
      this._msgObjs.push(spin);

      get('/api/clan/chat').then(d => {
        spin.destroy();
        this._msgObjs = this._msgObjs.filter(o => o !== spin);
        const msgs = d.messages || [];

        if (!msgs.length) {
          const e = txt(this, cW/2, aY+aH/2, '💬 Напишите первым!', 12, '#aaaaff').setOrigin(0.5);
          this._msgObjs.push(e); return;
        }

        const lineH = 40;
        const maxL  = Math.floor(aH / lineH);
        msgs.slice(-maxL).forEach((m, i) => {
          const isMe = (m.user_id === this._chatMyId);
          const my   = aY + aH - (Math.min(msgs.length, maxL) - i) * lineH;
          const bg   = this.add.graphics();
          bg.fillStyle(isMe ? 0x1a3a7a : 0x1e1c34, 0.95);
          bg.fillRoundedRect(10, my+2, cW-20, lineH-4, 8);
          const nc = isMe ? '#7ab4ff' : '#ffc83c';
          const maxMsgCh = Math.floor((cW - 32) / 7);
          const nameStr  = isMe ? 'Вы' : (m.username||'Игрок').slice(0, 14);
          const msgStr   = (m.message||'').slice(0, maxMsgCh);
          const t1 = txt(this, 20, my+10, nameStr, 12, nc, true);
          const t2 = txt(this, 20, my+24, msgStr,  12, '#e8e8ff');
          const t3 = txt(this, cW-14, my+10, m.time_str||'', 11, '#a8b4d8').setOrigin(1, 0);
          this._msgObjs.push(bg, t1, t2, t3);
        });
      }).catch(() => { spin.setText('❌ Нет соединения'); });
    };

    this._chatLoad(msgAreaY, msgAreaH, W);

    this._chatTimer = this.time.addEvent({
      delay: 20000, loop: true,
      callback: () => this._chatLoad(msgAreaY, msgAreaH, W),
    });
  },

});
