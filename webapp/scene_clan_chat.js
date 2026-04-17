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

    /* ── Область сообщений со скроллом ── */
    const msgAreaY = hdrH + 6;
    const msgAreaH = inputY - 6 - msgAreaY - 6;

    const msgsG = this.add.graphics();
    msgsG.fillStyle(C.bgPanel, 0.4);
    msgsG.fillRoundedRect(8, msgAreaY, W-16, msgAreaH, 8);

    /* Контейнер с маской — сообщения прокручиваются внутри msgArea */
    const msgC = this.add.container(0, 0);
    const maskG = this.make.graphics({ x: 0, y: 0, add: false });
    maskG.fillStyle(0xffffff);
    maskG.fillRect(8, msgAreaY, W - 16, msgAreaH);
    msgC.setMask(maskG.createGeometryMask());

    let baseY = 0, contentH = 0, vel = 0;
    const clampY = y => {
      const maxUp = Math.max(0, contentH - msgAreaH);
      if (y > 0) return 0;
      if (y < -maxUp) return -maxUp;
      return y;
    };
    /* Drag-скролл с инерцией (аналог магазина) */
    const dragZ = this.add.zone(8, msgAreaY, W-16, msgAreaH).setOrigin(0).setInteractive();
    let sy = 0, dragBase = 0, active = false, lastY = 0, lastT = 0;
    dragZ.on('pointerdown', p => {
      sy = p.y; dragBase = baseY; vel = 0;
      lastY = p.y; lastT = this.game.loop.now; active = true;
    });
    dragZ.on('pointermove', p => {
      if (!active) return;
      const dy = p.y - sy;
      const now = this.game.loop.now, dt = now - lastT;
      if (dt > 0) vel = (p.y - lastY) / dt * 16;
      lastY = p.y; lastT = now;
      baseY = clampY(dragBase + dy);
      msgC.setY(baseY);
    });
    dragZ.on('pointerup',  () => { active = false; });
    dragZ.on('pointerout', () => { active = false; });
    this._chatScrollFn = () => {
      if (Math.abs(vel) < 0.15) { vel = 0; return; }
      baseY = clampY(baseY + vel); vel *= 0.88;
      msgC.setY(baseY);
    };

    this._chatLoad = (aY, aH, cW) => {
      msgC.removeAll(true);
      const spin = txt(this, cW/2, aY+aH/2, '⏳ Загрузка...', 12, '#bbbbff').setOrigin(0.5);
      msgC.add(spin);
      get('/api/clan/chat').then(d => {
        msgC.removeAll(true);
        const msgs = d.messages || [];
        if (!msgs.length) {
          msgC.add(txt(this, cW/2, aY+aH/2, '💬 Напишите первым!', 12, '#aaaaff').setOrigin(0.5));
          contentH = 0; baseY = 0; msgC.setY(0); return;
        }
        const lineH = 40;
        const startY = aY + aH - msgs.length * lineH;  /* низ последнего = aY+aH */
        const maxMsgCh = Math.floor((cW - 32) / 7);
        msgs.forEach((m, i) => {
          const isMe = (m.user_id === this._chatMyId);
          const my   = Math.max(aY, startY) + i * lineH;
          const bg   = this.add.graphics();
          bg.fillStyle(isMe ? 0x1a3a7a : 0x1e1c34, 0.95);
          bg.fillRoundedRect(10, my+2, cW-20, lineH-4, 8);
          const nc = isMe ? '#7ab4ff' : '#ffc83c';
          const nameStr = isMe ? 'Вы' : (m.username||'Игрок').slice(0, 14);
          const msgStr  = (m.message||'').slice(0, maxMsgCh);
          msgC.add([ bg,
            txt(this, 20, my+10, nameStr, 12, nc, true),
            txt(this, 20, my+24, msgStr,  12, '#e8e8ff'),
            txt(this, cW-14, my+10, m.time_str||'', 11, '#a8b4d8').setOrigin(1, 0),
          ]);
        });
        contentH = msgs.length * lineH;
        baseY = 0; msgC.setY(0);
      }).catch(() => {});
    };
    this._chatLoad(msgAreaY, msgAreaH, W);
    this._chatTimer = this.time.addEvent({
      delay: 20000, loop: true,
      callback: () => this._chatLoad(msgAreaY, msgAreaH, W),
    });
  },

});
