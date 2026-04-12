/* ============================================================
   TasksScene — вкладка ⚡ Задания
   Ежедневные + Недельные на одной прокручиваемой странице
   ============================================================ */

function _rewardToast(r) {
  const p = [];
  if (r.gold)     p.push(`+${r.gold}💰`);
  if (r.diamonds) p.push(`+${r.diamonds}💎`);
  if (r.xp)       p.push(`+${r.xp}⭐`);
  return p.length ? `🎁 ${p.join(' ')}` : '🎁 Награда получена!';
}

TasksScene.prototype._buildDailyTab = function(data, W, H, startY) {
  const taps = []; // { y, h, xMin?, xMax?, fn() }
  const { container, setContentH } = this._makeScrollZone(W, H, startY, {
    onTap: (relY, relX) => {
      for (const t of taps) {
        if (relY < t.y || relY >= t.y + t.h) continue;
        if (t.xMax !== undefined && relX > t.xMax) continue;
        if (t.xMin !== undefined && relX < t.xMin) continue;
        t.fn(); return;
      }
    },
  });
  const PAD = 10;
  let y = 6;

  // ── Ежедневные задания ────────────────────────────────────
  const daily = data.daily || [];
  const dateTxt = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  container.add(txt(this, PAD, y, '📅 ЕЖЕДНЕВНЫЕ ЗАДАНИЯ', 13, '#ffffff', true).setOrigin(0, 0));
  container.add(txt(this, W - PAD, y, dateTxt, 11, '#ffffff').setOrigin(1, 0));
  y += 22;

  const claimedCount = daily.filter(q => q.reward_claimed).length;
  daily.forEach(q => {
    const done = q.is_completed, claimed = q.reward_claimed;
    if (claimed) return; // скрываем забранные
    const cur = q.current, max = q.target;
    const bh = 62;

    const bg = this.add.graphics();
    bg.fillStyle(done ? 0x0e1828 : 0x0e0e22, 0.95);
    bg.fillRoundedRect(PAD, y, W - PAD * 2, bh, 10);
    bg.lineStyle(1.5, done ? C.gold : 0x1e1e44, 1);
    bg.strokeRoundedRect(PAD, y, W - PAD * 2, bh, 10);
    container.add(bg);

    const icon = q.label.split(' ')[0];
    const name = q.label.replace(/^[^ ]+ /, '');
    container.add(txt(this, PAD + 18, y + 20, icon, 18).setOrigin(0.5));
    container.add(txt(this, PAD + 34, y + 11, name, 11, done ? '#55bbff' : '#ffffff', done).setOrigin(0, 0));
    container.add(txt(this, PAD + 34, y + 26, `${cur} / ${max}`, 10, '#ffffff', true).setOrigin(0, 0));
    container.add(makeBar(this, PAD + 34, y + 40, W - 120, 5, Math.min(1, cur / max), done ? 0x44aaee : C.blue, 0x1a1a3a, 3));
    container.add(txt(this, W - PAD - 4, y + 12, done ? '🎁' : '🔒', 16).setOrigin(1, 0));
    const rwTxt = `+${q.reward_gold}💰${q.reward_diamonds ? ' +' + q.reward_diamonds + '💎' : ''}`;
    container.add(txt(this, W - PAD - 4, y + 38, rwTxt, 9, done ? '#ffd700' : '#ffffff').setOrigin(1, 0));

    if (done) {
      const ty = y;
      taps.push({ y: ty, h: bh, fn: () => this._claimDaily(q.key) });
    }
    y += bh + 5;
  });
  if (claimedCount > 0) {
    container.add(txt(this, W / 2, y, `✅ Забрано: ${claimedCount} из ${daily.length}`, 10, '#667799').setOrigin(0.5));
    y += 18;
  }

  y += 6;
  container.add(txt(this, W / 2, y, '🔄 Сбрасываются каждые сутки в 00:00', 10, '#aaccff').setOrigin(0.5));
  y += 28;

  // ── Недельные задания ─────────────────────────────────────
  const weeklyExtra = data.weekly_extra || [];
  const oldWeekly   = data.oldWeekly || [];
  const weekKey     = data.week_key || '';

  const renderWeeklyQuest = (q, isExtra) => {
    const done = q.is_completed, claimed = q.reward_claimed;
    if (claimed) return; // скрываем забранные
    const cur = q.current, max = q.target;
    const bh = 68;

    const bg = this.add.graphics();
    bg.fillStyle(done ? 0x0e1828 : 0x0e0e22, 0.95);
    bg.fillRoundedRect(PAD, y, W - PAD * 2, bh, 10);
    bg.lineStyle(1.5, done ? C.gold : 0x1e1e44, 1);
    bg.strokeRoundedRect(PAD, y, W - PAD * 2, bh, 10);
    container.add(bg);

    const icon2 = q.label.split(' ')[0];
    const name2 = q.label.replace(/^[^ ]+ /, '');
    container.add(txt(this, PAD + 18, y + 22, icon2, 18).setOrigin(0.5));
    container.add(txt(this, PAD + 34, y + 9, name2, 11, done ? '#55bbff' : '#ffffff', done).setOrigin(0, 0));
    if (q.desc) container.add(txt(this, PAD + 34, y + 23, q.desc, 9, '#ccddff').setOrigin(0, 0));
    container.add(txt(this, PAD + 34, y + 36, `${cur} / ${max}`, 10, '#ffffff', true).setOrigin(0, 0));
    container.add(makeBar(this, PAD + 80, y + 38, W - 140, 4, Math.min(1, cur / max), done ? 0x44aaee : C.gold, 0x1a1a3a, 3));
    container.add(txt(this, W - PAD - 4, y + 9, done ? '🎁' : '🔒', 16).setOrigin(1, 0));
    const rwTxt = `+${q.reward_gold}💰${q.reward_diamonds ? ' +' + q.reward_diamonds + '💎' : ''}`;
    container.add(txt(this, W - PAD - 4, y + 44, rwTxt, 9, done ? '#ffd700' : '#ffffff').setOrigin(1, 0));

    if (done) {
      const ty = y;
      taps.push({ y: ty, h: bh, fn: () => {
        if (isExtra) this._claimWeeklyExtra(q.key, weekKey);
        else         this._claimWeeklyOld(q.key);
      }});
    }
    y += bh + 5;
  };

  if (oldWeekly.length > 0) {
    container.add(txt(this, PAD, y, '📋 ЕЖЕНЕДЕЛЬНЫЕ', 13, '#ffffff', true).setOrigin(0, 0));
    y += 16;
    oldWeekly.forEach(q => renderWeeklyQuest(q, false));
    y += 6;
  }
  if (weeklyExtra.length > 0) {
    const secLabel = oldWeekly.length > 0 ? '✨ НОВЫЕ НЕДЕЛЬНЫЕ' : '📋 ЕЖЕНЕДЕЛЬНЫЕ ЗАДАНИЯ';
    container.add(txt(this, PAD, y, secLabel, 13, '#ffffff', true).setOrigin(0, 0));
    y += 16;
    weeklyExtra.forEach(q => renderWeeklyQuest(q, true));
    y += 6;
  }

  container.add(txt(this, W / 2, y, '🔄 Сброс в понедельник в 00:00', 10, '#aaccff').setOrigin(0.5));
  y += 22;

  container.setY(startY);
  setContentH(y + 8);
};

