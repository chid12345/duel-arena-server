/* ============================================================
   ClanScene — полная клановая система
   Продолжение: scene_clan_ext.js
   ============================================================ */

class ClanScene extends Phaser.Scene {
  constructor() { super('Clan'); }

  init(data) {
    this._subview = (data && data.sub) ? data.sub : 'main';
    this._busy = false;
  }

  shutdown() {
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    /* Заголовок и кнопку «Назад» рисуем только НЕ для чата — в чате своя шапка */
    if (this._subview !== 'chat') {
      _extraHeader(this, W, '⚔️', 'КЛАН', 'Кланы · Поиск · Рейтинг');
      /* Из подразделов возвращаемся в главный экран клана, из main — в Menu */
      if (this._subview === 'main') {
        _extraBack(this, 'Menu', 'more');   /* → Menu → вкладка Еще */
      } else {
        makeBackBtn(this, 'Назад', () => {
          tg?.HapticFeedback?.impactOccurred('light');
          this.scene.restart({ sub: 'main' });
        });
      }
    }
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#ddddff').setOrigin(0.5);
    get('/api/clan').then(d => this._route(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _route(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) {
      txt(this, W/2, H/2 - 10, '❌ Ошибка загрузки', 14, '#dc3c46').setOrigin(0.5);
      txt(this, W/2, H/2 + 14, data.reason || 'Попробуйте позже', 11, '#ddddff').setOrigin(0.5);
      return;
    }
    try {
      if (data.clan) {
        if (this._subview === 'chat') this._renderChat(data, W, H);
        else                          this._renderMyClan(data, W, H);
      } else {
        if      (this._subview === 'search') this._renderSearch(W, H);
        else if (this._subview === 'create') this._renderCreate(W, H);
        else if (this._subview === 'top')    this._renderTop(W, H);
        else                                  this._renderNoClan(W, H);
      }
    } catch(e) {
      console.error('ClanScene render error:', e);
      txt(this, W/2, H/2, '⚠️ Ошибка: ' + e.message, 11, '#dc3c46').setOrigin(0.5);
    }
  }

  /* ══ НЕТ КЛАНА ══════════════════════════════════════════ */
  _renderNoClan(W, H) {
    // Иконка-замок
    const iconS = 64, iconX = W/2 - iconS/2, iconY = 86;
    const iconG = this.add.graphics();
    iconG.fillStyle(0x141720, 1);
    iconG.fillRoundedRect(iconX, iconY, iconS, iconS, 18);
    iconG.lineStyle(1, 0x1e2230, 0.9);
    iconG.strokeRoundedRect(iconX, iconY, iconS, iconS, 18);
    txt(this, W/2, iconY + iconS/2, '🏰', 32).setOrigin(0.5);

    txt(this, W/2, 165, 'Вы не в клане', 14, '#e8ecff', true).setOrigin(0.5);
    txt(this, W/2, 184, 'Вступайте и участвуйте в клановых войнах', 11, '#3a4060').setOrigin(0.5);

    const btns = [
      { label: 'Найти клан',    bgCol: 0x1a2050, border: 0x2a3460, textCol: '#6080c0', sub: 'search', dot: 0x5080ff },
      { label: '＋ Создать клан', bgCol: 0x1e1040, border: 0x2a1e50, textCol: '#8060c0', sub: 'create' },
      { label: '🏆 Топ кланов',  bgCol: 0x141720, border: 0x252a38, textCol: '#c09030', sub: 'top' },
    ];
    btns.forEach((b, i) => {
      const by = 204 + i * 54, bh = 46;
      const bg = this.add.graphics();
      bg.fillStyle(b.bgCol, 0.95);
      bg.fillRoundedRect(16, by, W-32, bh, 10);
      bg.lineStyle(1, b.border, 0.85);
      bg.strokeRoundedRect(16, by, W-32, bh, 10);
      if (b.dot) {
        bg.fillStyle(b.dot, 1);
        bg.fillCircle(W/2 - 52, by + bh/2, 4);
      }
      txt(this, W/2, by + bh/2, b.label, 13, b.textCol, true).setOrigin(0.5);
      this.add.zone(16, by, W-32, bh).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x0a0e18,1); bg.fillRoundedRect(16,by,W-32,bh,10); tg?.HapticFeedback?.impactOccurred('light'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(b.bgCol,0.95); bg.fillRoundedRect(16,by,W-32,bh,10); bg.lineStyle(1,b.border,0.85); bg.strokeRoundedRect(16,by,W-32,bh,10); })
        .on('pointerup',   () => this.scene.restart({ sub: b.sub }));
    });
    txt(this, W/2, 204 + 3*54 + 8, 'Создание клана стоит 200 🪙', 10, '#2a3050').setOrigin(0.5);
  }

