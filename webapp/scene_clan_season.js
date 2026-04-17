/* ============================================================
   ClanScene._renderSeason — сезон 7 дней: топ + таймер
   Награды: 1 — 500🪙 +5💎,  2 — 300🪙 +3💎,  3 — 150🪙 +1💎  (каждому)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _formatTimeLeft(endsAt) {
    if (!endsAt) return '—';
    try {
      const s = (typeof endsAt === 'string') ? endsAt.replace(' ','T').replace('Z','+00:00') : endsAt;
      const dt = new Date(s);
      const ms = dt.getTime() - Date.now();
      if (ms <= 0) return 'обновляется...';
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      if (d > 0) return `${d}д ${h}ч`;
      if (h > 0) return `${h}ч ${m}м`;
      return `${m}м`;
    } catch(_) { return '—'; }
  },

  _renderSeason(W, H) {
    txt(this, W/2, 80, '🏆 СЕЗОН КЛАНОВ', 14, '#ffc83c', true).setOrigin(0.5);
    const load = txt(this, W/2, 130, 'Загрузка...', 12, '#a8c4ff').setOrigin(0.5);

    get('/api/clan/season').then(d => {
      load.destroy();
      if (!d.ok) { txt(this, W/2, 130, '❌ Ошибка', 12, '#dc3c46').setOrigin(0.5); return; }
      const season = d.season || {};
      const top = d.top || [];

      // Карточка таймера + награды
      const cardY = 100, cardH = 88;
      const cg = this.add.graphics();
      cg.fillStyle(0x161920, 1); cg.fillRoundedRect(8, cardY, W-16, cardH, 12);
      cg.lineStyle(2, 0xffc83c, 0.8); cg.strokeRoundedRect(8, cardY, W-16, cardH, 12);
      txt(this, 18, cardY+10, '⏱️ ДО КОНЦА СЕЗОНА', 9, '#c8d4f0', true);
      txt(this, 18, cardY+24, this._formatTimeLeft(season.ends_at), 18, '#ffffff', true);
      txt(this, 18, cardY+52, 'НАГРАДЫ ЗА МЕСТО (КАЖДОМУ В КЛАНЕ)', 8, '#c8d4f0', true);
      txt(this, 18, cardY+66, '🥇 500🪙 +5💎   🥈 300🪙 +3💎   🥉 150🪙 +1💎', 10, '#ffd166', true);

      // Топ кланов сезона
      let y = cardY + cardH + 14;
      txt(this, 16, y, 'ТОП СЕЗОНА', 9, '#c8d4f0', true);
      y += 18;
      const EM = { light:{i:'☀️',c:0xffd166}, dark:{i:'🌑',c:0xa06bff}, neutral:{i:'⚖️',c:0x7ec8ff} };
      if (!top.length) {
        txt(this, W/2, y+20, '😔 Никто пока не набрал очков', 12, '#c8d4f0').setOrigin(0.5);
      } else {
        const rowH = 46;
        const maxShow = Math.min(top.length, Math.floor((H - y - 80) / rowH));
        top.slice(0, maxShow).forEach((c, i) => {
          const ry = y + i * rowH;
          const isTop3 = i < 3;
          const em = EM[c.emblem] || EM.neutral;
          const bg = this.add.graphics();
          bg.fillStyle(isTop3 ? 0x2a2010 : 0x141720, 0.92);
          bg.fillRoundedRect(8, ry, W-16, rowH-3, 9);
          bg.lineStyle(isTop3 ? 2 : 1, isTop3 ? 0xffc83c : em.c, isTop3 ? 0.9 : 0.5);
          bg.strokeRoundedRect(8, ry, W-16, rowH-3, 9);
          const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
          txt(this, 16, ry + (rowH-3)/2, medal, isTop3?18:13, '#ffc83c').setOrigin(0, 0.5);
          txt(this, 44, ry + (rowH-3)/2, em.i, 16).setOrigin(0, 0.5);
          const ttr = (s,n)=>s&&s.length>n?s.slice(0,n)+'…':(s||'');
          txt(this, 70, ry+8, `[${c.tag}]`, 10, '#ffc83c', true);
          txt(this, 110, ry+8, ttr(c.name, 14), 13, '#ffffff', true);
          txt(this, 70, ry+25, `👥 ${c.member_count}/20  ·  Ур.${c.level}`, 10, '#c8d4f0');
          txt(this, W-14, ry + (rowH-3)/2, `${c.season_score} оч`, 13, '#ffd166', true).setOrigin(1, 0.5);
        });
      }
    }).catch(() => load.setText('❌ Нет соединения'));

    makeBackBtn(this, '← Назад', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.restart({ sub: 'main' });
    });
  },

});
