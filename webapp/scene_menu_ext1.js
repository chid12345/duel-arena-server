/* ============================================================
   MenuScene — ext1: _loadProfileBuffs, _buildBattlePanel,
                     _makeBattleCard
   ============================================================ */

Object.assign(MenuScene.prototype, {

  async _loadProfileBuffs() {
    // Throttle: каждый тап по «Профиль» вызывает _switchTab → _loadProfileBuffs.
    // Без debounce игрок, который часто переключается, дёргает /api/player и
    // /api/shop/inventory параллельно по 5–10 раз в минуту. На медленной сети
    // ответы накапливаются → визуально UI «зависает» при возврате в Профиль.
    // 3 сек — золотая середина: реген считается на сервере при каждом запросе
    // (после фикса HP<max → cache miss), 3 сек хватит чтобы не плодить дубли.
    const now = Date.now();
    if (this._profileBuffsBusy) return;
    if (this._profileBuffsAt && (now - this._profileBuffsAt) < 3000) return;
    this._profileBuffsBusy = true;
    this._profileBuffsAt = now;
    try {
      const [d, pd] = await Promise.all([get('/api/shop/inventory'), post('/api/player')]);
      if (!this.scene?.isActive?.()) return;

      const buffs = d?.ok ? (d.active_buffs || []) : [];
      if (pd?.ok && pd.player) {
        const _wt = State.player?.warrior_type; // сохраняем локальный выбор (сервер может ещё не сохранил)
        State.player = pd.player;
        State.playerLoadedAt = Date.now();
        if (_wt) State.player.warrior_type = _wt; // не даём гонке откатить выбор воина
        const p = pd.player;
        // Обновляем не только текст HP, но и саму полоску — иначе при возврате
        // в Профиль с подросшим HP цифры менялись, а зелёный бар оставался
        // на «после-боевом» уровне до следующего 30-сек тика _startRegenTick.
        if (this._liveHp) {
          const pct = Math.max(0, Math.min(1, (p.current_hp || 0) / Math.max(1, p.max_hp)));
          const { g, t, x, y, w, h } = this._liveHp;
          const rr2 = Math.ceil(h / 2) + 2;
          const fw = Math.max(rr2 * 2, Math.round(w * pct));
          g.clear();
          g.fillStyle(0x000000, 0.72); g.fillRoundedRect(x, y, w, h, rr2);
          g.fillStyle(0x4ade80, 0.22); g.fillRoundedRect(x, y - 1, fw, h + 2, rr2);
          g.fillGradientStyle(0x15803d, 0x86efac, 0x15803d, 0x86efac, 1);
          g.fillRoundedRect(x, y, fw, h, rr2);
          g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(x, y, fw, Math.ceil(h / 2), rr2);
          if (t) t.setText(`${p.current_hp} / ${p.max_hp}`);
        }
      }
      if (!buffs.length) return;

      const B = {};
      for (const b of buffs) B[b.buff_type] = (B[b.buff_type] || 0) + b.value;
      const p = State.player;

    } catch {}
    finally { this._profileBuffsBusy = false; }
  },

  _buildBattlePanel() {
    const { W, CONTENT_H: CH } = this;
    const p = State.player;
    // Используем new Container напрямую — он НЕ добавляется в displayList автоматически
    const c = new Phaser.GameObjects.Container(this, 0, 0);
    const PAD = 14;
    const GAP = 9;
    const rmdl = o => { try { o.removeFromDisplayList(); } catch(_) {} return o; };

    // ── Заголовок ──
    const TITLE_H = 44;
    const title = rmdl(txt(this, W / 2, 22, '⚔️  ВЫБЕРИ БОЙ', 17, '#ffc83c', true).setOrigin(0.5));

    // ── HP блок внизу фиксированной высоты ──
    const HP_H = p.hp_pct < 15 ? 78 : (p.hp_pct < 100 ? 32 : 20);

    // ── Распределяем оставшееся по 5 элементам ──
    // PvP главная (коэф 1.25), остальные 4 = 1.0
    const totalGaps  = GAP * 6; // title→pvp, pvp→tower, tower→natisk, natisk→sm, sm→bot, bot→hp
    const pool       = (CH - TITLE_H - HP_H - totalGaps) * 0.90;
    const unit       = pool / 5.25;
    const pvpH  = Math.round(unit * 1.25);
    const midH  = Math.round(unit);       // Башня, Натиск, Бот
    const smH   = Math.round(unit);       // строка малых кнопок

    let curY = TITLE_H;

    // ── PvP ──
    const pvpCard = this._makeBattleStrip(PAD, curY, W - PAD * 2, pvpH,
      0xdc3c46, '#ff6672',
      '⚔️  Поиск соперника',
      'Живой игрок · рейтинговый бой',
      '🏆 +рейтинг  💰 +30%  ⭐ +30% за победу',
      pvpH,
      () => this._onFight());
    curY += pvpH + GAP;

    // ── Башня ──
    const towerCard = this._makeBattleStrip(PAD, curY, W - PAD * 2, midH,
      0xb45aff, '#c97aff',
      '🗿  Башня Титанов',
      'PvE · прогрессия уровней · редкие награды',
      null, midH,
      () => this._onTitanFight());
    curY += midH + GAP;

    // ── Натиск ──
    const natiskCard = this._makeBattleStrip(PAD, curY, W - PAD * 2, midH,
      0xff5533, '#ff7755',
      '🔥  Натиск',
      'Арена выживания · волны врагов',
      null, midH,
      () => this.scene.start('Natisk', {}));
    curY += midH + GAP;

    // ── 2 малые кнопки в ряд ──
    const BW = (W - PAD * 2 - GAP) / 2;
    const smLeft  = this._makeSmBtn(PAD,            curY, BW, smH, 0xffc83c, '#ffdca0', '🎯', 'Вызов по нику', 'PvP дуэль',       () => this._onChallengeByNick());
    const smRight = this._makeSmBtn(PAD + BW + GAP, curY, BW, smH, 0x5096ff, '#b8d4ff', '📨', 'Мои вызовы',    'Исходящие вызовы', () => this._showOutgoingChallenges());
    this._challengesBtnPos = { x: PAD + BW + GAP, y: curY, w: BW, h: smH };
    curY += smH + GAP;

    // ── Бот ──
    const botCard = this._makeBattleStrip(PAD, curY, W - PAD * 2, midH,
      0x5096ff, '#7ab4ff',
      '🤖  Бой с ботом',
      'Практика · без рейтинга · 💰 +золото',
      null, midH,
      () => this._onBotFight());
    curY += midH + GAP;

    // ── HP блок ──
    const hpBlockObjs = [];
    const hpPct = p.hp_pct / 100;
    const hpCol = p.hp_pct > 50 ? C.green : p.hp_pct > 25 ? C.gold : C.red;
    hpBlockObjs.push(rmdl(makeBar(this, PAD, curY, W - PAD * 2, 12, hpPct, hpCol)));
    hpBlockObjs.push(
      rmdl(txt(this, W / 2, curY + 6, `❤️ ${p.current_hp}/${p.max_hp_effective ?? p.max_hp} HP`, 10, '#f0f0fa').setOrigin(0.5))
    );
    if (p.hp_pct < 100) {
      const regenStr = p.regen_secs_to_full > 0
        ? `+${p.regen_per_min}/мин · полный через ${Math.ceil(p.regen_secs_to_full / 60)}мин`
        : `+${p.regen_per_min}/мин`;
      hpBlockObjs.push(rmdl(txt(this, PAD, curY + 18, regenStr, 9, '#ddddff')));
    }
    if (p.hp_pct < 15) {
      const canAfford = (p.gold || 0) >= 12;
      const btnBY = curY + 32;
      const qBg = rmdl(this.add.graphics());
      qBg.fillStyle(canAfford ? C.red : C.dark, canAfford ? 0.88 : 0.55);
      qBg.fillRoundedRect(PAD, btnBY, W - PAD * 2, 38, 10);
      if (canAfford) { qBg.lineStyle(1.5, C.gold, 0.3); qBg.strokeRoundedRect(PAD, btnBY, W - PAD * 2, 38, 10); }
      const qLabel = canAfford ? `🧪 Выпить малое зелье  —  12 🪙` : `🧪 Нужно 12 🪙 (у вас ${p.gold || 0})`;
      const qT = rmdl(txt(this, W / 2, btnBY + 19, qLabel, 11, canAfford ? '#ffffff' : '#cc8888', true).setOrigin(0.5));
      const qZ = rmdl(this.add.zone(PAD, btnBY, W - PAD * 2, 38).setOrigin(0).setInteractive({ useHandCursor: canAfford }));
      if (canAfford) {
        qZ.on('pointerdown', () => { qBg.clear(); qBg.fillStyle(0x991a22,1); qBg.fillRoundedRect(PAD,btnBY,W-PAD*2,38,10); tg?.HapticFeedback?.impactOccurred('medium'); });
        qZ.on('pointerout',  () => { qBg.clear(); qBg.fillStyle(C.red,0.88); qBg.fillRoundedRect(PAD,btnBY,W-PAD*2,38,10); qBg.lineStyle(1.5,C.gold,0.3); qBg.strokeRoundedRect(PAD,btnBY,W-PAD*2,38,10); });
        qZ.on('pointerup',   () => this._quickHeal(qBg, qT, qZ, PAD, btnBY, W - PAD * 2, 38));
      }
      hpBlockObjs.push(qBg, qT, qZ);
    }

    const children = [
      title,
      ...pvpCard, ...towerCard, ...natiskCard,
      ...smLeft, ...smRight,
      ...botCard,
      ...hpBlockObjs,
    ];
    children.forEach(o => c.add(o));
    this.sys.displayList.add(c);
    c.setVisible(false);
    this._panels.battle = c;
    this._checkIncomingChallenge();
  },

  /* Карточка с цветной полосой слева, h-адаптивные тексты */
  _makeBattleStrip(x, y, w, h, stripCol, nameCol, name, sub, bonus, cardH, cb) {
    const rmdl = o => { try { o.removeFromDisplayList(); } catch(_) {} return o; };
    const objs = [];

    const bg = rmdl(this.add.graphics());
    bg.fillStyle(0x1a1828, 1);
    bg.fillRoundedRect(x, y, w, h, 12);
    objs.push(bg);

    const strip = rmdl(this.add.graphics());
    strip.fillStyle(stripCol, 1);
    strip.fillRoundedRect(x, y, 5, h, { tl: 12, bl: 12, tr: 2, br: 2 });
    objs.push(strip);

    const tx  = x + 16;
    const mid = y + h / 2;

    if (bonus) {
      // 3 строки: название, подпись, бонус
      objs.push(rmdl(txt(this, tx, mid - h * 0.26, name,  14, nameCol, true)));
      objs.push(rmdl(txt(this, tx, mid,             sub,   11, '#ddddff')));
      objs.push(rmdl(txt(this, tx, mid + h * 0.26,  bonus, 10, '#ffc83c')));
    } else {
      // 2 строки: название + подпись
      objs.push(rmdl(txt(this, tx, mid - h * 0.18, name, 13, nameCol, true)));
      objs.push(rmdl(txt(this, tx, mid + h * 0.18, sub,  11, '#ddddff')));
    }

    const z = rmdl(this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true }));
    z.on('pointerdown', () => { tg?.HapticFeedback?.impactOccurred('medium'); bg.clear(); bg.fillStyle(0x221f36,1); bg.fillRoundedRect(x,y,w,h,12); });
    z.on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a1828,1); bg.fillRoundedRect(x,y,w,h,12); });
    z.on('pointerup',   () => { bg.clear(); bg.fillStyle(0x1a1828,1); bg.fillRoundedRect(x,y,w,h,12); cb(); });
    objs.push(z);
    return objs;
  },

  /* Малая кнопка (половина строки) */
  _makeSmBtn(x, y, w, h, stripCol, nameCol, emo, name, sub, cb) {
    const rmdl = o => { try { o.removeFromDisplayList(); } catch(_) {} return o; };
    const objs = [];
    const bg = rmdl(this.add.graphics());
    bg.fillStyle(0x1a1828, 1);
    bg.fillRoundedRect(x, y, w, h, 10);
    objs.push(bg);

    const strip = rmdl(this.add.graphics());
    strip.fillStyle(stripCol, 1);
    strip.fillRoundedRect(x, y, 4, h, { tl: 10, bl: 10, tr: 2, br: 2 });
    objs.push(strip);

    const mid = y + h / 2;
    objs.push(rmdl(txt(this, x + 14, mid - h * 0.17, emo + ' ' + name, 11, nameCol, true)));
    objs.push(rmdl(txt(this, x + 14, mid + h * 0.18, sub, 9.5, '#ddddff')));

    const z = rmdl(this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true }));
    z.on('pointerdown', () => { tg?.HapticFeedback?.impactOccurred('light'); bg.clear(); bg.fillStyle(0x221f36,1); bg.fillRoundedRect(x,y,w,h,10); });
    z.on('pointerout',  () => { bg.clear(); bg.fillStyle(0x1a1828,1); bg.fillRoundedRect(x,y,w,h,10); });
    z.on('pointerup',   () => { bg.clear(); bg.fillStyle(0x1a1828,1); bg.fillRoundedRect(x,y,w,h,10); cb(); });
    objs.push(z);
    return objs;
  },

  // Совместимость
  _makeBattleCard(cx, cy, title, sub, bonus, borderColor, fillColor, cb) {
    return this._makeBattleStrip(cx - 140, cy - 50, 280, 100, borderColor, '#f0f0fa', title, sub, bonus, 100, cb);
  },

});
