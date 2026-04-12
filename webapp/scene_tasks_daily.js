/* ============================================================
   TasksScene — вкладка ⚡ Задания
   Страница 0: Ежедневные  |  Страница 1: Недельные
   Переключение стрелками ◀ ▶ (без отдельной сцены)
   ============================================================ */

TasksScene.prototype._buildDailyTab = function(data, W, H, startY, subpage) {
  subpage = subpage || 'daily';
  const { container, setContentH } = this._makeScrollZone(W, H, startY);
  const PAD = 10;
  let y = 6;

  // ── Переключатель страниц ─────────────────────────────────
  const pages    = ['daily', 'weekly'];
  const labels   = ['⚡ Ежедневные', '📋 Недельные'];
  const pageIdx  = pages.indexOf(subpage);

  const navBg = this.add.graphics();
  navBg.fillStyle(0x111130, 1);
  navBg.fillRoundedRect(PAD, y, W - PAD*2, 36, 9);
  navBg.lineStyle(1.5, C.blue, 0.3);
  navBg.strokeRoundedRect(PAD, y, W - PAD*2, 36, 9);
  container.add(navBg);

  // Стрелка влево
  const leftOn = pageIdx > 0;
  container.add(txt(this, PAD + 20, y + 18, '◀', 14, leftOn ? '#ffffff' : '#333355', false).setOrigin(0.5));
  // Заголовок страницы
  container.add(txt(this, W/2, y + 18, labels[pageIdx], 12, '#ffd700', true).setOrigin(0.5));
  // Стрелка вправо
  const rightOn = pageIdx < pages.length - 1;
  container.add(txt(this, W - PAD - 20, y + 18, '▶', 14, rightOn ? '#ffffff' : '#333355', false).setOrigin(0.5));

  // Точки-индикаторы страниц
  pages.forEach((_, pi) => {
    const dotG = this.add.graphics();
    dotG.fillStyle(pi === pageIdx ? 0xffc83c : 0x333355, 1);
    dotG.fillCircle(W/2 - 6 + pi * 12, y + 32, 3);
    container.add(dotG);
  });

  // Зоны нажатия стрелок
  if (leftOn) {
    this.add.zone(PAD, y + startY, 50, 36).setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        tg?.HapticFeedback?.selectionChanged?.();
        this.scene.restart({ tab: 'daily', subpage: pages[pageIdx - 1] });
      });
  }
  if (rightOn) {
    this.add.zone(W - PAD - 50, y + startY, 50, 36).setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        tg?.HapticFeedback?.selectionChanged?.();
        this.scene.restart({ tab: 'daily', subpage: pages[pageIdx + 1] });
      });
  }
  y += 44;

  // ── Страница 0: Ежедневные ───────────────────────────────
  if (subpage === 'daily') {
    const daily = data.daily || [];
    const dateTxt = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    container.add(txt(this, PAD, y, '📅 ЕЖЕДНЕВНЫЕ ЗАДАНИЯ', 13, '#ffffff', true).setOrigin(0, 0));
    container.add(txt(this, W - PAD, y, dateTxt, 11, '#ffffff').setOrigin(1, 0));
    y += 22;

    // Кнопка "Забрать все"
    const claimable = daily.filter(q => q.is_completed && !q.reward_claimed);
    if (claimable.length > 1) {
      const allBg = this.add.graphics();
      allBg.fillStyle(0xffc83c, 1);
      allBg.fillRoundedRect(PAD, y, W - PAD*2, 34, 8);
      container.add(allBg);
      container.add(txt(this, W/2, y + 17, `🎁 Забрать все выполненные (${claimable.length})`, 11, '#1a1a28', true).setOrigin(0.5));
      this.add.zone(PAD, y + startY, W - PAD*2, 34).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => this._claimAllDaily(claimable));
      y += 42;
    }

    daily.forEach(q => {
      const done = q.is_completed, claimed = q.reward_claimed;
      const cur = q.current, max = q.target;
      const bh = 62;

      const bg = this.add.graphics();
      bg.fillStyle(done ? (claimed ? 0x0a1a0a : 0x0c1e0e) : 0x0e0e22, 0.95);
      bg.fillRoundedRect(PAD, y, W - PAD*2, bh, 10);
      bg.lineStyle(1.5, done ? (claimed ? 0x33aa33 : C.gold) : 0x1e1e44, 1);
      bg.strokeRoundedRect(PAD, y, W - PAD*2, bh, 10);
      container.add(bg);

      // Эмодзи + название
      const icon = q.label.split(' ')[0];
      const name = q.label.replace(/^[^ ]+ /, '');
      container.add(txt(this, PAD + 18, y + 20, icon, 18).setOrigin(0.5));
      container.add(txt(this, PAD + 34, y + 11, name, 11, done ? '#44ee77' : '#ffffff', done).setOrigin(0, 0));

      // Прогресс
      container.add(txt(this, PAD + 34, y + 26, `${cur} / ${max}`, 10, '#ffffff', true).setOrigin(0, 0));
      makeBar(this, PAD + 34, y + 40, W - 120, 5, Math.min(1, cur / max), done ? C.green : C.blue, 0x1a1a3a, 3);

      // Статус + награда
      container.add(txt(this, W - PAD - 4, y + 12, claimed ? '✅' : (done ? '🎁' : '🔒'), 16).setOrigin(1, 0));
      if (!claimed) {
        const rwTxt = `+${q.reward_gold}🪙${q.reward_diamonds ? ' +' + q.reward_diamonds + '💎' : ''}`;
        container.add(txt(this, W - PAD - 4, y + 38, rwTxt, 9, done ? '#ffd700' : '#ffffff').setOrigin(1, 0));
      }

      if (done && !claimed) {
        this.add.zone(PAD, y + startY, W - PAD*2, bh).setOrigin(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this._claimDaily(q.key, `+${q.reward_gold}🪙`));
      }
      y += bh + 5;
    });

    y += 6;
    container.add(txt(this, W/2, y, '🔄 Сбрасываются каждые сутки в 00:00', 10, '#aaccff').setOrigin(0.5));
    y += 22;
  }

  // ── Страница 1: Недельные ─────────────────────────────────
  else {
    const weeklyExtra = data.weekly_extra || [];
    const oldWeekly   = data.oldWeekly || [];
    const weekKey     = data.week_key || '';

    const renderWeeklyQuest = (q, isExtra) => {
      const done = q.is_completed, claimed = q.reward_claimed;
      const cur = q.current, max = q.target;
      const bh = 68;

      const bg = this.add.graphics();
      bg.fillStyle(done ? (claimed ? 0x0a1a0a : 0x0c1e0e) : 0x0e0e22, 0.95);
      bg.fillRoundedRect(PAD, y, W - PAD*2, bh, 10);
      bg.lineStyle(1.5, done ? (claimed ? 0x33aa33 : C.gold) : 0x1e1e44, 1);
      bg.strokeRoundedRect(PAD, y, W - PAD*2, bh, 10);
      container.add(bg);

      // Эмодзи + название
      const icon2 = q.label.split(' ')[0];
      const name2 = q.label.replace(/^[^ ]+ /, '');
      container.add(txt(this, PAD + 18, y + 22, icon2, 18).setOrigin(0.5));
      container.add(txt(this, PAD + 34, y + 9, name2, 11, done ? '#44ee77' : '#ffffff', done).setOrigin(0, 0));

      // Описание
      if (q.desc) container.add(txt(this, PAD + 34, y + 23, q.desc, 9, '#ccddff').setOrigin(0, 0));

      // Прогресс
      container.add(txt(this, PAD + 34, y + 36, `${cur} / ${max}`, 10, '#ffffff', true).setOrigin(0, 0));
      makeBar(this, PAD + 80, y + 38, W - 140, 4, Math.min(1, cur / max), done ? C.green : C.gold, 0x1a1a3a, 3);

      // Статус + награда
      container.add(txt(this, W - PAD - 4, y + 9, claimed ? '✅' : (done ? '🎁' : '🔒'), 16).setOrigin(1, 0));
      if (!claimed) {
        const rwTxt = `+${q.reward_gold}🪙${q.reward_diamonds ? ' +' + q.reward_diamonds + '💎' : ''}`;
        container.add(txt(this, W - PAD - 4, y + 44, rwTxt, 9, done ? '#ffd700' : '#ffffff').setOrigin(1, 0));
      }

      if (done && !claimed) {
        this.add.zone(PAD, y + startY, W - PAD*2, bh).setOrigin(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            if (isExtra) this._claimWeeklyExtra(q.key, weekKey, `+${q.reward_gold}🪙`);
            else         this._claimWeeklyOld(q.key, `+${q.reward_gold}🪙`);
          });
      }
      y += bh + 5;
    };

    // Старые недельные (если есть)
    if (oldWeekly.length > 0) {
      container.add(txt(this, PAD, y, '📋 ЕЖЕНЕДЕЛЬНЫЕ', 13, '#ffffff', true).setOrigin(0, 0));
      y += 16;
      oldWeekly.forEach(q => renderWeeklyQuest(q, false));
      y += 6;
    }

    // Новые недельные
    if (weeklyExtra.length > 0) {
      const secLabel = oldWeekly.length > 0 ? '✨ НОВЫЕ НЕДЕЛЬНЫЕ' : '📋 ЕЖЕНЕДЕЛЬНЫЕ ЗАДАНИЯ';
      container.add(txt(this, PAD, y, secLabel, 13, '#ffffff', true).setOrigin(0, 0));
      y += 16;
      weeklyExtra.forEach(q => renderWeeklyQuest(q, true));
      y += 6;
    }

    container.add(txt(this, W/2, y, '🔄 Сброс в понедельник в 00:00', 10, '#aaccff').setOrigin(0.5));
    y += 22;
  }

  container.setY(startY);
  setContentH(y + 8);
};

