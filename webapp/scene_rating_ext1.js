/* ============================================================
   RatingScene — ext1: _buildTitansTab, _renderTitans,
                       _buildNatiskTab, _renderNatisk
   ============================================================ */

Object.assign(RatingScene.prototype, {

  _buildTitansTab(W, H) {
    const startY = 114;
    if (RatingScene._cache.titans) {
      this._renderTitans(RatingScene._cache.titans, W, H, startY);
      return;
    }
    const loadT = txt(this, W / 2, H / 2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    get('/api/titans/top').then(data => {
      RatingScene._cache.titans = data;
      loadT.destroy();
      if (!data.ok) { txt(this, W / 2, H / 2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }
      this._renderTitans(data, W, H, startY);
    }).catch(() => loadT.setText('❌ Нет соединения'));
  },

  _renderTitans(data, W, H, startY) {
    const lb = data.leaders || [];
    txt(this, W / 2, startY + 4, `Неделя: ${data.week_key || '-'}`, 11, '#8888aa').setOrigin(0.5);
    makePanel(this, 8, startY + 16, W - 16, 54, 10, 0.95);
    txt(this, 16, startY + 26, '🎁 Награды недели:', 12, '#ffc83c', true);
    txt(this, 16, startY + 43, '🥇 400💰+150💎  🥈 250💰+90💎  🥉 150💰+60💎  4-10: 60💰+25💎', 10, '#c0c0e0');
    txt(this, 16, startY + 57, 'Титулы: Покоритель / Гроза / Титаноборец', 10, '#9999bb');
    const listY   = startY + 80;
    const rowH    = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 100) / rowH));
    lb.slice(0, maxShow).forEach((row, i) => {
      const ry = listY + i * rowH;
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.86);
      bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      txt(this, 18, ry + 11, medal, i < 3 ? 14 : 11, '#ffc83c').setOrigin(0);
      txt(this, 52, ry + 9,  row.username || `User${row.user_id}`, 12, '#d0d0ee', true);
      txt(this, 52, ry + 24, `🗿 Этаж: ${row.weekly_best_floor || 0}`, 11, '#777799');
      txt(this, W - 16, ry + 17, `${row.weekly_best_floor || 0}`, 12, '#ffc83c', true).setOrigin(1, 0.5);
    });
    if (!lb.length) {
      txt(this, W / 2, H / 2 + 20, '😴 Пока никто не прошёл Башню', 13, '#9999bb').setOrigin(0.5);
    }
  },

  _buildNatiskTab(W, H) {
    const startY = 114;
    if (RatingScene._cache.natisk) { this._renderNatisk(RatingScene._cache.natisk, W, H, startY); return; }
    const loadT = txt(this, W/2, H/2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    get('/api/endless/top').then(data => {
      RatingScene._cache.natisk = data;
      loadT.destroy();
      if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }
      this._renderNatisk(data, W, H, startY);
    }).catch(() => loadT.setText('❌ Нет соединения'));
  },

  _renderNatisk(data, W, H, startY) {
    const leaders = data.weekly || data.leaders || [];
    const myUid   = State.player?.user_id;

    txt(this, W / 2, startY + 4, `Неделя: ${data.week_key || '-'}`, 11, '#8888aa').setOrigin(0.5);
    makePanel(this, 8, startY + 16, W - 16, 54, 10, 0.95);
    txt(this, 16, startY + 26, '🎁 Награды недели:', 12, '#ffc83c', true);
    txt(this, 16, startY + 43, '🥇 300💰+100💎  🥈 200💰+60💎  🥉 100💰+40💎  4-10: 50💰+15💎', 10, '#c0c0e0');
    txt(this, 16, startY + 57, 'Титулы: Покоритель Волн / Штормовой / Волновой', 10, '#9999bb');

    const listY  = startY + 80;
    const rowH   = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 100) / rowH));

    if (!leaders.length) {
      txt(this, W/2, listY + 40, '🔥 Первым войди в историю!', 13, '#ff9999').setOrigin(0.5);
      return;
    }
    leaders.slice(0, maxShow).forEach((row, i) => {
      const ry   = listY + i * rowH;
      const isMe = row.user_id === myUid;
      const bg   = this.add.graphics();
      bg.fillStyle(isMe ? 0x2a1010 : C.bgPanel, isMe ? 0.98 : 0.85);
      bg.fillRoundedRect(8, ry, W-16, rowH-4, 9);
      if (isMe) { bg.lineStyle(1.5, 0xff4444, 0.6); bg.strokeRoundedRect(8, ry, W-16, rowH-4, 9); }
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
      txt(this, 20, ry+(rowH-4)/2, medal, i<3?15:11, '#ffc83c').setOrigin(0, 0.5);
      txt(this, 52, ry+9,  row.username||`User${row.user_id}`, 13, isMe?'#ff6666':'#f0f0fa', isMe);
      txt(this, 52, ry+24, `🔥 Волна ${row.best_wave}`, 11, '#cc6644');
      txt(this, W-14, ry+(rowH-4)/2, `${row.best_wave}`, 15, '#ff6644', true).setOrigin(1, 0.5);
    });
  },

});
