/* ============================================================
   BattleScene — ext3b: _buildMuteBtn, _buildArena,
                        _buildHUDs, shutdown
   ============================================================ */

Object.assign(BattleScene.prototype, {

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
    const b = State.battle;
    const isBot = !!b?.opp_is_bot;
    const mode  = b?.mode || 'normal';
    // Скины применяем ТОЛЬКО в обычном «Бой с ботом». Натиск (endless) и Титаны (titan) — свои скины будут позже.
    const allowSkin = isBot && mode === 'normal' && typeof BotSkinPicker !== 'undefined';
    // Сначала используем skin_id с сервера (привязан к persona),
    // если по какой-то причине не пришёл — fallback на старый случайный pick().
    const serverSkinId = b?.opp_skin_id || null;
    const skinId = allowSkin ? (serverSkinId || BotSkinPicker.pick()) : null;
    this._currentBotSkinId = skinId; // используется в _showCard для попапа инфы про бота
    console.log('[BotSkin]', { isBot, mode, skinId, hasPicker: typeof BotSkinPicker !== 'undefined' });

    const skinKey = skinId ? BotSkinPicker.skinKey(skinId) : null;
    const bgKey   = skinId ? BotSkinPicker.bgKey(skinId)   : null;
    const haveBg  = !!bgKey   && this.textures.exists(bgKey);
    const haveSkn = !!skinKey && this.textures.exists(skinKey);

    // PvP (соперник-человек) → рандомный из 5 фонов в pvp_bg/.
    // PvE-бот → фон скина (как было). Fallback — generated 'arena_bg'.
    let initBgKey = 'arena_bg';
    let pvpBgIdx = 0;
    if (haveBg) {
      initBgKey = bgKey;
    } else if (!isBot) {
      pvpBgIdx = 1 + Math.floor(Math.random() * 5);
      const k = `pvp_bg_${pvpBgIdx}`;
      if (this.textures.exists(k)) initBgKey = k;
    }
    const bg = this.add.image(W/2, H * 0.36, initBgKey).setDisplaySize(W, H * 0.5);
    // Inline-догрузка фона если preload не успел/не выполнился
    if (skinId && !haveBg) {
      this.load.image(bgKey, `bot_skins/bg/${skinId}.${BotSkinPicker.BG_EXT(skinId)}`);
      this.load.once(`filecomplete-image-${bgKey}`, () => bg.setTexture(bgKey).setDisplaySize(W, H * 0.5));
      this.load.start();
    } else if (!isBot && pvpBgIdx > 0 && initBgKey === 'arena_bg') {
      const k = `pvp_bg_${pvpBgIdx}`;
      this.load.image(k, `pvp_bg/${pvpBgIdx}.png`);
      this.load.once(`filecomplete-image-${k}`, () => bg.setTexture(k).setDisplaySize(W, H * 0.5));
      this.load.start();
    }

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

    const _p1Key  = getWarriorKey(State.player?.warrior_type);
    const _p2Type = State.battle?.opp_warrior_type || 'tank';
    const _p2Key  = (skinId && haveSkn) ? skinKey : getWarriorKey(_p2Type);
    const p1Flip = skinId ? !!BotSkinPicker.PLAYER_FLIP_X : false;
    this.warrior1 = this.add.image(W * 0.28, H * 0.35, _p1Key).setFlipX(p1Flip);
    { const t = this.textures.get(_p1Key).getSourceImage(); const wh = Math.round(H * 0.32);
      this.warrior1.setDisplaySize(t.width ? wh * (t.width / t.height) : Math.round(wh * 0.65), wh); }
    const w2FlipX = skinId ? BotSkinPicker.shouldFlip(skinId) : true;
    this.warrior2 = this.add.image(W * 0.72, H * 0.35, _p2Key).setFlipX(w2FlipX);
    if (skinId) {
      // PvE-бот: ноги на уровне ног игрока + единый рост ~22% от высоты экрана
      const footY = this.warrior1.y + this.warrior1.displayHeight / 2;
      this.warrior2.setOrigin(0.5, 1).setY(footY + BotSkinPicker.nudgeFor(skinId) * 0.5);
      this._fitBotSize(this.warrior2, skinId);
      if (!haveSkn) {
        this.load.image(skinKey, `bot_skins/${skinId}.png`);
        this.load.once(`filecomplete-image-${skinKey}`, () => {
          this.warrior2.setTexture(skinKey);
          this._fitBotSize(this.warrior2, skinId);
        });
        this.load.start();
      }
      // Платформа-арена + halo по стихии + тень под ногами бота (под спрайтами)
      const haloColor = BotSkinPicker.colorFor(skinId);
      const w2W = this.warrior2.displayWidth || (H * 0.22);
      const w2H = this.warrior2.displayHeight || (H * 0.22);
      this.add.graphics().setDepth(-1)
        .fillStyle(0x000000, 0.42).fillEllipse(W/2, footY + 8, W * 0.7, 26);
      this.add.graphics().setDepth(-1)
        .fillStyle(haloColor, 0.32).fillCircle(this.warrior2.x, footY - w2H * 0.5, w2H * 0.55);
      this.add.graphics().setDepth(-1)
        .fillStyle(0x000000, 0.55).fillEllipse(this.warrior2.x, footY + 11, w2W * 0.55, 13);
    } else {
      const t2 = this.textures.get(_p2Key).getSourceImage(); const wh2 = Math.round(H * 0.32);
      this.warrior2.setDisplaySize(t2.width ? wh2 * (t2.width / t2.height) : Math.round(wh2 * 0.65), wh2).setFlipX(true);
    }

    // Premium/Elite/Sub — золотая вспышка при входе в бой
    const _avTier = (State.player?.avatar_tier || '').toLowerCase();
    if (['premium', 'elite', 'sub'].includes(_avTier)) {
      const glow = this.add.circle(this.warrior1.x, this.warrior1.y, 12, 0xffc83c, 0.75);
      this.tweens.add({
        targets: glow, scaleX: 4, scaleY: 4, alpha: 0,
        duration: 900, ease: 'Cubic.easeOut',
        onComplete: () => glow.destroy(),
      });
    }

    [this.warrior1, this.warrior2].forEach(w => {
      this.tweens.add({ targets: w, y: w.y - 4, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  },

  _fitBotSize(img, skinId) {
    const tex = this.textures.get(img.texture.key).getSourceImage();
    if (!tex || !tex.width) return;
    const targetH = this.H * 0.22 * BotSkinPicker.scaleFor(skinId);
    const targetW = targetH * (tex.width / tex.height);
    img.setDisplaySize(targetW, targetH);
  },

  _buildHUDs() {
    const { W, H } = this;
    const b = State.battle;
    if (!b) return;

    const hudH = 72;

    makePanel(this, 8, 8, W/2 - 14, hudH, 10);
    txt(this, 16, 13, 'ВЫ', 10, '#ccccee', true);
    this.p1Name = txt(this, 16, 24, State.player?.username || 'Вы', 13, '#f0f0fa', true);
    this.p1Hp   = txt(this, 16, 40, `${b.my_hp} / ${b.my_max_hp}`, 11, '#3cc864');
    this.p1Bar  = this._hpBar(12, 56, W/2 - 22, b.my_max_hp > 0 ? b.my_hp / b.my_max_hp : 0, C.green);
    txt(this, 10, 10, '👁', 10).setAlpha(0.55);
    this.add.zone(8, 8, W/2 - 14, hudH).setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._showCard('me'));

    makePanel(this, W/2 + 6, 8, W/2 - 14, hudH, 10);
    txt(this, W - 16, 13, 'СОПЕРНИК', 10, '#ccccee', true).setOrigin(1, 0);
    this.p2Name = txt(this, W - 16, 24, b.opp_name || 'Соперник', 13, '#f0f0fa', true).setOrigin(1, 0);
    this.p2Hp   = txt(this, W - 16, 40, `${b.opp_hp} / ${b.opp_max_hp}`, 11, '#dc3c46').setOrigin(1, 0);
    this.p2Bar  = this._hpBar(W/2 + 10, 56, W/2 - 22, b.opp_max_hp > 0 ? b.opp_hp / b.opp_max_hp : 0, C.red);
    txt(this, W/2 + 10, 10, '👁', 10).setAlpha(0.55);
    this.add.zone(W/2 + 6, 8, W/2 - 14, hudH).setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._showCard('opp'));

    this.roundTxt = txt(this, W/2, 76, `РАУНД ${b.round || 1}`, 14, '#ffc83c', true).setOrigin(0.5);
    this.timerTxt = txt(this, W/2, 93, '15', 22, '#ffffff', true).setOrigin(0.5);

    // VS — крупный неон с двумя цветными слоями (розовый+голубой) и пульсом
    const vsY = H * 0.32;
    const vsP = txt(this, W/2 - 2, vsY, 'VS', 36, '#ff5fa0', true).setOrigin(0.5).setAlpha(0.85);
    const vsC = txt(this, W/2 + 2, vsY, 'VS', 36, '#00d8ff', true).setOrigin(0.5).setAlpha(0.85);
    const vsW = txt(this, W/2,     vsY, 'VS', 36, '#ffffff', true).setOrigin(0.5);
    this.tweens.add({ targets: [vsP, vsC, vsW], scaleX: 1.12, scaleY: 1.12,
                      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  shutdown() {
    try { BattleLog.hideHistory?.(); } catch(_) {}
    try { BattleLog.hide(); } catch(_) {}
    if (typeof BattleHints !== 'undefined') BattleHints.hide();
    try { if (typeof BotBattleCard !== 'undefined') BotBattleCard.hide?.(); } catch(_) {}
    // Обязательно: unmount HTML-overlay и обрубаем WS-handler.
    // Без этого mounted=true остаётся в замыкании BotBattleHtml и
    // следующий mount() вернётся сразу → чёрный экран.
    try { if (typeof BotBattleHtml !== 'undefined') BotBattleHtml.unmount(); } catch(_) {}
    try { if (State.ws) State.ws.onmessage = null; } catch(_) {}
    if (this._timerEvent) { try { this._timerEvent.remove(); } catch(_) {} this._timerEvent = null; }
    if (this._pollEvent)  { try { this._pollEvent.remove();  } catch(_) {} this._pollEvent  = null; }
    this.time.removeAllEvents();
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  },

});
