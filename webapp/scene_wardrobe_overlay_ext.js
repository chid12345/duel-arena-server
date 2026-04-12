/* ============================================================
   Wardrobe Overlay ext — _renderAvatarOverlay,
                          _avatarAction, _closeAvatarOverlay
   ============================================================ */

(() => {
  const TYPE_META = {
    free:     { title: "БЕСПЛ.",  color: 0x3a3a52 },
    gold:     { title: "ЗОЛОТО",  color: 0xffc83c },
    diamonds: { title: "АЛМАЗЫ", color: 0x34a6ff },
    usdt:     { title: "USDT",   color: 0x39d084 },
  };

  StatsScene.prototype._renderAvatarOverlay = function(wp) {
    this._closeAvatarOverlay();
    const allCards = this._wardrobeCardsFromPayload(wp);
    if (!this._wardrobeView) this._wardrobeView = "all";
    const { W, H } = this, overlay = [], panelY = 56, panelH = H - 112;
    overlay.push(this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.75).setDepth(120));
    const bg = makePanel(this, 8, panelY, W-16, panelH, 12, 0.98);
    if (bg?.setDepth) bg.setDepth(121);
    overlay.push(bg);
    overlay.push(txt(this, W/2, panelY+14, "🧥 Гардероб", 14, "#f0f0fa", true).setOrigin(0.5).setDepth(122));

    // Кнопка закрыть
    const cg = this.add.graphics().setDepth(122);
    cg.fillStyle(0x3a2030,1); cg.fillRoundedRect(W-44,panelY+8,28,24,7);
    cg.lineStyle(1,0xff6688,.9); cg.strokeRoundedRect(W-44,panelY+8,28,24,7);
    const ct = txt(this, W-30, panelY+20, "✕", 12, "#ffd8e0", true).setOrigin(0.5).setDepth(123);
    const cz = this.add.zone(W-30, panelY+20, 28, 24).setInteractive({useHandCursor:true}).setDepth(124);
    cz.on("pointerdown", () => this._closeAvatarOverlay());
    overlay.push(cg, ct, cz);

    // Табы
    const mkTab = (x, label, mode) => {
      const active = this._wardrobeView === mode;
      const g = this.add.graphics().setDepth(123);
      g.fillStyle(active ? C.purple : 0x2a2840, active ? .95 : .85);
      g.fillRoundedRect(x, panelY+10, 110, 20, 7);
      g.lineStyle(1, active ? 0xd9c8ff : 0x4a4870, .85);
      g.strokeRoundedRect(x, panelY+10, 110, 20, 7);
      const t = txt(this, x+55, panelY+20, label, 9, active ? "#fff" : "#c8c8e8", true).setOrigin(.5).setDepth(124);
      const z = this.add.zone(x+55, panelY+20, 110, 20).setInteractive({useHandCursor:true}).setDepth(125);
      z.on("pointerdown", () => { if (this._wardrobeView === mode) return; this._wardrobeView = mode; this._renderAvatarOverlay(wp); });
      overlay.push(g, t, z);
    };
    mkTab(14, "Магазин", "all");
    mkTab(128, "Мой инвентарь", "owned");

    const top = panelY + 40, cardW = Math.floor((W-40)/2);
    const cards = this._wardrobeView === "owned"
      ? allCards.filter(x => x.owned || x.is_usdt_slot)
      : allCards.filter(x => !x.is_usdt_slot);
    const layer = []; this._avatarCardsLayer = layer;

    // Подгоняем высоту карточек чтобы все влезли
    const maxVisH = panelH - 48;
    const rows = Math.ceil(cards.length / 2);
    const cardH = rows <= 1 ? 140 : Math.min(140, Math.floor((maxVisH - (rows-1)*8) / rows));

    cards.forEach((a, i) => {
      const col = i%2, row = Math.floor(i/2);
      const x = 12 + col*(cardW+8), y = top + row*(cardH+8);
      const meta = TYPE_META[a.class_type] || TYPE_META.free;
      const accent = a.equipped ? C.green : (a.owned ? meta.color : C.dark);
      const card = this.add.graphics().setDepth(122);
      card.fillStyle(0x1b1a30,.96); card.fillRoundedRect(x,y,cardW,cardH,9);
      card.lineStyle(1.5,accent,.8); card.strokeRoundedRect(x,y,cardW,cardH,9);
      layer.push(card);
      layer.push(txt(this, x+10, y+10, `${a.icon} ${a.name}`, 12, "#f0f0fa", true).setDepth(123));
      layer.push(txt(this, x+cardW-8, y+10, meta.title, 9, "#9999bb", true).setOrigin(1,0).setDepth(123));
      layer.push(txt(this, x+10, y+28, `С +${a.strength}  Л +${a.agility}`, 10, "#ffc83c", true).setDepth(123));
      layer.push(txt(this, x+10, y+43, `И +${a.intuition}  В +${a.endurance}`, 10, "#ffc83c", true).setDepth(123));
      layer.push(txt(this, x+10, y+60, (a.special_bonus||"Без бонуса").slice(0,42), 9, "#a8a8c8").setDepth(123));

      // Кнопки
      const bx = x+8, by = y+cardH-34, bw = cardW-16, bh = 28;

      if (a.is_usdt_slot) {
        const openW = Math.floor(bw * 0.55), equipW = bw - openW - 4;
        const g1 = this.add.graphics().setDepth(123);
        g1.fillStyle(C.purple,.95); g1.fillRoundedRect(bx, by, openW, bh, 9);
        layer.push(g1, txt(this, bx+openW/2, by+bh/2, "Открыть →", 9, "#f0f0fa", true).setOrigin(.5).setDepth(124));
        const z1 = this.add.zone(bx+openW/2, by+bh/2, openW, bh).setInteractive({useHandCursor:true}).setDepth(125);
        z1.on("pointerdown", () => this._avatarAction("open_detail", a, wp));
        layer.push(z1);

        const ex = bx + openW + 4;
        const eqCol = a.equipped ? 0xcc4422 : C.green;
        const eqLabel = a.equipped ? "Снять" : "Надеть";
        const g2 = this.add.graphics().setDepth(123);
        g2.fillStyle(eqCol,.95); g2.fillRoundedRect(ex, by, equipW, bh, 9);
        layer.push(g2, txt(this, ex+equipW/2, by+bh/2, eqLabel, 9, "#f0f0fa", true).setOrigin(.5).setDepth(124));
        const z2 = this.add.zone(ex+equipW/2, by+bh/2, equipW, bh).setInteractive({useHandCursor:true}).setDepth(125);
        z2.on("pointerdown", () => this._avatarAction(a.equipped ? "unequip" : "equip", a, wp));
        layer.push(z2);
      } else {
        let label = "Надеть", action = "equip";
        if (a.is_buy_card) { label = "Купить 11.99 USDT"; action = "buy_usdt"; }
        else if (a.equipped) { label = "✅ Снять"; action = "unequip"; }
        else if (!a.owned) {
          if (a.class_type === "gold") label = `Купить ${a.price_gold} зол.`;
          else if (a.class_type === "diamonds") label = `Купить ${a.price_diamonds} алм.`;
          else label = "Выбрать";
          action = "buy";
        }
        const bcol = action==="unequip" ? 0xcc4422 : (action==="buy"||action==="buy_usdt" ? C.gold : C.green);
        const btn = this.add.graphics().setDepth(123);
        btn.fillStyle(bcol,.95); btn.fillRoundedRect(bx,by,bw,bh,9);
        layer.push(btn, txt(this, bx+bw/2, by+bh/2, label, 10, "#f0f0fa", true).setOrigin(.5).setDepth(124));
        const z = this.add.zone(bx+bw/2, by+bh/2, bw, bh).setInteractive({useHandCursor:true}).setDepth(125);
        z.on("pointerdown", () => this._avatarAction(action, a, wp));
        layer.push(z);
      }
    });

    const dimZ = this.add.zone(W/2, H/2, W, H).setInteractive().setDepth(119);
    dimZ.on("pointerdown", () => {});
    overlay.push(dimZ);
    this._avatarOverlay = overlay;
  };

  StatsScene.prototype._avatarAction = async function(action, item, wp) {
    if (this._avatarBusy) return;
    if (action === "open_detail") { this._openUsdtDetail(item, wp); return; }
    this._avatarBusy = true;
    try {
      let res = null;
      if (action === "buy")      res = await post("/api/wardrobe/buy",    { class_id: item.class_id });
      if (action === "equip")    res = await post("/api/wardrobe/equip",  { class_id: item.class_id });
      if (action === "unequip")  res = await post("/api/wardrobe/unequip",{});
      if (action === "buy_usdt") {
        res = await post("/api/wardrobe/usdt/buy-invoice", {});
        if (res?.ok && res.invoice_url) { tg?.openLink?.(res.invoice_url); this._showToast("💳 Счёт открыт — оплатите и вернитесь"); }
        else this._showToast(`❌ ${res?.reason || "Ошибка"}`);
        this._avatarBusy = false; return;
      }
      if (res?.ok) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        const msg = action==="buy" ? "✅ Образ получен" : action==="unequip" ? "✅ Образ снят" : "✅ Образ надет";
        this._avatarBusy = false;
        this.scene.restart({ player: State.player, reopenWardrobe: true, wardrobePayload: res, toast: msg });
        return;
      } else { this._showToast(`❌ ${res?.message || res?.reason || "Ошибка"}`); }
    } catch { this._showToast("❌ Ошибка сети"); }
    this._avatarBusy = false;
  };

  StatsScene.prototype._closeAvatarOverlay = function() {
    (this._avatarCardsLayer || []).forEach(o => { try { o.destroy(); } catch {} });
    this._avatarCardsLayer = null;
    (this._avatarOverlay || []).forEach(o => { try { o.destroy(); } catch {} });
    this._avatarOverlay = null;
    this._closeUsdtDetail?.();
  };
})();
