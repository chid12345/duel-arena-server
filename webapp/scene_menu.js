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
        get('/api/quests').catch(() => null).then(questRes => {
          if (!questRes?.ok) return;
          const q = questRes.quest || {};
          const d = questRes.daily || {};
          const badge = d.can_claim || (q.is_completed && !q.reward_claimed);
          if (badge !== this._questBadge) {
            this._questBadge = badge;
            if (this._tabBarObjs) this._buildTabBar();
          }
        });
        get('/api/version').catch(() => null).then(versionRes => {
          if (versionRes?.ok && versionRes.version) {
            State.appVersion = String(versionRes.version);
            if (this._panels?.more) { this._panels.more.destroy(); this._panels.more = null; }
            this._buildMorePanel();
            if (this._activeTab === 'more') this._switchTab('more');
            else if (this._panels?.more) this._panels.more.setVisible(false);
          }
        });
      } else {
        const playerRes = await post('/api/player');
        if (playerRes.ok) {
          State.player = playerRes.player;
          State.playerLoadedAt = Date.now();
          playerOk = true;

          get('/api/version').catch(() => null).then(versionRes => {
            if (versionRes?.ok && versionRes.version) {
              State.appVersion = String(versionRes.version);
              if (this._panels?.more) { this._panels.more.destroy(); this._panels.more = null; }
              this._buildMorePanel();
              if (this._activeTab === 'more') this._switchTab('more');
              else if (this._panels?.more) this._panels.more.setVisible(false);
            }
          });

          this._questBadge = false;

          get('/api/quests').catch(() => null).then(questRes => {
            if (questRes?.ok) {
              const q = questRes.quest || {};
              const d = questRes.daily || {};
              this._questBadge = d.can_claim || (q.is_completed && !q.reward_claimed);
              if (this._tabBarObjs) this._buildTabBar();
              if (d.can_claim) {
                this.time.delayedCall(800, () =>
                  this._toast(`🎁 Ежедневный бонус доступен! +${d.bonus} 🪙`)
                );
              } else if (q.is_completed && !q.reward_claimed) {
                this.time.delayedCall(800, () =>
                  this._toast('🏆 Квест дня выполнен — забери награду!')
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
    g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
    g.fillRect(0, 0, W, H);
    const starAlpha = C._name === 'light' ? 0.08 : 0.5;
    for (let i = 0; i < 55; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.85);
      this.add.circle(x, y,
        Phaser.Math.FloatBetween(0.4, 1.8),
        C._name === 'light' ? C.blue : 0xffffff,
        Phaser.Math.FloatBetween(0.05, starAlpha));
    }
  }

  _buildTabBar() {
    const { W, H, TAB_H } = this;
    const tabs = [
      { key: 'profile', icon: '🏠', label: 'Профиль' },
      { key: 'battle',  icon: '⚔️',  label: 'Бой'     },
      { key: 'stats',   icon: '🗡️',  label: 'Герой'   },
      { key: 'tasks',   icon: '📋',  label: 'Задания'  },
      { key: 'rating',  icon: '🏆',  label: 'Рейтинг' },
      { key: 'more',    icon: '☰',   label: 'Меню'    },
    ];

    const bg = this.add.graphics();
    const tabBgCol = C._name === 'light' ? 0xe8ecff : 0x0e0d1a;
    bg.fillStyle(tabBgCol, 1);
    bg.fillRect(0, H - TAB_H, W, TAB_H);
    bg.lineStyle(1.5, C.gold, C._name === 'light' ? 0.35 : 0.22);
    bg.lineBetween(0, H - TAB_H, W, H - TAB_H);

    const tabW = W / tabs.length;
    tabs.forEach((tab, i) => {
      const cx = tabW * i + tabW / 2;
      const tabTop = H - TAB_H;

      const activeBg = this.add.graphics();
      activeBg.fillStyle(C.gold, 0.12);
      activeBg.fillRoundedRect(tabW * i + 5, tabTop + 5, tabW - 10, TAB_H - 10, 12);
      const activeBar = this.add.graphics();
      activeBar.fillStyle(C.gold, 1);
      activeBar.fillRoundedRect(tabW * i + tabW * 0.2, tabTop + 1, tabW * 0.6, 3, 2);
      activeBg.setVisible(false);
      activeBar.setVisible(false);

      const iconTxt  = txt(this, cx, tabTop + 22, tab.icon, 20).setOrigin(0.5).setAlpha(0.85);
      const labelTxt = txt(this, cx, tabTop + 52, tab.label, 10, '#ccccee').setOrigin(0.5);

      this._tabBtns[tab.key] = { activeBg, activeBar, iconTxt, labelTxt };

      const zone = this.add.zone(cx, tabTop + TAB_H / 2, tabW, TAB_H).setInteractive({ useHandCursor: true });
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
