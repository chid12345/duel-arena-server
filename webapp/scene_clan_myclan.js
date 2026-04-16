/* ============================================================
   ClanScene — рендер блока "Мой клан"
   ============================================================ */

Object.assign(ClanScene.prototype, {
  _renderMyClan(data, W, H) {
    const clan = data.clan;
    const members = data.members || [];
    const isLeader = data.is_leader;
    let y = 84;
    const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');

    const EM = {
      light:   { i: '☀️', name: 'СВЕТ',         c: 0xffd166, hex: '#ffd166' },
      dark:    { i: '🌑', name: 'ТЬМА',         c: 0xa06bff, hex: '#a06bff' },
      neutral: { i: '⚖️', name: 'НЕЙТРАЛИТЕТ',  c: 0x7ec8ff, hex: '#7ec8ff' },
    };
    const em = EM[clan.emblem] || EM.neutral;
    const cardH = 84;
    const cardG = this.add.graphics();
    cardG.fillStyle(0x161920, 1);
    cardG.fillRoundedRect(8, y, W - 16, cardH, 12);
    cardG.lineStyle(2, em.c, 0.85);
    cardG.strokeRoundedRect(8, y, W - 16, cardH, 12);
    const avS = 56, avX = 16, avY = y + (cardH - avS) / 2;
    cardG.fillStyle(0x1e2240, 1);
    cardG.fillRoundedRect(avX, avY, avS, avS, 12);
    cardG.lineStyle(1.5, em.c, 0.9);
    cardG.strokeRoundedRect(avX, avY, avS, avS, 12);
    txt(this, avX + avS / 2, avY + avS / 2 - 4, em.i, 24).setOrigin(0.5);
    txt(this, avX + avS / 2, avY + avS - 8, em.name, 7, em.hex, true).setOrigin(0.5);
    const infoX = avX + avS + 10;
    txt(this, infoX, y + 10, `[${clan.tag}]`, 10, '#ffc83c', true);
    txt(this, infoX + 38, y + 10, `Ур.${clan.level}`, 10, '#ffffff', true);
    txt(this, infoX, y + 26, trunc(clan.name, 18), 16, '#ffffff', true);
    const desc = (clan.description || '').trim();
    if (desc) txt(this, infoX, y + 48, desc.slice(0, 36), 10, '#a8b4d8');
    const pillY = y + cardH - 22;
    const pillG = this.add.graphics();
    let pillX = infoX;
    if (isLeader) {
      pillG.fillStyle(0x1e2a10, 1); pillG.fillRoundedRect(pillX, pillY, 56, 16, 7);
      pillG.lineStyle(1, 0x303a20, 0.9); pillG.strokeRoundedRect(pillX, pillY, 56, 16, 7);
      txt(this, pillX + 28, pillY + 8, '👑 Лидер', 9, '#a0e0a0', true).setOrigin(0.5);
      pillX += 62;
    }
    pillG.fillStyle(0x181b24, 1); pillG.fillRoundedRect(pillX, pillY, 70, 16, 7);
    pillG.lineStyle(1, 0x252a38, 0.9); pillG.strokeRoundedRect(pillX, pillY, 70, 16, 7);
    txt(this, pillX + 35, pillY + 8, `🏆 ${clan.wins}`, 9, '#ffffff', true).setOrigin(0.5);
    y += cardH + 8;

    const sbW = Math.floor((W - 32 - 12) / 3), sbH = 52;
    [
      { val: `${members.length}/20`, lbl: 'БОЙЦОВ' },
      { val: String(clan.wins), lbl: 'ПОБЕД' },
      { val: `Ур.${clan.level}`, lbl: 'УРОВЕНЬ' },
    ].forEach((s, i) => {
      const sx = 16 + i * (sbW + 6);
      const sbg = this.add.graphics();
      sbg.fillStyle(0x141720, 1); sbg.fillRoundedRect(sx, y, sbW, sbH, 10);
      sbg.lineStyle(1, 0x1e2230, 0.9); sbg.strokeRoundedRect(sx, y, sbW, sbH, 10);
      txt(this, sx + sbW / 2, y + 18, s.val, 17, '#ffffff', true).setOrigin(0.5);
      txt(this, sx + sbW / 2, y + 38, s.lbl, 9, '#a8b4d8', true).setOrigin(0.5);
    });
    y += sbH + 10;
    txt(this, 16, y, `УЧАСТНИКИ  ${members.length}/20`, 10, '#a8b4d8', true);
    y += 18;

    const rowH = 44;
    const maxShow = Math.min(members.length, Math.floor((H - y - 64) / rowH));
    members.slice(0, maxShow).forEach((m, i) => {
      const ry = y + i * rowH;
      const isLdr = m.role === 'leader';
      const bg = this.add.graphics();
      bg.fillStyle(isLdr ? 0x16192a : 0x141720, 1);
      bg.fillRoundedRect(8, ry, W - 16, rowH - 3, 8);
      bg.lineStyle(1, isLdr ? 0x252a40 : 0x1c2030, 0.9);
      bg.strokeRoundedRect(8, ry, W - 16, rowH - 3, 8);
      txt(this, 22, ry + (rowH - 3) / 2, isLdr ? '👑' : '⚔️', 13).setOrigin(0, 0.5);
      txt(this, 42, ry + 10, trunc(m.username || `User${m.user_id}`, 17), 13, '#ffffff', true);
      txt(this, 42, ry + 27, `Ур.${m.level}  ·  ${m.wins} побед`, 11, '#a8b4d8');

      if (isLdr) {
        const bw = 52, bx = W - 12 - bw, bh = 18, by = ry + (rowH - 3) / 2 - 9;
        const rbg = this.add.graphics();
        rbg.fillStyle(0x1e2a10, 1); rbg.fillRoundedRect(bx, by, bw, bh, 5);
        rbg.lineStyle(1, 0x303a20, 0.9); rbg.strokeRoundedRect(bx, by, bw, bh, 5);
        txt(this, bx + bw / 2, by + bh / 2, 'ЛИДЕР', 8, '#608050').setOrigin(0.5);
      } else if (isLeader) {
        const kickW = 34, transferW = 70, gap = 6, bh = 22;
        const totalW = transferW + gap + kickW;
        const bx = W - 12 - totalW, by = ry + (rowH - 3) / 2 - 11;
        const tBg = this.add.graphics();
        tBg.fillStyle(0x181b24, 1); tBg.fillRoundedRect(bx, by, transferW, bh, 6);
        tBg.lineStyle(1, 0x2a3050, 0.9); tBg.strokeRoundedRect(bx, by, transferW, bh, 6);
        txt(this, bx + transferW / 2, by + bh / 2, '👑 Передать', 9, '#5070a0').setOrigin(0.5);
        this.add.zone(bx, by, transferW, bh).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerup', () => this._showTransferConfirm(m, W, H));

        const kx = bx + transferW + gap;
        const kBg = this.add.graphics();
        kBg.fillStyle(0x2a1416, 1); kBg.fillRoundedRect(kx, by, kickW, bh, 6);
        kBg.lineStyle(1, 0x4a2024, 0.9); kBg.strokeRoundedRect(kx, by, kickW, bh, 6);
        txt(this, kx + kickW / 2, by + bh / 2, '✖', 10, '#c06870', true).setOrigin(0.5);
        this.add.zone(kx, by, kickW, bh).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerup', () => this._showKickConfirm(m, W, H));
      } else {
        const bw = 46, bx = W - 12 - bw, bh = 18, by = ry + (rowH - 3) / 2 - 9;
        const rbg = this.add.graphics();
        rbg.fillStyle(0x181b24, 1); rbg.fillRoundedRect(bx, by, bw, bh, 5);
        rbg.lineStyle(1, 0x252a38, 0.9); rbg.strokeRoundedRect(bx, by, bw, bh, 5);
        txt(this, bx + bw / 2, by + bh / 2, 'БОЕЦ', 8, '#5070a0').setOrigin(0.5);
      }
    });

    if (members.length > maxShow) {
      txt(this, W / 2, y + maxShow * rowH + 6, `+ ещё ${members.length - maxShow} участников`, 11, '#a8b4d8').setOrigin(0.5);
    }

    const btnZone = H - 56;
    const leftW = Math.round((W - 40) / 2);
    const rightW = W - 32 - leftW - 8;
    const chatBg = this.add.graphics();
    chatBg.fillStyle(0x161a28, 1); chatBg.fillRoundedRect(16, btnZone, leftW, 42, 10);
    chatBg.lineStyle(1, 0x222840, 0.9); chatBg.strokeRoundedRect(16, btnZone, leftW, 42, 10);
    txt(this, 16 + leftW / 2, btnZone + 21, '💬 Чат клана', 13, '#6080c0', true).setOrigin(0.5);
    this.add.zone(16, btnZone, leftW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.restart({ sub: 'chat' }));

    const rx = 16 + leftW + 8;
    const rightBg = this.add.graphics();
    if (isLeader) {
      rightBg.fillStyle(0x2a1416, 1); rightBg.fillRoundedRect(rx, btnZone, rightW, 42, 10);
      rightBg.lineStyle(1, 0x4a2024, 0.9); rightBg.strokeRoundedRect(rx, btnZone, rightW, 42, 10);
      txt(this, rx + rightW / 2, btnZone + 21, '🧨 Распустить', 13, '#c06870', true).setOrigin(0.5);
      this.add.zone(rx, btnZone, rightW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerup', () => this._showDisbandConfirm(W, H));
    } else {
      rightBg.fillStyle(0x1a1214, 1); rightBg.fillRoundedRect(rx, btnZone, rightW, 42, 10);
      rightBg.lineStyle(1, 0x2a1818, 0.9); rightBg.strokeRoundedRect(rx, btnZone, rightW, 42, 10);
      txt(this, rx + rightW / 2, btnZone + 21, '🚪 Выйти', 13, '#805060', true).setOrigin(0.5);
      this.add.zone(rx, btnZone, rightW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerup', () => this._leaveClan());
    }
  },
});
