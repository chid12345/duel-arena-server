/* ============================================================
   Wardrobe Overlay ext — _renderAvatarOverlay,
                          _avatarAction, _closeAvatarOverlay
   Card Gacha style. Скролл карточек — фиксированный cardH=140.
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

    const bg = this.add.graphics().setDepth(121);
    bg.fillStyle(0x0a0614, 0.99);
    bg.fillRoundedRect(8, panelY, W-16, panelH, 14);
    bg.lineStyle(1.5, 0x5020a0, 0.55);
    bg.strokeRoundedRect(8, panelY, W-16, panelH, 14);
    overlay.push(bg);
    overlay.push(txt(this, W/2, panelY+16, "⚔️ Оснащение", 14, "#ffffff", true).setOrigin(0.5).setDepth(122));

    const cg = this.add.graphics().setDepth(122);
    cg.fillStyle(0x3a2030,1); cg.fillRoundedRect(W-44,panelY+8,28,24,7);
    cg.lineStyle(1,0xff6688,.9); cg.strokeRoundedRect(W-44,panelY+8,28,24,7);
    const ct = txt(this, W-30, panelY+20, "✕", 12, "#ffd8e0", true).setOrigin(0.5).setDepth(123);
    const cz = this.add.zone(W-30, panelY+20, 28, 24).setInteractive({useHandCursor:true}).setDepth(124);
    cz.on("pointerdown", () => this._closeAvatarOverlay());
    overlay.push(cg, ct, cz);

    const mkTab = (x, label, mode) => {
      const active = this._wardrobeView === mode;
      const g = this.add.graphics().setDepth(123);
      if (active) {
        g.fillStyle(0x8040e0,.95); g.fillRoundedRect(x,panelY+10,110,22,8);
        g.lineStyle(1,0xb060ff,.8); g.strokeRoundedRect(x,panelY+10,110,22,8);
      } else {
        g.fillStyle(0x1a1428,.85); g.fillRoundedRect(x,panelY+10,110,22,8);
        g.lineStyle(1,0x4a3870,.55); g.strokeRoundedRect(x,panelY+10,110,22,8);
      }
      const t = txt(this, x+55, panelY+21, label, 9, "#ffffff", true).setOrigin(.5).setDepth(124);
      const z = this.add.zone(x+55, panelY+21, 110, 22).setInteractive({useHandCursor:true}).setDepth(125);
      z.on("pointerdown", () => { if (this._wardrobeView===mode) return; this._wardrobeView=mode; this._renderAvatarOverlay(wp); });
      overlay.push(g, t, z);
    };
    mkTab(14, "Магазин", "all");
    mkTab(128, "Мой инвентарь", "owned");

    const cards = this._wardrobeView === "owned"
      ? allCards.filter(x => x.owned || x.is_usdt_slot)
      : allCards.filter(x => !x.is_usdt_slot);
    const layer = []; this._avatarCardsLayer = layer;

    const cardH   = 128;
    const cardW   = Math.floor((W-40)/2);
    const areaTop = panelY + 42;
    const areaBot = panelY + panelH - 4;
    const viewH   = areaBot - areaTop;
    const rows    = Math.ceil(cards.length / 2);
    const totalH  = rows * (cardH + 8) - 8;
    const maxScroll = Math.max(0, totalH - viewH);

    // Контейнер + маска для скролла
    const ctr = this.add.container(0, areaTop).setDepth(122);
    const mGfx = this.add.graphics();
    mGfx.fillStyle(0xffffff,1); mGfx.fillRect(8, areaTop, W-16, viewH);
    mGfx.setVisible(false);
    ctr.setMask(mGfx.createGeometryMask());
    layer.push(mGfx);

    // Тап-зоны для кнопок (в относительных координатах контента)
    const tapAreas = [];

    cards.forEach((a, i) => {
      const col = i%2, row = Math.floor(i/2);
      const cx = 12 + col*(cardW+8), cy = row*(cardH+8);
      const meta = TYPE_META[a.class_type] || TYPE_META.free;
      const borderCol = a.equipped ? 0x3cc864 : meta.dim;
      const colorHex  = `#${meta.color.toString(16).padStart(6,"0")}`;

      const card = this.add.graphics();
      card.fillStyle(meta.bg, 0.97); card.fillRoundedRect(cx,cy,cardW,cardH,10);
      card.lineStyle(a.equipped?2:1.5, borderCol, a.equipped?1:.75); card.strokeRoundedRect(cx,cy,cardW,cardH,10);
      card.lineStyle(0,0,0); card.fillStyle(meta.dim,.55); card.fillRect(cx+10,cy,cardW-20,2);
      ctr.add(card); layer.push(card);

      // Иконка — левый верх
      const ig = this.add.graphics();
      ig.fillStyle(meta.dim,.22); ig.fillRoundedRect(cx+7,cy+7,32,32,8);
      ctr.add(ig); layer.push(ig);

      const addT = (x,y,s,sz,col,bold,stroke) => {
        const t = txt(this,x,y,s,sz,col,bold,stroke);
        ctr.add(t); layer.push(t); return t;
      };
      addT(cx+23, cy+23, a.icon, 16, "#ffffff").setOrigin(0.5);

      // Имя / тип / звёзды — правее иконки
      addT(cx+46, cy+7,  a.name,     10, "#ffffff", true);
      addT(cx+46, cy+20, meta.title,  8, colorHex,  true);
      addT(cx+46, cy+30, meta.stars,  8, colorHex);

      // Pill-строка статов — середина карточки
      const pillDefs = [
        { lbl:`С+${a.strength}`,  val:a.strength,   bg:0x882222, col:"#ff8888" },
        { lbl:`Л+${a.agility}`,   val:a.agility,    bg:0x115577, col:"#55ddff" },
        { lbl:`И+${a.intuition}`, val:a.intuition,  bg:0x551188, col:"#cc77ff" },
        { lbl:`В+${a.endurance}`, val:a.endurance,  bg:0x115533, col:"#55ff99" },
      ];
      const pillW = Math.floor((cardW-18) / 4) - 2;
      pillDefs.forEach((s, si) => {
        const px = cx+7 + si*(pillW+3), py = cy+46;
        const pg = this.add.graphics();
        pg.fillStyle(s.val>0 ? s.bg : 0x222230, s.val>0 ? .9 : .5);
        pg.fillRoundedRect(px, py, pillW, 16, 4);
        ctr.add(pg); layer.push(pg);
        addT(px+pillW/2, py+8, s.lbl, 8, s.val>0?s.col:"#555566", true).setOrigin(0.5);
      });

      // Спецбонус — под пилюлями
      if (a.special_bonus) {
        addT(cx+7, cy+68, a.special_bonus.slice(0,34), 8, "#ccccee");
      }

      // Разделитель
      const divG = this.add.graphics();
      divG.fillStyle(meta.dim,.25); divG.fillRect(cx+7, cy+cardH-30, cardW-14, 1);
      ctr.add(divG); layer.push(divG);

      // Кнопка — нижний край
      const bx=cx+7, bh=22, bw=cardW-14, by2=cy+cardH-27;

      if (a.is_usdt_slot) {
        const openW = Math.floor(bw*.55), equipW = bw-openW-4;
        const g1 = this.add.graphics();
        g1.fillStyle(0x8040e0,.95); g1.fillRoundedRect(bx,by2,openW,bh,8);
        ctr.add(g1); layer.push(g1);
        addT(bx+openW/2, by2+bh/2, "Открыть →", 8, "#ffffff", true).setOrigin(.5);
        tapAreas.push({ x:bx, y:by2, w:openW, h:bh, fn:() => this._avatarAction("open_detail",a,wp) });

        const ex = bx+openW+4;
        const g2 = this.add.graphics();
        g2.fillStyle(a.equipped?0xcc4422:0x256830,.95); g2.fillRoundedRect(ex,by2,equipW,bh,8);
        ctr.add(g2); layer.push(g2);
        addT(ex+equipW/2, by2+bh/2, a.equipped?"Снять":"Надеть", 8, "#ffffff", true).setOrigin(.5);
        tapAreas.push({ x:ex, y:by2, w:equipW, h:bh, fn:() => this._avatarAction(a.equipped?"unequip":"equip",a,wp) });
        // Тап на карточку (вне кнопок) → попап
        tapAreas.push({ x:cx, y:cy, w:cardW, h:cardH-30, fn:() => this._showWardrobeDetail(a) });
      } else {
        let label="Надеть", action="equip";
        if (a.is_buy_card)   { label="🔥 11.99 USDT"; action="buy_usdt"; }
        else if (a.equipped) { label="✅ Снять";       action="unequip"; }
        else if (!a.owned) {
          if (a.class_type==="gold")     label=`💰 ${a.price_gold}`;
          else if (a.class_type==="diamonds") label=`💎 ${a.price_diamonds}`;
          else label="Выбрать";
          action="buy";
        }
        const isUn=action==="unequip", isEq=action==="equip";
        const btnBg = isUn?0xcc4422:meta.btnBg, btnBdr=isUn?0xff6644:meta.dim;
        const btnTxt= isUn?"#ff8866":(isEq?"#3cff80":meta.btnTxt);
        const btn=this.add.graphics();
        btn.fillStyle(btnBg,.95); btn.fillRoundedRect(bx,by2,bw,bh,8);
        btn.lineStyle(1,btnBdr,.6); btn.strokeRoundedRect(bx,by2,bw,bh,8);
        ctr.add(btn); layer.push(btn);
        addT(bx+bw/2, by2+bh/2, label, 9, btnTxt, true).setOrigin(.5);
        tapAreas.push({ x:bx, y:by2, w:bw, h:bh, fn:() => this._avatarAction(action,a,wp) });
        // Тап на карточку (вне кнопки) → попап
        tapAreas.push({ x:cx, y:cy, w:cardW, h:cardH-30, fn:() => this._showWardrobeDetail(a) });
      }
    });

    // Скролл-зона поверх карточек
    let scrollY=0, sy0=0, sY0=0, active=false, vel=0, lastY=0, lastT=0;
    const clamp = v => Math.max(0, Math.min(maxScroll, v));
    const scrZ = this.add.zone(W/2, areaTop+viewH/2, W-16, viewH).setInteractive().setDepth(128);
    scrZ.on("pointerdown", p => { sy0=p.y; sY0=scrollY; active=true; vel=0; lastY=p.y; lastT=this.game.loop.now; });
    scrZ.on("pointermove", p => {
      if (!active) return;
      const now=this.game.loop.now, dt=now-lastT;
      if (dt>0) vel=(p.y-lastY)/dt*16; lastY=p.y; lastT=now;
      scrollY=clamp(sY0-(p.y-sy0)); ctr.setY(areaTop-scrollY);
    });
    scrZ.on("pointerup", p => {
      if (!active) return; active=false;
      if (Math.abs(p.y-sy0)<10) {
        const relY=p.y-areaTop+scrollY, relX=p.x;
        for (const t of tapAreas) {
          if (relY>=t.y && relY<t.y+t.h && relX>=t.x && relX<t.x+t.w) { t.fn(); return; }
        }
      }
    });
    scrZ.on("pointerout", ()=>{ active=false; });
    this._wardrobeScrollFn = () => {
      if (Math.abs(vel)<.15) { vel=0; return; }
      scrollY=clamp(scrollY+vel); vel*=.88; ctr.setY(areaTop-scrollY);
    };

    const dimZ=this.add.zone(W/2,H/2,W,H).setInteractive().setDepth(119);
    dimZ.on("pointerdown",()=>{});
    overlay.push(ctr, scrZ, dimZ);
    this._avatarOverlay=overlay;
  };

  StatsScene.prototype._avatarAction = async function(action, item, wp) {
    if (this._avatarBusy) return;
    if (action==="open_detail") { this._openUsdtDetail(item,wp); return; }
    this._avatarBusy=true;
    try {
      let res=null;
      if (action==="buy")      res=await post("/api/wardrobe/buy",    {class_id:item.class_id});
      if (action==="equip")    res=await post("/api/wardrobe/equip",  {class_id:item.class_id});
      if (action==="unequip")  res=await post("/api/wardrobe/unequip",{});
      if (action==="buy_usdt") {
        res=await post("/api/wardrobe/usdt/buy-invoice",{});
        if (res?.ok&&res.invoice_url) { tg?.openLink?.(res.invoice_url); this._showToast("💳 Счёт открыт — оплатите и вернитесь"); }
        else this._showToast(`❌ ${res?.reason||"Ошибка"}`);
        this._avatarBusy=false; return;
      }
      if (res?.ok) {
        if (res.player) { State.player=res.player; State.playerLoadedAt=Date.now(); }
        const msg=action==="buy"?"✅ Образ получен":action==="unequip"?"✅ Образ снят":"✅ Образ надет";
        this._avatarBusy=false;
        this.scene.restart({player:State.player,reopenWardrobe:true,wardrobePayload:res,toast:msg});
        return;
      } else { this._showToast(`❌ ${res?.message||res?.reason||"Ошибка"}`); }
    } catch { this._showToast("❌ Ошибка сети"); }
    this._avatarBusy=false;
  };

  StatsScene.prototype._showWardrobeDetail = function(a) {
    const stats = [
      { label:`⚔️ Сила +${a.strength}`,  bg:0x882222, color:'#ff8888' },
      { label:`🏃 Ловк +${a.agility}`,   bg:0x115577, color:'#55ddff' },
      { label:`💥 Инт +${a.intuition}`,   bg:0x551188, color:'#cc77ff' },
      { label:`🛡 Вын +${a.endurance}`,   bg:0x115533, color:'#55ff99' },
    ].filter(s => {
      const v = parseInt(s.label.match(/\+(\d+)/)?.[1] || '0');
      return v > 0;
    });
    const desc = a.special_bonus || '';
    const meta = TYPE_META[a.class_type] || TYPE_META.free;
    showItemDetailPopup(this, {
      icon: a.icon,
      name: a.name,
      desc: desc ? `${meta.title} · ${meta.stars}\n\n${desc}` : `${meta.title} · ${meta.stars}`,
      stats,
      depthBase: 250,
      actionLabel: a.owned ? (a.equipped ? '✅ Надет' : 'ℹ️ Закрыть') : null,
      actionFn: () => closeItemDetailPopup(this),
    });
  };

  StatsScene.prototype._closeAvatarOverlay = function() {
    this._wardrobeScrollFn=null;
    (this._avatarCardsLayer||[]).forEach(o=>{ try{o.destroy();}catch{} });
    this._avatarCardsLayer=null;
    (this._avatarOverlay||[]).forEach(o=>{ try{o.destroy();}catch{} });
    this._avatarOverlay=null;
    this._closeUsdtDetail?.();
  };
})();