  /* ══ МОЙ КЛАН ═══════════════════════════════════════════ */
  _renderMyClan(data, W, H) {
    const clan     = data.clan;
    const members  = data.members || [];
    const isLeader = data.is_leader;
    let y = 84;

    const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');

    /* ── Карточка клана ────────────────────────────────── */
    const cardH = 72;
    const cardG = this.add.graphics();
    cardG.fillStyle(0x161920, 1);
    cardG.fillRoundedRect(8, y, W-16, cardH, 12);
    cardG.lineStyle(1, 0x1e2230, 0.9);
    cardG.strokeRoundedRect(8, y, W-16, cardH, 12);

    // Аватар-иконка
    const avS = 46, avX = 16, avY = y + (cardH - avS) / 2;
    cardG.fillStyle(0x1e2240, 1);
    cardG.fillRoundedRect(avX, avY, avS, avS, 12);
    cardG.lineStyle(1, 0x2a3050, 0.9);
    cardG.strokeRoundedRect(avX, avY, avS, avS, 12);
    txt(this, avX + avS/2, avY + avS/2, '🏰', 22).setOrigin(0.5);

    // Тег + имя
    const infoX = avX + avS + 10;
    txt(this, infoX, y + 14, `[ ${clan.tag} ]  ·  УР.${clan.level}`, 9, '#3a5080');
    txt(this, infoX, y + 29, trunc(clan.name, 18), 15, '#e8ecff', true);

    // Пилюли
    const pillY = y + 50;
    const pillG = this.add.graphics();
    if (isLeader) {
      pillG.fillStyle(0x1e2a10, 1); pillG.fillRoundedRect(infoX, pillY, 52, 14, 7);
      pillG.lineStyle(1, 0x303a20, 0.9); pillG.strokeRoundedRect(infoX, pillY, 52, 14, 7);
      txt(this, infoX + 26, pillY + 7, '👑 Лидер', 8, '#608050').setOrigin(0.5);
    }
    const winPillX = isLeader ? infoX + 58 : infoX;
    pillG.fillStyle(0x181b24, 1); pillG.fillRoundedRect(winPillX, pillY, 60, 14, 7);
    pillG.lineStyle(1, 0x252a38, 0.9); pillG.strokeRoundedRect(winPillX, pillY, 60, 14, 7);
    txt(this, winPillX + 30, pillY + 7, `🏆 ${clan.wins} побед`, 8, '#5070a0').setOrigin(0.5);
    y += cardH + 8;

    /* ── Сетка статов 3 колонки ────────────────────────── */
    const sbW = Math.floor((W - 32 - 12) / 3), sbH = 52;
    [
      { val: `${members.length}/20`, lbl: 'БОЙЦОВ' },
      { val: String(clan.wins),      lbl: 'ПОБЕД'  },
      { val: `Ур.${clan.level}`,     lbl: 'УРОВЕНЬ' },
    ].forEach((s, i) => {
      const sx = 16 + i * (sbW + 6);
      const sbg = this.add.graphics();
      sbg.fillStyle(0x141720, 1); sbg.fillRoundedRect(sx, y, sbW, sbH, 10);
      sbg.lineStyle(1, 0x1e2230, 0.9); sbg.strokeRoundedRect(sx, y, sbW, sbH, 10);
      txt(this, sx + sbW/2, y + 18, s.val, 16, '#e8ecff', true).setOrigin(0.5);
      txt(this, sx + sbW/2, y + 38, s.lbl, 8, '#3a4060').setOrigin(0.5);
    });
    y += sbH + 10;

    /* ── Заголовок участников ──────────────────────────── */
    txt(this, 16, y, `УЧАСТНИКИ  ${members.length}/20`, 9, '#3a4060');
    y += 18;

    /* ── Список участников ─────────────────────────────── */
    const rowH = 44;
    const maxShow = Math.min(members.length, Math.floor((H - y - 64) / rowH));

    members.slice(0, maxShow).forEach((m, i) => {
      const ry = y + i * rowH;
      const isLdr = m.role === 'leader';
      const bg = this.add.graphics();
      bg.fillStyle(isLdr ? 0x16192a : 0x141720, 1);
      bg.fillRoundedRect(8, ry, W-16, rowH-3, 8);
      bg.lineStyle(1, isLdr ? 0x252a40 : 0x1c2030, 0.9);
      bg.strokeRoundedRect(8, ry, W-16, rowH-3, 8);

      txt(this, 22, ry + (rowH-3)/2, isLdr ? '👑' : '⚔️', 13).setOrigin(0, 0.5);
      txt(this, 42, ry + 10, trunc(m.username || `User${m.user_id}`, 17), 13,
        isLdr ? '#e0e8ff' : '#c0c8e8', isLdr);
      txt(this, 42, ry + 27, `Ур.${m.level}  ·  ${m.wins} побед`, 11, '#3a4060');

      // Бейдж роли / кнопка передать
      if (isLdr) {
        const bw = 52, bx = W - 12 - bw, bh2 = 18, bry = ry + (rowH-3)/2 - 9;
        const rbg = this.add.graphics();
        rbg.fillStyle(0x1e2a10, 1); rbg.fillRoundedRect(bx, bry, bw, bh2, 5);
        rbg.lineStyle(1, 0x303a20, 0.9); rbg.strokeRoundedRect(bx, bry, bw, bh2, 5);
        txt(this, bx + bw/2, bry + bh2/2, 'ЛИДЕР', 8, '#608050').setOrigin(0.5);
      } else if (isLeader) {
        const bw = 70, bx = W - 12 - bw, bh2 = 24, bry = ry + (rowH-3)/2 - 12;
        const tBg = this.add.graphics();
        tBg.fillStyle(0x181b24, 1); tBg.fillRoundedRect(bx, bry, bw, bh2, 6);
        tBg.lineStyle(1, 0x2a3050, 0.9); tBg.strokeRoundedRect(bx, bry, bw, bh2, 6);
        txt(this, bx + bw/2, bry + bh2/2, '👑 Передать', 9, '#5070a0').setOrigin(0.5);
        this.add.zone(bx, bry, bw, bh2).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { tBg.clear(); tBg.fillStyle(0x252a38,1); tBg.fillRoundedRect(bx,bry,bw,bh2,6); tg?.HapticFeedback?.impactOccurred('medium'); })
          .on('pointerout',  () => { tBg.clear(); tBg.fillStyle(0x181b24,1); tBg.fillRoundedRect(bx,bry,bw,bh2,6); tBg.lineStyle(1,0x2a3050,0.9); tBg.strokeRoundedRect(bx,bry,bw,bh2,6); })
          .on('pointerup',   () => this._showTransferConfirm(m, W, H));
      } else {
        const bw = 46, bx = W - 12 - bw, bh2 = 18, bry = ry + (rowH-3)/2 - 9;
        const rbg = this.add.graphics();
        rbg.fillStyle(0x181b24, 1); rbg.fillRoundedRect(bx, bry, bw, bh2, 5);
        rbg.lineStyle(1, 0x252a38, 0.9); rbg.strokeRoundedRect(bx, bry, bw, bh2, 5);
        txt(this, bx + bw/2, bry + bh2/2, 'БОЕЦ', 8, '#5070a0').setOrigin(0.5);
      }
    });

