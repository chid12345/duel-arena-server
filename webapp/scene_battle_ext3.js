/* ============================================================
   BattleScene — ext3: _showCard, _hideCard
   Продолжение: scene_battle_ext3b.js
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
    // Persona-статус соперника-бота: эмодзи + текстовая метка над именем.
    const PERSONA_META = {
      novice:  {emoji:'🌱', label:'Новичок',     col:'#9ad9a0'},
      farmer:  {emoji:'⚔️', label:'Фармила',     col:'#9abae0'},
      major:   {emoji:'💎', label:'Мажор',       col:'#c89aff'},
      donator: {emoji:'👑', label:'Босс-донатер', col:'#ffc83c'},
    };
    const oppPersona = (!isMe && isBot) ? (b.opp_persona || null) : null;
    const oppEq      = (!isMe && isBot) ? (b.opp_eq || null) : null;
    const oppItems   = (!isMe && isBot) ? (b.opp_items || []) : [];
    const personaMeta = oppPersona ? PERSONA_META[oppPersona] : null;
    // Эмодзи слотов — для компактного списка предметов
    const SLOT_ICON = {weapon:'🗡', shield:'🛡', armor:'👕', belt:'🪖', boots:'👢', ring1:'💍', ring2:'💍'};
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
    const useBotSkin = !isMe && this._currentBotSkinId && typeof BotSkinPicker !== 'undefined';
    const spriteKey = isMe
      ? getWarriorKey(State.player?.warrior_type)
      : (useBotSkin ? BotSkinPicker.skinKey(this._currentBotSkinId)
                    : getWarriorKey(State.battle?.opp_warrior_type || 'tank'));
    const typeStr   = isMe ? '🧑 Вы'        : (isBot ? '🤖 Бот' : '⚔️ Игрок');
    const typeCol   = isMe ? '#5096ff'       : (isBot ? '#ccccee' : '#3cc864');
    const borderCol = isPrem ? 0xffc83c : (isMe ? 0x5096ff : 0x444466);
    const bgCol     = isPrem ? 0x1a1508 : (isMe ? 0x0a1428 : 0x141420);

    const objs = [];
    const add  = o => { objs.push(o); return o; };

    // Если у бота есть надетые предметы — увеличиваем карточку на блок «Что одето».
    const hasGearBlock = !!(oppItems && oppItems.length > 0);
    const cw = W - 36, ch = (hasGearBlock || personaMeta) ? 296 : 242;
    const cx = 18, cy = Math.round(H * 0.13);

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

    // В заголовке: для PvE-бота показываем persona-метку «💎 Мажор», иначе старую «🧑 Вы / 🤖 Бот».
    const headStr = personaMeta ? `${personaMeta.emoji} ${personaMeta.label}` : typeStr;
    const headCol = personaMeta ? personaMeta.col : typeCol;
    t(cx + 14, cy + 11, headStr, 11, headCol, true);
    tR(cx + cw - 12, cy + 10, '✕', 16, '#ddddff');

    const nameStr = (isPrem ? '👑 ' : '') + name;
    tC(cx + cw / 2, cy + 34, nameStr, 17, isPrem ? '#ffc83c' : '#f0f0fa', true);
    // Win-streak серия для бота: «🔥 N побед подряд» рядом с уровнем
    const oppStreak = (!isMe && isBot) ? (b.opp_win_streak || 0) : 0;
    const lvLine = oppStreak > 0
      ? `Ур. ${level}  ·  ★ ${rating}  ·  🔥 ${oppStreak} подряд`
      : `Ур. ${level}  ·  ★ ${rating}`;
    tC(cx + cw / 2, cy + 55, lvLine, 11, isPrem ? '#cc9900' : (oppStreak > 0 ? '#ff8044' : '#ccccee'));

    const divG = this.add.graphics();
    divG.lineStyle(1, isPrem ? 0xffc83c : 0x2a2850, 0.5);
    divG.lineBetween(cx + 12, cy + 68, cx + cw - 12, cy + 68);
    con.add(divG);

    const spr = this.add.image(cx + 58, cy + 128, spriteKey);
    if (useBotSkin) {
      const tex = this.textures.get(spriteKey).getSourceImage();
      const tH = 110;
      if (tex && tex.width) spr.setDisplaySize(tH * (tex.width / tex.height), tH);
      spr.setFlipX(BotSkinPicker.shouldFlip(this._currentBotSkinId));
    } else {
      spr.setScale(0.14).setFlipX(!isMe);
    }
    con.add(spr);
    this.tweens.add({ targets: spr, y: cy + 122, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const hpPct = Math.min(1, Math.max(0, curHp / maxHp));
    const hpCol = hpPct > 0.5 ? '#3cc864' : hpPct > 0.25 ? '#ffc83c' : '#dc3c46';
    const hpHex = hpPct > 0.5 ? 0x3cc864 : hpPct > 0.25 ? 0xffc83c : 0xdc3c46;
    const hpX = cx + 114, hpY = cy + 76, hpW = cw - 126;
    t(hpX, hpY, '❤️ HP', 10, '#ddddff');
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
      t(sx + 22, sy + 1,  s.label, 11, '#ccccee');
      t(sx + 22, sy + 14, String(s.val), 15, s.col, true);
    });

    // Блок «Что одето»: реальные предметы по слотам (вместо суммарных бонусов).
    // Цвет имени предмета = цвет редкости (common/rare/epic/mythic).
    const showItems = !isMe && isBot && oppItems && oppItems.length > 0;
    if (showItems) {
      const gY = cy + 200;
      const dG = this.add.graphics();
      dG.lineStyle(1, 0x2a2850, 0.5);
      dG.lineBetween(cx + 12, gY - 6, cx + cw - 12, gY - 6);
      con.add(dG);
      tC(cx + cw / 2, gY, '🎽 ЧТО ОДЕТО', 9, '#aaaacc', true);
      const colW = (cw - 28) / 2;
      oppItems.slice(0, 6).forEach((it, i) => {
        const ix = cx + 14 + (i % 2) * colW;
        const iy = gY + 18 + Math.floor(i / 2) * 18;
        const bg = this.add.graphics();
        bg.fillStyle(0x1a1828, 1).fillRoundedRect(ix, iy, colW - 6, 16, 4);
        bg.lineStyle(1, parseInt((it.color || '#9aa0a6').slice(1), 16), 0.6);
        bg.strokeRoundedRect(ix, iy, colW - 6, 16, 4);
        con.add(bg);
        const icon = SLOT_ICON[it.slot] || '•';
        // Обрезаем длинные имена под ширину колонки
        const nm = (it.name || '').length > 13 ? it.name.slice(0, 12) + '…' : it.name;
        con.add(this.add.text(ix + 4, iy + 1, icon, {fontSize:'11px',resolution:2}).setOrigin(0));
        con.add(this.add.text(ix + 22, iy + 2, nm, {
          fontSize:'10px', color: it.color || '#ddd',
          fontFamily:'system-ui, sans-serif', fontStyle:'bold', resolution:2,
        }).setOrigin(0));
      });
    } else if (isPrem) {
      tC(cx + cw / 2, cy + ch - 16, '✨ Premium', 12, '#cc9900', true);
    } else if (!isMe && isBot) {
      tC(cx + cw / 2, cy + ch - 16, '— шмота нет —', 10, '#666688');
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

});
