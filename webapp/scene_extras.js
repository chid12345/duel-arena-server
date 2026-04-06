/* ============================================================
   scene_extras.js — дополнительные экраны TMA:
     QuestsScene   ('Quests')     — ежедневные задания
     SummaryScene  ('Summary')    — сводка профиля
    SeasonScene   ('Season')     — таблица лидеров сезона
    TitanTopScene ('TitanTop')   — недельный топ Башни титанов
     BattlePassScene ('BattlePass') — прогресс Боевого пропуска
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
    _extraHeader(this, W, '📅', 'ЗАДАНИЯ', 'Ежедневные и недельные квесты');
    _extraBack(this, W, H);
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#555577').setOrigin(0.5);
    this._loadQuests(W, H);
  }

  _loadQuests(W, H) {
    if (this._loading) this._loading.setText('Загрузка...');
    get('/api/quests').then(d => this._render(d, W, H)).catch(() => {
      if (this._loading) this._loading.setText('❌ Нет соединения');
      if (!this._retryBtn) {
        const bg = this.add.graphics();
        bg.fillStyle(0x2a2840, 1);
        bg.fillRoundedRect(W/2 - 70, H/2 + 22, 140, 34, 8);
        bg.lineStyle(1.5, 0x5096ff, 0.6);
        bg.strokeRoundedRect(W/2 - 70, H/2 + 22, 140, 34, 8);
        txt(this, W/2, H/2 + 39, '🔄 Повторить', 13, '#a0c0ff', true).setOrigin(0.5);
        this._retryBtn = this.add.zone(W/2 - 70, H/2 + 22, 140, 34).setOrigin(0).setInteractive({ useHandCursor: true });
        this._retryBtn.on('pointerup', () => this._loadQuests(W, H));
      }
    });
  }

  _render(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }

    const q = data.quest || {};
    const d = data.daily || {};
    const w = data.weekly || {};
    let y = 84;

    /* ══ БЛОК 1: Ежедневный логин-бонус ══════════════════════ */
    y = this._buildDailyBonus(d, W, y);
    y += 14;

    /* ══ БЛОК 2: Квест дня ════════════════════════════════════ */
    this._buildDailyQuest(q, W, y, H);
    this._buildWeeklyMini(w, W, H);
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
    txt(this, 52, y + 32, `Серия: ${streak} ${streak >= 7 ? '🔥' : '📅'} дней`, 12, '#555577');

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
      txt(this, dx + (dotW-4)/2, y + 66, String(dayN), 9,
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
      txt(this, W/2, btnY2 + 16, '⚔️ Выполни задания чтобы забрать награду', 12, '#555577').setOrigin(0.5);
    }

    /* Сброс квеста */
    const resetH = H - 100;
    txt(this, W/2, resetH, '🔄 Квест обновляется каждый день в 00:00', 12, '#666688').setOrigin(0.5);
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

  _buildWeeklyMini(w, W, H) {
    const list = Array.isArray(w.quests) ? w.quests : [];
    if (!list.length) return;
    const y = H - 168;
    const box = this.add.graphics();
    box.fillStyle(0x13203a, 0.95);
    box.fillRoundedRect(8, y, W - 16, 62, 12);
    box.lineStyle(1.5, C.blue, 0.35);
    box.strokeRoundedRect(8, y, W - 16, 62, 12);
    txt(this, 18, y + 8, `🗓 Недельные задания (${w.week_key || ''})`, 11, '#88a8ff', true);
    const done = list.filter(q => q.is_completed && !q.reward_claimed);
    const totalDone = list.filter(q => q.is_completed).length;
    txt(this, 18, y + 27, `Выполнено: ${totalDone}/${list.length}`, 11, '#a8b8d8');
    const claimable = done[0];
    if (claimable) {
      const bx = W - 128, by = y + 15, bw = 108, bh = 30;
      const btn = this.add.graphics();
      btn.fillStyle(C.green, 1);
      btn.fillRoundedRect(bx, by, bw, bh, 9);
      txt(this, bx + bw / 2, by + bh / 2, 'Забрать', 11, '#1a1a28', true).setOrigin(0.5);
      this.add.zone(bx, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerup', async () => {
          const res = await post('/api/quests/weekly_claim', { claim_key: claimable.key }).catch(() => ({ ok: false }));
          if (res.ok) {
            this._toast(`✅ Недельная награда: +${res.gold}🪙 +${res.diamonds}💎`);
            this.time.delayedCall(700, () => this.scene.restart());
          } else {
            this._toast('❌ Пока нельзя забрать');
          }
        });
    } else {
      txt(this, W - 20, y + 31, '📌 Выполняй PvP и Башню', 10, '#667799').setOrigin(1, 0.5);
    }
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
      scroll.add(txt(this, cx + 8, cy + 8,  s.label, 12, '#8888aa'));
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
      scroll.add(txt(this, ax + aw / 2, y + 14, `${a.n} ${a.v}`, 11, '#aaaacc').setOrigin(0.5));
    });
    y += 32;

    /* ── HP / EXP ── */
    const hpPct  = (p.current_hp || 0) / Math.max(1, p.max_hp || 1);
    const expPct = (p.exp || 0) / Math.max(1, p.exp_to_next || 1);

    scroll.add(makeBar(this, 16, y,     W - 32, 12, hpPct,  C.red,  C.dark));
    scroll.add(txt(this, W / 2, y + 6, `HP ${p.current_hp || 0}/${p.max_hp || 0}`, 11, '#f0f0fa').setOrigin(0.5));
    y += 20;
    scroll.add(makeBar(this, 16, y,     W - 32, 10, expPct, C.blue, C.dark));
    scroll.add(txt(this, W / 2, y + 5, `EXP ${p.exp || 0}/${p.exp_to_next || '?'}`, 11, '#8888aa').setOrigin(0.5));
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
      txt(this, 70, myY + 27, `🏆 ${me.season_wins || 0} побед  ·  ⭐ ${me.season_rating || 0}`, 12, '#8888aa');
    }

    /* ── Список лидеров ── */
    const listY = 155;
    txt(this, 16, listY - 18, 'ТОП ИГРОКОВ', 12, '#555577', true);
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
      txt(this, 52,      ry + 24, `🏆 ${row.season_wins||0}W  ⭐ ${row.season_rating||0}`, 11, '#555577');
      txt(this, W - 16,  ry + 17, `${row.season_rating||0}`, 12, '#ffc83c', true).setOrigin(1, 0.5);
    });

    if (lb.length === 0) {
      txt(this, W/2, H/2, '📭 Нет данных', 13, '#555577').setOrigin(0.5);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   TITAN TOP SCENE — недельный топ Башни титанов
   ═══════════════════════════════════════════════════════════ */
class TitanTopScene extends Phaser.Scene {
  constructor() { super('TitanTop'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '🗿', 'ТОП БАШНИ', 'Недельный рейтинг Башни титанов');
    _extraBack(this, W, H);
    this._loading = txt(this, W / 2, H / 2, 'Загрузка...', 14, '#555577').setOrigin(0.5);
    get('/api/titans/top').then(d => this._render(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _render(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) {
      txt(this, W / 2, H / 2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5);
      return;
    }
    const lb = data.leaders || [];
    txt(this, W / 2, 82, `Неделя: ${data.week_key || '-'}`, 12, '#8888aa').setOrigin(0.5);

    makePanel(this, 8, 98, W - 16, 62, 10, 0.95);
    txt(this, 16, 108, '🎁 Награды:', 12, '#ffc83c', true);
    txt(this, 16, 128, '1 место: 150💎 · 2: 90💎 · 3: 60💎 · 4-10: 25💎', 11, '#c0c0e0');
    txt(this, 16, 145, 'Титулы: Покоритель / Гроза / Титаноборец', 10, '#666688');

    const listY = 172;
    txt(this, 16, listY - 18, 'ЛИДЕРЫ', 12, '#555577', true);
    const rowH = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 80) / rowH));

    lb.slice(0, maxShow).forEach((row, i) => {
      const ry = listY + i * rowH;
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.86);
      bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      txt(this, 18, ry + 11, medal, i < 3 ? 14 : 11, '#ffc83c').setOrigin(0);
      txt(this, 52, ry + 9, row.username || `User${row.user_id}`, 12, '#d0d0ee', true);
      txt(this, 52, ry + 24, `🗿 Этаж: ${row.weekly_best_floor || 0}`, 11, '#777799');
      txt(this, W - 16, ry + 17, `#${row.weekly_best_floor || 0}`, 12, '#ffc83c', true).setOrigin(1, 0.5);
    });

    if (!lb.length) {
      txt(this, W / 2, H / 2 + 20, '😴 Пока никто не прошёл Башню', 13, '#555577').setOrigin(0.5);
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
  _extraHeader(this, W, '🌟', 'БОЕВОЙ ПРОПУСК', 'Ежесезонные награды');
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
      txt(this, 52, ry + 10, `⚔️ ${tier.battles_needed} боёв  /  🏆 ${tier.wins_needed} побед`, 12, condColor);

      /* Прогресс боёв */
      const bPct = Math.min(1, battles / tier.battles_needed);
      const wPct = Math.min(1, wins    / tier.wins_needed);
      const barW = W - 160;
      makeBar(this, 52, ry + 28, barW, 6, bPct, C.blue, C.dark, 3);
      makeBar(this, 52, ry + 38, barW, 6, wPct, C.gold, C.dark, 3);

      /* Награды */
      txt(this, W - 110, ry + 11, `💎 ${tier.diamonds}`, 12, '#3cc8dc');
      txt(this, W - 110, ry + 27, `🪙 ${tier.gold}`,     12, '#ffc83c');

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
    /* Заголовок и кнопку «Назад» рисуем только НЕ для чата — в чате своя шапка */
    if (this._subview !== 'chat') {
      _extraHeader(this, W, '⚔️', 'КЛАН', 'Кланы · Поиск · Рейтинг');
      _extraBack(this, W, H);
    }
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
        if (this._subview === 'chat') this._renderChat(data, W, H);
        else                          this._renderMyClan(data, W, H);
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
    txt(this, W/2, 90, '🏰', 34).setOrigin(0.5);
    txt(this, W/2, 128, 'Вы не состоите в клане', 15, '#a0a0cc').setOrigin(0.5);
    txt(this, W/2, 150, 'Вступайте и участвуйте в клановых войнах!', 12, '#6060aa').setOrigin(0.5);

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
    txt(this, W/2, 176 + 3*58 + 8, 'Создание клана стоит 200 🪙', 12, '#6060aa').setOrigin(0.5);
  }

  /* ══ МОЙ КЛАН ═══════════════════════════════════════════ */
  _renderMyClan(data, W, H) {
    const clan     = data.clan;
    const members  = data.members || [];
    const isLeader = data.is_leader;
    let y = 84;

    const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');

    /* ── Инфо-панель клана ─────────────────────────────── */
    const infoH = 80;
    makePanel(this, 8, y, W-16, infoH, 12);

    /* Тег слева */
    txt(this, 20, y+12, `[${clan.tag}]`, 14, '#ffc83c', true);
    /* Название */
    txt(this, 20, y+32, trunc(clan.name, 20), 16, '#f0f0fa', true);
    /* Статы */
    txt(this, 20, y+56, `👥 ${members.length}/20  ·  🏆 ${clan.wins}  ·  Ур.${clan.level}`, 12, '#a0a0cc');
    if (isLeader) txt(this, W-20, y+14, '👑 Лидер', 12, '#ffc83c', true).setOrigin(1, 0);
    y += infoH + 10;

    /* ── Заголовок списка ──────────────────────────────── */
    txt(this, 16, y, `УЧАСТНИКИ  (${members.length}/20)`, 13, '#7070aa', true);
    y += 22;

    /* ── Список участников ─────────────────────────────── */
    const rowH    = 44;
    const leaveH  = isLeader ? 0 : 52;
    const maxShow = Math.min(members.length, Math.floor((H - y - leaveH - 70) / rowH));

    members.slice(0, maxShow).forEach((m, i) => {
      const ry = y + i * rowH;
      const isLdr = m.role === 'leader';
      const bg = this.add.graphics();
      bg.fillStyle(isLdr ? 0x2a2010 : C.bgPanel, 0.85);
      bg.fillRoundedRect(8, ry, W-16, rowH-3, 8);
      if (isLdr) { bg.lineStyle(1.5, C.gold, 0.4); bg.strokeRoundedRect(8, ry, W-16, rowH-3, 8); }

      txt(this, 22, ry + rowH/2 - 4, isLdr ? '👑' : '⚔️', 15).setOrigin(0, 0.5);
      txt(this, 44, ry+10, trunc(m.username || `User${m.user_id}`, 17), 13,
        isLdr ? '#ffc83c' : '#e0e0f8', isLdr);
      txt(this, 44, ry+27, `Ур.${m.level}  ·  ${m.wins} побед`, 11, '#7070aa');

      /* Роль/кнопка */
      if (isLdr) {
        txt(this, W-18, ry + rowH/2, 'Лидер', 11, '#ffc83c', true).setOrigin(1, 0.5);
      } else if (isLeader) {
        /* Кнопка «👑 Передать» — только для текущего лидера */
        const bx = W - 82, bw = 70, bh = 26, by2 = ry + (rowH-3)/2 - 13;
        const tBg = this.add.graphics();
        tBg.fillStyle(0x3a2800, 1); tBg.fillRoundedRect(bx, by2, bw, bh, 7);
        tBg.lineStyle(1, C.gold, 0.6); tBg.strokeRoundedRect(bx, by2, bw, bh, 7);
        txt(this, bx + bw/2, by2 + bh/2, '👑 Передать', 10, '#ffc83c').setOrigin(0.5);
        this.add.zone(bx, by2, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { tBg.clear(); tBg.fillStyle(0x5a3c00,1); tBg.fillRoundedRect(bx,by2,bw,bh,7); tg?.HapticFeedback?.impactOccurred('medium'); })
          .on('pointerout',  () => { tBg.clear(); tBg.fillStyle(0x3a2800,1); tBg.fillRoundedRect(bx,by2,bw,bh,7); tBg.lineStyle(1,C.gold,0.6); tBg.strokeRoundedRect(bx,by2,bw,bh,7); })
          .on('pointerup',   () => this._showTransferConfirm(m, W, H));
      }
    });

    if (members.length > maxShow) {
      txt(this, W/2, y + maxShow*rowH + 6, `+ ещё ${members.length - maxShow} участников`, 12, '#5050aa').setOrigin(0.5);
    }

    /* ── Кнопки внизу ───────────────────────────────────── */
    const btnZone = H - 100;

    /* Кнопка «💬 Чат» */
    const chatBtnW = isLeader ? W-32 : Math.round((W-40)/2);
    const chatBg = this.add.graphics();
    chatBg.fillStyle(0x1a4a8a, 1); chatBg.fillRoundedRect(16, btnZone, chatBtnW, 42, 10);
    chatBg.lineStyle(1.5, 0x5096ff, 0.7); chatBg.strokeRoundedRect(16, btnZone, chatBtnW, 42, 10);
    txt(this, 16 + chatBtnW/2, btnZone+21, '💬  Чат клана', 13, '#a8d4ff', true).setOrigin(0.5);
    this.add.zone(16, btnZone, chatBtnW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { chatBg.clear(); chatBg.fillStyle(0x0e2a5a,1); chatBg.fillRoundedRect(16,btnZone,chatBtnW,42,10); tg?.HapticFeedback?.impactOccurred('light'); })
      .on('pointerout',  () => { chatBg.clear(); chatBg.fillStyle(0x1a4a8a,1); chatBg.fillRoundedRect(16,btnZone,chatBtnW,42,10); chatBg.lineStyle(1.5,0x5096ff,0.7); chatBg.strokeRoundedRect(16,btnZone,chatBtnW,42,10); })
      .on('pointerup',   () => this.scene.restart({ sub: 'chat' }));

    if (!isLeader) {
      /* Кнопка «Покинуть» справа */
      const lx = 16 + chatBtnW + 8, lw = W - 32 - chatBtnW - 8;
      const bg2 = this.add.graphics();
      bg2.fillStyle(0x4a1010, 1); bg2.fillRoundedRect(lx, btnZone, lw, 42, 10);
      bg2.lineStyle(1.5, C.red, 0.7); bg2.strokeRoundedRect(lx, btnZone, lw, 42, 10);
      txt(this, lx + lw/2, btnZone+21, '🚪 Выйти', 13, '#ff6666', true).setOrigin(0.5);
      this.add.zone(lx, btnZone, lw, 42).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg2.clear(); bg2.fillStyle(0x6a1818,1); bg2.fillRoundedRect(lx,btnZone,lw,42,10); tg?.HapticFeedback?.impactOccurred('medium'); })
        .on('pointerout',  () => { bg2.clear(); bg2.fillStyle(0x4a1010,1); bg2.fillRoundedRect(lx,btnZone,lw,42,10); bg2.lineStyle(1.5,C.red,0.7); bg2.strokeRoundedRect(lx,btnZone,lw,42,10); })
        .on('pointerup',   () => this._leaveClan());
    } else {
      txt(this, W/2, H-50, '👑 Лидер не может покинуть клан — передайте роль', 12, '#5050aa').setOrigin(0.5);
    }
  }

  /* ══ ЧАТ КЛАНА ══════════════════════════════════════════ */
  _renderChat(data, W, H) {
    const clan = data.clan;
    this._chatMyId = data.my_user_id;

    const stopTimer = () => {
      if (this._chatTimer) { this._chatTimer.remove(false); this._chatTimer = null; }
    };

    /* ── Шапка (полная ширина) ── */
    const hdrH = 58;
    const hdrG = this.add.graphics();
    hdrG.fillStyle(0x1a3060, 1);
    hdrG.fillRoundedRect(0, 0, W, hdrH, 0);
    hdrG.lineStyle(1.5, 0xffc83c, 0.5);
    hdrG.lineBetween(0, hdrH, W, hdrH);

    /* ← В клан (слева) */
    const backG = this.add.graphics();
    backG.fillStyle(0x2a4a8a, 1); backG.fillRoundedRect(10, 12, 80, 34, 9);
    txt(this, 50, 29, '← В клан', 12, '#a8d4ff', true).setOrigin(0.5);
    this.add.zone(10, 12, 80, 34).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { backG.clear(); backG.fillStyle(0x1a2a5a,1); backG.fillRoundedRect(10,12,80,34,9); })
      .on('pointerout',  () => { backG.clear(); backG.fillStyle(0x2a4a8a,1); backG.fillRoundedRect(10,12,80,34,9); })
      .on('pointerup', () => {
        tg?.HapticFeedback?.impactOccurred('light');
        stopTimer();
        this.scene.restart({ sub: 'main' });  /* явно указываем main — не чат */
      });

    /* Название клана по центру */
    txt(this, W/2, 20, '💬 ЧАТ КЛАНА', 13, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, 40, `[${clan.tag}] ${clan.name}`, 11, '#8888bb').setOrigin(0.5);

    /* 🔄 кнопка справа */
    const rG = this.add.graphics();
    rG.fillStyle(0x2a4a8a, 1); rG.fillRoundedRect(W-50, 12, 38, 34, 9);
    txt(this, W-31, 29, '🔄', 14).setOrigin(0.5);
    this.add.zone(W-50, 12, 38, 34).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._chatLoad(msgAreaY, msgAreaH, W));

    /* ── Поле ввода + кнопка (выше нижнего края) ── */
    const inputH = 44, inputY = H - inputH - 56;  /* 56px от низа = выше таббара */
    const sendW  = 58, inpW = W - 16 - 8 - sendW - 8;

    /* фон строки ввода */
    const inpRowG = this.add.graphics();
    inpRowG.fillStyle(0x12204a, 1);
    inpRowG.fillRect(0, inputY - 6, W, inputH + 12);

    this._chatInput = this._makeInput(W, inputY, inpW, inputH, '✏️ Написать сообщение...', 200, 16);

    const sbx = 16 + inpW + 8;
    const sendG = this.add.graphics();
    sendG.fillStyle(0x3a7aff, 1); sendG.fillRoundedRect(sbx, inputY, sendW, inputH, 10);
    txt(this, sbx + sendW/2, inputY + inputH/2, '➤', 17, '#ffffff', true).setOrigin(0.5);
    this.add.zone(sbx, inputY, sendW, inputH).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { sendG.clear(); sendG.fillStyle(0x2050d0,1); sendG.fillRoundedRect(sbx,inputY,sendW,inputH,10); })
      .on('pointerout',  () => { sendG.clear(); sendG.fillStyle(0x3a7aff,1); sendG.fillRoundedRect(sbx,inputY,sendW,inputH,10); })
      .on('pointerup', () => this._sendChatMsg(msgAreaY, msgAreaH, W));

    /* ── Область сообщений (между шапкой и строкой ввода) ── */
    const msgAreaY = hdrH + 6;
    const msgAreaH = inputY - 6 - msgAreaY - 6;

    const msgsG = this.add.graphics();
    msgsG.fillStyle(C.bgPanel, 0.4);
    msgsG.fillRoundedRect(8, msgAreaY, W-16, msgAreaH, 8);

    /* ── Загрузчик и рендер ── */
    this._msgObjs = [];

    this._chatLoad = (aY, aH, cW) => {
      this._msgObjs.forEach(o => { try { o.destroy(); } catch(_){} });
      this._msgObjs = [];
      const spin = txt(this, cW/2, aY+aH/2, '⏳ Загрузка...', 12, '#6060aa').setOrigin(0.5);
      this._msgObjs.push(spin);

      get('/api/clan/chat').then(d => {
        spin.destroy();
        this._msgObjs = this._msgObjs.filter(o => o !== spin);
        const msgs = d.messages || [];

        if (!msgs.length) {
          const e = txt(this, cW/2, aY+aH/2, '💬 Напишите первым!', 12, '#5050aa').setOrigin(0.5);
          this._msgObjs.push(e); return;
        }

        const lineH = 40;
        const maxL  = Math.floor(aH / lineH);
        msgs.slice(-maxL).forEach((m, i) => {
          const isMe = (m.user_id === this._chatMyId);
          const my   = aY + aH - (Math.min(msgs.length, maxL) - i) * lineH;
          const bg   = this.add.graphics();
          bg.fillStyle(isMe ? 0x1a3a7a : 0x1e1c34, 0.95);
          bg.fillRoundedRect(10, my+2, cW-20, lineH-4, 8);
          const nc = isMe ? '#7ab4ff' : '#ffc83c';
          const t1 = txt(this, 20, my+10, isMe ? 'Вы' : (m.username||'Игрок'), 12, nc, true);
          const t2 = txt(this, 20, my+24, m.message, 12, '#e8e8ff');
          const t3 = txt(this, cW-14, my+10, m.time_str||'', 11, '#5050aa').setOrigin(1, 0);
          this._msgObjs.push(bg, t1, t2, t3);
        });
      }).catch(() => { spin.setText('❌ Нет соединения'); });
    };

    this._chatLoad(msgAreaY, msgAreaH, W);

    this._chatTimer = this.time.addEvent({
      delay: 20000, loop: true,
      callback: () => this._chatLoad(msgAreaY, msgAreaH, W),
    });
  }

  async _sendChatMsg(msgAreaY, msgAreaH, W) {
    if (this._busy) return;
    const msg = this._chatInput?.value?.trim() || '';
    if (!msg) { this._toast('✏️ Введите сообщение'); return; }
    this._busy = true;
    try {
      const res = await post('/api/clan/chat/send', { message: msg });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (this._chatInput) this._chatInput.value = '';
        if (this._chatLoad) this._chatLoad(msgAreaY, msgAreaH, W);
      } else { this._toast('❌ ' + (res.reason || 'Ошибка')); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
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

  /* gameX — необязательная x-координата в игровых пикселях; если null — центрирует */
  _makeInput(W, y, w, h, placeholder, maxLen = 20, gameX = null) {
    const el = document.createElement('input');
    el.type = 'text'; el.placeholder = placeholder; el.maxLength = maxLen;
    const canvasLeft = Math.round((window.innerWidth - W) / 2);
    const left = gameX !== null
      ? Math.round(canvasLeft + gameX)
      : Math.round((window.innerWidth - w) / 2);
    const top  = Math.round(y + (window.innerHeight - this.H) / 2);
    el.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:${w}px;height:${h}px;
      padding:0 12px;background:#1e3878;color:#f0f0fa;border:2px solid #5096ffaa;
      border-radius:10px;font-size:14px;outline:none;z-index:999;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      box-sizing:border-box;`;
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
      const joinT = txt(this, W-44, ry+22, 'Вступить', 11, '#1a1a28', true).setOrigin(0.5);
      this._resultsContainer.add([
        bg,
        txt(this, 18, ry+8,  `[${c.tag}]`, 12, '#ffc83c', true),
        txt(this, 18, ry+26, (s => s.length > 20 ? s.slice(0,20)+'…' : s)(c.name||''), 11, '#c0c0e0'),
        txt(this, W-82, ry+8,  `👥 ${c.member_count}/20`, 11, '#555577'),
        txt(this, W-82, ry+26, `🏆 ${c.wins}`, 11, '#ffc83c'),
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
    txt(this, W/2, 84, '➕ СОЗДАТЬ КЛАН', 15, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, 106, 'Стоимость: 200 🪙  ·  Максимум 20 участников', 12, '#8080cc').setOrigin(0.5);

    /* Поле: название */
    makePanel(this, 8, 122, W-16, 148, 12);
    txt(this, 20, 132, 'Название клана', 12, '#a0a0cc', true);
    txt(this, 20, 148, '3–20 символов, например: Железный Кулак', 12, '#6060aa');
    this._nameEl = this._makeInput(W, 162, W-32, 38, 'Железный Кулак', 20);

    txt(this, 20, 210, 'Тег клана', 12, '#a0a0cc', true);
    txt(this, 20, 226, '2–4 символа, например: ЖК', 12, '#6060aa');
    this._tagEl  = this._makeInput(W, 238, (W-32)/2, 38, 'ЖК', 4);

    const btnY = 284;
    const bgC  = this.add.graphics();
    bgC.fillStyle(C.purple, 0.9); bgC.fillRoundedRect(16, btnY, W-32, 48, 12);
    bgC.fillStyle(0xffffff, 0.08); bgC.fillRoundedRect(18, btnY+2, W-36, 22, 10);
    const btnT = txt(this, W/2, btnY+24, '⚔️  Основать клан  (200 🪙)', 14, '#ffffff', true).setOrigin(0.5);
    this.add.zone(16, btnY, W-32, 48).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bgC.clear(); bgC.fillStyle(0x6600cc,1); bgC.fillRoundedRect(16,btnY,W-32,48,12); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  () => { bgC.clear(); bgC.fillStyle(C.purple,0.9); bgC.fillRoundedRect(16,btnY,W-32,48,12); })
      .on('pointerup',   () => this._doCreate(btnT));

    txt(this, W/2, btnY+60, 'Имя и тег должны быть уникальны', 11, '#5050aa').setOrigin(0.5);
  }

  /* ══ ТОП КЛАНОВ ══════════════════════════════════════════ */
  _renderTop(W, H) {
    txt(this, W/2, 84, '🏆 ТОП КЛАНОВ', 15, '#ffc83c', true).setOrigin(0.5);
    const load2 = txt(this, W/2, 130, 'Загрузка...', 13, '#7070aa').setOrigin(0.5);
    get('/api/clan/top').then(d => {
      load2.destroy();
      const clans = d.clans || [];
      if (!clans.length) { txt(this, W/2, 130, '😔 Кланов пока нет', 13, '#7070aa').setOrigin(0.5); return; }
      let y = 108;
      const rowH = 50;
      clans.slice(0, Math.floor((H - 160) / rowH)).forEach((c, i) => {
        const isTop = i < 3;
        const bg = this.add.graphics();
        bg.fillStyle(isTop ? 0x2a2010 : C.bgPanel, 0.92);
        bg.fillRoundedRect(8, y, W-16, rowH-3, 10);
        if (isTop) { bg.lineStyle(1.5, C.gold, 0.6); bg.strokeRoundedRect(8,y,W-16,rowH-3,10); }
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
        txt(this, 20, y + (rowH-3)/2, medal, isTop?17:13, '#ffc83c').setOrigin(0, 0.5);
        const ttr = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');
        txt(this, 48, y+10, `[${c.tag}] ${ttr(c.name, 16)}`, 13, isTop?'#ffc83c':'#e0e0f8', isTop);
        txt(this, 48, y+27, `🏆 ${c.wins} побед  ·  👥 ${c.member_count}чел`, 11, '#8888bb');
        txt(this, W-18, y + (rowH-3)/2, `Ур.${c.level}`, 12, '#a0a0cc').setOrigin(1, 0.5);
        y += rowH;
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

  _showTransferConfirm(member, W, H) {
    /* Затемнение */
    const ov = this.add.graphics().setDepth(90);
    ov.fillStyle(0x000000, 0.6); ov.fillRect(0, 0, W, H);

    /* Попап */
    const pw = W - 48, ph = 168, px = 24, py = Math.round((H - ph) / 2);
    const D = 92;
    const bg = this.add.graphics().setDepth(D);
    bg.fillStyle(0x1e3060, 1); bg.fillRoundedRect(px, py, pw, ph, 14);
    bg.lineStyle(2, 0xffc83c, 0.9); bg.strokeRoundedRect(px, py, pw, ph, 14);

    txt(this, px+pw/2, py+22, '👑 Передача лидерства', 14, '#ffc83c', true)
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+46, 'Передать лидерство игроку:', 11, '#a8c4ff')
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+66, `${member.username || `User${member.user_id}`}`, 14, '#f0f0fa', true)
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+86, 'Отменить нельзя! Вы станете обычным участником.', 10, '#888888')
      .setOrigin(0.5).setDepth(D);

    const destroy = () => {
      [ov, bg, ...this._transferObjs].forEach(o => { try { o.destroy(); } catch(_){} });
      this._transferObjs = [];
    };

    /* Кнопка «Отмена» */
    const cx = px+8, cw = (pw-24)/2, ch = 38, cy = py+116;
    const cBg = this.add.graphics().setDepth(D);
    cBg.fillStyle(0x303060, 1); cBg.fillRoundedRect(cx, cy, cw, ch, 9);
    const cT = txt(this, cx+cw/2, cy+ch/2, '❌ Отмена', 12, '#a0a0ff', true)
      .setOrigin(0.5).setDepth(D);
    this.add.zone(cx, cy, cw, ch).setOrigin(0).setDepth(D+5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { cBg.clear(); cBg.fillStyle(0x202040,1); cBg.fillRoundedRect(cx,cy,cw,ch,9); })
      .on('pointerout',  () => { cBg.clear(); cBg.fillStyle(0x303060,1); cBg.fillRoundedRect(cx,cy,cw,ch,9); })
      .on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); destroy(); });

    /* Кнопка «Передать» */
    const ox = cx+cw+8, ow = cw;
    const oBg = this.add.graphics().setDepth(D);
    oBg.fillStyle(0x3a2800, 1); oBg.fillRoundedRect(ox, cy, ow, ch, 9);
    oBg.lineStyle(1.5, 0xffc83c, 0.8); oBg.strokeRoundedRect(ox, cy, ow, ch, 9);
    const oT = txt(this, ox+ow/2, cy+ch/2, '👑 Передать', 12, '#ffc83c', true)
      .setOrigin(0.5).setDepth(D);
    const oZ = this.add.zone(ox, cy, ow, ch).setOrigin(0).setDepth(D+5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { oBg.clear(); oBg.fillStyle(0x5a4000,1); oBg.fillRoundedRect(ox,cy,ow,ch,9); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  () => { oBg.clear(); oBg.fillStyle(0x3a2800,1); oBg.fillRoundedRect(ox,cy,ow,ch,9); oBg.lineStyle(1.5,0xffc83c,0.8); oBg.strokeRoundedRect(ox,cy,ow,ch,9); })
      .on('pointerup', () => { destroy(); this._transferLeader(member.user_id); });

    this._transferObjs = [cBg, cT, oBg, oT, oZ,
      this.add.zone(0, 0, W, H).setOrigin(0).setDepth(89).setInteractive()
        .on('pointerup', () => destroy()),
    ];
  }

  async _transferLeader(newLeaderId) {
    if (this._busy) return; this._busy = true;
    try {
      const res = await post('/api/clan/transfer_leader', { new_leader_id: newLeaderId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast('👑 Лидерство передано!');
        this.time.delayedCall(700, () => this.scene.restart({ sub: 'main' }));
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
      txt(this, tx + (tw - 4) / 2, ty + 15, tab.label, 11,
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
      txt(this, W - 14, by + 11, 'Ваши алмазы', 11, '#555577').setOrigin(1, 0);
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
    txt(this, 20, y+5, '⭐  TELEGRAM STARS', 12, '#ffc83c', true);
    txt(this, W-12, y+5, 'мгновенно', 11, '#555577').setOrigin(1, 0);
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
    txt(this, 20, y+5, '💎  CRYPTOPAY', 12, '#3cc8dc', true);
    txt(this, W-12, y+5, cryptoOn ? 'TON · USDT' : 'не настроен', 11,
      cryptoOn ? '#555577' : '#553333').setOrigin(1, 0);
    y += 30;

    if (!cryptoOn) {
      const cg = this.add.graphics();
      cg.fillStyle(C.bgPanel, 0.6); cg.fillRoundedRect(8, y, W-16, 56, 10);
      txt(this, W/2, y+18, '⚙️ CryptoPay не подключён', 11, '#555577').setOrigin(0.5);
      txt(this, W/2, y+36, 'Нужна переменная CRYPTOPAY_TOKEN', 11, '#333355').setOrigin(0.5);
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

    // Обычные пакеты (без Premium и без полного сброса)
    const cpMain = cryptoPkgs.filter(p => !p.premium && !p.full_reset);
    const cpW = (W - 32) / Math.max(1, cpMain.length);
    cpMain.forEach((pkg, i) => {
      const px = 8 + i * (cpW + 8 / Math.max(1, cpMain.length));
      this._makeCryptoCard(pkg, px, y, cpW - 4, 80, W);
    });
    y += 90;

    const cpReset = cryptoPkgs.find(p => p.full_reset);
    if (cpReset) {
      this._makeCryptoResetCard(cpReset, 8, y, W - 16, 88, W);
      y += 98;
    }

    // Premium за крипту — во всю ширину
    const cpPrem = cryptoPkgs.find(p => p.premium);
    if (cpPrem) {
      this._makeCryptoPremiumCard(cpPrem, 8, y, W-16, 52, W);
      y += 62;
    }

    y += 4;
    // Подсказка про подтверждение
    txt(this, W/2, y+4, '💡 После оплаты алмазы придут автоматически', 11, '#555577').setOrigin(0.5);

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
    bg.fillStyle(0x231e09, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(1.5, 0xffc83c, 0.6); bg.strokeRoundedRect(ix, iy, iw, ih, 11);

    txt(this, ix+iw/2, iy+22, `💎 ${pkg.diamonds}`, 15, '#f0f0fa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+40, 'алмазов', 11, '#c8b870').setOrigin(0.5);

    const btnG = this.add.graphics();
    btnG.fillStyle(0xffa000, 1.0); btnG.fillRoundedRect(ix+4, iy+56, iw-8, 18, 6);
    txt(this, ix+iw/2, iy+65, `⭐ ${pkg.stars}`, 12, '#1a1208', true).setOrigin(0.5);

    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x332d10, 1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('medium'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x231e09,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(1.5,0xffc83c,0.6); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
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
      txt(this, ix+50, iy+ih/2+8, `✅ Активна · ${daysLeft} дн.`, 11, '#b45aff');
      txt(this, iw-4, iy+ih/2-2, '— куплено —', 11, '#888899', false).setOrigin(1, 0.5);
    } else {
      txt(this, ix+50, iy+ih/2+8, 'Эксклюзивные функции', 11, '#8888aa');
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
      txt(this, ix+50, iy+ih/2+8, `✅ Активна · ${daysLeft} дн.`, 11, '#b45aff');
      txt(this, iw-4, iy+ih/2-2, '— куплено —', 11, '#888899', false).setOrigin(1, 0.5);
    } else {
      txt(this, ix+50, iy+ih/2+8, 'Эксклюзивные функции', 11, '#8888aa');
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
    bg.fillStyle(0x0d2535, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(1.5, 0x3cc8dc, 0.6); bg.strokeRoundedRect(ix, iy, iw, ih, 11);

    txt(this, ix+iw/2, iy+22, `💎 ${pkg.diamonds}`, 15, '#f0f0fa', true).setOrigin(0.5);
    txt(this, ix+iw/2, iy+40, 'алмазов', 11, '#70bcd0').setOrigin(0.5);

    const btnG = this.add.graphics();
    btnG.fillStyle(0x1a6080, 1.0); btnG.fillRoundedRect(ix+4, iy+56, iw-8, 18, 6);
    txt(this, ix+iw/2, iy+65, `${price} ${symbol}`, 12, '#3ce8ff', true).setOrigin(0.5);

    this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x163548,1); bg.fillRoundedRect(ix,iy,iw,ih,11); tg?.HapticFeedback?.impactOccurred('medium'); })
      .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x0d2535,0.95); bg.fillRoundedRect(ix,iy,iw,ih,11); bg.lineStyle(1.5,0x3cc8dc,0.6); bg.strokeRoundedRect(ix,iy,iw,ih,11); })
      .on('pointerup',   () => this._buyCrypto(pkg));
  }

  /* ── Полный сброс за USDT (CryptoPay) ───────────────── */
  _makeCryptoResetCard(pkg, ix, iy, iw, ih, W) {
    const asset  = this._cryptoAsset || 'TON';
    const usdtOnly = !!pkg.usdt_only;
    const price  = pkg.usdt;
    const canPay = !usdtOnly || asset === 'USDT';

    const bg = this.add.graphics();
    bg.fillStyle(0x2a1010, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11);
    bg.lineStyle(2, canPay ? 0xff4444 : 0x553333, canPay ? 0.85 : 0.4);
    bg.strokeRoundedRect(ix, iy, iw, ih, 11);

    const title = pkg.label || '🔄 Сброс прогресса';
    const sub = pkg.hint || 'Уровень с нуля; 💰💎 клан рефералка сохраняются';
    txt(this, ix + iw / 2, iy + 12, title, 12, '#ffaaaa', true).setOrigin(0.5);
    txt(this, ix + iw / 2, iy + 30, sub, 9, '#997777', true).setOrigin(0.5);
    if (!canPay) {
      txt(this, ix + iw / 2, iy + 48, 'Переключите валюту на USDT ↑', 10, '#cc6666', true).setOrigin(0.5);
    } else {
      txt(this, ix + iw / 2, iy + 48, `Оплата: ${price} USDT`, 11, '#3ce8ff', true).setOrigin(0.5);
    }
    txt(this, ix + iw / 2, iy + 66, 'После оплаты — /start или обновите приложение', 9, '#665555').setOrigin(0.5);

    if (canPay) {
      this.add.zone(ix, iy, iw, ih).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(0x351818, 1); bg.fillRoundedRect(ix, iy, iw, ih, 11); tg?.HapticFeedback?.impactOccurred('heavy'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(0x2a1010, 0.95); bg.fillRoundedRect(ix, iy, iw, ih, 11); bg.lineStyle(2, 0xff4444, 0.85); bg.strokeRoundedRect(ix, iy, iw, ih, 11); })
        .on('pointerup',   () => this._buyCrypto(pkg));
    }
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
      this._startCryptoPolling(invoiceId, pkg);
    } catch(_) {
      this._toast('❌ Нет соединения');
      this._buying = false;
    }
  }

  /* ── Polling для CryptoPay ───────────────────────────── */
  _startCryptoPolling(invoiceId, pkg) {
    const diamonds = pkg && typeof pkg.diamonds === 'number' ? pkg.diamonds : 0;
    let attempts = 0;
    const maxAttempts = 24; // 24 × 5s = 2 минуты
    const poll = async () => {
      attempts++;
      try {
        const r = await get(`/api/shop/crypto_check/${invoiceId}`);
        if (r.ok && r.paid) {
          this._onCryptoPaid(
            r.diamonds != null ? r.diamonds : diamonds,
            invoiceId,
            r.premium_activated,
            r.bonus_diamonds || 0,
            !!(r.profile_reset || (pkg && pkg.full_reset && r.already_confirmed)),
          );
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
        this._onCryptoPaid(
          r.diamonds || 0,
          invoiceId,
          r.premium_activated,
          r.bonus_diamonds || 0,
          !!r.profile_reset,
        );
      } else {
        this._toast('⏳ Оплата ещё не подтверждена');
      }
    } catch(_) {
      this._toast('❌ Нет соединения');
    }
  }

  /* ── Общий обработчик успешной крипто-оплаты ─────────── */
  _onCryptoPaid(diamonds, invoiceId, isPremium, bonusDiamonds = 0, profileReset = false) {
    tg?.HapticFeedback?.notificationOccurred('success');
    Sound.levelUp?.();
    localStorage.removeItem('cryptoPendingInvoice');
    let msg;
    if (profileReset) {
      msg = '🔄 Аккаунт сброшен. Обновляем профиль…';
    } else if (isPremium) {
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
    txt(this, ix + iw / 2, iy + 52, item.name, 11, '#c0c0e0')
      .setOrigin(0.5).setWordWrapWidth(iw - 10);

    /* Цена или "Скоро" */
    if (item.soon) {
      txt(this, ix + iw / 2, iy + 82, '🚧 Скоро', 11, '#333355').setOrigin(0.5);
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
        { id: null, icon: '🌟', name: 'Боевой пропуск+', price: 500, currency: 'diamonds', soon: true },
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
