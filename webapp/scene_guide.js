/* ═══════════════════════════════════════════════════════════
   GuideScene — справочник для новичков и ветеранов.
   Вкладки сверху, карточки с вертикальным скроллом.
   Тап по карточке → попап с подробным описанием.
   Продолжение: scene_guide_ext1.js
   ═══════════════════════════════════════════════════════════ */

class GuideScene extends Phaser.Scene {
  constructor() { super('Guide'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._activeSection = null;
    this._cardObjs = [];
    this._scrollY = 0;
    this._scrollMax = 0;
    this._dragging = false;
    this._dragStartY = 0;
    this._dragStartScroll = 0;

    this._drawBg();
    this._buildHeader();
    this._buildSectionTabs();
    this._switchSection('battle');
    this._setupScroll();
  }

  _drawBg() {
    const g = this.add.graphics();
    g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
    g.fillRect(0, 0, this.W, this.H);
  }

  _buildHeader() {
    const { W } = this;
    makeBackBtn(this, '‹', () => {
      Sound.click();
      this.scene.start('Menu', { returnTab: 'more' });
    });
    txt(this, W / 2, 36, '📖 Справка', 18, '#ffc83c', true).setOrigin(0.5);
  }

  _buildSectionTabs() {
    const { W } = this;
    const tabs = GUIDE_SECTIONS;
    const tabY = 66;
    const tabW = (W - 20) / tabs.length;
    this._sectionBtns = {};

    const bg = this.add.graphics();
    bg.fillStyle(C.dark, 0.7);
    bg.fillRoundedRect(8, tabY - 2, W - 16, 36, 10);

    tabs.forEach((tab, i) => {
      const cx = 10 + tabW * i + tabW / 2;
      const cy = tabY + 16;

      const activeBg = this.add.graphics();
      activeBg.setVisible(false);

      const label = txt(this, cx, cy, `${tab.icon} ${tab.label}`, 11, '#ccccee')
        .setOrigin(0.5);

      const zone = this.add.zone(cx, cy, tabW, 34)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        Sound.tab();
        tg?.HapticFeedback?.selectionChanged();
        this._switchSection(tab.key);
      });

      this._sectionBtns[tab.key] = { activeBg, label, cx, cy, tabW };
    });
  }

  _switchSection(key) {
    if (this._activeSection === key) return;
    this._activeSection = key;
    this._scrollY = 0;

    // Обновить вкладки
    Object.entries(this._sectionBtns).forEach(([k, btn]) => {
      const active = k === key;
      btn.activeBg.clear();
      if (active) {
        btn.activeBg.setVisible(true);
        btn.activeBg.fillStyle(C.gold, 0.15);
        btn.activeBg.fillRoundedRect(
          btn.cx - btn.tabW / 2 + 2, btn.cy - 15, btn.tabW - 4, 30, 8
        );
      } else {
        btn.activeBg.setVisible(false);
      }
      btn.label.setStyle({
        color: active ? '#ffc83c' : '#ccccee',
        fontStyle: active ? 'bold' : 'normal',
      });
    });

    this._renderCards(GUIDE_CARDS[key] || []);
  }

  _setupScroll() {
    const CONTENT_TOP = 106;
    this.input.on('pointerdown', (ptr) => {
      if (ptr.y < CONTENT_TOP) return;
      this._dragging = true;
      this._dragStartY = ptr.y;
      this._dragStartScroll = this._scrollY;
    });
    this.input.on('pointermove', (ptr) => {
      if (!this._dragging) return;
      const dy = ptr.y - this._dragStartY;
      this._scrollY = Math.max(
        -this._scrollMax,
        Math.min(0, this._dragStartScroll + dy)
      );
      this._applyScroll();
    });
    this.input.on('pointerup', () => { this._dragging = false; });
  }

  _applyScroll() {
    if (!this._cardContainer) return;
    this._cardContainer.y = 106 + this._scrollY;
  }

  shutdown() {
    this.time.removeAllEvents();
  }
}