// ── Клеймы ────────────────────────────────────────────────

TasksScene.prototype._claimDaily = function(taskKey) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/tasks/claim_daily', { task_key: taskKey })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        if (r.player) State.player = r.player;
        _rewardAnim(this, r, () => this.scene.restart({ tab: 'daily' }));
      } else this._toast('❌ ' + (r?.reason || 'Ошибка'));
    }).catch(() => { this._claimBusy = false; this._toast('❌ Нет соединения'); });
};


TasksScene.prototype._claimWeeklyExtra = function(taskKey, weekKey) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/tasks/claim_weekly_extra', { task_key: taskKey })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        if (r.player) State.player = r.player;
        _rewardAnim(this, r, () => this.scene.restart({ tab: 'daily' }));
      } else this._toast('❌ ' + (r?.reason || 'Ошибка'));
    }).catch(() => { this._claimBusy = false; this._toast('❌ Нет соединения'); });
};

TasksScene.prototype._claimWeeklyOld = function(key) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/quests/weekly_claim', { claim_key: key })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        if (r.player) State.player = r.player;
        _rewardAnim(this, r, () => this.scene.restart({ tab: 'daily' }));
      } else this._toast('❌ ' + (r?.reason || 'Ошибка'));
    }).catch(() => { this._claimBusy = false; this._toast('❌ Нет соединения'); });
};
