/* ============================================================
   TasksScene — вкладка 🗓️ Стрик входа
   ============================================================ */

TasksScene.prototype._buildStreakTab = function(streak, W, H, startY) {
  if (!streak) {
    txt(this, W/2, startY + 60, 'Загрузка стрика...', 12, '#9999bb').setOrigin(0.5);
    return;
  }

  const { container, setContentH } = this._makeScrollZone(W, H, startY);
  let y = 8;

  const setNames = ['A', 'B', 'C', 'D'];
  const ws  = (streak.week_set || 0) % 4;
  const sd  = parseInt(streak.streak_day || 0);
  const claimed = streak.days_claimed || [];
  const rewards = streak.reward_set || [];

  // ── Подзаголовок ────────────────────────────────────────────
  const hdrBg = this.add.graphics();
  hdrBg.fillStyle(0x1a1a38, 0.9);
  hdrBg.fillRoundedRect(8, y, W - 16, 50, 10);
  hdrBg.lineStyle(1.5, C.gold, 0.4);
  hdrBg.strokeRoundedRect(8, y, W - 16, 50, 10);
  const hdrT1 = txt(this, W/2, y + 14, `🗓️ 7-Дневный стрик — Набор ${setNames[ws]}`, 12, '#ffd700', true).setOrigin(0.5);
  const statusTxt = sd === 0 ? 'Начни новый цикл!' : `День ${sd} из 7`;
  const hdrT2 = txt(this, W/2, y + 32, statusTxt, 10, '#aaaacc').setOrigin(0.5);
  container.add([hdrBg, hdrT1, hdrT2]);
  y += 58;

  // ── Метка секции ────────────────────────────────────────────
  const secLabel = txt(this, 12, y, 'НАГРАДЫ ТЕКУЩЕГО ЦИКЛА', 8, '#6666aa', true).setOrigin(0, 0);
  const secDayLbl = txt(this, W - 12, y, `День ${sd === 0 ? 1 : sd} из 7`, 8, '#aaaacc').setOrigin(1, 0);
  container.add([secLabel, secDayLbl]);
  y += 16;

  // ── Ряд иконок дней ─────────────────────────────────────────
  const cellW = Math.floor((W - 16) / 7);
  for (let i = 0; i < 7; i++) {
    const dn      = i + 1;
    const rw      = rewards[i] || {};
    const isClaimed = claimed.includes(dn);
    const isCurrent = (sd === dn) && !isClaimed;
    const isLocked  = dn > sd || (dn === sd && isClaimed);

    const dx = 8 + i * cellW;
    const col    = isClaimed ? 0x1a3a1a : isCurrent ? 0x2a2060 : 0x141428;
    const border = isClaimed ? 0x44cc44 : isCurrent ? C.gold : 0x333355;
    const alpha  = isClaimed ? 1 : isCurrent ? 1 : 0.55;

    const bg = this.add.graphics();
    bg.fillStyle(col, alpha);
    bg.fillRoundedRect(dx, y, cellW - 2, 68, 6);
    bg.lineStyle(isCurrent ? 2 : 1, border, isCurrent ? 1 : 0.5);
    bg.strokeRoundedRect(dx, y, cellW - 2, 68, 6);
    container.add(bg);

    const cx = dx + (cellW - 2) / 2;
    const dayColor = isClaimed ? '#44cc44' : isCurrent ? '#ffd700' : '#666688';
    const dayTxt = txt(this, cx, y + 8, `День ${dn}`, 7, dayColor, isCurrent).setOrigin(0.5);
    container.add(dayTxt);

    // Иконка состояния / награды
    let icon;
    if (isClaimed)      icon = '✅';
    else if (isLocked)  icon = '🔒';
    else if (rw.item)   icon = '📦';
    else if (rw.diamonds > 0) icon = '💎';
    else                icon = '🪙';
    container.add(txt(this, cx, y + 28, icon, 16).setOrigin(0.5));

    // Краткий текст награды
    let shortReward = '';
    if (rw.item)            shortReward = 'бокс';
    else if (rw.diamonds > 0) shortReward = `${rw.diamonds}💎`;
    else if (rw.gold > 0)   shortReward = `${rw.gold}🪙`;
    const rwColor = isClaimed ? '#448844' : isCurrent ? '#cccc44' : '#5555aa';
    container.add(txt(this, cx, y + 50, shortReward, 7, rwColor).setOrigin(0.5));

    // Кнопка клейма (только текущий незабранный)
    if (isCurrent) {
      const pulse = this.add.graphics();
      pulse.fillStyle(0xffc83c, 0.18);
      pulse.fillRoundedRect(dx, y, cellW - 2, 68, 6);
      container.add(pulse);
      this.tweens.add({ targets: pulse, alpha: 0, duration: 700, yoyo: true, repeat: -1 });

      const zone = this.add.zone(dx, y + startY, cellW - 2, 68).setOrigin(0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this._claimStreakDay(dn));
    }
  }
  y += 76;

  // ── Детальный список наград ─────────────────────────────────
  for (let i = 0; i < rewards.length; i++) {
    const dn2    = i + 1;
    const rw2    = rewards[i] || {};
    const isCl2  = claimed.includes(dn2);
    const isCur2 = dn2 === sd;

    const rowBg = this.add.graphics();
    rowBg.fillStyle(isCl2 ? 0x0e1e0e : isCur2 ? 0x1a1a38 : C.bgPanel, isCl2 ? 0.95 : 0.7);
    rowBg.fillRoundedRect(8, y, W - 16, 34, 7);
    if (isCur2) {
      rowBg.lineStyle(1.5, C.gold, 0.7);
      rowBg.strokeRoundedRect(8, y, W - 16, 34, 7);
    }
    container.add(rowBg);

    // "День N:"
    const labelColor = isCl2 ? '#44cc44' : isCur2 ? '#ffd700' : '#7777aa';
    container.add(txt(this, 18, y + 17, `День ${dn2}:`, 10, labelColor, isCur2).setOrigin(0, 0.5));

    // Награды
    const parts = [];
    if (rw2.gold > 0)     parts.push(`+${rw2.gold}🪙`);
    if (rw2.diamonds > 0) parts.push(`+${rw2.diamonds}💎`);
    if (rw2.xp > 0)       parts.push(`+${rw2.xp}⭐`);
    if (rw2.item)         parts.push(`📦 ${rw2.item}`);
    const rewardColor = isCl2 ? '#558855' : isCur2 ? '#ddddee' : '#aaaacc';
    container.add(txt(this, 72, y + 17, parts.join('  '), 10, rewardColor).setOrigin(0, 0.5));

    // Статус
    const statusIcon = isCl2 ? '✅' : isCur2 ? '⬅️' : '🔒';
    container.add(txt(this, W - 16, y + 17, statusIcon, 11).setOrigin(1, 0.5));

    y += 38;
  }

  // ── Предупреждение ──────────────────────────────────────────
  y += 6;
  const warnBg = this.add.graphics();
  warnBg.fillStyle(0x3a1a00, 0.7);
  warnBg.fillRoundedRect(8, y, W - 16, 28, 7);
  container.add(warnBg);
  container.add(txt(this, W/2, y + 14, '⚠️ Пропуск дня сбрасывает стрик!', 9, '#dd8833').setOrigin(0.5));
  y += 34;

  container.setY(startY);
  setContentH(y + 10);
};

TasksScene.prototype._claimStreakDay = function(dayNum) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/tasks/claim_streak', { day_num: dayNum })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        if (r.player) State.player = r.player;
        const parts = [];
        if (r.gold)     parts.push(`+${r.gold}🪙`);
        if (r.diamonds) parts.push(`+${r.diamonds}💎`);
        if (r.xp)       parts.push(`+${r.xp}⭐`);
        if (r.item)     parts.push(`📦`);
        this._toast(`🎁 День ${dayNum}: ${parts.join(' ')}`);
        this.time.delayedCall(800, () => this.scene.restart({ tab: 'streak' }));
      } else {
        this._toast('❌ ' + (r?.reason || 'Ошибка'));
      }
    }).catch(() => { this._claimBusy = false; this._toast('❌ Нет соединения'); });
};
