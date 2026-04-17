/* ============================================================
   WorldBossScene — results: модальный экран итогов рейда.
   Показывается, когда есть незабранная награда — над боевой сценой.
   Содержит иконку победы/поражения, имя босса, вклад %, сундук
   и кнопку «Забрать» (вызывает _claimReward).
   Закон 9: отдельный дом для UI итогов, чтобы не раздувать ext.
   ============================================================ */

Object.assign(WorldBossScene.prototype, {

  _renderResultsOverlay(s, W, H) {
    if (!s.unclaimed_rewards || !s.unclaimed_rewards.length) return;
    const r = s.unclaimed_rewards[0];

    // Полупрозрачный фон-overlay.
    const dim = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.72).setDepth(1000);
    dim._wbChild = true;

    // Карточка итогов.
    const cardW = Math.min(W - 24, 340);
    const cardH = 330;
    const cx = W/2 - cardW/2;
    const cy = Math.max(60, H/2 - cardH/2);

    const bg = this.add.graphics().setDepth(1001);
    bg.fillStyle(0x1e1a32, 0.98); bg.fillRoundedRect(cx, cy, cardW, cardH, 14);
    bg.lineStyle(2, r.is_victory ? 0xffc83c : 0x883a3a, 1);
    bg.strokeRoundedRect(cx, cy, cardW, cardH, 14);
    bg._wbChild = true;

    const win = !!r.is_victory;
    const titleIcon = win ? '🏆' : '💀';
    const titleTxt  = win ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
    const titleCol  = win ? '#ffc83c' : '#ff6672';

    const t1 = txt(this, W/2, cy + 26, titleIcon, 32, titleCol).setOrigin(0.5).setDepth(1002);
    t1._wbChild = true;
    const t2 = txt(this, W/2, cy + 62, titleTxt, 18, titleCol, true).setOrigin(0.5).setDepth(1002);
    t2._wbChild = true;

    const em = r.boss_emoji || '🐉';
    const tpl = r.boss_type_label ? ` · ${r.boss_type_label}` : '';
    const bossLbl = `${em} ${r.boss_name || 'Босс'}${tpl}`;
    const tb = txt(this, W/2, cy + 88, bossLbl, 12, '#ddddff').setOrigin(0.5).setDepth(1002);
    tb._wbChild = true;

    const pct = Math.round((r.contribution_pct || 0) * 100);
    const tc = txt(this, W/2, cy + 110, `Ваш вклад: ${pct}%`, 13, '#aaddff', true).setOrigin(0.5).setDepth(1002);
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
      const chestIcon = r.chest_type === 'wb_diamond_chest' ? '💠' : '🏆';
      const chestLbl = r.chest_type === 'wb_diamond_chest'
        ? 'Алмазный сундук рейда'
        : 'Золотой сундук рейда';
      const reason = r.chest_type === 'wb_diamond_chest'
        ? '(за топ урона)' : '(за последний удар)';
      const ch = txt(this, W/2, cy + 180, `${chestIcon} ${chestLbl}`, 12, '#ffdd66', true).setOrigin(0.5).setDepth(1002);
      ch._wbChild = true;
      const chr = txt(this, W/2, cy + 200, `${reason} → в инвентарь`, 10, '#aaaacc').setOrigin(0.5).setDepth(1002);
      chr._wbChild = true;
    }

    // Кнопка забрать.
    const btnY = cy + cardH - 58;
    const btn = this._bigBtn(cx + 16, btnY, cardW - 32, 44,
                             win ? 0x3a8e4a : 0x5a5a6a,
                             '🎁 Забрать награду',
                             () => this._claimReward(r.reward_id));
    // Поднимем глубину кнопки над overlay.
    try {
      btn.g.setDepth(1002); btn.lt.setDepth(1003); btn.z.setDepth(1003);
    } catch(_) {}
  },

});
