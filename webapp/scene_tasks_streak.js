/* ============================================================
   TasksScene — вкладка 🗓️ Стрик входа
   Архитектура: header → ряд 7 ячеек → детальный список → warning
   ============================================================ */

TasksScene.prototype._buildStreakTab = function(streak, W, H, startY) {
  if (!streak) {
    txt(this, W/2, startY + 60, 'Загрузка стрика...', 12, '#9999bb').setOrigin(0.5);
    return;
  }

  const taps = []; // { y, h, x, w, fn() }
  const { container, setContentH } = this._makeScrollZone(W, H, startY, {
    onTap: (relY, relX) => {
      for (const t of taps) {
        if (relY < t.y || relY >= t.y + t.h) continue;
        if (t.x !== undefined && (relX < t.x || relX >= t.x + t.w)) continue;
        t.fn(); return;
      }
    },
  });
  let y = 8;

  const setNames = ['A', 'B', 'C', 'D'];
  const ws      = (streak.week_set || 0) % 4;
  const sd      = parseInt(streak.streak_day || 0);
  const claimed = streak.days_claimed || [];
  const rewards = streak.reward_set || [];
  const PAD = 10;

  // ── 1. Шапка стрика ─────────────────────────────────────────
  const hdrBg = this.add.graphics();
  hdrBg.fillStyle(0x1c1c40, 1);
  hdrBg.fillRoundedRect(PAD, y, W - PAD*2, 56, 12);
  hdrBg.lineStyle(2, C.gold, 0.5);
  hdrBg.strokeRoundedRect(PAD, y, W - PAD*2, 56, 12);
  container.add(hdrBg);

  // Значок набора слева
  const badgeBg = this.add.graphics();
  badgeBg.fillStyle(0x332200, 1);
  badgeBg.fillRoundedRect(PAD + 8, y + 10, 36, 36, 8);
  container.add(badgeBg);
  container.add(txt(this, PAD + 26, y + 28, setNames[ws], 18, '#ffd700', true).setOrigin(0.5));

  // Заголовок и подзаголовок
  container.add(txt(this, PAD + 54, y + 16, '7-Дневный стрик входа', 12, '#ffd700', true).setOrigin(0, 0.5));
  const statusStr = sd === 0 ? '✨ Начни новый цикл!' : `День ${sd} из 7`;
  container.add(txt(this, PAD + 54, y + 34, statusStr, 10, '#ffffff').setOrigin(0, 0.5));

  // Прогресс-точки справа
  const dotX = W - PAD - 8;
  for (let i = 6; i >= 0; i--) {
    const dn = i + 1;
    const isDone = claimed.includes(dn);
    const isCur  = dn === sd;
    const dotG = this.add.graphics();
    dotG.fillStyle(isDone ? 0x44cc44 : isCur ? 0xffc83c : 0x333355, 1);
    dotG.fillCircle(dotX - (6 - i) * 12, y + 28, isCur ? 5 : 4);
    container.add(dotG);
  }
  y += 64;

  // ── 2. Метка раздела ────────────────────────────────────────
  container.add(txt(this, PAD, y, 'НАГРАДЫ ТЕКУЩЕГО ЦИКЛА', 10, '#ffffff', true).setOrigin(0, 0));
  container.add(txt(this, W - PAD, y, `Набор ${setNames[ws]}`, 10, '#ffffff').setOrigin(1, 0));
  y += 14;

  // ── 3. Ряд 7 ячеек ──────────────────────────────────────────
  const cellW = Math.floor((W - PAD * 2) / 7);
  const cellH = 78;

  for (let i = 0; i < 7; i++) {
    const dn        = i + 1;
    const rw        = rewards[i] || {};
    const isClaimed = claimed.includes(dn);
    const isCurrent = sd === dn && !isClaimed;
    const isLocked  = dn > sd;

    const dx = PAD + i * cellW;

    // Фон ячейки
    const bgCol    = isClaimed ? 0x0f2a0f : isCurrent ? 0x1a1a50 : 0x111128;
    const bdColor  = isClaimed ? 0x33cc33 : isCurrent ? 0xffc83c : 0x252545;
    const bdWidth  = isCurrent ? 2 : 1;

    const bg = this.add.graphics();
    bg.fillStyle(bgCol, 1);
    bg.fillRoundedRect(dx + 1, y + 1, cellW - 2, cellH - 2, 6);
    bg.lineStyle(bdWidth, bdColor, 1);
    bg.strokeRoundedRect(dx + 1, y + 1, cellW - 2, cellH - 2, 6);
    container.add(bg);

    const cx = dx + cellW / 2;

    // "День N" сверху
    const dayColor = isClaimed ? '#44cc44' : isCurrent ? '#ffd700' : '#ffffff';
    container.add(txt(this, cx, y + 9, `Д${dn}`, 8, dayColor, isCurrent).setOrigin(0.5));

    // Иконка / статус (центр)
    let icon;
    if (isClaimed)            icon = '✅';
    else if (isLocked)        icon = '🔒';
    else if (rw.item)         icon = '📦';
    else if (rw.diamonds > 0) icon = '💎';
    else                      icon = '💰';
    container.add(txt(this, cx, y + 32, icon, isCurrent ? 22 : 18).setOrigin(0.5));

    // Краткая награда снизу (2 строки если надо)
    const parts = [];
    if (rw.gold > 0)           parts.push(`${rw.gold}💰`);
    if (rw.diamonds > 0)       parts.push(`${rw.diamonds}💎`);
    if (rw.item)               parts.push('бокс');
    else if (rw.xp > 0)        parts.push(`${rw.xp}⭐`);

    const rwCol = isClaimed ? '#44cc44' : isCurrent ? '#ffd700' : '#ffffff';
    if (parts.length <= 1) {
      container.add(txt(this, cx, y + 62, parts[0] || '', 8, rwCol).setOrigin(0.5));
    } else {
      container.add(txt(this, cx, y + 56, parts[0], 8, rwCol).setOrigin(0.5));
      container.add(txt(this, cx, y + 68, parts[1] || '', 8, rwCol).setOrigin(0.5));
    }

    // Пульсация + тап для текущего дня
    if (isCurrent) {
      const pulse = this.add.graphics();
      pulse.fillStyle(0xffc83c, 0.12);
      pulse.fillRoundedRect(dx + 1, y + 1, cellW - 2, cellH - 2, 6);
      container.add(pulse);
      this.tweens.add({ targets: pulse, alpha: 0, duration: 800, yoyo: true, repeat: -1 });
      const ty = y, tx = dx + 1, tw = cellW - 2;
      taps.push({ y: ty + 1, h: cellH - 2, x: tx, w: tw, fn: () => this._claimStreakDay(dn) });
    }
  }
  y += cellH + 10;

  // ── 4. Детальный список наград ──────────────────────────────
  const rowH = 38;

  for (let i = 0; i < rewards.length; i++) {
    const dn2   = i + 1;
    const rw2   = rewards[i] || {};
    const isCl2 = claimed.includes(dn2);
    const isCur2 = dn2 === sd;
    const isLk2 = dn2 > sd;

    // Фон строки
    const rowBg = this.add.graphics();
    rowBg.fillStyle(isCl2 ? 0x0d1f0d : isCur2 ? 0x18184a : 0x0e0e22, isCl2 ? 1 : 0.8);
    rowBg.fillRoundedRect(PAD, y, W - PAD*2, rowH, 7);
    if (isCur2) {
      rowBg.lineStyle(1.5, C.gold, 0.8);
      rowBg.strokeRoundedRect(PAD, y, W - PAD*2, rowH, 7);
    }
    container.add(rowBg);

    // Иконка статуса
    const stIcon = isCl2 ? '✅' : isCur2 ? '▶️' : '🔒';
    container.add(txt(this, PAD + 12, y + rowH/2, stIcon, 11).setOrigin(0.5));

    // "День N:"
    const lColor = isCl2 ? '#44cc44' : isCur2 ? '#ffd700' : '#ffffff';
    container.add(txt(this, PAD + 26, y + rowH/2, `День ${dn2}`, 10, lColor, isCur2).setOrigin(0, 0.5));

    // Награды (основной контент)
    const parts2 = [];
    if (rw2.gold > 0)     parts2.push(`+${rw2.gold}💰`);
    if (rw2.diamonds > 0) parts2.push(`+${rw2.diamonds}💎`);
    if (rw2.xp > 0)       parts2.push(`+${rw2.xp}⭐`);
    if (rw2.item)         parts2.push(`📦 ${rw2.item}`);
    const rwColor2 = isCl2 ? '#44cc44' : '#ffffff';
    container.add(txt(this, PAD + 76, y + rowH/2, parts2.join('  '), 10, rwColor2).setOrigin(0, 0.5));

    // Замок/галочка справа (кроме статус-иконки)
    if (isLk2) container.add(txt(this, W - PAD - 8, y + rowH/2, '🔒', 10).setOrigin(1, 0.5));

    y += rowH + 3;
  }

  // ── 5. Предупреждение ───────────────────────────────────────
  y += 8;
  const wBg = this.add.graphics();
  wBg.fillStyle(0x2a1200, 1);
  wBg.fillRoundedRect(PAD, y, W - PAD*2, 32, 8);
  wBg.lineStyle(1, 0x884400, 0.7);
  wBg.strokeRoundedRect(PAD, y, W - PAD*2, 32, 8);
  container.add(wBg);
  container.add(txt(this, W/2, y + 16, '⚠️  Пропуск дня сбрасывает стрик!', 9, '#dd8833').setOrigin(0.5));
  y += 38;

  container.setY(startY);
  setContentH(y + 8);
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
        if (r.gold)     parts.push(`+${r.gold}💰`);
        if (r.diamonds) parts.push(`+${r.diamonds}💎`);
        if (r.xp)       parts.push(`+${r.xp}⭐`);
        if (r.item)     parts.push('📦');
        this._toast(`🎁 День ${dayNum}: ${parts.join(' ')}`);
        this.time.delayedCall(800, () => this.scene.restart({ tab: 'streak' }));
      } else {
        this._toast('❌ ' + (r?.reason || 'Ошибка'));
      }
    }).catch(() => { this._claimBusy = false; this._toast('❌ Нет соединения'); });
};
