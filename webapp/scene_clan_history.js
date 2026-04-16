/* ============================================================
   ClanScene._renderHistory — лента событий клана
   ============================================================ */

const HIST_EVENT_META = {
  join:          { icon: '🚪', text: 'вступил в клан',       col: '#a0e0a0' },
  leave:         { icon: '🚶', text: 'покинул клан',         col: '#a8b4d8' },
  kick:          { icon: '⛔', text: 'исключён',              col: '#c06870' },
  autokick:      { icon: '⏰', text: 'авто-кик (неактив 30д)', col: '#c06870' },
  transfer:      { icon: '👑', text: 'стал лидером',          col: '#ffd166' },
  achievement:   { icon: '🏅', text: 'достижение',            col: '#ffd166' },
  season_reward: { icon: '🏆', text: 'награда сезона',         col: '#ffc83c' },
  level_up:      { icon: '⬆️', text: 'уровень клана повышен', col: '#a8c4ff' },
};

function _formatHistTime(ts) {
  if (!ts) return '';
  try {
    const s = (typeof ts === 'string') ? ts.replace(' ','T').replace('Z','+00:00') : ts;
    const dt = new Date(s);
    const ms = Date.now() - dt.getTime();
    if (ms < 60_000)    return 'только что';
    if (ms < 3600_000)  return Math.floor(ms/60_000) + 'м назад';
    if (ms < 86400_000) return Math.floor(ms/3600_000) + 'ч назад';
    return Math.floor(ms/86400_000) + 'д назад';
  } catch(_) { return ''; }
}

Object.assign(ClanScene.prototype, {

  _renderHistory(W, H) {
    txt(this, W/2, 80, '📜 ИСТОРИЯ КЛАНА', 14, '#ffc83c', true).setOrigin(0.5);
    const load = txt(this, W/2, 130, 'Загрузка...', 12, '#a8c4ff').setOrigin(0.5);

    get('/api/clan/history').then(d => {
      load.destroy();
      if (!d.ok) {
        txt(this, W/2, 130, '❌ '+(d.reason||'Нет клана'), 12, '#dc3c46').setOrigin(0.5);
        return;
      }
      const events = d.events || [];
      if (!events.length) {
        txt(this, W/2, 130, '✨ Событий пока нет', 13, '#a8b4d8').setOrigin(0.5);
        return;
      }
      let y = 110; const rowH = 44;
      const maxShow = Math.min(events.length, Math.floor((H - y - 60) / rowH));
      events.slice(0, maxShow).forEach(ev => {
        const meta = HIST_EVENT_META[ev.event_type] || { icon:'•', text: ev.event_type, col:'#a8b4d8' };
        const bg = this.add.graphics();
        bg.fillStyle(0x141720, 0.95); bg.fillRoundedRect(8, y, W-16, rowH-3, 8);
        bg.lineStyle(1, 0x1e2230, 0.8); bg.strokeRoundedRect(8, y, W-16, rowH-3, 8);
        txt(this, 18, y + (rowH-3)/2, meta.icon, 16).setOrigin(0, 0.5);
        const who = (ev.actor_name || (ev.actor_id ? `User${ev.actor_id}` : '')).slice(0, 14);
        const line = who ? `${who} — ${meta.text}` : meta.text;
        txt(this, 44, y + 8, line, 12, meta.col, true);
        const extra = (ev.extra || '').slice(0, 28);
        if (extra) txt(this, 44, y + 24, extra, 9, '#a8b4d8');
        txt(this, W-14, y + (rowH-3)/2, _formatHistTime(ev.created_at), 9, '#666b80').setOrigin(1, 0.5);
        y += rowH;
      });
    }).catch(() => load.setText('❌ Нет соединения'));

    makeBackBtn(this, '← Назад', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.restart({ sub: 'main' });
    });
  },

});
