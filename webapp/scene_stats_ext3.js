/* ============================================================
   StatsScene — расширение 3: _onTrain, _animateRow,
   _disableAllBtns, _refreshCombat, _spawnFloat, _showToast
   ============================================================ */

Object.assign(StatsScene.prototype, {

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
  },

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
  },

  _disableAllBtns() {
    Object.values(this._statRows).forEach(row => {
      row.zone.disableInteractive();
      this._drawPlusBtn(row.btn, row.btnX, row.btnY, row.btnW, row.btnH, row.s.color, false, false);
      row.btnTxt.setText('—').setStyle({ color: '#ccccee' });
    });
  },

  _refreshCombat(p) {
    Object.values(this._combatCells).forEach(cell => {
      const newVal = cell.fn(p);
      if (cell.t.text !== newVal) {
        cell.t.setText(newVal);
        this.tweens.add({ targets: cell.t, alpha: 0.15, duration: 80, yoyo: true });
      }
    });
  },

  /* ── Вспомогательные ─────────────────────────────────── */
  _spawnFloat(x, y, msg) {
    const t = txt(this, x, y, msg, 22, '#ffc83c', true).setOrigin(0.5).setAlpha(1);
    this.tweens.add({
      targets: t, y: y - 70, alpha: 0,
      duration: 850, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  },

  _showToast(msg) {
    const t = txt(this, this.W / 2, this.H - 52, msg, 12, '#ff4455', true)
      .setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1,
      duration: 200, hold: 1400, yoyo: true,
      onComplete: () => t.destroy(),
    });
  },

});
