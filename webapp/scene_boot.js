/* ============================================================
   BootScene — загрузка текстур + Notif (in-game уведомления)
   ============================================================ */

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // CRITICAL ASSETS ONLY: только то, без чего меню/бой не отрисуются.
    // Картинки экипировки (armor/weapon/helmet/boots/shield/ring — ~50 МБ) грузим
    // ленив в MenuScene._preloadEquippedTextures() (6 надетых PNG до показа
    // профиля) + _lazyLoadRestTextures() (остальные фоном для Рюкзака),
    // чтобы на мобильном WebView не зависать на экране загрузки.
    const bar = document.getElementById('loading-bar');
    // Cache-bust: Telegram WebView агрессивно кэширует PNG. При смене ассета без v=
    // пользователь увидит СТАРУЮ картинку ещё долго (и это выглядит как «сломанный»
    // оранжевый квадрат на активном табе, пока не придёт новая версия).
    const V = (typeof window !== 'undefined' && window.BUILD_VERSION) ? `?v=${window.BUILD_VERSION}` : '';
    this.load.image('warrior_tank',  `warriors/warrior_tank.png${V}`);
    this.load.image('warrior_agile', `warriors/warrior_agile.png${V}`);
    this.load.image('warrior_crit',  `warriors/warrior_crit.png${V}`);
    this.load.image('clan_emblem',   `clan_emblem.png${V}`);
    this.load.image('clan_em_light',   `clan_em_light.png${V}`);
    this.load.image('clan_em_dark',    `clan_em_dark.png${V}`);
    this.load.image('clan_em_neutral', `clan_em_neutral.png${V}`);
    this.load.image('tab_profile',   `tab_profile.png${V}`);
    this.load.image('tab_clan',      `tab_clan.png${V}`);
    this.load.image('tab_stats',     `tab_stats.png${V}`);
    this.load.image('tab_boss',      `tab_boss.png${V}`);
    this.load.image('tab_rating',    `tab_rating.png${V}`);
    this.load.image('tab_more',      `tab_more.png${V}`);
    if (typeof BotSkinPicker !== 'undefined') BotSkinPicker.preloadInto(this, V);
    this.load.on('progress', v => { if (bar) bar.style.width = (v * 100) + '%'; });
    this.load.on('loaderror', f => console.warn('[Boot] loaderror:', f?.key, f?.src));
    this.load.on('complete', () => {
      try {
        this._generateTextures();
      } catch(e) {
        console.error('_generateTextures error:', e);
      }
    });
  }

  _generateTextures() {
    this._warrior('warrior_blue', '#4488ff', '#2255cc');
    this._warrior('warrior_red', '#ff4455', '#cc2233');
    this._warriorFace('warrior_blue_face', '#4488ff', '#2255cc');
    this._warriorFace('warrior_red_face',  '#ff4455', '#cc2233');
    this._generateWarriorTextures();
    this._hitFx();
    this._critFx();
    this._dodgeFx();
    this._zoneBtn();
    this._arenaBg();
    this._coin();
  }

  /* Портрет 56×56 — для аватара в шапке профиля */
  _warriorFace(key, bodyColor, shadowColor) {
    const S = 56;
    const rt = this.add.renderTexture(0, 0, S, S).setVisible(false);
    const g  = this.add.graphics().setVisible(false);
    const bc = parseInt(bodyColor.replace('#', ''), 16);
    const sc = parseInt(shadowColor.replace('#', ''), 16);
    // Плечи / верх торса
    g.fillStyle(bc, 1); g.fillRoundedRect(8, 36, 40, 22, 8);
    // Щит слева
    g.fillStyle(0x3366cc, 1); g.fillRoundedRect(2, 34, 12, 18, 4);
    g.lineStyle(1.5, 0x88aaff, 1); g.strokeRoundedRect(2, 34, 12, 18, 4);
    // Меч справа (намёк)
    g.lineStyle(3, 0xffc83c, 1); g.lineBetween(46, 34, 55, 18);
    // Голова
    g.fillStyle(bc, 1); g.fillCircle(28, 22, 16);
    // Шлем
    g.fillStyle(sc, 1); g.fillRect(12, 8, 32, 8);
    g.fillStyle(0xffc83c, 1); g.fillRect(20, 3, 16, 7);
    // Глаза
    g.fillStyle(0xffffff, 1); g.fillCircle(22, 22, 4); g.fillCircle(34, 22, 4);
    g.fillStyle(0x111122, 1); g.fillCircle(23, 22, 2); g.fillCircle(35, 22, 2);
    rt.draw(g, 0, 0);
    rt.saveTexture(key);
    g.destroy(); rt.destroy();
  }

  _warrior(key, bodyColor, shadowColor) {
    const W = 80, H = 120;
    const rt = this.add.renderTexture(0, 0, W, H).setVisible(false);
    const draw = this.add.graphics().setVisible(false);

    draw.fillStyle(parseInt(shadowColor.replace('#',''), 16), 0.3);
    draw.fillEllipse(40, 110, 50, 12);
    draw.fillStyle(parseInt(bodyColor.replace('#',''), 16), 1);
    draw.fillRect(28, 80, 10, 32);
    draw.fillRect(42, 80, 10, 32);
    draw.fillRoundedRect(22, 40, 36, 42, 8);
    draw.fillStyle(0x3366cc, 1);
    draw.fillRoundedRect(4, 42, 18, 30, 5);
    draw.lineStyle(2, 0x88aaff, 1);
    draw.strokeRoundedRect(4, 42, 18, 30, 5);
    draw.lineStyle(2, 0xffffff, 0.5);
    draw.lineBetween(4+9, 42, 4+9, 72);
    draw.fillStyle(parseInt(bodyColor.replace('#',''), 16), 1);
    draw.fillRect(58, 44, 8, 6);
    draw.lineStyle(4, 0xffc83c, 1);
    draw.lineBetween(62, 50, 76, 22);
    draw.lineStyle(2, 0xffc83c, 0.6);
    draw.lineBetween(57, 42, 70, 42);
    draw.fillStyle(parseInt(bodyColor.replace('#',''), 16), 1);
    draw.fillCircle(40, 26, 16);
    draw.fillStyle(parseInt(shadowColor.replace('#',''), 16), 1);
    draw.fillRect(24, 14, 32, 8);
    draw.fillStyle(0xffc83c, 1);
    draw.fillRect(34, 10, 12, 6);
    draw.fillStyle(0xffffff, 1);
    draw.fillCircle(34, 26, 4);
    draw.fillCircle(46, 26, 4);
    draw.fillStyle(0x111122, 1);
    draw.fillCircle(35, 26, 2);
    draw.fillCircle(47, 26, 2);

    rt.draw(draw, 0, 0);
    rt.saveTexture(key);
    draw.destroy();
    rt.destroy();
  }

  _hitFx() {
    const g = this.add.graphics().setVisible(false);
    g.lineStyle(3, 0xff4444, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r1 = 10, r2 = 22;
      g.lineBetween(Math.cos(a)*r1+30, Math.sin(a)*r1+30, Math.cos(a)*r2+30, Math.sin(a)*r2+30);
    }
    g.generateTexture('hit_fx', 60, 60);
    g.destroy();
  }

  _critFx() {
    const g = this.add.graphics().setVisible(false);
    g.lineStyle(3, 0xffc83c, 1);
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = i % 2 === 0 ? 28 : 14;
      pts.push({ x: Math.cos(a)*r+30, y: Math.sin(a)*r+30 });
    }
    g.fillStyle(0xffc83c, 0.3);
    g.fillPoints(pts, true);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokePoints(pts, true);
    g.generateTexture('crit_fx', 60, 60);
    g.destroy();
  }

  _dodgeFx() {
    const g = this.add.graphics().setVisible(false);
    g.lineStyle(2, 0x3cc8dc, 0.8);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x3cc8dc, 0.15 - i * 0.02);
      g.fillEllipse(35 - i*6, 30, 30 - i*4, 20 - i*2);
    }
    g.generateTexture('dodge_fx', 70, 60);
    g.destroy();
  }

  _zoneBtn() {
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(0x2a2840, 1);
    g.fillRoundedRect(0, 0, 90, 44, 10);
    g.lineStyle(1.5, 0x5096ff, 0.5);
    g.strokeRoundedRect(0, 0, 90, 44, 10);
    g.generateTexture('zone_btn', 90, 44);
    g.destroy();
  }

  _arenaBg() {
    const W = 400, H = 240;
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(0x1a1828, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x22203a, 1);
    g.fillEllipse(W/2, H*0.72, W*0.9, H*0.3);
    g.lineStyle(1, 0x5096ff, 0.15);
    g.strokeEllipse(W/2, H*0.72, W*0.9, H*0.3);
    for (const fx of [60, W-60]) {
      g.fillStyle(0x2a2840, 1);
      g.fillRect(fx-4, H*0.2, 8, H*0.5);
      g.fillStyle(0xff8c00, 0.8);
      g.fillTriangle(fx-10, H*0.2, fx+10, H*0.2, fx, H*0.1);
    }
    g.generateTexture('arena_bg', W, H);
    g.destroy();
  }

  _coin() {
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(0xffc83c, 1);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0xcc9420, 1);
    g.fillCircle(12, 12, 9);
    g.fillStyle(0xffc83c, 1);
    g.fillText = () => {};
    g.generateTexture('coin', 24, 24);
    g.destroy();
  }

  create() {
    const ls = document.getElementById('loading-screen');
    if (ls) { ls.style.opacity = '0'; setTimeout(() => ls.remove(), 500); }
    // Анти-эксплойт: если игрок refresh/перезашёл во время активного боя
    // (рейд босса, PvP, натиск, башня) — возвращаем в нужную сцену.
    // Универсальный эндпоинт /api/player/active_session отвечает где быть.
    (async () => {
      try {
        const d = await post('/api/player/active_session', {});
        if (d?.ok && d.scene) {
          if (d.type === 'world_boss') {
            try { localStorage.removeItem('wb_left_raid'); } catch(_) {}
          }
          this.scene.start(d.scene, d.openTab ? { returnTab: d.openTab } : {});
          return;
        }
      } catch(_) {}
      this.scene.start('Menu', {});
    })();
  }
}

