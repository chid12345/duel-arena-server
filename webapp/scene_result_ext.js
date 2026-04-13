/* ============================================================
   ResultScene ext — _buildResultPanel, _buildResultExtra
   ============================================================ */

Object.assign(ResultScene.prototype, {

  _buildResultPanel(W, H, won, r, isAfk, isEndless, isTitan, endlessWave, titanFloor, res) {
    const panH = won ? (r.level_up ? 185 : (r.win_streak > 1 ? 175 : (isTitan ? 185 : 155)))
                     : (isAfk ? 128 : (isEndless ? 120 : (isTitan ? 110 : 132)));
    const panY  = H * 0.28;
    makePanel(this, 16, panY, W - 32, panH, 16);

    if (won) {
      txt(this, W / 2, panY + 18, 'НАГРАДЫ', 11, '#ccccee', true).setOrigin(0.5);

      const goldTxt = txt(this, W / 2, panY + 50, '💰 +0 золота', 22, '#ffc83c', true).setOrigin(0.5);
      this._countUp(goldTxt, r.gold || 0, '💰 +', ' золота', 200);

      if (isEndless) {
        txt(this, W / 2, panY + 86, `⚔️  Урон нанесён: ${r.damage || 0}`, 17, '#ddaa66', true).setOrigin(0.5);
      } else {
        const expTxt = txt(this, W / 2, panY + 86, '⭐ +0 опыта', 18, '#5096ff', true).setOrigin(0.5);
        this._countUp(expTxt, r.exp || 0, '⭐ +', ' опыта', 450);
      }

      txt(this, W / 2, panY + 118, `⚔️  Раундов: ${r.rounds || 0}`, 12, '#ddddff').setOrigin(0.5);

      if (r.rating_change && r.rating_change !== 0) {
        const eloSign = r.rating_change > 0 ? '+' : '';
        txt(this, W / 2, panY + 138, `★ ${eloSign}${r.rating_change} ELO`, 12,
          r.rating_change > 0 ? '#3cc864' : '#ff4455', true).setOrigin(0.5);
      }

      let extraY = panY + (r.rating_change && r.rating_change !== 0 ? 158 : 138);

      if ((r.streak_bonus || 0) > 0) {
        const sbt = txt(this, W / 2, extraY, `🎉 +${r.streak_bonus} бонус серии!`, 12, '#ff8855', true)
          .setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: sbt, alpha: 1, delay: 700, duration: 300 });
        extraY += 24;
      }

      if ((r.win_streak || 0) > 1) {
        txt(this, W / 2, extraY, `🔥 Серия: ${r.win_streak} побед подряд!`, 13, '#ff8044', true)
          .setOrigin(0.5);
      }

      if (r.level_up) this.time.delayedCall(900, () => this._levelUpFlash(W, H));

      if (isEndless && endlessWave > 0) {
        const waveLabel = `🔥 Волна ${endlessWave} пройдена!`;
        txt(this, W / 2, panY + 160, waveLabel, 13, '#ff6644', true).setOrigin(0.5);
        if (endlessWave % 5 === 0) {
          txt(this, W / 2, panY + 178, '💚 +10% HP восстановлено!', 12, '#3cc864').setOrigin(0.5);
        }
      }

      if (isTitan && titanFloor > 0) {
        txt(this, W / 2, panY + 160, `🗿 Этаж ${titanFloor} пройден!`, 14, '#b45aff', true).setOrigin(0.5);
        const tp = res?.titan_progress;
        if (tp && Number(tp.best_floor) === titanFloor) {
          txt(this, W / 2, panY + 179, '🆕 Новый рекорд Башни!', 11, '#ffc83c', true).setOrigin(0.5);
        }
      }

    } else if (isAfk) {
      txt(this, W / 2, panY + 24, '⏱️ Поражение по таймауту', 14, '#ff8855', true).setOrigin(0.5);
      txt(this, W / 2, panY + 54, '3 раунда прошли без хода', 12, '#cc6633').setOrigin(0.5);
      txt(this, W / 2, panY + 76, 'Нажимай кнопки быстрее!', 11, '#ccccee').setOrigin(0.5);
      txt(this, W / 2, panY + 102, `Раундов: ${r.rounds || 0}`, 11, '#ddddff').setOrigin(0.5);
      if (r.rating_change && r.rating_change !== 0) {
        const eloSign = r.rating_change > 0 ? '+' : '';
        txt(this, W / 2, panY + 120, `★ ${eloSign}${r.rating_change} ELO`, 11, '#ff4455', true).setOrigin(0.5);
      }
    } else if (isEndless) {
      txt(this, W / 2, panY + 14, 'ИТОГИ ЗАХОДА', 10, '#ccccee', true).setOrigin(0.5);
      txt(this, W / 2, panY + 42, `💀 Волна ${endlessWave > 0 ? endlessWave : '?'} — конец`, 16, '#ff4455', true).setOrigin(0.5);
      txt(this, W / 2, panY + 74, `⚔️  Урон нанесён: ${r.damage || 0}`, 13, '#ddaa66', true).setOrigin(0.5);
      txt(this, W / 2, panY + 98, `⏱️  Раундов: ${r.rounds || 0}`, 12, '#ddddff').setOrigin(0.5);
    } else if (isTitan) {
      txt(this, W / 2, panY + 14, 'ИТОГИ БАШНИ', 10, '#ccccee', true).setOrigin(0.5);
      txt(this, W / 2, panY + 44, `💀 Этаж ${titanFloor > 0 ? titanFloor : '?'} — не пройден`, 16, '#ff4455', true).setOrigin(0.5);
      const tpLoss = res?.titan_progress;
      const bestFloor = tpLoss?.best_floor ?? 0;
      if (bestFloor > 0) {
        txt(this, W / 2, panY + 76, `🏆 Твой рекорд: ${bestFloor} этаж`, 12, '#ddddff').setOrigin(0.5);
      }
    } else {
      txt(this, W / 2, panY + 18, '💪  Не сдавайся!', 14, '#ccccee', true).setOrigin(0.5);
      txt(this, W / 2, panY + 42, 'Утешительные награды', 10, '#aaaacc').setOrigin(0.5);
      if ((r.gold || 0) > 0) {
        const cGold = txt(this, W / 2, panY + 64, '💰 +0 золота', 18, '#cc9922', true).setOrigin(0.5);
        this._countUp(cGold, r.gold, '💰 +', ' золота', 200);
      }
      if ((r.exp || 0) > 0) {
        const cExp = txt(this, W / 2, panY + 90, '⭐ +0 опыта', 15, '#3366cc', true).setOrigin(0.5);
        this._countUp(cExp, r.exp, '⭐ +', ' опыта', 400);
      }
      txt(this, W / 2, panY + 114, `Раундов: ${r.rounds || 0}`, 11, '#ddddff').setOrigin(0.5);
      if (r.rating_change && r.rating_change !== 0) {
        const eloSign = r.rating_change > 0 ? '+' : '';
        txt(this, W / 2, panY + 130, `★ ${eloSign}${r.rating_change} ELO`, 11, '#ff4455', true).setOrigin(0.5);
      }
    }
  },

  async _buildResultExtra(W, H, won, r, isEndless, isTitan, endlessWave, endlessProgress, endlessStatus, titanFloor, res) {
    if (isEndless && endlessStatus?.ok) {
      const bestWave = endlessStatus.progress?.best_wave ?? endlessProgress?.best_wave ?? 0;
      const panY = H * 0.28;

      if (!won && endlessWave > 0) {
        const isNewRecord = endlessWave > 0 && bestWave === endlessWave;
        if (isNewRecord) {
          txt(this, W / 2, panY + 108, '🆕 Новый рекорд!', 12, '#ffc83c', true).setOrigin(0.5);
        } else if (bestWave > endlessWave) {
          txt(this, W / 2, panY + 108, `🏆 Твой рекорд: ${bestWave} волн`, 11, '#ddddff').setOrigin(0.5);
        }
      }

      if (won && isEndless && endlessWave > 0 && bestWave === endlessWave && endlessWave > 1) {
        txt(this, W / 2, panY + 178, '🆕 Новый рекорд волны!', 11, '#ffc83c', true).setOrigin(0.5);
      }

      const left = endlessStatus.attempts_left ?? 0;
      const attColor = left > 0 ? '#88ddaa' : '#cc5555';
      txt(this, W / 2, H * 0.72, `🔥 Осталось попыток: ${left}`, 12, attColor, true).setOrigin(0.5);
    }

    const _goTitanNext = () => {
      post('/api/titans/start', {}).then(r => {
        if (!r.ok) { this.scene.start('Menu', { returnTab: 'battle' }); return; }
        State.battle = r.battle;
        tg?.HapticFeedback?.impactOccurred('heavy');
        this.scene.start('Battle');
      }).catch(() => this.scene.start('Menu', { returnTab: 'battle' }));
    };
    const bigBtnLabel = (isEndless && won) ? '🔥  Следующая волна!'
                      : (isTitan && won)   ? '⚔️  Следующий этаж!'
                      : (isTitan)          ? '🔄  Попробовать снова!'
                      :                      '⚔️  Ещё бой!';
    const bigBtnCb = (isEndless && won)
      ? () => {
          post('/api/endless/next_wave', {}).then(r => {
            if (!r.ok) { this.scene.start('Natisk'); return; }
            State.battle      = r.battle;
            State.endlessWave = r.wave;
            tg?.HapticFeedback?.impactOccurred('heavy');
            this.scene.start('Battle');
          }).catch(() => this.scene.start('Natisk'));
        }
      : (isTitan)
      ? _goTitanNext
      : (isEndless)
      ? () => { this.scene.start('Natisk'); }
      : () => { this.scene.start('Menu', { returnTab: 'profile' }); };
    this._bigBtn(W / 2, H * 0.79,
      bigBtnLabel,
      won ? C.gold : 0x881a22,
      won ? '#1a1a28' : '#ffffff',
      bigBtnCb
    );
    if (isEndless && won) {
      this._mainBtn(W / 2, H * 0.89, '🚪  Завершить заход', () => {
        post('/api/endless/abandon', {}).catch(() => {}).finally(() => this.scene.start('Natisk'));
      });
    } else if (isTitan) {
      this._mainBtn(W / 2, H * 0.89, '🚪  Выйти к боям', () => this.scene.start('Menu', { returnTab: 'battle' }));
    } else if (won && r.level_up) {
      this._bigBtn(W / 2, H * 0.89, '⚡  Улучшить статы!', 0x5520a0, '#ffffff',
        () => this.scene.start('Stats', { player: State.player }));
    } else {
      this._mainBtn(W / 2, H * 0.89, '🏠  Главная', () => this.scene.start('Menu', { returnTab: 'profile' }));
    }

    if (won) {
      const shareY = H * 0.96;
      const shareT = txt(this, W / 2, shareY, '📤 Поделиться победой', 11, '#ddddff').setOrigin(0.5);
      const shareZ = this.add.zone(W / 2, shareY, 200, 24).setInteractive({ useHandCursor: true });
      shareZ.on('pointerup', () => {
        const p = State.player;
        const text = `🏆 Победил в Duel Arena! Ур.${p?.level || '?'} · ★${p?.rating || '?'}\nЗаходи: https://t.me/ZenDuelArena_bot`;
        tg?.switchInlineQuery ? tg.switchInlineQuery(text) : null;
      });
    }
  },

});
