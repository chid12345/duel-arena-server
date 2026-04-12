/* ============================================================
   TasksScene — вкладка 🏆 Достижения (многоуровневые с XP-шкалой)
   ============================================================ */

TasksScene.prototype._buildAchieveTab = function(achievements, W, H, startY) {
  if (!achievements || !achievements.length) {
    txt(this, W/2, startY + 60, 'Нет данных', 12, '#9999bb').setOrigin(0.5);
    return;
  }

  const { container, setContentH } = this._makeScrollZone(W, H, startY);
  let y = 6;

  // Счётчик готовых к получению
  const ready = achievements.filter(a => a.can_claim_tier !== null && !a.all_done).length;
  if (ready > 0) {
    const aBg = this.add.graphics();
    aBg.fillStyle(0x1a2a10, 0.9); aBg.fillRoundedRect(8, y, W - 16, 30, 8);
    aBg.lineStyle(1.5, C.green, 0.5); aBg.strokeRoundedRect(8, y, W - 16, 30, 8);
    container.add(aBg);
    container.add(txt(this, W/2, y + 15, `🎁 Готово к получению: ${ready} достижени${ready === 1 ? 'е' : ready < 5 ? 'я' : 'й'}`, 11, '#3cc864', true).setOrigin(0.5));
    y += 38;
  }

  achievements.forEach(a => {
    const bh = 72;
    const canClaim = a.can_claim_tier !== null;
    const allDone = a.all_done;
    const cur = a.current;
    const prevT = a.prev_target;
    const nextT = a.next_target;
    const tier = a.claimed_tier;
    const maxTier = a.max_tier;

    // Фон карточки
    const bg = this.add.graphics();
    const bgCol = allDone ? 0x1a1a00 : canClaim ? 0x0e1e10 : C.bgPanel;
    bg.fillStyle(bgCol, 0.92);
    bg.fillRoundedRect(8, y, W - 16, bh, 10);
    bg.lineStyle(1.5, allDone ? C.gold : canClaim ? C.green : C.dark, allDone ? 0.6 : canClaim ? 0.5 : 0.2);
    bg.strokeRoundedRect(8, y, W - 16, bh, 10);
    container.add(bg);

    // Название
    container.add(txt(this, 14, y + 8, a.label, 11, allDone ? '#ffd700' : canClaim ? '#3cc864' : '#ffffff', canClaim || allDone).setOrigin(0, 0));

    // Уровень
    const tierLabel = allDone ? `Макс. (${maxTier}/${maxTier})` : `Ур. ${tier}/${maxTier}`;
    container.add(txt(this, W - 12, y + 8, tierLabel, 10, '#ffffff').setOrigin(1, 0));

    if (allDone) {
      // Всё выполнено
      container.add(txt(this, W/2, y + 42, '✅ Все уровни выполнены!', 11, '#ffd700', true).setOrigin(0.5));
    } else {
      // XP-шкала: от prev_target до next_target
      const progress = Math.min(1, Math.max(0, (cur - prevT) / Math.max(1, nextT - prevT)));
      const barW = W - 100;

      // Цифры под шкалой
      const displayCur = Math.min(cur, nextT);
      container.add(txt(this, 14, y + 24, `${displayCur} / ${nextT}`, 10, '#ffffff', true).setOrigin(0, 0));

      // Шкала прогресса
      makeBar(this, 14, y + 40, barW, 6,
        progress, canClaim ? C.green : C.gold, C.dark, 4);

      // Награда за след. уровень
      const rwTxt = `+${a.next_gold}🪙${a.next_diamonds ? ' +' + a.next_diamonds + '💎' : ''}`;
      container.add(txt(this, W - 12, y + 30, rwTxt, 9, canClaim ? '#ffd700' : '#ffffff').setOrigin(1, 0));
      container.add(txt(this, W - 12, y + 44, canClaim ? '🎁' : '🔒', 16).setOrigin(1, 0));

      // Кнопка клейма
      if (canClaim) {
        this.tweens.add({ targets: bg, alpha: { from: 0.92, to: 0.7 }, duration: 800, yoyo: true, repeat: -1 });
        const zone = this.add.zone(8, y + startY, W - 16, bh).setOrigin(0)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => this._claimAchievement(a.key, a.can_claim_tier, rwTxt));
      }
    }

    // Описание
    container.add(txt(this, 14, y + 58, a.desc, 9, '#ccddff').setOrigin(0, 0));

    y += bh + 6;
  });

  y += 10;
  container.setY(startY);
  setContentH(y + 10);
};

TasksScene.prototype._claimAchievement = function(questKey, tier, rwTxt) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/tasks/claim_achievement', { init_data: State.initData, quest_key: questKey, tier })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        State.player = r.player;
        this._toast(`🏆 Достижение ур.${tier}: ${rwTxt}`);
        this.time.delayedCall(600, () => this.scene.restart({ tab: 'achieve' }));
      } else {
        this._toast('❌ ' + (r?.reason || 'Ошибка'));
      }
    }).catch(() => { this._claimBusy = false; this._toast('❌ Нет соединения'); });
};
