/* ============================================================
   Wardrobe Overlay ext — _renderAvatarOverlay,
                          _avatarAction, _closeAvatarOverlay
   Card Gacha style: тёмные фоны по редкости, белый текст,
   звёзды 1-4, USDT — оранжевый.
   ============================================================ */

(() => {
  const TYPE_META = {
    free:     { title:"БЕСПЛ.", color:0xaaaacc, dim:0x444466, bg:0x1e1d2e, stars:"★☆☆☆", btnBg:0x2a2a42, btnTxt:"#ffffff" },
    gold:     { title:"ЗОЛОТО", color:0xffd84a, dim:0xc8a030, bg:0x2e2200, stars:"★★☆☆", btnBg:0x3e2e00, btnTxt:"#ffd84a" },
    diamonds: { title:"АЛМАЗЫ", color:0xc080ff, dim:0xa050e0, bg:0x190a38, stars:"★★★☆", btnBg:0x2e1050, btnTxt:"#c080ff" },
    usdt:     { title:"USDT",   color:0xff7020, dim:0xcc5010, bg:0x2e1000, stars:"★★★★", btnBg:0x3e1800, btnTxt:"#ff8040" },
  };

  StatsScene.prototype._renderAvatarOverlay = function(wp) {
    this._closeAvatarOverlay();
    const allCards = this._wardrobeCardsFromPayload(wp);
    if (!this._wardrobeView) this._wardrobeView = "all";
    const { W, H } = this, overlay = [], panelY = 56, panelH = H - 112;

    overlay.push(this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.82).setDepth(120));

    // Панель — тёмно-фиолетовая (Card Gacha)
    const bg = this.add.graphics().setDepth(121);
    bg.fillStyle(0x0a0614, 0.99);
    bg.fillRoundedRect(8, panelY, W-16, panelH, 14);
    bg.lineStyle(1.5, 0x5020a0, 0.55);
    bg.strokeRoundedRect(8, panelY, W-16, panelH, 14);
    overlay.push(bg);

    overlay.push(txt(this, W/2, panelY+16, "⚔️ Оснащение", 14, "#ffffff", true).setOrigin(0.5).setDepth(122));

    // Закрыть
    const cg = this.add.graphics().setDepth(122);
    cg.fillStyle(0x3a2030, 1); cg.fillRoundedRect(W-44, panelY+8, 28, 24, 7);
    cg.lineStyle(1, 0xff6688, .9); cg.strokeRoundedRect(W-44, panelY+8, 28, 24, 7);
    const ct = txt(this, W-30, panelY+20, "✕", 12, "#ffd8e0", true).setOrigin(0.5).setDepth(123);
    const cz = this.add.zone(W-30, panelY+20, 28, 24).setInteractive({useHandCursor:true}).setDepth(124);
    cz.on("pointerdown", () => this._closeAvatarOverlay());
    overlay.push(cg, ct, cz);

    // Табы — pill
    const mkTab = (x, label, mode) => {
      const active = this._wardrobeView === mode;
      const g = this.add.graphics().setDepth(123);
      if (active) {
        g.fillStyle(0x8040e0, 0.95); g.fillRoundedRect(x, panelY+10, 110, 22, 8);
        g.lineStyle(1, 0xb060ff, 0.8); g.strokeRoundedRect(x, panelY+10, 110, 22, 8);
      } else {
        g.fillStyle(0x1a1428, 0.85); g.fillRoundedRect(x, panelY+10, 110, 22, 8);
        g.lineStyle(1, 0x4a3870, 0.55); g.strokeRoundedRect(x, panelY+10, 110, 22, 8);
      }
      const t = txt(this, x+55, panelY+21, label, 9, "#ffffff", true).setOrigin(.5).setDepth(124);
      const z = this.add.zone(x+55, panelY+21, 110, 22).setInteractive({useHandCursor:true}).setDepth(125);
      z.on("pointerdown", () => { if (this._wardrobeView===mode) return; this._wardrobeView=mode; this._renderAvatarOverlay(wp); });
      overlay.push(g, t, z);
    };
    mkTab(14, "Магазин", "all");
    mkTab(128, "Мой инвентарь", "owned");

    const top = panelY + 42, cardW = Math.floor((W-40)/2);
    const cards = this._wardrobeView === "owned"
      ? allCards.filter(x => x.owned || x.is_usdt_slot)
      : allCards.filter(x => !x.is_usdt_slot);
    const layer = []; this._avatarCardsLayer = layer;

    const maxVisH = panelH - 50;
    const rows = Math.ceil(cards.length / 2);
    const cardH = rows <= 1 ? 140 : Math.min(140, Math.floor((maxVisH - (rows-1)*8) / rows));

    cards.forEach((a, i) => {
      const col = i%2, row = Math.floor(i/2);
      const x = 12 + col*(cardW+8), y = top + row*(cardH+8);
      const meta = TYPE_META[a.class_type] || TYPE_META.free;
      const borderCol = a.equipped ? 0x3cc864 : meta.dim;
      const colorHex  = `#${meta.color.toString(16).padStart(6,"0")}`;

      // Фон карточки
      const card = this.add.graphics().setDepth(122);
      card.fillStyle(meta.bg, 0.97);
      card.fillRoundedRect(x, y, cardW, cardH, 10);
      card.lineStyle(a.equipped ? 2 : 1.5, borderCol, a.equipped ? 1 : 0.75);
      card.strokeRoundedRect(x, y, cardW, cardH, 10);
      // Верхняя полоска
      card.lineStyle(0, 0, 0);
      card.fillStyle(meta.dim, 0.55);
      card.fillRect(x+10, y, cardW-44, 2);
      // Угловой треугольник
      card.fillStyle(meta.dim, 0.32);
      card.fillTriangle(x+cardW-26, y, x+cardW, y, x+cardW, y+26);
      layer.push(card);

      // Иконка
      const ig = this.add.graphics().setDepth(123);
      ig.fillStyle(meta.dim, 0.2);
      ig.fillRoundedRect(x+8, y+8, 36, 36, 8);
      layer.push(ig);
      layer.push(txt(this, x+26, y+26, a.icon, 18, "#ffffff").setOrigin(0.5).setDepth(123));

      // Название — белый
      layer.push(txt(this, x+52, y+10, a.name, 11, "#ffffff", true).setDepth(123));
      // Тип редкости
      layer.push(txt(this, x+52, y+25, meta.title, 9, colorHex, true).setDepth(123));
      // Звёзды
      layer.push(txt(this, x+52, y+37, meta.stars, 9, colorHex).setDepth(123));

      // Статы — белый
      layer.push(txt(this, x+8, y+58, `С +${a.strength}  Л +${a.agility}`, 9, "#ffffff").setDepth(123));
      layer.push(txt(this, x+8, y+71, `И +${a.intuition}  В +${a.endurance}`, 9, "#ffffff").setDepth(123));
      if (a.special_bonus) {
        layer.push(txt(this, x+8, y+84, a.special_bonus.slice(0,38), 8, "#ddddff").setDepth(123));
      }

      // Кнопки
      const bx = x+8, by2 = y+cardH-32, bw = cardW-16, bh = 26;

      if (a.is_usdt_slot) {
        const openW = Math.floor(bw*0.55), equipW = bw-openW-4;
        const g1 = this.add.graphics().setDepth(123);
        g1.fillStyle(0x8040e0, 0.95); g1.fillRoundedRect(bx, by2, openW, bh, 8);
        layer.push(g1, txt(this, bx+openW/2, by2+bh/2, "Открыть →", 9, "#ffffff", true).setOrigin(.5).setDepth(124));
        const z1 = this.add.zone(bx+openW/2, by2+bh/2, openW, bh).setInteractive({useHandCursor:true}).setDepth(125);
        z1.on("pointerdown", () => this._avatarAction("open_detail", a, wp));
        layer.push(z1);
        const ex = bx+openW+4;
        const eqCol = a.equipped ? 0xcc4422 : 0x256830;
        const g2 = this.add.graphics().setDepth(123);
        g2.fillStyle(eqCol, 0.95); g2.fillRoundedRect(ex, by2, equipW, bh, 8);
        layer.push(g2, txt(this, ex+equipW/2, by2+bh/2, a.equipped?"Снять":"Надеть", 9, "#ffffff", true).setOrigin(.5).setDepth(124));
        const z2 = this.add.zone(ex+equipW/2, by2+bh/2, equipW, bh).setInteractive({useHandCursor:true}).setDepth(125);
        z2.on("pointerdown", () => this._avatarAction(a.equipped?"unequip":"equip", a, wp));
        layer.push(z2);
      } else {
        let label = "Надеть", action = "equip";
        if (a.is_buy_card) { label = "🔥 11.99 USDT"; action = "buy_usdt"; }
        else if (a.equipped) { label = "✅ Снять"; action = "unequip"; }
        else if (!a.owned) {
          if (a.class_type === "gold")     label = `💰 ${a.price_gold}`;
          else if (a.class_type === "diamonds") label = `💎 ${a.price_diamonds}`;
          else label = "Выбрать";
          action = "buy";
        }
        const isUnequip = action === "unequip";
        const isEquip   = action === "equip";
        const btnBg  = isUnequip ? 0xcc4422 : meta.btnBg;
        const btnBdr = isUnequip ? 0xff6644 : meta.dim;
        const btnTxt = isUnequip ? "#ff8866" : (isEquip ? "#3cff80" : meta.btnTxt);
        const btn = this.add.graphics().setDepth(123);
        btn.fillStyle(btnBg, 0.95); btn.fillRoundedRect(bx, by2, bw, bh, 8);
        btn.lineStyle(1, btnBdr, 0.6); btn.strokeRoundedRect(bx, by2, bw, bh, 8);
        layer.push(btn, txt(this, bx+bw/2, by2+bh/2, label, 10, btnTxt, true).setOrigin(.5).setDepth(124));
        const z = this.add.zone(bx+bw/2, by2+bh/2, bw, bh).setInteractive({useHandCursor:true}).setDepth(125);
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
