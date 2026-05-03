/* ============================================================
   QuestsScene — ежедневные задания + логин-бонус
   Продолжение: scene_quests_ext.js, scene_quests_ext2.js
   ============================================================ */

class QuestsScene extends Phaser.Scene {
  constructor() { super('Quests'); }

  init(data) {
    this._tab = (data && data.tab) ? data.tab : 'daily';
  }

  create() {
    try { window._closeAllTabOverlays?.(); } catch(_) {}
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '📋', 'ЗАДАНИЯ', '');
    _extraBack(this);
    this._buildTabBar(W);
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#ddddff').setOrigin(0.5);
    get('/api/quests').then(d => this._render(d, W, H)).catch(() => {
      if (this._loading) this._loading.setText('❌ Нет соединения');
    });
  }

  /* ── Вкладки ─────────────────────────────────────────────── */
  _buildTabBar(W) {
    const tabs = [
      { key: 'daily',  label: '📅 Ежедневные' },
      { key: 'weekly', label: '📋 Еженедельные' },
    ];
    const tabW = (W - 16) / tabs.length;
    const ty   = 76, th = 28;
    this._tabObjs = {};
    tabs.forEach((tab, i) => {
      const tx    = 8 + i * tabW;
      const activ = this._tab === tab.key;
      const bg    = this.add.graphics();
      bg.fillStyle(activ ? 0x2a3060 : C.bgPanel, activ ? 1 : 0.7);
      bg.fillRoundedRect(tx, ty, tabW - 4, th, 8);
      if (activ) { bg.lineStyle(1.5, C.blue, 0.7); bg.strokeRoundedRect(tx, ty, tabW - 4, th, 8); }
      const t = txt(this, tx + (tabW-4)/2, ty + th/2, tab.label, 11,
        activ ? '#ffffff' : '#ccccee', activ).setOrigin(0.5);
      this._tabObjs[tab.key] = { bg, t };
      this.add.zone(tx, ty, tabW - 4, th).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this._tab === tab.key) return;
          tg?.HapticFeedback?.selectionChanged?.();
          this.scene.restart({ tab: tab.key });
        });
    });
  }

  _render(data, W, H) {
    this._loading?.destroy(); this._loading = null;
    if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }
    const q = data.quest || {};
    const d = data.daily || {};
    const w = data.weekly || {};
    const startY = 112;
    if (this._tab === 'daily')  this._buildDailyTab(q, d, W, H, startY);
    else                        this._buildWeeklyTab(w, W, H, startY);
  }

  /* ══ ЕЖЕДНЕВНАЯ ВКЛАДКА ══════════════════════════════════════ */
  _buildDailyTab(q, d, W, H, y) {
    y = this._buildDailyBonus(d, W, y);
    y += 10;

    const battles = q.battles_played || 0;
    const wins    = q.battles_won    || 0;
    const claimed = q.reward_claimed || false;
    const done    = q.is_completed   || false;
    const gold    = q.reward_gold    || 55;
    const xp      = q.reward_xp      || 150;

    /* Заголовок секции + badge «Готово!» */
    txt(this, 14, y, 'КВЕСТ ДНЯ', 10, '#ddddff', true);
    if (done && !claimed) {
      const bdg = this.add.graphics();
      bdg.fillStyle(0x1a4010, 1); bdg.fillRoundedRect(W-100, y-4, 92, 18, 5);
      txt(this, W-54, y+5, '🎁 Готово!', 10, '#3cc864', true).setOrigin(0.5);
    }
    y += 16;

    const tasks = [
      { icon: '⚔️', label: 'Сыграй 5 боёв',  cur: battles, max: 5, color: C.blue },
      { icon: '🏆', label: 'Одержи 3 победы', cur: wins,    max: 3, color: C.gold },
    ];
    tasks.forEach((task, i) => {
      const th = 54, tx = 8, tw = W-16, ty2 = y + i*(th+6);
      const ok = task.cur >= task.max;
      const bg = this.add.graphics();
      bg.fillStyle(ok ? 0x0e1e10 : C.bgPanel, 0.92);
      bg.fillRoundedRect(tx, ty2, tw, th, 10);
      bg.lineStyle(1.5, ok ? task.color : C.dark, ok ? 0.6 : 0.2);
      bg.strokeRoundedRect(tx, ty2, tw, th, 10);
      txt(this, tx+18, ty2+th/2, task.icon, 19).setOrigin(0.5);
      txt(this, tx+36, ty2+9,  task.label, 12, ok ? '#3cc864' : '#ccccee', ok);
      const tPct = Math.round(Math.min(1, task.cur / Math.max(1, task.max)) * 100);
      txt(this, tx+36, ty2+24, `${Math.min(task.cur,task.max)} / ${task.max}  ·  ${tPct}%`, 10, ok ? '#ffd700' : '#ffe888', true);
      makeBar(this, tx+36, ty2+40, tw-80, 4, Math.min(1, task.cur/task.max), task.color, C.dark, 3);
      txt(this, tw, ty2+th/2, ok ? '✅' : '🔒', 15).setOrigin(1, 0.5);
    });
    y += tasks.length * 60 + 6;

    /* Натиск-задание */
    const eWins = q.endless_wins || 0;
    const eDone = eWins >= 3;
    const eBg = this.add.graphics();
    eBg.fillStyle(eDone ? 0x1a0e00 : C.bgPanel, 0.92);
    eBg.fillRoundedRect(8, y, W-16, 52, 10);
    eBg.lineStyle(1.5, eDone ? 0xdc3c46 : C.dark, eDone ? 0.6 : 0.2);
    eBg.strokeRoundedRect(8, y, W-16, 52, 10);
    txt(this, 22, y+26, '🔥', 18).setOrigin(0.5);
    txt(this, 38, y+9, 'Победи 3 врага в Натиске', 12, eDone ? '#ff8855' : '#ccccee', eDone);
    const ePct = Math.round(Math.min(1, eWins / 3) * 100);
    txt(this, 38, y+23, `${Math.min(eWins,3)} / 3  ·  ${ePct}%`, 10, eDone ? '#ffd700' : '#ffe888', true);
    makeBar(this, 38, y+38, W-98, 4, Math.min(1, eWins/3), 0xdc3c46, C.dark, 3);
    txt(this, W-14, y+24, eDone ? '✅' : '🔒', 15).setOrigin(1, 0.5);
    if (eDone) txt(this, W-14, y+8, '+80🪙 +1💎', 9, '#ff8855', true).setOrigin(1, 0);
    y += 60;

    /* ── КНОПКА СБОРА ─────────────────────────────────────── */
    if (claimed) {
      const okG = this.add.graphics();
      okG.fillStyle(0x0a1a0a, 0.8); okG.fillRoundedRect(16, y, W-32, 42, 10);
      okG.lineStyle(1, C.green, 0.4); okG.strokeRoundedRect(16, y, W-32, 42, 10);
      txt(this, W/2, y+21, '✅ Награда получена — возвращайся завтра', 11, '#3cc864').setOrigin(0.5);
    } else if (done) {
      /* Пульсирующая кнопка */
      const clBg = this.add.graphics();
      const _drawCl = (pressed) => {
        clBg.clear();
        clBg.fillStyle(pressed ? 0xcc9000 : 0xffc83c, 1);
        clBg.fillRoundedRect(16, y, W-32, 46, 12);
        if (!pressed) { clBg.fillStyle(0xffffff, 0.13); clBg.fillRoundedRect(18, y+2, W-36, 20, 10); }
      };
      _drawCl(false);
      this.tweens.add({ targets: clBg, alpha: 0.82, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const clT = txt(this, W/2, y+23, `🎁  Забрать  +${gold}🪙  +${xp}⭐`, 13, '#1a1a28', true).setOrigin(0.5);
      const clZ = this.add.zone(16, y, W-32, 46).setOrigin(0).setInteractive({ useHandCursor: true });
      clZ.on('pointerdown', () => { _drawCl(true); tg?.HapticFeedback?.impactOccurred('heavy'); });
      clZ.on('pointerout',  () => _drawCl(false));
      clZ.on('pointerup',   () => {
        if (_globalCooldown('claim')) return;
        if (this._claimBusy) return;
        this._claimBusy = true;
        clZ.disableInteractive();
        clT.setText('⏳ Получаем...');
        this._claimQuest(clBg, clT, gold, xp, W, y);
      });
    } else {
      txt(this, W/2, y+14, '⚔️ Выполни задания — здесь появится кнопка сбора', 10, '#aaaacc').setOrigin(0.5);
    }

    txt(this, W/2, H-44, '🔄 Обновляется каждый день в 00:00', 9, '#555577').setOrigin(0.5);
  }

  shutdown() {
    this.time.removeAllEvents();
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
