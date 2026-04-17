/* ============================================================
   ClanScene — _renderCreate: создание клана с эмблемой,
   описанием, минимальным уровнем и закрытым режимом.
   ============================================================ */

/* Эмблемы: ключ → {label, icon, color, hint} */
const CLAN_EMBLEMS = [
  { key: 'light',   icon: '☀️', label: 'СВЕТ',         color: '#ffd166', stroke: 0xffd166 },
  { key: 'dark',    icon: '🌑', label: 'ТЬМА',         color: '#a06bff', stroke: 0xa06bff },
  { key: 'neutral', icon: '⚖️', label: 'НЕЙТРАЛИТЕТ',  color: '#7ec8ff', stroke: 0x7ec8ff },
];

Object.assign(ClanScene.prototype, {

  _renderCreate(W, H) {
    txt(this, W/2, 78, '➕ СОЗДАТЬ КЛАН', 14, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, 96, 'Стоимость: 800 🪙  ·  Бафф: +5% к золоту', 11, '#a8b4d8').setOrigin(0.5);

    let y = 112;
    /* Название */
    txt(this, 16, y, 'Название клана', 12, '#ffffff', true);
    txt(this, 16, y+15, '3–20 символов', 10, '#a8b4d8');
    this._nameEl = this._makeInput(W, y+30, W-32, 32, 'Железный Кулак', 20);

    y += 70;
    /* Тег */
    txt(this, 16, y, 'Тег', 12, '#ffffff', true);
    txt(this, 16, y+15, '2–4 символа', 10, '#a8b4d8');
    this._tagEl = this._makeInput(W, y+30, 86, 32, 'ЖК', 4, 16);

    /* Минимальный уровень — справа от тега */
    txt(this, 116, y, 'Мин. ур.', 12, '#ffffff', true);
    txt(this, 116, y+15, 'Ограничение', 10, '#a8b4d8');
    this._minLvlEl = this._makeInput(W, y+30, 72, 32, '1', 2, 116);

    /* Закрытый клан — чекбокс справа */
    this._closedFlag = 0;
    const cbX = 200, cbY = y+30, cbS = 32;
    const cbG = this.add.graphics();
    const drawCb = () => {
      cbG.clear();
      cbG.fillStyle(this._closedFlag ? 0x6a3a00 : 0x141720, 1);
      cbG.fillRoundedRect(cbX, cbY, cbS, cbS, 7);
      cbG.lineStyle(1.5, this._closedFlag ? 0xffc83c : 0x2a3050, 0.9);
      cbG.strokeRoundedRect(cbX, cbY, cbS, cbS, 7);
    };
    drawCb();
    const cbT = txt(this, cbX+cbS/2, cbY+cbS/2, this._closedFlag ? '🔒' : '🔓', 14).setOrigin(0.5);
    txt(this, cbX+cbS+6, cbY+8, 'Закрытый', 11, '#ffffff', true);
    txt(this, cbX+cbS+6, cbY+22, '(по заявке)', 9, '#a8b4d8');
    this.add.zone(cbX, cbY, cbS, cbS).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this._closedFlag = this._closedFlag ? 0 : 1;
        cbT.setText(this._closedFlag ? '🔒' : '🔓');
        drawCb();
        tg?.HapticFeedback?.impactOccurred('light');
      });

    y += 70;
    /* Описание */
    txt(this, 16, y, 'Описание (необязательно)', 12, '#ffffff', true);
    txt(this, 16, y+15, 'до 120 символов', 10, '#a8b4d8');
    this._descEl = this._makeInput(W, y+30, W-32, 32, 'Ищем активных бойцов', 120);

    y += 70;
    /* Эмблема */
    txt(this, 16, y, 'Эмблема клана', 12, '#ffffff', true);
    txt(this, 16, y+15, 'Влияет только на вид (бафф +5% золота у всех)', 10, '#a8b4d8');
    y += 32;

    this._selectedEmblem = 'neutral';
    const cardW = (W - 32 - 16) / 3, cardH = 76;
    const cards = [];
    CLAN_EMBLEMS.forEach((em, i) => {
      const cx = 16 + i * (cardW + 8);
      const cardG = this.add.graphics();
      const iconT = txt(this, cx + cardW/2, y + 22, em.icon, 22).setOrigin(0.5);
      const lblT  = txt(this, cx + cardW/2, y + 50, em.label, 10, em.color, true).setOrigin(0.5);
      const baffT = txt(this, cx + cardW/2, y + 64, '+5% 🪙', 9, '#a8b4d8').setOrigin(0.5);
      const draw = (sel) => {
        cardG.clear();
        cardG.fillStyle(sel ? 0x1c2238 : 0x141720, 1);
        cardG.fillRoundedRect(cx, y, cardW, cardH, 10);
        cardG.lineStyle(2, sel ? em.stroke : 0x252a38, sel ? 1 : 0.6);
        cardG.strokeRoundedRect(cx, y, cardW, cardH, 10);
      };
      draw(em.key === this._selectedEmblem);
      cards.push({ key: em.key, draw });
      this.add.zone(cx, y, cardW, cardH).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          this._selectedEmblem = em.key;
          cards.forEach(c => c.draw(c.key === em.key));
          tg?.HapticFeedback?.impactOccurred('light');
        });
    });

    y += cardH + 14;
    /* Кнопка создать */
    const btnH = 46;
    const bgC  = this.add.graphics();
    bgC.fillStyle(C.purple, 0.9); bgC.fillRoundedRect(16, y, W-32, btnH, 12);
    bgC.fillStyle(0xffffff, 0.08); bgC.fillRoundedRect(18, y+2, W-36, 22, 10);
    const btnT = txt(this, W/2, y+btnH/2, '⚔️  Основать клан  (800 🪙)', 14, '#ffffff', true).setOrigin(0.5);
    const btnRestore = () => {
      bgC.clear();
      bgC.fillStyle(C.purple, 0.9); bgC.fillRoundedRect(16, y, W-32, btnH, 12);
      bgC.fillStyle(0xffffff, 0.08); bgC.fillRoundedRect(18, y+2, W-36, 22, 10);
    };
    this.add.zone(16, y, W-32, btnH).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bgC.clear(); bgC.fillStyle(0x6600cc,1); bgC.fillRoundedRect(16,y,W-32,btnH,12); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  btnRestore)
      .on('pointerup',   () => { btnRestore(); this._doCreateV2(btnT); });

    txt(this, W/2, y+btnH+10, 'Имя и тег должны быть уникальны', 10, '#a8b4d8').setOrigin(0.5);
  },

  async _doCreateV2(btnT) {
    if (this._busy) return;
    const name = this._nameEl?.value?.trim() || '';
    const tag  = this._tagEl?.value?.trim()  || '';
    const desc = this._descEl?.value?.trim() || '';
    const minL = parseInt(this._minLvlEl?.value || '1', 10) || 1;
    if (name.length < 3) { this._toast('❌ Название минимум 3 символа'); return; }
    if (tag.length  < 2) { this._toast('❌ Тег минимум 2 символа'); return; }
    this._busy = true; btnT?.setText('Создаём...');
    try {
      const res = await post('/api/clan/create', {
        name, tag,
        emblem: this._selectedEmblem || 'neutral',
        description: desc,
        min_level: minL,
        closed: this._closedFlag || 0,
      });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success'); Sound.levelUp();
        if (res.player) State.player = res.player;
        this._toast(`🏰 Клан [${res.tag}] ${res.name} основан!`);
        this.time.delayedCall(700, () => this.scene.restart());
      } else { this._toast(`❌ ${res.reason}`); btnT?.setText('⚔️  Основать клан  (800 🪙)'); }
    } catch(_) { this._toast('❌ Нет соединения'); btnT?.setText('⚔️  Основать клан  (800 🪙)'); }
    this._busy = false;
  },

});
