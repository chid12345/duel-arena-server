/* ============================================================
   TasksScene — вкладка 🏆 Достижения
   Единая прокручиваемая страница (без виртуализации).
   Сортировка: [Забрать] → [В прогрессе] → [Завершённые]
   ============================================================ */

TasksScene.prototype._buildAchieveTab = function(achievements, W, H, startY) {
  if (!achievements || !achievements.length) {
    txt(this, W/2, startY + 60, 'Нет данных', 12, '#9999bb').setOrigin(0.5);
    return;
  }

  const taps = [];
  const { container, setContentH } = this._makeScrollZone(W, H, startY, {
    onTap: (relY, relX) => {
      for (const t of taps) {
        if (relY >= t.y && relY < t.y + t.h) {
          if (t.xMin !== undefined && relX < t.xMin) continue;
          if (t.xMax !== undefined && relX > t.xMax) continue;
          t.fn(); return;
        }
      }
    },
  });

  const PAD = 8;
  let y = 6;

  const sorted = [...achievements].sort((a, b) => {
    const r = x => x.all_done ? 0 : (x.can_claim_tier !== null ? 2 : 1);
    return r(b) - r(a);
  });

  // Баннер «Готово к получению»
  const ready = sorted.filter(a => a.can_claim_tier !== null && !a.all_done).length;
  if (ready > 0) {
    const bg = this.add.graphics();
    bg.fillStyle(0x0e1828, 0.9);
    bg.fillRoundedRect(PAD, y, W - PAD * 2, 32, 8);
    bg.lineStyle(1.5, 0x44aaee, 0.5);
    bg.strokeRoundedRect(PAD, y, W - PAD * 2, 32, 8);
    container.add(bg);
    const label = `🎁 Готово к получению: ${ready} достижени${ready === 1 ? 'е' : ready < 5 ? 'я' : 'й'}`;
    container.add(txt(this, W / 2, y + 16, label, 11, '#55bbff', true).setOrigin(0.5));
    y += 40;
  }

  let shownDone = false;
  for (const a of sorted) {
    // Разделитель «Завершённые»
    if (a.all_done && !shownDone) {
      shownDone = true; y += 4;
      const sepBg = this.add.graphics();
      sepBg.fillStyle(0x141622, 0.8);
      sepBg.fillRoundedRect(PAD, y, W - PAD * 2, 26, 6);
      sepBg.lineStyle(1, 0x556688, 0.3);
      sepBg.strokeRoundedRect(PAD, y, W - PAD * 2, 26, 6);
      container.add(sepBg);
      container.add(txt(this, W / 2, y + 13, '✅  ЗАВЕРШЁННЫЕ ДОСТИЖЕНИЯ', 9, '#ffd700', true).setOrigin(0.5));
      y += 36;
    }

    const allDone = a.all_done;
    const canClaim = !allDone && a.can_claim_tier !== null;
    const bh = allDone ? 56 : 91;
    const RCOL = 96, barW = W - PAD * 2 - 6 - RCOL - 8;

    // Фон карточки
    const bg = this.add.graphics();
    bg.fillStyle(allDone ? 0x121418 : canClaim ? 0x0e1828 : 0x0e0e22, 0.95);
    bg.lineStyle(1.5, allDone ? 0x445566 : canClaim ? 0x44aaee : 0x252545,
                      allDone ? 0.4 : canClaim ? 0.7 : 0.3);
    bg.fillRoundedRect(PAD, y, W - PAD * 2, bh, 10);
    bg.strokeRoundedRect(PAD, y, W - PAD * 2, bh, 10);
    container.add(bg);

    if (allDone) {
      container.add(txt(this, PAD + 8,   y + bh / 2, a.label,                  10, '#778899').setOrigin(0, 0.5));
      container.add(txt(this, W / 2,     y + bh / 2, '✅ Все уровни пройдены',  9,  '#667788').setOrigin(0.5, 0.5));
      container.add(txt(this, W - PAD - 6, y + bh / 2, `${a.max_tier}/${a.max_tier}`, 9, '#556677').setOrigin(1, 0.5));
    } else {
      const rcX0 = W - PAD - RCOL;
      const rcBg = this.add.graphics();
      rcBg.fillStyle(0x000000, 0.2);
      rcBg.fillRoundedRect(rcX0, y + 4, RCOL - 4, bh - 8, 7);
      container.add(rcBg);
      const rcCX = rcX0 + (RCOL - 4) / 2;

      const nameObj = txt(this, PAD + 6, y + 10, a.label, 11, canClaim ? '#55bbff' : '#ffffff', canClaim).setOrigin(0, 0);
      nameObj.setWordWrapWidth(rcX0 - PAD - 8);
      container.add(nameObj);

      const dispCur = Math.min(a.current, a.next_target);
      const pct = Math.min(1, Math.max(0, (a.current - a.prev_target) / Math.max(1, a.next_target - a.prev_target)));

      container.add(txt(this, rcCX, y + 12, `Ур. ${a.claimed_tier}/${a.max_tier}`, 9, '#aaaacc').setOrigin(0.5, 0));
      container.add(txt(this, PAD + 6, y + 28, `${dispCur} / ${a.next_target}`, 10, '#ffffff', true).setOrigin(0, 0));
      container.add(txt(this, rcCX, y + 28, `+${a.next_gold}💰`, 11, canClaim ? '#ffd700' : '#aaaacc', true).setOrigin(0.5, 0));
      container.add(makeBar(this, PAD + 6, y + 44, barW, 6, pct, canClaim ? 0x44aaee : C.gold, 0x1a1a3a, 3));
      container.add(txt(this, PAD + 6, y + 68, a.desc, 9, '#7799bb').setOrigin(0, 0));

      if (a.next_diamonds) {
        container.add(txt(this, rcCX, y + 44, `+${a.next_diamonds}💎`, 10, canClaim ? '#88ddff' : '#778899').setOrigin(0.5, 0));
        container.add(txt(this, rcCX, y + 62, canClaim ? '🎁' : '🔒', 15).setOrigin(0.5, 0));
      } else {
        container.add(txt(this, rcCX, y + 50, canClaim ? '🎁' : '🔒', 17).setOrigin(0.5, 0));
      }

      if (canClaim) {
        this.tweens.add({ targets: bg, alpha: { from: 0.95, to: 0.6 }, duration: 900, yoyo: true, repeat: -1 });
        const rwFull = `+${a.next_gold}💰${a.next_diamonds ? ' +' + a.next_diamonds + '💎' : ''}`;
        taps.push({ y, h: bh, fn: () => this._claimAchievement(a.key, a.can_claim_tier) });
      }
    }
    y += bh + 5;
  }

  container.setY(startY);
  setContentH(y + 10);
};

/* ── Клейм достижения ──────────────────────────────────────── */
TasksScene.prototype._claimAchievement = function(questKey, tier) {
  if (this._claimBusy) return;
  this._claimBusy = true;
  post('/api/tasks/claim_achievement', { quest_key: questKey, tier })
    .then(r => {
      this._claimBusy = false;
      if (r?.ok) {
        if (r.player) State.player = r.player;
        _rewardAnim(this, r, () => this.scene.restart({ tab: 'achieve' }));
      } else {
        this._toast('❌ ' + (r?.reason || 'Ошибка'));
      }
    }).catch(() => { this._claimBusy = false; this._toast('❌ Нет соединения'); });
};
