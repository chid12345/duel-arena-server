/* ============================================================
   MenuScene — ext5: _onInvite (часть 1 — каркас попапа и таб-бар)
   Продолжение: scene_menu_ext5b.js
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _onInvite() {
    const { W, H } = this;

    const ov = this.add.graphics().setDepth(60);
    ov.fillStyle(0x000000, 0.55); ov.fillRect(0, 0, W, H);

    const pw = W - 32, ph = Math.min(410, H - 56), px = 16, py = Math.max(8, Math.round((H - ph) / 2));
    const D = 62;
    const panBg = this.add.graphics().setDepth(61);
    panBg.fillStyle(0x1e3a7a, 1);
    panBg.fillRoundedRect(px, py, pw, ph, 16);
    panBg.lineStyle(2.5, 0xffc83c, 0.9);
    panBg.strokeRoundedRect(px, py, pw, ph, 16);
    panBg.fillStyle(0xffffff, 0.06);
    panBg.fillRoundedRect(px+2, py+2, pw-4, 26, 14);

    const at = (x, y, s, sz, col, bold) =>
      txt(this, x, y, s, sz, col || '#f0f0fa', bold).setOrigin(0.5).setDepth(D);
    const atL = (x, y, s, sz, col, bold) =>
      txt(this, x, y, s, sz, col || '#f0f0fa', bold).setOrigin(0, 0.5).setDepth(D);

    at(px+pw/2, py+18, '🔗  РЕФЕРАЛКА', 15, '#ffc83c', true);

    const xBg = this.add.graphics().setDepth(D);
    xBg.fillStyle(0x2a50a0, 1); xBg.fillCircle(px+pw-18, py+18, 13);
    txt(this, px+pw-18, py+18, '✕', 13, '#f0f0fa', true).setOrigin(0.5).setDepth(D+1);

    const close = () => this.children.list
      .filter(o => o.depth >= 59)
      .forEach(o => { try { o.destroy(); } catch(_){} });
    this.add.zone(px+pw-32, py, 32, 32).setOrigin(0).setDepth(70)
      .setInteractive({ useHandCursor: true }).on('pointerup', close);
    this.add.zone(0, 0, W, H).setOrigin(0).setDepth(59).setInteractive()
      .on('pointerup', ptr => {
        if (ptr.x < px || ptr.x > px+pw || ptr.y < py || ptr.y > py+ph) close();
      });

    const tabY = py + 36, tabH = 32, tabW = (pw - 24) / 2;
    let activeTab = 'stats';
    const statsObjs = [], infoObjs = [];

    const tabBar = this.add.graphics().setDepth(D);
    tabBar.fillStyle(0x12245a, 1);
    tabBar.fillRoundedRect(px+8, tabY, pw-16, tabH, 8);

    const tabAct = this.add.graphics().setDepth(D);
    const drawTabAct = (tab) => {
      tabAct.clear();
      const tx = tab === 'stats' ? px+8 : px+8+tabW+4;
      tabAct.fillStyle(0x3a7aff, 1);
      tabAct.fillRoundedRect(tx+2, tabY+3, tabW-4, tabH-6, 6);
    };
    drawTabAct('stats');

    const t1 = at(px+8+tabW/2,     tabY+16, '📊 Статистика', 11, '#ffffff', true);
    const t2 = at(px+8+tabW+4+tabW/2, tabY+16, 'ℹ️ Условия',    11, '#a8c4ff');

    const switchTab = (tab) => {
      activeTab = tab;
      drawTabAct(tab);
      t1.setStyle({ color: tCol(tab==='stats' ? '#ffffff' : '#a8c4ff') });
      t2.setStyle({ color: tCol(tab==='info'  ? '#ffffff' : '#a8c4ff') });
      statsObjs.forEach(o => o?.setVisible?.(tab === 'stats'));
      infoObjs.forEach(o  => o?.setVisible?.(tab === 'info'));
      tg?.HapticFeedback?.impactOccurred('light');
    };

    this.add.zone(px+8, tabY, tabW, tabH).setOrigin(0).setDepth(70)
      .setInteractive({ useHandCursor: true }).on('pointerup', () => switchTab('stats'));
    this.add.zone(px+8+tabW+4, tabY, tabW, tabH).setOrigin(0).setDepth(70)
      .setInteractive({ useHandCursor: true }).on('pointerup', () => switchTab('info'));

    const cY = tabY + tabH + 10;

    const loadTxt = at(px+pw/2, cY+20, '⏳ Загрузка...', 11, '#a8c4ff');
    statsObjs.push(loadTxt);

    get('/api/referral').then(rd => {
      loadTxt.destroy();
      statsObjs.splice(statsObjs.indexOf(loadTxt), 1);
      this._buildInviteStats(rd, px, pw, cY, D, at, statsObjs, activeTab);
    }).catch(() => { loadTxt.setText('❌ Нет соединения').setStyle({ color:'#ff6666' }); });

    this._buildInviteInfo(px, pw, cY, D, at, infoObjs, activeTab);
  },

});
