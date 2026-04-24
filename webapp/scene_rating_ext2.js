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
      txt(this, W / 2, H / 2, '⏳ Сезон скоро начнётся', 14, '#ddddff').setOrigin(0.5);
      return;
    }

    const startedMs  = new Date(String(season.started_at).replace(' ', 'T')).getTime();
    const endsMs     = startedMs + 14 * 24 * 3600 * 1000;
    const daysLeft   = Math.max(0, Math.ceil((endsMs - Date.now()) / (24 * 3600 * 1000)));
    txt(this, W / 2, startY + 4,  season.name || 'Текущий сезон', 13, '#ffc83c', true).setOrigin(0.5);
    txt(this, W / 2, startY + 20, `⏳ До конца: ${daysLeft} дн.`, 11, '#ccccee').setOrigin(0.5);

    makePanel(this, 8, startY + 30, W - 16, 40, 8, 0.9);
    txt(this, 16, startY + 40, '🎁 Награды сезона:', 11, '#ffc83c', true);
    txt(this, 16, startY + 55, '🥇500💰+200💎  🥈300💰+120💎  🥉200💰+75💎  4-10: 50💰+20💎', 9, '#c0c0e0');

    const listY = startY + 78;
    const rowH  = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 112) / rowH));

    if (!lb.length) {
      txt(this, W / 2, listY + 40, '📭 Никто ещё не сыграл в этом сезоне', 12, '#ddddff').setOrigin(0.5);
    }

    const sRankStyles = [
      { bg: 0x201a08, bd: 0xdaa520, circle: 0xdaa520, cAlpha: 0.45, numCol: '#ffd700' },
      { bg: 0x181c28, bd: 0x7a8aaa, circle: 0x7a8aaa, cAlpha: 0.45, numCol: '#aabbcc' },
      { bg: 0x1c1610, bd: 0x8a6630, circle: 0x8a6630, cAlpha: 0.45, numCol: '#cc9955' },
    ];
    lb.slice(0, maxShow).forEach((p, i) => {
      const ry   = listY + i * rowH;
      const isMe = p.user_id === myUid;
      const rs   = sRankStyles[i];
      const bg   = this.add.graphics();
      if (isMe) {
        bg.fillStyle(0x141828, 0.98);
        bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
        bg.lineStyle(2, C.blue, 0.7);
        bg.strokeRoundedRect(8, ry, W - 16, rowH - 4, 8);
      } else if (rs) {
        bg.fillStyle(rs.bg, 0.95);
        bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
        bg.lineStyle(1.5, rs.bd, 0.7);
        bg.strokeRoundedRect(8, ry, W - 16, rowH - 4, 8);
      } else {
        bg.fillStyle(0x161422, 0.9);
        bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
        bg.lineStyle(1, 0x2a2844, 0.6);
        bg.strokeRoundedRect(8, ry, W - 16, rowH - 4, 8);
      }
      // Ранг-бейдж
      const cx = 24, cy = ry + (rowH - 4) / 2;
      bg.fillStyle(rs ? rs.circle : 0x28243c, rs ? rs.cAlpha : 0.8);
      bg.fillCircle(cx, cy, 13);
      txt(this, cx, cy, `${i + 1}`, 11, rs ? rs.numCol : '#ccccee', true).setOrigin(0.5);
      txt(this, 52,     ry + 10, p.username || `User${p.user_id}`, 13, isMe ? '#5096ff' : '#f0f0fa', isMe);
      txt(this, 52,     ry + 25, `🏆 ${p.wins || 0}П`, 10, '#ddddff');
      txt(this, W - 14, ry + (rowH - 4) / 2, `★ ${p.rating}`, 13, '#ffc83c', true).setOrigin(1, 0.5);
    });

    const myPos = res.my_pos;
    const myStat = res.my_stats;
    if (!myPos || myPos > maxShow) {
      const myBY = H - 108;
      const myBG = this.add.graphics();
      myBG.fillStyle(0x161426, 0.97);
      myBG.fillRoundedRect(10, myBY, W - 20, 44, 10);
      myBG.fillStyle(C.gold, 0.8);
      myBG.fillRect(18, myBY, W - 36, 2);
      myBG.lineStyle(1, 0x2a2844, 0.5);
      myBG.strokeRoundedRect(10, myBY, W - 20, 44, 10);
      txt(this, W / 2, myBY + 14, 'Ваша позиция в сезоне', 10, '#ccccdd').setOrigin(0.5);
      const posLabel = myPos ? `#${myPos}` : 'не в топ';
      const myRating = myStat ? myStat.rating : (State.player?.rating || 1000);
      txt(this, W / 2, myBY + 31, `${posLabel}  ·  ★ ${myRating}`, 14, '#ffc83c', true).setOrigin(0.5);
    }
  },

  _buildPodium(top3, W, y) {
    const order     = [top3[1], top3[0], top3[2]];
    const podH      = [84, 110, 68];
    const medals    = ['🥈', '🥇', '🥉'];
    const podColors = [0x5a6a88, 0xcc9900, 0x7a5533];
    const podBd     = [0x7a8aaa, 0xdaa520, 0x996644];
    const posX      = [W * 0.20, W * 0.50, W * 0.80];
    const myUid     = State.player?.user_id;
    const baseY     = y + 128;
    const colW      = 84;

    // Платформа-база
    const base = this.add.graphics();
    base.fillStyle(0x1a1830, 0.8);
    base.fillRoundedRect(10, baseY, W - 20, 48, 8);

    order.forEach((p, i) => {
      if (!p) return;
      const px   = posX[i];
      const ph   = podH[i];
      const isMe = p.user_id === myUid;
      const pg = this.add.graphics();
      pg.fillStyle(podColors[i], isMe ? 1.0 : 0.9);
      pg.fillRoundedRect(px - colW / 2, baseY - ph, colW, ph, { tl: 10, tr: 10, bl: 0, br: 0 });
      pg.lineStyle(1.5, podBd[i], 0.7);
      pg.strokeRoundedRect(px - colW / 2, baseY - ph, colW, ph, { tl: 10, tr: 10, bl: 0, br: 0 });
      if (isMe) {
        pg.lineStyle(2, C.blue, 0.8);
        pg.strokeRoundedRect(px - colW / 2, baseY - ph, colW, ph, { tl: 10, tr: 10, bl: 0, br: 0 });
      }
      txt(this, px, baseY - ph - 28, medals[i], i === 1 ? 28 : 22).setOrigin(0.5);
      const name = (p.username || 'User').slice(0, 9);
      txt(this, px, baseY - ph - 8, name, 10, isMe ? '#88ccff' : '#f0f0fa', isMe).setOrigin(0.5);
      // Рейтинг и уровень внутри колонки
      txt(this, px, baseY - ph + 18, `★ ${p.rating}`, 13, '#ffc83c', true).setOrigin(0.5);
      txt(this, px, baseY - ph + 34, `Ур.${p.level ?? '—'}`, 9, '#ddddff').setOrigin(0.5);
    });

    // Награды под платформой
    txt(this, W / 2, baseY + 18, '🏆 Победы решают!', 10, '#bbbbcc').setOrigin(0.5);
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
          QuestsScene, SummaryScene, TitanTopScene, ClanScene, ShopScene, NatiskScene,
          WorldBossScene, TasksScene, TasksWeeklyScene, AvatarScene, GuideScene, EquipmentScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
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
    const game = new Phaser.Game(config);
    // В dev-режиме выставляем инстанс на window для ИИ-верификации (scene.start, eval сцен)
    if (window.__DEV_MODE__) window.__game = game;
  } catch(e) {
    console.error('Phaser.Game init error:', e);
    const sub = document.querySelector('#loading-screen .sub');
    if (sub) sub.textContent = '❌ Ошибка запуска. Перезапустите приложение.';
  }
}

function _initTgAndLaunch() {
  // Перечитываем window.Telegram.WebApp — SDK мог загрузиться async после game_globals
  const tgNow = window.Telegram?.WebApp || tg;
  if (tgNow) {
    try { tgNow.ready(); tgNow.expand(); } catch(_) {}
    tgNow.onEvent('viewportChanged', function _onVp() {
      if (tgNow.viewportHeight > 100) {
        tgNow.offEvent('viewportChanged', _onVp);
        _launchPhaser();
      }
    });
    if (tgNow.isExpanded && tgNow.viewportHeight > 100) {
      _launchPhaser();
    } else {
      setTimeout(_launchPhaser, 700);
    }
  } else {
    _launchPhaser();
  }
}

// Если SDK ещё не загрузился — подождём до 1.5с (он async)
if (window.Telegram?.WebApp || tg) {
  _initTgAndLaunch();
} else {
  setTimeout(function() { _initTgAndLaunch(); }, 1500);
}
