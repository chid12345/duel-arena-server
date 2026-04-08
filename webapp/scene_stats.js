/* ============================================================
   StatsScene — распределение свободных статов
   Открывается из MenuScene: this.scene.start('Stats')
   ============================================================ */

class StatsScene extends Phaser.Scene {
  constructor() { super('Stats'); }

  init(data) {
    if (data && data.player) State.player = data.player;
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W;
    this.H = H;
    this._busy = false;
    this._statRows = {};

    this._drawBg(W, H);
    this._buildHeader(W);
    this._buildBattleStats(W);
    this._buildStatRows(W, H);
    this._buildCombatPreview(W, H);
    this._buildAvatarBtn(W, H);
    this._buildBackBtn(W, H);
  }

  /* ── Фон ─────────────────────────────────────────────── */
  _drawBg(W, H) {
    /* Градиент без сетки — сетка давала 50+ draw-call и тормоза при входе */
    const g = this.add.graphics();
    g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
    g.fillRect(0, 0, W, H);
  }

  /* ── Шапка ───────────────────────────────────────────── */
  _buildHeader(W) {
    const p = State.player;
    makePanel(this, 8, 8, W - 16, 62, 12);

    /* Кнопка «‹» занимает x=10..54 — контент начинаем с x=60 */
    // Бейдж уровня (сдвинут вправо от кнопки «‹»)
    const bg = this.add.graphics();
    bg.fillStyle(C.gold, 1);
    bg.fillRoundedRect(60, 18, 52, 26, 7);
    txt(this, 86, 31, `УР.${p.level}`, 13, '#1a1a28', true).setOrigin(0.5);

    const uname = (p.username || '').slice(0, 14);
    txt(this, 122, 20, uname, 14, '#f0f0fa', true);
    const tline = p.display_title ? `🏵 ${p.display_title}  · ` : '';
    txt(this, 122, 38, `${tline}★ ${p.rating}  ·  СТАТЫ`, 10, '#ffc83c');

    // Счётчик свободных статов
    this._fsBadge = this._makeFsBadge(W, p.free_stats);
  }

