/* ═══════════════════════════════════════════════════════════
   SHOP SCENE — магазин: Расходники / Свитки / Ящики / Звёзды / Купить
   ═══════════════════════════════════════════════════════════ */
class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) {
    this._tab = (data && data.tab) ? data.tab : (ShopScene._lastTab || 'consumables');
    ShopScene._lastTab = this._tab;
    this._shopPage = (data && typeof data.page === 'number') ? data.page : (ShopScene._lastPage || 0);
    ShopScene._lastPage = this._shopPage;
    this._buying = false;
    this._applyBusy = false;
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
      bg.fillStyle(active ? (isPay ? 0x1a5c8a : C.blue) : C.dark, active ? 0.92 : 0.55);
      bg.fillRoundedRect(tx, ty, tw - 4, 30, 8);
      if (active) {
        bg.lineStyle(1.5, isPay ? 0x3cc8dc : C.blue, 0.6);
        bg.strokeRoundedRect(tx, ty, tw - 4, 30, 8);
      }
      if (isPay && !active) {
        bg.lineStyle(1, 0x1a4055, 0.7);
        bg.strokeRoundedRect(tx, ty, tw - 4, 30, 8);
      }
      const labelColor = active ? '#ffffff' : (isPay ? '#3cc8dc' : '#8888aa');
      txt(this, tx + (tw - 4) / 2, ty + 15, tab.label, 9, labelColor, active).setOrigin(0.5);
      this.add.zone(tx, ty, tw - 4, 30).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this._tab === tab.key) return;
          tg?.HapticFeedback?.selectionChanged();
          ShopScene._lastPage = 0;
          this.scene.restart({ tab: tab.key, page: 0 });
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
      txt(this, W - 14, by + 11, 'Ваши алмазы', 11, '#9999bb').setOrigin(1, 0);
    } else {
      txt(this, W / 2 - 8, by + 11, '|', 13, '#7777aa').setOrigin(1, 0);
    }
  }

  /* ── Роутинг вкладок ──────────────────────────────────── */
  _buildItems(W, H) {
    if (this._tab === 'stars')   { this._buildStarsPanel(W, H);  return; }
    if (this._tab === 'special') { this._buildSpecialPanel(W, H); return; }
    const items = this._getItems();
    if (!items.length) return;
    const cols = 2, iw = (W - 32) / cols, ih = 110, startY = 162;
    const perPage = 6; // 3 ряда × 2 колонки
    const pageCount = Math.max(1, Math.ceil(items.length / perPage));
    const page = Math.min(this._shopPage || 0, pageCount - 1);
    this._shopPage = page;

    const slice = items.slice(page * perPage, (page + 1) * perPage);
    slice.forEach((item, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      this._makeItemCard(item, 8 + col * (iw + 8), startY + row * (ih + 10), iw, ih);
    });

    // Навигация страниц
    if (pageCount > 1) {
      const navY = H - 46;
      const mkNav = (x, label, nextPage) => {
        const g = this.add.graphics();
        g.fillStyle(0x2a2840, .95); g.fillRoundedRect(x - 42, navY, 84, 26, 7);
        g.lineStyle(1, C.blue, .6); g.strokeRoundedRect(x - 42, navY, 84, 26, 7);
        txt(this, x, navY + 13, label, 11, '#f0f0fa', true).setOrigin(.5);
        this.add.zone(x, navY + 13, 84, 26).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { ShopScene._lastPage = nextPage; this.scene.restart({ tab: this._tab, page: nextPage }); });
      };
      if (page > 0) mkNav(W / 2 - 64, '◀ Назад', page - 1);
      if (page < pageCount - 1) mkNav(W / 2 + 64, 'Вперёд ▶', page + 1);
      txt(this, W / 2, navY + 13, `${page + 1} / ${pageCount}`, 10, '#8888aa', true).setOrigin(.5);
    }
  }

  /* ── Каталог по вкладке ──────────────────────────────── */
  _getItems() {
    const p = State.player;
    const xpCharges = p?.xp_boost_charges || 0;
    if (this._tab === 'consumables') {
      return [
        { id: 'hp_small',    icon: '🧪', name: 'Малое зелье HP',   price: 12,  currency: 'gold',     desc: '+30% HP', hpPct: 0.30 },
        { id: 'hp_medium',   icon: '💊', name: 'Среднее зелье HP',  price: 25,  currency: 'gold',     desc: '+60% HP', hpPct: 0.60 },
        { id: 'hp_full',     icon: '⚗️', name: 'Полное зелье HP',  price: 50,  currency: 'gold',     desc: 'Полное HP', hpPct: 1.0 },
        { id: 'xp_boost_5',  icon: '⚡', name: 'XP Буст ×1.5',    price: 100, currency: 'gold',     desc: `5 боёв · активно: ${xpCharges}` },
        { id: 'xp_boost_20', icon: '⚡', name: 'XP Буст ×1.5',    price: 25,  currency: 'diamonds', desc: '20 боёв → инвентарь' },
        { id: 'xp_boost_x2', icon: '🚀', name: 'XP Буст ×2.0',    price: 40,  currency: 'diamonds', desc: '10 боёв → инвентарь' },
        { id: 'gold_hunt',   icon: '💰', name: 'Охота за золотом', price: 20,  currency: 'diamonds', desc: '+20% золото 24 ч → инвентарь' },
        { id: 'stat_reset',  icon: '🔄', name: 'Сброс статов',    price: 200, currency: 'diamonds', desc: 'Сброс всех статов' },
      ];
    }
    if (this._tab === 'scrolls') {
      return [
        // Gold — 1 бой
        { id: 'scroll_str_3',   icon: '⚔️', name: 'Эликсир силы +3',     price: 60,  currency: 'gold',     desc: 'Сила +3 · 1 бой',          badge: '1 бой' },
        { id: 'scroll_end_3',   icon: '🌀', name: 'Эликс. ловкости +3',   price: 60,  currency: 'gold',     desc: 'Ловкость +3 · 1 бой',       badge: '1 бой' },
        { id: 'scroll_crit_3',  icon: '🎯', name: 'Свиток крита +3',       price: 75,  currency: 'gold',     desc: 'Интуиция +3 · 1 бой',       badge: '1 бой' },
        { id: 'scroll_armor_6', icon: '🛡️', name: 'Свиток брони 6%',      price: 80,  currency: 'gold',     desc: 'Броня +6% · 1 бой',         badge: '1 бой' },
        { id: 'scroll_hp_100',  icon: '❤️', name: 'Эликсир HP +100',      price: 70,  currency: 'gold',     desc: '+100 HP · 1 бой',           badge: '1 бой' },
        { id: 'scroll_warrior', icon: '⚔️', name: 'Комбо Воина',          price: 110, currency: 'gold',     desc: 'Сила+2, Ловк+2 · 1 бой',    badge: '1 бой' },
        { id: 'scroll_shadow',  icon: '🌑', name: 'Комбо Тени',            price: 100, currency: 'gold',     desc: 'Ловк+3, Уворот+3% · 1 бой', badge: '1 бой' },
        { id: 'scroll_fury',    icon: '💥', name: 'Комбо Ярости',          price: 120, currency: 'gold',     desc: 'Сила+4, Крит+2 · 1 бой',    badge: '1 бой' },
        // Diamonds — 3 боя
        { id: 'scroll_str_6',    icon: '⚔️', name: 'Эликсир силы +6',     price: 20, currency: 'diamonds', desc: 'Сила +6 · 3 боя',           badge: '3 боя' },
        { id: 'scroll_end_6',    icon: '🌀', name: 'Эликс. ловкости +6',  price: 20, currency: 'diamonds', desc: 'Ловкость +6 · 3 боя',        badge: '3 боя' },
        { id: 'scroll_crit_6',   icon: '🎯', name: 'Свиток крита +6',      price: 25, currency: 'diamonds', desc: 'Интуиция +6 · 3 боя',        badge: '3 боя' },
        { id: 'scroll_dodge_5',  icon: '💨', name: 'Свиток уворота 5%',    price: 25, currency: 'diamonds', desc: 'Уворот +5% · 3 боя',         badge: '3 боя' },
        { id: 'scroll_armor_10', icon: '🛡️', name: 'Свиток брони 10%',    price: 30, currency: 'diamonds', desc: 'Броня +10% · 3 боя',         badge: '3 боя' },
        { id: 'scroll_hp_200',   icon: '❤️', name: 'Эликсир HP +200',     price: 25, currency: 'diamonds', desc: '+200 HP · 3 боя',            badge: '3 боя' },
        { id: 'scroll_double_10',icon: '⚡', name: 'Двойной удар +10%',   price: 35, currency: 'diamonds', desc: 'Двойной удар +10% · 3 боя',  badge: '3 боя' },
        { id: 'scroll_all_4',    icon: '✨', name: 'Все пассивки +4',     price: 40, currency: 'diamonds', desc: 'Все статы +4 · 1 бой',       badge: '1 бой' },
        { id: 'scroll_bastion',  icon: '🏰', name: 'Бастион',             price: 35, currency: 'diamonds', desc: 'Ловк+5, Броня+8% · 3 боя',   badge: '3 боя' },
        { id: 'scroll_predator', icon: '🐍', name: 'Хищник',              price: 35, currency: 'diamonds', desc: 'Крит+5, Двойн+8% · 3 боя',   badge: '3 боя' },
        { id: 'scroll_berserker',icon: '🔥', name: 'Берсерк',             price: 40, currency: 'diamonds', desc: 'Сила+8, Броня-5% · 3 боя',   badge: '3 боя', risk: true },
        { id: 'scroll_accuracy', icon: '🎯', name: 'Точность +15%',       price: 20, currency: 'diamonds', desc: 'Точность +15% · 3 боя',       badge: '3 боя' },
      ];
    }
    if (this._tab === 'boxes') {
      return [
        { id: 'exchange_small',  icon: '💱', name: '5💎 → 350🪙',       price: 5,   currency: 'diamonds', desc: 'Обмен алмазы → золото' },
        { id: 'exchange_medium', icon: '💱', name: '15💎 → 1100🪙',     price: 15,  currency: 'diamonds', desc: 'Лучший курс' },
        { id: 'exchange_large',  icon: '💱', name: '50💎 → 4000🪙',     price: 50,  currency: 'diamonds', desc: 'Максимальный курс' },
        { id: 'box_common',      icon: '📦', name: 'Обычный ящик',       price: 150, currency: 'gold',     desc: 'Случайный предмет' },
        { id: 'box_rare',        icon: '🟦', name: 'Редкий ящик',        price: 50,  currency: 'diamonds', desc: 'Ценный предмет · 5% USDT' },
      ];
    }
    return [];
  }

  /* ── Карточка товара ─────────────────────────────────── */
  _makeItemCard(item, ix, iy, iw, ih) {
    const canBuy = this._canAfford(item);
    const bg = this.add.graphics();
    this._drawCardBg(bg, ix, iy, iw, ih, true, canBuy);

    txt(this, ix + iw / 2, iy + 20, item.icon, 24).setOrigin(0.5);

    const name = txt(this, ix + iw / 2, iy + 50, item.name, 10, '#c0c0e0')
      .setOrigin(0.5).setWordWrapWidth(iw - 10);

    if (item.badge) {
      const bx = ix + iw - 4, by2 = iy + 4;
      const badgeG = this.add.graphics();
      badgeG.fillStyle(item.risk ? 0x7a1a1a : 0x1a3a6a, 0.9);
      badgeG.fillRoundedRect(bx - 34, by2, 34, 13, 4);
      txt(this, bx - 17, by2 + 6, item.badge, 8, item.risk ? '#ff8888' : '#88aaff').setOrigin(0.5);
    }

    if (item.hpPct && State.player) {
      const p = State.player;
      const cur = Math.min(1, (p.current_hp || 0) / Math.max(1, p.max_hp || 1));
      const addPct = Math.min(item.hpPct, 1 - cur);
      makeBar(this, ix + 8, iy + 68, iw - 16, 5, cur, C.red, C.dark, 3);
      if (addPct > 0) {
        const bw = iw - 16, prev = Math.round(bw * cur), add = Math.round(bw * addPct);
        const addG = this.add.graphics();
        addG.fillStyle(C.green, 0.75);
        addG.fillRoundedRect(ix + 8 + prev, iy + 68, add, 5, 2);
      }
    }

    // Цена
    const pIcon  = item.currency === 'diamonds' ? '💎' : '🪙';
    const pColor = item.currency === 'diamonds' ? '#3cc8dc' : '#ffc83c';
    txt(this, ix + iw / 2, iy + 90, `${pIcon} ${item.price}`,
      12, canBuy ? pColor : '#cc8888', true).setOrigin(0.5);

    // Зона клика
    this.add.zone(ix, iy, iw, ih).setOrigin(0)
      .setInteractive({ useHandCursor: canBuy })
      .on('pointerdown', () => {
        if (!canBuy || this._buying) return;
        this._drawCardBg(bg, ix, iy, iw, ih, true, true, true);
        tg?.HapticFeedback?.impactOccurred('medium');
      })
      .on('pointerup', () => {
        this._drawCardBg(bg, ix, iy, iw, ih, true, canBuy);
        if (!canBuy) { this._toastNoMoney(item); return; }
        if (this._buying) return;
        this._doBuy(item);
      })
      .on('pointerout', () => this._drawCardBg(bg, ix, iy, iw, ih, true, canBuy));
  }

  _drawCardBg(bg, ix, iy, iw, ih, avail, canBuy, pressed = false) {
    bg.clear();
    bg.fillStyle(pressed ? C.dark : C.bgPanel, avail ? 0.92 : 0.55);
    bg.fillRoundedRect(ix, iy, iw, ih, 12);
    if (canBuy) {
      bg.lineStyle(1.5, C.gold, pressed ? 0.7 : 0.35);
    } else if (avail) {
      bg.lineStyle(1, 0x553333, 0.5);
    }
    bg.strokeRoundedRect(ix, iy, iw, ih, 12);
  }

  _canAfford(item) {
    const p = State.player;
    if (!p) return false;
    return item.currency === 'diamonds'
      ? (p.diamonds || 0) >= item.price
      : (p.gold || 0) >= item.price;
  }

  /* ── Покупка ─────────────────────────────────────────── */
  async _doBuy(item) {
    if (this._buying) return;
    this._buying = true;
    try {
      const res = await post('/api/shop/buy', { item_id: item.id });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.buy();
        if (res.player) State.player = res.player;
        let msg = `✅ Куплено: ${item.name}`;
        if (res.hp_restored > 0) msg = `❤️ +${res.hp_restored} HP восстановлено!`;
        if (res.gold_gained)     msg = `💰 +${res.gold_gained} золота!`;
        if (res.added_to_inventory) msg = `📦 ${item.icon} ${item.name} → в инвентарь (открой в «Моё»)`;
        this._toast(msg);
        this._goldTxt?.setText(`🪙 ${State.player?.gold || 0}`);
        this._diaTxt?.setText(`💎 ${State.player?.diamonds || 0}`);
        this.time.delayedCall(400, () => this.scene.restart({ tab: this._tab, page: this._shopPage || 0 }));
      } else {
        tg?.HapticFeedback?.notificationOccurred('error');
        const detail = res._httpStatus ? ` (HTTP ${res._httpStatus})` : '';
        this._toast(`❌ ${res.reason || res.detail || 'Ошибка'}${detail}`);
        this._buying = false;
      }
    } catch(e) {
      this._toast(`❌ Сеть: ${e.message || 'нет соединения'}`);
      this._buying = false;
    }
  }

  _toastNoMoney(item) {
    const cur = item.currency === 'diamonds' ? 'алмазов' : 'золота';
    this._toast(`Нужно ${item.price} ${cur}`);
  }

  /* ── Вкладка "⭐ Звёзды" ─────────────────────────────── */
  async _buildStarsPanel(W, H) {
    let d;
    try { d = await get('/api/shop/packages'); }
    catch(_) { if (this.scene?.isActive('Shop')) txt(this, W/2, H/2, '❌ Нет соединения', 13, '#dc3c46').setOrigin(0.5); return; }
    if (!this.scene?.isActive('Shop') || this._tab !== 'stars') return;
    const starsPkgs = d.stars || [];
    let y = 162;
    const p = State.player;
    if (p?.is_premium) {
      const sb = this.add.graphics();
      sb.fillStyle(0x1a0a30, 0.95); sb.fillRoundedRect(8, y, W-16, 32, 9);
      sb.lineStyle(2, C.purple, 0.7); sb.strokeRoundedRect(8, y, W-16, 32, 9);
      txt(this, 20, y+10, '👑 Premium активен', 12, '#c8a0ff', true);
      txt(this, W-14, y+10, `ещё ${p.premium_days_left} дн.`, 11, '#8888aa').setOrigin(1, 0);
      y += 40;
    }
    makePanel(this, 8, y, W-16, 22, 8, 0.6);
    txt(this, 20, y+5, '⭐  TELEGRAM STARS', 12, '#ffc83c', true);
    txt(this, W-12, y+5, 'мгновенно', 11, '#9999bb').setOrigin(1, 0);
    y += 30;
    const pkgMain = starsPkgs.filter(pkg => pkg.id !== 'premium');
    const pkgW = (W - 32) / Math.max(1, pkgMain.length);
    pkgMain.forEach((pkg, i) => {
      const px = 8 + i * (pkgW + 8 / Math.max(1, pkgMain.length));
      this._makeStarsCard(pkg, px, y, pkgW - 4, 80);
    });
    y += 90;
    const premPkg = starsPkgs.find(pkg => pkg.id === 'premium');
    if (premPkg) { this._makePremiumCard(premPkg, 8, y, W-16, 52); y += 62; }
    y += 8;
    txt(this, W/2, y, '⭐ Telegram Stars — простая и быстрая оплата', 11, '#9999bb').setOrigin(0.5);
  }

  /* ── Вкладка "💵 Купить" (USDT) ─────────────────────── */
  async _buildSpecialPanel(W, H) {
    let d;
    try { d = await get('/api/shop/packages'); }
    catch(_) { if (this.scene?.isActive('Shop')) txt(this, W/2, H/2, '❌ Нет соединения', 13, '#dc3c46').setOrigin(0.5); return; }
    if (!this.scene?.isActive('Shop') || this._tab !== 'special') return;
    const cryptoPkgs = d.crypto || [];
    const scrollPkgs = d.usdt_scrolls || [];
    const cryptoOn   = d.cryptopay_enabled;
    let y = 162;
    const p = State.player;
    if (p?.is_premium) {
      const sb = this.add.graphics();
      sb.fillStyle(0x1a0a30, 0.95); sb.fillRoundedRect(8, y, W-16, 32, 9);
      sb.lineStyle(2, C.purple, 0.7); sb.strokeRoundedRect(8, y, W-16, 32, 9);
      txt(this, 20, y+10, '👑 Premium активен', 12, '#c8a0ff', true);
      txt(this, W-14, y+10, `ещё ${p.premium_days_left} дн.`, 11, '#8888aa').setOrigin(1, 0);
      y += 40;
    }
    if (!cryptoOn) {
      const cg = this.add.graphics();
      cg.fillStyle(C.bgPanel, 0.6); cg.fillRoundedRect(8, y, W-16, 56, 10);
      txt(this, W/2, y+18, '⚙️ CryptoPay не подключён', 11, '#9999bb').setOrigin(0.5);
      txt(this, W/2, y+36, 'Нужна переменная CRYPTOPAY_TOKEN', 11, '#7777aa').setOrigin(0.5);
      return;
    }

    // USDT-свитки сначала
    if (scrollPkgs.length) {
      makePanel(this, 8, y, W-16, 22, 8, 0.6);
      txt(this, 20, y+5, '📜  ОСОБЫЕ СВИТКИ', 12, '#3cc8dc', true);
      txt(this, W-12, y+5, 'USDT', 11, '#9999bb').setOrigin(1, 0);
      y += 30;
      const iw = (W - 32) / 2;
      scrollPkgs.forEach((pkg, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const ix = 8 + col * (iw + 8), iy = y + row * 74;
        this._makeUsdtScrollCard(pkg, ix, iy, iw - 4, 68);
      });
      y += Math.ceil(scrollPkgs.length / 2) * 74 + 8;
    }

    // Пакеты алмазов
    makePanel(this, 8, y, W-16, 22, 8, 0.6);
    txt(this, 20, y+5, '💎  АЛМАЗЫ / USDT', 12, '#3cc8dc', true);
    y += 30;
    const cpMain = cryptoPkgs.filter(pkg => !pkg.premium && !pkg.full_reset);
    const cpW = (W - 32) / Math.max(1, cpMain.length);
    cpMain.forEach((pkg, i) => {
      this._makeCryptoCard(pkg, 8 + i * (cpW + 8 / Math.max(1,cpMain.length)), y, cpW - 4, 80);
    });
    y += 90;
    const cpReset = cryptoPkgs.find(pkg => pkg.full_reset);
    if (cpReset) { this._makeCryptoResetCard(cpReset, 8, y, W-16, 88); y += 98; }
    const cpPrem = cryptoPkgs.find(pkg => pkg.premium);
    if (cpPrem) { this._makeCryptoPremiumCard(cpPrem, 8, y, W-16, 52); y += 62; }
    txt(this, W/2, y+4, '💡 После оплаты товар придёт автоматически', 11, '#9999bb').setOrigin(0.5);

    const pendingId = parseInt(localStorage.getItem('cryptoPendingInvoice') || '0');
    if (pendingId) {
      y += 22;
      const checkG = this.add.graphics();
      checkG.fillStyle(0x1a4055, 0.9); checkG.fillRoundedRect(8, y, W-16, 36, 9);
      checkG.lineStyle(1.5, 0x3cc8dc, 0.5); checkG.strokeRoundedRect(8, y, W-16, 36, 9);
      const checkT = txt(this, W/2, y+18, '🔄 Проверить оплату', 12, '#3cc8dc', true).setOrigin(0.5);
      this.add.zone(8, y, W-16, 36).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { checkG.clear(); checkG.fillStyle(0x0a2535,1); checkG.fillRoundedRect(8,y,W-16,36,9); })
        .on('pointerup', () => { checkT.setText('⏳ Проверяем...'); this._checkPendingInvoice(pendingId); });
    }
  }

  /* ── USDT-свиток карточка ─────────────────────────────── */
  _makeUsdtScrollCard(pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x0d2535, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 10);
    bg.lineStyle(1.5, 0x3cc8dc, 0.5); bg.strokeRoundedRect(ix, iy, iw, ih, 10);
    txt(this, ix + iw/2, iy + 18, pkg.label, 10, '#c8e8ff', true).setOrigin(0.5).setWordWrapWidth(iw-8);
    const btnG = this.add.graphics();
    btnG.fillStyle(0x1a6080, 1); btnG.fillRoundedRect(ix+4, iy+ih-22, iw-8, 17, 5);
    txt(this, ix+iw/2, iy+ih-14, `${pkg.usdt} USDT`, 11, '#3ce8ff', true).setOrigin(0.5);
    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x163548,1); bg.fillRoundedRect(ix,iy,iw,ih,10); tg?.HapticFeedback?.impactOccurred('medium'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x0d2535,0.95); bg.fillRoundedRect(ix,iy,iw,ih,10); bg.lineStyle(1.5,0x3cc8dc,0.5); bg.strokeRoundedRect(ix,iy,iw,ih,10); })
      .on('pointerup',   () => this._buyCrypto(pkg));
  }

  /* ── Stars карточки ──────────────────────────────────── */
  _makeStarsCard(pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x231e09, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(1.5, 0xffc83c, 0.6); bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    txt(this, ix+iw/2, iy+22, `💎 ${pkg.diamonds}`, 15, '#f0f0fa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+40, 'алмазов', 11, '#c8b870').setOrigin(0.5);
    const btnG = this.add.graphics();
    btnG.fillStyle(0xffa000, 1); btnG.fillRoundedRect(ix+4, iy+56, iw-8, 18, 6);
    txt(this, ix+iw/2, iy+65, `⭐ ${pkg.stars}`, 12, '#1a1208', true).setOrigin(0.5);
    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x332d10,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('medium'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x231e09,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(1.5,0xffc83c,0.6); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
      .on('pointerup',   () => this._buyStars(pkg));
  }

  _makePremiumCard(pkg, ix, iy, iw, ih) {
    const p = State.player || {}, isActive = !!p.is_premium;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a30, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, isActive ? 0xb45aff : C.purple, isActive ? 1.0 : 0.7);
    bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    txt(this, ix+20, iy+ih/2-2, '👑', 20).setOrigin(0, 0.5);
    txt(this, ix+50, iy+ih/2-8, 'Premium подписка', 12, '#c8a0ff', true);
    if (isActive) {
      txt(this, ix+50, iy+ih/2+8, `✅ Активна · ${p.premium_days_left} дн.`, 11, '#b45aff');
      txt(this, iw-4, iy+ih/2-2, '— куплено —', 11, '#888899').setOrigin(1, 0.5);
    } else {
      txt(this, ix+50, iy+ih/2+8, '+15% XP · ежедн. ящик · скидки', 11, '#8888aa');
      txt(this, iw-4, iy+ih/2-2, `⭐ ${pkg.stars}`, 12, '#ffc83c', true).setOrigin(1, 0.5);
      this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x2a0a40,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('heavy'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a0a30,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(2,C.purple,0.7); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
        .on('pointerup',   () => this._buyStars(pkg));
    }
  }

  _makeCryptoPremiumCard(pkg, ix, iy, iw, ih) {
    const p = State.player || {}, isActive = !!p.is_premium;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a30, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, isActive ? 0xb45aff : C.purple, isActive ? 1.0 : 0.7);
    bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    txt(this, ix+20, iy+ih/2-2, '👑', 20).setOrigin(0, 0.5);
    txt(this, ix+50, iy+ih/2-8, 'Premium подписка', 12, '#c8a0ff', true);
    if (isActive) {
      txt(this, ix+50, iy+ih/2+8, `✅ Активна · ${p.premium_days_left} дн.`, 11, '#b45aff');
      txt(this, iw-4, iy+ih/2-2, '— куплено —', 11, '#888899').setOrigin(1, 0.5);
    } else {
      txt(this, ix+50, iy+ih/2+8, '+15% XP · ежедн. ящик · скидки', 11, '#8888aa');
      txt(this, iw-4, iy+ih/2-2, `${pkg.usdt} USDT`, 12, '#3cc8dc', true).setOrigin(1, 0.5);
      this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x2a0a40,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('heavy'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a0a30,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(2,C.purple,0.7); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
        .on('pointerup',   () => this._buyCrypto(pkg));
    }
  }

  _makeCryptoCard(pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x0d2535, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(1.5, 0x3cc8dc, 0.6); bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    txt(this, ix+iw/2, iy+22, `💎 ${pkg.diamonds}`, 15, '#f0f0fa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+40, 'алмазов', 11, '#70bcd0').setOrigin(0.5);
    const btnG = this.add.graphics();
    btnG.fillStyle(0x1a6080, 1); btnG.fillRoundedRect(ix+4, iy+56, iw-8, 18, 6);
    txt(this, ix+iw/2, iy+65, `${pkg.usdt} USDT`, 12, '#3ce8ff', true).setOrigin(0.5);
    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x163548,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('medium'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x0d2535,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(1.5,0x3cc8dc,0.6); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
      .on('pointerup',   () => this._buyCrypto(pkg));
  }

  _makeCryptoResetCard(pkg, ix, iy, iw, ih) {
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1010, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, 0xff4444, 0.85); bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    txt(this, ix+iw/2, iy+12, pkg.label || '🔄 Сброс прогресса', 12, '#ffaaaa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+30, pkg.hint || 'Уровень с нуля; 💰💎 сохраняются', 9, '#997777', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+48, `Оплата: ${pkg.usdt} USDT`, 11, '#3ce8ff', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+66, 'После оплаты — /start или обновите приложение', 9, '#aa9999').setOrigin(0.5);
    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x351818,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x2a1010,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(2,0xff4444,0.85); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
      .on('pointerup',   () => this._buyCrypto(pkg));
  }

  /* ── Покупки ─────────────────────────────────────────── */
  async _buyStars(pkg) {
    if (this._buying) return;
    this._buying = true;
    this._toast('⏳ Открываем оплату...');
    try {
      const res = await post('/api/shop/stars_invoice', { package_id: pkg.id });
      if (!res.ok) { this._toast(`❌ ${res.reason}`); this._buying = false; return; }
      tg?.openInvoice(res.invoice_url, async (status) => {
        this._buying = false;
        if (status === 'paid') {
          tg?.HapticFeedback?.notificationOccurred('success');
          Sound.levelUp?.();
          this._toast('⏳ Активируем...');
          try {
            const confirm = await post('/api/shop/stars_confirm', { package_id: pkg.id });
            if (confirm.ok) {
              if (confirm.player) State.player = confirm.player;
              if (confirm.premium_activated) this._toast(`👑 Premium активирован!`);
              else this._toast(`✅ +${confirm.diamonds_added || pkg.diamonds} 💎 начислено!`);
            } else {
              this._toast('✅ Оплата прошла! Обновите профиль.');
            }
          } catch(_) { this._toast('✅ Оплата прошла! Обновите профиль.'); }
          this.time.delayedCall(1200, () => this.scene.restart({ tab: 'stars' }));
        } else if (status === 'cancelled') {
          this._toast('❌ Оплата отменена');
        }
      });
    } catch(_) { this._toast('❌ Нет соединения'); this._buying = false; }
  }

  async _buyCrypto(pkg) {
    if (this._buying) return;
    this._buying = true;
    this._toast('⏳ Создаём счёт...');
    try {
      const res = await post('/api/shop/crypto_invoice', { package_id: pkg.id });
      if (!res.ok) { this._toast(`❌ ${res.reason}`); this._buying = false; return; }
      localStorage.setItem('cryptoPendingInvoice', String(res.invoice_id));
      if (res.invoice_url) tg?.openLink?.(res.invoice_url);
      this._toast('💳 Счёт открыт — оплатите и вернитесь');
      this._buying = false;
      this._startCryptoPolling(res.invoice_id, pkg);
    } catch(_) { this._toast('❌ Нет соединения'); this._buying = false; }
  }

  _startCryptoPolling(invoiceId, pkg) {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const r = await get(`/api/shop/crypto_check/${invoiceId}`);
        if (r.ok && r.paid) {
          if (r.scroll_received) {
            this._onScrollReceived(r.scroll_id, invoiceId);
          } else {
            this._onCryptoPaid(r.diamonds || 0, invoiceId, r.premium_activated, r.bonus_diamonds || 0, !!r.profile_reset);
          }
          return;
        }
      } catch(_) {}
      if (attempts < 24 && this.scene.isActive?.('Shop')) this.time.delayedCall(5000, poll);
    };
    this.time.delayedCall(5000, poll);
  }

  async _checkPendingInvoice(invoiceId) {
    try {
      const r = await get(`/api/shop/crypto_check/${invoiceId}`);
      if (r.ok && r.paid) {
        if (r.scroll_received) this._onScrollReceived(r.scroll_id, invoiceId);
        else this._onCryptoPaid(r.diamonds || 0, invoiceId, r.premium_activated, r.bonus_diamonds || 0, !!r.profile_reset);
      } else { this._toast('⏳ Оплата ещё не подтверждена'); }
    } catch(_) { this._toast('❌ Нет соединения'); }
  }

  _onScrollReceived(scrollId, invoiceId) {
    tg?.HapticFeedback?.notificationOccurred('success');
    Sound.levelUp?.();
    localStorage.removeItem('cryptoPendingInvoice');
    this._toast('✅ Свиток получен! Открой «Статы → Моё → Особые»');
    post('/api/player').then(d => {
      if (d.ok && d.player) State.player = d.player;
      this.time.delayedCall(800, () => this.scene.restart({ tab: 'special' }));
    }).catch(() => this.time.delayedCall(800, () => this.scene.restart({ tab: 'special' })));
  }

  _onCryptoPaid(diamonds, invoiceId, isPremium, bonusDiamonds = 0, profileReset = false) {
    tg?.HapticFeedback?.notificationOccurred('success');
    Sound.levelUp?.();
    localStorage.removeItem('cryptoPendingInvoice');
    let msg = profileReset ? '🔄 Аккаунт сброшен.'
      : isPremium ? (bonusDiamonds > 0 ? `👑 Premium! +${bonusDiamonds} 💎` : '👑 Premium активирован!')
      : `✅ +${diamonds} 💎 начислено!`;
    this._toast(msg);
    post('/api/player').then(d => {
      if (d.ok && d.player) State.player = d.player;
      this.time.delayedCall(800, () => this.scene.restart({ tab: 'special' }));
    }).catch(() => this.time.delayedCall(800, () => this.scene.restart({ tab: 'special' })));
  }

  _toast(msg) {
    const t = txt(this, this.W / 2, this.H - 80, msg, 12, '#ffc83c', true).setOrigin(0.5);
    t.setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 36, duration: 2200, onComplete: () => t.destroy() });
  }
}
