/* ============================================================
   RatingScene — ext2: _buildSeasonTab, _renderSeason,
                       _buildPodium
   + Phaser config + запуск
   ============================================================ */

Object.assign(RatingScene.prototype, {

  async _buildSeasonTab(W, H) {
    const startY = 114;
    try {
      const res = RatingScene._cache.season || (RatingScene._cache.season = await get('/api/season'));
      if (!this._alive) return;
      if (!res.ok) throw new Error('bad');
      this._renderSeason(res, W, H, startY);
    } catch (e) {
      txt(this, W / 2, H / 2, '❌ Нет соединения', 14, '#ff4455').setOrigin(0.5);
    }
  },

  _renderSeason(res, W, H, startY) {
    const season = res.season;
    const lb     = res.leaderboard || [];
    const myUid  = State.player?.user_id;

    if (!season) {
      txt(this, W / 2, H / 2, '⏳ Сезон скоро начнётся', 14, '#9999bb').setOrigin(0.5);
      return;
    }

    const startedMs  = new Date(String(season.started_at).replace(' ', 'T')).getTime();
    const endsMs     = startedMs + 14 * 24 * 3600 * 1000;
    const daysLeft   = Math.max(0, Math.ceil((endsMs - Date.now()) / (24 * 3600 * 1000)));
    txt(this, W / 2, startY + 4,  season.name || 'Текущий сезон', 13, '#ffc83c', true).setOrigin(0.5);
    txt(this, W / 2, startY + 20, `⏳ До конца: ${daysLeft} дн.`, 11, '#8888aa').setOrigin(0.5);

    makePanel(this, 8, startY + 30, W - 16, 40, 8, 0.9);
    txt(this, 16, startY + 40, '🎁 Награды сезона:', 11, '#ffc83c', true);
    txt(this, 16, startY + 55, '🥇500💰+200💎  🥈300💰+120💎  🥉200💰+75💎  4-10: 50💰+20💎', 9, '#c0c0e0');

    const listY = startY + 78;
    const rowH  = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 112) / rowH));

    if (!lb.length) {
      txt(this, W / 2, listY + 40, '📭 Никто ещё не сыграл в этом сезоне', 12, '#9999bb').setOrigin(0.5);
    }

    lb.slice(0, maxShow).forEach((p, i) => {
      const ry   = listY + i * rowH;
      const isMe = p.user_id === myUid;
      const bg   = this.add.graphics();
      bg.fillStyle(isMe ? 0x1e2840 : C.bgPanel, isMe ? 0.98 : 0.82);
      bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
      if (isMe) { bg.lineStyle(1.5, C.blue, 0.7); bg.strokeRoundedRect(8, ry, W - 16, rowH - 4, 8); }
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      txt(this, 20,     ry + (rowH - 4) / 2, medal, i < 3 ? 15 : 11, '#ffc83c').setOrigin(0, 0.5);
      txt(this, 52,     ry + 10, p.username || `User${p.user_id}`, 13, isMe ? '#5096ff' : '#f0f0fa', isMe);
      txt(this, 52,     ry + 25, `🏆 ${p.wins || 0}П`, 10, '#9999bb');
      txt(this, W - 14, ry + (rowH - 4) / 2, `★ ${p.rating}`, 13, '#ffc83c', true).setOrigin(1, 0.5);
    });

    const myPos = res.my_pos;
    const myStat = res.my_stats;
    if (!myPos || myPos > maxShow) {
      const myBY = H - 108;
      const myBG = this.add.graphics();
      myBG.fillStyle(0x1a2030, 0.97);
      myBG.fillRoundedRect(10, myBY, W - 20, 44, 10);
      myBG.lineStyle(1.5, C.gold, 0.5);
      myBG.strokeRoundedRect(10, myBY, W - 20, 44, 10);
      txt(this, W / 2, myBY + 12, 'Ваша позиция в сезоне', 10, '#888899').setOrigin(0.5);
      const posLabel = myPos ? `#${myPos}` : 'не в топ';
      const myRating = myStat ? myStat.rating : (State.player?.rating || 1000);
      txt(this, W / 2, myBY + 30, `${posLabel}  ·  ★ ${myRating}`, 14, '#ffc83c', true).setOrigin(0.5);
    }
  },

  _buildPodium(top3, W, y) {
    const order     = [top3[1], top3[0], top3[2]];
    const podH      = [80, 104, 64];
    const medals    = ['🥈', '🥇', '🥉'];
    const podColors = [0x666688, 0xcc9900, 0x885533];
    const posX      = [W * 0.20, W * 0.50, W * 0.80];
    const myUid     = State.player?.user_id;
    const baseY     = y + 128;

    order.forEach((p, i) => {
      if (!p) return;
      const px   = posX[i];
      const ph   = podH[i];
      const isMe = p.user_id === myUid;
      const pg = this.add.graphics();
      pg.fillStyle(podColors[i], isMe ? 1 : 0.75);
      pg.fillRoundedRect(px - 38, baseY - ph, 76, ph, 6);
      if (isMe) { pg.lineStyle(2, C.blue, 0.8); pg.strokeRoundedRect(px - 38, baseY - ph, 76, ph, 6); }
      txt(this, px, baseY - ph - 28, medals[i], 24).setOrigin(0.5);
      const name = (p.username || 'User').slice(0, 9);
      txt(this, px, baseY - ph - 10, name, 10, isMe ? '#88ccff' : '#f0f0fa', isMe).setOrigin(0.5);
      txt(this, px, baseY + 12, `★ ${p.rating}`, 13, '#ffc83c', true).setOrigin(0.5);
      txt(this, px, baseY + 30, `Ур.${p.level}`, 10, '#8888aa').setOrigin(0.5);
    });
  }

});

/* ═══════════════════════════════════════════════════════════
   ЗАПУСК PHASER
   ═══════════════════════════════════════════════════════════ */
const config = {
  type: Phaser.AUTO,
  backgroundColor: C._name === 'light' ? '#f0f2ff' : '#12121c',
  parent: document.body,
  scene: [BootScene, MenuScene, BattleScene, ResultScene, RatingScene, StatsScene, QueueScene,
          QuestsScene, SummaryScene, TitanTopScene, BattlePassScene, ClanScene, ShopScene, NatiskScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 700,
  },
  dom: { createContainer: false },
  render: {
    antialias: true,
    pixelArt: false,
  },
};

let _gameStarted = false;

function _launchPhaser() {
  if (_gameStarted) return;
  _gameStarted = true;
  try {
    new Phaser.Game(config);
  } catch(e) {
    console.error('Phaser.Game init error:', e);
    const sub = document.querySelector('#loading-screen .sub');
    if (sub) sub.textContent = '❌ Ошибка запуска. Перезапустите приложение.';
  }
}

if (tg) {
  tg.ready();
  tg.expand();

  tg.onEvent('viewportChanged', function _onVp() {
    if (tg.viewportHeight > 100) {
      tg.offEvent('viewportChanged', _onVp);
      _launchPhaser();
    }
  });

  if (tg.isExpanded && tg.viewportHeight > 100) {
    _launchPhaser();
  } else {
    setTimeout(_launchPhaser, 700);
  }
} else {
  _launchPhaser();
}
