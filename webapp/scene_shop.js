/* ═══════════════════════════════════════════════════════════
   SHOP SCENE — магазин: Расходники / Свитки / Ящики / Звёзды / Купить
   Продолжение: scene_shop_ext1.js, scene_shop_ext2.js, scene_shop_ext3.js
   ═══════════════════════════════════════════════════════════ */
class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) {
    this._tab = (data && data.tab) ? data.tab : (ShopScene._lastTab || 'consumables');
    ShopScene._lastTab = this._tab;
    this._buying = false;
    this._applyBusy = false;
    this._swiping = false;
    this._gen = (this._gen || 0) + 1; // поколение для async race protection
  }

  async create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;

    _extraBg(this, W, H);
    _extraHeader(this, W, '🛍️', 'МАГАЗИН', 'Зелья · Свитки · Ящики · Особые');
    _extraBack(this);
    this._buildTabBar(W, H);

    try {
      const d = await post('/api/player');
      if (d.ok && d.player) State.player = d.player;
    } catch(_) {}

    this._buildBalance(W);
    this._buildItems(W, H);
  }

  /* ── Вкладки ─────────────────────────────────────────── */
  _buildTabBar(W, H) {
    const tabs = [
      { key: 'consumables', label: '🧪 Зелья'  },
      { key: 'scrolls',     label: '📜 Свитки' },
      { key: 'boxes',       label: '🎲 Ящики'  },
      { key: 'stars',       label: '⭐ Звёзды' },
      { key: 'special',     label: '💵 Купить' },
    ];
    const tw = (W - 24) / tabs.length;
    const ty = 76;
    tabs.forEach((tab, i) => {
      const tx     = 12 + i * tw;
      const active = tab.key === this._tab;
      const isPay  = tab.key === 'stars' || tab.key === 'special';
      const bg = this.add.graphics();
      bg.fillStyle(active ? C.bgPanel : 0x000000, active ? 0.95 : 0.2);
      bg.fillRoundedRect(tx, ty, tw - 4, 30, 8);
      if (active) {
        bg.lineStyle(1.5, isPay ? 0x3cc8dc : C.gold, 0.6);
        bg.strokeRoundedRect(tx, ty, tw - 4, 30, 8);
      }
      if (isPay && !active) {
        bg.lineStyle(1, 0x1a4055, 0.5);
        bg.strokeRoundedRect(tx, ty, tw - 4, 30, 8);
      }
      const labelColor = active ? (isPay ? '#3cc8dc' : '#ffc83c') : (isPay ? '#3c8898' : '#bbbbcc');
      txt(this, tx + (tw - 4) / 2, ty + 15, tab.label, 9, labelColor, active).setOrigin(0.5);
      this.add.zone(tx, ty, tw - 4, 30).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this._tab === tab.key) return;
          tg?.HapticFeedback?.selectionChanged();
          this.scene.restart({ tab: tab.key });
        });
    });
  }

  /* ── Баланс ──────────────────────────────────────────── */
  _buildBalance(W) {
    const p  = State.player;
    const by = 114;
    makePanel(this, 8, by, W - 16, 38, 8, 0.95);
    const isPay = this._tab === 'stars' || this._tab === 'special';
    this._goldTxt = txt(this, W / 2 + 8, by + 11, `🪙 ${p?.gold || 0}`,
      isPay ? 11 : 13, '#ffc83c', true).setOrigin(0, 0);
    this._diaTxt  = txt(this, 20, by + 11, `💎 ${p?.diamonds || 0}`,
      isPay ? 15 : 13, '#3cc8dc', true);
    if (isPay) {
      txt(this, W - 14, by + 11, 'Ваши алмазы', 11, '#ccccdd').setOrigin(1, 0);
    } else {
      txt(this, W / 2 - 8, by + 11, '|', 13, '#ddddff').setOrigin(1, 0);
    }
  }

  /* ── Скролл с инерцией и тапом (аналог TasksScene) ──── */
  _makeScrollZone(W, H, startY, opts) {
    opts = opts || {};
    const viewH = H - startY - 10;
    const zone = this.add.zone(0, startY, W, viewH).setOrigin(0).setInteractive();
    const container = this.add.container(0, startY);
    let baseY = 0, sx = 0, sy = 0, dragY = 0;
    let vel = 0, lastY = 0, lastT = 0, active = false;
    const clamp = y => Math.min(0, Math.max(-(container._contentH || 0) + viewH, y));
    zone.on('pointerdown', p => {
      sx = p.x; sy = p.y; dragY = baseY; vel = 0;
      lastY = p.y; lastT = this.game.loop.now;
      active = true; this._swiping = false;
    });
    zone.on('pointermove', p => {
      if (!active) return;
      const dx = p.x - sx, dy = p.y - sy;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (adx > 12 && adx > ady * 1.5) { this._swiping = true; }
      if (this._swiping || (ady < 8 && adx < 12)) return;
      const now = this.game.loop.now, dt = now - lastT;
      if (dt > 0) vel = (p.y - lastY) / dt * 16;
      lastY = p.y; lastT = now;
      baseY = clamp(dragY + dy);
      container.setY(startY + baseY);
    });
    zone.on('pointerup', p => {
      if (!active) return; active = false;
      const dy = p.y - sy, ady = Math.abs(dy);
      if (ady < 10 && !this._swiping && opts.onTap) {
        vel = 0;
        opts.onTap(p.y - container.y, p.x);
        return;
      }
      this._swiping = false;
    });
    zone.on('pointerout', () => { active = false; });
    this._scrollFn = () => {
      if (Math.abs(vel) < 0.15) { vel = 0; return; }
      baseY = clamp(baseY + vel); vel *= 0.88;
      container.setY(startY + baseY);
    };
    return { container, setContentH: h => { container._contentH = h; } };
  }

  update() { if (this._scrollFn) this._scrollFn(); }

  /* ── Роутинг вкладок ──────────────────────────────────── */
  _buildItems(W, H) {
    if (this._tab === 'stars')   { this._buildStarsPanel(W, H);  return; }
    if (this._tab === 'special') { this._buildSpecialPanel(W, H); return; }
    const startY = 162;
    const taps = [];
    const { container, setContentH } = this._makeScrollZone(W, H, startY, {
      onTap: (relY, relX) => {
        for (const t of taps) {
          if (relY >= t.y && relY < t.y + t.h && relX >= t.x && relX < t.x + t.w) {
            t.fn(); return;
          }
        }
      },
    });
    let y = 0;
    const PAD = 8;
    const tapItem = (item) => () => {
      if (this._buying) return;
      if (!this._canAfford(item)) { this._toastNoMoney(item); return; }
      this._doBuy(item);
    };

    if (this._tab === 'consumables') {
      const items = this._getItems();
      const featured = items.slice(0, 2);
      const rest = items.slice(2);
      const detailItem = (item) => () => this._showItemDetail(item);
      // Featured
      y = this._renderSectionLabel(container, PAD, y, W, '⭐  РЕКОМЕНДУЕМ');
      featured.forEach(item => {
        const btn = this._renderFeaturedCard(container, item, PAD, y, W - PAD * 2);
        // Кнопка цены → прямая покупка
        taps.push({ x: btn.btnX, y: btn.btnY, w: btn.btnW, h: btn.btnH, fn: tapItem(item) });
        // Остальная карточка → попап
        taps.push({ x: PAD, y, w: W - PAD * 2 - btn.btnW - 10, h: 66, fn: detailItem(item) });
        y += 74;
      });
      // Rest
      y = this._renderSectionLabel(container, PAD, y, W, '🧪  ВСЕ ЗЕЛЬЯ И БУСТЫ');
      rest.forEach(item => {
        const btn = this._renderRowCard(container, item, PAD, y, W - PAD * 2);
        // Кнопка цены → прямая покупка
        taps.push({ x: btn.btnX, y: btn.btnY, w: btn.btnW, h: btn.btnH, fn: tapItem(item) });
        // Остальная карточка → попап
        taps.push({ x: PAD, y, w: btn.btnX - PAD, h: 38, fn: detailItem(item) });
        y += 42;
      });
    } else if (this._tab === 'scrolls') {
      const items = this._getItems();
      const gold = items.filter(i => i.currency === 'gold');
      const dia  = items.filter(i => i.currency === 'diamonds');
      // Gold scrolls — featured top 2
      y = this._renderSectionLabel(container, PAD, y, W, '🪙  ЗОЛОТЫЕ СВИТКИ · 1 бой');
      const goldFeat = gold.slice(0, 2), goldRest = gold.slice(2);
      goldFeat.forEach(item => {
        this._renderFeaturedCard(container, item, PAD, y, W - PAD * 2);
        taps.push({ x: PAD, y, w: W - PAD * 2, h: 66, fn: tapItem(item) });
        y += 74;
      });
      goldRest.forEach(item => {
        this._renderRowCard(container, item, PAD, y, W - PAD * 2);
        taps.push({ x: PAD, y, w: W - PAD * 2, h: 38, fn: tapItem(item) });
        y += 42;
      });
      // Diamond scrolls
      y += 4;
      y = this._renderSectionLabel(container, PAD, y, W, '💎  АЛМАЗНЫЕ СВИТКИ · 3 боя');
      const diaFeat = dia.slice(0, 2), diaRest = dia.slice(2);
      diaFeat.forEach(item => {
        this._renderFeaturedCard(container, item, PAD, y, W - PAD * 2);
        taps.push({ x: PAD, y, w: W - PAD * 2, h: 66, fn: tapItem(item) });
        y += 74;
      });
      diaRest.forEach(item => {
        this._renderRowCard(container, item, PAD, y, W - PAD * 2);
        taps.push({ x: PAD, y, w: W - PAD * 2, h: 38, fn: tapItem(item) });
        y += 42;
      });
    } else if (this._tab === 'boxes') {
      const items = this._getItems();
      const exchanges = items.filter(i => i.id.startsWith('exchange'));
      const boxes = items.filter(i => i.id.startsWith('box'));
      y = this._renderSectionLabel(container, PAD, y, W, '💱  ОБМЕН ВАЛЮТ');
      exchanges.forEach(item => {
        this._renderFeaturedCard(container, item, PAD, y, W - PAD * 2);
        taps.push({ x: PAD, y, w: W - PAD * 2, h: 66, fn: tapItem(item) });
        y += 74;
      });
      y += 4;
      y = this._renderSectionLabel(container, PAD, y, W, '📦  ЯЩИКИ');
      boxes.forEach(item => {
        this._renderFeaturedCard(container, item, PAD, y, W - PAD * 2);
        taps.push({ x: PAD, y, w: W - PAD * 2, h: 66, fn: tapItem(item) });
        y += 74;
      });
    }
    setContentH(y + 10);
  }

  shutdown() {
    this.time.removeAllEvents();
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
