/* ============================================================
   EquipmentScene — просмотр и покупка экипировки по слоту
   ============================================================ */

const _EQ_SLOT_LABEL = {
  weapon: { icon: '🗡️', name: 'Оружие' },
  shield: { icon: '🛡️', name: 'Щит' },
  armor:  { icon: '🥋', name: 'Броня' },
  belt:   { icon: '🪖', name: 'Шлем' },
  boots:  { icon: '👟', name: 'Ботинки' },
  ring1:  { icon: '💍', name: 'Кольцо 1' },
  ring2:  { icon: '💍', name: 'Кольцо 2' },
};

const _EQ_CATALOG = {
  weapon: [
    { id: 'sword_iron',  emoji:'🗡️', name:'Железный меч',  rarity:'common', price_gold:300,  price_diamonds:0,  desc:'+8 к урону' },
    { id: 'sword_steel', emoji:'⚔️', name:'Стальной меч',   rarity:'rare',   price_gold:1200, price_diamonds:0,  desc:'+20 к урону' },
    { id: 'sword_chaos', emoji:'🌀', name:'Клинок Хаоса',   rarity:'epic',   price_gold:0,    price_diamonds:25, desc:'+40 к урону' },
  ],
  shield: [],
  armor: [
    { id: 'armor_leather', emoji:'🥋', name:'Кожаная броня',  rarity:'common', price_gold:350,  price_diamonds:0,  desc:'-2% урона, +30 HP' },
    { id: 'armor_chain',   emoji:'⛓️', name:'Кольчуга',        rarity:'rare',   price_gold:1400, price_diamonds:0,  desc:'-5% урона, +80 HP' },
    { id: 'armor_dragon',  emoji:'🐉', name:'Броня Дракона',   rarity:'epic',   price_gold:0,    price_diamonds:30, desc:'-10% урона, +180 HP' },
  ],
  belt:  [],
  boots: [],
  ring1: [],
  ring2: [],
};

const _EQ_RC = { common: 0x667799, rare: 0x3399ee, epic: 0xaa55ff };
const _EQ_RC_HEX = { common: '#667799', rare: '#3399ee', epic: '#aa55ff' };

class EquipmentScene extends Phaser.Scene {
  constructor() { super('Equipment'); }

