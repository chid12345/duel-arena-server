/* ============================================================
   BattleScene — ext3: _showCard, _hideCard, _buildMuteBtn,
     _buildArena, _buildHUDs, shutdown
   ============================================================ */

Object.assign(BattleScene.prototype, {

  _showCard(who) {
    if (this._oppCardOpen) return;
    this._oppCardOpen = true;
    tg?.HapticFeedback?.impactOccurred('light');

    const { W, H } = this;
    const b  = State.battle || {};
    const me = State.player || {};

    const isMe = (who === 'me');
    const isPrem = isMe ? !!me.is_premium   : !!b.opp_is_premium;
    const isBot  = isMe ? false              : !!b.opp_is_bot;
    const name   = isMe ? (me.username || 'Вы')      : (b.opp_name  || 'Соперник');
    const level  = isMe ? (me.level    || 1)          : (b.opp_level || 1);
    const rating = isMe ? (me.rating   || '—')        : (b.opp_rating || '—');
    const curHp  = isMe ? (me.current_hp || b.my_hp)  : (b.opp_hp  || 0);
    const maxHp  = isMe ? (me.max_hp   || b.my_max_hp): (b.opp_max_hp || 1);
    const stats  = isMe
      ? [
          { icon: '💪', label: 'Сила',     val: me.strength  || 0, col: '#dc3c46' },
          { icon: '🤸', label: 'Ловкость', val: me.agility   || 0, col: '#3cc8dc' },
          { icon: '💥', label: 'Интуиция', val: me.intuition || 0, col: '#b45aff' },
          { icon: '🛡', label: 'Выносл.',  val: me.stamina   || 0, col: '#3cc864' },
        ]
      : [
          { icon: '💪', label: 'Сила',     val: b.opp_strength  || 0, col: '#dc3c46' },
          { icon: '🤸', label: 'Ловкость', val: b.opp_agility   || 0, col: '#3cc8dc' },
          { icon: '💥', label: 'Интуиция', val: b.opp_intuition || 0, col: '#b45aff' },
          { icon: '🛡', label: 'Выносл.',  val: b.opp_stamina   || 0, col: '#3cc864' },
        ];
    const spriteKey = isMe ? 'warrior_blue' : 'warrior_red';
    const typeStr   = isMe ? '🧑 Вы'        : (isBot ? '🤖 Бот' : '⚔️ Игрок');
    const typeCol   = isMe ? '#5096ff'       : (isBot ? '#8888aa' : '#3cc864');
    const borderCol = isPrem ? 0xffc83c : (isMe ? 0x5096ff : 0x444466);
    const bgCol     = isPrem ? 0x1a1508 : (isMe ? 0x0a1428 : 0x141420);

    const objs = [];
    const add  = o => { objs.push(o); return o; };

    const cw = W - 36, ch = 242;
    const cx = 18, cy = Math.round(H * 0.17);

    const overlay = add(this.add.graphics());
    overlay.fillStyle(0x000000, 0.60);
    overlay.fillRect(0, 0, W, H);

    const card = add(this.add.graphics());
    card.fillStyle(bgCol, 1);
    card.fillRoundedRect(cx, cy, cw, ch, 14);
    card.lineStyle(2, borderCol, isPrem ? 1 : 0.8);
    card.strokeRoundedRect(cx, cy, cw, ch, 14);
    if (isPrem) {
      card.lineStyle(8, 0xffc83c, 0.10);
      card.strokeRoundedRect(cx - 3, cy - 3, cw + 6, ch + 6, 16);
    }

    const bgZone = add(this.add.zone(0, 0, W, H).setOrigin(0).setInteractive());
    bgZone.on('pointerup', (ptr) => {
      if (ptr.x < cx || ptr.x > cx+cw || ptr.y < cy || ptr.y > cy+ch) this._hideCard();
    });

    const con = add(this.add.container(0, 0));

    const t = (x, y, str, sz, col = '#f0f0fa', bold = false) => {
      const o = this.add.text(x, y, str, {
        fontSize: `${sz}px`, color: col,
        fontFamily: 'system-ui, sans-serif',
        fontStyle: bold ? 'bold' : 'normal',
        resolution: 2,
      }).setOrigin(0);
      con.add(o);
      return o;
    };
    const tC = (x, y, str, sz, col, bold) => t(x, y, str, sz, col, bold).setOrigin(0.5);
    const tR = (x, y, str, sz, col) => t(x, y, str, sz, col).setOrigin(1, 0);

    t(cx + 14, cy + 11, typeStr, 10, typeCol, true);
    tR(cx + cw - 12, cy + 10, '✕', 16, '#9999bb');

    const nameStr = (isPrem ? '👑 ' : '') + name;
    tC(cx + cw / 2, cy + 34, nameStr, 17, isPrem ? '#ffc83c' : '#f0f0fa', true);
    tC(cx + cw / 2, cy + 55, `Ур. ${level}  ·  ★ ${rating}`, 11, isPrem ? '#cc9900' : '#8888aa');

    const divG = this.add.graphics();
    divG.lineStyle(1, isPrem ? 0xffc83c : 0x2a2850, 0.5);
    divG.lineBetween(cx + 12, cy + 68, cx + cw - 12, cy + 68);
    con.add(divG);

    const spr = this.add.image(cx + 58, cy + 128, spriteKey)
      .setScale(1.4).setFlipX(!isMe);
    con.add(spr);
    this.tweens.add({ targets: spr, y: cy + 122, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const hpPct = Math.min(1, Math.max(0, curHp / maxHp));
    const hpCol = hpPct > 0.5 ? '#3cc864' : hpPct > 0.25 ? '#ffc83c' : '#dc3c46';
    const hpHex = hpPct > 0.5 ? 0x3cc864 : hpPct > 0.25 ? 0xffc83c : 0xdc3c46;
    const hpX = cx + 114, hpY = cy + 76, hpW = cw - 126;
    t(hpX, hpY, '❤️ HP', 10, '#aaaacc');
    tR(cx + cw - 12, hpY, `${curHp} / ${maxHp}`, 10, hpCol);
    const hpG = this.add.graphics();
    hpG.fillStyle(0x0a0a18, 1); hpG.fillRoundedRect(hpX, hpY + 16, hpW, 11, 4);
    hpG.fillStyle(hpHex, 1); hpG.fillRoundedRect(hpX, hpY + 16, Math.max(6, Math.round(hpW * hpPct)), 11, 4);
    con.add(hpG);

    const sY0 = cy + 108, sX0 = cx + 114, sX1 = sX0 + Math.round((cw - 126) / 2);
    stats.forEach((s, i) => {
      const sx = i % 2 === 0 ? sX0 : sX1;
      const sy = sY0 + Math.floor(i / 2) * 42;
      t(sx,      sy,      s.icon,  17);
      t(sx + 22, sy + 1,  s.label, 11, '#8888aa');
      t(sx + 22, sy + 14, String(s.val), 15, s.col, true);
    });

    if (isPrem) {
      tC(cx + cw / 2, cy + ch - 16, '✨ Premium', 12, '#cc9900', true);
    }

    const closeZ = add(this.add.zone(cx + cw - 44, cy, 44, 38).setOrigin(0).setInteractive({ useHandCursor: true }));
    closeZ.on('pointerup', () => this._hideCard());

    this._cardObjs = objs;
  },

  _hideCard() {
    if (!this._oppCardOpen) return;
    this._oppCardOpen = false;
    (this._cardObjs || []).forEach(o => { try { o.destroy(); } catch(_){} });
    this._cardObjs = [];
  },

  _buildMuteBtn() {
    const { W } = this;
    const bx = W - 38, by = 8, bw = 30, bh = 30;
    const bg = this.add.graphics();
    const draw = () => {
      bg.clear();
      bg.fillStyle(0x000000, 0.45);
      bg.fillRoundedRect(bx, by, bw, bh, 8);
    };
    draw();
    this._muteTxt = this.add.text(bx + bw/2, by + bh/2,
      Sound.muted ? '🔇' : '🔊', { fontSize: '14px' }).setOrigin(0.5).setDepth(10);
    this.add.zone(bx, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        const m = Sound.toggleMute();
        this._muteTxt.setText(m ? '🔇' : '🔊');
        tg?.HapticFeedback?.selectionChanged();
      });
  },

  _buildArena() {
    const { W, H } = this;
    const bg = this.add.image(W/2, H * 0.36, 'arena_bg').setDisplaySize(W, H * 0.5);

    [W * 0.12, W * 0.88].forEach(fx => {
      for (let i = 0; i < 3; i++) {
        const flame = this.add.circle(fx, H * 0.16 - i * 6, 5 - i, 0xff8c00, 0.8 - i*0.2);
        this.tweens.add({
          targets: flame,
          x: fx + Phaser.Math.Between(-4, 4),
          scaleX: Phaser.Math.FloatBetween(0.8, 1.2),
          alpha: 0.5 + Math.random() * 0.4,
          duration: 200 + i * 80,
          yoyo: true, repeat: -1,
        });
      }
    });

    this.warrior1 = this.add.image(W * 0.28, H * 0.35, 'warrior_blue').setScale(1.5).setFlipX(false);
    this.warrior2 = this.add.image(W * 0.72, H * 0.35, 'warrior_red').setScale(1.5).setFlipX(true);

    [this.warrior1, this.warrior2].forEach(w => {
      this.tweens.add({ targets: w, y: w.y - 4, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  },

  _buildHUDs() {
    const { W, H } = this;
    const b = State.battle;
    if (!b) return;

    const hudH = 72;

    makePanel(this, 8, 8, W/2 - 14, hudH, 10);
    txt(this, 16, 13, 'ВЫ', 10, '#8888aa', true);
    this.p1Name = txt(this, 16, 24, State.player?.username || 'Вы', 13, '#f0f0fa', true);
    this.p1Hp   = txt(this, 16, 40, `${b.my_hp} / ${b.my_max_hp}`, 11, '#3cc864');
    this.p1Bar  = this._hpBar(12, 56, W/2 - 22, b.my_max_hp > 0 ? b.my_hp / b.my_max_hp : 0, C.green);
    txt(this, 10, 10, '👁', 10).setAlpha(0.55);
    this.add.zone(8, 8, W/2 - 14, hudH).setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._showCard('me'));

    makePanel(this, W/2 + 6, 8, W/2 - 14, hudH, 10);
    txt(this, W - 16, 13, 'СОПЕРНИК', 10, '#8888aa', true).setOrigin(1, 0);
    this.p2Name = txt(this, W - 16, 24, b.opp_name || 'Соперник', 13, '#f0f0fa', true).setOrigin(1, 0);
    this.p2Hp   = txt(this, W - 16, 40, `${b.opp_hp} / ${b.opp_max_hp}`, 11, '#dc3c46').setOrigin(1, 0);
    this.p2Bar  = this._hpBar(W/2 + 10, 56, W/2 - 22, b.opp_max_hp > 0 ? b.opp_hp / b.opp_max_hp : 0, C.red);
    txt(this, W/2 + 10, 10, '👁', 10).setAlpha(0.55);
    this.add.zone(W/2 + 6, 8, W/2 - 14, hudH).setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._showCard('opp'));

    this.roundTxt = txt(this, W/2, 76, `РАУНД ${b.round || 1}`, 14, '#ffc83c', true).setOrigin(0.5);
    this.timerTxt = txt(this, W/2, 93, '15', 22, '#ffffff', true).setOrigin(0.5);

    txt(this, W/2, H * 0.32, 'VS', 20, '#ffc83c', true).setOrigin(0.5).setAlpha(0.5);
  },

  shutdown() {
    BattleLog.hide();
  }

});
