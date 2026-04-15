/* ============================================================
   BattleScene — ext2: _onZone, _submitChoice, _onAuto,
     _showWait, _resetChoices, _updateFromState,
     _playRoundAnimation, _animLunge, _animDodge,
     _flashTint, _shakeX, _floatText, _burst,
     _startTimer, _setupWSBattle
   ============================================================ */

Object.assign(BattleScene.prototype, {

  _onZone(key, label, type, g, t) {
    if (!this._choosing || this._submitting) return;
    tg?.HapticFeedback?.selectionChanged();

    if (type === 'attack') {
      this._attackBtns.forEach(b => this._drawZoneBtn(b.g, b.x, b.y, b.BW, b.BH, false));
      this._selAttack = key;
      const btn = this._attackBtns.find(b => b.key === key);
      if (btn) this._drawZoneBtn(btn.g, btn.x, btn.y, btn.BW, btn.BH, true, C.red);
    } else {
      this._defenseBtns.forEach(b => this._drawZoneBtn(b.g, b.x, b.y, b.BW, b.BH, false));
      this._selDefense = key;
      const btn = this._defenseBtns.find(b => b.key === key);
      if (btn) this._drawZoneBtn(btn.g, btn.x, btn.y, btn.BW, btn.BH, true, C.blue);
    }

    if (this._selAttack && this._selDefense) {
      this._submitChoice();
    }
  },

  async _submitChoice() {
    if (this._submitting) return;
    this._submitting = true;
    this._choosing = false;
    this._showWait('Ход отправлен...');
    try {
      const res = await post('/api/battle/choice', {
        attack: this._selAttack,
        defense: this._selDefense,
      });
      if (res.status === 'waiting_opponent') {
        this._showWait('⏳ Ждём соперника...');
        this._waitingSince = Date.now();
        return;
      }
      if (res.status === 'round_completed') {
        this._hideCard();
        this._updateFromState(res.battle);
        this._resetChoices();
        this._choosing = true;
        this._startTimer();
      } else if (res.status === 'battle_ended') {
        State.lastResult = res;
        BattleLog.hide();
        this.scene.start('Result');
      } else {
        this._choosing = true;
        const hint = res.detail || res.message || res.error || '';
        this._showWait(hint ? `⚠️ ${hint}` : 'Ошибка. Попробуй ещё раз.');
      }
    } catch(e) {
      this._choosing = true;
      this._showWait('Ошибка. Попробуй ещё раз.');
    } finally {
      this._submitting = false;
    }
  },

  _onAuto() {
    if (!this._choosing || this._submitting) return;
    const zones = ['HEAD', 'TORSO', 'LEGS'];
    if (!this._selAttack)  this._selAttack  = zones[Phaser.Math.Between(0,2)];
    if (!this._selDefense) this._selDefense = zones[Phaser.Math.Between(0,2)];
    this._submitChoice();
  },

  _showWait(msg) {
    this._waitTxt.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this._waitTxt, alpha: 1, duration: 200 });
  },

  _resetChoices() {
    this._selAttack  = null;
    this._selDefense = null;
    this._waitTxt.setAlpha(0);
    this._attackBtns.forEach(b => this._drawZoneBtn(b.g, b.x, b.y, b.BW, b.BH, false));
    this._defenseBtns.forEach(b => this._drawZoneBtn(b.g, b.x, b.y, b.BW, b.BH, false));
  },

  _updateFromState(b) {
    if (!b) return;

    const myDelta  = this._prevMyHp  != null ? (this._prevMyHp  - b.my_hp)  : 0;
    const oppDelta = this._prevOppHp != null ? (this._prevOppHp - b.opp_hp) : 0;
    this._prevMyHp  = b.my_hp;
    this._prevOppHp = b.opp_hp;

    State.battle = b;

    const p1n = b.my_max_hp > 0 ? b.my_hp / b.my_max_hp : 0;
    const p1p = this._p1PrevPct != null ? this._p1PrevPct : p1n;
    const p2n = b.opp_max_hp > 0 ? b.opp_hp / b.opp_max_hp : 0;
    const p2p = this._p2PrevPct != null ? this._p2PrevPct : p2n;

    if (this.p1Hp) this.p1Hp.setText(`${b.my_hp} / ${b.my_max_hp}`);
    if (this.p1Bar) {
      this._setGhostHpBar(this.p1Bar, p1n, p1p, C.green);
      this._p1PrevPct = p1n;
    }

    if (this.p2Hp) this.p2Hp.setText(`${b.opp_hp} / ${b.opp_max_hp}`);
    if (this.p2Bar) {
      this._setGhostHpBar(this.p2Bar, p2n, p2p, C.red);
      this._p2PrevPct = p2n;
    }

    if (this.roundTxt) this.roundTxt.setText(`РАУНД ${(b.round || 0) + 1}`);

    const log = b.combat_log || [];
    BattleLog.update(log);

    // Подсказки для новичков после раунда
    if (typeof BattleHints !== 'undefined' && log.length > 0) {
      BattleHints.onRoundEnd(this, log.length);
    }

    if ((myDelta > 0 || oppDelta > 0) && log.length) {
      const lastLog = log[log.length - 1].replace(/<[^>]+>/g, '').toLowerCase();
      const isCrit  = lastLog.includes('крит');
      const isDodge = lastLog.includes('увор');
      this._playRoundAnimation(myDelta, oppDelta, isCrit, isDodge);
    }
  },

  _playRoundAnimation(myDelta, oppDelta, isCrit, isDodge) {
    if (oppDelta > 0) {
      if (isDodge) {
        Sound.dodge();
        this._animDodge(this.warrior2);
        this._floatText(this.warrior2.x, this.warrior2.y - 55, '💨 Уворот!', '#3cc8dc');
      } else {
        this._animLunge(this.warrior1, this.warrior2, () => {
          if (isCrit) {
            Sound.crit();
            this._flashTint(this.warrior2, 0xff8800, 220);
            this._shakeX(this.warrior2, 12, 4);
            this._burst(this.warrior2.x, this.warrior2.y, 'crit_fx', 0.7, 520);
            this._floatText(this.warrior2.x, this.warrior2.y - 60, `💥 −${oppDelta}`, '#ffc83c');
            this.cameras.main.shake(280, 0.007);
          } else {
            Sound.hit();
            this._flashTint(this.warrior2, 0xff3333, 140);
            this._shakeX(this.warrior2, 7, 3);
            this._burst(this.warrior2.x, this.warrior2.y, 'hit_fx', 0.9, 380);
            this._floatText(this.warrior2.x, this.warrior2.y - 55, `−${oppDelta}`, '#ff4455');
          }
        });
      }
    }

    if (myDelta > 0) {
      this.time.delayedCall(oppDelta > 0 ? 320 : 0, () => {
        if (isDodge && oppDelta <= 0) {
          Sound.dodge();
          this._animDodge(this.warrior1);
          this._floatText(this.warrior1.x, this.warrior1.y - 55, '💨 Уворот!', '#3cc8dc');
        } else {
          this._animLunge(this.warrior2, this.warrior1, () => {
            if (isCrit && oppDelta <= 0) {
              Sound.crit();
              this._flashTint(this.warrior1, 0xff8800, 220);
              this._shakeX(this.warrior1, 12, 4);
              this._burst(this.warrior1.x, this.warrior1.y, 'crit_fx', 0.7, 520);
              this._floatText(this.warrior1.x, this.warrior1.y - 60, `💥 −${myDelta}`, '#ffc83c');
              this.cameras.main.shake(280, 0.007);
            } else {
              Sound.hit();
              this._flashTint(this.warrior1, 0xff3333, 140);
              this._shakeX(this.warrior1, 7, 3);
              this._burst(this.warrior1.x, this.warrior1.y, 'hit_fx', 0.9, 380);
              this._floatText(this.warrior1.x, this.warrior1.y - 55, `−${myDelta}`, '#ff6666');
            }
          });
        }
      });
    }
  },

});
