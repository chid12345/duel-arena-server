/* ============================================================
   Inventory Overlay — ext1: _applyInventoryItem, _showReplaceDialog,
     _closeInvOverlay, _showBoxReveal
   ============================================================ */

(() => {
  StatsScene.prototype._applyInventoryItem = async function(itemId) {
    if (this._invBusy) return;
    this._invBusy = true;
    try {
      const res = await post('/api/shop/apply', { item_id: itemId, replace: false });
      if (res?.conflict) {
        this._showReplaceDialog(itemId, res.active_buff_type, res.active_charges);
        return;
      }
      if (res?.ok) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        // Обновляем инвентарь локально — без второго GET-запроса
        if (this._invData?.inventory) {
          const idx = this._invData.inventory.findIndex(i => i.item_id === itemId);
          if (idx !== -1) {
            if (this._invData.inventory[idx].quantity > 1) {
              this._invData.inventory[idx].quantity -= 1;
            } else {
              this._invData.inventory.splice(idx, 1);
            }
          }
        }
        if (res.active_buffs !== undefined && this._invData) {
          this._invData.active_buffs = res.active_buffs;
        }
        if (res.box_opened) {
          this._showBoxReveal(res);
        } else {
          this._showToast(res.msg || '✅ Применено!');
          this._renderInvOverlay();
          this._refreshBuffDisplay();
        }
      } else { this._showToast(`❌ ${res?.reason || 'Ошибка'}`); }
    } catch { this._showToast('❌ Нет соединения'); }
    finally { this._invBusy = false; }
  };

  StatsScene.prototype._showReplaceDialog = function(newItemId, activeBuffType, activeCharges) {
    const { W, H } = this, dlg = [], dlgY = H/2 - 70, dlgW = W - 48;
    const bg = this.add.graphics().setDepth(150);
    bg.fillStyle(0x1b1a30,.98); bg.fillRoundedRect(24, dlgY, dlgW, 140, 12);
    bg.lineStyle(2, 0xffaa33,.9); bg.strokeRoundedRect(24, dlgY, dlgW, 140, 12);
    dlg.push(bg);
    dlg.push(txt(this, W/2, dlgY+20, '⚠️ Уже активен свиток', 13, '#ffdd88', true).setOrigin(.5).setDepth(151));
    dlg.push(txt(this, W/2, dlgY+42, `${activeBuffType} (${activeCharges ?? '?'} боёв)`, 10, '#ccccee', true).setOrigin(.5).setDepth(151));
    dlg.push(txt(this, W/2, dlgY+60, 'Заменить? Старый сгорит.', 10, '#ffaaaa', true).setOrigin(.5).setDepth(151));

    const makeDlgBtn = (x, w, label, col, fn) => {
      const g = this.add.graphics().setDepth(151);
      g.fillStyle(col,.95); g.fillRoundedRect(x, dlgY+82, w, 30, 8);
      dlg.push(g, txt(this, x+w/2, dlgY+97, label, 11, '#fff', true).setOrigin(.5).setDepth(152));
      const z = this.add.zone(x+w/2, dlgY+97, w, 30).setInteractive({useHandCursor:true}).setDepth(153);
      z.on('pointerdown', fn); dlg.push(z);
    };
    const bw = Math.floor((dlgW - 24) / 2);
    makeDlgBtn(32, bw, 'Заменить', 0xcc6600, async () => {
      dlg.forEach(o => { try { o.destroy(); } catch {} });
      this._invBusy = true;
      this._showToast('⏳ Заменяем...');
      try {
        const res = await post('/api/shop/apply', { item_id: newItemId, replace: true });
        if (res?.ok) {
          if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
          // Обновляем локально — без лишнего GET
          if (this._invData?.inventory) {
            const idx = this._invData.inventory.findIndex(i => i.item_id === newItemId);
            if (idx !== -1) {
              if (this._invData.inventory[idx].quantity > 1) {
                this._invData.inventory[idx].quantity -= 1;
              } else {
                this._invData.inventory.splice(idx, 1);
              }
            }
          }
          if (res.active_buffs !== undefined && this._invData) {
            this._invData.active_buffs = res.active_buffs;
          }
          this._showToast(res.msg || '✅ Заменён!');
          this._renderInvOverlay();
          this._refreshBuffDisplay();
        } else { this._showToast(`❌ ${res?.reason || 'Ошибка'}`); }
      } catch { this._showToast('❌ Нет соединения'); }
      finally { this._invBusy = false; }
    });
    makeDlgBtn(32 + bw + 8, bw, 'Отмена', 0x444466, () => { dlg.forEach(o => { try { o.destroy(); } catch {} }); });
    this._invOverlay = (this._invOverlay || []).concat(dlg);
  };

  StatsScene.prototype._closeInvOverlay = function() {
    (this._invOverlay || []).forEach(o => { try { o.destroy(); } catch {} });
    this._invOverlay = null;
    this._refreshBuffDisplay(); // синхронизировать статы после закрытия
  };

  /* ── Красивый попап при открытии ящика ─────────────────── */
  StatsScene.prototype._showBoxReveal = function(res) {
    const { W, H } = this;
    const icon = res.item_icon || '🎁';
    const name = res.item_name || 'Предмет';
    const isEpic = (res.item_id || '').includes('12') || (res.item_id || '').includes('titan') || (res.item_id || '').includes('500');
    const glowColor = isEpic ? 0xffaa00 : 0x55cc66;
    const glowHex   = isEpic ? '#ffaa00' : '#55cc66';
    const rvl = [];

    // Затемнение
    rvl.push(this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.85).setDepth(160));

    // Карточка
    const cW = W - 64, cH = 220, cX = 32, cY = H/2 - cH/2;
    const bg = this.add.graphics().setDepth(161);
    bg.fillStyle(0x12101e, 0.98); bg.fillRoundedRect(cX, cY, cW, cH, 16);
    bg.lineStyle(2.5, glowColor, 0.9); bg.strokeRoundedRect(cX, cY, cW, cH, 16);
    rvl.push(bg);

    // Лучи (статичные линии вместо анимации — просто)
    const rg = this.add.graphics().setDepth(161);
    rg.lineStyle(1, glowColor, 0.18);
    for (let a = 0; a < 360; a += 30) {
      const rad = a * Math.PI / 180;
      rg.lineBetween(W/2, H/2, W/2 + Math.cos(rad)*140, H/2 + Math.sin(rad)*140);
    }
    rvl.push(rg);

    rvl.push(txt(this, W/2, cY + 22, '🎲 ИЗ ЯЩИКА ВЫПАЛО', 11, glowHex, true).setOrigin(0.5).setDepth(162));
    rvl.push(txt(this, W/2, cY + 70, icon, 44).setOrigin(0.5).setDepth(162));
    rvl.push(txt(this, W/2, cY + 120, name, 15, '#ffffff', true).setOrigin(0.5).setDepth(162));
    rvl.push(txt(this, W/2, cY + 142, '→ добавлено в инвентарь', 10, '#aaaacc').setOrigin(0.5).setDepth(162));

    if (isEpic) rvl.push(txt(this, W/2, cY + 158, '⭐ РЕДКИЙ ПРЕДМЕТ ⭐', 11, '#ffcc44', true).setOrigin(0.5).setDepth(162));

    // Кнопка OK
    const okY = cY + cH - 44, okW = cW - 48;
    const okG = this.add.graphics().setDepth(162);
    okG.fillStyle(glowColor === 0xffaa00 ? 0x7a5000 : 0x1a4a2a, 1);
    okG.fillRoundedRect(cX + 24, okY, okW, 36, 10);
    okG.lineStyle(1.5, glowColor, 0.9);
    okG.strokeRoundedRect(cX + 24, okY, okW, 36, 10);
    rvl.push(okG, txt(this, W/2, okY + 18, '✅ Отлично!', 13, '#ffffff', true).setOrigin(0.5).setDepth(163));
    const okZ = this.add.zone(W/2, okY + 18, okW, 36).setInteractive({useHandCursor:true}).setDepth(164);
    okZ.on('pointerdown', () => {
      rvl.forEach(o => { try { o.destroy(); } catch {} });
      this._renderInvOverlay();
    });
    rvl.push(okZ);
    this._invOverlay = (this._invOverlay || []).concat(rvl);
  };
})();
