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

  /* ── Попап открытия ящика — мульти-дроп (красивый) ───────── */
  StatsScene.prototype._showBoxReveal = function(res) {
    const { W, H } = this;
    const items = res.items || [{ item_id: res.item_id, icon: res.item_icon, name: res.item_name, desc: '' }];
    const _isSpecial = (id) => (id||'').includes('12') || (id||'').includes('titan')
      || (id||'').includes('500') || id === '_premium' || id === '_diamonds';
    const hasEpic = items.some(i => _isSpecial(i.item_id));
    const glowColor = hasEpic ? 0xffaa00 : 0x55cc66;
    const glowHex   = hasEpic ? '#ffaa00' : '#55cc66';
    const rvl = [];

    // Затемнение
    rvl.push(this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.88).setDepth(160));

    // Размеры: каждая карточка предмета = 54px
    const rowH = 54;
    const headerH = 44;
    const footerH = 56;
    const maxShow = Math.min(items.length, 6);
    const listH = maxShow * rowH + 4;
    const cH = headerH + listH + footerH;
    const cW = W - 32, cX = 16, cY = Math.max(30, H/2 - cH/2);

    // Фон карточки
    const bg = this.add.graphics().setDepth(161);
    bg.fillStyle(0x100e1a, 0.98); bg.fillRoundedRect(cX, cY, cW, cH, 16);
    bg.lineStyle(2.5, glowColor, 0.9); bg.strokeRoundedRect(cX, cY, cW, cH, 16);
    rvl.push(bg);

    // Лучи из центра заголовка
    const rg = this.add.graphics().setDepth(161);
    rg.lineStyle(1, glowColor, 0.12);
    for (let a = 0; a < 360; a += 30) {
      const rad = a * Math.PI / 180;
      rg.lineBetween(W/2, cY+22, W/2 + Math.cos(rad)*130, cY+22 + Math.sin(rad)*130);
    }
    rvl.push(rg);

    // Заголовок
    const countTxt = items.length > 1 ? ` (${items.length} шт.)` : '';
    rvl.push(txt(this, W/2, cY+16, `🎲 ИЗ ЯЩИКА ВЫПАЛО${countTxt}`, 13, glowHex, true).setOrigin(0.5).setDepth(162));

    // Разделитель
    const sep = this.add.graphics().setDepth(162);
    sep.lineStyle(1, glowColor, 0.25);
    sep.lineBetween(cX+12, cY+headerH-4, cX+cW-12, cY+headerH-4);
    rvl.push(sep);

    // Список предметов — карточки
    items.slice(0, maxShow).forEach((item, i) => {
      const iy = cY + headerH + i * rowH + 2;
      const special = _isSpecial(item.item_id);
      const cardPad = 8;

      // Фон строки-карточки
      const rbg = this.add.graphics().setDepth(162);
      rbg.fillStyle(special ? 0x2a2010 : 0x161422, 0.9);
      rbg.fillRoundedRect(cX+cardPad, iy, cW - cardPad*2, rowH - 4, 8);
      if (special) { rbg.lineStyle(1, 0xffaa00, 0.5); rbg.strokeRoundedRect(cX+cardPad, iy, cW-cardPad*2, rowH-4, 8); }
      rvl.push(rbg);

      // Иконка крупная
      rvl.push(txt(this, cX+cardPad+22, iy + (rowH-4)/2, item.icon || '🎁', 22).setOrigin(0.5).setDepth(163));

      // Название
      const nameCol = special ? '#ffcc44' : '#ffffff';
      rvl.push(txt(this, cX+cardPad+42, iy+10, item.name || item.item_id, 12, nameCol, true).setOrigin(0, 0).setDepth(163));

      // Описание эффекта (серым ниже)
      const desc = item.desc || '';
      if (desc) {
        rvl.push(txt(this, cX+cardPad+42, iy+26, desc, 9, special ? '#ddbb66' : '#8899bb').setOrigin(0, 0).setDepth(163));
      }

      // Звёздочка для редких
      if (special) {
        rvl.push(txt(this, cX+cW-cardPad-8, iy+(rowH-4)/2, '⭐', 12).setOrigin(1, 0.5).setDepth(163));
      }
    });

    if (items.length > maxShow) {
      const moreY = cY + headerH + maxShow * rowH + 2;
      rvl.push(txt(this, W/2, moreY, `... и ещё ${items.length - maxShow}`, 10, '#8888aa').setOrigin(0.5).setDepth(162));
    }

    // Надпись внизу
    rvl.push(txt(this, W/2, cY+cH-footerH+4, '→ всё добавлено в инвентарь', 10, '#7799cc').setOrigin(0.5).setDepth(162));

    // Кнопка OK
    const okY = cY + cH - 40, okW = cW - 40;
    const okG = this.add.graphics().setDepth(162);
    okG.fillStyle(hasEpic ? 0x7a5000 : 0x1a4a2a, 1);
    okG.fillRoundedRect(cX+20, okY, okW, 34, 10);
    okG.lineStyle(1.5, glowColor, 0.9);
    okG.strokeRoundedRect(cX+20, okY, okW, 34, 10);
    rvl.push(okG, txt(this, W/2, okY+17, '✅ Отлично!', 13, '#ffffff', true).setOrigin(0.5).setDepth(163));
    const okZ = this.add.zone(W/2, okY+17, okW, 34).setInteractive({useHandCursor:true}).setDepth(164);
    okZ.on('pointerdown', () => {
      rvl.forEach(o => { try { o.destroy(); } catch {} });
      this._renderInvOverlay();
    });
    rvl.push(okZ);
    tg?.HapticFeedback?.notificationOccurred('success');
    this._invOverlay = (this._invOverlay || []).concat(rvl);
  };
})();
