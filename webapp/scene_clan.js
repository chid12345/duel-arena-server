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
    txt(this, W/2, 90, '🏰', 34).setOrigin(0.5);
    txt(this, W/2, 128, 'Вы не состоите в клане', 15, '#a0a0cc').setOrigin(0.5);
    txt(this, W/2, 150, 'Вступайте и участвуйте в клановых войнах!', 12, '#bbbbff').setOrigin(0.5);

    const btns = [
      { label: '🔍  Найти клан',   col: C.blue,   sub: 'search' },
      { label: '➕  Создать клан', col: C.purple, sub: 'create' },
      { label: '🏆  Топ кланов',   col: C.dark,   sub: 'top', border: C.gold },
    ];
    btns.forEach((b, i) => {
      const by = 176 + i * 58, bh = 46;
      const bg = this.add.graphics();
      bg.fillStyle(b.col, b.col === C.dark ? 0.7 : 0.9);
      bg.fillRoundedRect(16, by, W-32, bh, 12);
      if (b.border) { bg.lineStyle(1.5, b.border, 0.5); bg.strokeRoundedRect(16,by,W-32,bh,12); }
      txt(this, W/2, by + bh/2, b.label, 14, '#f0f0fa', true).setOrigin(0.5);
      this.add.zone(16, by, W-32, bh).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(C.dark,1); bg.fillRoundedRect(16,by,W-32,bh,12); tg?.HapticFeedback?.impactOccurred('light'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(b.col,b.col===C.dark?0.7:0.9); bg.fillRoundedRect(16,by,W-32,bh,12); if(b.border){bg.lineStyle(1.5,b.border,0.5);bg.strokeRoundedRect(16,by,W-32,bh,12);} })
        .on('pointerup',   () => this.scene.restart({ sub: b.sub }));
    });
    txt(this, W/2, 176 + 3*58 + 8, 'Создание клана стоит 200 🪙', 12, '#bbbbff').setOrigin(0.5);
  }

  /* ══ МОЙ КЛАН ═══════════════════════════════════════════ */
  _renderMyClan(data, W, H) {
    const clan     = data.clan;
    const members  = data.members || [];
    const isLeader = data.is_leader;
    let y = 84;

    const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');

    /* ── Инфо-панель клана ─────────────────────────────── */
    const infoH = 80;
    makePanel(this, 8, y, W-16, infoH, 12);

    /* Тег слева */
    txt(this, 20, y+12, `[${clan.tag}]`, 14, '#ffc83c', true);
    /* Название */
    txt(this, 20, y+32, trunc(clan.name, 20), 16, '#f0f0fa', true);
    /* Статы */
    txt(this, 20, y+56, `👥 ${members.length}/20  ·  🏆 ${clan.wins}  ·  Ур.${clan.level}`, 12, '#a0a0cc');
    if (isLeader) txt(this, W-20, y+14, '👑 Лидер', 12, '#ffc83c', true).setOrigin(1, 0);
    y += infoH + 10;

    /* ── Заголовок списка ──────────────────────────────── */
    txt(this, 16, y, `УЧАСТНИКИ  (${members.length}/20)`, 13, '#aaaaee', true);
    y += 22;

    /* ── Список участников ─────────────────────────────── */
    const rowH    = 44;
    /* 64 = зона кнопок внизу (42px кнопка + 22px отступы) */
    const maxShow = Math.min(members.length, Math.floor((H - y - 64) / rowH));

    members.slice(0, maxShow).forEach((m, i) => {
      const ry = y + i * rowH;
      const isLdr = m.role === 'leader';
      const bg = this.add.graphics();
      bg.fillStyle(isLdr ? 0x2a2010 : C.bgPanel, 0.85);
      bg.fillRoundedRect(8, ry, W-16, rowH-3, 8);
      if (isLdr) { bg.lineStyle(1.5, C.gold, 0.4); bg.strokeRoundedRect(8, ry, W-16, rowH-3, 8); }

      txt(this, 22, ry + rowH/2 - 4, isLdr ? '👑' : '⚔️', 15).setOrigin(0, 0.5);
      txt(this, 44, ry+10, trunc(m.username || `User${m.user_id}`, 17), 13,
        isLdr ? '#ffc83c' : '#e0e0f8', isLdr);
      txt(this, 44, ry+27, `Ур.${m.level}  ·  ${m.wins} побед`, 11, '#aaaaee');

      /* Роль/кнопка */
      if (isLdr) {
        txt(this, W-18, ry + rowH/2, 'Лидер', 11, '#ffc83c', true).setOrigin(1, 0.5);
      } else if (isLeader) {
        /* Кнопка «👑 Передать» — только для текущего лидера */
        const bx = W - 82, bw = 70, bh = 26, by2 = ry + (rowH-3)/2 - 13;
        const tBg = this.add.graphics();
        tBg.fillStyle(0x3a2800, 1); tBg.fillRoundedRect(bx, by2, bw, bh, 7);
        tBg.lineStyle(1, C.gold, 0.6); tBg.strokeRoundedRect(bx, by2, bw, bh, 7);
        txt(this, bx + bw/2, by2 + bh/2, '👑 Передать', 10, '#ffc83c').setOrigin(0.5);
        this.add.zone(bx, by2, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { tBg.clear(); tBg.fillStyle(0x5a3c00,1); tBg.fillRoundedRect(bx,by2,bw,bh,7); tg?.HapticFeedback?.impactOccurred('medium'); })
          .on('pointerout',  () => { tBg.clear(); tBg.fillStyle(0x3a2800,1); tBg.fillRoundedRect(bx,by2,bw,bh,7); tBg.lineStyle(1,C.gold,0.6); tBg.strokeRoundedRect(bx,by2,bw,bh,7); })
          .on('pointerup',   () => this._showTransferConfirm(m, W, H));
      }
    });

    if (members.length > maxShow) {
      txt(this, W/2, y + maxShow*rowH + 6, `+ ещё ${members.length - maxShow} участников`, 12, '#aaaaff').setOrigin(0.5);
    }

    /* ── Кнопки внизу ───────────────────────────────────── */
    const btnZone = H - 56;

    /* Кнопка «💬 Чат» */
    const chatBtnW = isLeader ? W-32 : Math.round((W-40)/2);
    const chatBg = this.add.graphics();
    chatBg.fillStyle(0x1a4a8a, 1); chatBg.fillRoundedRect(16, btnZone, chatBtnW, 42, 10);
    chatBg.lineStyle(1.5, 0x5096ff, 0.7); chatBg.strokeRoundedRect(16, btnZone, chatBtnW, 42, 10);
    txt(this, 16 + chatBtnW/2, btnZone+21, '💬  Чат клана', 13, '#a8d4ff', true).setOrigin(0.5);
    this.add.zone(16, btnZone, chatBtnW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { chatBg.clear(); chatBg.fillStyle(0x0e2a5a,1); chatBg.fillRoundedRect(16,btnZone,chatBtnW,42,10); tg?.HapticFeedback?.impactOccurred('light'); })
      .on('pointerout',  () => { chatBg.clear(); chatBg.fillStyle(0x1a4a8a,1); chatBg.fillRoundedRect(16,btnZone,chatBtnW,42,10); chatBg.lineStyle(1.5,0x5096ff,0.7); chatBg.strokeRoundedRect(16,btnZone,chatBtnW,42,10); })
      .on('pointerup',   () => this.scene.restart({ sub: 'chat' }));

    if (!isLeader) {
      /* Кнопка «Покинуть» справа */
      const lx = 16 + chatBtnW + 8, lw = W - 32 - chatBtnW - 8;
      const bg2 = this.add.graphics();
      bg2.fillStyle(0x4a1010, 1); bg2.fillRoundedRect(lx, btnZone, lw, 42, 10);
      bg2.lineStyle(1.5, C.red, 0.7); bg2.strokeRoundedRect(lx, btnZone, lw, 42, 10);
      txt(this, lx + lw/2, btnZone+21, '🚪 Выйти', 13, '#ff6666', true).setOrigin(0.5);
      this.add.zone(lx, btnZone, lw, 42).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg2.clear(); bg2.fillStyle(0x6a1818,1); bg2.fillRoundedRect(lx,btnZone,lw,42,10); tg?.HapticFeedback?.impactOccurred('medium'); })
        .on('pointerout',  () => { bg2.clear(); bg2.fillStyle(0x4a1010,1); bg2.fillRoundedRect(lx,btnZone,lw,42,10); bg2.lineStyle(1.5,C.red,0.7); bg2.strokeRoundedRect(lx,btnZone,lw,42,10); })
        .on('pointerup',   () => this._leaveClan());
    } else {
      txt(this, W/2, btnZone - 16, '👑 Передайте роль, чтобы покинуть клан', 11, '#aaaaff').setOrigin(0.5);
    }
  }
}
