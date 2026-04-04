/* ============================================================
   scene_extras.js — дополнительные экраны TMA:
     QuestsScene   ('Quests')     — ежедневные задания
     SummaryScene  ('Summary')    — сводка профиля
     SeasonScene   ('Season')     — таблица лидеров сезона
     BattlePassScene ('BattlePass') — прогресс Battle Pass
     ClanScene     ('Clan')       — клан
     ShopScene     ('Shop')       — магазин
   ============================================================ */

/* ─────────────────────────────────────────────────────────────
   Общие вспомогалки для extra-сцен
   ───────────────────────────────────────────────────────────── */
function _extraBg(scene, W, H) {
  const g = scene.add.graphics();
  g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
  g.fillRect(0, 0, W, H);
  g.lineStyle(1, C.blue, 0.03);
  for (let x = 0; x < W; x += 32) g.lineBetween(x, 0, x, H);
  for (let y = 0; y < H; y += 32) g.lineBetween(0, y, W, y);
}

function _extraBack(scene, W, H, dest = 'Menu') {
  const bw = 90, bh = 36, bx = 16, by = H - 58;
  const bg = scene.add.graphics();
  bg.fillStyle(C.dark, 0.9);
  bg.fillRoundedRect(bx, by, bw, bh, 10);
  bg.lineStyle(1.5, C.blue, 0.4);
  bg.strokeRoundedRect(bx, by, bw, bh, 10);
  txt(scene, bx + bw / 2, by + bh / 2, '← Назад', 13, '#8888aa').setOrigin(0.5);
  scene.add.zone(bx, by, bw, bh).setOrigin(0)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x1c1a2c, 0.9); bg.fillRoundedRect(bx, by, bw, bh, 10); })
    .on('pointerup',   () => { tg?.HapticFeedback?.impactOccurred('light'); scene.scene.start(dest); })
    .on('pointerout',  () => { bg.clear(); bg.fillStyle(C.dark, 0.9); bg.fillRoundedRect(bx, by, bw, bh, 10); bg.lineStyle(1.5, C.blue, 0.4); bg.strokeRoundedRect(bx, by, bw, bh, 10); });
}

function _extraHeader(scene, W, icon, title, sub) {
  makePanel(scene, 8, 8, W - 16, 64, 12);
  txt(scene, 20, 22, icon + '  ' + title, 16, '#ffc83c', true);
  txt(scene, 20, 44, sub, 11, '#555577');
}

/* ═══════════════════════════════════════════════════════════
   QUESTS SCENE — ежедневные задания + логин-бонус
   ═══════════════════════════════════════════════════════════ */
class QuestsScene extends Phaser.Scene {
  constructor() { super('Quests'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '📅', 'ЗАДАНИЯ', 'Ежедневные квесты и бонусы');
    _extraBack(this, W, H);
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#555577').setOrigin(0.5);
    get('/api/quests').then(d => this._render(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _render(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }

    const q = data.quest || {};
    const d = data.daily || {};
    let y = 84;

    /* ══ БЛОК 1: Ежедневный логин-бонус ══════════════════════ */
    y = this._buildDailyBonus(d, W, y);
    y += 14;

    /* ══ БЛОК 2: Квест дня ════════════════════════════════════ */
    this._buildDailyQuest(q, W, y, H);
  }

  /* ── Логин-бонус ─────────────────────────────────────────── */
  _buildDailyBonus(d, W, y) {
    const canClaim = d.can_claim;
    const streak   = d.streak || 0;
    const bonus    = d.bonus  || 20;
    const bh       = 88;

    const bg = this.add.graphics();
    bg.fillStyle(canClaim ? 0x1a2810 : C.bgPanel, 0.95);
    bg.fillRoundedRect(8, y, W-16, bh, 12);
    bg.lineStyle(2, canClaim ? C.green : C.dark, canClaim ? 0.8 : 0.3);
    bg.strokeRoundedRect(8, y, W-16, bh, 12);

    // Иконка + заголовок
    txt(this, 20, y + 12, '🎁', 22);
    txt(this, 52, y + 12, 'Ежедневный бонус', 13, canClaim ? '#3cc864' : '#8888aa', true);
    txt(this, 52, y + 32, `Серия: ${streak} ${streak >= 7 ? '🔥' : '📅'} дней`, 10, '#555577');

    // Прогресс серии (7 дней)
    const dotW = (W - 80) / 7;
    for (let i = 0; i < 7; i++) {
      const dx   = 52 + i * dotW;
      const done = i < (streak % 7 || (streak > 0 && streak % 7 === 0 ? 7 : 0));
      const dg   = this.add.graphics();
      dg.fillStyle(done ? C.gold : C.dark, 1);
      dg.fillRoundedRect(dx, y + 50, dotW - 4, 10, 4);
      if (i === (streak % 7 === 0 && streak > 0 ? 6 : streak % 7) - 1 && done) {
        dg.lineStyle(1.5, C.gold, 0.8);
        dg.strokeRoundedRect(dx, y + 50, dotW - 4, 10, 4);
      }
      const dayN = i + 1;
      txt(this, dx + (dotW-4)/2, y + 66, String(dayN), 7,
        done ? '#ffc83c' : '#333355').setOrigin(0.5);
    }

    // Кнопка забрать
    if (canClaim) {
      const btnW = 110, btnH = 30, btnX = W - 126, btnY = y + 14;
      const btnG = this.add.graphics();
      btnG.fillStyle(C.green, 1);
      btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 9);
      const btnT = txt(this, btnX + btnW/2, btnY + btnH/2,
        `Забрать  🪙${bonus}`, 11, '#1a1a28', true).setOrigin(0.5);
      this.add.zone(btnX, btnY, btnW, btnH).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { btnG.clear(); btnG.fillStyle(0x28a050,1); btnG.fillRoundedRect(btnX,btnY,btnW,btnH,9); tg?.HapticFeedback?.impactOccurred('medium'); })
        .on('pointerup',  () => this._claimDaily(btnG, btnT, btnX, btnY, btnW, btnH))
        .on('pointerout', () => { btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(btnX,btnY,btnW,btnH,9); });
    } else {
      txt(this, W - 30, y + bh/2, '✅', 18).setOrigin(1, 0.5);
    }

    return y + bh;
  }

  /* ── Квест дня ───────────────────────────────────────────── */
  _buildDailyQuest(q, W, y, H) {
    const battles  = q.battles_played || 0;
    const wins     = q.battles_won    || 0;
    const claimed  = q.reward_claimed || false;
    const done     = q.is_completed   || false;

    /* Блок заголовка */
    txt(this, 16, y, 'КВЕСТ ДНЯ', 11, '#555577', true);
    y += 20;

    /* Карточки заданий */
    const tasks = [
      {
        icon: '⚔️', label: 'Сыграй 3 боя',
        cur: battles, max: 3,
        done: battles >= 3,
        color: C.blue,
      },
      {
        icon: '🏆', label: 'Одержи 1 победу',
        cur: wins, max: 1,
        done: wins >= 1,
        color: C.gold,
      },
    ];

    tasks.forEach((task, i) => {
      const th = 70, tx = 8, tw = W - 16, ty2 = y + i * (th + 10);
      const bg = this.add.graphics();
      bg.fillStyle(task.done ? 0x0e1e10 : C.bgPanel, 0.92);
      bg.fillRoundedRect(tx, ty2, tw, th, 12);
      bg.lineStyle(2, task.done ? task.color : C.dark, task.done ? 0.7 : 0.25);
      bg.strokeRoundedRect(tx, ty2, tw, th, 12);

      // Иконка
      txt(this, tx + 20, ty2 + th/2, task.icon, 24).setOrigin(0.5);

      // Название + прогресс
      txt(this, tx + 44, ty2 + 14, task.label, 13,
        task.done ? '#3cc864' : '#c0c0e0', task.done);
      txt(this, tx + 44, ty2 + 34, `${Math.min(task.cur, task.max)} / ${task.max}`,
        11, task.done ? task.color : '#555577', true);

      // Прогресс-бар
      makeBar(this, tx + 44, ty2 + 52, tw - 110, 6,
        Math.min(1, task.cur / task.max), task.color, C.dark, 3);

      // Галочка или замок
      txt(this, tw - 6, ty2 + th/2, task.done ? '✅' : '🔒', 18).setOrigin(1, 0.5);
    });

    y += tasks.length * 80 + 10;

    /* Награда */
    const rewardY = y;
    makePanel(this, 8, rewardY, W-16, 58, 12);
    txt(this, W/2, rewardY + 14, '🎁 Награда за квест', 12, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, rewardY + 34, '🪙 40 золота  +  💎 1 кристалл', 11, '#c0c0e0').setOrigin(0.5);

    /* Кнопка забрать / статус */
    const btnY2  = rewardY + 66;
    if (claimed) {
      txt(this, W/2, btnY2 + 20, '✅ Награда уже получена сегодня', 12, '#3cc864').setOrigin(0.5);
    } else if (done) {
      const clBg = this.add.graphics();
      clBg.fillStyle(C.gold, 1);
      clBg.fillRoundedRect(20, btnY2, W-40, 44, 12);
      // Блик
      clBg.fillStyle(0xffffff, 0.12);
      clBg.fillRoundedRect(22, btnY2+2, W-44, 20, 9);
      const clT = txt(this, W/2, btnY2+22, '🎁  Забрать награду!', 15, '#1a1a28', true).setOrigin(0.5);
      this.add.zone(20, btnY2, W-40, 44).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { clBg.clear(); clBg.fillStyle(0xcc9000,1); clBg.fillRoundedRect(20,btnY2,W-40,44,12); tg?.HapticFeedback?.impactOccurred('heavy'); })
        .on('pointerup',  () => this._claimQuest(clBg, clT))
        .on('pointerout', () => { clBg.clear(); clBg.fillStyle(C.gold,1); clBg.fillRoundedRect(20,btnY2,W-40,44,12); clBg.fillStyle(0xffffff,0.12); clBg.fillRoundedRect(22,btnY2+2,W-44,20,9); });
    } else {
      txt(this, W/2, btnY2 + 16, '⚔️ Выполни задания чтобы забрать награду', 10, '#555577').setOrigin(0.5);
    }

