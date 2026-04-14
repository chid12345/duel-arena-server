/* ═══════════════════════════════════════════════════════════
   AvatarScene — каталог образов с табами и скроллом
   ═══════════════════════════════════════════════════════════ */
const _AV_TABS = [
  { key: 'all',     label: 'Все' },
  { key: 'mine',    label: 'Мои' },
  { key: 'base',    label: '🆓' },
  { key: 'gold',    label: '💰' },
  { key: 'diamond', label: '💎' },
  { key: 'premium', label: '⭐' },
];

const _AV_RARITY_CLR = {
  common:    { bg: 0x22223a, border: 0x555566, text: '#aaaacc' },
  rare:      { bg: 0x1a2844, border: 0x3366aa, text: '#7ab4ff' },
  epic:      { bg: 0x2a1844, border: 0x7733bb, text: '#b45aff' },
  legendary: { bg: 0x2a2210, border: 0xaa8822, text: '#ffc83c' },
};

class AvatarScene extends Phaser.Scene {
  constructor() { super('Avatar'); }

  create(data) {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._tab = (data && data.tab) || 'all';
    this._scrollY = 0;
    this._layer = [];
    this._tapAreas = [];

    _extraBg(this, W, H);
    _extraHeader(this, W, '🎭', 'ОБРАЗЫ', 'Выбери стиль — бонусы к статам');
    _extraBack(this);

    this._loading = txt(this, W / 2, H / 2, 'Загрузка...', 13, '#888').setOrigin(0.5);
    this._loadData();
  }

  async _loadData() {
    try {
      const r = await fetch(`/api/avatars?init_data=${encodeURIComponent(tgInitData)}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.reason || 'error');
      this._avatars = j.avatars || [];
      this._equipped = j.equipped_avatar_id || 'base_neutral';
    } catch (e) {
      this._avatars = [];
      this._equipped = 'base_neutral';
    }
    if (this._loading) { this._loading.destroy(); this._loading = null; }
    this._buildTabs();
    this._renderGrid();
  }

  _buildTabs() {
    const W = this.W;
    const tabW = Math.floor((W - 16) / _AV_TABS.length) - 4;
    const ty = 72;
    _AV_TABS.forEach((t, i) => {
      const tx = 10 + i * (tabW + 4);
      const active = this._tab === t.key;
      const bg = this.add.graphics();
      bg.fillStyle(active ? 0x3366aa : 0x1a1830, active ? 0.9 : 0.85);
      bg.fillRoundedRect(tx, ty, tabW, 26, 8);
      if (active) { bg.lineStyle(1.5, 0x7ab4ff, 1); bg.strokeRoundedRect(tx, ty, tabW, 26, 8); }
      const lbl = txt(this, tx + tabW / 2, ty + 13, t.label, 10, active ? '#ffffff' : '#888', active);
      lbl.setOrigin(0.5);
      this.add.zone(tx + tabW / 2, ty + 13, tabW, 26).setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this._tab === t.key) return;
          Sound.click();
          this.scene.restart({ tab: t.key });
        });
    });
  }

  _filterAvatars() {
    const tab = this._tab;
    if (tab === 'all') return this._avatars;
    if (tab === 'mine') return this._avatars.filter(a => a.unlocked);
    return this._avatars.filter(a => a.tier === tab);
  }

  _priceText(av) {
    if (av.currency === 'free') return 'Бесплатно';
    if (av.currency === 'gold') return `${av.price} 💰`;
    if (av.currency === 'diamonds') return `${av.price} 💎`;
    if (av.currency === 'stars') return `${av.price} ⭐ / $${av.usdt_price || '1'}`;
    if (av.currency === 'subscription') return 'Premium';
    if (av.currency === 'referral') return '5+ рефералов';
    if (av.currency === 'usdt_stars') return `590 ⭐ / $11.99`;
    return '';
  }

  shutdown() {
    this._layer.forEach(o => { try { o.destroy(); } catch(_) {} });
    this._layer = [];
    if (this._ctr) { this._ctr.destroy(); }
    if (this._mGfx) { this._mGfx.destroy(); }
    if (this._scrZ) { this._scrZ.destroy(); }
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
