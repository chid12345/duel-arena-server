/* ============================================================
   TasksScene — вкладка ⚡ Задания (ежедневные + кнопка на Weekly)
   ============================================================ */

TasksScene.prototype._buildDailyTab = function(data, W, H, startY) {
  const daily = data.daily || [];
  const { container, setContentH } = this._makeScrollZone(W, H, startY);
  let y = 6;

  // Заголовок ежедневных
  const dateTxt = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  container.add(txt(this, 12, y, '⚡ ЕЖЕДНЕВНЫЕ', 10, '#8899cc', true).setOrigin(0, 0));
  container.add(txt(this, W - 10, y, dateTxt, 9, '#7777aa').setOrigin(1, 0));
  y += 18;

  const claimable = daily.filter(q => q.is_completed && !q.reward_claimed);
  if (claimable.length > 1) {
    // Кнопка "Забрать все"
    const allBg = this.add.graphics();
    allBg.fillStyle(0xffc83c, 1); allBg.fillRoundedRect(8, y, W - 16, 34, 8);
    container.add(allBg);
    container.add(txt(this, W/2, y + 17, `🎁 Забрать все выполненные (${claimable.length})`, 11, '#1a1a28', true).setOrigin(0.5));
    const aZ = this.add.zone(8, y + startY, W - 16, 34).setOrigin(0).setInteractive({ useHandCursor: true });
    aZ.on('pointerup', () => this._claimAllDaily(claimable));
    y += 42;
  }

  daily.forEach(q => {
    const done = q.is_completed, claimed = q.reward_claimed;
    const cur = q.current, max = q.target;
    const bh = 60;

    const bg3 = this.add.graphics();
    bg3.fillStyle(done ? (claimed ? 0x0a1a0a : 0x0e1e10) : C.bgPanel, 0.92);
    bg3.fillRoundedRect(8, y, W - 16, bh, 10);
    bg3.lineStyle(1.5, done ? (claimed ? C.green : C.gold) : C.dark, done ? 0.5 : 0.2);
    bg3.strokeRoundedRect(8, y, W - 16, bh, 10);
    container.add(bg3);

    // Иконка + текст
    container.add(txt(this, 26, y + 20, q.label.split(' ')[0], 18).setOrigin(0.5));
    const labelTxt = q.label.replace(/^[^ ]+ /, '');
    container.add(txt(this, 42, y + 10, labelTxt, 11, done ? '#3cc864' : '#ffffff', done).setOrigin(0, 0));
    container.add(txt(this, 42, y + 24, `${cur} / ${max}`, 9, '#aaaacc', true).setOrigin(0, 0));
    makeBar(this, 42, y + 38, W - 120, 4, Math.min(1, cur / max), done ? C.green : C.blue, C.dark, 3);

    // Награда или галочка
    const rwTxt = `+${q.reward_gold}🪙${q.reward_diamonds ? ' +' + q.reward_diamonds + '💎' : ''}`;
    container.add(txt(this, W - 12, y + 10, claimed ? '✅' : (done ? '🎁' : '🔒'), 16).setOrigin(1, 0));
    if (!claimed) container.add(txt(this, W - 12, y + 34, rwTxt, 8, done ? '#ffd700' : '#aabbcc').setOrigin(1, 0));

    // Кнопка клейма
    if (done && !claimed) {
      const zone2 = this.add.zone(8, y + startY, W - 16, bh).setOrigin(0)
        .setInteractive({ useHandCursor: true });
      zone2.on('pointerup', () => this._claimDaily(q.key, `+${q.reward_gold}🪙`));
    }
    y += bh + 6;
  });

  y += 6;
  container.add(txt(this, W/2, y, '🔄 Сбрасываются каждые сутки в 00:00', 9, '#7777aa').setOrigin(0.5));
  y += 20;

  // Кнопка к недельным
  const wBg = this.add.graphics();
  wBg.fillStyle(0x1a1a38, 0.9); wBg.fillRoundedRect(8, y, W - 16, 38, 10);
  wBg.lineStyle(1.5, C.blue, 0.4); wBg.strokeRoundedRect(8, y, W - 16, 38, 10);
  container.add(wBg);
  container.add(txt(this, W/2, y + 19, '📋 Перейти к недельным заданиям →', 11, '#8899ee').setOrigin(0.5));
  const wZ = this.add.zone(8, y + startY, W - 16, 38).setOrigin(0).setInteractive({ useHandCursor: true });
  wZ.on('pointerup', () => this.scene.start('TasksWeekly', { data: this._data }));
  y += 48;

  container.setY(startY);
  setContentH(y + 10);
};

TasksScene.prototype._claimDaily = function(taskKey, rewardTxt) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/tasks/claim_daily', { init_data: State.initData, task_key: taskKey })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        State.player = r.player;
        this._toast(`🎁 ${rewardTxt}`);
        this.time.delayedCall(500, () => this.scene.restart({ tab: 'daily' }));
      } else {
        this._toast('❌ ' + (r?.reason || 'Ошибка'));
      }
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
      this.time.delayedCall(600, () => this.scene.restart({ tab: 'daily' }));
      return;
    }
    const k = keys.shift();
    post('/api/tasks/claim_daily', { init_data: State.initData, task_key: k })
      .then(r => { if (r?.ok) State.player = r.player; doNext(); })
      .catch(() => doNext());
  };
  doNext();
};