  create(data) {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._slot = (data && data.slot) || 'weapon';
    this._busy = false;

    _extraBg(this, W, H);
    const sl = _EQ_SLOT_LABEL[this._slot] || { icon: '⚙️', name: 'Экипировка' };
    _extraHeader(this, W, sl.icon, sl.name.toUpperCase(), 'Выберите предмет');
    makeBackBtn(this, 'Назад', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      State.playerLoadedAt = 0;
      this.scene.start('Menu', { returnTab: 'profile' });
    });
    this._build();
  }

  _build() {
    const { W, H } = this;
    const PAD = 12;
    const eq  = State.equipment || {};
    const p   = State.player || {};
    const items = _EQ_CATALOG[this._slot] || [];
    const slot  = this._slot;

    // Current gold/diamonds display
    const resY = 68;
    const resTxt = txt(this, PAD, resY, `💰 ${p.gold || 0}`, 12, '#ffc83c', true);
    this.add.existing(resTxt);
    txt(this, PAD + 88, resY, `💎 ${p.diamonds || 0}`, 12, '#3cc8dc', true);

    let y = 92;

    items.forEach(item => {
      const isEquipped = (eq[slot] || {}).item_id === item.id;
      const rc  = _EQ_RC[item.rarity]     || 0x444466;
      const rhx = _EQ_RC_HEX[item.rarity] || '#888888';

      // Card background
      const bg = this.add.graphics();
      const cardH = 72;
      if (isEquipped) {
        bg.fillStyle(rc, 0.18); bg.fillRoundedRect(PAD, y, W - PAD * 2, cardH, 12);
        bg.lineStyle(2, rc, 0.9); bg.strokeRoundedRect(PAD, y, W - PAD * 2, cardH, 12);
      } else {
        bg.fillStyle(0x1a1c28, 1); bg.fillRoundedRect(PAD, y, W - PAD * 2, cardH, 12);
        bg.lineStyle(1, rc, 0.4); bg.strokeRoundedRect(PAD, y, W - PAD * 2, cardH, 12);
      }

      // Emoji
      txt(this, PAD + 28, y + cardH / 2, item.emoji, 26).setOrigin(0.5);

      // Name + rarity
      txt(this, PAD + 58, y + 14, item.name, 13, '#f0f0fa', true).setOrigin(0, 0.5);
      txt(this, PAD + 58, y + 30, `${item.rarity.toUpperCase()}`, 9, rhx).setOrigin(0, 0.5);
      txt(this, PAD + 58, y + 46, item.desc, 10, 'rgba(255,255,255,0.55)').setOrigin(0, 0.5);

      // Price / status
      const btnW = 80, btnH = 28;
      const btnX = W - PAD - btnW, btnY = y + (cardH - btnH) / 2;
      const btnBg = this.add.graphics();

      if (isEquipped) {
        btnBg.fillStyle(0x226622, 1); btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
        txt(this, btnX + btnW / 2, btnY + btnH / 2, '✅ Надето', 10, '#88ff88', true).setOrigin(0.5);
        // Unequip zone
        const uz = this.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
        uz.on('pointerup', () => this._doUnequip(slot));
      } else {
        const priceStr = item.price_gold > 0 ? `${item.price_gold}💰` : `${item.price_diamonds}💎`;
        const canAfford = item.price_gold > 0 ? (p.gold || 0) >= item.price_gold : (p.diamonds || 0) >= item.price_diamonds;
        btnBg.fillStyle(canAfford ? rc : 0x333344, 1);
        btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
        txt(this, btnX + btnW / 2, btnY + btnH / 2, priceStr, 10, canAfford ? '#ffffff' : '#666688', true).setOrigin(0.5);
        if (canAfford) {
          const bz = this.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
          bz.on('pointerdown', () => { btnBg.clear(); btnBg.fillStyle(0x2a2a55, 1); btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10); });
          bz.on('pointerout',  () => { btnBg.clear(); btnBg.fillStyle(rc, 1); btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10); });
          bz.on('pointerup',   () => this._doBuy(item, slot));
        }
      }

      y += cardH + 8;
    });
  }

  async _doBuy(item, slot) {
    if (this._busy) return;
    this._busy = true;
    Sound.click();
    try {
      const res = await post('/api/equipment/equip', { item_id: item.id, slot });
      if (res && res.ok) {
        State.equipment = res.equipment || State.equipment;
        if (res.player) State.player = res.player;
        tg?.HapticFeedback?.notificationOccurred('success');
        this._busy = false;
        this.scene.restart({ slot });
      } else {
        this._busy = false;
        this._toast(res?.reason || 'Ошибка');
      }
    } catch(e) {
      this._busy = false;
      this._toast('Нет соединения');
    }
  }

  async _doUnequip(slot) {
    if (this._busy) return;
    this._busy = true;
    Sound.click();
    try {
      const res = await post('/api/equipment/unequip', { slot });
      if (res && res.ok) {
        State.equipment = res.equipment || State.equipment;
        if (res.player) State.player = res.player;
        this._busy = false;
        this.scene.restart({ slot });
      } else {
        this._busy = false;
        this._toast(res?.reason || 'Ошибка');
      }
    } catch(e) {
      this._busy = false;
      this._toast('Нет соединения');
    }
  }

  _toast(msg) {
    const t = txt(this, this.W / 2, this.H - 80, msg, 12, '#ff8888', true).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, y: this.H - 100, delay: 1500, duration: 500,
      onComplete: () => { try { t.destroy(); } catch(_) {} } });
  }

  shutdown() {
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
