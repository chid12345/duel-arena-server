/* ============================================================
   ResultScene — итог боя  [cyberpunk redesign]
   Продолжение: scene_result_ext.js
   ============================================================ */

class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  shutdown() {
    ResultButtonsHTML?.hide();
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }

  async create() {
    try { if (typeof _closeAllTabOverlays === 'function') _closeAllTabOverlays(); } catch(_) {}
    const { width: W, height: H } = this.game.canvas;
    const res   = State.lastResult;
    const won   = res?.human_won ?? false;
    const r     = res?.result    ?? {};
    const isAfk = res?.afk_loss  === true;
    const isEndless    = res?.mode === 'endless';
    const isTitan      = res?.mode === 'titan';
    const endlessWave  = res?.mode_meta?.wave || State.endlessWave || 0;
    const titanFloor   = res?.mode_meta?.floor || 0;
    const endlessProgress = res?.endless_progress;

    const nCol   = won ? 0x00e5ff : 0xff1144;
    const nHex   = won ? '#00e5ff' : '#ff1144';

    // === BACKGROUND ===
    const bg = this.add.graphics();
    bg.fillStyle(0x04040c, 1);
    bg.fillRect(0, 0, W, H);

    // Grid
    const grid = this.add.graphics();
    grid.lineStyle(1, nCol, 0.055);
    for (let y = 0; y < H; y += 28) { grid.moveTo(0, y); grid.lineTo(W, y); }
    for (let x = 0; x < W; x += 28) { grid.moveTo(x, 0); grid.lineTo(x, H); }
    grid.strokePath();

    // Scanlines
    const scan = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      scan.fillStyle(0x000000, 0.16);
      scan.fillRect(0, y, W, 2);
    }

    // Corner brackets
    const br = this.add.graphics();
    br.lineStyle(2, nCol, 0.75);
    const cs = 28;
    [[0,0],[W,0],[0,H],[W,H]].forEach(([cx,cy]) => {
      const sx = cx === 0 ? 1 : -1, sy = cy === 0 ? 1 : -1;
      br.moveTo(cx, cy + sy * cs); br.lineTo(cx, cy); br.lineTo(cx + sx * cs, cy);
    });
    br.strokePath();

    // Floating data particles
    const pCols = won ? [0x00e5ff, 0xff00aa, 0xffd700, 0x00ff88]
                      : [0xff1144, 0xff6600, 0xcc00ff, 0xff88aa];
    for (let i = 0; i < 28; i++) {
      const c = this.add.graphics();
      c.fillStyle(Phaser.Math.RND.pick(pCols), Phaser.Math.FloatBetween(0.08, 0.3));
      const s = Phaser.Math.FloatBetween(1.5, 3.5);
      c.fillRect(-s/2, -s/2, s, s);
      c.x = Phaser.Math.Between(0, W);
      c.y = Phaser.Math.Between(0, H);
      this.tweens.add({
        targets: c, y: c.y - Phaser.Math.Between(60, 180), alpha: 0,
        duration: Phaser.Math.Between(2500, 5000), delay: Phaser.Math.Between(0, 2500),
        repeat: -1,
        onRepeat: () => { c.x = Phaser.Math.Between(0, W); c.y = H + 10; c.alpha = Phaser.Math.FloatBetween(0.08, 0.28); }
      });
    }

    tg?.HapticFeedback?.notificationOccurred(won ? 'success' : 'error');
    if (won) Sound.victory(); else Sound.defeat();
    if (won) this._celebrate(W, H);

    // === TITLE ===
    const titleStr = won ? '⚡  ПОБЕДА!' : isAfk ? '⏱️  ТАЙМАУТ' : '💀  ПОРАЖЕНИЕ';
    const titleHex = won ? '#00ffcc' : isAfk ? '#ff8844' : '#ff1155';

    const title = this.add.text(W/2, H*0.103, titleStr, {
      fontFamily: 'Arial Black, Arial', fontSize: '30px', fontStyle: 'bold', color: titleHex,
      shadow: { offsetX: 0, offsetY: 0, color: titleHex, blur: 18, fill: true }
    }).setOrigin(0.5).setScale(0).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 520, ease: 'Back.easeOut' });

    // Neon divider under title
    const divLine = this.add.graphics().setAlpha(0);
    divLine.lineStyle(6, nCol, 0.18);
    divLine.moveTo(W*0.12, H*0.148); divLine.lineTo(W*0.88, H*0.148); divLine.strokePath();
    divLine.lineStyle(1.5, nCol, 0.85);
    divLine.moveTo(W*0.12, H*0.148); divLine.lineTo(W*0.88, H*0.148); divLine.strokePath();
    this.tweens.add({ targets: divLine, alpha: 1, duration: 380, delay: 280 });

    // === OPPONENT ROW (compact, horizontal) ===
    const rawOpp = (r.opponent_name || '').toString().trim();
    const rowY   = H * 0.195;
    // === OPPONENT ROW ===
    // Layout: [avatar ring] [label\nname] — все сгруппировано, без наложений
    const hasOpp = rawOpp && !isTitan && !isEndless;
    const oppShort = hasOpp ? (rawOpp.length > 20 ? rawOpp.slice(0, 18) + '…' : rawOpp) : '';
    const labelTxt = won ? 'победил(а) над' : 'проиграл(а)';

    // Аватар — только если есть соперник, сдвигаем влево от центра
    let avRendered = false;
    try {
      const wKey = (typeof getWarriorKey === 'function') ? getWarriorKey(State.player?.warrior_type) : null;
      if (wKey && this.textures?.exists(wKey)) {
        const avX = hasOpp ? W/2 - 78 : W/2;
        const ring = this.add.graphics().setAlpha(0);
        ring.lineStyle(6, nCol, 0.22); ring.strokeCircle(avX, rowY, 22);
        ring.lineStyle(2, nCol, 0.95); ring.strokeCircle(avX, rowY, 20);
        ring.fillStyle(0x000000, 0.45); ring.fillCircle(avX, rowY, 19);
        const av = this.add.image(avX, rowY, wKey).setScale(0.078).setAlpha(0);
        this.tweens.add({ targets: [ring, av], alpha: 1, duration: 360, delay: 340 });
        avRendered = true;
      }
    } catch (_) {}

    if (hasOpp) {
      // Текст начинается правее аватара (или по центру если аватара нет)
      const textX = avRendered ? W/2 - 78 + 26 + 6 : W/2;
      const originX = avRendered ? 0 : 0.5;
      this.add.text(textX, rowY - 9, labelTxt, {
        fontFamily: 'Arial', fontSize: '10px', color: '#99bbcc'
      }).setOrigin(originX, 0.5);
      this.add.text(textX, rowY + 9, oppShort, {
        fontFamily: 'Arial Black, Arial', fontSize: '14px', fontStyle: 'bold',
        color: won ? '#7ed4f5' : '#ff8899',
        shadow: { offsetX: 0, offsetY: 0, color: won ? '#7ed4f5' : '#ff8899', blur: 8, fill: true }
      }).setOrigin(originX, 0.5);
    }

    this._buildResultPanel(W, H, won, r, isAfk, isEndless, isTitan, endlessWave, titanFloor, res);

    State.playerLoadedAt = 0;
    let endlessStatus = null;
    let _diagTxt = '';
    try {
      const fresh = await post('/api/player');
      _diagTxt = `sv:${fresh._sv||'?'} hp:${fresh._db_hp||'?'}/${fresh._db_mhp||'?'} exp:${fresh._db_exp||'?'} c:${fresh.cached?1:0}`;
      if (fresh.ok) {
        const _wt = State.player?.warrior_type;
        State.player = fresh.player;
        if (_wt) State.player.warrior_type = _wt;
        State.playerLoadedAt = Date.now();
      }
    } catch (e) { _diagTxt = 'ERR:' + e.message; }
    if (_diagTxt) {
      txt(this, W/2, H*0.975, _diagTxt, 8, '#333355').setOrigin(0.5);
    }
    if (isEndless) {
      try { endlessStatus = await get('/api/endless/status'); } catch (_) {}
    }

    await this._buildResultExtra(W, H, won, r, isEndless, isTitan, endlessWave, endlessProgress, endlessStatus, titanFloor, res);
  }
}
