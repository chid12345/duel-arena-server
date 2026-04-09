/* ============================================================
   Wardrobe Overlay для StatsScene
   Вынесен из scene_stats.js + переведен на /api/wardrobe
   ============================================================ */

(() => {
  const TYPE_META = {
    free: { title: "БЕСПЛ.", color: 0x3a3a52 },
    gold: { title: "ЗОЛОТО", color: 0xffc83c },
    diamonds: { title: "АЛМАЗЫ", color: 0x34a6ff },
    usdt: { title: "USDT", color: 0x39d084 },
  };

  function _iconForClassId(classId = "") {
    const v = String(classId).toLowerCase();
    if (v.includes("tank") || v.includes("berserker") || v.includes("dragonknight")) return "🛡️";
    if (v.includes("agile") || v.includes("assassin") || v.includes("shadow")) return "🌪️";
    if (v.includes("crit") || v.includes("mage") || v.includes("archmage")) return "⚡";
    if (v.includes("universal") || v.includes("paladin")) return "🎯";
    if (v.includes("usdt")) return "💠";
    return "🖼️";
  }

  function _toCard(cls, classType, equippedClassId) {
    const classId = cls.class_id;
    const owned = !!cls.owned;
    const equipped = classId === equippedClassId || !!cls.equipped;
    return {
      class_id: classId,
      class_type: classType,
      name: cls.name || classId,
      icon: _iconForClassId(classId),
      strength: Number(cls.bonus_strength || 0),
      agility: Number(cls.bonus_agility || 0),
      intuition: Number(cls.bonus_intuition || 0),
      endurance: Number(cls.bonus_endurance || 0),
      special_bonus: cls.special_bonus || "",
      owned,
      equipped,
      price_gold: Number(cls.price_gold || 0),
      price_diamonds: Number(cls.price_diamonds || 0),
    };
  }

  function _buyLabelFor(card) {
    if (card.class_type === "free") return "Выбрать";
    if (card.class_type === "gold") return `Купить ${card.price_gold} золота`;
    if (card.class_type === "diamonds") return `Купить ${card.price_diamonds} алмазов`;
    if (card.class_type === "usdt") return "Купить за USDT";
    return "Недоступно";
  }

  StatsScene.prototype._wardrobeCardsFromPayload = function(payload) {
    const available = payload?.available_classes || {};
    const equippedClassId = payload?.equipped_class?.class_id || "";

    const cards = [];
    for (const cls of (available.free || [])) cards.push(_toCard(cls, "free", equippedClassId));
    for (const cls of (available.gold || [])) cards.push(_toCard(cls, "gold", equippedClassId));
    for (const cls of (available.diamonds || [])) cards.push(_toCard(cls, "diamonds", equippedClassId));

    const inventory = Array.isArray(payload?.inventory) ? payload.inventory : [];
    for (const item of inventory) {
      if (item.class_type !== "usdt") continue;
      cards.push({
        class_id: item.class_id,
        class_type: "usdt",
        name: item.custom_name || "USDT слот",
        icon: "💠",
        strength: Number(item.strength_saved || 0),
        agility: Number(item.agility_saved || 0),
        intuition: Number(item.intuition_saved || 0),
        endurance: Number(item.endurance_saved || 0),
        special_bonus: "Слот сборки: +19 свободных статов, скидка reset 50%",
        owned: true,
        equipped: !!item.equipped,
        price_gold: 0,
        price_diamonds: 0,
      });
    }
    return cards;
  };

  StatsScene.prototype._openAvatarPanel = async function() {
    if (this._avatarBusy) return;
    this._avatarBusy = true;
    let data;
    try {
      data = await get("/api/wardrobe");
    } catch (_e) {
      this._avatarBusy = false;
      this._showToast("❌ Гардероб: нет соединения");
      return;
    }
    this._avatarBusy = false;
    if (!data?.ok) {
      const why = data?.reason
        ? String(data.reason)
        : (data?._httpStatus ? `HTTP ${data._httpStatus}` : "Не удалось загрузить гардероб");
      this._showToast(`❌ ${why}`);
      return;
    }
    this._renderAvatarOverlay(data);
  };

  StatsScene.prototype._renderAvatarOverlay = function(wardrobePayload) {
    this._closeAvatarOverlay();
    const allCards = this._wardrobeCardsFromPayload(wardrobePayload);
    if (!this._wardrobeView) this._wardrobeView = "all";
    const W = this.W, H = this.H;
    const overlay = [];

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(120);
    overlay.push(dim);
    const panelY = 56;
    const panelH = H - 112;
    makePanel(this, 8, panelY, W - 16, panelH, 12, 0.98).setDepth?.(121);
    const title = txt(this, W / 2, panelY + 14, "🧥 Гардероб", 14, "#f0f0fa", true).setOrigin(0.5).setDepth(122);
    overlay.push(title);

    const closeBg = this.add.graphics().setDepth(122);
    closeBg.fillStyle(0x3a2030, 1);
    closeBg.fillRoundedRect(W - 44, panelY + 8, 28, 24, 7);
    closeBg.lineStyle(1, 0xff6688, 0.9);
    closeBg.strokeRoundedRect(W - 44, panelY + 8, 28, 24, 7);
    const closeTxt = txt(this, W - 30, panelY + 20, "✕", 12, "#ffd8e0", true).setOrigin(0.5).setDepth(123);
    const closeZone = this.add.zone(W - 30, panelY + 20, 28, 24).setInteractive({ useHandCursor: true }).setDepth(124);
    closeZone.on("pointerdown", () => this._closeAvatarOverlay());
    overlay.push(closeBg, closeTxt, closeZone);

    const drawModeBtn = (x, y, label, mode) => {
      const active = this._wardrobeView === mode;
      const bg = this.add.graphics().setDepth(123);
      bg.fillStyle(active ? C.purple : 0x2a2840, active ? 0.95 : 0.85);
      bg.fillRoundedRect(x, y, 110, 20, 7);
      bg.lineStyle(1, active ? 0xd9c8ff : 0x4a4870, 0.85);
      bg.strokeRoundedRect(x, y, 110, 20, 7);
      const t = txt(this, x + 55, y + 10, label, 9, active ? "#ffffff" : "#c8c8e8", true).setOrigin(0.5).setDepth(124);
      const z = this.add.zone(x + 55, y + 10, 110, 20).setInteractive({ useHandCursor: true }).setDepth(125);
      z.on("pointerdown", () => {
        if (this._wardrobeView === mode) return;
        this._wardrobeView = mode;
        this._avatarPage = 0;
        this._renderAvatarOverlay(wardrobePayload);
      });
      overlay.push(bg, t, z);
    };
    drawModeBtn(14, panelY + 10, "Магазин", "all");
    drawModeBtn(128, panelY + 10, "Мой инвентарь", "owned");

    const top = panelY + 40;
    const cardW = Math.floor((W - 32 - 8) / 2);
    const cardH = 96;
    const gapX = 8;
    const gapY = 8;
    const navY = panelY + panelH - 26;
    const rowsPerPage = 3;
    const perPage = rowsPerPage * 2;
    const cards = this._wardrobeView === "owned"
      ? allCards.filter((x) => !!x.owned)
      : allCards;
    const pageCount = Math.max(1, Math.ceil((cards.length || 0) / perPage));
    this._avatarPage = Math.min(this._avatarPage || 0, pageCount - 1);
    const cardsLayer = [];

    const clearCards = () => {
      cardsLayer.forEach(o => { try { o.destroy(); } catch (_e) {} });
      cardsLayer.length = 0;
    };

    const pageLabel = txt(this, W / 2, navY + 2, "", 10, "#c8c8e8", true).setOrigin(0.5).setDepth(124);
    overlay.push(pageLabel);

    const mkNavBtn = (x, label, onClick) => {
      const bg = this.add.graphics().setDepth(123);
      bg.fillStyle(0x2a2840, 0.95);
      bg.fillRoundedRect(x - 36, navY - 10, 72, 22, 7);
      bg.lineStyle(1, C.purple, 0.8);
      bg.strokeRoundedRect(x - 36, navY - 10, 72, 22, 7);
      const t = txt(this, x, navY + 1, label, 10, "#f0f0fa", true).setOrigin(0.5).setDepth(124);
      const z = this.add.zone(x, navY + 1, 72, 22).setInteractive({ useHandCursor: true }).setDepth(125);
      z.on("pointerdown", onClick);
      overlay.push(bg, t, z);
    };

    const renderPage = () => {
      clearCards();
      const page = this._avatarPage || 0;
      pageLabel.setText(`Страница ${page + 1}/${pageCount}`);
      const start = page * perPage;
      const pageItems = cards.slice(start, start + perPage);
      pageItems.forEach((a, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 12 + col * (cardW + gapX);
        const y = top + row * (cardH + gapY);
        const card = this.add.graphics().setDepth(122);
        const tMeta = TYPE_META[a.class_type] || TYPE_META.free;
        const accent = a.equipped ? C.green : (a.owned ? tMeta.color : C.dark);
        card.fillStyle(0x1b1a30, 0.96);
        card.fillRoundedRect(x, y, cardW, cardH, 9);
        card.lineStyle(1.5, accent, 0.8);
        card.strokeRoundedRect(x, y, cardW, cardH, 9);
        cardsLayer.push(card);

        cardsLayer.push(txt(this, x + 10, y + 8, `${a.icon} ${a.name}`, 10, "#f0f0fa", true).setDepth(123));
        cardsLayer.push(txt(this, x + cardW - 8, y + 8, tMeta.title, 8, "#9999bb", true).setOrigin(1, 0).setDepth(123));
        cardsLayer.push(txt(this, x + 10, y + 24, `С +${a.strength}  Л +${a.agility}  И +${a.intuition}  В +${a.endurance}`, 8, "#ffc83c").setDepth(123));
        cardsLayer.push(txt(this, x + 10, y + 37, (a.special_bonus || "Без бонуса").slice(0, 36), 8, "#a8a8c8").setDepth(123));

        let btnLabel = "Надеть";
        let action = "equip";
        if (a.equipped) {
          btnLabel = "Надет";
          action = "none";
        } else if (!a.owned) {
          if (a.class_type === "free" || a.class_type === "gold" || a.class_type === "diamonds") {
            btnLabel = _buyLabelFor(a);
            action = "buy";
          } else {
            btnLabel = "Недоступно";
            action = "none";
          }
        }

        const bx = x + 8, by = y + cardH - 26, bw = cardW - 16, bh = 20;
        const btn = this.add.graphics().setDepth(123);
        const bcol = action === "none" ? 0x3a3a52 : (action === "buy" ? C.gold : C.green);
        btn.fillStyle(bcol, 0.95);
        btn.fillRoundedRect(bx, by, bw, bh, 7);
        const bt = txt(this, bx + bw / 2, by + bh / 2, btnLabel, 9, "#101020", true).setOrigin(0.5).setDepth(124);
        cardsLayer.push(btn, bt);
        if (action !== "none") {
          const z = this.add.zone(bx + bw / 2, by + bh / 2, bw, bh).setInteractive({ useHandCursor: true }).setDepth(125);
          z.on("pointerdown", () => this._avatarAction(action, a));
          cardsLayer.push(z);
        }
      });
    };

    mkNavBtn(W / 2 - 86, "◀ Назад", () => {
      if ((this._avatarPage || 0) <= 0) return;
      this._avatarPage -= 1;
      renderPage();
    });
    mkNavBtn(W / 2 + 86, "Вперед ▶", () => {
      if ((this._avatarPage || 0) >= pageCount - 1) return;
      this._avatarPage += 1;
      renderPage();
    });
    renderPage();

    const closeDim = this.add.zone(W / 2, H / 2, W, H).setInteractive().setDepth(119);
    closeDim.on("pointerdown", () => {});
    overlay.push(closeDim);
    this._avatarOverlay = overlay;
  };

  StatsScene.prototype._avatarAction = async function(action, item) {
    if (this._avatarBusy) return;
    this._avatarBusy = true;
    try {
      let res = null;
      if (action === "buy") res = await post("/api/wardrobe/buy", { class_id: item.class_id });
      if (action === "equip") res = await post("/api/wardrobe/equip", { class_id: item.class_id });
      if (res?.ok) {
        if (res.player) {
          State.player = res.player;
          State.playerLoadedAt = Date.now();
          this._refreshCombat(State.player);
        }
        this._showToast(action === "buy" ? "✅ Образ получен" : "✅ Образ надет");
        this._renderAvatarOverlay(res);
      } else {
        this._showToast(`❌ ${res?.message || res?.reason || "Ошибка"}`);
      }
    } catch (_e) {
      this._showToast("❌ Ошибка сети");
    } finally {
      this._avatarBusy = false;
    }
  };

  StatsScene.prototype._closeAvatarOverlay = function() {
    if (!this._avatarOverlay) return;
    this._avatarOverlay.forEach(o => {
      try { o.destroy(); } catch (_e) {}
    });
    this._avatarOverlay = null;
  };
})();
