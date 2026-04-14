/* ═══════════════════════════════════════════════════════════
   AvatarScene — «Витрина RPG»: крупные карточки + прогресс-бары
   ═══════════════════════════════════════════════════════════ */
const _AV_TABS = [
  { key: 'all',     label: 'Все' },
  { key: 'mine',    label: 'Мои' },
  { key: 'base',    label: '🆓 Free' },
  { key: 'gold',    label: '💰 Gold' },
  { key: 'diamond', label: '💎 Epic' },
  { key: 'premium', label: '⭐ Legend' },
];

const _AV_TIER = {
  common:    { bg: 0x1e1e3a, bg2: 0x2a2a50, border: 0x444466, label: 'COMMON',    lc: '#ccccee', grad: 0x44446622 },
  rare:      { bg: 0x0f2040, bg2: 0x1a3868, border: 0x3377bb, label: 'RARE',      lc: '#99ccff', grad: 0x3377bb22 },
  epic:      { bg: 0x200a3a, bg2: 0x3a1868, border: 0x8844cc, label: 'EPIC',      lc: '#cc88ff', grad: 0x8844cc22 },
  legendary: { bg: 0x2a1800, bg2: 0x4a3515, border: 0xcc8822, label: 'LEGENDARY', lc: '#ffdd66', grad: 0xcc882222 },
};

class AvatarScene extends Phaser.Scene {
  constructor() { super('Avatar'); }

  create(data) {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._tab = (data && data.tab) || 'all';
    this._layer = [];
    this._tapAreas = [];

    _extraBg(this, W, H);
    _extraHeader(this, W, '🏛️', 'ГАЛЕРЕЯ ОБРАЗОВ', 'Выбери свой путь воина');
    _extraBack(this);

    this._loading = txt(this, W / 2, H / 2, 'Загрузка...', 14, '#aaa').setOrigin(0.5);
    this._loadData();
  }

  async _loadData() {
    try {
      const j = await get('/api/avatars');
      if (!j.ok) throw new Error(j.reason || 'err');
      this._avatars = j.avatars || [];
      this._equipped = j.equipped_avatar_id || 'base_neutral';
    } catch (e) {
      this._avatars = [];
      this._equipped = 'base_neutral';
    }
    if (this._loading) { this._loading.destroy(); this._loading = null; }
    this._buildTabs();
    this._renderList();
    if (typeof this._resumePendingAvatarCryptoPoll === 'function') {
      this._resumePendingAvatarCryptoPoll();
    }
  }

  _buildTabs() {
    const W = this.W, ty = 72;
    const tw = Math.floor((W - 12) / _AV_TABS.length) - 3;
    _AV_TABS.forEach((t, i) => {
      const tx = 8 + i * (tw + 3), active = this._tab === t.key;
      const bg = this.add.graphics();
      if (active) {
        bg.fillStyle(0x2a1040, 0.95); bg.fillRoundedRect(tx, ty, tw, 26, 8);
        bg.lineStyle(1.5, 0x9955ee, 0.9); bg.strokeRoundedRect(tx, ty, tw, 26, 8);
      } else {
        bg.fillStyle(0x161430, 0.85); bg.fillRoundedRect(tx, ty, tw, 26, 8);
      }
      txt(this, tx + tw / 2, ty + 13, t.label, 9, active ? '#fff' : '#777', active).setOrigin(0.5);
      this.add.zone(tx + tw / 2, ty + 13, tw, 26).setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this._tab === t.key) return;
          Sound.click(); this.scene.restart({ tab: t.key });
        });
    });
  }

  _filterAvatars() {
    const t = this._tab;
    if (t === 'all') return this._avatars;
    if (t === 'mine') return this._avatars.filter(a => a.unlocked);
    return this._avatars.filter(a => a.tier === t);
  }

  _priceLabel(av) {
    if (av.currency === 'free') return { text: 'Бесплатно', color: '#4ade80' };
    if (av.currency === 'gold') return { text: `${av.price} 💰`, color: '#ffc83c' };
    if (av.currency === 'diamonds') return { text: `${av.price} 💎`, color: '#b45aff' };
    if (av.currency === 'stars') return { text: `${av.price} ⭐ / $${av.usdt_price||'1'}`, color: '#ffc83c' };
    if (av.currency === 'subscription') return { text: 'Premium подписка', color: '#ff6b9d' };
    if (av.currency === 'referral') return { text: '5+ рефералов', color: '#4ade80' };
    if (av.currency === 'usdt_stars') return { text: '590 ⭐ / $11.99', color: '#ffd700' };
    return { text: '', color: '#888' };
  }

  shutdown() {
    if (this._scrollTimer) { this._scrollTimer.destroy(); this._scrollTimer = null; }
    this._layer.forEach(o => { try { o.destroy(); } catch(_) {} });
    if (this._ctr) { try { this._ctr.clearMask(); } catch(_) {} this._ctr.destroy(); this._ctr = null; }
    if (this._mGfx) { this._mGfx.destroy(); this._mGfx = null; }
    if (this._scrZ) { this._scrZ.destroy(); this._scrZ = null; }
    closeItemDetailPopup(this);
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
