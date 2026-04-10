/* ============================================================
   USDT-слот детальный экран — настройка статов и бонуса.
   Открывается из scene_wardrobe_overlay.js → _openUsdtDetail()
   ============================================================ */

(() => {
  StatsScene.prototype._openUsdtDetail = function(item, wp) {
    this._closeUsdtDetail();
    this._usdtDetailItem = item;
    this._usdtDetailWp   = wp;
    this._renderUsdtDetail(item, wp);
  };

  StatsScene.prototype._renderUsdtDetail = function(item, wp) {
    this._closeUsdtDetail();
    const { W, H } = this;
    const layer = []; this._usdtDetailLayer = layer;

    const pY = 48, pH = H - 96;
    const dim = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.82).setDepth(130);
    layer.push(dim);
    const panel = makePanel(this, 8, pY, W-16, pH, 12, 0.99);
    if (panel?.setDepth) panel.setDepth(131);
    layer.push(panel);

    // Заголовок
    layer.push(txt(this, W/2, pY+16, `💠 ${item.name}`, 14, "#39d084", true).setOrigin(0.5).setDepth(132));

    // Кнопка закрыть
    const cg = this.add.graphics().setDepth(132);
    cg.fillStyle(0x3a2030,1); cg.fillRoundedRect(W-44, pY+8, 28, 22, 7);
    cg.lineStyle(1,0xff6688,.9); cg.strokeRoundedRect(W-44, pY+8, 28, 22, 7);
    layer.push(cg, txt(this, W-30, pY+19, "✕", 12, "#ffd8e0", true).setOrigin(0.5).setDepth(133));
    const cz = this.add.zone(W-30, pY+19, 28, 22).setInteractive({useHandCursor:true}).setDepth(134);
    cz.on("pointerdown", () => { this._closeUsdtDetail(); });
    layer.push(cz);

    // Бейдж статус
    const eqLabel = item.equipped ? "✅ Надет" : "⬜ Снят";
    const eqCol   = item.equipped ? "#3cc864" : "#9999bb";
    layer.push(txt(this, W/2, pY+36, eqLabel, 11, eqCol, true).setOrigin(0.5).setDepth(132));

    // Сохранённые статы
    const statsY = pY + 58;
    layer.push(txt(this, W/2, statsY, "Сохранённые статы:", 11, "#c8c8e8", true).setOrigin(0.5).setDepth(132));
    const STATS = [
      { label: "💪 Сила",       val: item.strength, col: "#dc3c46" },
      { label: "🤸 Ловкость",   val: item.agility,  col: "#3cc8dc" },
      { label: "💥 Интуиция",   val: item.intuition, col: "#b45aff" },
      { label: "🛡 Выносл.",   val: item.endurance, col: "#3cc864" },
    ];
    const cellW = (W-24)/2;
    STATS.forEach((s, i) => {
      const col = i%2, row = Math.floor(i/2);
      const sx = 12 + col*cellW, sy = statsY + 18 + row*34;
      const bg = this.add.graphics().setDepth(132);
      bg.fillStyle(0x1e1c38,.9); bg.fillRoundedRect(sx, sy, cellW-6, 28, 7);
      layer.push(bg);
      layer.push(txt(this, sx+8, sy+8, s.label, 10, "#9999bb").setDepth(133));
      layer.push(txt(this, sx+cellW-18, sy+8, String(s.val), 13, s.col, true).setOrigin(1,0).setDepth(133));
    });

    // Бонус (special)
    const bonusY = statsY + 98;
    layer.push(txt(this, W/2, bonusY, item.special_bonus, 9, "#a8a8c8").setOrigin(0.5).setDepth(132));

    // Разделитель
    const dg = this.add.graphics().setDepth(132);
    dg.lineStyle(1, 0x3a3850, .7); dg.lineBetween(16, bonusY+16, W-16, bonusY+16);
    layer.push(dg);

    // Кнопки
    const btnY = bonusY + 24, btnH = 34, btnW = W - 24;

    const mkBtn = (y, label, col, fn) => {
      const g = this.add.graphics().setDepth(132);
      g.fillStyle(col, .95); g.fillRoundedRect(12, y, btnW, btnH, 9);
      layer.push(g, txt(this, W/2, y+btnH/2, label, 12, "#101020", true).setOrigin(0.5).setDepth(133));
      const z = this.add.zone(W/2, y+btnH/2, btnW, btnH).setInteractive({useHandCursor:true}).setDepth(134);
      z.on("pointerdown", fn);
      layer.push(z);
    };

    if (!item.equipped) {
      mkBtn(btnY, "▶ Надеть образ", C.green, () => this._usdtDetailAction("equip", item, wp));
    } else {
      mkBtn(btnY, "✖ Снять образ", 0x4a4870, () => this._usdtDetailAction("unequip", item, wp));
    }

    mkBtn(btnY + btnH + 8, "💾 Сохранить текущие статы", 0x34a6ff,
      () => this._usdtDetailAction("save", item, wp));

    mkBtn(btnY + (btnH+8)*2, "🔄 Сброс статов образа · 5.99 USDT", 0xd4a010,
      () => this._usdtDetailAction("reset_invoice", item, wp));

    // Подсказка
    const tipY = btnY + (btnH+8)*3 + 4;
    if (tipY < pY + pH - 20) {
      layer.push(txt(this, W/2, tipY,
        "«Сохранить» — зафиксирует текущие статы персонажа в образе",
        9, "#6666aa").setOrigin(0.5).setDepth(132));
    }
  };

  StatsScene.prototype._usdtDetailAction = async function(action, item, wp) {
    if (this._avatarBusy) return;
    this._avatarBusy = true;
    try {
      if (action === "equip") {
        const res = await post("/api/wardrobe/equip", { class_id: item.class_id });
        if (res?.ok) {
          if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
          this._avatarBusy = false;
          this.scene.restart({ player: State.player, reopenWardrobe: true, wardrobePayload: res, toast: "✅ Образ надет" });
          return;
        }
        this._showToast(`❌ ${res?.message || "Ошибка"}`);
      } else if (action === "unequip") {
        const res = await post("/api/wardrobe/unequip", {});
        if (res?.ok) {
          if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
          this._avatarBusy = false;
          this.scene.restart({ player: State.player, reopenWardrobe: true, wardrobePayload: res, toast: "✅ Образ снят" });
          return;
        }
        this._showToast(`❌ ${res?.message || "Ошибка"}`);
      } else if (action === "save") {
        const res = await post("/api/wardrobe/usdt/save", { class_id: item.class_id });
        if (res?.ok) {
          this._showToast("✅ Статы сохранены");
          // Обновляем деталь с новыми данными
          if (res.inventory) {
            const updated = res.inventory.find(x => x.class_id === item.class_id);
            if (updated) {
              this._avatarBusy = false;
              this._renderUsdtDetail({
                ...item,
                strength:  Number(updated.strength_saved  || 0),
                agility:   Number(updated.agility_saved   || 0),
                intuition: Number(updated.intuition_saved || 0),
                endurance: Number(updated.stamina_saved   || 0),
              }, res);
              return;
            }
          }
        } else { this._showToast(`❌ ${res?.message || "Ошибка"}`); }
      } else if (action === "reset_invoice") {
        const res = await post("/api/wardrobe/usdt/reset-invoice", { class_id: item.class_id });
        if (res?.ok && res.invoice_url) {
          tg?.openLink?.(res.invoice_url);
          this._showToast("💳 Счёт открыт — после оплаты статы сбросятся");
        } else { this._showToast(`❌ ${res?.reason || "Ошибка"}`); }
      }
    } catch { this._showToast("❌ Ошибка сети"); }
    this._avatarBusy = false;
  };

  StatsScene.prototype._closeUsdtDetail = function() {
    (this._usdtDetailLayer || []).forEach(o => { try { o.destroy(); } catch {} });
    this._usdtDetailLayer = null;
  };
})();
