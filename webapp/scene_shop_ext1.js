/* ═══════════════════════════════════════════════════════════
   ShopScene ext1 — _getItems (каталог), _canAfford, _doBuy
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

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
        { id: 'gold_hunt',   icon: '💰', name: 'Охота за золотом', price: 20,  currency: 'diamonds', desc: '+20% золото · 24ч → инвентарь' },
        { id: 'xp_hunt',     icon: '📚', name: 'Охота за опытом',  price: 20,  currency: 'diamonds', desc: '+50% опыта · 24ч → инвентарь' },
        { id: 'stat_reset',  icon: '🔄', name: 'Сброс статов',    price: 200, currency: 'diamonds', desc: 'Сброс всех статов' },
      ];
    }
    if (this._tab === 'scrolls') {
      return [
        { id: 'scroll_str_3',   icon: '⚔️', name: 'Эликсир силы +3',     price: 60,  currency: 'gold',     desc: 'Сила +3 · 1 бой',          badge: '1 бой' },
        { id: 'scroll_end_3',   icon: '🌀', name: 'Эликс. ловкости +3',   price: 60,  currency: 'gold',     desc: 'Ловкость +3 · 1 бой',       badge: '1 бой' },
        { id: 'scroll_crit_3',  icon: '🎯', name: 'Интуиция +3',           price: 75,  currency: 'gold',     desc: 'Интуиция +3 · 1 бой',       badge: '1 бой' },
        { id: 'scroll_armor_6', icon: '🛡️', name: 'Свиток брони 6%',      price: 80,  currency: 'gold',     desc: 'Броня +6% · 1 бой',         badge: '1 бой' },
        { id: 'scroll_hp_100',  icon: '❤️', name: 'Эликсир HP +100',      price: 70,  currency: 'gold',     desc: '+100 HP · 1 бой',           badge: '1 бой' },
        { id: 'scroll_warrior', icon: '⚔️', name: 'Комбо Воина',          price: 110, currency: 'gold',     desc: 'Сила+2, Ловк+2 · 1 бой',    badge: '1 бой' },
        { id: 'scroll_shadow',  icon: '🌑', name: 'Комбо Тени',            price: 100, currency: 'gold',     desc: 'Ловк+3, Уворот+3% · 1 бой', badge: '1 бой' },
        { id: 'scroll_fury',    icon: '💥', name: 'Комбо Ярости',          price: 120, currency: 'gold',     desc: 'Сила+4, Крит+2 · 1 бой',    badge: '1 бой' },
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
        { id: 'box_common',      icon: '📦', name: 'Обычный ящик',       price: 150, currency: 'gold',     desc: '2–4 свитка, 5% алмазный' },
        { id: 'box_rare',        icon: '🟦', name: 'Редкий ящик',        price: 50,  currency: 'diamonds', desc: '3–6 алмазных, 3% Premium' },
        { id: 'box_rare_c',      icon: '🟪', name: 'Редкий ящик+',       price: 80,  currency: 'diamonds', desc: '2 гарант + бонусы, 5% джекпот' },
      ];
    }
    return [];
  },

  _canAfford(item) {
    const p = State.player;
    if (!p) return false;
    return item.currency === 'diamonds'
      ? (p.diamonds || 0) >= item.price
      : (p.gold || 0) >= item.price;
  },

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
        this.time.delayedCall(400, () => this.scene.restart({ tab: this._tab }));
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
  },

  _toastNoMoney(item) {
    const cur = item.currency === 'diamonds' ? 'алмазов' : 'золота';
    this._toast(`Нужно ${item.price} ${cur}`);
  },

});
