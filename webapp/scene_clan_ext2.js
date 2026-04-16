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

  /* ══ СОЗДАНИЕ ════════════════════════════════════════════ */
  _renderCreate(W, H) {
    txt(this, W/2, 86, '➕ СОЗДАТЬ КЛАН', 14, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, 104, 'Стоимость: 200 🪙  ·  Максимум 20 участников', 11, '#a8b4d8').setOrigin(0.5);

    makePanel(this, 8, 118, W-16, 152, 12);
    txt(this, 20, 128, 'Название клана', 12, '#ffffff', true);
    txt(this, 20, 144, '3–20 символов, например: Железный Кулак', 11, '#a8b4d8');
    this._nameEl = this._makeInput(W, 158, W-32, 36, 'Железный Кулак', 20);

    txt(this, 20, 204, 'Тег клана', 12, '#ffffff', true);
    txt(this, 20, 220, '2–4 символа, например: ЖК', 11, '#a8b4d8');
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

    txt(this, W/2, btnY+60, 'Имя и тег должны быть уникальны', 11, '#a8b4d8').setOrigin(0.5);
  },

  /* ══ ТОП КЛАНОВ ══════════════════════════════════════════ */
  _renderTop(W, H) {
    txt(this, W/2, 86, '🏆 ТОП КЛАНОВ', 14, '#ffc83c', true).setOrigin(0.5);
    const load2 = txt(this, W/2, 140, 'Загрузка...', 13, '#a8c4ff').setOrigin(0.5);
    get('/api/clan/top').then(d => {
      load2.destroy();
      const clans = d.clans || [];
      if (!clans.length) { txt(this, W/2, 140, '😔 Кланов пока нет', 13, '#a8c4ff').setOrigin(0.5); return; }
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
        txt(this, 48, y+10, `[${c.tag}] ${ttr(c.name, 16)}`, 13, isTop?'#ffc83c':'#ffffff', true);
        txt(this, 48, y+27, `🏆 ${c.wins} побед  ·  👥 ${c.member_count}чел`, 11, '#a8b4d8');
        txt(this, W-18, y + (rowH-3)/2, `Ур.${c.level}`, 12, '#ffffff', true).setOrigin(1, 0.5);
        y += rowH;
      });
    }).catch(() => load2.setText('❌ Ошибка'));
  }

});
