/* ============================================================
   ClanScene._renderPreview — открытое превью клана
   (видно ДО вступления: эмблема, описание, состав, онлайн)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _renderPreview(data, W, H) {
    const clan = data.clan || {};
    const members = data.members || [];
    const onlineCount = data.online_count || 0;
    const myClanId = data.my_clan_id || null;
    const isMine = myClanId && Number(myClanId) === Number(clan.id);
    const myPendingRequest = !!data.my_pending_request;

    const EM = {
      light:   { i: '☀️', name: 'СВЕТ',         c: 0xffd166, hex: '#ffd166' },
      dark:    { i: '🌑', name: 'ТЬМА',         c: 0xa06bff, hex: '#a06bff' },
      neutral: { i: '⚖️', name: 'НЕЙТРАЛИТЕТ',  c: 0x7ec8ff, hex: '#7ec8ff' },
    };
    const em = EM[clan.emblem] || EM.neutral;

    /* Шапка */
    txt(this, W/2, 80, '👁 ПРЕВЬЮ КЛАНА', 13, '#ffc83c', true).setOrigin(0.5);

    /* Карточка */
    let y = 100;
    const cardH = 96;
    const g = this.add.graphics();
    g.fillStyle(0x161920, 1); g.fillRoundedRect(8, y, W-16, cardH, 12);
    g.lineStyle(2, em.c, 0.9); g.strokeRoundedRect(8, y, W-16, cardH, 12);

    /* Эмблема (большой квадрат) */
    const emS = 60, emX = 18, emY = y + (cardH-emS)/2;
    g.fillStyle(0x1e2240, 1); g.fillRoundedRect(emX, emY, emS, emS, 12);
    g.lineStyle(1.5, em.c, 0.9); g.strokeRoundedRect(emX, emY, emS, emS, 12);
    txt(this, emX+emS/2, emY+emS/2-2, em.i, 28).setOrigin(0.5);
    txt(this, emX+emS/2, emY+emS-8, em.name, 7, em.hex, true).setOrigin(0.5);

    const tx = emX + emS + 12;
    txt(this, tx, y+10, `[${clan.tag}]`, 11, '#ffc83c', true);
    txt(this, tx+50, y+10, `Ур.${clan.level||1}`, 11, '#ffffff', true);
    const tname = (s,n)=>s&&s.length>n?s.slice(0,n)+'…':(s||'');
    txt(this, tx, y+26, tname(clan.name, 18), 16, '#ffffff', true);
    const desc = (clan.description||'').trim() || 'Без описания';
    txt(this, tx, y+48, desc.slice(0,40), 10, '#a8b4d8');
    /* Пилюли: онлайн / состав / закрыт */
    let px = tx, py = y+68;
    const pill = (lbl, col, fill, w) => {
      const pg = this.add.graphics();
      pg.fillStyle(fill, 1); pg.fillRoundedRect(px, py, w, 16, 8);
      txt(this, px+w/2, py+8, lbl, 9, col, true).setOrigin(0.5);
      px += w + 6;
    };
    pill(`🟢 ${onlineCount} онлайн`, '#a0e0a0', 0x1e2a18, 78);
    pill(`👥 ${members.length}/20`, '#ffffff', 0x1c2238, 56);
    if ((clan.closed|0)===1) pill('🔒 закрыт', '#ffc83c', 0x2a2010, 56);
    if ((clan.min_level|0)>1) pill(`🛡️ Ур.${clan.min_level}+`, '#a8c4ff', 0x1c2238, 60);

    y += cardH + 8;

    /* Список участников */
    txt(this, 16, y, `УЧАСТНИКИ  ${members.length}/20`, 10, '#a8b4d8');
    y += 16;
    const rowH = 38;
    const maxShow = Math.min(members.length, Math.max(1, Math.floor((H - y - 100) / rowH)));
    const isOnline = (ts) => {
      if (!ts) return false;
      try {
        const s = (typeof ts === 'string') ? ts.replace(' ','T').replace('Z','+00:00') : ts;
        const dt = new Date(s);
        return (Date.now() - dt.getTime()) < 600000; // 10 мин
      } catch(_) { return false; }
    };
    members.slice(0, maxShow).forEach((m, i) => {
      const ry = y + i * rowH;
      const isLdr = m.role === 'leader';
      const on = isOnline(m.last_active_at);
      const bg = this.add.graphics();
      bg.fillStyle(isLdr ? 0x16192a : 0x141720, 1);
      bg.fillRoundedRect(8, ry, W-16, rowH-3, 8);
      bg.lineStyle(1, isLdr ? 0x252a40 : 0x1c2030, 0.9);
      bg.strokeRoundedRect(8, ry, W-16, rowH-3, 8);
      txt(this, 18, ry + (rowH-3)/2, isLdr ? '👑' : '⚔️', 13).setOrigin(0, 0.5);
      const nameStr = (m.username || `User${m.user_id}`).slice(0, 16);
      txt(this, 38, ry+8, nameStr, 12, '#ffffff', true);
      txt(this, 38, ry+24, `Ур.${m.level}  ·  ${m.wins} побед`, 10, '#a8b4d8');
      const onCol = on ? '#a0e0a0' : '#666b80';
      const onLbl = on ? '🟢 онлайн' : '⚫ оффлайн';
      txt(this, W-14, ry + (rowH-3)/2, onLbl, 9, onCol, true).setOrigin(1, 0.5);
    });
    if (members.length > maxShow) {
      txt(this, W/2, y + maxShow*rowH + 4, `+ ещё ${members.length - maxShow}`, 10, '#a8b4d8').setOrigin(0.5);
    }

    /* Нижняя кнопка: Вступить / Это твой клан */
    const btnY = H - 56, btnH = 42;
    const isClosed = (clan.closed|0)===1;
    const bg2 = this.add.graphics();
    if (isMine) {
      bg2.fillStyle(0x1c2238, 1); bg2.fillRoundedRect(16, btnY, W-32, btnH, 10);
      bg2.lineStyle(1, 0x2a3460, 0.9); bg2.strokeRoundedRect(16, btnY, W-32, btnH, 10);
      txt(this, W/2, btnY+btnH/2, '🏰 Это ваш клан', 13, '#ffc83c', true).setOrigin(0.5);
    } else if (myPendingRequest) {
      bg2.fillStyle(0x1a1e2a, 1); bg2.fillRoundedRect(16, btnY, W-32, btnH, 10);
      bg2.lineStyle(1.5, 0x3a3050, 0.9); bg2.strokeRoundedRect(16, btnY, W-32, btnH, 10);
      txt(this, W/2, btnY+btnH/2, '📨 Заявка уже подана', 13, '#a8b4d8', true).setOrigin(0.5);
      txt(this, W/2, btnY+btnH/2+14, 'ожидайте решения лидера', 9, '#55506e').setOrigin(0.5);
    } else {
      const fill = isClosed ? 0x2a2010 : 0x1e3028;
      const stroke = isClosed ? 0xffc83c : 0x304838;
      const labelCol = isClosed ? '#ffc83c' : '#a0e0a0';
      const label = isClosed ? '🔒 Подать заявку' : '⚔️ Вступить в клан';
      bg2.fillStyle(fill, 1); bg2.fillRoundedRect(16, btnY, W-32, btnH, 10);
      bg2.lineStyle(1.5, stroke, 0.9); bg2.strokeRoundedRect(16, btnY, W-32, btnH, 10);
      const t2 = txt(this, W/2, btnY+btnH/2, label, 13, labelCol, true).setOrigin(0.5);
      this.add.zone(16, btnY, W-32, btnH).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerup', () => isClosed
          ? this._submitJoinRequest(clan.id, t2)
          : this._joinClan(clan.id, clan.name, t2));
    }

    /* Назад */
    makeBackBtn(this, '← Назад', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.restart({ sub: 'search' });
    });
  },

});
