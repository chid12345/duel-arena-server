/* ============================================================
   QuestsScene — расширение: _buildWeeklyTab, _claimDaily,
   _claimQuest, _toast
   ============================================================ */

Object.assign(QuestsScene.prototype, {

  /* ══ ЕЖЕНЕДЕЛЬНАЯ ВКЛАДКА ════════════════════════════════════ */
  _buildWeeklyTab(w, W, H, y) {
    const list = Array.isArray(w.quests) ? w.quests : [];
    const readyCount = list.filter(q => q.is_completed && !q.reward_claimed).length;
    txt(this, 14, y, `ЗАДАНИЯ НЕДЕЛИ  (выполнено: ${list.filter(q=>q.is_completed).length}/${list.length})`, 10, '#ddddff', true);
    if (readyCount > 0) {
      const bdg = this.add.graphics();
      bdg.fillStyle(0x1a4010, 1); bdg.fillRoundedRect(W-108, y-4, 100, 18, 5);
      txt(this, W-58, y+5, `🎁 ${readyCount} к получению`, 10, '#3cc864', true).setOrigin(0.5);
    }
    y += 16;

    list.forEach((q, i) => {
      const done = q.is_completed, claimed = q.reward_claimed;
      const isEndless = q.key.includes('endless');
      /* Высота карточки: если есть кнопка — увеличиваем */
      const qh = (done && !claimed) ? 90 : 66;
      const qy = y;
      y += qh + 8;

      const borderCol = claimed ? C.gold : done ? C.green : C.dark;
      const bg = this.add.graphics();
      bg.fillStyle(claimed ? 0x1a1500 : done ? (isEndless ? 0x1a0800 : 0x081a08) : C.bgPanel, 0.92);
      bg.fillRoundedRect(8, qy, W-16, qh, 10);
      bg.lineStyle(1.5, borderCol, claimed || done ? 0.65 : 0.2);
      bg.strokeRoundedRect(8, qy, W-16, qh, 10);

      const icon = q.key.includes('pvp') ? '⚔️' : q.key.includes('titan') ? '🗿' :
                   q.key.includes('endless') ? '🔥' : q.key.includes('streak') ? '🔥' : '📌';
      txt(this, 22, qy+32, icon, 18).setOrigin(0.5);
      txt(this, 40, qy+9,  q.label, 11, done ? (isEndless ? '#ff8855' : '#3cc864') : '#ccccee', done);
      txt(this, 40, qy+24, `${Math.min(q.current, q.target)} / ${q.target}`, 9, '#ddddff', true);
      makeBar(this, 40, qy+38, W-160, 4, Math.min(1, q.current/q.target),
        isEndless ? 0xdc3c46 : (done ? C.green : C.blue), C.dark, 3);

      /* Награда — компактно справа */
      txt(this, W-14, qy+10, `+${q.reward_gold}🪙`, 10, '#ffc83c', true).setOrigin(1, 0);
      if (q.reward_diamonds > 0)
        txt(this, W-14, qy+24, `+${q.reward_diamonds}💎`, 10, '#3cc8dc', true).setOrigin(1, 0);
      if (q.reward_xp > 0)
        txt(this, W-14, qy+38, `+${q.reward_xp}⭐`, 9, '#b45aff', true).setOrigin(1, 0);

      if (claimed) {
        txt(this, W/2, qy+52, '✅ Получено', 10, '#ffc83c', true).setOrigin(0.5);
      } else if (done) {
        /* Широкая кнопка во всю карточку */
        const bw = W-36, bh = 28, bx = 18, by2 = qy+56;
        const btnG = this.add.graphics();
        btnG.fillStyle(isEndless ? 0xdc3c46 : C.green, 1);
        btnG.fillRoundedRect(bx, by2, bw, bh, 7);
        btnG.fillStyle(0xffffff, 0.1); btnG.fillRoundedRect(bx+2, by2+2, bw-4, 11, 5);
        const rLabel = `🎁 Забрать  +${q.reward_gold}🪙${q.reward_diamonds>0?' +'+q.reward_diamonds+'💎':''}`;
        const btnT = txt(this, bx+bw/2, by2+bh/2, rLabel, 11, '#1a1a28', true).setOrigin(0.5);
        const zone = this.add.zone(bx, by2, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => { btnG.clear(); btnG.fillStyle(isEndless?0xaa2020:0x28a050,1); btnG.fillRoundedRect(bx,by2,bw,bh,7); tg?.HapticFeedback?.impactOccurred('medium'); });
        zone.on('pointerout',  () => { btnG.clear(); btnG.fillStyle(isEndless?0xdc3c46:C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,7); });
        zone.on('pointerup', () => {
          if (this._claimBusy) return;
          this._claimBusy = true;
          zone.disableInteractive();
          btnT.setText('⏳ Получаем...');
          post('/api/quests/weekly_claim', { claim_key: q.key })
            .catch(() => ({ ok: false }))
            .then(res => {
              if (res.ok) {
                tg?.HapticFeedback?.notificationOccurred('success');
                Sound.questDone();
                if (res.player) State.player = res.player;
                btnG.clear(); btnG.fillStyle(0x0a1a0a,0.8); btnG.fillRoundedRect(bx,by2,bw,bh,7);
                btnT.setText(`✅ +${q.reward_gold}🪙 получено!`);
                _rewardAnim(this, { gold: q.reward_gold, diamonds: q.reward_diamonds, xp: q.reward_xp },
                  () => { this._claimBusy = false; this.scene.restart({ tab: 'weekly' }); });
              } else {
                this._claimBusy = false;
                zone.setInteractive({ useHandCursor: true });
                btnT.setText(res.reason || '❌ Ошибка');
                this.time.delayedCall(1500, () => btnT.setText(rLabel));
              }
            });
        });
      } else {
        txt(this, W/2, qy+52, '🔒 Выполни задание', 9, '#aaaacc').setOrigin(0.5);
      }
    });
    txt(this, W/2, H-42, '🔄 Обновляется каждую неделю (Пн 00:00)', 9, '#555577').setOrigin(0.5);
  },

  /* ── Получить ежедневный бонус ─────────────────────────── */
  async _claimDaily(btnG, btnT, bx, by, bw, bh, bonus) {
    try {
      const res = await post('/api/daily/claim');
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.buy();
        if (res.player) State.player = res.player;
        btnG.clear(); btnG.fillStyle(0x0a1a0a,0.8); btnG.fillRoundedRect(bx,by,bw,bh,8);
        btnT.setText(`✅ +${res.bonus || bonus}🪙 зачислено!`);
        _rewardAnim(this, { gold: res.bonus || bonus },
          () => { this._claimBusy = false; this.scene.restart({ tab: 'daily' }); });
      } else {
        this._claimBusy = false;
        btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by,bw,bh,8);
        btnT.setText(res.reason || 'Уже получено');
      }
    } catch(_) {
      this._claimBusy = false;
      btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by,bw,bh,8);
      btnT.setText('❌ Нет соединения');
    }
  },

  /* ── Получить награду за основной квест ─────────────────── */
  async _claimQuest(clBg, clT, gold, xp, W, btnY) {
    try {
      const res = await post('/api/quests/claim');
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.questDone();
        if (res.player) State.player = res.player;
        clBg.clear(); clBg.fillStyle(0x0a1a0a,0.8); clBg.fillRoundedRect(16, btnY, W-32, 46, 12);
        clT.setText(`✅ +${res.gold||gold}🪙  +${res.xp||xp}⭐ — зачислено!`);
        _rewardAnim(this, { gold: res.gold || gold, xp: res.xp || xp },
          () => { this._claimBusy = false; this.scene.restart({ tab: 'daily' }); });
      } else {
        this._claimBusy = false;
        clT.setText(res.reason || '❌ Ошибка');
        this.time.delayedCall(1500, () => clT.setText(`🎁 Забрать +${gold}🪙 +${xp}⭐`));
      }
    } catch(_) {
      this._claimBusy = false;
      clT.setText('❌ Нет соединения');
    }
  },

  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 80, msg, 12, '#ffc83c', true).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 36, duration: 2400, onComplete: () => t.destroy() });
  },

});
