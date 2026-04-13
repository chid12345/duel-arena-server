/* ═══════════════════════════════════════════════════════════
   AvatarScene — выбор аватарки
   ═══════════════════════════════════════════════════════════ */
class AvatarScene extends Phaser.Scene {
  constructor() { super('Avatar'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;

    _extraBg(this, W, H);
    _extraHeader(this, W, '🎭', 'АВАТАРКИ', 'Выбери стиль — отображается в профиле');
    _extraBack(this);

    this._buildGrid(W, H);
  }

  _buildGrid(W, H) {
    const AVATARS = [
      { id: 1, label: 'Воин',  sub: 'Пиксельный воин' },
      { id: 2, label: 'Ранг',  sub: 'Ранговый шестиугольник' },
      { id: 3, label: 'Череп', sub: 'По умолчанию' },
      { id: 4, label: 'Сфера', sub: 'Энергетическая сфера' },
    ];

    const PAD = 12;
    const cols = 2;
    const gap  = 10;
    const cw   = Math.floor((W - PAD * 2 - gap) / cols);
    const ch   = 140;
    const startY = 82;
    const p = State.player;

    AVATARS.forEach((av, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = PAD + col * (cw + gap);
      const cy  = startY + row * (ch + gap);
      const acx = cx + cw / 2;
      const active = (State.avatarId || 3) === av.id;

      const bg = this.add.graphics();
      bg.fillStyle(active ? C.blue : C.bgPanel, active ? 0.18 : 0.92);
      bg.fillRoundedRect(cx, cy, cw, ch, 16);
      bg.lineStyle(2, active ? C.blue : C.dark, active ? 1 : 0.5);
      bg.strokeRoundedRect(cx, cy, cw, ch, 16);

      // Предпросмотр аватарки — центр карточки
      this._drawAvatar(acx, cy + 60, 36, av.id, p?.level || 1);

      // Лейбл
      txt(this, acx, cy + ch - 36, av.label, 14, active ? '#7ab4ff' : '#f0f0fa', active).setOrigin(0.5);
      txt(this, acx, cy + ch - 18, av.sub, 9,
        active ? 'rgba(122,180,255,0.7)' : 'rgba(255,255,255,0.35)').setOrigin(0.5);

      if (active) {
        const badgeG = this.add.graphics();
        badgeG.fillStyle(C.blue, 1); badgeG.fillCircle(cx + cw - 14, cy + 14, 12);
        txt(this, cx + cw - 14, cy + 14, '✓', 11, '#ffffff', true).setOrigin(0.5);
      }

      this.add.zone(cx + cw / 2, cy + ch / 2, cw, ch)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.setAlpha(0.7); })
        .on('pointerout',  () => { bg.setAlpha(1); })
        .on('pointerup',   () => {
          bg.setAlpha(1);
          if ((State.avatarId || 3) === av.id) return;
          State.avatarId = av.id;
          try { localStorage.setItem('da_avatar', String(av.id)); } catch(_) {}
          tg?.HapticFeedback?.selectionChanged();
          Sound.click();
          // Сбросить профиль-панель чтобы пересоздалась при возврате
          const menu = this.scene.get('Menu');
          if (menu?._panels?.profile) { menu._panels.profile.destroy(); menu._panels.profile = null; }
          this.scene.restart();
        });
    });
  }

  _drawAvatar(cx, cy, r, avatarId, level) {
    const id = avatarId || 3;
    const g  = this.add.graphics();

    if (id === 1) {
      g.fillStyle(0x080614, 1); g.fillRoundedRect(cx - r, cy - r, r * 2, r * 2, r * 0.35);
      g.lineStyle(2, 0x7ab4ff, 0.85); g.strokeRoundedRect(cx - r, cy - r, r * 2, r * 2, r * 0.35);
      const img = this.add.image(cx, cy, 'warrior_blue_face');
      img.setScale((r * 2) / 56 * 0.85).setOrigin(0.5);
    } else if (id === 2) {
      const outerPts = [], innerPts = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        outerPts.push({ x: cx + Math.cos(a) * r,        y: cy + Math.sin(a) * r });
        innerPts.push({ x: cx + Math.cos(a) * r * 0.72, y: cy + Math.sin(a) * r * 0.72 });
      }
      g.fillStyle(0xffc83c, 1); g.fillPoints(outerPts, true);
      g.fillStyle(0x12101e, 1); g.fillPoints(innerPts, true);
      txt(this, cx, cy, String(level || 1),
        Math.round(r * 0.9), '#ffc83c', true).setOrigin(0.5);
    } else if (id === 3) {
      g.fillStyle(0x0a0608, 1); g.fillCircle(cx, cy, r);
      g.lineStyle(2, 0xdc3c46, 0.7); g.strokeCircle(cx, cy, r);
      g.fillStyle(0xff4400, 0.45); g.fillEllipse(cx, cy + r * 0.65, r * 1.1, r * 0.55);
      txt(this, cx, cy - r * 0.08, '💀',
        Math.round(r * 1.15)).setOrigin(0.5);
    } else {
      g.fillStyle(0x3a1080, 1); g.fillCircle(cx, cy, r);
      g.lineStyle(1.5, 0xb45aff, 0.6); g.strokeCircle(cx, cy, r);
      g.lineStyle(1, 0xffffff, 0.15); g.strokeCircle(cx, cy, r * 0.75);
      g.lineStyle(1, 0xb45aff, 0.25); g.strokeCircle(cx, cy, r * 0.5);
      g.fillStyle(0xffffff, 0.85); g.fillCircle(cx, cy, r * 0.28);
    }
  }

  shutdown() {
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
