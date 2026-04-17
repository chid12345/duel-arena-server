/* ============================================================
   ClanScene._renderAchievements — клан-достижения (медали)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _renderAchievements(W, H) {
    txt(this, W/2, 80, '🏅 ДОСТИЖЕНИЯ КЛАНА', 14, '#ffc83c', true).setOrigin(0.5);
    const load = txt(this, W/2, 130, 'Загрузка...', 12, '#a8c4ff').setOrigin(0.5);

    get('/api/clan/achievements').then(d => {
      load.destroy();
      if (!d.ok) {
        txt(this, W/2, 130, '❌ '+(d.reason||'Нет клана'), 12, '#dc3c46').setOrigin(0.5);
        return;
      }
      const items = d.achievements || [];
      const unlocked = items.filter(i => i.unlocked).length;
      const total = items.length;
      txt(this, W/2, 100, `Открыто: ${unlocked} / ${total}`, 11, '#c8d4f0').setOrigin(0.5);

      let y = 124;
      const rowH = 56;
      const maxShow = Math.min(items.length, Math.floor((H - y - 60) / rowH));
      items.slice(0, maxShow).forEach((it) => {
        const open = !!it.unlocked;
        const bg = this.add.graphics();
        bg.fillStyle(open ? 0x2a2010 : 0x141720, 0.95);
        bg.fillRoundedRect(8, y, W-16, rowH-4, 9);
        bg.lineStyle(1.5, open ? 0xffc83c : 0x252a38, open ? 0.9 : 0.6);
        bg.strokeRoundedRect(8, y, W-16, rowH-4, 9);
        // Иконка слева
        const ig = this.add.graphics();
        ig.fillStyle(open ? 0x3a2800 : 0x1c2030, 1);
        ig.fillRoundedRect(14, y+8, 36, 36, 8);
        ig.lineStyle(1, open ? 0xffc83c : 0x2a3050, 0.9);
        ig.strokeRoundedRect(14, y+8, 36, 36, 8);
        txt(this, 32, y+26, it.icon || '🏅', 18).setOrigin(0.5);
        // Название + описание
        txt(this, 58, y+10, it.name, 13, open ? '#ffd166' : '#a8b4d8', true);
        txt(this, 58, y+28, it.description, 10, '#c8d4f0');
        // Порог справа
        txt(this, W-16, y+18, open ? '✓ Открыто' : `≥ ${it.threshold}`,
          11, open ? '#a0e0a0' : '#9aa0b8', true).setOrigin(1, 0.5);
        y += rowH;
      });
    }).catch(() => load.setText('❌ Нет соединения'));

    makeBackBtn(this, '← Назад', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.restart({ sub: 'main' });
    });
  },

});