// ── Клеймы ────────────────────────────────────────────────

TasksScene.prototype._claimDaily = function(taskKey, rewardTxt) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/tasks/claim_daily', { task_key: taskKey })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        if (r.player) State.player = r.player;
        this._toast(`🎁 ${rewardTxt}`);
        this.time.delayedCall(500, () => this.scene.restart({ tab: 'daily', subpage: 'daily' }));
      } else this._toast('❌ ' + (r?.reason || 'Ошибка'));
    }).catch(() => { this._claimBusy = false; });
};

TasksScene.prototype._claimAllDaily = function(tasks) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  const keys = tasks.map(t => t.key);
  const doNext = () => {
    if (!keys.length) {
      this._claimBusy = false;
      this._toast('✅ Все награды получены!');
      this.time.delayedCall(600, () => this.scene.restart({ tab: 'daily', subpage: 'daily' }));
      return;
    }
    post('/api/tasks/claim_daily', { task_key: keys.shift() })
      .then(r => { if (r?.ok && r.player) State.player = r.player; doNext(); })
      .catch(() => doNext());
  };
  doNext();
};

TasksScene.prototype._claimWeeklyExtra = function(taskKey, weekKey, rewardTxt) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/tasks/claim_weekly_extra', { task_key: taskKey })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        if (r.player) State.player = r.player;
        this._toast(`🎁 ${rewardTxt}`);
        this.time.delayedCall(500, () => this.scene.restart({ tab: 'daily', subpage: 'weekly' }));
      } else this._toast('❌ ' + (r?.reason || 'Ошибка'));
    }).catch(() => { this._claimBusy = false; });
};

TasksScene.prototype._claimWeeklyOld = function(key, rewardTxt) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/quests/weekly_claim', { claim_key: key })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        if (r.player) State.player = r.player;
        this._toast(`🎁 ${rewardTxt}`);
        this.time.delayedCall(500, () => this.scene.restart({ tab: 'daily', subpage: 'weekly' }));
      } else this._toast('❌ ' + (r?.reason || 'Ошибка'));
    }).catch(() => { this._claimBusy = false; });
};
