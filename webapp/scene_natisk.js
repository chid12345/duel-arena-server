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
    _extraHeader(this, W, '⚡', 'НАТИСК', 'Арена выживания · бесконечные волны');
    this._buildAbortBtn(W, H);

    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#ddddff').setOrigin(0.5);
    get('/api/endless/status').then(d => this._render(d, W, H)).catch(() => {
      if (this._loading) this._loading.setText('❌ Нет соединения');
    });
  }

  _buildAbortBtn(W, H) {
    const btnW = 172, btnH = 36, bx = (W - btnW) / 2, by = H - 82;
    const bg = this.add.graphics();
    bg.fillStyle(0x050d18, 0.92);
    bg.fillRoundedRect(bx, by, btnW, btnH, 6);
    bg.lineStyle(1.5, 0x00e5ff, 0.55);
    bg.strokeRoundedRect(bx, by, btnW, btnH, 6);
    this.add.text(W / 2, by + btnH / 2, '◄  Назад', {
      fontFamily: "'Orbitron','Arial Black',sans-serif",
      fontSize: '10px', fontStyle: 'bold',
      color: '#00e5ff', resolution: 2,
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 6, false, true);
    this.add.zone(bx, by, btnW, btnH).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x001a2a, 0.95); bg.fillRoundedRect(bx, by, btnW, btnH, 6); bg.lineStyle(2, 0x00e5ff, 0.9); bg.strokeRoundedRect(bx, by, btnW, btnH, 6); })
      .on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); this.scene.start('Menu', { openBattleSelect: true }); });
  }

  _render(d, W, H) {
    if (this._loading) { this._loading.destroy(); this._loading = null; }
    if (!d.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }
    // Запоминаем границу: всё что добавим ПОСЛЕ этой точки — динамический контент
    this._contentMark = this.children.length;

    const p = d.progress;
    let y = 84;

    /* ── Стат-блоки: Попытки | Рекорд волны ── */
    {
      const bW = (W - 28) / 2;

      const aG = this.add.graphics();
      aG.fillStyle(0x0a0e1a, 0.95); aG.fillRoundedRect(8, y, bW, 56, 10);
      aG.lineStyle(1.5, 0xff8c00, 0.7); aG.strokeRoundedRect(8, y, bW, 56, 10);
      const fires = d.attempts_left > 0 ? '🔥'.repeat(Math.min(d.attempts_left, 5)) : '💀';
      txt(this, 8 + bW / 2, y + 16, `${d.attempts_left}/${d.base_attempts}`, 20, '#ff8c00', true)
        .setOrigin(0.5).setShadow(0, 0, '#ff8c00', 10, false, true);
      txt(this, 8 + bW / 2, y + 36, fires, 11).setOrigin(0.5);
      txt(this, 8 + bW / 2, y + 48, 'ПОПЫТКИ', 7, '#ff8c00').setOrigin(0.5);

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

    /* ── Кнопка старта / нет попыток ── */
    if (d.attempts_left > 0) {
      this._makeMechBtn(W / 2, y + 70, () => this._startFight());
      y += 158;
    } else {
      const ng = this.add.graphics();
      ng.fillStyle(0x0a0e1a, 0.9); ng.fillRoundedRect(8, y, W - 16, 52, 10);
      ng.lineStyle(1.5, 0xcc3333, 0.5); ng.strokeRoundedRect(8, y, W - 16, 52, 10);
      txt(this, W/2, y + 16, '💀 Попытки закончились', 13, '#cc4444', true).setOrigin(0.5);
      txt(this, W/2, y + 34, 'Восстановятся завтра', 10, '#667799').setOrigin(0.5);
      y += 62;
    }

    /* ── Купить попытки ── */
    {
      const canGold = d.can_buy_gold && d.player_gold >= d.gold_cost;
      const canDia  = d.player_diamonds >= d.diamond_cost;
      const _resetTimer = () => {
        const n = new Date(), mid = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1));
        const s = Math.floor((mid - n) / 1000);
        return `${Math.floor(s / 3600)}ч ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}м`;
      };
      const goldSub = canGold ? `${d.gold_cost} 🪙`
        : (!d.can_buy_gold ? `🕐 ${_resetTimer()}` : `${d.gold_cost} 🪙`);

      txt(this, W / 2, y + 8, '— КУПИТЬ ПОПЫТКИ —', 9, '#7799cc', true).setOrigin(0.5)
        .setShadow(0, 0, '#4466aa', 8, false, true);
      y += 20;

      this._makeBuySkinBtn(W / 4,     y + 58, 'natisk_gold',    0xff8c00, '+1 попытка',  goldSub,                    canGold, () => this._buyAttempt('gold'));
      this._makeBuySkinBtn(W * 3 / 4, y + 58, 'natisk_diamond', 0x00e5ff, '+3 попытки', `${d.diamond_cost} 💎`,     canDia,  () => this._buyAttempt('diamond'));
      y += 152;
    }

    /* ── Описание (кибер) ── */
    {
      const dg = this.add.graphics();
      dg.fillStyle(0x0d0900, 0.92); dg.fillRoundedRect(8, y, W - 16, 60, 8);
      dg.lineStyle(1, 0xff8c00, 0.2); dg.strokeRoundedRect(8, y, W - 16, 60, 8);
      dg.lineStyle(3, 0xff8c00, 1); dg.lineBetween(8, y + 8, 8, y + 52);
      txt(this, 20, y + 10, '⚡ Выживи как можно дольше на арене.', 11, '#ffc83c', true)
        .setShadow(0, 0, '#ff8c00', 6, false, true);
      txt(this, 20, y + 27, '▸ Волны 1–3 лёгкие — дальше сложнее.', 10, '#ffaa55');
      txt(this, 20, y + 42, '▸ HP сохраняется между боями.', 10, '#ffaa55');
      y += 68;
    }

    /* ── Premium ── */
    const premLine = d.is_premium
      ? '⭐ Premium активен: +5 попыток/день'
      : '⭐ Premium: +5 бесплатных попыток/день';
    txt(this, W / 2, y + 6, premLine, 10, d.is_premium ? '#ffc83c' : '#445566').setOrigin(0.5);
  }

  _makeMechBtn(x, y, cb) {
    const SZ = 104;
    const cont = this.add.container(x, y);

    // Свечение по форме PNG — ADD blend, как у куполов
    for (let i = 4; i >= 1; i--) {
      cont.add(this.add.image(0, 0, 'natisk_mech')
        .setDisplaySize(SZ + i * 14, SZ + i * 14).setOrigin(0.5)
        .setAlpha(0.3 / i).setBlendMode(Phaser.BlendModes.ADD).setTint(0x00e5ff));
    }

    const mech = this.add.image(0, 0, 'natisk_mech')
      .setDisplaySize(SZ, SZ).setOrigin(0.5);
    cont.add(mech);

    cont.add(this.add.text(0, SZ / 2 + 16, 'НАТИСК', {
      fontFamily: "'Orbitron','Arial Black',sans-serif",
      fontSize: '16px', fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#00e5ff', strokeThickness: 2,
      resolution: 2,
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 28, false, true));

    cont.setInteractive(
      new Phaser.Geom.Rectangle(-SZ / 2, -SZ / 2, SZ, SZ + 42),
      Phaser.Geom.Rectangle.Contains
    );
    const reset = () => {
      this.tweens.add({ targets: cont, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.easeOut' });
      mech.clearTint();
    };
    cont.on('pointerdown', () => {
      tg?.HapticFeedback?.impactOccurred('heavy');
      this.tweens.add({ targets: cont, scaleX: 0.88, scaleY: 0.88, duration: 90, ease: 'Power2' });
      mech.setTint(0x88ddff);
    });
    cont.on('pointerup',  () => { reset(); cb(); });
    cont.on('pointerout', reset);
  }

  _makeBuySkinBtn(cx, cy, texKey, glowHex, label, sub, active, onBuy) {
    const SZ = 86;
    const hexStr = '#' + glowHex.toString(16).padStart(6, '0');
    const cont = this.add.container(cx, cy);

    // Свечение по форме PNG: копии с ADD blend — повторяют контур скина, не круг
    const glowLayers = [];
    for (let i = 4; i >= 1; i--) {
      const g = this.add.image(0, 0, texKey)
        .setDisplaySize(SZ + i * 12, SZ + i * 12).setOrigin(0.5)
        .setAlpha(0.32 / i).setBlendMode(Phaser.BlendModes.ADD).setTint(glowHex);
      cont.add(g);
      glowLayers.push(g);
    }

    // Основной скин
    const img = this.add.image(0, 0, texKey).setDisplaySize(SZ, SZ).setOrigin(0.5);
    cont.add(img);

    // Метки
    const lbl = this.add.text(0, SZ / 2 + 14, label, {
      fontFamily: "'Orbitron','Arial Black',sans-serif",
      fontSize: '13px', fontStyle: 'bold',
      color: '#ffffff',
      stroke: hexStr, strokeThickness: active ? 1.5 : 0.8,
      resolution: 2,
    }).setOrigin(0.5);
    lbl.setShadow(0, 0, hexStr, active ? 18 : 12, false, true);
    cont.add(lbl);

    const subTxt = this.add.text(0, SZ / 2 + 31, sub, {
      fontFamily: "'Orbitron','Arial Black',sans-serif",
      fontSize: '14px', fontStyle: 'bold',
      color: '#ffffff',
      stroke: hexStr, strokeThickness: active ? 2 : 1,
      resolution: 2,
    }).setOrigin(0.5);
    subTxt.setShadow(0, 0, hexStr, active ? 22 : 14, false, true);
    cont.add(subTxt);

    if (!active) return;

    const _setGlow = (col) => glowLayers.forEach(g => g.setTint(col));

    cont.setInteractive(
      new Phaser.Geom.Rectangle(-SZ / 2, -SZ / 2, SZ, SZ + 50),
      Phaser.Geom.Rectangle.Contains
    );

    const reset = () => {
      this.tweens.add({ targets: cont, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
      img.clearTint();
      _setGlow(glowHex);
    };
    cont.on('pointerdown', () => {
      tg?.HapticFeedback?.impactOccurred('medium');
      this.tweens.add({ targets: cont, scaleX: 0.88, scaleY: 0.88, duration: 80, ease: 'Power2' });
      img.setTint(0xaaccff);
    });
    cont.on('pointerout', reset);
    cont.on('pointerup', () => {
      reset();
      _setGlow(0x00dd44);
      cont.disableInteractive();
      this.time.delayedCall(10000, () => { _setGlow(glowHex); });
      onBuy();
    });
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
        this.time.delayedCall(500, () => this._softRefresh());
      } else { this._toast('❌ ' + (res.reason || 'Ошибка')); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  async _softRefresh() {
    if (!this.scene?.isActive('Natisk')) return;
    // Удаляем только динамический контент (всё что после _contentMark)
    [...this.children.list].slice(this._contentMark ?? 0)
      .forEach(o => { try { o.destroy(); } catch(_) {} });
    try {
      const d = await get('/api/endless/status');
      if (this.scene?.isActive('Natisk')) this._render(d, this.W, this.H);
    } catch(_) {}
    this._busy = false;
  }

  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 140, msg, 12, '#ffffff', true).setOrigin(0.5);
    this.time.delayedCall(2000, () => { try { t.destroy(); } catch(_){} });
  }
}
