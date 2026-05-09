/* ============================================================
   WorldBossScene — results: модальный экран итогов рейда.
   Показывается, когда есть незабранная награда — над боевой сценой.
   Содержит иконку победы/поражения, имя босса, вклад %, сундук,
   кнопку «Забрать», и таблицу всех участников с наградами.
   Закон 9: отдельный дом для UI итогов, чтобы не раздувать ext.
   ============================================================ */

Object.assign(WorldBossScene.prototype, {

  _renderResultsOverlay(s, W, H) {
    if (!s.unclaimed_rewards || !s.unclaimed_rewards.length) return;
    const r = s.unclaimed_rewards[0];
    const participants = r.participants || [];
    const nParts = Math.min(participants.length, 6);

    // Полупрозрачный фон-overlay.
    const dim = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.72).setDepth(1000);
    dim._wbChild = true;

    // Карточка: базовые 330px + секция участников снизу.
    const cardW = Math.min(W - 24, 340);
    const partSectionH = nParts > 0 ? 28 + nParts * 22 : 0;
    const cardH = 330 + partSectionH;
    const cx = W/2 - cardW/2;
    const cy = Math.max(16, H/2 - cardH/2);

    const bg = this.add.graphics().setDepth(1001);
    bg.fillStyle(0x0d0020, 0.99); bg.fillRoundedRect(cx, cy, cardW, cardH, 10);
    bg.lineStyle(2, r.is_victory ? 0xffee00 : 0xff0088, 1);
    bg.strokeRoundedRect(cx, cy, cardW, cardH, 14);
    bg._wbChild = true;

    const win = !!r.is_victory;
    const titleIcon = win ? '🏆' : '💀';
    const titleTxt  = win ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
    const titleCol  = win ? '#ffee00' : '#ff0088';

    const t1 = txt(this, W/2, cy + 26, titleIcon, 32, titleCol).setOrigin(0.5).setDepth(1002);
    t1._wbChild = true;
    const t2 = txt(this, W/2, cy + 62, titleTxt, 18, titleCol, true).setOrigin(0.5).setDepth(1002);
    t2._wbChild = true;

    const em = r.boss_emoji || '🐉';
    const tpl = r.boss_type_label ? ` · ${r.boss_type_label}` : '';
    const bossLbl = `${em} ${r.boss_name || 'Босс'}${tpl}`;
    const tb = txt(this, W/2, cy + 88, bossLbl, 12, '#ddddff').setOrigin(0.5).setDepth(1002);
    tb._wbChild = true;

    const pct = Math.round(r.contribution_pct || 0);
    const tc = txt(this, W/2, cy + 110, `Ваш вклад: ${pct}%`, 13, '#cc44ff', true).setOrigin(0.5).setDepth(1002);
    tc._wbChild = true;

    // Награды: gold / exp / diamonds — одной строкой.
    const parts = [];
    if (r.gold)     parts.push(`💰 ${r.gold}`);
    if (r.exp)      parts.push(`⭐ ${r.exp}`);
    if (r.diamonds) parts.push(`💎 ${r.diamonds}`);
    const rewLine = parts.join('   ') || '—';
    const tr = txt(this, W/2, cy + 142, rewLine, 15, '#ffffff', true).setOrigin(0.5).setDepth(1002);
    tr._wbChild = true;

    // Сундук (если есть).
    if (r.chest_type) {
      const isScroll = r.chest_type === 'scroll_all_12';
      const chestIcon = isScroll ? '✨' : '💠';
      const chestLbl = isScroll
        ? 'Свиток «+12 пассивки»'
        : 'Алмазный сундук рейда';
      const reason = isScroll ? '(удача 5%!)' : '(за топ урона)';
      const ch = txt(this, W/2, cy + 180, `${chestIcon} ${chestLbl}`, 12, '#ffdd66', true).setOrigin(0.5).setDepth(1002);
      ch._wbChild = true;
      const chr = txt(this, W/2, cy + 200, `${reason} → в инвентарь`, 10, '#aaaacc').setOrigin(0.5).setDepth(1002);
      chr._wbChild = true;
    }

    // Кнопка забрать (фиксированное положение: cy+272, независимо от cardH).
    const btnY = cy + 272;
    const btn = this._bigBtn(cx + 16, btnY, cardW - 32, 44,
                             win ? 0xbb0066 : 0x440044,
                             '🎁 Забрать награду',
                             () => this._claimReward(r.reward_id));
    try {
      btn.g.setDepth(1002); btn.lt.setDepth(1003); btn.z.setDepth(1003);
    } catch(_) {}

    // ── Таблица участников ────────────────────────────────────────
    if (nParts > 0) {
      const sepY = cy + 326;
      // Разделитель.
      const sepLine = this.add.graphics().setDepth(1002);
      sepLine.lineStyle(1, 0x440066, 0.8);
      sepLine.lineBetween(cx + 10, sepY, cx + cardW - 10, sepY);
      sepLine._wbChild = true;

      const ph = txt(this, W/2, sepY + 12, '⚔️ ВСЕ УЧАСТНИКИ', 10, '#cc44ff', true).setOrigin(0.5).setDepth(1002);
      ph._wbChild = true;

      participants.slice(0, 6).forEach((p, i) => {
        const py = sepY + 26 + i * 22;
        const cpct = Math.round(p.contribution_pct || 0);
        const name = (p.name || 'Игрок').substring(0, 14);
        const isMe = p.user_id === (s.uid || 0);
        const nameCol = isMe ? '#ffee88' : '#ccccee';

        const tn = txt(this, cx + 10, py, `${i+1}. ${name}  ${cpct}%`, 10, nameCol).setOrigin(0, 0.5).setDepth(1002);
        tn._wbChild = true;

        const rewards = [];
        if (p.gold)     rewards.push(`💰${p.gold}`);
        if (p.diamonds) rewards.push(`💎${p.diamonds}`);
        const rewardStr = rewards.join(' ') || '—';
        const trew = txt(this, cx + cardW - 10, py, rewardStr, 10, '#ffdd66').setOrigin(1, 0.5).setDepth(1002);
        trew._wbChild = true;
      });
    }
  },

  // История последних 5 рейдов — на вкладке «Ожидание» под подсказками.
  _renderRecentRaids(s, W, y) {
    const list = s.recent_raids || [];
    if (!list.length) return;
    this._addText(16, y, '★ HALL OF RAIDS — ПОСЛЕДНИЕ РЕЙДЫ ★', 11, '#cc44ff', true);
    y += 18;
    list.slice(0, 5).forEach((r, i) => {
      const ry = y + i * 22;
      this._addPanel(8, ry, W - 16, 20);
      const win = r.status === 'won';
      const ico = win ? '🏆' : '💀';
      const em  = r.boss_emoji || '🐉';
      const pct = Math.round(r.contribution_pct || 0);
      const part = pct > 0 ? `вклад ${pct}%` : 'не участвовал';
      this._addText(14, ry + 4, `${ico} ${em} ${r.boss_name || 'Босс'}`, 10, '#aa44ff');
      const col = pct > 0 ? (win ? '#ffee00' : '#ff0088') : '#330044';
      this._addText(W - 16, ry + 4, part, 10, col).setOrigin(1, 0);
    });
  },

});