    /* Сброс квеста */
    const resetH = H - 100;
    txt(this, W/2, resetH, '🔄 Квест обновляется каждый день в 00:00', 10, '#666688').setOrigin(0.5);
  }

  /* ── Получить ежедневный бонус ─────────────────────────── */
  async _claimDaily(btnG, btnT, bx, by, bw, bh) {
    btnT.setText('...');
    try {
      const res = await post('/api/daily/claim');
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.buy();
        if (res.player) State.player = res.player;
        this._toast(`🎁 Ежедневный бонус: +${res.bonus} 🪙`);
        this.time.delayedCall(600, () => this.scene.restart());
      } else {
        btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by,bw,bh,9);
        btnT.setText(res.reason || 'Уже получено');
      }
    } catch(_) {
      btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by,bw,bh,9);
      btnT.setText('Ошибка');
    }
  }

  /* ── Получить награду за квест ────────────────────────── */
  async _claimQuest(clBg, clT) {
    clT.setText('...');
    try {
      const res = await post('/api/quests/claim');
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.questDone();
        if (res.player) State.player = res.player;
        this._toast(`🏆 +${res.gold} 🪙  +${res.diamonds} 💎 — квест выполнен!`);
        this.time.delayedCall(700, () => this.scene.restart());
      } else {
        clT.setText(res.reason || 'Ошибка');
        this.time.delayedCall(1500, () => clT.setText('🎁  Забрать награду!'));
      }
    } catch(_) {
      clT.setText('❌ Нет соединения');
    }
  }

  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 80, msg, 13, '#ffc83c', true).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, duration: 2500, onComplete: () => t.destroy() });
  }
}

/* ═══════════════════════════════════════════════════════════
   SUMMARY SCENE — полная сводка профиля
   ═══════════════════════════════════════════════════════════ */
class SummaryScene extends Phaser.Scene {
  constructor() { super('Summary'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);

    const p = State.player;
    if (!p) { this.scene.start('Menu'); return; }

    _extraHeader(this, W, '📋', 'СВОДКА', `@${p.username}  ·  Уровень ${p.level}`);

    const total  = (p.wins || 0) + (p.losses || 0);
    const wr     = total > 0 ? Math.round(p.wins / total * 100) : 0;
    const scroll = this.add.container(0, 0);
    let y = 88;

    /* ── Основные числа ── */
    const statCards = [
      { label: '⭐ Рейтинг',    value: p.rating || 0,   color: '#ffc83c' },
      { label: '💎 Кристаллы', value: p.diamonds || 0,  color: '#3cc8dc' },
      { label: '🥇 Победы',    value: p.wins || 0,       color: '#3cc864' },
      { label: '💀 Поражения', value: p.losses || 0,     color: '#dc3c46' },
      { label: '⚔️ Боёв всего',value: total,             color: '#8888aa' },
      { label: '🎯 Винрейт',   value: `${wr}%`,          color: wr > 50 ? '#3cc864' : '#dc3c46' },
    ];

    const cw = (W - 40) / 2, ch = 56;
    statCards.forEach((s, i) => {
      const cx = 16 + (i % 2) * (cw + 8);
      const cy = y + Math.floor(i / 2) * (ch + 8);
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.92);
      bg.fillRoundedRect(cx, cy, cw, ch, 10);
      bg.lineStyle(1, C.dark, 0.8);
      bg.strokeRoundedRect(cx, cy, cw, ch, 10);
      scroll.add(bg);
      scroll.add(txt(this, cx + 8, cy + 8,  s.label, 10, '#8888aa'));
      scroll.add(txt(this, cx + 8, cy + 28, String(s.value), 16, s.color, true));
    });
    y += Math.ceil(statCards.length / 2) * (ch + 8) + 12;

    /* ── Характеристики персонажа ── */
    scroll.add(txt(this, 16, y, 'ХАРАКТЕРИСТИКИ', 11, '#555577', true));
    y += 20;
    const attrs = [
      { n: 'STR', v: p.strength   || 0, color: C.red    },
      { n: 'AGI', v: p.agility    || 0, color: C.green  },
      { n: 'INT', v: p.intellect  || 0, color: C.blue   },
      { n: 'VIT', v: p.vitality   || 0, color: C.purple },
      { n: 'LCK', v: p.luck       || 0, color: C.gold   },
    ];
    attrs.forEach((a, i) => {
      const ax = 16 + i * ((W - 32) / 5);
      const aw = (W - 32) / 5 - 6;
      const maxV = 100;
      const pct  = Math.min(1, a.v / maxV);
      const bg2  = this.add.graphics();
      bg2.fillStyle(C.dark, 0.8);
      bg2.fillRoundedRect(ax, y, aw, 8, 4);
      bg2.fillStyle(a.color, 1);
      bg2.fillRoundedRect(ax, y, Math.max(8, Math.round(aw * pct)), 8, 4);
      scroll.add(bg2);
      scroll.add(txt(this, ax + aw / 2, y + 14, `${a.n} ${a.v}`, 9, '#aaaacc').setOrigin(0.5));
    });
    y += 32;

    /* ── HP / EXP ── */
    const hpPct  = (p.current_hp || 0) / Math.max(1, p.max_hp || 1);
    const expPct = (p.exp || 0) / Math.max(1, p.exp_to_next || 1);

    scroll.add(makeBar(this, 16, y,     W - 32, 12, hpPct,  C.red,  C.dark));
    scroll.add(txt(this, W / 2, y + 6, `HP ${p.current_hp || 0}/${p.max_hp || 0}`, 9, '#f0f0fa').setOrigin(0.5));
    y += 20;
    scroll.add(makeBar(this, 16, y,     W - 32, 10, expPct, C.blue, C.dark));
    scroll.add(txt(this, W / 2, y + 5, `EXP ${p.exp || 0}/${p.exp_to_next || '?'}`, 8, '#8888aa').setOrigin(0.5));
    y += 24;

    /* ── Свободные очки ── */
    if (p.free_stats > 0) {
      const fb = this.add.graphics();
      fb.fillStyle(C.gold, 0.18);
      fb.fillRoundedRect(16, y, W - 32, 38, 10);
      fb.lineStyle(1.5, C.gold, 0.5);
      fb.strokeRoundedRect(16, y, W - 32, 38, 10);
      scroll.add(fb);
      scroll.add(txt(this, W / 2, y + 19,
        `⚡ ${p.free_stats} свободных очка характеристик`, 12, '#ffc83c').setOrigin(0.5));
      y += 48;
    }

    _extraBack(this, W, H);
  }
}

/* ═══════════════════════════════════════════════════════════
   SEASON SCENE — таблица лидеров текущего сезона
   ═══════════════════════════════════════════════════════════ */
