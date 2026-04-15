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

    this._buildResultPanel(W, H, won, r, isAfk, isEndless, isTitan, endlessWave, titanFloor, res);

    State.playerLoadedAt = 0;
    let endlessStatus = null;
    try {
      const fresh = await post('/api/player');
      if (fresh.ok) {
        const _wt = State.player?.warrior_type; // сохраняем локальный выбор воина
        State.player = fresh.player;
        if (_wt) State.player.warrior_type = _wt;
        State.playerLoadedAt = Date.now();
      }
    } catch (_) {}
    if (isEndless) {
      try { endlessStatus = await get('/api/endless/status'); } catch (_) {}
    }

    await this._buildResultExtra(W, H, won, r, isEndless, isTitan, endlessWave, endlessProgress, endlessStatus, titanFloor, res);
  }
}
