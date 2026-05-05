/* ═══════════════════════════════════════════════════════════
   GuideScene — справочник для новичков и ветеранов.
   Вкладки сверху, карточки с вертикальным скроллом.
   Тап по карточке → попап с подробным описанием.
   Продолжение: scene_guide_ext1.js
   ═══════════════════════════════════════════════════════════ */

class GuideScene extends Phaser.Scene {
  constructor() { super('Guide'); }

  init() {
    try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.hide(); } catch(_) {}
    try { window._tabPlaceholderShow?.('gd-placeholder', { bg: 'linear-gradient(180deg,#0d0820 0%,#060412 100%)' }); } catch(_) {}
  }

  create() {
    try { window._closeAllTabOverlays?.(); } catch(_) {}
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
    try { window._tabPlaceholderHideNextFrame?.('gd-placeholder'); } catch(_) {}
    this._buildHeader();
    this._buildSectionTabs();
    this._switchSection('battle');
    this._setupScroll();
    this._loadCatalogPrices();
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

  /** Подгрузить цены из shop API и обновить карточки "Вещи" */
  async _loadCatalogPrices() {
    try {
      const res = await get('/api/shop/catalog');
      if (!res?.ok || !res.items) return;
      const cat = res.items;
      // Обновляем детали зелий
      const potions = GUIDE_CARDS.items?.find(c => c.title === 'Зелья HP');
      if (potions && cat.hp_small && cat.hp_medium && cat.hp_full) {
        potions.detail =
          `Зелья HP — покупай в Магазине:\n` +
          `• 🧪 Малое: ${cat.hp_small.desc} — ${cat.hp_small.price} ${cat.hp_small.currency === 'gold' ? '🪙' : '💎'}\n` +
          `• 🧪 Среднее: ${cat.hp_medium.desc} — ${cat.hp_medium.price} ${cat.hp_medium.currency === 'gold' ? '🪙' : '💎'}\n` +
          `• 🧪 Полное: ${cat.hp_full.desc} — ${cat.hp_full.price} ${cat.hp_full.currency === 'gold' ? '🪙' : '💎'}\n\n` +
          `Используй между боями чтобы быстрее вернуться в строй.`;
      }
      // Обновляем детали свитков
      const scrolls = GUIDE_CARDS.items?.find(c => c.title === 'Свитки статов');
      if (scrolls && cat.scroll_str_3) {
        const goldP = cat.scroll_str_3.price;
        const diaScroll = cat.scroll_str_5_d;
        scrolls.detail =
          `Свитки дают временный буст к стату:\n` +
          `• За золото: +3 к стату на 1 бой — ${goldP} 🪙\n` +
          (diaScroll ? `• За алмазы: +5 на 3 боя — ${diaScroll.price} 💎\n` : '') +
          `• За Stars/USDT: +7–10 на 5–7 боёв\n\n` +
          `Стакаются! Можно накинуть силу + крит одновременно.`;
      }
      // Обновляем ящики
      const boxes = GUIDE_CARDS.items?.find(c => c.title === 'Ящики (лутбоксы)');
      if (boxes && cat.box_common) {
        const cp = cat.box_common.price;
        const rp = cat.box_rare?.price;
        boxes.detail =
          `Открывай ящики — внутри случайные призы:\n` +
          `• 📦 Обычный (${cp}🪙): золото, малый свиток\n` +
          (rp ? `• 💜 Редкий (${rp}💎): больше лута + шанс эпика\n` : '') +
          `• 🟡 Эпический: топовые свитки, много золота`;
      }
      // Если уже на вкладке items — перерисовать
      if (this._activeSection === 'items') {
        this._renderCards(GUIDE_CARDS.items || []);
      }
    } catch (_) { /* каталог не загрузился — ок, останутся статические данные */ }
  }

  shutdown() {
    try { window._tabPlaceholderHide?.('gd-placeholder'); } catch(_) {}
    try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.show(); } catch(_) {}
    this.time.removeAllEvents();
  }
}
