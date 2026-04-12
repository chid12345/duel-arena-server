/* ============================================================
   TasksScene — вкладка 🏆 Достижения
   Сортировка: [Забрать] → [В прогрессе] → [Все уровни пройдены]
   ============================================================ */

TasksScene.prototype._buildAchieveTab = function(achievements, W, H, startY) {
  if (!achievements || !achievements.length) {
    txt(this, W/2, startY + 60, 'Нет данных', 12, '#9999bb').setOrigin(0.5);
    return;
  }

  const { container, setContentH } = this._makeScrollZone(W, H, startY);
  let y = 6;
  const PAD = 8;

  // ── Сортировка: claimable → in progress → all done ──────────
  const sorted = [...achievements].sort((a, b) => {
    const rank = x => x.all_done ? 0 : (x.can_claim_tier !== null ? 2 : 1);
    return rank(b) - rank(a);
  });

  // ── Счётчик готовых ─────────────────────────────────────────
  const ready = sorted.filter(a => a.can_claim_tier !== null && !a.all_done).length;
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

  let shownDone = false;

  sorted.forEach(a => {
    const canClaim = a.can_claim_tier !== null;
    const allDone  = a.all_done;
    const cur      = a.current;
    const prevT    = a.prev_target;
    const nextT    = a.next_target;
    const tier     = a.claimed_tier;
    const maxTier  = a.max_tier;

    // ── Разделитель «Завершённые» ────────────────────────────
    if (allDone && !shownDone) {
      shownDone = true;
      y += 4;
      const sepBg = this.add.graphics();
      sepBg.fillStyle(0x1a1a00, 0.8);
      sepBg.fillRoundedRect(PAD, y, W - PAD*2, 26, 6);
      sepBg.lineStyle(1, C.gold, 0.3);
      sepBg.strokeRoundedRect(PAD, y, W - PAD*2, 26, 6);
      container.add(sepBg);
      container.add(txt(this, W/2, y + 13, '✅  ЗАВЕРШЁННЫЕ ДОСТИЖЕНИЯ', 9, '#ffd700', true).setOrigin(0.5));
      y += 32;
    }

    const bh   = allDone ? 52 : 86;
    const RCOL = 96;
    const GAP  = 8;
    const barW = W - PAD*2 - 6 - RCOL - GAP;

    // ── Фон карточки ────────────────────────────────────────
    const bg = this.add.graphics();
    let bgCol, bdCol, bdAlf;
    if (allDone)        { bgCol = 0x141408; bdCol = 0x555500; bdAlf = 0.4; }
    else if (canClaim)  { bgCol = 0x0b1d0e; bdCol = C.green;  bdAlf = 0.7; }
    else                { bgCol = 0x0e0e22; bdCol = 0x252545; bdAlf = 0.3; }

    bg.fillStyle(bgCol, 0.95);
    bg.fillRoundedRect(PAD, y, W - PAD*2, bh, 10);
    bg.lineStyle(1.5, bdCol, bdAlf);
    bg.strokeRoundedRect(PAD, y, W - PAD*2, bh, 10);
    container.add(bg);

    if (allDone) {
      // ── Компактный вид для завершённых ──────────────────
      container.add(txt(this, PAD + 8, y + bh/2, a.label, 10, '#888866').setOrigin(0, 0.5));
      container.add(txt(this, W/2,     y + bh/2, '✅ Все уровни пройдены', 9, '#888844').setOrigin(0.5, 0.5));
      container.add(txt(this, W - PAD - 6, y + bh/2, `${maxTier}/${maxTier}`, 9, '#666644').setOrigin(1, 0.5));
      y += bh + 4;
      return;
    }

    // ── Правая колонка (фон) ─────────────────────────────
    const rcX0 = W - PAD - RCOL;
    const rcBg = this.add.graphics();
    rcBg.fillStyle(0x000000, 0.2);
    rcBg.fillRoundedRect(rcX0, y + 4, RCOL - 4, bh - 8, 7);
    container.add(rcBg);

    const rcCX = rcX0 + (RCOL - 4) / 2;

    // ── Строка 1: Уровень (правая) | Название (левая) ───
    const tierLabel = `Ур. ${tier}/${maxTier}`;
    container.add(txt(this, rcCX, y + 12, tierLabel, 9, '#aaaacc').setOrigin(0.5, 0));

    const nameColor = canClaim ? '#3cc864' : '#ffffff';
    const nameObj = txt(this, PAD + 6, y + 10, a.label, 11, nameColor, canClaim).setOrigin(0, 0);
    nameObj.setWordWrapWidth(rcX0 - PAD - 8);
    container.add(nameObj);

    // ── Строка 2: Прогресс cur/next | Награда ───────────
    const displayCur = Math.min(cur, nextT);
    container.add(txt(this, PAD + 6, y + 28, `${displayCur} / ${nextT}`, 10, '#ffffff', true).setOrigin(0, 0));

    const rwGold = `+${a.next_gold}💰`;
    container.add(txt(this, rcCX, y + 28, rwGold, 11, canClaim ? '#ffd700' : '#aaaacc', true).setOrigin(0.5, 0));

    // ── Строка 3: Бар | Алмаз + иконка ─────────────────
    container.add(makeBar(this, PAD + 6, y + 44, barW, 6,
      Math.min(1, Math.max(0, (cur - prevT) / Math.max(1, nextT - prevT))),
      canClaim ? C.green : C.gold, 0x1a1a3a, 3));

    if (a.next_diamonds) {
      container.add(txt(this, rcCX, y + 44, `+${a.next_diamonds}💎`, 10, canClaim ? '#88ddff' : '#778899').setOrigin(0.5, 0));
      container.add(txt(this, rcCX, y + 62, canClaim ? '🎁' : '🔒', 15).setOrigin(0.5, 0));
    } else {
      container.add(txt(this, rcCX, y + 50, canClaim ? '🎁' : '🔒', 17).setOrigin(0.5, 0));
    }

    // ── Строка 4: Описание ───────────────────────────────
    container.add(txt(this, PAD + 6, y + 68, a.desc, 9, '#7799bb').setOrigin(0, 0));

    // ── Пульсация + клик ────────────────────────────────
    if (canClaim) {
      this.tweens.add({ targets: bg, alpha: { from: 0.95, to: 0.6 }, duration: 900, yoyo: true, repeat: -1 });
      const rwFull = `${rwGold}${a.next_diamonds ? ' +' + a.next_diamonds + '💎' : ''}`;
      this.add.zone(PAD, y + startY, W - PAD*2, bh).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => this._claimAchievement(a.key, a.can_claim_tier, rwFull));
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
