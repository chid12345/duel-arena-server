/* ============================================================
   USDT-слот детальный экран — распределение статов, пассивка.
   Открывается из scene_wardrobe_overlay.js → _openUsdtDetail()
   ============================================================ */

(() => {
  const STATS = [
    { key: "strength",  label: "💪 Сила",     col: "#dc3c46" },
    { key: "agility",   label: "🤸 Ловкость", col: "#3cc8dc" },
    { key: "intuition", label: "💥 Интуиция", col: "#b45aff" },
    { key: "stamina",   label: "🛡 Выносл.",  col: "#3cc864" },
  ];
  const PASSIVE_LABELS = ["Сила", "Ловк.", "Инт.", "Вын."];

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

    const pY = 44, pH = H - 88;
    const raw = item._raw || {};
    const free    = Math.max(0, Number(raw.free_stats_saved ?? 19));
    const passive = (raw.passive_type || "").trim();
    const sv = {
      strength:  Number(raw.strength_saved  || 0),
      agility:   Number(raw.agility_saved   || 0),
      intuition: Number(raw.intuition_saved || 0),
      stamina:   Number(raw.stamina_saved   || 0),
    };

    // Blocking zone — перехватывает клики до нижележащего оверлея гардероба
    const blockZ = this.add.zone(W/2, H/2, W, H).setInteractive().setDepth(129);
    blockZ.on("pointerdown", () => {});
    layer.push(blockZ);

    // Dim + panel
    layer.push(this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.82).setDepth(130));
    const panel = makePanel(this, 8, pY, W-16, pH, 12, 0.99);
    if (panel?.setDepth) panel.setDepth(131);
    layer.push(panel);

    // Title
    layer.push(txt(this, W/2, pY+14, `💠 ${item.name}`, 13, "#39d084", true).setOrigin(0.5).setDepth(132));

    // Close button
    const cg = this.add.graphics().setDepth(132);
    cg.fillStyle(0x3a2030,1); cg.fillRoundedRect(W-44, pY+6, 28, 22, 7);
    cg.lineStyle(1,0xff6688,.9); cg.strokeRoundedRect(W-44, pY+6, 28, 22, 7);
    layer.push(cg, txt(this, W-30, pY+17, "✕", 12, "#ffd8e0", true).setOrigin(0.5).setDepth(133));
    const cz = this.add.zone(W-30, pY+17, 28, 22).setInteractive({useHandCursor:true}).setDepth(134);
    cz.on("pointerdown", () => this._closeUsdtDetail());
    layer.push(cz);

    // Status badge
    const eqLabel = item.equipped ? "✅ Надет" : "⬜ Снят";
    layer.push(txt(this, W/2, pY+30, eqLabel, 10, item.equipped ? "#3cc864" : "#9999bb", true).setOrigin(0.5).setDepth(132));

    // Stat allocation counter
    const allocated = 19 - free;
    const freeColor = free > 0 ? "#ffc83c" : "#3cc864";
    layer.push(txt(this, W/2, pY+46,
      `Вложено: ${allocated}/19${free > 0 ? `  (ещё ${free})` : "  ✓"}`,
      11, freeColor, true).setOrigin(0.5).setDepth(132));

    // Stat rows
    const rowH = 30, statsY = pY + 62;
    const btnSz = 28, minusX = W - 60, plusX = W - 26;

    STATS.forEach((s, i) => {
      const y = statsY + i * rowH;
      const isPassive = passive === s.key;
      const displayVal = sv[s.key] + (isPassive ? 8 : 0);

      // Row bg
      const bg = this.add.graphics().setDepth(132);
      bg.fillStyle(0x1e1c38, .9); bg.fillRoundedRect(12, y, W-24, rowH-3, 6);
      if (isPassive) { bg.lineStyle(1, 0xffcc00, .55); bg.strokeRoundedRect(12, y, W-24, rowH-3, 6); }
      layer.push(bg);

      // Label + value
      layer.push(txt(this, 22, y+6, s.label, 10, "#9999bb").setDepth(133));
      const valStr = String(displayVal) + (isPassive ? " ★+8" : "");
      layer.push(txt(this, 120, y+6, valStr, 12, s.col, true).setDepth(133));

      // − button
      const canSub = sv[s.key] > 0;
      const mbg = this.add.graphics().setDepth(133);
      mbg.fillStyle(canSub ? 0x5a2020 : 0x1e1e2e, .9);
      mbg.fillRoundedRect(minusX - btnSz/2, y+3, btnSz, rowH-7, 6);
      layer.push(mbg);
      layer.push(txt(this, minusX, y+9, "−", 14, canSub ? "#e06464" : "#44445a", true).setOrigin(0.5).setDepth(134));
      const mz = this.add.zone(minusX, y+9, btnSz, rowH-7).setInteractive({useHandCursor:true}).setDepth(135);
      mz.on("pointerdown", () => { if (!this._avatarBusy && canSub) this._usdtDetailAction("untrain", {...item, _stat: s.key}, wp); });
      layer.push(mz);

      // + button
      const canAdd = free > 0;
      const pbg = this.add.graphics().setDepth(133);
      pbg.fillStyle(canAdd ? 0x1a5a1a : 0x1e1e2e, .9);
      pbg.fillRoundedRect(plusX - btnSz/2, y+3, btnSz, rowH-7, 6);
      layer.push(pbg);
      layer.push(txt(this, plusX, y+9, "+", 14, canAdd ? "#44dd44" : "#44445a", true).setOrigin(0.5).setDepth(134));
      const pz = this.add.zone(plusX, y+9, btnSz, rowH-7).setInteractive({useHandCursor:true}).setDepth(135);
      pz.on("pointerdown", () => { if (!this._avatarBusy && canAdd) this._usdtDetailAction("train", {...item, _stat: s.key}, wp); });
      layer.push(pz);
    });

    // Passive bonus section
    const passiveY = statsY + STATS.length * rowH + 6;
    layer.push(txt(this, W/2, passiveY, "Пассивный бонус +8 к стату:", 10, "#c8c8e8").setOrigin(0.5).setDepth(132));

    const passiveBtnW = Math.floor((W - 32) / 4);
    STATS.forEach((s, i) => {
      const bx = 12 + i * (passiveBtnW + 2);
      const by = passiveY + 13;
      const active = passive === s.key;
      const pbg2 = this.add.graphics().setDepth(132);
      pbg2.fillStyle(active ? 0x4a3a80 : 0x252340, .95);
      pbg2.fillRoundedRect(bx, by, passiveBtnW, 22, 5);
      if (active) { pbg2.lineStyle(1.5, 0xffcc00, .9); pbg2.strokeRoundedRect(bx, by, passiveBtnW, 22, 5); }
      layer.push(pbg2);
      layer.push(txt(this, bx+passiveBtnW/2, by+11, PASSIVE_LABELS[i], 9, active ? "#ffcc00" : "#8888aa", active).setOrigin(0.5).setDepth(133));
      const ppz = this.add.zone(bx+passiveBtnW/2, by+11, passiveBtnW, 22).setInteractive({useHandCursor:true}).setDepth(134);
      ppz.on("pointerdown", () => {
        if (this._avatarBusy) return;
        this._usdtDetailAction("set_passive", {...item, _passive: active ? "" : s.key}, wp);
      });
      layer.push(ppz);
    });

    // Separator
    const sepY = passiveY + 42;
    const dg = this.add.graphics().setDepth(132);
    dg.lineStyle(1, 0x3a3850, .6); dg.lineBetween(16, sepY, W-16, sepY);
    layer.push(dg);

    // Equip / Unequip button
    const btnY = sepY + 7, btnH = 32, btnW = W - 24;
    const mkBtn = (y, label, col, fn) => {
      const g = this.add.graphics().setDepth(132);
      g.fillStyle(col, .95); g.fillRoundedRect(12, y, btnW, btnH, 9);
      layer.push(g, txt(this, W/2, y+btnH/2, label, 11, "#f0f0fa", true).setOrigin(0.5).setDepth(133));
      const z = this.add.zone(W/2, y+btnH/2, btnW, btnH).setInteractive({useHandCursor:true}).setDepth(134);
      z.on("pointerdown", fn);
      layer.push(z);
    };

    if (!item.equipped) {
      mkBtn(btnY, "▶ Надеть образ", 0x1a9944, () => this._usdtDetailAction("equip", item, wp));
    } else {
      mkBtn(btnY, "✅ Надет  ·  Снять образ", 0xcc4422, () => this._usdtDetailAction("unequip", item, wp));
    }
    mkBtn(btnY + btnH + 5, "🔄 Сброс статов · 5.99 USDT", 0xd4a010,
      () => this._usdtDetailAction("reset_invoice", item, wp));
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

      } else if (action === "train") {
        const res = await post("/api/wardrobe/usdt/train", { class_id: item.class_id, stat: item._stat });
        if (res?.ok && res.inventory_item) {
          if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
          this._avatarBusy = false;
          this._openUsdtDetail({...item, _raw: res.inventory_item}, wp);
          return;
        }
        this._showToast(`❌ ${res?.message || "Ошибка"}`);

      } else if (action === "untrain") {
        const res = await post("/api/wardrobe/usdt/untrain", { class_id: item.class_id, stat: item._stat });
        if (res?.ok && res.inventory_item) {
          if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
          this._avatarBusy = false;
          this._openUsdtDetail({...item, _raw: res.inventory_item}, wp);
          return;
        }
        this._showToast(`❌ ${res?.message || "Ошибка"}`);

      } else if (action === "set_passive") {
        const res = await post("/api/wardrobe/usdt/set-passive", { class_id: item.class_id, passive_type: item._passive });
        if (res?.ok && res.inventory_item) {
          if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
          this._avatarBusy = false;
          this._openUsdtDetail({...item, _raw: res.inventory_item}, wp);
          return;
        }
        this._showToast(`❌ ${res?.message || "Ошибка"}`);

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