class SeasonScene extends Phaser.Scene {
  constructor() { super('Season'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '⭐', 'СЕЗОН', 'Таблица лидеров');
    _extraBack(this, W, H);

    this._loading = txt(this, W / 2, H / 2, 'Загрузка...', 14, '#555577').setOrigin(0.5);
    get('/api/season').then(d => this._render(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _render(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }
    if (!data.season) {
      txt(this, W/2, H/2, '😴 Активного сезона нет', 13, '#555577').setOrigin(0.5);
      return;
    }

    const s  = data.season;
    const lb = data.leaderboard || [];
    const me = data.my_stats;

    /* ── Инфо о сезоне ── */
    const end = s.end_date ? new Date(s.end_date).toLocaleDateString('ru') : '?';
    txt(this, W/2, 82, `${s.name || 'Сезон'}  ·  до ${end}`, 12, '#8888aa').setOrigin(0.5);

    /* ── Моя позиция ── */
    if (me) {
      const myY = 100;
      makePanel(this, 8, myY, W-16, 44, 10, 0.95);
      txt(this, 20, myY + 12, `#${data.my_pos || '?'}`, 16, '#ffc83c', true);
      txt(this, 70, myY + 10, `${me.username || 'Ты'}`, 13, '#f0f0fa', true);
      txt(this, 70, myY + 27, `🏆 ${me.season_wins || 0} побед  ·  ⭐ ${me.season_rating || 0}`, 10, '#8888aa');
    }

    /* ── Список лидеров ── */
    const listY = 155;
    txt(this, 16, listY - 18, 'ТОП ИГРОКОВ', 10, '#555577', true);
    const rowH = 38, maxShow = Math.floor((H - listY - 80) / rowH);
    lb.slice(0, maxShow).forEach((row, i) => {
      const ry    = listY + i * rowH;
      const isMy  = me && row.user_id === me.user_id;
      const bg    = this.add.graphics();
      const bgCol = isMy ? 0x1e2840 : C.bgPanel;
      bg.fillStyle(bgCol, 0.85);
      bg.fillRoundedRect(8, ry, W-16, rowH - 4, 8);
      if (isMy) { bg.lineStyle(1.5, C.blue, 0.5); bg.strokeRoundedRect(8, ry, W-16, rowH-4, 8); }

      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
      txt(this, 18,      ry + 11, medal, i < 3 ? 14 : 11, '#ffc83c').setOrigin(0);
      txt(this, 52,      ry + 8,  row.username || `User${row.user_id}`, 12, isMy ? '#5096ff' : '#c0c0e0', isMy);
      txt(this, 52,      ry + 24, `🏆 ${row.season_wins||0}W  ⭐ ${row.season_rating||0}`, 9, '#555577');
      txt(this, W - 16,  ry + 17, `${row.season_rating||0}`, 12, '#ffc83c', true).setOrigin(1, 0.5);
    });

    if (lb.length === 0) {
      txt(this, W/2, H/2, '📭 Нет данных', 13, '#555577').setOrigin(0.5);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   BATTLEPASS SCENE — прогресс Battle Pass
   ═══════════════════════════════════════════════════════════ */
class BattlePassScene extends Phaser.Scene {
  constructor() { super('BattlePass'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '🌟', 'BATTLE PASS', 'Ежесезонные награды');
    _extraBack(this, W, H);
    this._claimBtns = {};
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#555577').setOrigin(0.5);
    get('/api/battlepass').then(d => this._render(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _render(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }

    const bp    = data.bp    || {};
    const tiers = data.tiers || [];
    const battles  = bp.battles_done  || 0;
    const wins     = bp.wins_done     || 0;
    const claimed  = bp.last_claimed_tier || 0;

    txt(this, W/2, 84, `Боёв: ${battles}  ·  Побед: ${wins}`, 11, '#8888aa').setOrigin(0.5);

    const startY = 106;
    const rowH   = 66;

    tiers.forEach((tier, i) => {
      const ry      = startY + i * rowH;
      const done    = battles >= tier.battles_needed && wins >= tier.wins_needed;
      const isClaim = done && claimed < tier.tier;
      const gotIt   = claimed >= tier.tier;

      /* Фон строки */
      const bg = this.add.graphics();
      const borderCol = gotIt ? C.gold : done ? C.green : C.dark;
      bg.fillStyle(C.bgPanel, 0.92);
      bg.fillRoundedRect(8, ry, W-16, rowH-6, 10);
      bg.lineStyle(1.5, borderCol, gotIt ? 0.7 : done ? 0.5 : 0.3);
      bg.strokeRoundedRect(8, ry, W-16, rowH-6, 10);

      /* Номер тира */
      const numBg = this.add.graphics();
      numBg.fillStyle(gotIt ? C.gold : done ? C.green : C.dark, 1);
      numBg.fillCircle(28, ry + (rowH-6)/2, 16);
      txt(this, 28, ry + (rowH-6)/2, String(tier.tier), 13, gotIt||done ? '#1a1a28' : '#444466', true).setOrigin(0.5);

      /* Условие */
      const condColor = done ? '#3cc864' : '#8888aa';
      txt(this, 52, ry + 10, `⚔️ ${tier.battles_needed} боёв  /  🏆 ${tier.wins_needed} побед`, 10, condColor);

      /* Прогресс боёв */
      const bPct = Math.min(1, battles / tier.battles_needed);
      const wPct = Math.min(1, wins    / tier.wins_needed);
      const barW = W - 160;
      makeBar(this, 52, ry + 28, barW, 6, bPct, C.blue, C.dark, 3);
      makeBar(this, 52, ry + 38, barW, 6, wPct, C.gold, C.dark, 3);

      /* Награды */
      txt(this, W - 110, ry + 11, `💎 ${tier.diamonds}`, 10, '#3cc8dc');
      txt(this, W - 110, ry + 27, `🪙 ${tier.gold}`,     10, '#ffc83c');

      /* Кнопка забрать */
      if (gotIt) {
        txt(this, W - 32, ry + (rowH-6)/2, '✅', 16).setOrigin(0.5);
      } else if (isClaim) {
        const bw = 56, bh = 26, bx = W - 70, by2 = ry + (rowH-6)/2 - bh/2;
        const btnG = this.add.graphics();
        btnG.fillStyle(C.green, 1);
        btnG.fillRoundedRect(bx, by2, bw, bh, 8);
        const btnT = txt(this, bx + bw/2, by2 + bh/2, 'Взять', 11, '#1a1a28', true).setOrigin(0.5);
        this.add.zone(bx, by2, bw, bh).setOrigin(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { btnG.clear(); btnG.fillStyle(0x28a050,1); btnG.fillRoundedRect(bx,by2,bw,bh,8); })
          .on('pointerup', () => this._claimTier(tier.tier, btnG, btnT, bg, bx, by2, bw, bh, ry, rowH))
          .on('pointerout', () => { btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,8); });
      } else {
        txt(this, W - 32, ry + (rowH-6)/2, '🔒', 14).setOrigin(0.5);
      }
    });
  }

  async _claimTier(tier, btnG, btnT, bg, bx, by2, bw, bh, ry, rowH) {
    tg?.HapticFeedback?.impactOccurred('medium');
    try {
      const res = await post('/api/battlepass/claim', { tier });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        /* Перестраиваем сцену */
        this.scene.restart();
      } else {
        btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,8);
        btnT?.setText(res.reason || 'Ошибка');
        this.time.delayedCall(1500, () => { btnT?.setText('Взять'); });
      }
    } catch (_) {
      btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,8);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   CLAN SCENE — полная клановая система
   ═══════════════════════════════════════════════════════════ */
class ClanScene extends Phaser.Scene {
  constructor() { super('Clan'); }

  init(data) {
    this._subview = (data && data.sub) ? data.sub : 'main';
    this._busy = false;
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '⚔️', 'КЛАН', 'Кланы · Поиск · Рейтинг');
    _extraBack(this, W, H);
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#555577').setOrigin(0.5);
    get('/api/clan').then(d => this._route(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _route(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) {
      txt(this, W/2, H/2 - 10, '❌ Ошибка загрузки', 14, '#dc3c46').setOrigin(0.5);
      txt(this, W/2, H/2 + 14, data.reason || 'Попробуйте позже', 11, '#555577').setOrigin(0.5);
      return;
    }
    try {
      if (data.clan) {
        this._renderMyClan(data, W, H);
      } else {
        if      (this._subview === 'search') this._renderSearch(W, H);
        else if (this._subview === 'create') this._renderCreate(W, H);
        else if (this._subview === 'top')    this._renderTop(W, H);
        else                                  this._renderNoClan(W, H);
      }
    } catch(e) {
      console.error('ClanScene render error:', e);
      txt(this, W/2, H/2, '⚠️ Ошибка: ' + e.message, 11, '#dc3c46').setOrigin(0.5);
    }
  }

  /* ══ НЕТ КЛАНА ══════════════════════════════════════════ */
  _renderNoClan(W, H) {
    txt(this, W/2, 90, '🏰', 32).setOrigin(0.5);
    txt(this, W/2, 128, 'Вы не состоите в клане', 14, '#8888aa').setOrigin(0.5);
    txt(this, W/2, 150, 'Вступайте и участвуйте в клановых войнах!', 10, '#444466').setOrigin(0.5);

    const btns = [
      { label: '🔍  Найти клан',   col: C.blue,   sub: 'search' },
      { label: '➕  Создать клан', col: C.purple, sub: 'create' },
      { label: '🏆  Топ кланов',   col: C.dark,   sub: 'top', border: C.gold },
    ];
    btns.forEach((b, i) => {
      const by = 176 + i * 58, bh = 46;
      const bg = this.add.graphics();
      bg.fillStyle(b.col, b.col === C.dark ? 0.7 : 0.9);
      bg.fillRoundedRect(16, by, W-32, bh, 12);
      if (b.border) { bg.lineStyle(1.5, b.border, 0.5); bg.strokeRoundedRect(16,by,W-32,bh,12); }
      txt(this, W/2, by + bh/2, b.label, 14, '#f0f0fa', true).setOrigin(0.5);
      this.add.zone(16, by, W-32, bh).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(C.dark,1); bg.fillRoundedRect(16,by,W-32,bh,12); tg?.HapticFeedback?.impactOccurred('light'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(b.col,b.col===C.dark?0.7:0.9); bg.fillRoundedRect(16,by,W-32,bh,12); if(b.border){bg.lineStyle(1.5,b.border,0.5);bg.strokeRoundedRect(16,by,W-32,bh,12);} })
        .on('pointerup',   () => this.scene.restart({ sub: b.sub }));
    });
    txt(this, W/2, 176 + 3*58 + 6, 'Создание клана стоит 200 🪙', 9, '#333355').setOrigin(0.5);
  }

  /* ══ МОЙ КЛАН ═══════════════════════════════════════════ */
  _renderMyClan(data, W, H) {
    const clan     = data.clan;
    const members  = data.members || [];
    const isLeader = data.is_leader;
    let y = 84;

    const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');
    makePanel(this, 8, y, W-16, 72, 12);
    txt(this, 20, y+10, `[${clan.tag}]`, 15, '#ffc83c', true);
    txt(this, 20, y+30, trunc(clan.name, 22), 16, '#f0f0fa', true);
    txt(this, 20, y+50, `👥 ${members.length}/20  ·  🏆 ${clan.wins} побед  ·  Ур.${clan.level}`, 10, '#8888aa');
    if (isLeader) txt(this, W-20, y+18, '👑 Лидер', 10, '#ffc83c', true).setOrigin(1,0);
    y += 82;

    txt(this, 16, y, 'УЧАСТНИКИ', 10, '#555577', true);
    y += 18;

    const rowH   = 36;
    const maxShow = Math.min(members.length, Math.floor((H - y - 100) / rowH));
    members.slice(0, maxShow).forEach((m, i) => {
      const ry = y + i * rowH;
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.7); bg.fillRoundedRect(8, ry, W-16, rowH-3, 7);
      txt(this, 18, ry+8,  m.role === 'leader' ? '👑' : '⚔️', 14);
      txt(this, 40, ry+8,  trunc(m.username || `User${m.user_id}`, 18), 12,
        m.role === 'leader' ? '#ffc83c' : '#c0c0e0', m.role === 'leader');
      txt(this, 40, ry+22, `Ур.${m.level}  ·  ${m.wins} побед`, 9, '#555577');
      txt(this, W-16, ry+18, m.role === 'leader' ? 'Лидер' : 'Участник', 9, '#444466').setOrigin(1,0.5);
    });
    if (members.length > maxShow)
      txt(this, W/2, y + maxShow*rowH + 4, `+${members.length - maxShow} ещё`, 9, '#333355').setOrigin(0.5);

    if (!isLeader) {
      const by2 = H - 104;
      const bg2 = this.add.graphics();
      bg2.fillStyle(C.dark, 0.8); bg2.fillRoundedRect(16, by2, W-32, 38, 10);
      bg2.lineStyle(1.5, C.red, 0.5); bg2.strokeRoundedRect(16, by2, W-32, 38, 10);
      txt(this, W/2, by2+19, '🚪 Покинуть клан', 13, '#cc4444', true).setOrigin(0.5);
      this.add.zone(16, by2, W-32, 38).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerup', () => this._leaveClan());
    } else {
      txt(this, W/2, H-104, '👑 Вы лидер — передайте роль чтобы выйти', 9, '#333355').setOrigin(0.5);
    }
  }

  /* ══ ПОИСК ═══════════════════════════════════════════════ */
  _renderSearch(W, H) {
    txt(this, W/2, 84, '🔍 ПОИСК КЛАНА', 14, '#ffc83c', true).setOrigin(0.5);
    this._inputEl = this._makeInput(W, 104, W-32, 36, 'Имя или тег клана...');

    const sbG = this.add.graphics();
    sbG.fillStyle(C.blue, 0.9); sbG.fillRoundedRect(16, 148, W-32, 38, 10);
    txt(this, W/2, 167, '🔍 Найти', 13, '#ffffff', true).setOrigin(0.5);
    this.add.zone(16, 148, W-32, 38).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._doSearch(W));

    this._resultsY = 198;
    this._resultsContainer = this.add.container(0, 0);
    get('/api/clan/top').then(d => this._showSearchResults(d.clans || [], W));
  }

  _makeInput(W, y, w, h, placeholder, maxLen = 20) {
    const el = document.createElement('input');
    el.type = 'text'; el.placeholder = placeholder; el.maxLength = maxLen;
    const left = Math.round((window.innerWidth - w) / 2);
    const top  = Math.round(y + (window.innerHeight - this.H) / 2);
    el.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:${w}px;height:${h}px;
      padding:0 10px;background:#1e1c30;color:#f0f0fa;border:1.5px solid #5096ff55;
      border-radius:9px;font-size:14px;outline:none;z-index:999;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
    document.body.appendChild(el);
    this.events.once('shutdown', () => el.remove());
    this.events.once('destroy',  () => el.remove());
    return el;
  }

  async _doSearch(W) {
    if (this._busy) return;
    this._busy = true;
    const q = this._inputEl?.value?.trim() || '';
    try {
      const d = await get('/api/clan/search', { q });
      this._showSearchResults(d.clans || [], W);
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  _showSearchResults(clans, W) {
    this._resultsContainer?.removeAll(true);
    const y0 = this._resultsY || 198;
    if (!clans.length) {
      this._resultsContainer.add(txt(this, W/2, y0+20, '😔 Ничего не найдено', 12, '#555577').setOrigin(0.5));
      return;
    }
    clans.forEach((c, i) => {
      const ry = y0 + i * 48;
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.9); bg.fillRoundedRect(8, ry, W-16, 44, 10);
      bg.lineStyle(1, C.dark, 0.6); bg.strokeRoundedRect(8, ry, W-16, 44, 10);
      const joinG = this.add.graphics();
      joinG.fillStyle(C.green, 0.85); joinG.fillRoundedRect(W-74, ry+8, 60, 28, 8);
      const joinT = txt(this, W-44, ry+22, 'Вступить', 10, '#1a1a28', true).setOrigin(0.5);
      this._resultsContainer.add([
        bg,
        txt(this, 18, ry+8,  `[${c.tag}]`, 12, '#ffc83c', true),
        txt(this, 18, ry+26, (s => s.length > 20 ? s.slice(0,20)+'…' : s)(c.name||''), 11, '#c0c0e0'),
        txt(this, W-82, ry+8,  `👥 ${c.member_count}/20`, 9, '#555577'),
        txt(this, W-82, ry+26, `🏆 ${c.wins}`, 9, '#ffc83c'),
        joinG, joinT,
        this.add.zone(W-74, ry+8, 60, 28).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { joinG.clear(); joinG.fillStyle(0x28a050,1); joinG.fillRoundedRect(W-74,ry+8,60,28,8); tg?.HapticFeedback?.impactOccurred('medium'); })
          .on('pointerout',  () => { joinG.clear(); joinG.fillStyle(C.green,0.85); joinG.fillRoundedRect(W-74,ry+8,60,28,8); })
          .on('pointerup',   () => this._joinClan(c.id, c.name, joinT)),
      ]);
    });
  }

  /* ══ СОЗДАНИЕ ════════════════════════════════════════════ */
  _renderCreate(W, H) {
    txt(this, W/2, 84, '➕ СОЗДАТЬ КЛАН', 14, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, 104, 'Стоимость: 200 🪙', 11, '#8888aa').setOrigin(0.5);

    makePanel(this, 8, 118, W-16, 128, 12);
    txt(this, 20, 128, 'Название клана (3–20 символов):', 10, '#8888aa');
    this._nameEl = this._makeInput(W, 144, W-32, 36, 'Например: Железный Кулак', 20);
    txt(this, 20, 192, 'Тег (2–4 символа):', 10, '#8888aa');
    this._tagEl  = this._makeInput(W, 208, (W-32)/2, 34, 'ЖК', 4);

    const btnY = 262;
    const bgC  = this.add.graphics();
    bgC.fillStyle(C.purple, 0.9); bgC.fillRoundedRect(16, btnY, W-32, 46, 12);
    bgC.fillStyle(0xffffff, 0.07); bgC.fillRoundedRect(18, btnY+2, W-36, 20, 9);
    const btnT = txt(this, W/2, btnY+23, '⚔️  Основать клан  (200 🪙)', 13, '#ffffff', true).setOrigin(0.5);
    this.add.zone(16, btnY, W-32, 46).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bgC.clear(); bgC.fillStyle(0x6600cc,1); bgC.fillRoundedRect(16,btnY,W-32,46,12); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  () => { bgC.clear(); bgC.fillStyle(C.purple,0.9); bgC.fillRoundedRect(16,btnY,W-32,46,12); })
      .on('pointerup',   () => this._doCreate(btnT));

    txt(this, W/2, btnY+56, 'Максимум 20 участников · Имя и тег должны быть уникальны', 9, '#333355').setOrigin(0.5);
  }

  /* ══ ТОП КЛАНОВ ══════════════════════════════════════════ */
  _renderTop(W, H) {
    txt(this, W/2, 84, '🏆 ТОП КЛАНОВ', 14, '#ffc83c', true).setOrigin(0.5);
    const load2 = txt(this, W/2, 130, 'Загрузка...', 12, '#555577').setOrigin(0.5);
    get('/api/clan/top').then(d => {
      load2.destroy();
      const clans = d.clans || [];
      if (!clans.length) { txt(this, W/2, 130, '😔 Кланов пока нет', 12, '#555577').setOrigin(0.5); return; }
      let y = 108;
      clans.slice(0, Math.floor((H - 160) / 46)).forEach((c, i) => {
        const isTop = i < 3;
        const bg = this.add.graphics();
        bg.fillStyle(isTop ? 0x1a1808 : C.bgPanel, 0.9); bg.fillRoundedRect(8, y, W-16, 42, 9);
        if (isTop) { bg.lineStyle(1.5, C.gold, 0.5); bg.strokeRoundedRect(8,y,W-16,42,9); }
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
        txt(this, 18, y+11, medal, isTop?15:11, '#ffc83c');
        const ttr = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');
        txt(this, 44, y+8,  `[${c.tag}] ${ttr(c.name, 18)}`, 12, isTop?'#ffc83c':'#c0c0e0', isTop);
        txt(this, 44, y+24, `🏆 ${c.wins} побед  ·  👥 ${c.member_count}`, 9, '#555577');
        txt(this, W-16, y+21, `Ур.${c.level}`, 10, '#8888aa').setOrigin(1,0.5);
        y += 46;
      });
    }).catch(() => load2.setText('❌ Ошибка'));
  }

  /* ══ ДЕЙСТВИЯ ════════════════════════════════════════════ */
  async _joinClan(clanId, clanName, btnT) {
    if (this._busy) return; this._busy = true;
    btnT?.setText('...');
    try {
      const res = await post('/api/clan/join', { clan_id: clanId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success'); Sound.questDone();
        if (res.player) State.player = res.player;
        this._toast(`⚔️ Вы вступили в клан ${clanName}!`);
        this.time.delayedCall(700, () => this.scene.restart());
      } else { this._toast(`❌ ${res.reason}`); btnT?.setText('Вступить'); }
    } catch(_) { this._toast('❌ Нет соединения'); btnT?.setText('Вступить'); }
    this._busy = false;
  }

  async _doCreate(btnT) {
    if (this._busy) return;
    const name = this._nameEl?.value?.trim() || '';
    const tag  = this._tagEl?.value?.trim()  || '';
    if (name.length < 3) { this._toast('❌ Название минимум 3 символа'); return; }
    if (tag.length  < 2) { this._toast('❌ Тег минимум 2 символа'); return; }
    this._busy = true; btnT?.setText('Создаём...');
    try {
      const res = await post('/api/clan/create', { name, tag });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success'); Sound.levelUp();
        if (res.player) State.player = res.player;
        this._toast(`🏰 Клан [${res.tag}] ${res.name} основан!`);
        this.time.delayedCall(700, () => this.scene.restart());
      } else { this._toast(`❌ ${res.reason}`); btnT?.setText('⚔️  Основать клан  (200 🪙)'); }
    } catch(_) { this._toast('❌ Нет соединения'); btnT?.setText('⚔️  Основать клан  (200 🪙)'); }
    this._busy = false;
  }

  async _leaveClan() {
    if (this._busy) return; this._busy = true;
    try {
      const res = await post('/api/clan/leave');
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (res.player) State.player = res.player;
        this._toast('🚪 Вы покинули клан');
        this.time.delayedCall(600, () => this.scene.restart());
      } else { this._toast(`❌ ${res.reason}`); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  _toast(msg) {
    const t = txt(this, this.W/2, this.H-80, msg, 12, '#ffc83c', true).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y-36, duration: 2400, onComplete: () => t.destroy() });
  }
}

/* ═══════════════════════════════════════════════════════════
   SHOP SCENE — магазин с реальными покупками
   ═══════════════════════════════════════════════════════════ */
class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) {
    // Сохраняем активную вкладку при рестарте сцены
    this._tab = (data && data.tab) ? data.tab : (ShopScene._lastTab || 'potions');
    ShopScene._lastTab = this._tab;
    this._cryptoAsset  = (data && data.asset) ? data.asset : (ShopScene._lastAsset || 'TON');
    ShopScene._lastAsset = this._cryptoAsset;
    this._buying = false;
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;

    _extraBg(this, W, H);
    _extraHeader(this, W, '🛍️', 'МАГАЗИН', 'Зелья · Снаряжение · Особые');
    _extraBack(this, W, H);

    this._buildTabBar(W, H);
    this._buildBalance(W);
    this._buildItems(W, H);
  }

  /* ── Вкладки ─────────────────────────────────────────── */
  _buildTabBar(W, H) {
    const tabs = [
      { key: 'potions', label: '🧪 Зелья'    },
      { key: 'gear',    label: '🛡️ Снаряж.'  },
      { key: 'special', label: '✨ Особые'    },
      { key: 'topup',   label: '💎 Купить'    },
    ];
    const tw = (W - 24) / tabs.length;
    const ty = 76;
    tabs.forEach((tab, i) => {
      const tx     = 12 + i * tw;
      const active = tab.key === this._tab;
      const isTopup = tab.key === 'topup';
      const bg = this.add.graphics();
      bg.fillStyle(active ? (isTopup ? 0x1a5c8a : C.blue) : C.dark, active ? 0.92 : 0.55);
      bg.fillRoundedRect(tx, ty, tw - 4, 30, 8);
      if (active) {
        bg.lineStyle(1.5, isTopup ? 0x3cc8dc : C.blue, 0.6);
        bg.strokeRoundedRect(tx, ty, tw - 4, 30, 8);
      }
      if (isTopup && !active) {
        bg.lineStyle(1, 0x1a4055, 0.7);
        bg.strokeRoundedRect(tx, ty, tw - 4, 30, 8);
      }
      txt(this, tx + (tw - 4) / 2, ty + 15, tab.label, 9,
        active ? '#ffffff' : (isTopup ? '#3cc8dc' : '#8888aa'), active).setOrigin(0.5);
      this.add.zone(tx, ty, tw - 4, 30).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this._tab === tab.key) return;
          tg?.HapticFeedback?.selectionChanged();
          this.scene.restart({ tab: tab.key });
        });
    });
  }

  /* ── Баланс ──────────────────────────────────────────── */
  _buildBalance(W) {
    const p   = State.player;
    const by  = 114;
    makePanel(this, 8, by, W - 16, 38, 8, 0.95);

    const isTopup = this._tab === 'topup';

    this._goldTxt = txt(this, W / 2 + 8, by + 11, `🪙 ${p?.gold || 0}`,
      isTopup ? 11 : 13, '#ffc83c', true).setOrigin(0, 0);
    this._diaТxt  = txt(this, 20, by + 11, `💎 ${p?.diamonds || 0}`,
      isTopup ? 15 : 13, isTopup ? '#3cc8dc' : '#3cc8dc', true);

    if (isTopup) {
      txt(this, W - 14, by + 11, 'Ваши алмазы', 9, '#555577').setOrigin(1, 0);
    } else {
      txt(this, W / 2 - 8, by + 11, '|', 13, '#333355').setOrigin(1, 0);
    }
  }

  /* ── Товары ──────────────────────────────────────────── */
  _buildItems(W, H) {
    if (this._tab === 'topup') {
      this._buildTopupPanel(W, H);
      return;
    }
    const items = this._getItems();
    const cols  = 2;
    const iw    = (W - 32) / cols;
    const ih    = 110;
    const startY = 162;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ix  = 8 + col * (iw + 8);
      const iy  = startY + row * (ih + 10);

      this._makeItemCard(item, ix, iy, iw, ih, W);
    });
  }

  /* ── Вкладка "💎 Купить" ─────────────────────────────── */
  async _buildTopupPanel(W, H) {
    let d;
    try {
      d = await get('/api/shop/packages');
    } catch(_) {
      txt(this, W/2, H/2, '❌ Нет соединения', 13, '#dc3c46').setOrigin(0.5);
      return;
    }

    const starsPkgs  = d.stars  || [];
    const cryptoPkgs = d.crypto || [];
    const cryptoOn   = d.cryptopay_enabled;
    let y = 162;

    /* ═══ PREMIUM СТАТУС ════════════════════════════════════ */
    const p = State.player;
    if (p?.is_premium) {
      const sb = this.add.graphics();
      sb.fillStyle(0x1a0a30, 0.95); sb.fillRoundedRect(8, y, W-16, 32, 9);
      sb.lineStyle(2, C.purple, 0.7); sb.strokeRoundedRect(8, y, W-16, 32, 9);
      txt(this, 20, y+10, '👑 Premium активен', 12, '#c8a0ff', true);
      txt(this, W-14, y+10, `ещё ${p.premium_days_left} дн.`, 11, '#8888aa').setOrigin(1, 0);
      y += 40;
    }

    /* ═══ TELEGRAM STARS ═══════════════════════════════════ */
    makePanel(this, 8, y, W-16, 22, 8, 0.6);
    txt(this, 20, y+5, '⭐  TELEGRAM STARS', 10, '#ffc83c', true);
    txt(this, W-12, y+5, 'мгновенно', 9, '#555577').setOrigin(1, 0);
    y += 30;

    // Обычные пакеты (d100, d300, d500)
    const pkgMain = starsPkgs.filter(p => p.id !== 'premium');
    const pkgW = (W - 32) / pkgMain.length;
    pkgMain.forEach((pkg, i) => {
      const px = 8 + i * (pkgW + 8/pkgMain.length);
      this._makeStarsCard(pkg, px, y, pkgW - 4, 80, W);
    });
    y += 90;

    // Premium подписка — во всю ширину
    const premPkg = starsPkgs.find(p => p.id === 'premium');
    if (premPkg) {
      this._makePremiumCard(premPkg, 8, y, W-16, 52, W);
      y += 62;
    }

    /* ═══ CRYPTOPAY (TON / USDT) ════════════════════════════ */
    y += 6;
    makePanel(this, 8, y, W-16, 22, 8, 0.6);
    txt(this, 20, y+5, '💎  CRYPTOPAY', 10, '#3cc8dc', true);
    txt(this, W-12, y+5, cryptoOn ? 'TON · USDT' : 'не настроен', 9,
      cryptoOn ? '#555577' : '#553333').setOrigin(1, 0);
    y += 30;

    if (!cryptoOn) {
      const cg = this.add.graphics();
      cg.fillStyle(C.bgPanel, 0.6); cg.fillRoundedRect(8, y, W-16, 56, 10);
      txt(this, W/2, y+18, '⚙️ CryptoPay не подключён', 11, '#555577').setOrigin(0.5);
      txt(this, W/2, y+36, 'Нужна переменная CRYPTOPAY_TOKEN', 9, '#333355').setOrigin(0.5);
      return;
    }

    // Переключатель TON / USDT
    const assetBtns = ['TON', 'USDT'];
    const abW = (W - 32) / 2;
    assetBtns.forEach((asset, i) => {
      const ax = 8 + i * (abW + 8);
      const active = (this._cryptoAsset || 'TON') === asset;
      const abg = this.add.graphics();
      abg.fillStyle(active ? 0x1a4055 : C.dark, active ? 0.95 : 0.55);
      abg.fillRoundedRect(ax, y, abW, 28, 7);
      if (active) { abg.lineStyle(1.5, 0x3cc8dc, 0.6); abg.strokeRoundedRect(ax, y, abW, 28, 7); }
      const icon = asset === 'TON' ? '💎' : '💵';
      txt(this, ax + abW/2, y+14, `${icon} ${asset}`, 11, active ? '#3cc8dc' : '#8888aa', active).setOrigin(0.5);
      this.add.zone(ax, y, abW, 28).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if ((this._cryptoAsset||'TON') === asset) return;
          tg?.HapticFeedback?.selectionChanged();
          this.scene.restart({ tab: 'topup', asset });
        });
    });
    y += 36;

    // Обычные пакеты (без Premium)
    const cpMain = cryptoPkgs.filter(p => !p.premium);
    const cpW = (W - 32) / cpMain.length;
    cpMain.forEach((pkg, i) => {
      const px = 8 + i * (cpW + 8/cpMain.length);
      this._makeCryptoCard(pkg, px, y, cpW - 4, 80, W);
    });
    y += 90;

    // Premium за крипту — во всю ширину
    const cpPrem = cryptoPkgs.find(p => p.premium);
    if (cpPrem) {
      this._makeCryptoPremiumCard(cpPrem, 8, y, W-16, 52, W);
      y += 62;
    }

    y += 4;
    // Подсказка про подтверждение
    txt(this, W/2, y+4, '💡 После оплаты алмазы придут автоматически', 9, '#555577').setOrigin(0.5);

    // Кнопка "Проверить оплату" — если есть pending инвойс в localStorage
    const pendingId = parseInt(localStorage.getItem('cryptoPendingInvoice') || '0');
    if (pendingId) {
      y += 20;
      const checkG = this.add.graphics();
      checkG.fillStyle(0x1a4055, 0.9); checkG.fillRoundedRect(8, y, W-16, 36, 9);
      checkG.lineStyle(1.5, 0x3cc8dc, 0.5); checkG.strokeRoundedRect(8, y, W-16, 36, 9);
      const checkT = txt(this, W/2, y+18, '🔄 Проверить оплату', 12, '#3cc8dc', true).setOrigin(0.5);
      this.add.zone(8, y, W-16, 36).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { checkG.clear(); checkG.fillStyle(0x0a2535,1); checkG.fillRoundedRect(8,y,W-16,36,9); })
        .on('pointerup', () => {
          checkT.setText('⏳ Проверяем...');
          this._checkPendingInvoice(pendingId);
        });
    }
  }

  /* ── Stars карточка ──────────────────────────────────── */
  _makeStarsCard(pkg, ix, iy, iw, ih, W) {
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1808, 0.92); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(1.5, 0xffc83c, 0.4); bg.strokeRoundedRect(ix, iy, iw, ih, 11);

    txt(this, ix+iw/2, iy+14, '💎', 20).setOrigin(0.5);
    txt(this, ix+iw/2, iy+36, `${pkg.diamonds}`, 15, '#f0f0fa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+53, 'алмазов', 8, '#8888aa').setOrigin(0.5);

    const btnG = this.add.graphics();
    btnG.fillStyle(0xffa000, 0.9); btnG.fillRoundedRect(ix+4, iy+62, iw-8, 13, 5);
    txt(this, ix+iw/2, iy+68, `⭐ ${pkg.stars}`, 9, '#1a1a28', true).setOrigin(0.5);

    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x2a2414, 1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('medium'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a1808,0.92); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(1.5,0xffc83c,0.4); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
      .on('pointerup',   () => this._buyStars(pkg));
  }

  /* ── Premium карточка ────────────────────────────────── */
  _makePremiumCard(pkg, ix, iy, iw, ih, W) {
    const p = State.player || {};
    const isActive = !!p.is_premium;
    const daysLeft = p.premium_days_left || 0;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a30, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, isActive ? 0xb45aff : C.purple, isActive ? 1.0 : 0.7);
    bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    bg.fillStyle(0xffffff, 0.04); bg.fillRoundedRect(ix+2, iy+2, iw-4, ih/2, 9);

    txt(this, ix+20, iy+ih/2-2, '👑', 20).setOrigin(0, 0.5);
    txt(this, ix+50, iy+ih/2-8, 'Premium подписка', 12, '#c8a0ff', true);
    if (isActive) {
      txt(this, ix+50, iy+ih/2+8, `✅ Активна · ${daysLeft} дн.`, 9, '#b45aff');
      txt(this, iw-4, iy+ih/2-2, '— куплено —', 10, '#888899', false).setOrigin(1, 0.5);
    } else {
      txt(this, ix+50, iy+ih/2+8, 'Эксклюзивные функции', 9, '#8888aa');
      txt(this, iw-4, iy+ih/2-2, `⭐ ${pkg.stars}`, 12, '#ffc83c', true).setOrigin(1, 0.5);
      this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x2a0a40,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('heavy'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a0a30,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(2,C.purple,0.7); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
        .on('pointerup',   () => this._buyStars(pkg));
    }
  }

  /* ── CryptoPay Premium карточка ─────────────────────── */
  _makeCryptoPremiumCard(pkg, ix, iy, iw, ih, W) {
    const asset  = this._cryptoAsset || 'TON';
    const price  = asset === 'TON' ? pkg.ton : pkg.usdt;
    const symbol = asset === 'TON' ? 'TON' : 'USDT';
    const p = State.player || {};
    const isActive = !!p.is_premium;
    const daysLeft = p.premium_days_left || 0;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a30, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, isActive ? 0xb45aff : C.purple, isActive ? 1.0 : 0.7);
    bg.strokeRoundedRect(ix, iy, iw, ih, 11);
    bg.fillStyle(0xffffff, 0.04); bg.fillRoundedRect(ix+2, iy+2, iw-4, ih/2, 9);

    txt(this, ix+20, iy+ih/2-2, '👑', 20).setOrigin(0, 0.5);
    txt(this, ix+50, iy+ih/2-8, 'Premium подписка', 12, '#c8a0ff', true);
    if (isActive) {
      txt(this, ix+50, iy+ih/2+8, `✅ Активна · ${daysLeft} дн.`, 9, '#b45aff');
      txt(this, iw-4, iy+ih/2-2, '— куплено —', 10, '#888899', false).setOrigin(1, 0.5);
    } else {
      txt(this, ix+50, iy+ih/2+8, 'Эксклюзивные функции', 9, '#8888aa');
      txt(this, iw-4, iy+ih/2-2, `${price} ${symbol}`, 12, '#3cc8dc', true).setOrigin(1, 0.5);
      this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x2a0a40,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('heavy'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a0a30,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(2,C.purple,0.7); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
        .on('pointerup',   () => this._buyCrypto(pkg));
    }
  }

  /* ── CryptoPay карточка ──────────────────────────────── */
  _makeCryptoCard(pkg, ix, iy, iw, ih, W) {
    const asset  = this._cryptoAsset || 'TON';
    const price  = asset === 'TON' ? pkg.ton : pkg.usdt;
    const symbol = asset === 'TON' ? 'TON' : 'USDT';

    const bg = this.add.graphics();
    bg.fillStyle(0x08141a, 0.92); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(1.5, 0x3cc8dc, 0.4); bg.strokeRoundedRect(ix, iy, iw, ih, 11);

    txt(this, ix+iw/2, iy+14, '💎', 20).setOrigin(0.5);
    txt(this, ix+iw/2, iy+36, `${pkg.diamonds}`, 15, '#f0f0fa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+53, 'алмазов', 8, '#8888aa').setOrigin(0.5);

    const btnG = this.add.graphics();
    btnG.fillStyle(0x0a4055, 0.9); btnG.fillRoundedRect(ix+4, iy+62, iw-8, 13, 5);
    txt(this, ix+iw/2, iy+68, `${price} ${symbol}`, 9, '#3cc8dc', true).setOrigin(0.5);

    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x0f2030,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('medium'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x08141a,0.92); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(1.5,0x3cc8dc,0.4); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
      .on('pointerup',   () => this._buyCrypto(pkg));
  }

  /* ── Покупка за Stars ─────────────────────────────────── */
  async _buyStars(pkg) {
    if (this._buying) return;
    this._buying = true;
    this._toast('⏳ Открываем оплату...');
    try {
      const res = await post('/api/shop/stars_invoice', { package_id: pkg.id });
      if (!res.ok) {
        this._toast(`❌ ${res.reason}`);
        this._buying = false;
        return;
      }
      tg?.openInvoice(res.invoice_url, async (status) => {
        this._buying = false;
        if (status === 'paid') {
          tg?.HapticFeedback?.notificationOccurred('success');
          Sound.levelUp?.();
          this._toast('⏳ Активируем...');
          try {
            const confirm = await post('/api/shop/stars_confirm', { package_id: pkg.id });
            if (confirm.ok) {
              if (confirm.player) State.player = confirm.player;
              if (confirm.premium_activated) {
                const bonusTxt = confirm.bonus_diamonds > 0 ? ` +${confirm.bonus_diamonds} 💎` : '';
                this._toast(`👑 Premium активирован!${bonusTxt}`);
              } else {
                const added = confirm.diamonds_added || pkg.diamonds;
                this._toast(`✅ +${added} 💎 начислено!`);
              }
            } else if (confirm.reason?.includes('уже активен')) {
              if (confirm.player) State.player = confirm.player;
              this._toast(`👑 ${confirm.reason}`);
            } else {
              this._toast('✅ Оплата прошла! Обновите профиль.');
            }
          } catch(_) {
            this._toast('✅ Оплата прошла! Обновите профиль.');
          }
          this.time.delayedCall(1200, () => this.scene.restart({ tab: 'topup' }));
        } else if (status === 'cancelled') {
          this._toast('❌ Оплата отменена');
        } else if (status === 'failed') {
          this._toast('❌ Ошибка оплаты');
        }
      });
    } catch(_) {
      this._toast('❌ Нет соединения');
      this._buying = false;
    }
  }

  /* ── Покупка за крипту ────────────────────────────────── */
  async _buyCrypto(pkg) {
    if (this._buying) return;
    this._buying = true;
    const asset = this._cryptoAsset || 'TON';
    this._toast('⏳ Создаём счёт...');
    try {
      const res = await post('/api/shop/crypto_invoice', { package_id: pkg.id, asset });
      if (!res.ok) {
        this._toast(`❌ ${res.reason}`);
        this._buying = false;
        return;
      }
      const invoiceId = res.invoice_id;
      // Сохраняем invoice_id — при возврате покажем кнопку "Проверить оплату"
      localStorage.setItem('cryptoPendingInvoice', String(invoiceId));
      // Открываем ссылку на оплату в Telegram
      if (res.invoice_url) {
        tg?.openLink?.(res.invoice_url);
      }
      this._toast('💳 Счёт открыт — оплатите и вернитесь');
      this._buying = false;
      // Polling: каждые 5 секунд проверяем статус (до 2 минут)
      this._startCryptoPolling(invoiceId, pkg.diamonds);
    } catch(_) {
      this._toast('❌ Нет соединения');
      this._buying = false;
    }
  }

  /* ── Polling для CryptoPay ───────────────────────────── */
  _startCryptoPolling(invoiceId, diamonds) {
    let attempts = 0;
    const maxAttempts = 24; // 24 × 5s = 2 минуты
    const poll = async () => {
      attempts++;
      try {
        const r = await get(`/api/shop/crypto_check/${invoiceId}`);
        if (r.ok && r.paid) {
          this._onCryptoPaid(r.diamonds || diamonds, invoiceId, r.premium_activated, r.bonus_diamonds || 0);
          return;
        }
      } catch(_) {}
      if (attempts < maxAttempts && this.scene.isActive?.('Shop')) {
        this.time.delayedCall(5000, poll);
      }
    };
    this.time.delayedCall(5000, poll);
  }

  /* ── Ручная проверка pending-инвойса ─────────────────── */
  async _checkPendingInvoice(invoiceId) {
    try {
      const r = await get(`/api/shop/crypto_check/${invoiceId}`);
      if (r.ok && r.paid) {
        this._onCryptoPaid(r.diamonds, invoiceId, r.premium_activated, r.bonus_diamonds || 0);
      } else {
        this._toast('⏳ Оплата ещё не подтверждена');
      }
    } catch(_) {
      this._toast('❌ Нет соединения');
    }
  }

  /* ── Общий обработчик успешной крипто-оплаты ─────────── */
  _onCryptoPaid(diamonds, invoiceId, isPremium, bonusDiamonds = 0) {
    tg?.HapticFeedback?.notificationOccurred('success');
    Sound.levelUp?.();
    localStorage.removeItem('cryptoPendingInvoice');
    let msg;
    if (isPremium) {
      msg = bonusDiamonds > 0
        ? `👑 Premium активирован! +${bonusDiamonds} 💎`
        : '👑 Premium активирован на 21 день!';
    } else {
      msg = `✅ +${diamonds} 💎 начислено!`;
    }
    this._toast(msg);
    post('/api/player').then(d => {
      if (d.ok && d.player) State.player = d.player;
      this.time.delayedCall(800, () => this.scene.restart({ tab: 'topup' }));
    }).catch(() => this.time.delayedCall(800, () => this.scene.restart({ tab: 'topup' })));
  }

  _makeItemCard(item, ix, iy, iw, ih, W) {
    const avail  = !item.soon;
    const canBuy = avail && this._canAfford(item);

    const bg = this.add.graphics();
    this._drawCardBg(bg, ix, iy, iw, ih, avail, canBuy);

    /* Иконка */
    txt(this, ix + iw / 2, iy + 20, item.icon, 26).setOrigin(0.5);

    /* Название */
    txt(this, ix + iw / 2, iy + 52, item.name, 9, '#c0c0e0')
      .setOrigin(0.5).setWordWrapWidth(iw - 10);

    /* Цена или "Скоро" */
    if (item.soon) {
      txt(this, ix + iw / 2, iy + 82, '🚧 Скоро', 9, '#333355').setOrigin(0.5);
    } else {
      const pIcon  = item.currency === 'diamonds' ? '💎' : '🪙';
      const pColor = item.currency === 'diamonds' ? '#3cc8dc' : '#ffc83c';
      const dimCol = canBuy ? pColor : '#553333';
      txt(this, ix + iw / 2, iy + 82, `${pIcon} ${item.price}`, 12, dimCol, true).setOrigin(0.5);
    }

    /* HP bar превью для зелий */
    if (item.hpRestorePct && State.player) {
      const p     = State.player;
      const curPct = Math.min(1, (p.current_hp || 0) / Math.max(1, p.max_hp || 1));
      const newPct = Math.min(1, curPct + item.hpRestorePct);
      makeBar(this, ix + 8, iy + 95, iw - 16, 5, curPct, C.red, C.dark, 3);
      // Зелёное продолжение — будущий HP
      const barW  = iw - 16;
      const prevW = Math.round(barW * curPct);
      const addW  = Math.round(barW * Math.min(item.hpRestorePct, 1 - curPct));
      if (addW > 0) {
        const addG = this.add.graphics();
        addG.fillStyle(C.green, 0.75);
        addG.fillRoundedRect(ix + 8 + prevW, iy + 95, addW, 5, 2);
      }
    }

    if (!avail) return;

    /* Зона клика */
    this.add.zone(ix, iy, iw, ih).setOrigin(0)
      .setInteractive({ useHandCursor: canBuy })
      .on('pointerdown', () => {
        if (!canBuy || this._buying) return;
        this._drawCardBg(bg, ix, iy, iw, ih, true, true, true);
        tg?.HapticFeedback?.impactOccurred('medium');
      })
      .on('pointerup', () => {
        this._drawCardBg(bg, ix, iy, iw, ih, true, canBuy);
        if (!canBuy)  { this._toastNoMoney(item); return; }
        if (this._buying) return;
        this._doBuy(item);
      })
      .on('pointerout', () => this._drawCardBg(bg, ix, iy, iw, ih, true, canBuy));
  }

  _drawCardBg(bg, ix, iy, iw, ih, avail, canBuy, pressed = false) {
    bg.clear();
    const fill  = pressed ? C.dark : C.bgPanel;
    const alpha = avail ? 0.92 : 0.55;
    bg.fillStyle(fill, alpha);
    bg.fillRoundedRect(ix, iy, iw, ih, 12);
    if (canBuy) {
      bg.lineStyle(1.5, C.gold, pressed ? 0.7 : 0.35);
    } else if (avail) {
      bg.lineStyle(1, 0x553333, 0.5);
    } else {
      bg.lineStyle(1, C.dark, 0.3);
    }
    bg.strokeRoundedRect(ix, iy, iw, ih, 12);
  }

  _canAfford(item) {
    const p = State.player;
    if (!p) return false;
    if (item.currency === 'diamonds') return (p.diamonds || 0) >= item.price;
    return (p.gold || 0) >= item.price;
  }

  /* ── Покупка ─────────────────────────────────────────── */
  async _doBuy(item) {
    if (this._buying) return;
    this._buying = true;

    try {
      const res = await post('/api/shop/buy', { item_id: item.id });

      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.buy();
        // Обновляем State.player
        if (res.player) State.player = res.player;

        let msg = `✅ Куплено: ${item.name}`;
        if (res.hp_restored > 0) msg = `❤️ +${res.hp_restored} HP восстановлено!`;
        if (res.charges_added)   msg = `⚡ XP Буст ×1.5 — ${res.charges_added} боёв`;
        this._toast(msg);

        // Обновляем баланс на экране
        this._goldTxt?.setText(`🪙 ${State.player?.gold || 0}`);
        this._diaТxt?.setText(`💎 ${State.player?.diamonds || 0}`);

        // Перерисовываем карточки через 0.4с (после тоста)
        this.time.delayedCall(400, () => this.scene.restart({ tab: this._tab }));
      } else {
        tg?.HapticFeedback?.notificationOccurred('error');
        this._toast(`❌ ${res.reason || 'Ошибка'}`);
        this._buying = false;
      }
    } catch (_) {
      this._toast('❌ Нет соединения');
      this._buying = false;
    }
  }

  _toastNoMoney(item) {
    const cur = item.currency === 'diamonds' ? 'кристаллов' : 'золота';
    this._toast(`🪙 Нужно ${item.price} ${cur}`);
  }

  /* ── Каталог товаров ─────────────────────────────────── */
  _getItems() {
    const p = State.player;
    const hpFull = (p?.current_hp || 0) >= (p?.max_hp || 1);

    const catalog = {
      potions: [
        {
          id: 'hp_small', icon: '🧪', name: 'Малое зелье HP',
          price: 12, currency: 'gold',
          desc: '+30% HP', hpRestorePct: 0.30,
          soon: hpFull,   // не показываем "купить" если HP полный
        },
        {
          id: 'hp_full',  icon: '⚗️', name: 'Большое зелье HP',
          price: 30, currency: 'gold',
          desc: 'HP до максимума', hpRestorePct: 1.0,
          soon: hpFull,
        },
        {
          id: 'xp_boost', icon: '💊', name: 'Буст XP ×1.5',
          price: 100, currency: 'gold',
          desc: '5 боёв с бонусом опыта',
        },
        {
          id: null, icon: '🌿', name: 'Зелье удачи',
          price: 20, currency: 'diamonds', soon: true,
          desc: '+15% крит на 3 боя',
        },
      ],
      gear: [
        { id: null, icon: '⚔️', name: 'Меч воина',    price: 500, currency: 'gold',    soon: true },
        { id: null, icon: '🛡️', name: 'Щит рыцаря',  price: 500, currency: 'gold',    soon: true },
        { id: null, icon: '🗡️', name: 'Кинжал тени', price: 300, currency: 'gold',    soon: true },
        { id: null, icon: '🏹', name: 'Лук лесника',  price: 400, currency: 'gold',    soon: true },
      ],
      special: [
        { id: 'stat_reset', icon: '🔄', name: 'Сброс статов', price: 50, currency: 'diamonds', desc: 'Сбросить все статы' },
        { id: null, icon: '🌟', name: 'Battle Pass+', price: 500, currency: 'diamonds', soon: true },
        { id: null, icon: '🎭', name: 'Скин воина',   price: 200, currency: 'diamonds', soon: true },
        { id: null, icon: '🏆', name: 'Рамка профиля',price: 100, currency: 'diamonds', soon: true },
      ],
    };

    return catalog[this._tab] || catalog.potions;
  }

  _toast(msg) {
    const t = txt(this, this.W / 2, this.H - 80, msg, 12, '#ffc83c', true).setOrigin(0.5);
    t.setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 36, duration: 2200,
      onComplete: () => t.destroy() });
  }
}
