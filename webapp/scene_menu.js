/* ============================================================
   MenuScene — главный экран
   Продолжение: scene_menu_ext1.js, scene_menu_ext2.js, scene_menu_ext3.js,
                scene_menu_ext6.js
   ============================================================ */

class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(data) {
    this._returnTab = (data && data.returnTab) ? data.returnTab : null;
  }

  async create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this.TAB_H = 76;
    this.CONTENT_H = H - this.TAB_H;
    this._panels = {};
    this._tabBtns = {};
    this._activeTab = null;

    this._drawBg(W, H);
    this._loadPlayer();
  }

  async _loadPlayer() {
    const { W, H } = this;

    if (!State.initData) {
      let waited = 0;
      while (!State.initData && waited < 2000) {
        await new Promise(r => setTimeout(r, 200));
        State.initData = window.Telegram?.WebApp?.initData || '';
        waited += 200;
      }
    }

    const _PROFILE_TTL = 30000;
    const cached = State.player && (Date.now() - State.playerLoadedAt) < _PROFILE_TTL;

    try {
      let playerOk = false;

      if (cached) {
        playerOk = true;
        get('/api/tasks/status').catch(() => null).then(taskRes => {
          if (!taskRes?.ok) return;
          const cnt = taskRes.claimable_count || 0;
          if (cnt !== this._tasksBadgeCount) {
            this._tasksBadgeCount = cnt;
            if (this._tabBarObjs) this._buildTabBar();
          }
        });
        get('/api/version').catch(() => null).then(versionRes => {
          if (versionRes?.ok && versionRes.version) {
            State.appVersion = String(versionRes.version);
            if (this._panels?.more) { this._panels.more.destroy(); this._panels.more = null; }
            this._buildMorePanel();
            if (this._activeTab === 'more') this._switchTab('more');
            else if (this._panels?.more) this.sys.displayList.remove(this._panels.more);
          }
        });
      } else {
        const playerRes = await post('/api/player');
        if (playerRes.ok) {
          State.player = playerRes.player;
          State.equipment = playerRes.equipment || {};
          State.playerLoadedAt = Date.now();
          playerOk = true;

          get('/api/version').catch(() => null).then(versionRes => {
            if (versionRes?.ok && versionRes.version) {
              State.appVersion = String(versionRes.version);
              if (this._panels?.more) { this._panels.more.destroy(); this._panels.more = null; }
              this._buildMorePanel();
              if (this._activeTab === 'more') this._switchTab('more');
              else if (this._panels?.more) this.sys.displayList.remove(this._panels.more);
            }
          });

          this._tasksBadgeCount = 0;

          get('/api/tasks/status').catch(() => null).then(taskRes => {
            if (taskRes?.ok) {
              const cnt = taskRes.claimable_count || 0;
              this._tasksBadgeCount = cnt;
              if (this._tabBarObjs) this._buildTabBar();
              if (cnt > 0) {
                this.time.delayedCall(800, () =>
                  this._toast(`📋 Есть награды в Заданиях! (${cnt})`)
                );
              }
            }
          });
        }
      }

      if (playerOk) {
        try {
          this._buildTabBar();
          this._buildProfilePanel();
          this._buildBattlePanel();
          this._buildMorePanel();
          this._switchTab(this._returnTab || 'profile');
          this._setupWS();
          this._startRegenTick();
          this._loadDailyBonusCard();
        } catch(buildErr) {
          console.error('UI build error:', buildErr);
          this._showError('Ошибка UI: ' + (buildErr?.message || buildErr));
        }
      } else {
        const code = playerRes?._httpStatus || playerRes?.detail || '';
        this._showError(code === 401 ? 'Открой через Telegram' : 'Ошибка сервера');
      }
    } catch(e) {
      const msg = e?.name === 'AbortError' ? 'Сервер не отвечает (таймаут)' : 'Нет соединения';
      this._showError(msg);
    }
  }

  _drawBg(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(0xf2f4fb, 0xf2f4fb, 0xe8eaf5, 0xe8eaf5, 1);
    g.fillRect(0, 0, W, H);
  }

  _buildTabBar() {
    // Уничтожить старые элементы таб-бара при перерисовке
    if (this._tabBarObjs) {
      this._tabBarObjs.forEach(o => { try { o.destroy(); } catch(_) {} });
    }
    this._tabBarObjs = [];
    const _track = (o) => { this._tabBarObjs.push(o); return o; };

    const { W, H, TAB_H } = this;
    const tabs = [
      { key: 'profile', icon: '🏠', label: 'Профиль' },
      { key: 'battle',  icon: '⚔️',  label: 'Бой'     },
      { key: 'stats',   icon: '🗡️',  label: 'Герой'   },
      { key: 'tasks',   icon: '📋',  label: 'Задания'  },
      { key: 'rating',  icon: '🏆',  label: 'Рейтинг' },
      { key: 'more',    icon: '☰',   label: 'Меню'    },
    ];

    const bg = _track(this.add.graphics());
    bg.fillStyle(0xffffff, 1);
    bg.fillRect(0, H - TAB_H, W, TAB_H);
    bg.lineStyle(1, 0xdde0f0, 1);
    bg.lineBetween(0, H - TAB_H, W, H - TAB_H);

    const tabW = W / tabs.length;
    tabs.forEach((tab, i) => {
      const cx = tabW * i + tabW / 2;
      const tabTop = H - TAB_H;

      const activeBg = _track(this.add.graphics());
      activeBg.fillStyle(0x4f8ef7, 0.1);
      activeBg.fillRoundedRect(tabW * i + 5, tabTop + 5, tabW - 10, TAB_H - 10, 12);
      const activeBar = _track(this.add.graphics());
      activeBar.fillStyle(0x4f8ef7, 1);
      activeBar.fillRoundedRect(tabW * i + tabW * 0.2, tabTop + 1, tabW * 0.6, 3, 2);
      activeBg.setVisible(false);
      activeBar.setVisible(false);

      const iconTxt  = _track(txt(this, cx, tabTop + 22, tab.icon, 20).setOrigin(0.5).setAlpha(0.7));
      const labelTxt = _track(txt(this, cx, tabTop + 52, tab.label, 10, '#9090b0').setOrigin(0.5));

      // Красный бейдж с числом незабранных наград на табе Задания
      if (tab.key === 'tasks' && this._tasksBadgeCount > 0) {
        const bx = cx + 11, by = tabTop + 12;
        const bdgBg = _track(this.add.graphics());
        bdgBg.fillStyle(0xe03030, 1);
        bdgBg.fillCircle(bx, by, 8);
        _track(txt(this, bx, by, String(this._tasksBadgeCount), 9, '#ffffff', true).setOrigin(0.5));
      }

      this._tabBtns[tab.key] = { activeBg, activeBar, iconTxt, labelTxt };

      const zone = _track(this.add.zone(cx, tabTop + TAB_H / 2, tabW, TAB_H).setInteractive({ useHandCursor: true }));
      zone.on('pointerup', () => {
        Sound.tab();
        tg?.HapticFeedback?.selectionChanged();
        if (tab.key === 'stats')  { this.scene.start('Stats',  { player: State.player }); return; }
        if (tab.key === 'rating') { this.scene.start('Rating'); return; }
        if (tab.key === 'tasks')  { this.scene.start('Tasks'); return; }
        this._switchTab(tab.key);
      });
    });
  }

}
