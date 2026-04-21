/* ============================================================
   Легендарный слот — детальный экран: распределение статов, пассивка, сохранение.
   Открывается из scene_wardrobe_overlay.js → _openUsdtDetail()
   Продолжение: scene_wardrobe_detail_ext.js, scene_wardrobe_detail_ext2.js
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
    cz.on("pointerdown", () => { this._closeUsdtDetail(); this._openAvatarPanel(); });
    layer.push(cz);

    // Status badge
    const eqLabel = item.equipped ? "✅ Надет" : "⬜ Снят";
    layer.push(txt(this, W/2, pY+30, eqLabel, 10, item.equipped ? "#3cc864" : "#ddddff", true).setOrigin(0.5).setDepth(132));

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
      layer.push(txt(this, 22, y+5, s.label, 10, "#ddddff").setDepth(133));
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

    this._renderUsdtDetailPassive(item, wp, layer, W, free, passive, locked, statsY, sv);
  };

})();
