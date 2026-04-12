/* ============================================================
   TasksScene — вкладка 🏆 Достижения
   Виртуализированный скролл: рендерит только видимые карточки.
   Сортировка: [Забрать] → [В прогрессе] → [Завершённые]
   ============================================================ */

TasksScene.prototype._buildAchieveTab = function(achievements, W, H, startY) {
  if (!achievements || !achievements.length) {
    txt(this, W/2, startY + 60, 'Нет данных', 12, '#9999bb').setOrigin(0.5);
    return;
  }
  const items = this._achieveItems(achievements, W);
  const totalH = items.length ? items[items.length - 1].y + items[items.length - 1].h + 10 : 40;
  const { container, setContentH } = this._makeScrollZone(W, H, startY, {
    onScroll: sy => this._virt && this._virt.update(sy),
    onTap:   (ry, rx) => this._virt && this._virt.tap(ry, rx),
  });
  this._virt = new VirtScroll(this, container, items, H - startY - 10);
  this._virt.update(0);
  container.setY(startY);
  setContentH(totalH);
};

/* Строим массив layout-элементов без создания Phaser-объектов */
TasksScene.prototype._achieveItems = function(achievements, W) {
  const PAD = 8;
  const items = [];
  let y = 6;

  const sorted = [...achievements].sort((a, b) => {
    const r = x => x.all_done ? 0 : (x.can_claim_tier !== null ? 2 : 1);
    return r(b) - r(a);
  });

  const ready = sorted.filter(a => a.can_claim_tier !== null && !a.all_done).length;
  if (ready > 0) {
    const iy = y;
    items.push({ y: iy, h: 40, render: sc => _achBanner(sc, iy, W, PAD, ready) });
    y += 40;
  }

  let shownDone = false;
  for (const a of sorted) {
    if (a.all_done && !shownDone) {
      shownDone = true; y += 4;
      const iy = y;
      items.push({ y: iy, h: 36, render: sc => _achSep(sc, iy, W, PAD) });
      y += 36;
    }
    const bh = a.all_done ? 56 : 91;
    const iy = y;
    const canClaim = !a.all_done && a.can_claim_tier !== null;
    const rwFull = canClaim
      ? `+${a.next_gold}💰${a.next_diamonds ? ' +' + a.next_diamonds + '💎' : ''}`
      : '';
    items.push({
      y: iy, h: bh,
      render: sc => _achCard(sc, iy, a, W, PAD),
      onTap: canClaim ? () => this._claimAchievement(a.key, a.can_claim_tier, rwFull) : null,
    });
    y += bh + 5;
  }
  return items;
};

/* ── Рендер-хелперы (возвращают массив Phaser/tween объектов) ── */

function _achBanner(sc, y, W, PAD, ready) {
  const bg = sc.add.graphics();
  bg.fillStyle(0x1a2a10, 0.9);
  bg.fillRoundedRect(PAD, y, W - PAD * 2, 32, 8);
  bg.lineStyle(1.5, C.green, 0.5);
  bg.strokeRoundedRect(PAD, y, W - PAD * 2, 32, 8);
  const label = `🎁 Готово к получению: ${ready} достижени${ready === 1 ? 'е' : ready < 5 ? 'я' : 'й'}`;
  return [bg, txt(sc, W / 2, y + 16, label, 11, '#3cc864', true).setOrigin(0.5)];
}

function _achSep(sc, y, W, PAD) {
  const bg = sc.add.graphics();
  bg.fillStyle(0x1a1a00, 0.8);
  bg.fillRoundedRect(PAD, y, W - PAD * 2, 26, 6);
  bg.lineStyle(1, C.gold, 0.3);
  bg.strokeRoundedRect(PAD, y, W - PAD * 2, 26, 6);
  return [bg, txt(sc, W / 2, y + 13, '✅  ЗАВЕРШЁННЫЕ ДОСТИЖЕНИЯ', 9, '#ffd700', true).setOrigin(0.5)];
}

