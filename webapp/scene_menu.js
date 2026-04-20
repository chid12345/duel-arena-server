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
    // Палитра: каждая вкладка — свой неоновый цвет
    const tabs = [
      { key:'profile', label:'Профиль', icon:'profile', col:0x22d3ee },
      { key:'clan',    label:'Клан',    icon:'clan',    col:0xfb7185 },
      { key:'stats',   label:'Герой',   icon:'stats',   col:0x818cf8 },
      { key:'boss',    label:'Босс',    icon:'boss',    col:0xfb923c },
      { key:'rating',  label:'Рейтинг', icon:'rating',  col:0xfbbf24 },
      { key:'more',    label:'Меню',    icon:'more',    col:0xa78bfa },
    ];
    const tabW = W / tabs.length;
    const tabTop = H - TAB_H;

    // === Glassmorphism панель ===
    const panel = _t(this.add.graphics());
    panel.fillStyle(0x07041a, 0.96);
    panel.fillRect(0, tabTop, W, TAB_H);
    // Внутренний отблеск стекла сверху
    panel.fillGradientStyle(0x6d28d9,0x6d28d9,0x07041a,0x07041a, 0.14,0.14,0,0);
    panel.fillRect(0, tabTop, W, 18);
    // Бликовая линия (стекло)
    panel.lineStyle(1, 0xffffff, 0.1);
    panel.lineBetween(0, tabTop, W, tabTop);
    // Неоновая фиолетовая линия под бликом
    panel.lineStyle(1, 0x7c3aed, 0.5);
    panel.lineBetween(0, tabTop+1, W, tabTop+1);

    tabs.forEach((tab, i) => {
      const cx = tabW * i + tabW / 2;
      const iy = tabTop + 25;
      const hexCol = '#' + tab.col.toString(16).padStart(6,'0');

      // Активный пузырь (цвет вкладки)
      const activeBubble = _t(this.add.graphics());
      activeBubble.fillStyle(tab.col, 0.07); activeBubble.fillCircle(cx, iy, 26);
      activeBubble.fillStyle(tab.col, 0.13); activeBubble.fillCircle(cx, iy, 18);
      activeBubble.fillStyle(tab.col, 0.17);
      activeBubble.fillRoundedRect(tabW*i+4, tabTop+3, tabW-8, TAB_H-7, 12);
      activeBubble.lineStyle(1, tab.col, 0.4);
      activeBubble.strokeRoundedRect(tabW*i+4, tabTop+3, tabW-8, TAB_H-7, 12);
      // Нeon-бар сверху (3 слоя)
      activeBubble.fillStyle(tab.col, 0.22); activeBubble.fillRect(tabW*i+5, tabTop, tabW-10, 5);
      activeBubble.fillStyle(tab.col, 0.55); activeBubble.fillRect(tabW*i+7, tabTop, tabW-14, 3);
      activeBubble.fillStyle(0xffffff,  0.8); activeBubble.fillRect(tabW*i+9, tabTop, tabW-18, 1);
      activeBubble.setVisible(false);

      // Иконка в контейнере (для scale-tween)
      const iconG = this.add.graphics();
      TAB_ICONS[tab.icon](iconG, 0, 0, 0x2e2b50, 1.5);
      const iconContainer = _t(this.add.container(cx, iy, [iconG]));

      const labelTxt = _t(txt(this, cx, tabTop+56, tab.label, 9, '#2e2b50').setOrigin(0.5));

      this._tabBtns[tab.key] = { activeBubble, iconContainer, iconG, labelTxt, iconName: tab.icon, tabCol: tab.col, hexCol };

      const zone = _t(this.add.zone(cx, tabTop+TAB_H/2, tabW, TAB_H).setInteractive({ useHandCursor: true }));

      zone.on('pointerdown', () => {
        // Ripple-эффект
        const rg = this.add.graphics();
        rg.fillStyle(tab.col, 0.35); rg.fillCircle(0, 0, 12);
        const ripple = this.add.container(cx, iy, [rg]);
        this.tweens.add({ targets: ripple, scaleX: 3.6, scaleY: 3.6, alpha: 0,
          duration: 420, ease: 'Quad.easeOut', onComplete: () => ripple.destroy() });
        // Scale + смена цвета на акцент
        iconG.clear(); TAB_ICONS[tab.icon](iconG, 0, 0, tab.col, 2.2);
        this.tweens.killTweensOf(iconContainer);
        this.tweens.add({ targets: iconContainer, scaleX: 1.3, scaleY: 1.3, duration: 80, ease: 'Back.easeOut' });
      });
      zone.on('pointerout', () => {
        this.tweens.killTweensOf(iconContainer);
        this.tweens.add({ targets: iconContainer, scaleX: 1, scaleY: 1, duration: 130, ease: 'Sine.easeOut' });
        const isActive = this._activeTab === tab.key;
        iconG.clear(); TAB_ICONS[tab.icon](iconG, 0, 0, isActive ? tab.col : 0x2e2b50, isActive ? 2 : 1.5);
      });
      zone.on('pointerup', () => {
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
