/* ============================================================
   NatiskScene — бесконечный режим выживания "Натиск"
   ============================================================ */

class NatiskScene extends Phaser.Scene {
  constructor() { super('Natisk'); }

  shutdown() {
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '🔥', 'НАТИСК', 'Выживи как можно дольше на арене');
    _extraBack(this, 'Menu', 'battle');

    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#ddddff').setOrigin(0.5);
    get('/api/endless/status').then(d => this._render(d, W, H)).catch(() => {
      if (this._loading) this._loading.setText('❌ Нет соединения');
    });
  }

  _render(d, W, H) {
    if (this._loading) { this._loading.destroy(); this._loading = null; }
    if (!d.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }

    const p = d.progress;
    let y = 84;

    /* ── Стат-блоки: Попытки | Рекорд волны ── */
    {
      const bW = (W - 28) / 2;

      // Попытки (orange)
      const aG = this.add.graphics();
      aG.fillStyle(0x0a0e1a, 0.95); aG.fillRoundedRect(8, y, bW, 56, 10);
      aG.lineStyle(1.5, 0xff8c00, 0.7); aG.strokeRoundedRect(8, y, bW, 56, 10);
      const fires = d.attempts_left > 0 ? '🔥'.repeat(Math.min(d.attempts_left, 5)) : '💀';
      txt(this, 8 + bW / 2, y + 16, `${d.attempts_left}/${d.base_attempts}`, 20, '#ff8c00', true)
        .setOrigin(0.5).setShadow(0, 0, '#ff8c00', 10, false, true);
      txt(this, 8 + bW / 2, y + 36, fires, 11).setOrigin(0.5);
      txt(this, 8 + bW / 2, y + 48, 'ПОПЫТКИ', 7, '#ff8c00').setOrigin(0.5);

      // Рекорд волны (cyan)
      const rX = 8 + bW + 12;
      const rG = this.add.graphics();
      rG.fillStyle(0x0a0e1a, 0.95); rG.fillRoundedRect(rX, y, bW, 56, 10);
      rG.lineStyle(1.5, 0x00e5ff, 0.7); rG.strokeRoundedRect(rX, y, bW, 56, 10);
      const wave = p.best_wave || 0;
      txt(this, rX + bW / 2, y + 22, wave > 0 ? String(wave) : '—', 24, '#00e5ff', true)
        .setOrigin(0.5).setShadow(0, 0, '#00e5ff', 12, false, true);
      txt(this, rX + bW / 2, y + 48, 'РЕКОРД ВОЛНЫ', 7, '#00e5ff').setOrigin(0.5);
      y += 66;
    }

    /* ── Описание ── */
    {
      const dg = this.add.graphics();
      dg.fillStyle(0x080d1c, 0.85); dg.fillRoundedRect(8, y, W - 16, 38, 8);
      dg.lineStyle(1, 0x00e5ff, 0.12); dg.strokeRoundedRect(8, y, W - 16, 38, 8);
      dg.lineStyle(2, 0x00e5ff, 0.65); dg.lineBetween(8, y + 6, 8, y + 32);
      txt(this, 20, y + 8,  '▸ Выживи как можно дольше на арене.', 10, '#00e5ff');
      txt(this, 20, y + 22, '▸ HP сохраняется · волны становятся сложнее.', 9, '#4a7080');
      y += 48;
    }

    /* ── Кнопка старта / нет попыток ── */
    if (d.attempts_left > 0) {
      this._makeMechBtn(W / 2, y + 68, () => this._startFight());
      y += 155;
    } else {
      const ng = this.add.graphics();
      ng.fillStyle(0x0a0e1a, 0.9); ng.fillRoundedRect(8, y, W - 16, 48, 10);
      ng.lineStyle(1.5, 0xcc3333, 0.5); ng.strokeRoundedRect(8, y, W - 16, 48, 10);
      txt(this, W/2, y + 14, '💀 Попытки закончились', 13, '#cc4444', true).setOrigin(0.5);
      txt(this, W/2, y + 32, 'Восстановятся завтра', 10, '#667799').setOrigin(0.5);
      y += 58;
    }

    /* ── Купить попытки ── */
    const halfW = (W - 28) / 2;
    const canGold = d.can_buy_gold && d.player_gold >= d.gold_cost;
    const canDia  = d.player_diamonds >= d.diamond_cost;

    const gG = this.add.graphics();
    gG.fillStyle(canGold ? 0x0f0a00 : 0x08090f, canGold ? 0.95 : 0.6);
    gG.fillRoundedRect(8, y, halfW, 44, 8);
    if (canGold) { gG.lineStyle(1.5, 0xffc83c, 0.7); gG.strokeRoundedRect(8, y, halfW, 44, 8); }
    txt(this, 8 + halfW / 2, y + 13, '+1 попытка', 11, canGold ? '#ffc83c' : '#555566', canGold).setOrigin(0.5);
    txt(this, 8 + halfW / 2, y + 29, `${d.gold_cost} 🪙`, 12, canGold ? '#ffdca0' : '#3a3a4a', canGold).setOrigin(0.5);
    if (canGold) this.add.zone(8, y, halfW, 44).setOrigin(0).setInteractive()
      .on('pointerup', () => this._buyAttempt('gold'));

    const dBx = 8 + halfW + 12;
    const dG = this.add.graphics();
    dG.fillStyle(canDia ? 0x001825 : 0x08090f, canDia ? 0.95 : 0.6);
    dG.fillRoundedRect(dBx, y, halfW, 44, 8);
    if (canDia) { dG.lineStyle(1.5, 0x00e5ff, 0.7); dG.strokeRoundedRect(dBx, y, halfW, 44, 8); }
    txt(this, dBx + halfW / 2, y + 13, '+3 попытки', 11, canDia ? '#00e5ff' : '#555566', canDia).setOrigin(0.5);
    txt(this, dBx + halfW / 2, y + 29, `${d.diamond_cost} 💎`, 12, canDia ? '#a8e8ff' : '#3a3a4a', canDia).setOrigin(0.5);
    if (canDia) this.add.zone(dBx, y, halfW, 44).setOrigin(0).setInteractive()
      .on('pointerup', () => this._buyAttempt('diamond'));
    y += 54;

    /* ── Premium ── */
    const premLine = d.is_premium
      ? '⭐ Premium активен: +5 попыток/день'
      : '⭐ Premium: +5 бесплатных попыток/день';
    txt(this, W / 2, y + 6, premLine, 10, d.is_premium ? '#ffc83c' : '#445566').setOrigin(0.5);
  }

  _makeMechBtn(x, y, cb) {
    const SZ = 96, R = 14;
    const cont = this.add.container(x, y);

    // Многослойный cyan aura — как иконка чата в клане
    const auraG = this.add.graphics();
    const _drawAura = (col) => {
      auraG.clear();
      for (let i = 8; i >= 1; i--) {
        auraG.fillStyle(col, 0.028 * i / 8);
        auraG.fillRoundedRect(
          -SZ / 2 - i * 7, -SZ / 2 - i * 7,
          SZ + i * 14, SZ + i * 14,
          R + i * 3
        );
      }
    };
    _drawAura(0x00e5ff);
    cont.add(auraG);

    // Тёмный фон кнопки
    const bgG = this.add.graphics();
    const _drawBg = (fill, borderCol) => {
      bgG.clear();
      bgG.fillStyle(fill, 0.96);
      bgG.fillRoundedRect(-SZ / 2, -SZ / 2, SZ, SZ, R);
      bgG.lineStyle(2, borderCol, 0.95);
      bgG.strokeRoundedRect(-SZ / 2, -SZ / 2, SZ, SZ, R);
      bgG.lineStyle(1, borderCol, 0.25);
      bgG.strokeRoundedRect(-SZ / 2 + 3, -SZ / 2 + 3, SZ - 6, SZ - 6, R - 2);
    };
    _drawBg(0x050d18, 0x00e5ff);
    cont.add(bgG);

    // Скин
    const mech = this.add.image(0, 0, 'natisk_mech')
      .setDisplaySize(SZ - 6, SZ - 6).setOrigin(0.5);
    cont.add(mech);

    // Парение
    this.tweens.add({ targets: cont, y: y - 5, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // НАТИСК
    cont.add(this.add.text(0, SZ / 2 + 16, 'НАТИСК', {
      fontFamily: "'Orbitron','Arial Black',sans-serif",
      fontSize: '14px', fontStyle: 'bold',
      color: '#00e5ff', resolution: 2,
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 16, false, true));

    cont.setInteractive(
      new Phaser.Geom.Rectangle(-SZ / 2 - 10, -SZ / 2 - 10, SZ + 20, SZ + 50),
      Phaser.Geom.Rectangle.Contains
    );
    const reset = () => {
      this.tweens.add({ targets: cont, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.easeOut' });
      mech.clearTint();
      _drawBg(0x050d18, 0x00e5ff);
      _drawAura(0x00e5ff);
    };
    cont.on('pointerdown', () => {
      tg?.HapticFeedback?.impactOccurred('heavy');
      this.tweens.add({ targets: cont, scaleX: 0.88, scaleY: 0.88, duration: 90, ease: 'Power2' });
      mech.setTint(0x88ddff);
      _drawBg(0x001a2a, 0x00e5ff);
      _drawAura(0x44ffff);
    });
    cont.on('pointerup',  () => { reset(); cb(); });
    cont.on('pointerout', reset);
  }

  async _startFight() {
    if (this._busy) return;
    this._busy = true;
    try {
      const res = await post('/api/endless/start', {});
      if (!this.scene?.isActive('Natisk')) return;
      if (!res.ok) { this._toast('❌ ' + (res.reason || 'Ошибка')); this._busy = false; return; }
      State.battle      = res.battle;
      State.endlessWave = res.wave;
      tg?.HapticFeedback?.impactOccurred('heavy');
      this.scene.start('Battle', {});
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  async _abandon() {
    if (this._busy) return;
    this._busy = true;
    try { await post('/api/endless/abandon', {}); } catch(_) {}
    this._busy = false;
    if (!this.scene?.isActive('Natisk')) return;
    this.scene.restart();
  }

  async _buyAttempt(kind) {
    if (this._busy) return;
    this._busy = true;
    try {
      const res = await post('/api/endless/buy_attempt', { kind });
      if (!this.scene?.isActive('Natisk')) return;
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast(`✅ Куплено попыток: ${res.bought}`);
        this.time.delayedCall(600, () => this.scene.restart());
      } else { this._toast('❌ ' + (res.reason || 'Ошибка')); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 140, msg, 12, '#ffffff', true).setOrigin(0.5);
    this.time.delayedCall(2000, () => { try { t.destroy(); } catch(_){} });
  }
}
