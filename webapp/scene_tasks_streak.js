/* ============================================================
   TasksScene — вкладка 🗓️ Стрик входа
   ============================================================ */

TasksScene.prototype._buildStreakTab = function(streak, W, H, startY) {
  if (!streak) {
    txt(this, W/2, startY + 60, 'Загрузка стрика...', 12, '#9999bb').setOrigin(0.5);
    return;
  }

  const { container, setContentH } = this._makeScrollZone(W, H, startY);
  let y = 10;

  // Заголовок
  const setNames = ['A', 'B', 'C', 'D'];
  const ws = (streak.week_set || 0) % 4;
  const sd = parseInt(streak.streak_day || 0);
  const claimed = streak.days_claimed || [];
  const rewards = streak.reward_set || [];

  const hdrBg = this.add.graphics();
  hdrBg.fillStyle(0x1a1a38, 0.9); hdrBg.fillRoundedRect(8, y, W - 16, 52, 10);
  hdrBg.lineStyle(1.5, C.gold, 0.4); hdrBg.strokeRoundedRect(8, y, W - 16, 52, 10);
  txt(this, W/2, y + 16, `🗓️ 7-Дневный стрик — Набор ${setNames[ws]}`, 13, '#ffd700', true).setOrigin(0.5);
  const statusTxt = sd === 0 ? 'Начни новый цикл!' : `День ${sd} из 7`;
  txt(this, W/2, y + 34, statusTxt, 11, '#aaaacc').setOrigin(0.5);
  container.add([hdrBg]);
  container.add(txt(this, W/2, y + 16, `🗓️ 7-Дневный стрик — Набор ${setNames[ws]}`, 13, '#ffd700', true).setOrigin(0.5));
  container.add(txt(this, W/2, y + 34, statusTxt, 11, '#aaaacc').setOrigin(0.5));
  hdrBg.destroy();
  y += 62;

  // Строка дней
  const dayW = (W - 20) / 7;
  for (let i = 0; i < 7; i++) {
    const dn = i + 1;
    const rw = rewards[i] || {};
    const isClaimed = claimed.includes(dn);
    const isCurrent = sd === dn;
    const isLocked = dn > sd;
    const dx = 10 + i * dayW;

    const col = isClaimed ? 0x1a3a1a : isCurrent ? 0x2a2060 : 0x141428;
    const border = isClaimed ? C.green : isCurrent ? C.gold : C.dark;
    const alpha = isClaimed ? 0.9 : isCurrent ? 1 : 0.5;

    const bg2 = this.add.graphics();
    bg2.fillStyle(col, alpha);
    bg2.fillRoundedRect(dx, y, dayW - 4, 70, 8);
    bg2.lineStyle(isCurrent ? 2 : 1, border, isCurrent ? 0.9 : 0.4);
    bg2.strokeRoundedRect(dx, y, dayW - 4, 70, 8);
    container.add(bg2);

    const cx = dx + (dayW - 4) / 2;
    container.add(txt(this, cx, y + 10, `День ${dn}`, 8, isCurrent ? '#ffd700' : '#8888aa', isCurrent).setOrigin(0.5));

    // Иконка награды
    const icon = rw.item ? '📦' : rw.diamonds > 0 ? '💎' : rw.gold > 0 ? '🪙' : '⭐';
    container.add(txt(this, cx, y + 30, isClaimed ? '✅' : isLocked ? '🔒' : icon, 18).setOrigin(0.5));

    // Краткая награда
    let rewardLine = '';
    if (rw.gold > 0) rewardLine += `${rw.gold}🪙`;
    if (rw.diamonds > 0) rewardLine += (rewardLine ? ' ' : '') + `${rw.diamonds}💎`;
    if (rw.item) rewardLine = '📦бокс';
    container.add(txt(this, cx, y + 54, rewardLine || '', 7, '#aaaacc').setOrigin(0.5));

    // Кнопка клейма
    if (isCurrent && !isClaimed) {
      const clBg = this.add.graphics();
      clBg.fillStyle(0xffc83c, 1);
      clBg.fillRoundedRect(dx, y, dayW - 4, 70, 8);
      clBg.setAlpha(0.15);
      container.add(clBg);
      this.tweens.add({ targets: clBg, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

      const zone = this.add.zone(dx - 0, y - 0 + startY, dayW - 4, 70).setOrigin(0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this._claimStreakDay(dn));
    }
  }
  y += 80;

  // Детальные награды
  txt(this, 14, y, 'НАГРАДЫ ТЕКУЩЕГО ЦИКЛА', 9, '#9999bb', true);
  y += 18;

  rewards.forEach((rw, i) => {
    const dn2 = i + 1;
    const isCl2 = claimed.includes(dn2);
    const row = this.add.graphics();
    row.fillStyle(isCl2 ? 0x0e1e0e : C.bgPanel, isCl2 ? 0.9 : 0.7);
    row.fillRoundedRect(8, y, W - 16, 36, 8);
    if (dn2 === sd) { row.lineStyle(1.5, C.gold, 0.6); row.strokeRoundedRect(8, y, W - 16, 36, 8); }
    container.add(row);

    container.add(txt(this, 20, y + 10, `День ${dn2}:`, 10, dn2 === sd ? '#ffd700' : '#8888aa', dn2 === sd).setOrigin(0, 0));
    let parts = [];
    if (rw.gold > 0)     parts.push(`+${rw.gold}🪙`);
    if (rw.diamonds > 0) parts.push(`+${rw.diamonds}💎`);
    if (rw.xp > 0)       parts.push(`+${rw.xp}⭐`);
    if (rw.item)         parts.push(`📦 ${rw.item}`);
    container.add(txt(this, 75, y + 10, parts.join('  '), 10, '#ddddee').setOrigin(0, 0));
    container.add(txt(this, W - 20, y + 18, isCl2 ? '✅' : (dn2 === sd ? '⬅️' : '🔒'), 13).setOrigin(1, 0.5));
    y += 42;
  });

  y += 10;
  txt(this, W/2, y, '⚠️ Пропуск дня сбрасывает стрик!', 9, '#cc6633').setOrigin(0.5);
  y += 20;

  container.setY(startY);
  setContentH(y + 20);
};

TasksScene.prototype._claimStreakDay = function(dayNum) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/tasks/claim_streak', { init_data: State.initData, day_num: dayNum })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        State.player = r.player;
        this._toast(`🎁 День ${dayNum}: ${r.gold ? '+' + r.gold + '🪙 ' : ''}${r.diamonds ? '+' + r.diamonds + '💎 ' : ''}${r.xp ? '+' + r.xp + '⭐' : ''}${r.item ? '📦' : ''}`);
        this.time.delayedCall(800, () => this.scene.restart({ tab: 'streak' }));
      } else {
        this._toast('❌ ' + (r?.reason || 'Ошибка'));
      }
    }).catch(() => { this._claimBusy = false; this._toast('❌ Нет соединения'); });
};
