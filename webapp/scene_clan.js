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
    // HTML-заглушка перекрывает Phaser canvas сразу, до первой отрисовки сцены.
    // Убирается в конце openMyClan/openNoClan/openChat/_shell, когда готов реальный оверлей.
    const HTML_SUBS = ['main','chat','requests','search','create','top','season','wars','achievements','history'];
    if (HTML_SUBS.includes(this._subview) && !document.getElementById('cl-placeholder')) {
      const ph = document.createElement('div');
      ph.id = 'cl-placeholder';
      const bottom = this._subview === 'chat' ? 0 : 76;
      ph.style.cssText = `position:fixed;top:0;left:${0};right:0;bottom:${bottom}px;z-index:8999;background:radial-gradient(ellipse at 50% 0%,#1a0a2a 0%,#05050a 55%),#000;pointer-events:none`;
      document.body.appendChild(ph);
    }
  }

  shutdown() {
    try { this.tweens.killAll(); } catch(_) {}
    if (this._autoRefreshEvent) { this._autoRefreshEvent.remove(false); this._autoRefreshEvent = null; }
    this._tbScrollOn = false;
    // ClanHTML z-index:9000 перекрывает canvas следующей сцены и глотает все тапы —
    // обязательно закрываем здесь, а не только по кнопке «Назад» внутри оверлея.
    try { window.ClanHTML?.close?.(); } catch(_) {}
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
    document.getElementById('cl-placeholder')?.remove();
  }

  _startAutoRefresh(snapshot) {
    if (this._autoRefreshEvent) { this._autoRefreshEvent.remove(false); this._autoRefreshEvent = null; }
    const sub = this._subview || 'main';
    this._autoRefreshEvent = this.time.addEvent({
      delay: 20000,
      loop: true,
      callback: async () => {
        if (!this.scene?.isActive('Clan')) return;
        try {
          const d = await get('/api/clan');
          if (!d?.ok || !d.clan) return;
          const membersNow = (d.members || []).length;
          const membersBefore = (snapshot.members || []).length;
          const reqNow = d.pending_requests || 0;
          const reqBefore = snapshot.pending_requests || 0;
          const winsNow = d.clan?.wins || 0;
          const winsBefore = snapshot.clan?.wins || 0;
          if (membersNow !== membersBefore || reqNow !== reqBefore || winsNow !== winsBefore) {
            this.scene.restart({ sub });
          }
        } catch(_) {}
      },
    });
  }

  update() { if (this._chatScrollFn) this._chatScrollFn(); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    // Zombie-overlay страховка: закрываем overlay'и предыдущих вкладок
    // (StatsHTML/WardrobeHTML/...), если shutdown не успел их закрыть.
    // Свой ClanHTML откроется ниже — его close здесь не мешает.
    try { window._closeAllTabOverlays?.(); } catch(_) {}
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
    if (this._subview !== 'chat') TabBar.build(this, { activeKey: 'clan' });
    // Рабочая высота для рендеров контента = H минус нижний таббар.
    // В подвиде chat таббара нет — используем полную высоту.
    const H_UI = (this._subview === 'chat') ? H : (H - TabBar.HEIGHT);
    if (this._subview === 'preview' && this._previewClanId) {
      get('/api/clan/preview', { clan_id: this._previewClanId }).then(d => {
        this._loading?.destroy();
        if (!d.ok) { txt(this, W/2, H/2, '❌ '+(d.reason||'Ошибка'), 13, '#dc3c46').setOrigin(0.5); return; }
        this._renderPreview(d, W, H_UI);
      }).catch(() => { this._loading?.setText('❌ Нет соединения'); });
      return;
    }
    if (this._subview === 'season') {
      this._loading?.destroy();
      this._renderSeason(W, H_UI);
      return;
    }
    if (this._subview === 'achievements') {
      this._loading?.destroy();
      this._renderAchievements(W, H_UI);
      return;
    }
    if (this._subview === 'history') {
      this._loading?.destroy();
      this._renderHistory(W, H_UI);
      return;
    }
    if (this._subview === 'wars') {
      this._loading?.destroy();
      this._renderWars(W, H_UI);
      return;
    }
    // Эти подвиды не требуют /api/clan — рендерим HTML-оверлей сразу,
    // чтобы не мелькал "старый дизайн" Phaser на время ожидания сети.
    if (this._subview === 'search') { this._loading?.destroy(); this._renderSearch(W, H_UI); return; }
    if (this._subview === 'create') { this._loading?.destroy(); this._renderCreate(W, H_UI); return; }
    if (this._subview === 'top')    { this._loading?.destroy(); this._renderTop(W, H_UI);    return; }
    get('/api/clan').then(d => {
      // Guard: если пользователь ушёл до ответа API — сцена мертва.
      // Без проверки _route() откроет HTML-оверлей после shutdown() —
      // зомби-оверлей z-index:9000 перекроет все следующие сцены.
      if (!this.scene?.isActive('Clan')) return;
      this._route(d, W, H_UI);
    }).catch(() => {
      if (this.scene?.isActive('Clan')) this._loading?.setText('❌ Нет соединения');
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
        else if (this._subview === 'requests' && data.is_leader) { this._renderRequests(W, H); this._startAutoRefresh(data); }
        else { this._renderMyClan(data, W, H); this._startAutoRefresh(data); }
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
    this.W = W; this.H = H;
    this._loading?.destroy();
    if (window.ClanHTML?.openNoClan) {
      window.ClanHTML.openNoClan(this);
      this.events.once('shutdown', () => { try { window.ClanHTML.close(); } catch(_) {} });
    }
  }
}
