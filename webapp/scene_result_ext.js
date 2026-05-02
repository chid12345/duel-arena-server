/* ============================================================
   ResultScene ext — _buildResultPanel, _buildResultExtra
   [cyberpunk redesign]
   ============================================================ */

Object.assign(ResultScene.prototype, {

  _buildResultPanel(W, H, won, r, isAfk, isEndless, isTitan, endlessWave, titanFloor, res) {
    const px = 14, py = H * 0.245, pw = W - 28;
    const nCol = won ? 0x00e5ff : 0xff1144;
    const nHex = won ? '#00e5ff' : '#ff1144';
    const hasStreak = (r.win_streak > 1 || r.streak_bonus > 0);
    const maxPH = won ? (hasStreak ? (isTitan ? 240 : 202) : (isTitan ? 200 : 186)) : 140;
    this._panelBottom = py + maxPH;
    this._cyberPanel(px, py, pw, maxPH, nCol);

    if (won) {
      // Header bar
      const hg = this.add.graphics();
      hg.fillStyle(nCol, 0.12); hg.fillRect(px, py, pw, 22);
      hg.lineStyle(1, nCol, 0.4); hg.moveTo(px, py+22); hg.lineTo(px+pw, py+22); hg.strokePath();
      this.add.text(W/2, py+11, '◈  Н А Г Р А Д Ы  ◈', {
        fontFamily: 'Arial', fontSize: '9px', fontStyle: 'bold', color: nHex, letterSpacing: 2
      }).setOrigin(0.5);

      // Gold
      const goldTxt = this.add.text(W/2, py+52, '💰  +0 золота', {
        fontFamily: 'Arial Black, Arial', fontSize: '22px', fontStyle: 'bold', color: '#ffd700',
        shadow: { offsetX: 0, offsetY: 0, color: '#ffd700', blur: 12, fill: true }
      }).setOrigin(0.5);
      this._countUp(goldTxt, r.gold || 0, '💰  +', ' золота', 180);

      if (isEndless) {
        this.add.text(W/2, py+90, `⚔️  Урон нанесён: ${r.damage || 0}`, {
          fontFamily: 'Arial', fontSize: '17px', color: '#ddaa66'
        }).setOrigin(0.5);
      } else {
        const expTxt = this.add.text(W/2, py+90, '⭐  +0 опыта', {
          fontFamily: 'Arial Black, Arial', fontSize: '19px', fontStyle: 'bold', color: '#4488ff',
          shadow: { offsetX: 0, offsetY: 0, color: '#4488ff', blur: 10, fill: true }
        }).setOrigin(0.5);
        this._countUp(expTxt, r.exp || 0, '⭐  +', ' опыта', 420);
      }

      // Divider
      const dg = this.add.graphics();
      dg.lineStyle(1, nCol, 0.18); dg.moveTo(px+18, py+116); dg.lineTo(px+pw-18, py+116); dg.strokePath();

      // Rounds + ELO row
      const ry = py + 134;
      this.add.text(W/2 - 68, ry, `⚔️  Раундов: ${r.rounds || 0}`, {
        fontFamily: 'Arial', fontSize: '12px', color: '#7788aa'
      }).setOrigin(0.5);

      if (r.rating_change && r.rating_change !== 0) {
        const eSign = r.rating_change > 0 ? '+' : '';
        const eCol  = r.rating_change > 0 ? '#00ff88' : '#ff4455';
        this.add.text(W/2+68, ry, `★ ${eSign}${r.rating_change} ELO`,
          { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: eCol, shadow: { offsetX:0, offsetY:0, color:eCol, blur:8, fill:true } }).setOrigin(0.5);
      }
      let extraY = py + 158;
      if ((r.streak_bonus || 0) > 0) {
        const sb = this.add.text(W/2, extraY, `🎉  +${r.streak_bonus} бонус серии!`,
          { fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#ff8855' }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: sb, alpha: 1, delay: 700, duration: 300 });
        extraY += 22;
      }
      if ((r.win_streak || 0) > 1) {
        this.add.text(W/2, extraY, `🔥  Серия: ${r.win_streak} побед подряд!`,
          { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ff6600' }).setOrigin(0.5);
        extraY += 22;
      }
      if (r.level_up) this.time.delayedCall(900, () => this._levelUpFlash(W, H));
      if (isEndless && endlessWave > 0) {
        this.add.text(W/2, extraY, `🔥  Волна ${endlessWave} пройдена!`,
          { fontFamily: 'Arial', fontSize: '13px', color: '#ff6644' }).setOrigin(0.5);
        if (endlessWave % 5 === 0)
          this.add.text(W/2, extraY + 20, '💚  +10% HP восстановлено!', {
            fontFamily: 'Arial', fontSize: '12px', color: '#3cc864'
          }).setOrigin(0.5);
      }
      if (isTitan && titanFloor > 0) {
        this.add.text(W/2, extraY, `🗿  Этаж ${titanFloor} пройден!`, {
          fontFamily: 'Arial Black', fontSize: '14px', color: '#cc88ff'
        }).setOrigin(0.5);
        const tp = res?.titan_progress;
        if (tp && Number(tp.best_floor) === titanFloor)
          this.add.text(W/2, extraY + 20, '🆕  Новый рекорд Башни!', {
            fontFamily: 'Arial', fontSize: '11px', color: '#ffd700'
          }).setOrigin(0.5);
      }

    } else if (isAfk) {
      this.add.text(W/2, py+28, '⏱️  Поражение по таймауту', {
        fontFamily: 'Arial Black', fontSize: '14px', color: '#ff8855'
      }).setOrigin(0.5);
      this.add.text(W/2, py+56, '3 раунда прошли без хода', { fontFamily: 'Arial', fontSize: '12px', color: '#cc6633' }).setOrigin(0.5);
      this.add.text(W/2, py+76, 'Нажимай кнопки быстрее!',  { fontFamily: 'Arial', fontSize: '11px', color: '#556677' }).setOrigin(0.5);
      this.add.text(W/2, py+100, `Раундов: ${(r.rounds||0) > 0 ? r.rounds : '—'}`, { fontFamily: 'Arial', fontSize: '11px', color: '#7788aa' }).setOrigin(0.5);
      if (r.rating_change && r.rating_change !== 0) {
        const s = r.rating_change > 0 ? '+' : '';
        this.add.text(W/2, py+120, `★ ${s}${r.rating_change} ELO`, { fontFamily: 'Arial Black', fontSize: '12px', color: '#ff4455' }).setOrigin(0.5);
      }
    } else if (isEndless) {
      this.add.text(W/2, py+16, 'И Т О Г И  З А Х О Д А', { fontFamily: 'Arial', fontSize: '9px', fontStyle: 'bold', color: nHex, letterSpacing: 2 }).setOrigin(0.5);
      this.add.text(W/2, py+44, `💀  Волна ${endlessWave > 0 ? endlessWave : '?'} — конец`, { fontFamily: 'Arial Black', fontSize: '16px', color: '#ff4455' }).setOrigin(0.5);
      this.add.text(W/2, py+76, `⚔️  Урон нанесён: ${r.damage || 0}`, { fontFamily: 'Arial', fontSize: '13px', color: '#ddaa66' }).setOrigin(0.5);
      this.add.text(W/2, py+100, `⏱️  Раундов: ${r.rounds || 0}`, { fontFamily: 'Arial', fontSize: '12px', color: '#7788aa' }).setOrigin(0.5);
    } else if (isTitan) {
      this.add.text(W/2, py+16, 'И Т О Г И  Б А Ш Н И', { fontFamily: 'Arial', fontSize: '9px', fontStyle: 'bold', color: nHex, letterSpacing: 2 }).setOrigin(0.5);
      this.add.text(W/2, py+46, `💀  Этаж ${titanFloor > 0 ? titanFloor : '?'} — не пройден`, { fontFamily: 'Arial Black', fontSize: '16px', color: '#ff4455' }).setOrigin(0.5);
      const bf = res?.titan_progress?.best_floor ?? 0;
      if (bf > 0) this.add.text(W/2, py+78, `🏆  Рекорд: ${bf} этаж`, { fontFamily: 'Arial', fontSize: '12px', color: '#7788aa' }).setOrigin(0.5);
    } else {
      this.add.text(W/2, py+22, '💪  Не сдавайся!', { fontFamily: 'Arial Black', fontSize: '14px', color: '#7788aa' }).setOrigin(0.5);
      this.add.text(W/2, py+46, 'Утешительные награды', { fontFamily: 'Arial', fontSize: '10px', color: '#445566' }).setOrigin(0.5);
      if ((r.gold || 0) > 0) {
        const cG = this.add.text(W/2, py+70, '💰  +0 золота', { fontFamily: 'Arial Black', fontSize: '18px', color: '#cc9922' }).setOrigin(0.5);
        this._countUp(cG, r.gold, '💰  +', ' золота', 200);
      }
      if ((r.exp || 0) > 0) {
        const cE = this.add.text(W/2, py+98, '⭐  +0 опыта', { fontFamily: 'Arial', fontSize: '15px', color: '#3366cc' }).setOrigin(0.5);
        this._countUp(cE, r.exp, '⭐  +', ' опыта', 400);
      }
      const sr = py + (((r.gold||0)>0 || (r.exp||0)>0) ? 122 : 74);
      this.add.text(W/2-62, sr, `Раундов: ${(r.rounds||0)>0 ? r.rounds : '—'}`, { fontFamily: 'Arial', fontSize: '11px', color: '#445566' }).setOrigin(0.5);
      if (r.rating_change && r.rating_change !== 0) {
        const s = r.rating_change > 0 ? '+' : '';
        this.add.text(W/2+62, sr, `★ ${s}${r.rating_change} ELO`, { fontFamily: 'Arial Black', fontSize: '12px', color: '#ff4455' }).setOrigin(0.5);
      }
    }
  },

  async _buildResultExtra(W, H, won, r, isEndless, isTitan, endlessWave, endlessProgress, endlessStatus, titanFloor, res) {
    const nCol = won ? 0x00e5ff : 0xff1144;
    const pb   = this._panelBottom || H * 0.50;
    const bigY = pb + (isEndless ? 70 : 56);
    const divY = bigY + 70;
    const rowY = divY + 36;

    if (isEndless && endlessStatus?.ok) {
      const bw = endlessStatus.progress?.best_wave ?? endlessProgress?.best_wave ?? 0;
      const py = H * 0.245;
      if (!won && endlessWave > 0)
        txt(this, W/2, py+110, bw===endlessWave ? '🆕 Новый рекорд!' : (bw>endlessWave ? `🏆 Рекорд: ${bw} волн` : ''), 12, '#ffd700', true).setOrigin(0.5);
      if (won && endlessWave > 0 && bw === endlessWave && endlessWave > 1)
        txt(this, W/2, py+183, '🆕 Новый рекорд волны!', 11, '#ffd700', true).setOrigin(0.5);
      const left = endlessStatus.attempts_left ?? 0;
      this.add.text(W/2, pb+18, `🔥  Осталось попыток: ${left}`,
        { fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: left > 0 ? '#00ff88' : '#ff4455' }).setOrigin(0.5);
    }

    const _goTitanNext = () => {
      post('/api/titans/start', {}).then(rr => {
        if (!rr.ok) { this.scene.start('Menu', { openBattleSelect: true }); return; }
        State.battle = rr.battle; tg?.HapticFeedback?.impactOccurred('heavy'); this.scene.start('Battle');
      }).catch(() => this.scene.start('Menu', { openBattleSelect: true }));
    };

    const bigLabel = (isEndless && won) ? 'Следующая\nволна!'
                   : (isTitan && won)   ? 'Следующий\nэтаж!'
                   : (isTitan)          ? 'Попробовать\nснова!'
                   :                      'Ещё бой!';
    const bigCb = (isEndless && won)
      ? () => { post('/api/endless/next_wave', {}).then(rr => {
          if (!rr.ok) { this.scene.start('Natisk'); return; }
          State.battle = rr.battle; State.endlessWave = rr.wave;
          tg?.HapticFeedback?.impactOccurred('heavy'); this.scene.start('Battle');
        }).catch(() => this.scene.start('Natisk')); }
      : (isTitan)   ? _goTitanNext
      : (isEndless) ? () => this.scene.start('Natisk')
      : () => this.scene.start('Menu', { returnTab: 'profile' });

    // Endless won: два рядом, без нижнего ряда
    if (isEndless && won) {
      this._iconBtn(W * 0.33, bigY, 'btn_fight', bigLabel, '#ff8c00', bigCb, 72);
      this._iconBtn(W * 0.67, bigY, 'btn_home',  'Завершить', '#7eb8ff', () => {
        post('/api/endless/abandon', {}).catch(()=>{}).finally(() => this.scene.start('Natisk'));
      }, 72);
      return;
    }

    // Главная большая кнопка
    const bigCol = won ? '#ff8c00' : '#ff4455';
    this._iconBtn(W / 2, bigY, 'btn_fight', bigLabel, bigCol, bigCb, 82);

    // Неоновый разделитель
    const dg = this.add.graphics().setAlpha(0);
    dg.lineStyle(1, nCol, 0.22);
    dg.moveTo(W * 0.18, divY); dg.lineTo(W * 0.82, divY); dg.strokePath();
    this.tweens.add({ targets: dg, alpha: 1, duration: 400, delay: 300 });

    // Башня: одна кнопка навигации
    if (isTitan) {
      this._iconBtn(W / 2, rowY, 'btn_home', 'К боям', '#7eb8ff',
        () => this.scene.start('Menu', { openBattleSelect: true }), 62);
      return;
    }

    // Обычный бой (и endless lost): ряд из 2–3 кнопок
    const replayLog = Array.isArray(res?.webapp_log) ? res.webapp_log : [];
    const homeCb = () => this.scene.start('Menu', { returnTab: 'profile' });
    const allCb  = () => { try { BattleHistory.open(this.game.canvas); } catch (_) {} };
    const hisCb  = () => { if (replayLog.length > 0) try { BattleLog.showHistory(this.game.canvas, replayLog); } catch (_) {} };

    if (replayLog.length > 0) {
      this._iconBtn(W * 0.20, rowY, 'btn_home',       'Главная', '#7eb8ff', homeCb, 62);
      this._iconBtn(W * 0.50, rowY, 'btn_battle_log', 'История', '#cc44ff', hisCb,  62);
      this._iconBtn(W * 0.80, rowY, 'btn_history',    'Все бои', '#4499ff', allCb,  62);
    } else {
      this._iconBtn(W * 0.32, rowY, 'btn_home',    'Главная', '#7eb8ff', homeCb, 62);
      this._iconBtn(W * 0.68, rowY, 'btn_history', 'Все бои', '#4499ff', allCb,  62);
    }
  },

});
