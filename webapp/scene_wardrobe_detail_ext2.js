/* ============================================================
   USDT-слот детальный экран — ext2: passive section + action buttons
   Продолжение от scene_wardrobe_detail.js
   ============================================================ */

(() => {
  const PASSIVE_OPTIONS = [
    { key: "damage_pct",   label: "⚔ Урон +8%"  },
    { key: "double_hit",   label: "⚡ 2×удар 8%" },
    { key: "crit_dmg_pct", label: "💥 Крит +8%"  },
    { key: "armor_pct",    label: "🛡 Броня +4%" },
  ];
  const STATS_LEN = 4;

  StatsScene.prototype._renderUsdtDetailPassive = function(item, wp, layer, W, free, passive, locked, statsY, sv) {
    // Passive section
    const passiveY = statsY + STATS_LEN * 28 + 4;
    const passiveLabel = locked
      ? "Пассивный бонус (сохранён):"
      : "Выбери пассивный бонус (1 из 4):";
    layer.push(txt(this, W/2, passiveY, passiveLabel, 10, "#c8c8e8").setOrigin(0.5).setDepth(132));

    const passiveBtnW = Math.floor((W - 32) / 2);
    PASSIVE_OPTIONS.forEach((opt, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = 12 + col * (passiveBtnW + 4);
      const by = passiveY + 14 + row * 26;
      const active = passive === opt.key;
      const pbg2 = this.add.graphics().setDepth(132);
      pbg2.fillStyle(active ? 0x4a3a80 : 0x252340, .95);
      pbg2.fillRoundedRect(bx, by, passiveBtnW, 22, 5);
      if (active) { pbg2.lineStyle(1.5, 0xffcc00, .9); pbg2.strokeRoundedRect(bx, by, passiveBtnW, 22, 5); }
      layer.push(pbg2);
      layer.push(txt(this, bx+passiveBtnW/2, by+11, opt.label, 9, active ? "#ffcc00" : "#8888aa", active).setOrigin(0.5).setDepth(133));
      if (!locked) {
        const ppz = this.add.zone(bx+passiveBtnW/2, by+11, passiveBtnW, 22).setInteractive({useHandCursor:true}).setDepth(134);
        ppz.on("pointerdown", () => {
          if (this._avatarBusy) return;
          this._usdtDetailAction("set_passive", {...item, _passive: active ? "" : opt.key}, wp);
        });
        layer.push(ppz);
      }
    });

    // Separator
    const sepY = passiveY + 72;
    const dg = this.add.graphics().setDepth(132);
    dg.lineStyle(1, 0x3a3850, .6); dg.lineBetween(16, sepY, W-16, sepY);
    layer.push(dg);

    const mkBtn = (y, label, col, fn) => {
      const g = this.add.graphics().setDepth(132);
      const btnH = 30, btnW = W - 24;
      g.fillStyle(col, .95); g.fillRoundedRect(12, y, btnW, btnH, 9);
      layer.push(g, txt(this, W/2, y+btnH/2, label, 11, "#f0f0fa", true).setOrigin(0.5).setDepth(133));
      const z = this.add.zone(W/2, y+btnH/2, btnW, btnH).setInteractive({useHandCursor:true}).setDepth(134);
      z.on("pointerdown", fn);
      layer.push(z);
      return y + btnH + 5;
    };

    let btnY = sepY + 6;

    // Кнопка "Сохранить сборку" — только пока не locked
    if (!locked) {
      const canSave = free === 0 && !!passive;
      if (canSave) {
        btnY = mkBtn(btnY, "💾 Сохранить сборку", 0x1a6aaa,
          () => this._usdtDetailAction("apply_stats", item, wp));
      } else {
        const hint = free > 0
          ? `⛔ Осталось вложить ${free} очков`
          : "⛔ Выбери пассивный бонус";
        const g = this.add.graphics().setDepth(132);
        const btnH = 30, btnW = W - 24;
        g.fillStyle(0x2a2a3a, .8); g.fillRoundedRect(12, btnY, btnW, btnH, 9);
        g.lineStyle(1, 0x555568, .7); g.strokeRoundedRect(12, btnY, btnW, btnH, 9);
        layer.push(g, txt(this, W/2, btnY+btnH/2, hint, 10, "#6666aa", false).setOrigin(0.5).setDepth(133));
        btnY += btnH + 5;
      }
    }

    // Надеть / Снять
    if (!item.equipped) {
      btnY = mkBtn(btnY, "▶ Надеть образ", 0x1a9944, () => this._usdtDetailAction("equip", item, wp));
    } else {
      btnY = mkBtn(btnY, "✅ Надет  ·  Снять образ", 0xcc4422, () => this._usdtDetailAction("unequip", item, wp));
    }

    // Сброс статов
    btnY = mkBtn(btnY, "🔄 Сброс сборки · 5.99 USDT", 0xd4a010,
      () => this._usdtDetailAction("reset_invoice", item, wp));

    // "Я оплатил" — показываем только если есть ожидающий счёт для этого образа
    if (this._pendingResetInvoice?.class_id === item.class_id) {
      mkBtn(btnY, "✅ Я оплатил — применить сброс", 0x1a7a2a,
        () => this._usdtDetailAction("check_reset", item, wp));
    }
  };

})();
