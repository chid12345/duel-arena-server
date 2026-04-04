/* ============================================================
   scene_extras.js — дополнительные экраны TMA:
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
   CLAN SCENE — информация о клане
   ═══════════════════════════════════════════════════════════ */
class ClanScene extends Phaser.Scene {
  constructor() { super('Clan'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '⚔️', 'КЛАН', 'Вступи или создай клан');
    _extraBack(this, W, H);
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#555577').setOrigin(0.5);
    get('/api/clan').then(d => this._render(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _render(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }

    if (!data.clan) {
      this._renderNoClan(W, H);
    } else {
      this._renderClan(data.clan, W, H);
    }
  }

  _renderNoClan(W, H) {
    const cy = H * 0.38;
    txt(this, W/2, cy,        '🏰', 40).setOrigin(0.5);
    txt(this, W/2, cy + 50,   'Вы не в клане', 16, '#8888aa').setOrigin(0.5);
    txt(this, W/2, cy + 74,   'Вступите в клан, чтобы участвовать\nв клановых войнах и рейтинге', 11, '#444466').setOrigin(0.5).setAlign('center');

    /* Кнопки "скоро" */
    const makeBtn = (label, bx, by, bw, bh, col) => {
      const g = this.add.graphics();
      g.fillStyle(col, 0.85);
      g.fillRoundedRect(bx, by, bw, bh, 12);
      txt(this, bx + bw/2, by + bh/2, label, 13, '#f0f0fa', true).setOrigin(0.5);
      this.add.zone(bx, by, bw, bh).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          tg?.HapticFeedback?.impactOccurred('light');
          this._toast('🚧 Скоро в следующем обновлении!');
        });
    };

    const bw = (W - 48) / 2;
    makeBtn('🔍 Найти клан',   16,       H*0.62, bw, 48, C.blue);
    makeBtn('➕ Создать клан', 24 + bw,  H*0.62, bw, 48, C.purple);

    txt(this, W/2, H*0.77, 'Кланы — скоро!', 10, '#333355').setOrigin(0.5);
  }

  _renderClan(clan, W, H) {
    const mid = H * 0.35;

    /* Иконка и название */
    txt(this, W/2, mid - 28,  clan.tag ? `[${clan.tag}]` : '⚔️', 20, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, mid + 4,   clan.name || 'Клан', 20, '#f0f0fa', true).setOrigin(0.5);
    txt(this, W/2, mid + 28,  `👥 ${clan.member_count || '?'} участников`, 12, '#8888aa').setOrigin(0.5);

    /* Рейтинг */
    if (clan.clan_rating !== undefined) {
      makePanel(this, 16, mid + 52, W-32, 46, 10);
      txt(this, W/2, mid + 64, '⭐ Рейтинг клана', 11, '#555577').setOrigin(0.5);
      txt(this, W/2, mid + 82, String(clan.clan_rating), 18, '#ffc83c', true).setOrigin(0.5);
    }

    /* Описание */
    if (clan.description) {
      txt(this, W/2, mid + 116, clan.description, 11, '#8888aa').setOrigin(0.5).setWordWrapWidth(W - 40);
    }
  }

  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 100, msg, 12, '#ffc83c', true).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 30, duration: 2000, onComplete: () => t.destroy() });
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
    ];
    const tw = (W - 24) / tabs.length;
    const ty = 76;
    tabs.forEach((tab, i) => {
      const tx     = 12 + i * tw;
      const active = tab.key === this._tab;
      const bg = this.add.graphics();
      bg.fillStyle(active ? C.blue : C.dark, active ? 0.9 : 0.55);
      bg.fillRoundedRect(tx, ty, tw - 4, 30, 8);
      if (active) {
        bg.lineStyle(1, C.blue, 0.5);
        bg.strokeRoundedRect(tx, ty, tw - 4, 30, 8);
      }
      txt(this, tx + (tw - 4) / 2, ty + 15, tab.label, 10,
        active ? '#ffffff' : '#8888aa', active).setOrigin(0.5);
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

    this._goldTxt = txt(this, W / 2 + 8, by + 11, `🪙 ${p?.gold || 0}`, 13, '#ffc83c', true).setOrigin(0, 0);
    this._diaТxt  = txt(this, 20,         by + 11, `💎 ${p?.diamonds || 0}`, 13, '#3cc8dc', true);

    txt(this, W / 2 - 8, by + 11, '|', 13, '#333355').setOrigin(1, 0);
  }

  /* ── Товары ──────────────────────────────────────────── */
  _buildItems(W, H) {
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