  _makeFsBadge(W, count) {
    if (this._fsBadgeObjs) {
      this._fsBadgeObjs.forEach(o => o.destroy());
    }
    const active = count > 0;
    const bx = W - 16;
    const bg = this.add.graphics();
    bg.fillStyle(active ? C.purple : C.dark, active ? 0.85 : 0.5);
    bg.fillRoundedRect(bx - 78, 19, 78, 30, 9);
    if (active) {
      bg.lineStyle(1.5, C.purple, 0.7);
      bg.strokeRoundedRect(bx - 78, 19, 78, 30, 9);
    }
    const label = txt(this, bx - 39, 34,
      active ? `⚡ ${count} свободн.` : '✅ все вложены',
      10, active ? '#f0f0fa' : '#9999bb', active
    ).setOrigin(0.5);

    if (active) {
      this.tweens.add({
        targets: bg, alpha: 0.55,
        duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    this._fsBadgeObjs = [bg, label];
    return { bg, label };
  }

  /* ── Боевая статистика (под заголовком) ──────────────── */
  _buildBattleStats(W) {
    const p     = State.player;
    const wins  = p.wins   || 0;
    const losses= p.losses || 0;
    const total = wins + losses;
    const wr    = total > 0 ? Math.round(wins / total * 100) : 0;
    const streak= p.win_streak || 0;

    const y = 74;
    makePanel(this, 8, y, W - 16, 34, 8, 0.85);

    const cols = [
      { v: String(wins),   sub: 'Победы',   col: '#3cc864' },
      { v: String(losses), sub: 'Пораж.',   col: '#dc3c46' },
      { v: `${wr}%`,       sub: 'Винрейт',  col: '#ffc83c' },
      { v: String(streak), sub: 'Серия 🔥', col: '#ff8844' },
    ];
    const cw = (W - 16) / cols.length;
    cols.forEach((c, i) => {
      const cx = 8 + cw * (i + 0.5);
      txt(this, cx, y + 10, c.v,   13, c.col, true).setOrigin(0.5);
      txt(this, cx, y + 24, c.sub,  8, '#9999bb').setOrigin(0.5);
    });
  }

  /* ── Строки статов ───────────────────────────────────── */
  _buildStatRows(W, H) {
    const p = State.player;

    const STATS = [
      {
        key:      'strength',
        icon:     '💪',
        label:    'Сила',
        color:    C.red,
        valFn:    q => q.strength,
        effectFn: q => `~${q.dmg} урона`,
        desc:     'Увеличивает урон по противнику',
      },
      {
        key:      'agility',
        icon:     '🤸',
        label:    'Ловкость',
        color:    C.cyan,
        valFn:    q => q.agility,
        effectFn: q => `${q.dodge_pct}% уворот`,
        desc:     'Шанс уклониться от удара',
      },
      {
        key:      'intuition',
        icon:     '💥',
        label:    'Интуиция',
        color:    C.purple,
        valFn:    q => q.intuition,
        effectFn: q => `${q.crit_pct}% крит`,
        desc:     'Шанс нанести критический удар',
      },
      {
        key:      'stamina',
        icon:     '🛡',
        label:    'Выносливость',
        color:    C.green,
        valFn:    q => q.stamina,
        effectFn: q => `${q.armor_pct}% броня`,
        desc:     '+2 HP за каждое вложение',
      },
    ];

    // Область: от 116px (после панели боевой статистики) до начала combat preview
    const areaTop = 116;
    const areaBot = H * 0.62;
    const rowH    = (areaBot - areaTop) / STATS.length;

    STATS.forEach((s, i) => {
      const y = areaTop + i * rowH;
      this._statRows[s.key] = this._buildStatRow(s, 8, y, W - 16, rowH - 5, p);
    });
  }

  _statBase(p, key) {
    return Number(p?.stats_base?.[key] ?? p?.[key] ?? 0);
  }

  _statBonus(p, key) {
    return Number(p?.stats_bonus_total?.[key] ?? 0);
  }

  _buildStatRow(s, x, y, w, h, p) {
    const hasStats = State.player.free_stats > 0;
    // Конвертируем число-цвет в CSS-строку для txt()
    const hex = `#${s.color.toString(16).padStart(6, '0')}`;

    /* Панель */
    const panel = this.add.graphics();
    panel.fillStyle(C.bgPanel, 0.92);
    panel.fillRoundedRect(x, y, w, h, 10);
    panel.lineStyle(2, s.color, 0.30);
    panel.strokeRoundedRect(x, y, w, h, 10);

    /* Цветная полоска слева */
    const stripe = this.add.graphics();
    stripe.fillStyle(s.color, 1);
    stripe.fillRoundedRect(x + 2, y + 8, 5, h - 16, 2);

    /* Иконка + название */
    txt(this, x + 16, y + 9, `${s.icon} ${s.label}`, 13, '#f0f0fa', true);

    /* Значение — крупно, в цвете стата */
    const valTxt = txt(this, x + 16, y + 26, String(s.valFn(p)), 24, hex, true);
    const baseVal = this._statBase(p, s.key);
    const bonusVal = this._statBonus(p, s.key);
    const breakdownTxt = txt(this, x + 16, y + 49, `база ${baseVal} | бонусы +${bonusVal}`, 8, '#a8a8c8');

    /* Мини-бар */
    const barX = x + 16;
    const barY = y + h - 13;
    const barW = Math.round(w * 0.42);
    const maxExp = Math.max(1, 3 + p.level * 2);
    const pct = Math.min(1, s.valFn(p) / maxExp);
    const barBg = this.add.graphics();
    barBg.fillStyle(C.dark, 1);
    barBg.fillRoundedRect(barX, barY, barW, 5, 2);
    const barFill = this.add.graphics();
    barFill.fillStyle(s.color, 0.85);
    barFill.fillRoundedRect(barX, barY, Math.max(5, Math.round(barW * pct)), 5, 2);

    /* Эффект + описание (правая часть, перед кнопкой) */
    const midRight = x + w - 62;
    const effectTxt = txt(this, midRight, y + 14, s.effectFn(p), 13, hex, true).setOrigin(1, 0.5);
    txt(this, midRight, y + 30, s.desc, 9, '#9999bb').setOrigin(1, 0);

    /* Кнопка +1 */
    const btnW = 48;
    const btnH = h - 14;
    const btnX = x + w - btnW - 4;
    const btnY = y + 7;
    const btn  = this.add.graphics();
    this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, hasStats, false);

    const btnTxt = txt(this, btnX + btnW / 2, btnY + btnH / 2,
      hasStats ? '+1' : '—', 16,
      hasStats ? '#ffffff' : '#8888aa', true
    ).setOrigin(0.5);

    /* Интерактив */
    const zone = this.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH);
    if (hasStats) {
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, true, true);
      });
      zone.on('pointerup', () => {
        this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, true, false);
        this._onTrain(s.key);
      });
      zone.on('pointerout', () => {
        this._drawPlusBtn(btn, btnX, btnY, btnW, btnH, s.color, true, false);
      });
    }

    return { s, valTxt, breakdownTxt, barFill, effectTxt, btn, btnTxt, zone,
             barX, barY, barW, btnX, btnY, btnW, btnH };
  }

  _drawPlusBtn(g, x, y, w, h, color, active, pressed) {
    g.clear();
    if (!active) {
      g.fillStyle(C.dark, 0.45);
      g.fillRoundedRect(x, y, w, h, 9);
      g.lineStyle(1, 0x333355, 0.5);
      g.strokeRoundedRect(x, y, w, h, 9);
      return;
    }
    const col = pressed
      ? Phaser.Display.Color.IntegerToColor(color).darken(30).color
      : color;
    g.fillStyle(col, 1);
    g.fillRoundedRect(x, y, w, h, 9);
    // Блик
    g.fillStyle(0xffffff, pressed ? 0.06 : 0.14);
    g.fillRoundedRect(x + 3, y + 3, w - 6, Math.round(h * 0.45), 7);
    // Рамка
    g.lineStyle(1.5, 0xffffff, 0.15);
    g.strokeRoundedRect(x, y, w, h, 9);
  }

  /* ── Боевые показатели ───────────────────────────────── */
  _buildCombatPreview(W, H) {
    const p   = State.player;
    const py  = H * 0.63;
    const ph  = H * 0.205;

    makePanel(this, 8, py, W - 16, ph, 12);

    txt(this, W / 2, py + 10, 'БОЕВЫЕ ПОКАЗАТЕЛИ', 11, '#9999bb', true).setOrigin(0.5);

    const divider = this.add.graphics();
    divider.lineStyle(1, C.gold, 0.12);
    divider.lineBetween(20, py + 24, W - 20, py + 24);

    const cells = [
      { key: 'dmg',   label: '⚔️ Урон',   valFn: q => `~${q.dmg}`,       color: C.red,    hex: '#dc3c46' },
      { key: 'armor', label: '🛡 Броня',   valFn: q => `-${q.armor_pct}%`, color: C.green,  hex: '#3cc864' },
      { key: 'dodge', label: '🤸 Уворот',  valFn: q => `${q.dodge_pct}%`,  color: C.cyan,   hex: '#3cc8dc' },
      { key: 'crit',  label: '💥 Крит',    valFn: q => `${q.crit_pct}%`,   color: C.purple, hex: '#b45aff' },
    ];

    this._combatCells = {};
    cells.forEach((c, i) => {
      const cx   = W * (0.13 + i * 0.25);
      const cHex = `#${c.color.toString(16).padStart(6, '0')}`;
      txt(this, cx, py + 34, c.label, 9, '#8888aa').setOrigin(0.5);
      const valT = txt(this, cx, py + 52, c.valFn(p), 18, cHex, true).setOrigin(0.5);
      this._combatCells[c.key] = { t: valT, fn: c.valFn };
    });

    txt(this, W / 2, py + ph - 12,
      'относительно среднего противника вашего уровня',
      9, '#9999bb').setOrigin(0.5);

    // Блок пассивных способностей — компактный, перед кнопкой
    const passY = py + ph + 6;
    const passH = 54;
    const passW = W - 24;
    const passBg = this.add.graphics();
    passBg.fillStyle(0x1a1830, 0.9);
    passBg.fillRoundedRect(12, passY, passW, passH, 10);
    passBg.lineStyle(1.5, 0x4a4870, 0.6);
    passBg.strokeRoundedRect(12, passY, passW, passH, 10);

    txt(this, W / 2, passY + 10, '⚡ Пассивные способности', 10, '#9090cc', true).setOrigin(0.5);
    txt(this, W / 2, passY + 26, '💥 Крит-пробой блока  ·  🤸 Уворот → 2й удар', 10, '#c8a0ff').setOrigin(0.5);
    txt(this, W / 2, passY + 42, '🛡 Поглощение 50%  ·  💪 Пролом брони', 10, '#ffc870').setOrigin(0.5);
  }

  _buildAvatarBtn(W, H) {
    const y = H * 0.935;
    const w = Math.min(220, W - 32);
    const x = (W - w) / 2;
    const h = 34;
    const g = this.add.graphics();
    g.fillStyle(0x2a2840, 0.95);
    g.fillRoundedRect(x, y, w, h, 9);
    g.lineStyle(1.5, C.purple, 0.75);
    g.strokeRoundedRect(x, y, w, h, 9);
    txt(this, W / 2, y + h / 2, '🖼 Образы (классы)', 12, '#f0f0fa', true).setOrigin(0.5);
    const z = this.add.zone(W / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => this._openAvatarPanel());
  }

  async _openAvatarPanel() {
    if (this._avatarBusy) return;
    this._avatarBusy = true;
    let data;
    try {
      data = await get('/api/avatars');
    } catch (e) {
      this._avatarBusy = false;
      this._showToast('❌ Образы: нет соединения');
      return;
    }
    this._avatarBusy = false;
    if (!data?.ok) {
      const why = data?.reason
        ? String(data.reason)
        : (data?._httpStatus ? `HTTP ${data._httpStatus}` : 'Не удалось загрузить образы');
      this._showToast(`❌ ${why}`);
      return;
    }
    this._renderAvatarOverlay(data.avatars || []);
  }

  _renderAvatarOverlay(avatars) {
    this._closeAvatarOverlay();
    const W = this.W, H = this.H;
    const overlay = [];

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(120);
    overlay.push(dim);
    const panelY = 56;
    const panelH = H - 112;
    makePanel(this, 8, panelY, W - 16, panelH, 12, 0.98).setDepth?.(121);
    const title = txt(this, W / 2, panelY + 14, '🖼 Образы', 14, '#f0f0fa', true).setOrigin(0.5).setDepth(122);
    overlay.push(title);

    const closeBg = this.add.graphics().setDepth(122);
    closeBg.fillStyle(0x3a2030, 1);
    closeBg.fillRoundedRect(W - 44, panelY + 8, 28, 24, 7);
    closeBg.lineStyle(1, 0xff6688, 0.9);
    closeBg.strokeRoundedRect(W - 44, panelY + 8, 28, 24, 7);
    const closeTxt = txt(this, W - 30, panelY + 20, '✕', 12, '#ffd8e0', true).setOrigin(0.5).setDepth(123);
    const closeZone = this.add.zone(W - 30, panelY + 20, 28, 24).setInteractive({ useHandCursor: true }).setDepth(124);
    closeZone.on('pointerdown', () => this._closeAvatarOverlay());
    overlay.push(closeBg, closeTxt, closeZone);

    const top = panelY + 40;
    const cardW = Math.floor((W - 32 - 8) / 2);
    const cardH = 90;
    const gapX = 8;
    const gapY = 8;
    const navY = panelY + panelH - 26;
    const rowsPerPage = 3;
    const perPage = rowsPerPage * 2;
    const pageCount = Math.max(1, Math.ceil((avatars.length || 0) / perPage));
    this._avatarPage = Math.min(this._avatarPage || 0, pageCount - 1);
    const cardsLayer = [];

    const clearCards = () => {
      cardsLayer.forEach(o => { try { o.destroy(); } catch (e) {} });
      cardsLayer.length = 0;
    };

    const pageLabel = txt(this, W / 2, navY + 2, '', 10, '#c8c8e8', true).setOrigin(0.5).setDepth(124);
    overlay.push(pageLabel);

    const mkNavBtn = (x, label, onClick) => {
      const bg = this.add.graphics().setDepth(123);
      bg.fillStyle(0x2a2840, 0.95);
      bg.fillRoundedRect(x - 36, navY - 10, 72, 22, 7);
      bg.lineStyle(1, C.purple, 0.8);
      bg.strokeRoundedRect(x - 36, navY - 10, 72, 22, 7);
      const t = txt(this, x, navY + 1, label, 10, '#f0f0fa', true).setOrigin(0.5).setDepth(124);
      const z = this.add.zone(x, navY + 1, 72, 22).setInteractive({ useHandCursor: true }).setDepth(125);
      z.on('pointerdown', onClick);
      overlay.push(bg, t, z);
    };

    const renderPage = () => {
      clearCards();
      const page = this._avatarPage || 0;
      pageLabel.setText(`Страница ${page + 1}/${pageCount}`);
      const start = page * perPage;
      const pageItems = avatars.slice(start, start + perPage);
      pageItems.forEach((a, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 12 + col * (cardW + gapX);
        const y = top + row * (cardH + gapY);
        const card = this.add.graphics().setDepth(122);
        const accent = a.equipped ? C.green : (a.unlocked ? C.blue : C.dark);
        card.fillStyle(0x1b1a30, 0.96);
        card.fillRoundedRect(x, y, cardW, cardH, 9);
        card.lineStyle(1.5, accent, 0.8);
        card.strokeRoundedRect(x, y, cardW, cardH, 9);
        cardsLayer.push(card);

        const badge = a.badge || '🖼';
        cardsLayer.push(txt(this, x + 10, y + 8, `${badge} ${a.name || a.id}`, 10, '#f0f0fa', true).setDepth(123));
        cardsLayer.push(txt(this, x + 10, y + 24, (a.description || '').slice(0, 44), 8, '#a8a8c8').setDepth(123));
        cardsLayer.push(txt(this, x + 10, y + 38, `+${a.effective_strength || 0} С  +${a.effective_endurance || 0} Л`, 8, '#ffc83c').setDepth(123));
        cardsLayer.push(txt(this, x + 10, y + 50, `+${a.effective_crit || 0} К  +${a.effective_hp_flat || 0} HP`, 8, '#ffc83c').setDepth(123));

        let btnLabel = 'Экипировать';
        let action = 'equip';
        if (a.equipped) {
          btnLabel = 'Надет';
          action = 'none';
        } else if (!a.unlocked) {
          if (a.currency === 'gold') btnLabel = `Купить ${a.price} 🪙`;
          else if (a.currency === 'diamonds') btnLabel = `Купить ${a.price} 💎`;
          else if (a.currency === 'stars') btnLabel = 'Купить за ⭐';
          else if (a.currency === 'usdt') btnLabel = 'Купить за USDT';
          else btnLabel = 'Недоступно';
          action = (a.currency === 'gold' || a.currency === 'diamonds') ? 'buy' : 'none';
        }
        const bx = x + 8, by = y + cardH - 28, bw = cardW - 16, bh = 20;
        const btn = this.add.graphics().setDepth(123);
        const bcol = action === 'none' ? 0x3a3a52 : (action === 'buy' ? C.gold : C.green);
        btn.fillStyle(bcol, 0.95);
        btn.fillRoundedRect(bx, by, bw, bh, 7);
        const bt = txt(this, bx + bw / 2, by + bh / 2, btnLabel, 9, '#101020', true).setOrigin(0.5).setDepth(124);
        cardsLayer.push(btn, bt);
        if (action !== 'none') {
          const z = this.add.zone(bx + bw / 2, by + bh / 2, bw, bh).setInteractive({ useHandCursor: true }).setDepth(125);
          z.on('pointerdown', () => this._avatarAction(action, a));
          cardsLayer.push(z);
        }
      });
    };

    mkNavBtn(W / 2 - 86, '◀ Назад', () => {
      if ((this._avatarPage || 0) <= 0) return;
      this._avatarPage -= 1;
      renderPage();
    });
    mkNavBtn(W / 2 + 86, 'Вперед ▶', () => {
      if ((this._avatarPage || 0) >= pageCount - 1) return;
      this._avatarPage += 1;
      renderPage();
    });
    renderPage();

    const closeDim = this.add.zone(W / 2, H / 2, W, H).setInteractive().setDepth(119);
    closeDim.on('pointerdown', () => {});
    overlay.push(closeDim);
    this._avatarOverlay = overlay;
  }

  async _avatarAction(action, avatar) {
    if (this._avatarBusy) return;
    this._avatarBusy = true;
    try {
      let res = null;
      if (action === 'buy') res = await post('/api/avatars/buy', { avatar_id: avatar.id });
      if (action === 'equip') res = await post('/api/avatars/equip', { avatar_id: avatar.id });
      if (res?.ok) {
        if (res.player) {
          State.player = res.player;
          State.playerLoadedAt = Date.now();
          this._refreshCombat(State.player);
        }
        this._showToast(action === 'buy' ? '✅ Образ куплен' : '✅ Образ надет');
        this._renderAvatarOverlay(res.avatars || []);
      } else {
        this._showToast(`❌ ${res?.reason || 'Ошибка'}`);
      }
    } catch (e) {
      this._showToast('❌ Ошибка сети');
    } finally {
      this._avatarBusy = false;
    }
  }

  _closeAvatarOverlay() {
    if (!this._avatarOverlay) return;
    this._avatarOverlay.forEach(o => {
      try { o.destroy(); } catch (e) {}
    });
    this._avatarOverlay = null;
  }

  /* ── Кнопка назад ────────────────────────────────────── */
  _buildBackBtn(W, H) {
    makeBackBtn(this, 'Назад', () => {
      this.scene.start('Menu', { returnTab: 'profile' });
    });
  }

  /* ── Прокачка ─────────────────────────────────────────── */
  async _onTrain(statKey) {
    if (this._busy) return;
    if (State.player.free_stats <= 0) {
      this._showToast('❌ Нет свободных статов!');
      return;
    }

    this._busy = true;
    tg?.HapticFeedback?.impactOccurred('medium');

    let res;
    try {
      res = await post('/api/player/train', { stat: statKey });
    } catch(e) {
      this._showToast('❌ Нет соединения');
      this._busy = false;
      return;
    }

    if (!res.ok) {
      this._showToast(res.reason === 'no_free_stats' ? '❌ Нет свободных статов!' : '❌ Ошибка');
      this._busy = false;
      return;
    }

    // Обновляем данные (и сбрасываем клиентский кэш меню)
    const prev = State.player;
    State.player = res.player;
    State.playerLoadedAt = Date.now();
    tg?.HapticFeedback?.notificationOccurred('success');

    // Анимируем строку
    const row = this._statRows[statKey];
    if (row) this._animateRow(row, res.player, prev.free_stats - 1);

    // Обновляем боевые %
    this._refreshCombat(res.player);

    // Обновляем бейдж
    this._makeFsBadge(this.W, res.player.free_stats);

    // Летящий +1
    if (row) this._spawnFloat(row.btnX + row.btnW / 2, row.btnY, '+1');

    // Если статов не осталось — перерисовать все кнопки
    if (res.player.free_stats <= 0) this._disableAllBtns();

    this._busy = false;
  }

  _animateRow(row, p, newFree) {
    const { s, valTxt, breakdownTxt, barFill, effectTxt, barX, barY, barW } = row;

    // Значение
    valTxt.setText(String(s.valFn(p)));
    const baseVal = this._statBase(p, s.key);
    const bonusVal = this._statBonus(p, s.key);
    breakdownTxt.setText(`база ${baseVal} | бонусы +${bonusVal}`);
    this.tweens.add({
      targets: valTxt, scaleX: 1.35, scaleY: 1.35,
      duration: 130, yoyo: true, ease: 'Back.easeOut',
    });

    // Полоска
    barFill.clear();
    const maxExp = Math.max(1, 3 + p.level * 2);
    const pct    = Math.min(1, s.valFn(p) / maxExp);
    barFill.fillStyle(s.color, 0.75);
    barFill.fillRoundedRect(barX, barY, Math.max(5, Math.round(barW * pct)), 5, 2);

    // Эффект
    effectTxt.setText(s.effectFn(p));
    this.tweens.add({ targets: effectTxt, alpha: 0.2, duration: 80, yoyo: true });
  }

  _disableAllBtns() {
    Object.values(this._statRows).forEach(row => {
      row.zone.disableInteractive();
      this._drawPlusBtn(row.btn, row.btnX, row.btnY, row.btnW, row.btnH, row.s.color, false, false);
      row.btnTxt.setText('—').setStyle({ color: '#8888aa' });
    });
  }

  _refreshCombat(p) {
    Object.values(this._combatCells).forEach(cell => {
      const newVal = cell.fn(p);
      if (cell.t.text !== newVal) {
        cell.t.setText(newVal);
        this.tweens.add({ targets: cell.t, alpha: 0.15, duration: 80, yoyo: true });
      }
    });
  }

  /* ── Вспомогательные ─────────────────────────────────── */
  _spawnFloat(x, y, msg) {
    const t = txt(this, x, y, msg, 22, '#ffc83c', true).setOrigin(0.5).setAlpha(1);
    this.tweens.add({
      targets: t, y: y - 70, alpha: 0,
      duration: 850, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  _showToast(msg) {
    const t = txt(this, this.W / 2, this.H - 52, msg, 12, '#ff4455', true)
      .setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1,
      duration: 200, hold: 1400, yoyo: true,
      onComplete: () => t.destroy(),
    });
  }
}
