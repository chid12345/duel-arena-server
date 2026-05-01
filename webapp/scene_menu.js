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

    // Zombie-overlay страховка: закрываем overlay'и предыдущих вкладок,
    // если shutdown() не успел их закрыть (гонка, exception).
    try { window._closeAllTabOverlays?.(); } catch(_) {}

    this._drawBg(W, H);
    // TabBar строим ДО _loadPlayer(): если сервер медленный/перезапускается,
    // игрок всё равно видит нижнее меню и может уйти на другую вкладку.
    // Без этого при долгом ответе API экран — чёрное небо без навигации.
    // _panels пуст → _switchTab безопасно пройдёт пустым циклом.
    this._activeTab = this._returnTab || 'profile';
    this._buildTabBar();

    // Анти-эксплойт: если игрок открыл Menu, но на сервере он сейчас в активном
    // бою (рейд/PvP/натиск/башня) — сразу возвращаем в нужную сцену.
    // ВАЖНО: fire-and-forget ПОСЛЕ _buildTabBar — иначе при медленной сети
    // экран = чёрное небо без навигации до ответа /active_session.
    // Передаём ВСЕГДА {} (никогда undefined): Phaser 3 при scene.start без
    // data сохраняет ПРЕДЫДУЩИЕ данные → утечка флагов.
    post('/api/player/active_session', {}).then(sess => {
      if (!this.scene?.isActive('Menu')) return;
      if (sess?.ok && sess.scene && sess.scene !== 'Menu') {
        // Анти-зомби-цикл: если бой недавно упал по watchdog'у,
        // не возвращаем игрока обратно в сломанный бой 30 сек.
        if (sess.scene === 'Battle') {
          try {
            const skipUntil = +(localStorage.getItem('da_skip_battle_resume') || 0);
            if (skipUntil && Date.now() - skipUntil < 30000) {
              console.warn('[Menu] skip Battle resume — недавний UI-сбой');
              return;
            }
          } catch(_) {}
        }
        this.scene.start(sess.scene, sess.openTab ? { returnTab: sess.openTab } : {});
      }
    }).catch(() => {});
    // Индикатор загрузки — пока _loadPlayer ждёт ответа сервера, игрок видит
    // «⏳ Загрузка…» вместо пустого неба. Убираем в _loadPlayer перед панелями.
    this._loadingTxt = txt(this, W / 2, H / 2, '⏳ Загрузка…', 16, '#aaaaff', true).setOrigin(0.5);
    this._loadPlayer();
    // Lazy-загрузка PNG экипировки запускается ВНУТРИ _loadPlayer после
    // _buildProfilePanel — когда State.equipment уже заполнен. Это даёт
    // приоритет надетым предметам (~3МБ) вместо 50МБ всего набора —
    // на мобильном WebView это разница между «всё показалось за 2с» и
    // «30-60с emoji-фолбэка».
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
    // Кэш ТОЛЬКО при полном HP. Иначе игрок скачет по табам быстрее 30с,
    // Phaser-таймер регена не успевает тикнуть ни разу, и HP «застревает»
    // на значении после боя (визуальный баг 1411/1549). Сервер сам считает
    // реген при /api/player через apply_hp_regen — берём свежие данные.
    const _hpFull = State.player && (State.player.current_hp >= State.player.max_hp);
    const cached = State.player && _hpFull && (Date.now() - State.playerLoadedAt) < _PROFILE_TTL;

    try {
      let playerOk = false;

      if (cached) {
        playerOk = true;
        // Уступаем control event loop'у, чтобы create() успел вернуться и статус
        // сцены стал RUNNING. Иначе в cached-ветке мы синхронно доходим до
        // isActive('Menu') ниже — а при status=CREATING он возвращает false,
        // билд профиля молча пропускается, и лоадер зависает навсегда.
        await new Promise(r => setTimeout(r, 0));
        get('/api/tasks/status').catch(() => null).then(taskRes => {
          if (!this.scene?.isActive('Menu')) return;
          if (!taskRes?.ok) return;
          const cnt = taskRes.claimable_count || 0;
          if (cnt !== this._tasksBadgeCount) {
            this._tasksBadgeCount = cnt;
            this._updateProfileTasksBadge?.();
          }
        });
        get('/api/version').catch(() => null).then(versionRes => {
          if (!this.scene?.isActive('Menu')) return;
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
            if (!this.scene?.isActive('Menu')) return;
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
            if (!this.scene?.isActive('Menu')) return;
            if (taskRes?.ok) {
              const cnt = taskRes.claimable_count || 0;
              this._tasksBadgeCount = cnt;
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
        // Guard: если пользователь ушёл до ответа API — сцена мертва.
        // Без проверки _buildTabBar() и _setupWS() запустятся на мёртвой сцене,
        // создавая осиротевшие объекты и незакрытые WebSocket-ы.
        if (!this.scene?.isActive('Menu')) return;
        try {
          // Ждём PNG надетых вещей (~6 шт, ~3МБ) ДО показа профиля.
          // Цена — +1-2с к лоадеру на мобиле, выгода — профиль открывается
          // сразу со ВСЕМИ картинками, без уродливого перехода emoji→PNG.
          // Fail-safe: 5с лимит внутри _preloadEquippedTextures.
          if (typeof this._preloadEquippedTextures === 'function') {
            this._preloadEquippedTextures().catch(() => null);
          }
          if (!this.scene?.isActive('Menu')) return;
          if (this._loadingTxt) { try { this._loadingTxt.destroy(); } catch(_) {} this._loadingTxt = null; }
          this._buildTabBar();
          this._buildProfilePanel();
          this._buildBattlePanel();
          this._buildMorePanel();
          this._switchTab(this._returnTab || 'profile');
          this._setupWS();
          this._startRegenTick();
          this._loadDailyBonusCard();
          // Фоновая догрузка остальных PNG (~50МБ) — для Рюкзака/Equipment,
          // не блокирует профиль.
          this._lazyLoadRestTextures?.();
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
