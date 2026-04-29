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
      makePanel(this, 8, y, W-16, 36, 10, 0.9);
      txt(this, 20, y+10, '🏆 Лучший результат:', 12, '#ffc83c', true);
      txt(this, W-16, y+10, `Волна ${p.best_wave}`, 13, '#ffffff', true).setOrigin(1, 0);
      y += 46;
    }

    {
      /* ── Попытки ── */
      const attG = this.add.graphics();
      attG.fillStyle(C.bgPanel, 0.9); attG.fillRoundedRect(8, y, W-16, 50, 10);
      const dots = '🔥'.repeat(Math.min(d.attempts_left, 5)) + (d.attempts_left > 5 ? `+${d.attempts_left-5}` : '') || '💀';
      txt(this, 20, y+10, 'Попытки:', 12, '#ddddff', true);
      txt(this, 20, y+28, dots, 14);
      txt(this, W-16, y+18, `${d.attempts_left} / ${d.base_attempts}`, 15, '#ffc83c', true).setOrigin(1, 0.5);
      y += 58;

      if (d.attempts_left > 0) {
        /* Кнопка "Начать" */
        const startG = this.add.graphics();
        startG.fillStyle(0xaa1a1a, 1); startG.fillRoundedRect(16, y, W-32, 52, 12);
        startG.fillStyle(0xffffff, 0.08); startG.fillRoundedRect(18, y+2, W-36, 24, 10);
        startG.lineStyle(2, 0xff4444, 0.7); startG.strokeRoundedRect(16, y, W-32, 52, 12);
        txt(this, W/2, y+26, '🔥  Начать Натиск', 15, '#ffffff', true).setOrigin(0.5);
        this.add.zone(16, y, W-32, 52).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { startG.clear(); startG.fillStyle(0x880000,1); startG.fillRoundedRect(16,y,W-32,52,12); tg?.HapticFeedback?.impactOccurred('heavy'); })
          .on('pointerup',   () => this._startFight());
        y += 62;
      } else {
        makePanel(this, 8, y, W-16, 44, 10, 0.7);
        txt(this, W/2, y+13, '💀 Попытки закончились', 13, '#cc6666', true).setOrigin(0.5);
        txt(this, W/2, y+31, 'Восстановятся завтра', 11, '#ddddff').setOrigin(0.5);
        y += 54;
      }

      /* ── Купить попытки ── */
      y += 4;
      txt(this, W/2, y, '— купить попытки —', 11, '#aaaaee').setOrigin(0.5);
      y += 16;

      /* За золото (1/день) */
      const halfW = (W-28)/2;
      const canGold = d.can_buy_gold && d.player_gold >= d.gold_cost;
      const gG = this.add.graphics();
      gG.fillStyle(canGold ? 0x2a2010 : C.dark, canGold ? 0.9 : 0.5);
      gG.fillRoundedRect(8, y, halfW, 42, 10);
      if (canGold) { gG.lineStyle(1.5, C.gold, 0.5); gG.strokeRoundedRect(8, y, halfW, 42, 10); }
      txt(this, 8+halfW/2, y+12, '+1 попытка', 11, canGold ? '#ffc83c' : '#aaaacc', canGold).setOrigin(0.5);
      txt(this, 8+halfW/2, y+28, `${d.gold_cost} 🪙`, 12, canGold ? '#ffdca0' : '#555566', canGold).setOrigin(0.5);
      if (canGold) {
        this.add.zone(8, y, halfW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerup', () => this._buyAttempt('gold'));
      }

      /* За алмазы (5 штук) */
      const dBx = 8 + halfW + 12;
      const canDia = d.player_diamonds >= d.diamond_cost;
      const dG = this.add.graphics();
      dG.fillStyle(canDia ? 0x0a2035 : C.dark, canDia ? 0.9 : 0.5);
      dG.fillRoundedRect(dBx, y, halfW, 42, 10);
      if (canDia) { dG.lineStyle(1.5, 0x3cc8dc, 0.5); dG.strokeRoundedRect(dBx, y, halfW, 42, 10); }
      txt(this, dBx+halfW/2, y+12, '+3 попытки', 11, canDia ? '#3cc8dc' : '#aaaacc', canDia).setOrigin(0.5);
      txt(this, dBx+halfW/2, y+28, `${d.diamond_cost} 💎`, 12, canDia ? '#a8e8ff' : '#555566', canDia).setOrigin(0.5);
      if (canDia) {
        this.add.zone(dBx, y, halfW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerup', () => this._buyAttempt('diamond'));
      }
      y += 52;
    }

    /* ── Задания ── */
    y += 10;
    const dailyWins  = d.daily_endless_wins  || 0;
    const weeklyWins = (d.weekly_endless || {}).weekly_wins || 0;
    const weeklyWave = (d.weekly_endless || {}).best_wave   || 0;
    const questsH = 88;
    makePanel(this, 8, y, W-16, questsH, 10, 0.85);
    txt(this, 20, y+8, '📋 Задания Натиска', 11, '#ffc83c', true);
    // Ежедневное
    const dDone = dailyWins >= 3;
    const dBar  = Math.min(1, dailyWins / 3);
    const bW    = W - 64;
    txt(this, 20, y+26, `🌅 Победи 3 врага сегодня  ${dailyWins}/3`, 10, dDone ? '#3cc864' : '#ccccee');
    const dBg = this.add.graphics();
    dBg.fillStyle(0x222233, 1); dBg.fillRoundedRect(20, y+38, bW, 6, 3);
    dBg.fillStyle(dDone ? 0x3cc864 : 0xdc3c46, 1); dBg.fillRoundedRect(20, y+38, Math.max(6, bW * dBar), 6, 3);
    if (dDone) txt(this, W-16, y+26, '✅ +80🪙 +1💎', 10, '#3cc864', true).setOrigin(1, 0);
    // Недельное победы
    const wDone = weeklyWins >= 10;
    const wBar  = Math.min(1, weeklyWins / 10);
    txt(this, 20, y+52, `📅 Победи 10 врагов за неделю  ${weeklyWins}/10`, 10, wDone ? '#3cc864' : '#ccccee');
    const wBg = this.add.graphics();
    wBg.fillStyle(0x222233, 1); wBg.fillRoundedRect(20, y+64, bW, 6, 3);
    wBg.fillStyle(wDone ? 0x3cc864 : 0x5096ff, 1); wBg.fillRoundedRect(20, y+64, Math.max(6, bW * wBar), 6, 3);
    if (wDone) txt(this, W-16, y+52, '✅ +200🪙 +3💎', 10, '#3cc864', true).setOrigin(1, 0);
    // Недельное волна
    const wvDone = weeklyWave >= 5;
    txt(this, 20, y+76, `🌊 Дойди до 5 волны за неделю  ${weeklyWave}/5  ${wvDone ? '✅ +250🪙 +3💎' : ''}`, 10, wvDone ? '#3cc864' : '#ccccee');
    y += questsH + 8;

    /* ── Правила ── */
    makePanel(this, 8, y, W-16, 100, 10, 0.7);
    const rulesBase = [
      '🏁  Каждый заход начинается с полного HP',
      '⚔️  HP между боями сохраняется (не между заходами)',
      '📈  Волны 1-3 лёгкие — дальше сложнее',
      '💚  Каждые 5 побед: +10% HP восстановления',
    ];
    rulesBase.forEach((r, i) => {
      txt(this, 20, y + 8 + i * 21, r, 10, '#ddddff');
    });
    const premLine = d.is_premium
      ? '👑 Premium активен: +5 попыток/день'
      : '👑 Premium: +5 бесплатных попыток/день';
    txt(this, W/2, y + 88, premLine, 10, d.is_premium ? '#ffc83c' : '#aabbcc').setOrigin(0.5);
  }

  async _startFight() {
    if (this._busy) return;
    this._busy = true;
    try {
      const res = await post('/api/endless/start', {});
      if (!this.scene?.isActive('Natisk')) return;
      if (!res.ok) { this._toast('❌ ' + (res.reason || 'Ошибка')); this._busy = false; return; }
      State.battle    = res.battle;
      State.endlessWave = res.wave;
      tg?.HapticFeedback?.impactOccurred('heavy');
      this.scene.start('Battle', {});
    } catch(_) {
      this._toast('❌ Нет соединения');
    }
    this._busy = false;
  }

  async _abandon() {
    if (this._busy) return;
    this._busy = true;
    try {
      await post('/api/endless/abandon', {});
    } catch(_) {}
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
      } else {
        this._toast('❌ ' + (res.reason || 'Ошибка'));
      }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 140, msg, 12, '#ffffff', true).setOrigin(0.5);
    this.time.delayedCall(2000, () => { try { t.destroy(); } catch(_){} });
  }
}
