/* ═══════════════════════════════════════════════════════════
   Item Detail Popup — глобальный попап подробностей предмета.
   Вызывается из любой сцены: showItemDetailPopup(scene, opts)

   opts: { icon, name, desc, badge, badgeRisk,
           stats: [{label,value,color}],
           hpPct, hpCur, hpMax,
           price, currency, canAct,
           actionLabel, actionFn, depthBase }
   ═══════════════════════════════════════════════════════════ */

function showItemDetailPopup(scene, opts) {
  closeItemDetailPopup(scene);
  const W = scene.W || scene.game.canvas.width;
  const H = scene.H || scene.game.canvas.height;
  const layer = []; scene._itemDetailLayer = layer;
  const dB = opts.depthBase || 200;

  // ── Dim overlay ──
  const dim = scene.add.rectangle(W/2, H/2, W, H, 0x000000, 0.82).setDepth(dB);
  dim.setInteractive();
  // Защита: игнорируем pointerup от того же касания, что открыло попап
  const openedAt = Date.now();
  dim.on('pointerup', () => { if (Date.now() - openedAt > 250) closeItemDetailPopup(scene); });
  layer.push(dim);

  // ── Panel sizing ──
  const pW = W - 40, pX = 20;
  let contentH = 60; // top pad + icon + name
  const descText = opts.desc || '';
  const descLines = Math.ceil(descText.length / 28);
  contentH += 16 + Math.max(1, descLines) * 16 + 4;
  if (opts.stats && opts.stats.length) contentH += 28;
  if (opts.badge) contentH += 24;
  if (opts.progress != null) contentH += 30;
  if (opts.rewards) contentH += 24;
  if (opts.hpPct != null) contentH += 22;
  if (opts.actionLabel) contentH += 56;
  else contentH += 16;
  const pH = contentH;
  const pY = Math.round((H - pH) / 2);

  // ── Panel bg ──
  const panel = scene.add.graphics().setDepth(dB + 1);
  panel.fillStyle(C.bgPanel, 0.98);
  panel.fillRoundedRect(pX, pY, pW, pH, 14);
  panel.lineStyle(2, C.gold, 0.4);
  panel.strokeRoundedRect(pX, pY, pW, pH, 14);
  layer.push(panel);

  // Block zone
  const blockZ = scene.add.zone(pX + pW/2, pY + pH/2, pW, pH)
    .setInteractive().setDepth(dB + 1);
  blockZ.on('pointerup', () => {});
  layer.push(blockZ);

  // ── Close ✕ ──
  const cg = scene.add.graphics().setDepth(dB + 2);
  cg.fillStyle(0x3a2020, 1);
  cg.fillRoundedRect(pX + pW - 34, pY + 8, 26, 22, 7);
  cg.lineStyle(1, 0xff6666, 0.6);
  cg.strokeRoundedRect(pX + pW - 34, pY + 8, 26, 22, 7);
  layer.push(cg);
  layer.push(txt(scene, pX + pW - 21, pY + 19, '✕', 12, '#ffaaaa', true)
    .setOrigin(0.5).setDepth(dB + 3));
  const cz = scene.add.zone(pX + pW - 21, pY + 19, 30, 26)
    .setInteractive({ useHandCursor: true }).setDepth(dB + 4);
  cz.on('pointerup', () => { if (Date.now() - openedAt > 250) closeItemDetailPopup(scene); });
  layer.push(cz);

  // ── Content ──
  let cy = pY + 16;
  const cx = W / 2;

  // Icon
  layer.push(txt(scene, cx, cy + 18, opts.icon || '📦', 32)
    .setOrigin(0.5).setDepth(dB + 2));
  cy += 40;

  // Name
  layer.push(txt(scene, cx, cy, opts.name || '???', 14, '#ffe888', true)
    .setOrigin(0.5).setDepth(dB + 2));
  cy += 22;

  // Divider
  const divG = scene.add.graphics().setDepth(dB + 2);
  divG.lineStyle(1, C.gold, 0.3);
  divG.lineBetween(pX + 24, cy, pX + pW - 24, cy);
  layer.push(divG);
  cy += 10;

  // Stats pills
  if (opts.stats && opts.stats.length) {
    const pillW = Math.min(70, Math.floor((pW - 48) / opts.stats.length) - 4);
    const totalW = opts.stats.length * (pillW + 4) - 4;
    let px = cx - totalW / 2;
    opts.stats.forEach(s => {
      const pg = scene.add.graphics().setDepth(dB + 2);
      pg.fillStyle(s.bg || 0x222230, 0.9);
      pg.fillRoundedRect(px, cy, pillW, 18, 6);
      layer.push(pg);
      layer.push(txt(scene, px + pillW/2, cy + 9, s.label, 9, s.color || '#ffffff', true)
        .setOrigin(0.5).setDepth(dB + 3));
      px += pillW + 4;
    });
    cy += 24;
  }

  // Description (word wrap)
  const descObj = scene.add.text(cx, cy, descText, {
    fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#c8a878', align: 'center',
    wordWrap: { width: pW - 48 }, lineSpacing: 4,
  }).setOrigin(0.5, 0).setDepth(dB + 2);
  layer.push(descObj);
  cy += descObj.height + 8;

  // Badge
  if (opts.badge) {
    const badgeCol = opts.badgeRisk ? 0x7a1a1a : 0x1a3a6a;
    const badgeTxt = opts.badgeRisk ? '#ff8888' : '#88ccff';
    const bw2 = 70, bh2 = 18;
    const bg2 = scene.add.graphics().setDepth(dB + 2);
    bg2.fillStyle(badgeCol, 0.9);
    bg2.fillRoundedRect(cx - bw2/2, cy, bw2, bh2, 6);
    layer.push(bg2);
    layer.push(txt(scene, cx, cy + bh2/2, opts.badge, 10, badgeTxt, true)
      .setOrigin(0.5).setDepth(dB + 3));
    cy += bh2 + 6;
  }

  // Progress bar (for tasks/quests)
  if (opts.progress != null) {
    const pCur = opts.progressCur || 0, pMax = opts.progressMax || 1;
    const pPct = Math.min(1, pCur / Math.max(1, pMax));
    const barW = pW - 60, barX = pX + 30;
    const done = pCur >= pMax;
    layer.push(makeBar(scene, barX, cy, barW, 7, pPct, done ? C.green : C.blue, C.dark, 4).setDepth(dB + 2));
    const progLabel = done ? `✅ ${pCur} / ${pMax}` : `${pCur} / ${pMax}`;
    layer.push(txt(scene, cx, cy + 10, progLabel, 10, done ? '#88ff88' : '#aaccff', true)
      .setOrigin(0.5, 0).setDepth(dB + 3));
    cy += 26;
  }

  // Rewards (for tasks/quests)
  if (opts.rewards) {
    const rParts = [];
    if (opts.rewards.gold) rParts.push(`+${opts.rewards.gold} 💰`);
    if (opts.rewards.diamonds) rParts.push(`+${opts.rewards.diamonds} 💎`);
    if (opts.rewards.xp) rParts.push(`+${opts.rewards.xp} ⭐`);
    if (rParts.length) {
      layer.push(txt(scene, cx, cy, `🎁 ${rParts.join('  ')}`, 11, '#ffd700', true)
        .setOrigin(0.5, 0).setDepth(dB + 2));
      cy += 20;
    }
  }

  // HP bar
  if (opts.hpPct != null && opts.hpCur != null) {
    const cur = Math.min(1, opts.hpCur / Math.max(1, opts.hpMax || 1));
    const addPct = Math.min(opts.hpPct, 1 - cur);
    const barW = pW - 60, barX = pX + 30;
    layer.push(makeBar(scene, barX, cy, barW, 7, cur, C.red, C.dark, 4).setDepth(dB + 2));
    if (addPct > 0) {
      const prev = Math.round(barW * cur), add = Math.round(barW * addPct);
      const addG = scene.add.graphics().setDepth(dB + 3);
      addG.fillStyle(C.green, 0.75);
      addG.fillRoundedRect(barX + prev, cy, add, 7, 3);
      layer.push(addG);
    }
    layer.push(txt(scene, cx, cy + 9, `❤️ ${opts.hpCur}/${opts.hpMax}`, 9, '#ff8888')
      .setOrigin(0.5, 0).setDepth(dB + 3));
    cy += 22;
  }

  // ── Action button ──
  if (opts.actionLabel) {
    cy += 6;
    const btnW = pW - 40, btnH = 36, btnX = pX + 20, btnY = cy;
    const canAct = opts.canAct !== false;
    const isDia = opts.currency === 'diamonds';
    const btnG = scene.add.graphics().setDepth(dB + 2);
    if (canAct) {
      btnG.fillStyle(isDia ? 0x0e2838 : 0x3a2a08, 1);
      btnG.lineStyle(2, isDia ? 0x3cc8dc : C.gold, 0.7);
    } else {
      btnG.fillStyle(0x1e1e2e, 0.7);
      btnG.lineStyle(1, 0x444466, 0.5);
    }
    btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 10);
    layer.push(btnG);

    const buyColor = canAct ? (isDia ? '#3ce8ff' : '#ffe888') : '#888888';
    layer.push(txt(scene, pX + pW/2, btnY + btnH/2, opts.actionLabel, 13, buyColor, true)
      .setOrigin(0.5).setDepth(dB + 3));

    const buyZ = scene.add.zone(btnX + btnW/2, btnY + btnH/2, btnW, btnH)
      .setInteractive({ useHandCursor: true }).setDepth(dB + 4);
    buyZ.on('pointerup', () => {
      if (opts.actionFn) opts.actionFn();
    });
    layer.push(buyZ);
  }

  // Animate in
  layer.forEach(o => { if (o !== dim && o.setAlpha) o.setAlpha(0); });
  scene.tweens.add({
    targets: layer.filter(o => o !== dim && o.setAlpha),
    alpha: 1, duration: 180, ease: 'Power2',
  });
}

function closeItemDetailPopup(scene) {
  if (!scene._itemDetailLayer) return;
  scene._itemDetailLayer.forEach(o => { try { o.destroy(); } catch(_) {} });
  scene._itemDetailLayer = null;
}
