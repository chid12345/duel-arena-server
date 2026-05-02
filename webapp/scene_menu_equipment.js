/* ============================================================
   MenuScene — equipment: слоты экипировки на профиле.
   Визуал (PNG + glow по редкости + клики) — EquipmentSlotsHTML.
   Здесь только вызов overlay и запасной fallback-текст.
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _addEquipmentSlots(c, W, czY, czH, PAD, mkG, mkT, mkZ, ca) {
    if (typeof EquipmentSlotsHTML !== 'undefined') {
      EquipmentSlotsHTML.show(this);
      return;
    }
    // Fallback: если overlay не загрузился — показываем текстовые метки
    const _LABELS = { belt:'ГОЛОВА', armor:'ТЕЛО', boots:'НОГИ',
                      weapon:'ОРУЖИЕ', shield:'ЩИТ', ring1:'КОЛЬЦО' };
    const SW = 60, SH = 64;
    const colW = Math.round((W - PAD * 2) / 4);
    const lx   = PAD + Math.round((colW - SW) / 2);
    const rx   = W - PAD - colW + Math.round((colW - SW) / 2);
    const slotZoneH = czH - 80;
    const sTop = czY + 14, sMid = czY + Math.round((slotZoneH - SH) / 2), sBot = czY + slotZoneH - SH;
    const slots = [
      { slot:'belt',   x:lx, y:sTop }, { slot:'armor',  x:lx, y:sMid },
      { slot:'boots',  x:lx, y:sBot }, { slot:'weapon',  x:rx, y:sTop },
      { slot:'shield', x:rx, y:sMid }, { slot:'ring1',   x:rx, y:sBot },
    ];
    slots.forEach(({ slot, x, y }) => {
      const cx = x + SW / 2;
      ca(mkT(cx, y + SH - 9, _LABELS[slot] || slot, 9, '#ffffff', true)).setOrigin(0.5);
      const zone = mkZ(cx, y + SH / 2, SW + 4, SH + 4).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        Sound.click();
        if      (slot === 'armor'  )                         this.scene.start('Stats', { player: State.player, openWardrobe: true });
        else if (slot === 'weapon' && typeof WeaponHTML !== 'undefined') WeaponHTML.open(this);
        else if (slot === 'belt'   && typeof HelmetHTML !== 'undefined') HelmetHTML.open(this);
        else if (slot === 'boots'  && typeof BootsHTML  !== 'undefined') BootsHTML.open(this);
        else if (slot === 'shield' && typeof ShieldHTML !== 'undefined') ShieldHTML.open(this);
        else if ((slot === 'ring1' || slot === 'ring2') && typeof RingHTML !== 'undefined') RingHTML.open(this);
      });
      c.add(zone);
    });
  },

});
