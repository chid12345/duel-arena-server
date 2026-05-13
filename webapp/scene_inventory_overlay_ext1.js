/* ============================================================
   Inventory Overlay — ext1: _applyInventoryItem, _showReplaceDialog,
     _closeInvOverlay, _showBoxReveal (мульти-дроп)
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
          this._showBoxReveal(res, itemId);
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
    this._refreshBuffDisplay();
  };

  /* ── Попап открытия ящика — делегируем BoxRevealCard (DOM) ── */
  StatsScene.prototype._showBoxReveal = function(res, boxId) {
    const items = res.items
      || [{ item_id: res.item_id, icon: res.item_icon, name: res.item_name, desc: '' }];
    BoxRevealCard.show(items, {
      title:   'ИЗ ЯЩИКА ВЫПАЛО',
      boxId,
      onClose: () => { this._renderInvOverlay(); },
    });
  };
})();
