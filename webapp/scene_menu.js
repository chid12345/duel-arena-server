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
    // Фоновая подгрузка PNG экипировки (~50 МБ) — не блокирует UI.
    // До завершения слот рендерится emoji-фолбэком (см. _drawEqSlot).
    this._lazyLoadEquipmentTextures?.();
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
            const newV = String(versionRes.version);
            if (newV !== State.appVersion) {
              State.appVersion = newV;
              if (this._verTxt?.active) this._verTxt.setText(`⚔️  Duel Arena  v${newV}`);
            }
          }
        });
      } else {
        const playerRes = await post('/api/player');
        if (playerRes.ok) {
          State.player = playerRes.player;
          State.equipment = playerRes.equipment || {};
          State.ownedWeapons = playerRes.owned_weapons || [];
          State.playerLoadedAt = Date.now();
          playerOk = true;

          get('/api/version').catch(() => null).then(versionRes => {
            if (versionRes?.ok && versionRes.version) {
              const newV = String(versionRes.version);
              if (newV !== State.appVersion) {
                State.appVersion = newV;
                if (this._verTxt?.active) this._verTxt.setText(`⚔️  Duel Arena  v${newV}`);
              }
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
    try { g.setScrollFactor?.(0); } catch(_) {}
    // Атмосферное фиолетовое свечение сверху
    const glow = this.add.graphics();
    glow.fillStyle(0x3b0d8f, 0.18);
    glow.fillEllipse(W / 2, 0, W * 1.4, 260);
    try { glow.setScrollFactor?.(0); } catch(_) {}
    // Звёзды
    for (let i = 0; i < 55; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.75);
      const r = Phaser.Math.FloatBetween(0.4, 1.6);
      const a = Phaser.Math.FloatBetween(0.08, 0.5);
      const star = this.add.circle(x, y, r, 0xffffff, a);
      try { star.setScrollFactor?.(0); } catch(_) {}
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
    const { objs, btns } = TabBar.build(this, {
      activeKey: this._activeTab,
      depth: 0,
      onInternal: (key) => this._switchTab(key),
    });
    this._tabBarObjs = objs;
    this._tabBtns = btns;
  }

}
