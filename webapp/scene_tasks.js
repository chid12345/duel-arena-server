/* ============================================================
   TasksScene — система заданий v2
   Табы: Стрик / Задания / Достижения
   Продолжение: scene_tasks_streak.js, scene_tasks_daily.js,
                scene_tasks_weekly.js, scene_tasks_achieve.js
   ============================================================ */

class TasksScene extends Phaser.Scene {
  constructor() { super('Tasks'); }

  init(data) {
    this._tab = (data && data.tab) ? data.tab : 'streak';
    this._scrollY = (data && data.scrollY) ? data.scrollY : 0;
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '📋', 'ЗАДАНИЯ', '');
    _extraBack(this);
    this._buildTabBar(W);
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    this._loadData();
  }

  async _loadData() {
    try {
      // Вызов login при каждом открытии (обновляет стрик)
      post('/api/tasks/login').catch(() => null);
      const d = await get('/api/tasks/status');
      this._loading?.destroy(); this._loading = null;
      if (!d?.ok) { txt(this, this.W/2, this.H/2, '❌ Ошибка загрузки', 13, '#dc3c46').setOrigin(0.5); return; }
      this._data = d;
      this._render(d);
    } catch(e) {
      this._loading?.setText('❌ Нет соединения');
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
    if (this._tab === 'streak')  this._buildStreakTab(d.streak, this.W, this.H, startY);
    else if (this._tab === 'daily')  this._buildDailyTab(d, this.W, this.H, startY);
    else                             this._buildAchieveTab(d.achievements, this.W, this.H, startY);
  }

  /* ── Общий скроллируемый контейнер ─────────────────────── */
  _makeScrollZone(W, H, startY) {
    const zone = this.add.zone(0, startY, W, H - startY - 10).setOrigin(0).setInteractive();
    const container = this.add.container(0, startY);
    let baseY = 0, startDrag = 0, dragY = 0;
    zone.on('pointerdown', p => { startDrag = p.y; dragY = baseY; });
    zone.on('pointermove', p => {
      if (!zone._dragging && Math.abs(p.y - startDrag) < 5) return;
      zone._dragging = true;
      baseY = dragY + (p.y - startDrag);
      const maxScroll = -(container._contentH || 0) + (H - startY - 10);
      baseY = Math.min(0, Math.max(maxScroll, baseY));
      container.setY(startY + baseY);
    });
    zone.on('pointerup', () => { zone._dragging = false; });
    return { container, setContentH: h => container._contentH = h };
  }

  _toast(msg) {
    const bg = this.add.graphics();
    bg.fillStyle(0x222240, 0.95); bg.fillRoundedRect(20, this.H - 90, this.W - 40, 36, 10);
    const t = txt(this, this.W/2, this.H - 72, msg, 11, '#eeeeff').setOrigin(0.5);
    this.tweens.add({ targets: [bg, t], alpha: 0, delay: 2200, duration: 600,
      onComplete: () => { bg.destroy(); t.destroy(); } });
  }
}
