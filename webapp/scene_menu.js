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
            this._updateProfileTasksBadge?.();
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
              this._updateProfileTasksBadge?.();
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
    g.fillGradientStyle(0x0d0820, 0x0d0820, 0x060412, 0x060412, 1);
    g.fillRect(0, 0, W, H);
    // Атмосферное фиолетовое свечение сверху
    const glow = this.add.graphics();
    glow.fillStyle(0x3b0d8f, 0.18);
    glow.fillEllipse(W / 2, 0, W * 1.4, 260);
    // Звёзды
    for (let i = 0; i < 55; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.75);
      const r = Phaser.Math.FloatBetween(0.4, 1.6);
      const a = Phaser.Math.FloatBetween(0.08, 0.5);
      const star = this.add.circle(x, y, r, 0xffffff, a);
      this.tweens.add({
        targets: star, alpha: a * 3, duration: Phaser.Math.Between(1500, 4000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 3000),
      });
    }
  }

  _buildTabBar() {
    if (this._tabBarObjs) {
      this._tabBarObjs.forEach(o => { try { o.destroy(); } catch(_) {} });
    }
    this._tabBarObjs = [];
    const _t = (o) => { this._tabBarObjs.push(o); return o; };

    const { W, H, TAB_H } = this;
    const tabs = [
      { key: 'profile', label: 'Профиль', icon: 'profile' },
      { key: 'clan',    label: 'Клан',    icon: 'clan'    },
      { key: 'stats',   label: 'Герой',   icon: 'stats'   },
      { key: 'boss',    label: 'Босс',    icon: 'boss'    },
      { key: 'rating',  label: 'Рейтинг', icon: 'rating'  },
      { key: 'more',    label: 'Меню',    icon: 'more'    },
    ];
    const tabW = W / tabs.length;
    const tabTop = H - TAB_H;

    const bg = _t(this.add.graphics());
    bg.fillStyle(0x080618, 1);
    bg.fillRect(0, tabTop, W, TAB_H);
    bg.lineStyle(1, 0x2a2050, 0.8);
    bg.lineBetween(0, tabTop, W, tabTop);

    tabs.forEach((tab, i) => {
      const cx = tabW * i + tabW / 2;
      const iy = tabTop + 27;

      const activeBg = _t(this.add.graphics());
      activeBg.fillStyle(0x7c3aed, 0.1);
      activeBg.fillRoundedRect(tabW*i+4, tabTop+4, tabW-8, TAB_H-8, 10);
      activeBg.setVisible(false);

      // 3-layer neon bar at top edge
      const glowBar = _t(this.add.graphics());
      glowBar.fillStyle(0x7c3aed, 0.2); glowBar.fillRect(tabW*i+4,  tabTop,   tabW-8,  5);
      glowBar.fillStyle(0xa855f7, 0.5); glowBar.fillRect(tabW*i+6,  tabTop,   tabW-12, 3);
      glowBar.fillStyle(0xddd6fe, 1);   glowBar.fillRect(tabW*i+8,  tabTop,   tabW-16, 2);
      glowBar.setVisible(false);

      // Glow halo behind icon on press
      const pressGlow = _t(this.add.graphics());
      pressGlow.fillStyle(0x7c3aed, 0.18); pressGlow.fillCircle(cx, iy, 22);
      pressGlow.fillStyle(0x9b5de5, 0.09); pressGlow.fillCircle(cx, iy, 28);
      pressGlow.setVisible(false);

      // Icon in container for scale tween
      const iconG = this.add.graphics();
      TAB_ICONS[tab.icon](iconG, 0, 0, 0x5a5a90, 1.5);
      const iconContainer = _t(this.add.container(cx, iy, [iconG]));

      const labelTxt = _t(txt(this, cx, tabTop+55, tab.label, 10, '#4a4a78').setOrigin(0.5));

      this._tabBtns[tab.key] = { activeBg, glowBar, pressGlow, iconContainer, iconG, labelTxt, iconName: tab.icon };

      const zone = _t(this.add.zone(cx, tabTop+TAB_H/2, tabW, TAB_H).setInteractive({ useHandCursor: true }));

      zone.on('pointerdown', () => {
        pressGlow.setVisible(true);
        iconG.clear(); TAB_ICONS[tab.icon](iconG, 0, 0, 0xc4b5fd, 2.2);
        this.tweens.killTweensOf(iconContainer);
        this.tweens.add({ targets: iconContainer, scaleX: 1.32, scaleY: 1.32, duration: 85, ease: 'Back.easeOut' });
      });
      zone.on('pointerout', () => {
        pressGlow.setVisible(false);
        this.tweens.killTweensOf(iconContainer);
        this.tweens.add({ targets: iconContainer, scaleX: 1, scaleY: 1, duration: 130, ease: 'Sine.easeOut' });
        const isActive = this._activeTab === tab.key;
        iconG.clear(); TAB_ICONS[tab.icon](iconG, 0, 0, isActive ? 0xffffff : 0x5a5a90, isActive ? 2 : 1.5);
      });
      zone.on('pointerup', () => {
        pressGlow.setVisible(false);
        this.tweens.killTweensOf(iconContainer);
        this.tweens.add({ targets: iconContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
        Sound.tab(); tg?.HapticFeedback?.selectionChanged();
        if (tab.key === 'stats')  { this.scene.start('Stats', { player: State.player }); return; }
        if (tab.key === 'clan')   { this.scene.start('Clan'); return; }
        if (tab.key === 'boss')   { this.scene.start('WorldBoss'); return; }
        if (tab.key === 'rating') { this.scene.start('Rating'); return; }
        if (tab.key === 'tasks')  { this.scene.start('Tasks'); return; }
        this._switchTab(tab.key);
      });
    });
  }

}
