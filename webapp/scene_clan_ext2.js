/* ============================================================
   ClanScene — ext2: _renderSearch, _renderCreate, _renderTop
   (чат вынесен в scene_clan_chat.js)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  /* ══ ПОИСК ═══════════════════════════════════════════════ */
  _renderSearch(W, H) {
    const panelY = 84, panelH = 60;
    const panelG = this.add.graphics();
    panelG.fillStyle(0x141720, 1);
    panelG.fillRoundedRect(8, panelY, W-16, panelH, 10);
    panelG.lineStyle(1, 0x1e2230, 0.9);
    panelG.strokeRoundedRect(8, panelY, W-16, panelH, 10);

    const btnW = 78, gap = 8;
    const inpW = W - 32 - gap - btnW;
    const rowY = panelY + 12;
    const rowH = 36;

    this._inputEl = this._makeInput(W, rowY, inpW, rowH, 'Железный Кулак / ЖК...', 30, 16);

    const bx = 16 + inpW + gap;
    const sbG = this.add.graphics();
    sbG.fillStyle(0x1a2050, 1);
    sbG.fillRoundedRect(bx, rowY, btnW, rowH, 8);
    sbG.lineStyle(1, 0x2a3460, 0.9);
    sbG.strokeRoundedRect(bx, rowY, btnW, rowH, 8);
    txt(this, bx + btnW/2, rowY + rowH/2, 'Найти', 12, '#a8c4ff', true).setOrigin(0.5);
    this.add.zone(bx, rowY, btnW, rowH).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { sbG.clear(); sbG.fillStyle(0x0a0e18,1); sbG.fillRoundedRect(bx,rowY,btnW,rowH,8); tg?.HapticFeedback?.impactOccurred('light'); })
      .on('pointerout',  () => { sbG.clear(); sbG.fillStyle(0x1a2050,1); sbG.fillRoundedRect(bx,rowY,btnW,rowH,8); sbG.lineStyle(1,0x2a3460,0.9); sbG.strokeRoundedRect(bx,rowY,btnW,rowH,8); })
      .on('pointerup', () => this._doSearch(W));

    const listHdrY = panelY + panelH + 12;
    const divG = this.add.graphics();
    divG.lineStyle(1, 0x1e2230, 0.7);
    divG.lineBetween(16, listHdrY, W-16, listHdrY);
    txt(this, 16, listHdrY + 6, 'ВСЕ КЛАНЫ', 9, '#a8b4d8');

    this._resultsY = listHdrY + 22;
    this._resultsContainer = this.add.container(0, 0);
    get('/api/clan/top').then(d => this._showSearchResults(d.clans || [], W));
  },

  /* _renderCreate перенесён в scene_clan_create.js */

  /* ══ ТОП КЛАНОВ ══════════════════════════════════════════ */
  _renderTop(W, H) {
    txt(this, W/2, 86, '🏆 ТОП КЛАНОВ', 14, '#ffc83c', true).setOrigin(0.5);
    const load2 = txt(this, W/2, 140, 'Загрузка...', 13, '#a8c4ff').setOrigin(0.5);
    const EM = { light:{i:'☀️',c:0xffd166}, dark:{i:'🌑',c:0xa06bff}, neutral:{i:'⚖️',c:0x7ec8ff} };
    get('/api/clan/top').then(d => {
      load2.destroy();
      const clans = d.clans || [];
      if (!clans.length) { txt(this, W/2, 140, '😔 Кланов пока нет', 13, '#a8c4ff').setOrigin(0.5); return; }
      let y = 112;
      const rowH = 56;
      clans.slice(0, Math.floor((H - 160) / rowH)).forEach((c, i) => {
        const isTop = i < 3;
        const em = EM[c.emblem] || EM.neutral;
        const bg = this.add.graphics();
        bg.fillStyle(isTop ? 0x2a2010 : C.bgPanel, 0.92);
        bg.fillRoundedRect(8, y, W-16, rowH-3, 10);
        bg.lineStyle(isTop ? 2 : 1.5, isTop ? C.gold : em.c, isTop ? 0.7 : 0.45);
        bg.strokeRoundedRect(8,y,W-16,rowH-3,10);
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
        txt(this, 18, y + (rowH-3)/2, medal, isTop?17:13, '#ffc83c').setOrigin(0, 0.5);
        txt(this, 44, y + (rowH-3)/2, em.i, 16).setOrigin(0, 0.5);
        const ttr = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');
        txt(this, 70, y+8,  `[${c.tag}]`, 11, '#ffc83c', true);
        txt(this, 110, y+8, ttr(c.name, 14), 13, '#ffffff', true);
        txt(this, 70, y+28, `🏆 ${c.wins}  ·  👥 ${c.member_count}/20  ·  🟢 ${c.online_count||0}`, 10, '#a8b4d8');
        // Кнопка 👁 справа
        const eyeW = 30, eyeH = 26, eyeX = W-12-eyeW, eyeY = y + (rowH-3)/2 - 13;
        const eyeG = this.add.graphics();
        eyeG.fillStyle(0x1c2238, 1); eyeG.fillRoundedRect(eyeX, eyeY, eyeW, eyeH, 6);
        eyeG.lineStyle(1, 0x2a3460, 0.9); eyeG.strokeRoundedRect(eyeX, eyeY, eyeW, eyeH, 6);
        txt(this, eyeX+eyeW/2, eyeY+eyeH/2, '👁', 13, '#a8c4ff').setOrigin(0.5);
        this.add.zone(eyeX, eyeY, eyeW, eyeH).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.scene.restart({ sub: 'preview', clanId: c.id }));
        txt(this, eyeX-6, y+8, `Ур.${c.level}`, 11, '#ffffff', true).setOrigin(1, 0);
        y += rowH;
      });
    }).catch(() => load2.setText('❌ Ошибка'));
  }

});