/* ── Менеджер in-game уведомлений ────────────────────────── */
const Notif = (() => {
  let _scene = null, _busy = false;
  const _q   = [];

  function _show() {
    if (_busy || !_q.length || !_scene) return;
    _busy = true;
    const { icon, msg, color, dur } = _q.shift();
    const W    = _scene.game.canvas.width;
    const panW = W - 28, panH = 48, panX = 14, panY = 82;
    const hexC = color || '#ffc83c';

    const g = _scene.add.graphics().setDepth(200).setY(-panH);
    g.fillStyle(C.bgPanel, 0.97);
    g.fillRoundedRect(panX, 0, panW, panH, 12);
    g.lineStyle(2, parseInt(hexC.replace('#','0x'), 16), 0.75);
    g.strokeRoundedRect(panX, 0, panW, panH, 12);

    const t = txt(_scene, panX + panW / 2, panH / 2, `${icon}  ${msg}`, 13, hexC, true)
      .setOrigin(0.5).setDepth(201).setY(panY - panH);

    _scene.tweens.add({
      targets: [g, t], y: `+=${panH}`,
      duration: 280, ease: 'Back.easeOut',
    });
    _scene.time.delayedCall(dur || 2600, () => {
      _scene.tweens.add({
        targets: [g, t], y: `-=${panH}`, alpha: 0,
        duration: 220, ease: 'Quad.easeIn',
        onComplete: () => { g.destroy(); t.destroy(); _busy = false; _show(); },
      });
    });
  }

  return {
    setScene(s) { _scene = s; _busy = false; },
    push(icon, msg, color, dur) { _q.push({ icon, msg, color, dur }); _show(); },
  };
})();
