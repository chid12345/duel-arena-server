/* ============================================================
   BattleScene — ext2b: _animLunge, _animDodge, _flashTint,
     _shakeX, _floatText, _burst, _startTimer, _setupWSBattle
   ============================================================ */

Object.assign(BattleScene.prototype, {

  _animLunge(attacker, defender, onImpact) {
    const origX = attacker.x;
    const midX  = attacker.x + (defender.x - attacker.x) * 0.42;
    this.tweens.add({
      targets: attacker, x: midX, scaleX: attacker.scaleX * 1.08,
      duration: 110, ease: 'Power2.easeOut',
      onComplete: () => {
        if (onImpact) onImpact();
        this.tweens.add({
          targets: attacker, x: origX, scaleX: attacker.scaleX / 1.08,
          duration: 190, ease: 'Back.easeOut',
        });
      },
    });
  },

  _animDodge(warrior) {
    const origX = warrior.x;
    const dir   = warrior === this.warrior2 ? 1 : -1;
    const ghost = this.add.image(origX, warrior.y, warrior.texture.key)
      .setScale(warrior.scaleX).setFlipX(warrior.flipX).setAlpha(0.35).setTint(0x3cc8dc);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 380, onComplete: () => ghost.destroy() });
    this.tweens.add({
      targets: warrior, x: origX + dir * 30, alpha: 0.55,
      duration: 130, ease: 'Power2.easeOut', yoyo: true,
      onComplete: () => { warrior.setX(origX).setAlpha(1); },
    });
  },

  _flashTint(warrior, color, ms) {
    warrior.setTint(color);
    this.time.delayedCall(ms, () => warrior.clearTint());
  },

  _shakeX(target, px, count) {
    const ox = target.x;
    this.tweens.add({
      targets: target, x: ox + px,
      duration: 40, yoyo: true, repeat: count - 1,
      ease: 'Sine.easeInOut',
      onComplete: () => target.setX(ox),
    });
  },

  _floatText(x, y, str, color = '#ff4455') {
    const t = txt(this, x, y, str, 21, color, true).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: t, y: y - 72, alpha: 0,
      duration: 820, ease: 'Power2.easeOut',
      onComplete: () => t.destroy(),
    });
  },

  _burst(x, y, texKey, startScale, duration) {
    const fx = this.add.image(x, y, texKey)
      .setAlpha(0.95).setScale(startScale).setDepth(9);
    this.tweens.add({
      targets: fx, alpha: 0, scale: startScale * 2.6,
      duration, ease: 'Power2.easeOut',
      onComplete: () => fx.destroy(),
    });
  },

  _startTimer(serverSecs = null) {
    if (this._timerEvent) this._timerEvent.remove();

    const b    = State.battle;
    let secs   = serverSecs ?? (b?.deadline_sec ?? 15);
    secs       = Math.max(1, Math.min(15, secs - 1));

    this.timerTxt?.setText(secs).setColor('#ffffff');
    if (this._htmlMode && typeof BotBattleHtml !== 'undefined') { try { BotBattleHtml.setTimer(secs); } catch(_){} }
    this._timerEvent = this.time.addEvent({
      delay: 1000, repeat: secs - 1,
      callback: () => {
        secs--;
        this.timerTxt?.setText(Math.max(0, secs));
        if (this._htmlMode && typeof BotBattleHtml !== 'undefined') { try { BotBattleHtml.setTimer(Math.max(0, secs)); } catch(_){} }
        if (secs <= 5 && secs > 0) {
          this.timerTxt?.setColor('#ff4455');
          Sound.countdown(secs);
          tg?.HapticFeedback?.impactOccurred('light');
        }
        if (secs <= 0) {
          if (this._choosing) this._onAuto();
        }
      },
    });
  },

  _setupWSBattle() {
    const p = State.player;
    if (!p) return;

    const myBattleId = State.battle?.battle_id || null;

    const handleMsg = msg => {
      if (msg.event === 'round_result') {
        this._lastServerMsg = Date.now();
        this._updateFromState(msg.battle);
        this._resetChoices();
        this._choosing = true;
        this._startTimer(msg.battle?.deadline_sec);
      } else if (msg.event === 'battle_ended' || msg.event === 'battle_ended_afk') {
        if (myBattleId && msg.battle_id && msg.battle_id !== myBattleId) return;
        this._lastServerMsg = Date.now();
        State.lastResult = msg;
        BattleLog.hide();
        try { if (this._htmlMode && typeof BotBattleHtml !== 'undefined') BotBattleHtml.unmount(); } catch(_){}
        this.scene.start('Result');
      }
    };

    if (!State.player) return;
    connectWS(State.player.user_id, handleMsg);

    this._lastServerMsg = Date.now();
    this._waitingSince  = null;
    this._pollEvent = this.time.addEvent({
      delay: 3000, loop: true,
      callback: async () => {
        const now = Date.now();

        if (!this._choosing) {
          if (!this._waitingSince) return;
          if (now - this._waitingSince < 10000) return;
        } else {
          if (now - this._lastServerMsg < 8000) return;
        }

        try {
          const res = await get('/api/battle/state');
          if (!res?.active) {
            const last = await get('/api/battle/last_result').catch(() => null);
            State.lastResult = last || { human_won: false, result: {} };
            BattleLog.hide();
            try { if (this._htmlMode && typeof BotBattleHtml !== 'undefined') BotBattleHtml.unmount(); } catch(_){}
            this.scene.start('Result');
          } else {
            this._lastServerMsg = now;
            this._updateFromState(res);
            if (!this._choosing) {
              this._waitingSince = null;
              this._resetChoices();
              this._choosing = true;
              this._startTimer(res.deadline_sec);
            }
          }
        } catch(_) {}
      },
    });
  },

});
