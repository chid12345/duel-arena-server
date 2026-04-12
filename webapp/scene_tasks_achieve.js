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
  const PAD = 8;

  // Счётчик готовых к получению
  const ready = achievements.filter(a => a.can_claim_tier !== null && !a.all_done).length;
  if (ready > 0) {
    const aBg = this.add.graphics();
    aBg.fillStyle(0x1a2a10, 0.9);
    aBg.fillRoundedRect(PAD, y, W - PAD*2, 32, 8);
    aBg.lineStyle(1.5, C.green, 0.5);
    aBg.strokeRoundedRect(PAD, y, W - PAD*2, 32, 8);
    container.add(aBg);
    container.add(txt(this, W/2, y + 16,
      `🎁 Готово к получению: ${ready} достижени${ready === 1 ? 'е' : ready < 5 ? 'я' : 'й'}`,
      11, '#3cc864', true).setOrigin(0.5));
    y += 40;
  }

  achievements.forEach(a => {
    const bh    = 86;   // высота карточки
    const RCOL  = 96;   // ширина правой колонки
    const GAP   = 8;    // отступ между баром и правой колонкой
    const barW  = W - PAD*2 - 6 - RCOL - GAP; // ширина бара

    const canClaim = a.can_claim_tier !== null;
    const allDone  = a.all_done;
    const cur      = a.current;
    const prevT    = a.prev_target;
    const nextT    = a.next_target;
    const tier     = a.claimed_tier;
    const maxTier  = a.max_tier;

    // ── Фон карточки ──────────────────────────────────────────
    const bg = this.add.graphics();
    const bgCol = allDone ? 0x191900 : canClaim ? 0x0b1d0e : 0x0e0e22;
    const bdCol = allDone ? C.gold   : canClaim ? C.green  : 0x252545;
    const bdAlf = allDone ? 0.7 : canClaim ? 0.6 : 0.3;
    bg.fillStyle(bgCol, 0.95);
    bg.fillRoundedRect(PAD, y, W - PAD*2, bh, 10);
    bg.lineStyle(1.5, bdCol, bdAlf);
    bg.strokeRoundedRect(PAD, y, W - PAD*2, bh, 10);
    container.add(bg);

    // Правая колонка — лёгкий фон
    const rcX0 = W - PAD - RCOL;
    const rcBg = this.add.graphics();
    rcBg.fillStyle(0x000000, 0.18);
    rcBg.fillRoundedRect(rcX0, y + 4, RCOL - 4, bh - 8, 7);
    container.add(rcBg);

    const rcCX = rcX0 + (RCOL - 4) / 2; // центр правой колонки

    // ── Строка 1: Уровень (правая колонка вверху) ─────────────
    const tierLabel = allDone ? `Макс. ${maxTier}/${maxTier}` : `Ур. ${tier}/${maxTier}`;
    container.add(txt(this, rcCX, y + 14, tierLabel, 9, '#aaaacc').setOrigin(0.5, 0));

    // ── Строка 1 (левая): Название ────────────────────────────
    const maxNameW = rcX0 - PAD - 8; // имя не лезет в правую колонку
    const nameColor = allDone ? '#ffd700' : canClaim ? '#3cc864' : '#ffffff';
    const nameObj = txt(this, PAD + 6, y + 10, a.label, 11, nameColor, canClaim || allDone).setOrigin(0, 0);
    nameObj.setWordWrapWidth(maxNameW);
    container.add(nameObj);

    if (allDone) {
      // ── Всё выполнено ──────────────────────────────────────
      container.add(txt(this, rcCX, y + 38, '✅', 22).setOrigin(0.5));
      container.add(txt(this, PAD + 6, y + 50, '✅ Все уровни пройдены', 10, '#ffd700', true).setOrigin(0, 0));
    } else {
      // ── Прогресс (левая колонка) ───────────────────────────
      const displayCur = Math.min(cur, nextT);
      container.add(txt(this, PAD + 6, y + 28, `${displayCur} / ${nextT}`, 10, '#ffffff', true).setOrigin(0, 0));

      const progress = Math.min(1, Math.max(0, (cur - prevT) / Math.max(1, nextT - prevT)));
      container.add(makeBar(this, PAD + 6, y + 46, barW, 6,
        progress, canClaim ? C.green : C.gold, 0x1a1a3a, 3));

      // ── Описание ──────────────────────────────────────────
      container.add(txt(this, PAD + 6, y + 68, a.desc, 9, '#7799bb').setOrigin(0, 0));

      // ── Правая колонка: награда + иконка ──────────────────
      const rwTxt = `+${a.next_gold}💰`;
      container.add(txt(this, rcCX, y + 30, rwTxt, 11, canClaim ? '#ffd700' : '#aaaacc', true).setOrigin(0.5, 0));

      if (a.next_diamonds) {
        container.add(txt(this, rcCX, y + 46, `+${a.next_diamonds}💎`, 10, canClaim ? '#88ddff' : '#778899').setOrigin(0.5, 0));
        container.add(txt(this, rcCX, y + 63, canClaim ? '🎁' : '🔒', 16).setOrigin(0.5, 0));
      } else {
        container.add(txt(this, rcCX, y + 52, canClaim ? '🎁' : '🔒', 18).setOrigin(0.5, 0));
      }

      // ── Зона клика ────────────────────────────────────────
      if (canClaim) {
        this.tweens.add({ targets: bg, alpha: { from: 0.95, to: 0.65 }, duration: 900, yoyo: true, repeat: -1 });
        this.add.zone(PAD, y + startY, W - PAD*2, bh).setOrigin(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this._claimAchievement(a.key, a.can_claim_tier, `${rwTxt}${a.next_diamonds ? ' +' + a.next_diamonds + '💎' : ''}`));
      }
    }

    y += bh + 5;
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
