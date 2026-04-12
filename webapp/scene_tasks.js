/* ============================================================
   TasksScene — система заданий v2
   Табы: Стрик / Задания / Достижения
   Продолжение: scene_tasks_streak.js, scene_tasks_daily.js,
                scene_tasks_weekly.js, scene_tasks_achieve.js
   ============================================================ */

class TasksScene extends Phaser.Scene {
  constructor() { super('Tasks'); }

  init(data) {
    this._tab     = (data && data.tab)     ? data.tab     : 'streak';
    this._scrollY = (data && data.scrollY) ? data.scrollY : 0;
    this._gen     = (this._gen || 0) + 1; // поколение рендера для защиты от async race
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '📋', 'ЗАДАНИЯ', '');
    _extraBack(this, 'Menu', 'profile');
    this._buildTabBar(W);
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    this._loadData();
  }

  async _loadData() {
    const gen = this._gen;
    try {
      post('/api/tasks/login').catch(() => null);
      // Загружаем статус заданий + квесты (для недельных) параллельно
      const [d, qd] = await Promise.all([
        get('/api/tasks/status'),
        this._tab === 'daily' ? get('/api/quests').catch(() => null) : Promise.resolve(null),
      ]);
      if (gen !== this._gen) return; // сцена уже перезапущена — не рендерим
      this._loading?.destroy(); this._loading = null;
      if (!d?.ok) {
        const reason = d?.reason ? `\n${d.reason}` : '';
        txt(this, this.W/2, this.H/2 - 20, '❌ Ошибка загрузки', 13, '#dc3c46').setOrigin(0.5);
        if (reason) txt(this, this.W/2, this.H/2 + 10, reason, 9, '#ff9999').setOrigin(0.5);
        return;
      }
      this._data = d;
      if (qd?.ok) this._data.oldWeekly = qd.quests || [];
      this._render(d);
    } catch(e) {
      this._loading?.destroy(); this._loading = null;
      txt(this, this.W/2, this.H/2 - 20, '❌ Нет соединения', 13, '#dc3c46').setOrigin(0.5);
      txt(this, this.W/2, this.H/2 + 10, String(e?.message || e), 9, '#ff9999').setOrigin(0.5);
    }
  }

  _buildTabBar(W) {
    const tabs = [
      { key: 'streak',  label: '🗓️ Стрик'    },
      { key: 'daily',   label: '⚡ Задания'   },
      { key: 'achieve', label: '🏆 Достижения'},
    ];
    const tabW = (W - 16) / tabs.length;
    const ty = 76, th = 28;
    this._tabObjs = {};
    tabs.forEach((tab, i) => {
      const tx = 8 + i * tabW;
      const act = this._tab === tab.key;
      const bg = this.add.graphics();
      bg.fillStyle(act ? 0x2a3060 : C.bgPanel, act ? 1 : 0.7);
      bg.fillRoundedRect(tx, ty, tabW - 4, th, 8);
      if (act) { bg.lineStyle(1.5, C.blue, 0.7); bg.strokeRoundedRect(tx, ty, tabW - 4, th, 8); }
      const t = txt(this, tx + (tabW-4)/2, ty + th/2, tab.label, 10,
        act ? '#ffffff' : '#8888aa', act).setOrigin(0.5);
      this._tabObjs[tab.key] = { bg, t };
      this.add.zone(tx, ty, tabW - 4, th).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this._tab === tab.key) return;
          tg?.HapticFeedback?.selectionChanged?.();
          this.scene.restart({ tab: tab.key });
        });
    });
  }

  _render(d) {
    const startY = 112;
    if (this._tab === 'streak')      this._buildStreakTab(d.streak, this.W, this.H, startY);
    else if (this._tab === 'daily')  this._buildDailyTab(d, this.W, this.H, startY);
    else                             this._buildAchieveTab(d.achievements, this.W, this.H, startY);
  }

  /* ── Скролл с инерцией, горизонтальный свайп и тап ─────── */
  /* opts: { onSwipe(dir), onTap(relY, relX), onScroll(scrollY) }  */
  _makeScrollZone(W, H, startY, opts) {
    opts = opts || {};
    const viewH = H - startY - 10;
    const zone = this.add.zone(0, startY, W, viewH).setOrigin(0).setInteractive();
    const container = this.add.container(0, startY);

    let baseY = 0, sx = 0, sy = 0, dragY = 0;
    let vel = 0, lastY = 0, lastT = 0, active = false, hSwipe = false;

    const clamp = y => Math.min(0, Math.max(-(container._contentH || 0) + viewH, y));

    zone.on('pointerdown', p => {
      sx = p.x; sy = p.y; dragY = baseY; vel = 0;
      lastY = p.y; lastT = this.game.loop.now;
      active = true; hSwipe = false;
    });

    zone.on('pointermove', p => {
      if (!active) return;
      const dx = p.x - sx, dy = p.y - sy;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (!hSwipe && adx > 12 && adx > ady * 1.5) { hSwipe = true; }
      if (hSwipe || (ady < 8 && adx < 12)) return;
      const now = this.game.loop.now, dt = now - lastT;
      if (dt > 0) vel = (p.y - lastY) / dt * 16;
      lastY = p.y; lastT = now;
      baseY = clamp(dragY + dy);
      container.setY(startY + baseY);
      if (opts.onScroll) opts.onScroll(-baseY);
    });

    zone.on('pointerup', p => {
      if (!active) return; active = false;
      const dx = p.x - sx, dy = p.y - sy;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (hSwipe || (adx > 30 && adx > ady * 2)) {
        hSwipe = false; vel = 0;
        if (opts.onSwipe) opts.onSwipe(dx < 0 ? 'left' : 'right');
        return;
      }
      if (ady < 20 && opts.onTap) {
        vel = 0;
        opts.onTap(p.y - container.y, p.x);
        return;
      }
      // Инерция продолжается через velocity
    });

    zone.on('pointerout', () => { active = false; });

    this._scrollFn = () => {
      if (Math.abs(vel) < 0.15) { vel = 0; return; }
      baseY = clamp(baseY + vel); vel *= 0.88;
      container.setY(startY + baseY);
      if (opts.onScroll) opts.onScroll(-baseY);
    };

    return {
      container,
      setContentH: h => { container._contentH = h; },
      getScrollY:  () => -baseY,
      scrollTo:    y  => { baseY = clamp(-y); vel = 0; container.setY(startY + baseY); },
    };
  }

  update() { if (this._scrollFn) this._scrollFn(); }

  _toast(msg) {
    const bg = this.add.graphics();
    bg.fillStyle(0x222240, 0.95); bg.fillRoundedRect(20, this.H - 90, this.W - 40, 36, 10);
    const t = txt(this, this.W/2, this.H - 72, msg, 11, '#eeeeff').setOrigin(0.5);
    this.tweens.add({ targets: [bg, t], alpha: 0, delay: 2200, duration: 600,
      onComplete: () => { bg.destroy(); t.destroy(); } });
  }
}
