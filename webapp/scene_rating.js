/* ============================================================
   RatingScene — рейтинг: Топ PvP + Башня Титанов + Сезон
   + Phaser config + запуск игры
   ============================================================ */

class RatingScene extends Phaser.Scene {
  constructor() { super('Rating'); }

  init(data) {
    this._tab = (data && data.tab) ? data.tab : (RatingScene._lastTab || 'pvp');
    RatingScene._lastTab = this._tab;
    const now = Date.now();
    if (!RatingScene._cache || (now - (RatingScene._cacheTs || 0)) > 60_000) {
      RatingScene._cache   = {};
      RatingScene._cacheTs = now;
    }
  }

  async create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._alive = true;

    _extraBg(this, W, H);
    _extraHeader(this, W, '🏆', 'РЕЙТИНГ', 'Топ PvP · Башня Титанов · Сезон');
    _extraBack(this, 'Menu', 'profile');

    this._buildTabBar(W);

    if (this._tab === 'pvp') {
      await this._buildPvpTab(W, H);
    } else if (this._tab === 'natisk') {
      this._buildNatiskTab(W, H);
    } else if (this._tab === 'season') {
      await this._buildSeasonTab(W, H);
    } else {
      this._buildTitansTab(W, H);
    }
  }

  shutdown() {
    this._alive = false;
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }

  _buildTabBar(W) {
    const tabs = [
      { key: 'pvp',    label: '👑 Слава'  },
      { key: 'titans', label: '🗿 Башня'  },
      { key: 'natisk', label: '🔥 Натиск' },
      { key: 'season', label: '🌟 Сезон'  },
    ];
    const tw  = (W - 24) / tabs.length;
    const ty  = 76;
    tabs.forEach((tab, i) => {
      const tx     = 12 + i * tw;
      const active = tab.key === this._tab;
      const bg = this.add.graphics();
      bg.fillStyle(active ? C.bgPanel : 0x000000, active ? 0.95 : 0.2);
      bg.fillRoundedRect(tx, ty, tw - 4, 30, 8);
      if (active) {
        bg.lineStyle(1.5, C.gold, 0.6);
        bg.strokeRoundedRect(tx, ty, tw - 4, 30, 8);
      }
      txt(this, tx + (tw - 4) / 2, ty + 15, tab.label, 11,
        active ? '#ffc83c' : '#bbbbcc', active).setOrigin(0.5);
      this.add.zone(tx, ty, tw - 4, 30).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this._tab === tab.key) return;
          tg?.HapticFeedback?.selectionChanged();
          this.scene.restart({ tab: tab.key });
        });
    });
  }

  async _buildPvpTab(W, H) {
    const startY = 114;
    try {
      const res = RatingScene._cache.pvp || (RatingScene._cache.pvp = await get('/api/pvp/top'));
      if (!this._alive) return;
      if (!res.ok) throw new Error('bad');
      const players = res.elo_top || [];
      const myUid   = State.player?.user_id;

      if (players.length >= 3) {
        this._buildPodium(players.slice(0, 3), W, startY);
      }

      const listFrom = Math.min(players.length, 3);
      const listY    = players.length >= 3 ? startY + 136 : startY;
      const rowH     = 44;

      const rankStyles = [
        { bg: 0x201a08, bd: 0xdaa520, circle: 0xdaa520, cAlpha: 0.25, numCol: '#ffd700' },
        { bg: 0x181c28, bd: 0x7a8aaa, circle: 0x7a8aaa, cAlpha: 0.25, numCol: '#aabbcc' },
        { bg: 0x1c1610, bd: 0x8a6630, circle: 0x8a6630, cAlpha: 0.25, numCol: '#cc9955' },
      ];
      players.slice(listFrom, listFrom + 8).forEach((p, i) => {
        const rank = listFrom + i + 1;
        const ry   = listY + i * rowH;
        const isMe = p.user_id === myUid;
        const rs   = rankStyles[rank - 1]; // топ-3 стиль или null
        const rg = this.add.graphics();
        if (isMe) {
          rg.fillStyle(0x141828, 0.98);
          rg.fillRoundedRect(10, ry, W - 20, rowH - 4, 9);
          rg.lineStyle(2, C.blue, 0.7);
          rg.strokeRoundedRect(10, ry, W - 20, rowH - 4, 9);
        } else if (rs) {
          rg.fillStyle(rs.bg, 0.95);
          rg.fillRoundedRect(10, ry, W - 20, rowH - 4, 9);
          rg.lineStyle(1.5, rs.bd, 0.5);
          rg.strokeRoundedRect(10, ry, W - 20, rowH - 4, 9);
        } else {
          rg.fillStyle(0x161422, 0.9);
          rg.fillRoundedRect(10, ry, W - 20, rowH - 4, 9);
          rg.lineStyle(1, 0x2a2844, 0.4);
          rg.strokeRoundedRect(10, ry, W - 20, rowH - 4, 9);
        }
        // Ранг-бейдж в кружке
        const circleX = 28, circleY = ry + (rowH - 4) / 2;
        rg.fillStyle(rs ? rs.circle : 0x28243c, rs ? rs.cAlpha : 0.6);
        rg.fillCircle(circleX, circleY, 13);
        txt(this, circleX, circleY, `${rank}`, 11, rs ? rs.numCol : '#ccccee', true).setOrigin(0.5);
        txt(this, 52, ry + 10, p.username || `User${p.user_id}`, 13, isMe ? '#5096ff' : '#f0f0fa', isMe);
        txt(this, 52, ry + 26, `🏆 ${p.wins || 0}W  💀 ${p.losses || 0}L`, 10, '#ddddff');
        txt(this, W - 14, ry + (rowH - 4) / 2, `★ ${p.rating}`, 14, '#ffc83c', true).setOrigin(1, 0.5);
      });

      if (players.length === 0) {
        txt(this, W / 2, H / 2, '📭 Пока нет PvP-боёв', 14, '#ddddff').setOrigin(0.5);
      }

      const myElo  = State.player?.rating || 1000;
      const myIdx  = players.findIndex(p => p.user_id === myUid);
      const myRank = myIdx >= 0 ? myIdx + 1 : null;
      if (!myRank || myRank > 10) {
        const myBY = H - 108;
        const myBG = this.add.graphics();
        myBG.fillStyle(0x161426, 0.97);
        myBG.fillRoundedRect(10, myBY, W - 20, 44, 10);
        myBG.fillStyle(C.gold, 0.8);
        myBG.fillRect(18, myBY, W - 36, 2);
        myBG.lineStyle(1, 0x2a2844, 0.5);
        myBG.strokeRoundedRect(10, myBY, W - 20, 44, 10);
        txt(this, W / 2, myBY + 14, 'Ваш ELO рейтинг', 10, '#ccccdd').setOrigin(0.5);
        txt(this, W / 2, myBY + 31,
          `${myRank ? '#' + myRank : 'не в топ'}  ·  ★ ${myElo}`, 15, '#ffc83c', true).setOrigin(0.5);
      }
    } catch (e) {
      txt(this, W / 2, H / 2, '❌ Нет соединения', 14, '#ff4455').setOrigin(0.5);
    }
  }
}
