/* ============================================================
   ClanScene — база клановой сцены
   Рендер моего клана: scene_clan_myclan.js
   ============================================================ */

class ClanScene extends Phaser.Scene {
  constructor() { super('Clan'); }

  init(data) {
    this._subview = (data && data.sub) ? data.sub : 'main';
    this._previewClanId = (data && data.clanId) ? data.clanId : null;
    this._busy = false;
  }

  shutdown() {
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }

  update() { if (this._chatScrollFn) this._chatScrollFn(); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    if (this._subview !== 'chat') {
      _extraHeader(this, W, '⚔️', 'КЛАН', 'Кланы · Поиск · Рейтинг');
      if (this._subview === 'main') {
        _extraBack(this, 'Menu', 'more');
      } else {
        makeBackBtn(this, 'Назад', () => {
          tg?.HapticFeedback?.impactOccurred('light');
          this.scene.restart({ sub: 'main' });
        });
      }
    }
    this._loading = txt(this, W / 2, H / 2, 'Загрузка...', 14, '#ddddff').setOrigin(0.5);
    if (this._subview === 'preview' && this._previewClanId) {
      get('/api/clan/preview', { clan_id: this._previewClanId }).then(d => {
        this._loading?.destroy();
        if (!d.ok) { txt(this, W/2, H/2, '❌ '+(d.reason||'Ошибка'), 13, '#dc3c46').setOrigin(0.5); return; }
        this._renderPreview(d, W, H);
      }).catch(() => { this._loading?.setText('❌ Нет соединения'); });
      return;
    }
    if (this._subview === 'season') {
      this._loading?.destroy();
      this._renderSeason(W, H);
      return;
    }
    if (this._subview === 'achievements') {
      this._loading?.destroy();
      this._renderAchievements(W, H);
      return;
    }
    if (this._subview === 'history') {
      this._loading?.destroy();
      this._renderHistory(W, H);
      return;
    }
    if (this._subview === 'wars') {
      this._loading?.destroy();
      this._renderWars(W, H);
      return;
    }
    get('/api/clan').then(d => this._route(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _route(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) {
      txt(this, W / 2, H / 2 - 10, '❌ Ошибка загрузки', 14, '#dc3c46').setOrigin(0.5);
      txt(this, W / 2, H / 2 + 14, data.reason || 'Попробуйте позже', 11, '#ddddff').setOrigin(0.5);
      return;
    }
    try {
      if (data.clan) {
        if (this._subview === 'chat') this._renderChat(data, W, H);
        else this._renderMyClan(data, W, H);
      } else if (this._subview === 'search') {
        this._renderSearch(W, H);
      } else if (this._subview === 'create') {
        this._renderCreate(W, H);
      } else if (this._subview === 'top') {
        this._renderTop(W, H);
      } else if (this._subview === 'requests') {
        if (data.is_leader) this._renderRequests(W, H);
        else this._renderMyClan(data, W, H);
      } else {
        this._renderNoClan(W, H);
      }
    } catch (e) {
      console.error('ClanScene render error:', e);
      txt(this, W / 2, H / 2, '⚠️ Ошибка: ' + e.message, 11, '#dc3c46').setOrigin(0.5);
    }
  }

  _renderNoClan(W, H) {
    const iconS = 64, iconX = W / 2 - iconS / 2, iconY = 86;
    const iconG = this.add.graphics();
    iconG.fillStyle(0x141720, 1);
    iconG.fillRoundedRect(iconX, iconY, iconS, iconS, 18);
    iconG.lineStyle(1, 0x1e2230, 0.9);
    iconG.strokeRoundedRect(iconX, iconY, iconS, iconS, 18);
    txt(this, W / 2, iconY + iconS / 2, '🏰', 32).setOrigin(0.5);

    txt(this, W / 2, 165, 'Вы не в клане', 14, '#e8ecff', true).setOrigin(0.5);
    txt(this, W / 2, 184, 'Вступайте и участвуйте в клановых войнах', 11, '#3a4060').setOrigin(0.5);

    const btns = [
      { label: 'Найти клан', bgCol: 0x1a2050, border: 0x2a3460, textCol: '#a8c4ff', sub: 'search', dot: 0x5080ff },
      { label: '＋ Создать клан', bgCol: 0x1e1040, border: 0x2a1e50, textCol: '#c8a0ff', sub: 'create' },
      { label: '🏆 Топ кланов', bgCol: 0x141720, border: 0x252a38, textCol: '#ffc83c', sub: 'top' },
      { label: '🏆 Сезон (7 дней)', bgCol: 0x2a2010, border: 0xffc83c, textCol: '#ffd166', sub: 'season' },
    ];
    btns.forEach((b, i) => {
      const by = 204 + i * 54, bh = 46;
      const bg = this.add.graphics();
      bg.fillStyle(b.bgCol, 0.95);
      bg.fillRoundedRect(16, by, W - 32, bh, 10);
      bg.lineStyle(1, b.border, 0.85);
      bg.strokeRoundedRect(16, by, W - 32, bh, 10);
      if (b.dot) {
        bg.fillStyle(b.dot, 1);
        bg.fillCircle(W / 2 - 52, by + bh / 2, 4);
      }
      txt(this, W / 2, by + bh / 2, b.label, 13, b.textCol, true).setOrigin(0.5);
      this.add.zone(16, by, W - 32, bh).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x0a0e18, 1); bg.fillRoundedRect(16, by, W - 32, bh, 10); tg?.HapticFeedback?.impactOccurred('light'); })
        .on('pointerout', () => { bg.clear(); bg.fillStyle(b.bgCol, 0.95); bg.fillRoundedRect(16, by, W - 32, bh, 10); bg.lineStyle(1, b.border, 0.85); bg.strokeRoundedRect(16, by, W - 32, bh, 10); })
        .on('pointerup', () => this.scene.restart({ sub: b.sub }));
    });
    txt(this, W / 2, 204 + 4 * 54 + 8, 'Создание клана стоит 800 🪙', 10, '#a8b4d8').setOrigin(0.5);
  }
}
