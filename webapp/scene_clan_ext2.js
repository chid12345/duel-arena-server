/* ============================================================
   ClanScene — ext2: _renderChat, _renderSearch, _renderCreate, _renderTop
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
    txt(this, W/2, 40, `[${clan.tag}] ${clan.name}`, 11, '#8888bb').setOrigin(0.5);

    /* 🔄 кнопка справа */
    const rG = this.add.graphics();
    rG.fillStyle(0x2a4a8a, 1); rG.fillRoundedRect(W-50, 12, 38, 34, 9);
    txt(this, W-31, 29, '🔄', 14).setOrigin(0.5);
    this.add.zone(W-50, 12, 38, 34).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._chatLoad(msgAreaY, msgAreaH, W));

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
          const t3 = txt(this, cW-14, my+10, m.time_str||'', 11, '#aaaaff').setOrigin(1, 0);
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

  /* ══ ПОИСК ═══════════════════════════════════════════════ */
  _renderSearch(W, H) {
    // Панель поиска: input + кнопка в одну строку
    const panelY = 84, panelH = 60;
    const panelG = this.add.graphics();
    panelG.fillStyle(0x141720, 1);
    panelG.fillRoundedRect(8, panelY, W-16, panelH, 10);
    panelG.lineStyle(1, 0x1e2230, 0.9);
    panelG.strokeRoundedRect(8, panelY, W-16, panelH, 10);

    // Input занимает левую часть, кнопка — правая 78px
    const btnW = 78, gap = 8;
    const inpW = W - 32 - gap - btnW;   // 16 отступ слева + inpW + gap + btnW + 16
    const rowY = panelY + 12;
    const rowH = 36;

    // HTML input — позиционируем через gameX
    this._inputEl = this._makeInput(W, rowY, inpW, rowH, 'Железный Кулак / ЖК...', 30, 16);

    // Кнопка «Найти» справа от поля
    const bx = 16 + inpW + gap;
    const sbG = this.add.graphics();
    sbG.fillStyle(0x1a2050, 1);
    sbG.fillRoundedRect(bx, rowY, btnW, rowH, 8);
    sbG.lineStyle(1, 0x2a3460, 0.9);
    sbG.strokeRoundedRect(bx, rowY, btnW, rowH, 8);
    txt(this, bx + btnW/2, rowY + rowH/2, 'Найти', 12, '#6080c0', true).setOrigin(0.5);
    this.add.zone(bx, rowY, btnW, rowH).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { sbG.clear(); sbG.fillStyle(0x0a0e18,1); sbG.fillRoundedRect(bx,rowY,btnW,rowH,8); tg?.HapticFeedback?.impactOccurred('light'); })
      .on('pointerout',  () => { sbG.clear(); sbG.fillStyle(0x1a2050,1); sbG.fillRoundedRect(bx,rowY,btnW,rowH,8); sbG.lineStyle(1,0x2a3460,0.9); sbG.strokeRoundedRect(bx,rowY,btnW,rowH,8); })
      .on('pointerup', () => this._doSearch(W));

    // Разделитель + заголовок списка
    const listHdrY = panelY + panelH + 12;
    const divG = this.add.graphics();
    divG.lineStyle(1, 0x1e2230, 0.7);
    divG.lineBetween(16, listHdrY, W-16, listHdrY);
    txt(this, 16, listHdrY + 6, 'ВСЕ КЛАНЫ', 9, '#3a4060');

    this._resultsY = listHdrY + 22;
    this._resultsContainer = this.add.container(0, 0);
    get('/api/clan/top').then(d => this._showSearchResults(d.clans || [], W));
  },

  /* ══ СОЗДАНИЕ ════════════════════════════════════════════ */
  _renderCreate(W, H) {
    txt(this, W/2, 86, '➕ СОЗДАТЬ КЛАН', 14, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, 104, 'Стоимость: 200 🪙  ·  Максимум 20 участников', 11, '#8080cc').setOrigin(0.5);

    makePanel(this, 8, 118, W-16, 152, 12);
    txt(this, 20, 128, 'Название клана', 12, '#a0a0cc', true);
    txt(this, 20, 144, '3–20 символов, например: Железный Кулак', 11, '#bbbbff');
    this._nameEl = this._makeInput(W, 158, W-32, 36, 'Железный Кулак', 20);

    txt(this, 20, 204, 'Тег клана', 12, '#a0a0cc', true);
    txt(this, 20, 220, '2–4 символа, например: ЖК', 11, '#bbbbff');
    this._tagEl  = this._makeInput(W, 232, (W-32)/2, 36, 'ЖК', 4);

    const btnY = 280;
    const bgC  = this.add.graphics();
    bgC.fillStyle(C.purple, 0.9); bgC.fillRoundedRect(16, btnY, W-32, 48, 12);
    bgC.fillStyle(0xffffff, 0.08); bgC.fillRoundedRect(18, btnY+2, W-36, 22, 10);
    const btnT = txt(this, W/2, btnY+24, '⚔️  Основать клан  (200 🪙)', 14, '#ffffff', true).setOrigin(0.5);
    this.add.zone(16, btnY, W-32, 48).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bgC.clear(); bgC.fillStyle(0x6600cc,1); bgC.fillRoundedRect(16,btnY,W-32,48,12); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  () => { bgC.clear(); bgC.fillStyle(C.purple,0.9); bgC.fillRoundedRect(16,btnY,W-32,48,12); })
      .on('pointerup',   () => this._doCreate(btnT));

    txt(this, W/2, btnY+60, 'Имя и тег должны быть уникальны', 11, '#aaaaff').setOrigin(0.5);
  },

  /* ══ ТОП КЛАНОВ ══════════════════════════════════════════ */
  _renderTop(W, H) {
    txt(this, W/2, 86, '🏆 ТОП КЛАНОВ', 14, '#ffc83c', true).setOrigin(0.5);
    const load2 = txt(this, W/2, 140, 'Загрузка...', 13, '#aaaaee').setOrigin(0.5);
    get('/api/clan/top').then(d => {
      load2.destroy();
      const clans = d.clans || [];
      if (!clans.length) { txt(this, W/2, 140, '😔 Кланов пока нет', 13, '#aaaaee').setOrigin(0.5); return; }
      let y = 112;
      const rowH = 50;
      clans.slice(0, Math.floor((H - 160) / rowH)).forEach((c, i) => {
        const isTop = i < 3;
        const bg = this.add.graphics();
        bg.fillStyle(isTop ? 0x2a2010 : C.bgPanel, 0.92);
        bg.fillRoundedRect(8, y, W-16, rowH-3, 10);
        if (isTop) { bg.lineStyle(1.5, C.gold, 0.6); bg.strokeRoundedRect(8,y,W-16,rowH-3,10); }
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
        txt(this, 20, y + (rowH-3)/2, medal, isTop?17:13, '#ffc83c').setOrigin(0, 0.5);
        const ttr = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');
        txt(this, 48, y+10, `[${c.tag}] ${ttr(c.name, 16)}`, 13, isTop?'#ffc83c':'#e0e0f8', isTop);
        txt(this, 48, y+27, `🏆 ${c.wins} побед  ·  👥 ${c.member_count}чел`, 11, '#8888bb');
        txt(this, W-18, y + (rowH-3)/2, `Ур.${c.level}`, 12, '#a0a0cc').setOrigin(1, 0.5);
        y += rowH;
      });
    }).catch(() => load2.setText('❌ Ошибка'));
  }

});
