/* ============================================================
   MenuScene — ext4c: бейдж прогресса Battle Pass на профиле
   Компактная полоска внутри баннера: "Тир N → N+1 · X/Y б · W/Z поб".
   Клик — открывает сцену BattlePass.
   ============================================================ */

Object.assign(MenuScene.prototype, {

  /** Асинхронно грузим прогресс BP и рисуем бейдж */
  _loadBattlePassBadge() {
    get('/api/battlepass').catch(() => null).then(res => {
      if (!res?.ok) return;
      if (!this.scene?.isActive?.()) return;
      if (this._activeTab !== 'profile' && !this._panels?.profile) return;
      this._renderBattlePassBadge(res);
    });
  },

  _renderBattlePassBadge(data) {
    try { this._bpBadgeOverlay?.destroy(); } catch(_) {}

    const { W } = this;
    const bp       = data.bp    || {};
    const tiers    = data.tiers || [];
    const battles  = bp.battles_done      || 0;
    const wins     = bp.wins_done         || 0;
    const claimed  = bp.last_claimed_tier || 0;

    // Определяем следующий НЕ полученный тир
    let nextTier = null;
    for (let i = 0; i < tiers.length; i++) {
      if (i + 1 > claimed) { nextTier = tiers[i]; break; }
    }

    // Текст и прогресс
    let titleStr, subStr, pctBattles, pctWins, canClaim;
    if (!nextTier) {
      titleStr   = '🌟 Пропуск: все тиры взяты';
      subStr     = 'Сезонные награды получены';
      pctBattles = 1; pctWins = 1; canClaim = false;
    } else {
      const bNeed = nextTier.battles_needed;
      const wNeed = nextTier.wins_needed;
      const bLeft = Math.max(0, bNeed - battles);
      const wLeft = Math.max(0, wNeed - wins);
      canClaim   = (bLeft === 0 && wLeft === 0);
      pctBattles = Math.min(1, battles / bNeed);
      pctWins    = Math.min(1, wins    / wNeed);
      titleStr   = canClaim
        ? `🌟 Тир ${nextTier.tier} готов — забрать!`
        : `🌟 До тира ${nextTier.tier}`;
      subStr     = canClaim
        ? `💎${nextTier.diamonds}  💰${nextTier.gold}`
        : `⚔️ ${bLeft} бо${bLeft === 1 ? 'й' : (bLeft < 5 && bLeft > 0 ? 'я' : 'ёв')}  ·  🏆 ${wLeft} побед${wLeft === 1 ? 'а' : (wLeft < 5 && wLeft > 0 ? 'ы' : '')}`;
    }

    const PAD = 10;
    const bX  = PAD, bY = 84, bW = W - PAD * 2, bH = 26;

    const oc = this.add.container(0, 0);
    oc.setDepth(5);

    // Фон полоски — полупрозрачный слой поверх баннера
    const bg = this.add.graphics();
    const fillCol = canClaim ? 0x2a1a00 : 0x1a1d34;
    bg.fillStyle(fillCol, 0.85);
    bg.fillRoundedRect(bX, bY, bW, bH, 8);
    bg.lineStyle(1.2, canClaim ? 0xffc83c : 0x5096ff, canClaim ? 0.85 : 0.55);
    bg.strokeRoundedRect(bX, bY, bW, bH, 8);
    oc.add(bg);

    // Заголовок слева
    const titleT = txt(this, bX + 8, bY + 7, titleStr, 10.5, canClaim ? '#ffc83c' : '#cfe2ff', true);
    oc.add(titleT);

    // Подпись справа сверху
    const subT = txt(this, bX + bW - 8, bY + 7, subStr, 10, canClaim ? '#ffe8a8' : '#ccccee');
    subT.setOrigin(1, 0);
    oc.add(subT);

    // Двойной мини-бар (бои + победы) снизу — только если тир не готов
    if (nextTier && !canClaim) {
      const trackY = bY + bH - 8;
      const trackH = 3;
      const trackW = bW - 16;
      const trackX = bX + 8;
      // бои
      const gBar1 = this.add.graphics();
      gBar1.fillStyle(0x2a2f48, 1);
      gBar1.fillRoundedRect(trackX, trackY, trackW, trackH, 2);
      gBar1.fillStyle(0x5096ff, 1);
      gBar1.fillRoundedRect(trackX, trackY, Math.max(2, trackW * pctBattles), trackH, 2);
      oc.add(gBar1);
      // победы (смещён ниже? нет, нет места — покажем вторым слоем через gold над синим)
      const gBar2 = this.add.graphics();
      const wW = Math.max(2, trackW * pctWins);
      gBar2.fillStyle(0xffc83c, 0.85);
      gBar2.fillRoundedRect(trackX, trackY - 5, wW, trackH, 2);
      oc.add(gBar2);
    }

    // Зона клика
    const zone = this.add.zone(bX + bW / 2, bY + bH / 2, bW, bH).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      bg.clear();
      bg.fillStyle(canClaim ? 0x3a2500 : 0x242a48, 1);
      bg.fillRoundedRect(bX, bY, bW, bH, 8);
      bg.lineStyle(1.2, canClaim ? 0xffc83c : 0x5096ff, 0.9);
      bg.strokeRoundedRect(bX, bY, bW, bH, 8);
      tg?.HapticFeedback?.selectionChanged();
    });
    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(fillCol, 0.85);
      bg.fillRoundedRect(bX, bY, bW, bH, 8);
      bg.lineStyle(1.2, canClaim ? 0xffc83c : 0x5096ff, canClaim ? 0.85 : 0.55);
      bg.strokeRoundedRect(bX, bY, bW, bH, 8);
    });
    zone.on('pointerup', () => {
      Sound.click();
      this.scene.start('BattlePass');
    });
    oc.add(zone);

    // Пульс если можно забрать
    if (canClaim) {
      this.tweens.add({ targets: bg, alpha: 0.55, duration: 750, yoyo: true, repeat: -1 });
    }

    this._bpBadgeOverlay = oc;
  },

});
