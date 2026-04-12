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
      txt(this, W - 14, by + 11, 'Ваши алмазы', 11, '#9999bb').setOrigin(1, 0);
    } else {
      txt(this, W / 2 - 8, by + 11, '|', 13, '#7777aa').setOrigin(1, 0);
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
    const items = this._getItems();
    if (!items.length) return;
    const cols = 2, iw = (W - 32) / cols, ih = 110, startY = 162;
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
    items.forEach((item, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const ix = 8 + col * (iw + 8), iy = row * (ih + 10);
      this._makeItemCardInContainer(container, item, ix, iy, iw, ih);
      taps.push({ x: ix, y: iy, w: iw, h: ih, fn: () => {
        if (this._buying) return;
        if (!this._canAfford(item)) { this._toastNoMoney(item); return; }
        this._doBuy(item);
      }});
    });
    const totalRows = Math.ceil(items.length / cols);
    setContentH(totalRows * (ih + 10) + 10);
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
        { id: 'gold_hunt',   icon: '💰', name: 'Охота за золотом', price: 20,  currency: 'diamonds', desc: '+20% золото за бой · 24 ч → инвентарь' },
        { id: 'xp_hunt',     icon: '📚', name: 'Охота за опытом',  price: 20,  currency: 'diamonds', desc: '+50% опыта за бой · 24 ч → инвентарь' },
        { id: 'stat_reset',  icon: '🔄', name: 'Сброс статов',    price: 200, currency: 'diamonds', desc: 'Сброс всех статов' },
      ];
    }
    if (this._tab === 'scrolls') {
      return [
        // Gold — 1 бой
        { id: 'scroll_str_3',   icon: '⚔️', name: 'Эликсир силы +3',     price: 60,  currency: 'gold',     desc: 'Сила +3 · 1 бой',          badge: '1 бой' },
        { id: 'scroll_end_3',   icon: '🌀', name: 'Эликс. ловкости +3',   price: 60,  currency: 'gold',     desc: 'Ловкость +3 · 1 бой',       badge: '1 бой' },
        { id: 'scroll_crit_3',  icon: '🎯', name: 'Интуиция +3',           price: 75,  currency: 'gold',     desc: 'Интуиция +3 · 1 бой',       badge: '1 бой' },
        { id: 'scroll_armor_6', icon: '🛡️', name: 'Свиток брони 6%',      price: 80,  currency: 'gold',     desc: 'Броня +6% · 1 бой',         badge: '1 бой' },
        { id: 'scroll_hp_100',  icon: '❤️', name: 'Эликсир HP +100',      price: 70,  currency: 'gold',     desc: '+100 HP · 1 бой',           badge: '1 бой' },
        { id: 'scroll_warrior', icon: '⚔️', name: 'Комбо Воина',          price: 110, currency: 'gold',     desc: 'Сила+2, Ловк+2 · 1 бой',    badge: '1 бой' },
        { id: 'scroll_shadow',  icon: '🌑', name: 'Комбо Тени',            price: 100, currency: 'gold',     desc: 'Ловк+3, Уворот+3% · 1 бой', badge: '1 бой' },
        { id: 'scroll_fury',    icon: '💥', name: 'Комбо Ярости',          price: 120, currency: 'gold',     desc: 'Сила+4, Крит+2 · 1 бой',    badge: '1 бой' },
        // Diamonds — 3 боя
        { id: 'scroll_str_6',    icon: '⚔️', name: 'Эликсир силы +6',     price: 20, currency: 'diamonds', desc: 'Сила +6 · 3 боя',           badge: '3 боя' },
        { id: 'scroll_end_6',    icon: '🌀', name: 'Эликс. ловкости +6',  price: 20, currency: 'diamonds', desc: 'Ловкость +6 · 3 боя',        badge: '3 боя' },
        { id: 'scroll_crit_6',   icon: '🎯', name: 'Интуиция +6',          price: 25, currency: 'diamonds', desc: 'Интуиция +6 · 3 боя',        badge: '3 боя' },
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
}