    if (members.length > maxShow) {
      txt(this, W/2, y + maxShow*rowH + 6, `+ ещё ${members.length - maxShow} участников`, 11, '#3a4060').setOrigin(0.5);
    }

    /* ── Кнопки внизу ───────────────────────────────────── */
    const btnZone = H - 56;
    const chatBtnW = isLeader ? W-32 : Math.round((W-40)/2);

    const chatBg = this.add.graphics();
    chatBg.fillStyle(0x161a28, 1); chatBg.fillRoundedRect(16, btnZone, chatBtnW, 42, 10);
    chatBg.lineStyle(1, 0x222840, 0.9); chatBg.strokeRoundedRect(16, btnZone, chatBtnW, 42, 10);
    txt(this, 16 + chatBtnW/2, btnZone+21, '💬  Чат клана', 13, '#6080c0', true).setOrigin(0.5);
    this.add.zone(16, btnZone, chatBtnW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { chatBg.clear(); chatBg.fillStyle(0x0e1020,1); chatBg.fillRoundedRect(16,btnZone,chatBtnW,42,10); tg?.HapticFeedback?.impactOccurred('light'); })
      .on('pointerout',  () => { chatBg.clear(); chatBg.fillStyle(0x161a28,1); chatBg.fillRoundedRect(16,btnZone,chatBtnW,42,10); chatBg.lineStyle(1,0x222840,0.9); chatBg.strokeRoundedRect(16,btnZone,chatBtnW,42,10); })
      .on('pointerup',   () => this.scene.restart({ sub: 'chat' }));

    if (!isLeader) {
      const lx = 16 + chatBtnW + 8, lw = W - 32 - chatBtnW - 8;
      const bg2 = this.add.graphics();
      bg2.fillStyle(0x1a1214, 1); bg2.fillRoundedRect(lx, btnZone, lw, 42, 10);
      bg2.lineStyle(1, 0x2a1818, 0.9); bg2.strokeRoundedRect(lx, btnZone, lw, 42, 10);
      txt(this, lx + lw/2, btnZone+21, '🚪 Выйти', 13, '#805060', true).setOrigin(0.5);
      this.add.zone(lx, btnZone, lw, 42).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg2.clear(); bg2.fillStyle(0x2a1010,1); bg2.fillRoundedRect(lx,btnZone,lw,42,10); tg?.HapticFeedback?.impactOccurred('medium'); })
        .on('pointerout',  () => { bg2.clear(); bg2.fillStyle(0x1a1214,1); bg2.fillRoundedRect(lx,btnZone,lw,42,10); bg2.lineStyle(1,0x2a1818,0.9); bg2.strokeRoundedRect(lx,btnZone,lw,42,10); })
        .on('pointerup',   () => this._leaveClan());
    } else {
      txt(this, W/2, btnZone - 16, '👑 Передайте роль, чтобы покинуть клан', 11, '#3a4060').setOrigin(0.5);
    }
  }
}
