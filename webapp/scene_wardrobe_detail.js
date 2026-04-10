/* ============================================================
   USDT-слот детальный экран — распределение статов, пассивка, сохранение.
   Открывается из scene_wardrobe_overlay.js → _openUsdtDetail()
   ============================================================ */

(() => {
  const STATS = [
    { key: "strength",  label: "💪 Сила",     col: "#dc3c46" },
    { key: "agility",   label: "🤸 Ловкость", col: "#3cc8dc" },
    { key: "intuition", label: "💥 Интуиция", col: "#b45aff" },
    { key: "stamina",   label: "🛡 Выносл.",  col: "#3cc864" },
  ];
  const PASSIVE_OPTIONS = [
    { key: "damage_pct",   label: "⚔ Урон +8%"  },
    { key: "double_hit",   label: "⚡ 2×удар 8%" },
    { key: "crit_dmg_pct", label: "💥 Крит +8%"  },
    { key: "armor_pct",    label: "🛡 Броня +4%" },
  ];

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
    const locked  = !!raw.stats_applied;
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

    // Lock badge
    if (locked) {
      layer.push(txt(this, W/2, pY+46, "🔒 Сборка сохранена — сброс 5.99 USDT", 9, "#ffaa44", true).setOrigin(0.5).setDepth(132));
    } else {
      const allocated = 19 - free;
      const freeColor = free > 0 ? "#ffc83c" : "#3cc864";
      layer.push(txt(this, W/2, pY+46,
        `Вложено: ${allocated}/19${free > 0 ? `  (ещё ${free})` : "  ✓"}`,
        11, freeColor, true).setOrigin(0.5).setDepth(132));
    }

    // Stat rows
    const rowH = 28, statsY = pY + 60;
    const plusX = W - 26, btnSz = 26;

    STATS.forEach((s, i) => {
      const y = statsY + i * rowH;
      const val = sv[s.key];

      // Row bg
      const bg = this.add.graphics().setDepth(132);
      bg.fillStyle(0x1e1c38, .9); bg.fillRoundedRect(12, y, W-24, rowH-3, 6);
      layer.push(bg);

      // Label + value
      layer.push(txt(this, 22, y+5, s.label, 10, "#9999bb").setDepth(133));
      layer.push(txt(this, 110, y+5, String(val), 12, s.col, true).setDepth(133));

      if (!locked) {
        // − button
        const minusX = W - 60;
        const canSub = val > 0;
        const mbg = this.add.graphics().setDepth(133);
        mbg.fillStyle(canSub ? 0x5a2020 : 0x1e1e2e, .9);
        mbg.fillRoundedRect(minusX - btnSz/2, y+2, btnSz, rowH-6, 6);
        layer.push(mbg);
        layer.push(txt(this, minusX, y+8, "−", 14, canSub ? "#e06464" : "#44445a", true).setOrigin(0.5).setDepth(134));
        const mz = this.add.zone(minusX, y+8, btnSz, rowH-6).setInteractive({useHandCursor:true}).setDepth(135);
        mz.on("pointerdown", () => { if (!this._avatarBusy && canSub) this._usdtDetailAction("untrain", {...item, _stat: s.key}, wp); });
        layer.push(mz);

        // + button
        const canAdd = free > 0;
        const pbg = this.add.graphics().setDepth(133);
        pbg.fillStyle(canAdd ? 0x1a5a1a : 0x1e1e2e, .9);
        pbg.fillRoundedRect(plusX - btnSz/2, y+2, btnSz, rowH-6, 6);
        layer.push(pbg);
        layer.push(txt(this, plusX, y+8, "+", 14, canAdd ? "#44dd44" : "#44445a", true).setOrigin(0.5).setDepth(134));
        const pz = this.add.zone(plusX, y+8, btnSz, rowH-6).setInteractive({useHandCursor:true}).setDepth(135);
        pz.on("pointerdown", () => { if (!this._avatarBusy && canAdd) this._usdtDetailAction("train", {...item, _stat: s.key}, wp); });
        layer.push(pz);
      }
    });

    // Passive section
    const passiveY = statsY + STATS.length * rowH + 4;
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
      btnY = mkBtn(btnY, "💾 Сохранить сборку", 0x1a6aaa,
        () => this._usdtDetailAction("apply_stats", item, wp));
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

      } else if (action === "apply_stats") {
        const res = await post("/api/wardrobe/usdt/apply-stats", { class_id: item.class_id });
        if (res?.ok && res.inventory_item) {
          if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
          this._avatarBusy = false;
          this._openUsdtDetail({...item, _raw: res.inventory_item}, wp);
          this._showToast("✅ Сборка сохранена!");
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
          if (res.invoice_id) {
            this._pendingResetInvoice = { class_id: item.class_id, invoice_id: res.invoice_id };
          }
          this._avatarBusy = false;
          this._openUsdtDetail(item, wp);
          this._showToast("💳 Счёт открыт — оплати и нажми «Я оплатил»");
          return;
        }
        this._showToast(`❌ ${res?.reason || "Ошибка"}`);

      } else if (action === "check_reset") {
        const inv = this._pendingResetInvoice;
        if (!inv?.invoice_id) { this._showToast("❌ Нет ожидающего счёта"); }
        else {
          const res = await get("/api/wardrobe/usdt/check-reset", {
            class_id: item.class_id,
            invoice_id: String(inv.invoice_id),
          });
          if (res?.ok && res.reset_applied && res.inventory_item) {
            if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
            this._pendingResetInvoice = null;
            this._avatarBusy = false;
            this._openUsdtDetail({...item, _raw: res.inventory_item}, wp);
            this._showToast("✅ Сборка сброшена! Статы обнулены.");
            return;
          }
          this._showToast(`❌ ${res?.reason || "Счёт ещё не оплачен"}`);
        }
      }
    } catch { this._showToast("❌ Ошибка сети"); }
    this._avatarBusy = false;
  };

  StatsScene.prototype._closeUsdtDetail = function() {
    (this._usdtDetailLayer || []).forEach(o => { try { o.destroy(); } catch {} });
    this._usdtDetailLayer = null;
  };
})();
