/* ============================================================
   WarriorSelect — оверлей выбора воина (открывается из MenuScene)
   MenuScene получает: _openWarriorSelect, _closeWarriorSelect,
                       _selectWarriorType
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _openWarriorSelect() {
    if (this._warriorSelectOverlay) return;
    const { W, H } = this;

    const overlay = this.add.container(0, 0).setDepth(100);
    this._warriorSelectOverlay = overlay;

    // Тёмный фон
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.75);
    backdrop.fillRect(0, 0, W, H);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains);
    backdrop.on('pointerup', () => this._closeWarriorSelect());
    overlay.add(backdrop);

    // Панель
    const pw = W - 24, ph = 330, px = 12, py = (H - ph) / 2;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1830, 1); panel.fillRoundedRect(px, py, pw, ph, 16);
    panel.lineStyle(1.5, 0x5096ff, 0.5); panel.strokeRoundedRect(px, py, pw, ph, 16);
    overlay.add(panel);

    overlay.add(txt(this, W / 2, py + 22, '⚔️  ВЫБЕРИ ВОИНА', 15, '#ffc83c', true).setOrigin(0.5));
    overlay.add(txt(this, W / 2, py + 40, 'Он появится в профиле и боях', 10, '#7777aa').setOrigin(0.5));

    const types = [
      { key: 'tank',    face: 'warrior_tank_face',    name: 'Берсерк',      stat: '💪 Сила',     col: '#ff6655' },
      { key: 'agile',   face: 'warrior_agile_face',   name: 'Теневой Вихрь',stat: '🤸 Ловкость', col: '#00ff88' },
      { key: 'crit',    face: 'warrior_crit_face',    name: 'Хаос-Рыцарь',  stat: '💥 Интуиция', col: '#cc66ff' },
      { key: 'neutral', face: 'warrior_neutral_face', name: 'Легионер',     stat: '🛡 Нейтрал',  col: '#ccbb88' },
    ];

    const curType = State.player?.warrior_type || 'default';
    const cw = (pw - 24) / 2, ch = 104, gap = 8;

    types.forEach((t, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const cx = px + 12 + col * (cw + gap);
      const cy = py + 56 + row * (ch + gap);
      const sel = t.key === curType;

      const cbg = this.add.graphics();
      cbg.fillStyle(sel ? 0x1a2e44 : 0x141220, 1);
      cbg.fillRoundedRect(cx, cy, cw, ch, 10);
      cbg.lineStyle(sel ? 2 : 1, sel ? 0x5096ff : 0x2e2a50, 1);
      cbg.strokeRoundedRect(cx, cy, cw, ch, 10);
      overlay.add(cbg);

      const faceImg = this.add.image(cx + cw / 2, cy + 30, t.face).setScale(1.05).setOrigin(0.5);
      overlay.add(faceImg);
      overlay.add(txt(this, cx + cw / 2, cy + 66, t.name,  12, t.col,    true).setOrigin(0.5));
      overlay.add(txt(this, cx + cw / 2, cy + 82, t.stat,  10, '#9999bb').setOrigin(0.5));
      if (sel) overlay.add(txt(this, cx + cw - 6, cy + 6, '✓', 13, '#5096ff', true).setOrigin(1, 0));

      const zone = this.add.zone(cx + cw / 2, cy + ch / 2, cw - 2, ch - 2).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        cbg.clear();
        cbg.fillStyle(0x1a3050, 1); cbg.fillRoundedRect(cx, cy, cw, ch, 10);
        tg?.HapticFeedback?.selectionChanged();
      });
      zone.on('pointerup', () => {
        Sound.click();
        this._selectWarriorType(t.key);
        this._closeWarriorSelect();
      });
      overlay.add(zone);
    });

    // Кнопка закрытия
    const closeY = py + ph - 42;
    const cbg2 = this.add.graphics();
    cbg2.fillStyle(0x28243c, 1); cbg2.fillRoundedRect(px + 12, closeY, pw - 24, 32, 10);
    overlay.add(cbg2);
    overlay.add(txt(this, W / 2, closeY + 16, 'Закрыть', 12, '#777799').setOrigin(0.5));
    const closeZone = this.add.zone(W / 2, closeY + 16, pw - 24, 32).setInteractive({ useHandCursor: true });
    closeZone.on('pointerup', () => this._closeWarriorSelect());
    overlay.add(closeZone);
  },

  _closeWarriorSelect() {
    if (!this._warriorSelectOverlay) return;
    this._warriorSelectOverlay.destroy(true);
    this._warriorSelectOverlay = null;
  },

  async _selectWarriorType(type) {
    if (!State.player) return;
    State.player.warrior_type = type;
    // Перестроить панель профиля с новым воином
    if (this._panels.profile) { this._panels.profile.destroy(); this._panels.profile = null; }
    this._buildProfilePanel();
    if (this._activeTab === 'profile') this._switchTab('profile');
    // Сохранить на сервер (fire-and-forget)
    post('/api/warrior-type', { warrior_type: type }).catch(() => null);
  },

});
