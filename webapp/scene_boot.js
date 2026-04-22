/* ============================================================
   BootScene — загрузка текстур + Notif (in-game уведомления)
   ============================================================ */

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const bar = document.getElementById('loading-bar');
    this.load.image('warrior_tank',  'warriors/warrior_tank.png');
    this.load.image('warrior_agile', 'warriors/warrior_agile.png');
    this.load.image('warrior_crit',  'warriors/warrior_crit.png');
    this.load.image('armor_common',  'armor_common.png');
    this.load.image('armor_gold',    'armor_gold.png');
    this.load.image('armor_epic',    'armor_epic.png');
    this.load.image('armor_mythic',  'armor_mythic.png');
    this.load.image('weapon_sword_free',   'weapon_sword_free.png');
    this.load.image('weapon_sword_rare',   'weapon_sword_rare.png');
    this.load.image('weapon_sword_epic',   'weapon_sword_epic.png');
    this.load.image('weapon_sword_mythic', 'weapon_sword_mythic.png');
    this.load.image('weapon_axe_free',     'weapon_axe_free.png');
    this.load.image('weapon_axe_rare',     'weapon_axe_rare.png');
    this.load.image('weapon_axe_epic',     'weapon_axe_epic.png');
    this.load.image('weapon_axe_mythic',   'weapon_axe_mythic.png');
    this.load.image('weapon_club_free',    'weapon_club_free.png');
    this.load.image('weapon_club_rare',    'weapon_club_rare.png');
    this.load.image('weapon_club_epic',    'weapon_club_epic.png');
    this.load.image('weapon_club_mythic',  'weapon_club_mythic.png');
    this.load.image('weapon_gs_free',      'weapon_gs_free.png');
    this.load.image('weapon_gs_rare',      'weapon_gs_rare.png');
    this.load.image('weapon_gs_epic',      'weapon_gs_epic.png');
    this.load.image('weapon_gs_mythic',    'weapon_gs_mythic.png');
    this.load.image('helmet_free1',   'helmet_free1.png');
    this.load.image('helmet_free2',   'helmet_free2.png');
    this.load.image('helmet_free3',   'helmet_free3.png');
    this.load.image('helmet_free4',   'helmet_free4.png');
    this.load.image('helmet_gold1',   'helmet_gold1.png');
    this.load.image('helmet_gold2',   'helmet_gold2.png');
    this.load.image('helmet_gold3',   'helmet_gold3.png');
    this.load.image('helmet_gold4',   'helmet_gold4.png');
    this.load.image('helmet_dia1',    'helmet_dia1.png');
    this.load.image('helmet_dia2',    'helmet_dia2.png');
    this.load.image('helmet_dia3',    'helmet_dia3.png');
    this.load.image('helmet_dia4',    'helmet_dia4.png');
    this.load.image('helmet_mythic1', 'helmet_mythic1.png');
    this.load.image('helmet_mythic2', 'helmet_mythic2.png');
    this.load.image('helmet_mythic3', 'helmet_mythic3.png');
    this.load.image('helmet_mythic4', 'helmet_mythic4.png');
    this.load.image('boots_free1',   'boots_free1.png');
    this.load.image('boots_free2',   'boots_free2.png');
    this.load.image('boots_free3',   'boots_free3.png');
    this.load.image('boots_free4',   'boots_free4.jpeg');
    this.load.image('boots_gold1',   'boots_gold1.png');
    this.load.image('boots_gold2',   'boots_gold2.jpg');
    this.load.image('boots_gold3',   'boots_gold3.jpg');
    this.load.image('boots_gold4',   'boots_gold4.jpg');
    this.load.image('boots_dia1',    'boots_dia1.jpg');
    this.load.image('boots_dia2',    'boots_dia2.jpg');
    this.load.image('boots_dia3',    'boots_dia3.jpg');
    this.load.image('boots_dia4',    'boots_dia4.jpg');
    this.load.image('boots_mythic1', 'boots_mythic1.jpeg');
    this.load.image('boots_mythic2', 'boots_mythic2.jpeg');
    this.load.image('boots_mythic3', 'boots_mythic3.jpeg');
    this.load.image('boots_mythic4', 'boots_mythic4.jpeg');
    this.load.image('shield_free1','shield_free1.jpeg');
    this.load.image('shield_free2','shield_free2.jpeg');
    this.load.image('shield_free3','shield_free3.jpeg');
    this.load.image('shield_free4','shield_free4.jpeg');
    this.load.image('shield_gold1','shield_gold1.jpeg');
    this.load.image('shield_gold2','shield_gold2.jpeg');
    this.load.image('shield_gold3','shield_gold3.jpeg');
    this.load.image('shield_gold4','shield_gold4.jpeg');
    this.load.image('shield_dia1','shield_dia1.png');
    this.load.image('shield_dia2','shield_dia2.png');
    this.load.image('shield_dia3','shield_dia3.png');
    this.load.image('shield_dia4','shield_dia4.png');
    this.load.image('shield_mythic1','shield_mythic1.png');
    this.load.image('shield_mythic2','shield_mythic2.png');
    this.load.image('shield_mythic3','shield_mythic3.png');
    this.load.image('shield_mythic4','shield_mythic4.png');
    this.load.image('ring_free1',   'ring_free1.png');
    this.load.image('ring_free2',   'ring_free2.png');
    this.load.image('ring_free3',   'ring_free3.png');
    this.load.image('ring_free4',   'ring_free4.png');
    this.load.image('ring_gold1',   'ring_gold1.png');
    this.load.image('ring_gold2',   'ring_gold2.png');
    this.load.image('ring_gold3',   'ring_gold3.png');
    this.load.image('ring_gold4',   'ring_gold4.png');
    this.load.image('ring_dia1',    'ring_dia1.png');
    this.load.image('ring_dia2',    'ring_dia2.png');
    this.load.image('ring_dia3',    'ring_dia3.png');
    this.load.image('ring_dia4',    'ring_dia4.png');
    this.load.image('ring_mythic1', 'ring_mythic1.png');
    this.load.image('ring_mythic2', 'ring_mythic2.png');
    this.load.image('ring_mythic3', 'ring_mythic3.png');
    this.load.image('ring_mythic4', 'ring_mythic4.png');
    this.load.on('progress', v => { if (bar) bar.style.width = (v * 100) + '%'; });
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
    this.scene.start('Menu');
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
