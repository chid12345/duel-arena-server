/* ============================================================
   TasksWeeklyScene — недельные задания (старые 5 + новые 4)
   ============================================================ */

class TasksWeeklyScene extends Phaser.Scene {
  constructor() { super('TasksWeekly'); }

  init(data) { this._externalData = data?.data || null; }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '📋', 'НЕДЕЛЬНЫЕ ЗАДАНИЯ', '');
    _extraBack(this, () => this.scene.start('Tasks', { tab: 'daily' }));
    if (this._externalData) {
      this._render(this._externalData, W, H);
    } else {
      this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
      get('/api/tasks/status').then(d => {
        this._loading?.destroy(); this._loading = null;
        if (d?.ok) this._render(d, W, H);
      }).catch(() => this._loading?.setText('❌ Нет соединения'));
    }
  }

  _render(data, W, H) {
    const weekly = (data.weekly || {}).quests || [];
    const extra = data.weekly_extra || [];
    const weekKey = data.week_key || '';
    const startY = 76;
    const { container, setContentH } = this._makeScrollZone(W, H, startY);
    let y = 10;

    const renderQuest = (q, isExtra) => {
      const done = q.is_completed, claimed = q.reward_claimed;
      const cur = q.current, max = q.target;
      const bh = 64;
      const bg = this.add.graphics();
      bg.fillStyle(done ? (claimed ? 0x0a1a0a : 0x0e1e10) : C.bgPanel, 0.92);
      bg.fillRoundedRect(8, y, W - 16, bh, 10);
      bg.lineStyle(1.5, done ? (claimed ? C.green : C.gold) : C.dark, done ? 0.5 : 0.2);
      bg.strokeRoundedRect(8, y, W - 16, bh, 10);
      container.add(bg);
      container.add(txt(this, 20, y + 10, q.label, 11, done ? '#3cc864' : '#ccccee', done).setOrigin(0, 0));
      container.add(txt(this, 20, y + 25, q.desc || '', 9, '#888899').setOrigin(0, 0));
      container.add(txt(this, 20, y + 38, `${cur} / ${max}`, 9, '#9999bb', true).setOrigin(0, 0));
      makeBar(this, 65, y + 40, W - 130, 4, Math.min(1, cur / max), done ? C.green : C.gold, C.dark, 3);
      const rwTxt = `+${q.reward_gold}🪙${q.reward_diamonds ? ' +' + q.reward_diamonds + '💎' : ''}`;
      container.add(txt(this, W - 12, y + 10, claimed ? '✅' : (done ? '🎁' : '🔒'), 16).setOrigin(1, 0));
      if (!claimed) container.add(txt(this, W - 12, y + 36, rwTxt, 8, done ? '#ffd700' : '#556655').setOrigin(1, 0));
      if (done && !claimed) {
        const zone = this.add.zone(8, y + startY, W - 16, bh).setOrigin(0).setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => isExtra ? this._claimExtra(q.key, weekKey, rwTxt)
          : this._claimOld(q.key, rwTxt));
      }
      y += bh + 6;
    };

    txt(this, 14, y + startY, '📋 ЕЖЕНЕДЕЛЬНЫЕ (старые)', 10, '#9999bb', true);
    y += 18;
    weekly.forEach(q => renderQuest(q, false));
    y += 8;
    txt(this, 14, y + startY, '📋 ЕЖЕНЕДЕЛЬНЫЕ (новые)', 10, '#9999bb', true);
    y += 18;
    extra.forEach(q => renderQuest(q, true));
    y += 6;
    txt(this, W/2, y + startY, `🔄 Сброс в понедельник 00:00`, 9, '#555577').setOrigin(0.5);
    y += 20;
    container.setY(startY);
    setContentH(y + 10);
  }

  _makeScrollZone(W, H, startY) {
    const zone = this.add.zone(0, startY, W, H - startY - 10).setOrigin(0).setInteractive();
    const container = this.add.container(0, startY);
    let baseY = 0, startDrag = 0, dragY = 0;
    zone.on('pointerdown', p => { startDrag = p.y; dragY = baseY; });
    zone.on('pointermove', p => {
      if (!zone._dragging && Math.abs(p.y - startDrag) < 5) return;
      zone._dragging = true;
      baseY = dragY + (p.y - startDrag);
      const maxS = -(container._contentH || 0) + (H - startY - 10);
      baseY = Math.min(0, Math.max(maxS, baseY));
      container.setY(startY + baseY);
    });
    zone.on('pointerup', () => { zone._dragging = false; });
    return { container, setContentH: h => container._contentH = h };
  }

  _toast(msg) {
    const bg = this.add.graphics();
    bg.fillStyle(0x222240, 0.95); bg.fillRoundedRect(20, this.H - 90, this.W - 40, 36, 10);
    const t = txt(this, this.W/2, this.H - 72, msg, 11, '#eeeeff').setOrigin(0.5);
    this.tweens.add({ targets: [bg, t], alpha: 0, delay: 2200, duration: 600,
      onComplete: () => { bg.destroy(); t.destroy(); } });
  }

  _claimOld(key, rwTxt) {
    if (this._busy) return; this._busy = true;
    post('/api/quests/weekly_claim', { init_data: State.initData, claim_key: key })
      .then(r => { this._busy = false; if (r?.ok) { State.player = r.player; this._toast(`🎁 ${rwTxt}`); this.scene.restart(); } else this._toast('❌ ' + (r?.reason || '?')); })
      .catch(() => { this._busy = false; });
  }

  _claimExtra(key, weekKey, rwTxt) {
    if (this._busy) return; this._busy = true;
    post('/api/tasks/claim_weekly_extra', { init_data: State.initData, task_key: key })
      .then(r => { this._busy = false; if (r?.ok) { State.player = r.player; this._toast(`🎁 ${rwTxt}`); this.scene.restart(); } else this._toast('❌ ' + (r?.reason || '?')); })
      .catch(() => { this._busy = false; });
  }
}
