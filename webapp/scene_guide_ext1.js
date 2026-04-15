/* ═══════════════════════════════════════════════════════════
   GuideScene — ext1: _renderCards, _showDetail
   ═══════════════════════════════════════════════════════════ */

Object.assign(GuideScene.prototype, {

  _renderCards(cards) {
    // Уничтожить предыдущие карточки
    if (this._cardContainer) {
      this._cardContainer.destroy(true);
      this._cardContainer = null;
    }

    const { W, H } = this;
    const con = this.add.container(0, 106);
    this._cardContainer = con;

    const GAP = 10;
    const CARD_W = W - 24;
    const CARD_H = 72;
    const PX = 12;
    let curY = 0;

    cards.forEach((card, i) => {
      const cy = curY;

      // Фон карточки
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.92);
      bg.fillRoundedRect(PX, cy, CARD_W, CARD_H, 12);
      bg.lineStyle(1, C.dark, 0.6);
      bg.strokeRoundedRect(PX, cy, CARD_W, CARD_H, 12);
      con.add(bg);

      // Иконка
      con.add(txt(this, PX + 28, cy + CARD_H / 2 - 2, card.icon, 24)
        .setOrigin(0.5).removeFromDisplayList());

      // Заголовок
      con.add(txt(this, PX + 56, cy + 16, card.title, 13, '#f0f0fa', true)
        .setOrigin(0, 0).removeFromDisplayList());

      // Описание (1 строка)
      con.add(txt(this, PX + 56, cy + 36, card.desc, 11, '#aaaacc')
        .setOrigin(0, 0).removeFromDisplayList());

      // Бейдж (если есть)
      if (card.badge) {
        const bx = PX + CARD_W - 14;
        const bby = cy + 14;
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(0x2a1a4a, 0.9);
        badgeBg.fillRoundedRect(bx - 44, bby, 40, 16, 6);
        con.add(badgeBg);
        con.add(txt(this, bx - 24, bby + 8, card.badge, 9, '#b888ff', true)
          .setOrigin(0.5).removeFromDisplayList());
      }

      // «Где:» индикатор (если есть)
      if (card.where) {
        con.add(txt(this, PX + 56, cy + 52, `📍 ${card.where}`, 9, '#888899')
          .setOrigin(0, 0).removeFromDisplayList());
      }

      // Стрелка → чтобы показать что карточка кликабельна
      con.add(txt(this, PX + CARD_W - 16, cy + CARD_H / 2, '›', 18, '#555577')
        .setOrigin(0.5).removeFromDisplayList());

      // Зона нажатия
      const zone = this.add.zone(PX + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H)
        .setInteractive({ useHandCursor: true });
      zone.removeFromDisplayList();
      zone.on('pointerdown', () => {
        bg.clear();
        bg.fillStyle(C.blue, 0.15);
        bg.fillRoundedRect(PX, cy, CARD_W, CARD_H, 12);
        bg.lineStyle(1.5, C.blue, 0.5);
        bg.strokeRoundedRect(PX, cy, CARD_W, CARD_H, 12);
        tg?.HapticFeedback?.selectionChanged();
      });
      zone.on('pointerup', (ptr) => {
        bg.clear();
        bg.fillStyle(C.bgPanel, 0.92);
        bg.fillRoundedRect(PX, cy, CARD_W, CARD_H, 12);
        bg.lineStyle(1, C.dark, 0.6);
        bg.strokeRoundedRect(PX, cy, CARD_W, CARD_H, 12);
        // Отличаем скролл от тапа (если палец не двигался сильно)
        if (Math.abs(ptr.y - ptr.downY) < 12) {
          Sound.click();
          this._showDetail(card);
        }
      });
      zone.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(C.bgPanel, 0.92);
        bg.fillRoundedRect(PX, cy, CARD_W, CARD_H, 12);
        bg.lineStyle(1, C.dark, 0.6);
        bg.strokeRoundedRect(PX, cy, CARD_W, CARD_H, 12);
      });
      con.add(zone);

      curY += CARD_H + GAP;
    });

    // Подсчёт максимального скролла
    const contentH = curY;
    const visibleH = H - 106;
    this._scrollMax = Math.max(0, contentH - visibleH + 16);
    this._scrollY = 0;
    this._applyScroll();
  },

  _showDetail(card) {
    showItemDetailPopup(this, {
      icon: card.icon,
      name: card.title,
      desc: card.detail || card.desc,
      badge: card.badge || null,
      depthBase: 200,
    });
  },

});
