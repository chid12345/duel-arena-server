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

    /* ── Рекорд ── */
    if (p.best_wave > 0) {
      const rg = this.add.graphics();
      rg.fillStyle(0x080b18, 0.9); rg.fillRoundedRect(8, y, W-16, 38, 6);
      rg.lineStyle(1, 0xff8c00, 0.25); rg.strokeRoundedRect(8, y, W-16, 38, 6);
      rg.lineStyle(3, 0xff8c00, 0.85); rg.lineBetween(10, y+6, 10, y+32);
      txt(this, 22, y+7, 'РЕКОРД ВОЛНЫ', 9, '#ff8c00');
      txt(this, W-16, y+19, String(p.best_wave), 20, '#ff8c00', true)
        .setOrigin(1, 0.5).setShadow(0, 0, '#ff8c00', 10, false, true);
      y += 48;
    }

    /* ── Описание ── */
    txt(this, 16, y, 'Выживи как можно дольше на арене.', 11, '#dceeff');
    y += 16;
    txt(this, 16, y, 'Волны 1–3 лёгкие — дальше сложнее. HP сохраняется между боями.', 10, '#dceeff');
    y += 22;

    /* ── Попытки ── */
    {
      const attG = this.add.graphics();
      attG.fillStyle(0x080b18, 0.85); attG.fillRoundedRect(8, y, W-16, 38, 6);
      attG.lineStyle(1, 0xff8c00, 0.2); attG.strokeRoundedRect(8, y, W-16, 38, 6);
      const fires = d.attempts_left > 0 ? '🔥'.repeat(Math.min(d.attempts_left, 5)) : '💀';
      txt(this, 20, y+19, fires, 16).setOrigin(0, 0.5);
      txt(this, W-16, y+10, `${d.attempts_left} / ${d.base_attempts}`, 16, '#ff8c00', true)
        .setOrigin(1, 0).setShadow(0, 0, '#ff8c00', 8, false, true);
      txt(this, W-16, y+28, 'ПОПЫТОК ОСТАЛОСЬ', 8, '#4466aa').setOrigin(1, 0);
      y += 48;
    }

    /* ── Кнопка старта / нет попыток ── */
    if (d.attempts_left > 0) {
      this._makeMechBtn(W/2, y + 68, () => this._startFight());
      y += 152;
    } else {
      const ng = this.add.graphics();
      ng.fillStyle(C.dark, 0.7); ng.fillRoundedRect(8, y, W-16, 44, 10);
      txt(this, W/2, y+13, '💀 Попытки закончились', 13, '#cc6666', true).setOrigin(0.5);
      txt(this, W/2, y+31, 'Восстановятся завтра', 11, '#aaaadd').setOrigin(0.5);
      y += 54;
    }

    /* ── Купить попытки ── */
    const halfW = (W-28)/2;
    const canGold = d.can_buy_gold && d.player_gold >= d.gold_cost;
    const canDia  = d.player_diamonds >= d.diamond_cost;
    const gG = this.add.graphics();
    gG.fillStyle(canGold ? 0x1a1000 : C.dark, canGold ? 0.9 : 0.5);
    gG.fillRoundedRect(8, y, halfW, 42, 8);
    if (canGold) { gG.lineStyle(1.5, 0xffc83c, 0.5); gG.strokeRoundedRect(8, y, halfW, 42, 8); }
    txt(this, 8+halfW/2, y+12, '+1 попытка', 11, canGold ? '#ffc83c' : '#666677', canGold).setOrigin(0.5);
    txt(this, 8+halfW/2, y+28, `${d.gold_cost} 🪙`, 12, canGold ? '#ffdca0' : '#444455', canGold).setOrigin(0.5);
    if (canGold) this.add.zone(8, y, halfW, 42).setOrigin(0).setInteractive()
      .on('pointerup', () => this._buyAttempt('gold'));

    const dBx = 8 + halfW + 12;
    const dG = this.add.graphics();
    dG.fillStyle(canDia ? 0x001020 : C.dark, canDia ? 0.9 : 0.5);
    dG.fillRoundedRect(dBx, y, halfW, 42, 8);
    if (canDia) { dG.lineStyle(1.5, 0x3cc8dc, 0.5); dG.strokeRoundedRect(dBx, y, halfW, 42, 8); }
    txt(this, dBx+halfW/2, y+12, '+3 попытки', 11, canDia ? '#3cc8dc' : '#666677', canDia).setOrigin(0.5);
    txt(this, dBx+halfW/2, y+28, `${d.diamond_cost} 💎`, 12, canDia ? '#a8e8ff' : '#444455', canDia).setOrigin(0.5);
    if (canDia) this.add.zone(dBx, y, halfW, 42).setOrigin(0).setInteractive()
      .on('pointerup', () => this._buyAttempt('diamond'));
    y += 52;

    /* ── Premium ── */
    const premLine = d.is_premium
      ? '⭐ Premium активен: +5 попыток/день'
      : '⭐ Premium: +5 бесплатных попыток/день';
    txt(this, W/2, y + 6, premLine, 10, d.is_premium ? '#ffc83c' : '#6677aa').setOrigin(0.5);
  }

  _makeMechBtn(x, y, cb) {
    const SZ = 104;
    const cont = this.add.container(x, y);

    // Glow-pool под персонажем
    const glowG = this.add.graphics();
    for (let i = 5; i >= 1; i--) {
      glowG.fillStyle(0xff6600, 0.07 * i / 5);
      glowG.fillEllipse(0, SZ / 2 - 4, SZ * 0.85 * (i / 5), 16 * (i / 5));
    }
    cont.add(glowG);

    // Скин — сам кнопка, без рамки
    const mech = this.add.image(0, 0, 'natisk_mech')
      .setDisplaySize(SZ, SZ).setOrigin(0.5);
    cont.add(mech);

    // Cyan нeon-линия + точки на концах
    const lineG = this.add.graphics();
    const _drawLine = (col, alpha) => {
      lineG.clear();
      lineG.lineStyle(1.5, col, alpha);
      lineG.lineBetween(-SZ / 2 + 8, SZ / 2 + 3, SZ / 2 - 8, SZ / 2 + 3);
      lineG.fillStyle(col, 1);
      lineG.fillCircle(-SZ / 2 + 8, SZ / 2 + 3, 2.5);
      lineG.fillCircle(SZ / 2 - 8, SZ / 2 + 3, 2.5);
    };
    _drawLine(0x00e5ff, 0.85);
    cont.add(lineG);

    // Парение
    this.tweens.add({ targets: cont, y: y - 5, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Заголовок кнопки — НАТИСК
    cont.add(this.add.text(0, SZ / 2 + 16, 'НАТИСК', {
      fontFamily: "'Orbitron','Arial Black',sans-serif",
      fontSize: '14px', fontStyle: 'bold',
      color: '#00e5ff', resolution: 2, align: 'center',
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 14, false, true));

    // Подпись
    cont.add(this.add.text(0, SZ / 2 + 34, '[ ПРОТОКОЛ: ПЕРЕГРУЗКА ]', {
      fontFamily: "'Orbitron','Arial Black',sans-serif",
      fontSize: '8px', fontStyle: 'bold',
      color: '#ff8c00', resolution: 2, align: 'center',
    }).setOrigin(0.5).setShadow(0, 0, '#ff8c00', 8, false, true));

    cont.setInteractive(
      new Phaser.Geom.Rectangle(-SZ / 2, -SZ / 2, SZ, SZ + 50),
      Phaser.Geom.Rectangle.Contains
    );
    const reset = () => {
      this.tweens.add({ targets: cont, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.easeOut' });
      mech.clearTint();
      _drawLine(0x00e5ff, 0.85);
    };
    cont.on('pointerdown', () => {
      tg?.HapticFeedback?.impactOccurred('heavy');
      this.tweens.add({ targets: cont, scaleX: 0.88, scaleY: 0.88, duration: 90, ease: 'Power2' });
      mech.setTint(0xff8800);
      _drawLine(0xff8c00, 1);
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