function _achCard(sc, y, a, W, PAD) {
  const allDone = a.all_done, canClaim = !allDone && a.can_claim_tier !== null;
  const bh = allDone ? 52 : 86;
  const RCOL = 96, barW = W - PAD * 2 - 6 - RCOL - 8;

  const bg = sc.add.graphics();
  bg.fillStyle(allDone ? 0x141408 : canClaim ? 0x0b1d0e : 0x0e0e22, 0.95);
  bg.lineStyle(1.5, allDone ? 0x555500 : canClaim ? C.green : 0x252545,
                    allDone ? 0.4 : canClaim ? 0.7 : 0.3);
  bg.fillRoundedRect(PAD, y, W - PAD * 2, bh, 10);
  bg.strokeRoundedRect(PAD, y, W - PAD * 2, bh, 10);

  if (allDone) {
    return [
      bg,
      txt(sc, PAD + 8,   y + bh / 2, a.label,                  10, '#888866').setOrigin(0, 0.5),
      txt(sc, W / 2,     y + bh / 2, '✅ Все уровни пройдены',  9,  '#888844').setOrigin(0.5, 0.5),
      txt(sc, W - PAD - 6, y + bh / 2, `${a.max_tier}/${a.max_tier}`, 9, '#666644').setOrigin(1, 0.5),
    ];
  }

  const rcX0 = W - PAD - RCOL;
  const rcBg = sc.add.graphics();
  rcBg.fillStyle(0x000000, 0.2);
  rcBg.fillRoundedRect(rcX0, y + 4, RCOL - 4, bh - 8, 7);
  const rcCX = rcX0 + (RCOL - 4) / 2;

  const nameObj = txt(sc, PAD + 6, y + 10, a.label, 11, canClaim ? '#3cc864' : '#ffffff', canClaim).setOrigin(0, 0);
  nameObj.setWordWrapWidth(rcX0 - PAD - 8);

  const dispCur = Math.min(a.current, a.next_target);
  const pct = Math.min(1, Math.max(0, (a.current - a.prev_target) / Math.max(1, a.next_target - a.prev_target)));

  const objs = [
    bg, rcBg, nameObj,
    txt(sc, rcCX,  y + 12, `Ур. ${a.claimed_tier}/${a.max_tier}`, 9, '#aaaacc').setOrigin(0.5, 0),
    txt(sc, PAD + 6, y + 28, `${dispCur} / ${a.next_target}`,     10, '#ffffff', true).setOrigin(0, 0),
    txt(sc, rcCX,  y + 28, `+${a.next_gold}💰`, 11, canClaim ? '#ffd700' : '#aaaacc', true).setOrigin(0.5, 0),
    makeBar(sc, PAD + 6, y + 44, barW, 6, pct, canClaim ? C.green : C.gold, 0x1a1a3a, 3),
    txt(sc, PAD + 6, y + 68, a.desc, 9, '#7799bb').setOrigin(0, 0),
  ];

  if (a.next_diamonds) {
    objs.push(txt(sc, rcCX, y + 44, `+${a.next_diamonds}💎`, 10, canClaim ? '#88ddff' : '#778899').setOrigin(0.5, 0));
    objs.push(txt(sc, rcCX, y + 62, canClaim ? '🎁' : '🔒', 15).setOrigin(0.5, 0));
  } else {
    objs.push(txt(sc, rcCX, y + 50, canClaim ? '🎁' : '🔒', 17).setOrigin(0.5, 0));
  }

  if (canClaim) {
    const tw = sc.tweens.add({ targets: bg, alpha: { from: 0.95, to: 0.6 }, duration: 900, yoyo: true, repeat: -1 });
    objs.push({ _tw: true, destroy: () => tw.remove() });
  }
  return objs;
}

/* ── Клейм достижения ──────────────────────────────────────── */
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
