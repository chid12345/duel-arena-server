/* ============================================================
   ResultScene — итог боя
   Продолжение: scene_result_ext.js
   ============================================================ */

class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  shutdown() {
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }

  async create() {
    // Закрываем зомби-оверлеи из предыдущей сцены
    try { BattleLog.hideHistory?.(); } catch(_) {}
    try { if (typeof BotBattleCard !== 'undefined') BotBattleCard.hide?.(); } catch(_) {}
    try { window._closeAllTabOverlays?.(); } catch(_) {}
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

    const bg = this.add.graphics();
    if (won) {
      bg.fillGradientStyle(0x0d1f09, 0x0d1f09, 0x121c0a, 0x121c0a, 1);
    } else {
      bg.fillGradientStyle(0x1a0808, 0x1a0808, 0x120a0a, 0x120a0a, 1);
    }
    bg.fillRect(0, 0, W, H);
    const starCol = won ? 0xffc83c : 0xff6655;
    for (let i = 0; i < 45; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.85),
        Phaser.Math.FloatBetween(0.4, 1.8), starCol,
        Phaser.Math.FloatBetween(0.06, 0.35)
      );
    }

    tg?.HapticFeedback?.notificationOccurred(won ? 'success' : 'error');
    if (won) Sound.victory(); else Sound.defeat();

    if (won) this._celebrate(W, H);

    const titleStr = won ? '🏆  ПОБЕДА!' : isAfk ? '⏱️  ТАЙМАУТ' : '💀  ПОРАЖЕНИЕ';
    const titleCol = won ? '#ffc83c' : isAfk ? '#ff8855' : '#ff4455';
    const title = txt(this, W / 2, H * 0.17, titleStr, 34, titleCol, true)
      .setOrigin(0.5).setScale(0).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 550, ease: 'Back.easeOut' });

    // Ник противника — строка под заголовком.
    const rawOpp = (r.opponent_name || '').toString().trim();
    if (rawOpp && !isTitan && !isEndless) {
      const oppShort = rawOpp.length > 22 ? rawOpp.slice(0, 20) + '…' : rawOpp;
      const oppLine = won ? `победил(а) над  ${oppShort}` : `проиграл(а)  ${oppShort}`;
      const oppCol  = won ? '#c9d4ff' : '#ffb8a8';
      const opp = txt(this, W / 2, H * 0.225, oppLine, 13, oppCol, true)
        .setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: opp, alpha: 1, duration: 400, delay: 250 });
    }

    // Мини-карточка: твой воин (скин по warrior_type).
    // Раньше на Result-сцене не было визуала игрока — показываем спрайт под именем противника.
    try {
      const wKey = (typeof getWarriorKey === 'function')
        ? getWarriorKey(State.player?.warrior_type) : null;
      if (wKey && this.textures && this.textures.exists(wKey)) {
        const myAvY = H * 0.255;
        const ringCol = won ? 0xffc83c : 0xff4455;
        const ring = this.add.graphics().setAlpha(0);
        ring.lineStyle(2, ringCol, 0.85).strokeCircle(W / 2, myAvY + 18, 22);
        ring.fillStyle(0x000000, 0.35).fillCircle(W / 2, myAvY + 18, 21);
        const av = this.add.image(W / 2, myAvY + 18, wKey)
          .setScale(0.085).setAlpha(0);
        this.tweens.add({ targets: [ring, av], alpha: 1, duration: 380, delay: 350 });
      }
    } catch (_) {}

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
    // Временная диагностика — показать версию сервера и сырые HP/XP из БД
    if (_diagTxt) {
      txt(this, W / 2, H * 0.96, _diagTxt, 9, '#555555').setOrigin(0.5);
    }
    if (isEndless) {
      try { endlessStatus = await get('/api/endless/status'); } catch (_) {}
    }

    await this._buildResultExtra(W, H, won, r, isEndless, isTitan, endlessWave, endlessProgress, endlessStatus, titanFloor, res);
  }
}
