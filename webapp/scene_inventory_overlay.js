/* ============================================================
   Inventory Overlay — вкладка "Моё" для StatsScene
   Показывает купленные в магазине предметы + активные бафы.
   ============================================================ */

(() => {
  // Мета по item_id: иконка, название, описание
  const ITEM_META = {
    scroll_str_3:   { icon:'⚔️', name:'Сила +3',        desc:'strength +3, 1 бой', tab:'scrolls' },
    scroll_end_3:   { icon:'🌀', name:'Ловкость +3',     desc:'уворот +3, 1 бой', tab:'scrolls' },
    scroll_crit_3:  { icon:'🎯', name:'Критика +3',      desc:'crit +3, 1 бой', tab:'scrolls' },
    scroll_armor_6: { icon:'🔰', name:'Броня +6%',       desc:'armor_pct +6%, 1 бой', tab:'scrolls' },
    scroll_hp_100:  { icon:'❤️', name:'HP +100',         desc:'hp_bonus +100, 1 бой', tab:'scrolls' },
    scroll_warrior: { icon:'⚔️', name:'Воин',           desc:'str+2, end+2, 1 бой', tab:'scrolls' },
    scroll_shadow:  { icon:'🌑', name:'Тень',            desc:'end+3, dodge+3%, 1 бой', tab:'scrolls' },
    scroll_fury:    { icon:'🔥', name:'Ярость',          desc:'str+4, crit+2, 1 бой', tab:'scrolls' },
    scroll_str_6:   { icon:'⚔️', name:'Сила +6',        desc:'strength +6, 3 боя', tab:'scrolls' },
    scroll_end_6:   { icon:'🌀', name:'Ловкость +6',     desc:'уворот +6, 3 боя', tab:'scrolls' },
    scroll_crit_6:  { icon:'🎯', name:'Критика +6',      desc:'crit +6, 3 боя', tab:'scrolls' },
    scroll_dodge_5: { icon:'💨', name:'Уворот +5%',      desc:'dodge_pct +5%, 3 боя', tab:'scrolls' },
    scroll_armor_10:{ icon:'🔰', name:'Броня +10%',      desc:'armor_pct +10%, 3 боя', tab:'scrolls' },
    scroll_hp_200:  { icon:'❤️', name:'HP +200',         desc:'hp_bonus +200, 3 боя', tab:'scrolls' },
    scroll_double_10:{icon:'⚡', name:'Двойной удар +10%',desc:'double_pct +10%, 3 боя', tab:'scrolls' },
    scroll_all_4:   { icon:'✨', name:'Все статы +4',    desc:'str/end/crit +4, 1 бой', tab:'scrolls' },
    scroll_bastion: { icon:'🏰', name:'Бастион',         desc:'end+5, armor+8%, 3 боя', tab:'scrolls' },
    scroll_predator:{ icon:'🐆', name:'Хищник',          desc:'crit+5, double+8%, 3 боя', tab:'scrolls' },
    scroll_berserker:{icon:'😤', name:'Берсерк',         desc:'str+8, armor-5%, 3 боя', tab:'scrolls' },
    scroll_accuracy:{ icon:'👁️', name:'Точность +15',    desc:'accuracy +15, 3 боя', tab:'scrolls' },
    scroll_str_12:  { icon:'⚔️', name:'Сила +12',       desc:'strength +12, 5 боёв', tab:'special' },
    scroll_end_12:  { icon:'🌀', name:'Ловкость +12',    desc:'уворот +12, 5 боёв', tab:'special' },
    scroll_stam_12: { icon:'🛡️', name:'Выносливость +12',desc:'броня+HP +12, 5 боёв', tab:'special' },
    scroll_crit_12: { icon:'🎯', name:'Критика +12',     desc:'crit +12, 5 боёв', tab:'special' },
    scroll_hp_500:  { icon:'❤️', name:'HP +500',         desc:'hp_bonus +500, 7 боёв', tab:'special' },
    scroll_all_12:  { icon:'✨', name:'Все статы +12',   desc:'str/end/crit +12, 5 боёв', tab:'special' },
    scroll_titan:   { icon:'👹', name:'Титан',           desc:'все статы +15, armor+10%, 3 боя', tab:'special' },
    box_common:     { icon:'📦', name:'Обычный ящик',     desc:'Случайный предмет (открыть)', tab:'special' },
    box_rare:       { icon:'🟦', name:'Редкий ящик',      desc:'Ценный предмет · 5% USDT', tab:'special' },
    box_epic:       { icon:'🟣', name:'Эпик ящик',        desc:'гарантированный USDT-свиток', tab:'special' },
    xp_boost_5:    { icon:'⚡', name:'XP Буст ×1.5',    desc:'×1.5 XP, 5 зарядов', tab:'elixirs' },
    xp_boost_20:   { icon:'⚡', name:'XP Буст ×1.5',    desc:'×1.5 XP, 20 зарядов', tab:'elixirs' },
    xp_boost_x2:   { icon:'⚡', name:'XP Буст ×2.0',    desc:'×2.0 XP, 10 зарядов', tab:'elixirs' },
    gold_hunt:     { icon:'💰', name:'Охота за золотом', desc:'+20% золото 24 ч', tab:'elixirs' },
  };

  const TABS = [
    { key: 'scrolls', label: '📜 Свитки' },
    { key: 'elixirs', label: '⚗️ Элексиры' },
    { key: 'special', label: '🏆 Особые' },
  ];

  StatsScene.prototype._openInventoryPanel = async function() {
    if (this._invBusy) return;
    this._invBusy = true;
    let data;
    try { data = await get('/api/shop/inventory'); }
    catch { this._invBusy = false; this._showToast('❌ Нет соединения'); return; }
    this._invBusy = false;
    if (!data?.ok) { this._showToast(`❌ ${data?.reason || data?.detail || 'Ошибка'}${data?._httpStatus ? ' (HTTP '+data._httpStatus+')' : ''}`); return; }
    this._invData = data;
    if (!this._invTab) this._invTab = 'scrolls';
    this._renderInvOverlay();
  };

  const BUFF_LABEL = {
    strength: '⚔️ Сила', endurance: '🛡 Выносл.', crit: '💥 Крит',
    armor_pct: '🔰 Броня', dodge_pct: '💨 Уворот', hp_bonus: '❤️ HP',
    double_pct: '⚡ Двойной', accuracy: '👁 Точность',
    lifesteal_pct: '🩸 Вампир', gold_pct: '💰 Золото',
  };

  StatsScene.prototype._renderInvOverlay = function() {
    this._closeInvOverlay();
    const data = this._invData || {};
    const inventory = data.inventory || [];
    const activeBuffs = data.active_buffs || [];
    const { W, H } = this, ov = [], panelY = 56, panelH = H - 112;
    ov.push(this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.75).setDepth(130));
    const bg = makePanel(this, 8, panelY, W-16, panelH, 12, 0.98); if (bg?.setDepth) bg.setDepth(131);
    ov.push(bg);
    ov.push(txt(this, W/2, panelY+14, '👜 Моё', 14, '#d0ffd8', true).setOrigin(0.5).setDepth(132));

    // Кнопка закрыть
    const cg = this.add.graphics().setDepth(132);
    cg.fillStyle(0x3a2030,1); cg.fillRoundedRect(W-44,panelY+8,28,24,7);
    cg.lineStyle(1,0xff6688,.9); cg.strokeRoundedRect(W-44,panelY+8,28,24,7);
    ov.push(cg, txt(this, W-30, panelY+20, '✕', 12, '#ffd8e0', true).setOrigin(0.5).setDepth(133));
    const cz = this.add.zone(W-30, panelY+20, 28, 24).setInteractive({useHandCursor:true}).setDepth(134);
    cz.on('pointerdown', () => this._closeInvOverlay()); ov.push(cz);

    // Подвкладки
    const tabW = Math.floor((W - 28) / TABS.length);
    TABS.forEach((tab, i) => {
      const active = this._invTab === tab.key;
      const tx = 12 + i * (tabW + 2);
      const g = this.add.graphics().setDepth(132);
      g.fillStyle(active ? 0x1e4a2a : 0x2a2840, active ? .95 : .85);
      g.fillRoundedRect(tx, panelY+34, tabW, 20, 6);
      g.lineStyle(1, active ? 0x55cc66 : 0x4a4870, .85);
      g.strokeRoundedRect(tx, panelY+34, tabW, 20, 6);
      ov.push(g, txt(this, tx+tabW/2, panelY+44, tab.label, 9, active ? '#d0ffd8' : '#c8c8e8', true).setOrigin(.5).setDepth(133));
      const z = this.add.zone(tx+tabW/2, panelY+44, tabW, 20).setInteractive({useHandCursor:true}).setDepth(134);
      z.on('pointerdown', () => { this._invTab = tab.key; this._renderInvOverlay(); }); ov.push(z);
    });

    // ── Блок активных бафов (под вкладками) ─────────────────────────────
    const buffCardY = panelY + 58;
    let buffCardH = 0;
    if (activeBuffs.length > 0) {
      const chargeBased = activeBuffs.filter(b => b.charges != null);
      const timeBased   = activeBuffs.filter(b => b.expires_at != null);
      const lines = [];
      if (chargeBased.length > 0) {
        const parts = chargeBased.map(b => `${BUFF_LABEL[b.buff_type] || b.buff_type}+${b.value}`).join(' ');
        const ch = chargeBased[0].charges;
        lines.push({ text: `${parts}  · ещё ${ch} ${ch === 1 ? 'бой' : 'боёв'}`, color: '#aaffee' });
        lines.push({ text: `Натиск / Башня Титанов = 1 заряд за заход`, color: '#88aadd' });
      }
      timeBased.forEach(b => {
        const msLeft = Math.max(0, new Date(b.expires_at + 'Z') - Date.now());
        const hLeft  = Math.floor(msLeft / 3600000);
        const mLeft  = Math.floor((msLeft % 3600000) / 60000);
        const timeStr = hLeft > 0 ? `${hLeft}ч ${mLeft}м` : `${mLeft}м`;
        const label = BUFF_LABEL[b.buff_type] || b.buff_type;
        lines.push({ text: `${label}+${b.value}%  · ещё ${timeStr}`, color: '#ffc83c' });
      });
      buffCardH = 20 + lines.length * 18 + 4;
      const bcg = this.add.graphics().setDepth(132);
      bcg.fillStyle(0x0e2a1a, 0.97);
      bcg.fillRoundedRect(12, buffCardY, W-24, buffCardH, 8);
      bcg.lineStyle(1.5, 0x44cc77, 0.8);
      bcg.strokeRoundedRect(12, buffCardY, W-24, buffCardH, 8);
      ov.push(bcg);
      ov.push(txt(this, 20, buffCardY + 9, '✨ Активный баф', 9, '#66cc88', true).setDepth(133));
      lines.forEach((line, i) => {
        ov.push(txt(this, 20, buffCardY + 20 + i * 18, line.text, 10, line.color, true).setDepth(133));
      });
    }

    // Список предметов текущей вкладки (предметы без ITEM_META пропускаем — они применяются сразу при покупке)
    const items = inventory.filter(it => ITEM_META[it.item_id] && ITEM_META[it.item_id].tab === this._invTab);
    const listY = buffCardY + (buffCardH > 0 ? buffCardH + 4 : 2);
    const listH = panelY + panelH - listY - 10;
    const cardH = 56, cardW = W - 32;

    if (items.length === 0) {
      ov.push(txt(this, W/2, listY + listH/2, 'Пусто. Загляни в Магазин!', 11, '#777799', true).setOrigin(.5).setDepth(133));
    } else {
      const maxVisible = Math.floor(listH / (cardH + 6));
      items.slice(0, maxVisible).forEach((it, i) => {
        const meta = ITEM_META[it.item_id] || { icon:'📦', name: it.item_id, desc: '', tab: 'scrolls' };
        const y = listY + i * (cardH + 6);
        const crd = this.add.graphics().setDepth(132);
        crd.fillStyle(0x1b1a30,.96); crd.fillRoundedRect(16, y, cardW, cardH, 8);
        crd.lineStyle(1, 0x3a3a60,.8); crd.strokeRoundedRect(16, y, cardW, cardH, 8);
        ov.push(crd);
        ov.push(txt(this, 28, y+10, `${meta.icon} ${meta.name}`, 12, '#f0f0fa', true).setDepth(133));
        ov.push(txt(this, 28, y+28, meta.desc, 9, '#9999bb').setDepth(133));
        ov.push(txt(this, 28, y+42, `Кол-во: ${it.quantity}`, 9, '#ffc83c').setDepth(133));
        const isBox = it.item_id.startsWith('box_');
        const bw = 90, bx = 16 + cardW - bw - 6, by = y + (cardH - 24) / 2;
        const bg2 = this.add.graphics().setDepth(133);
        const btnColor = isBox ? 0x7a3800 : 0x2a6040;
        const btnBorder = isBox ? 0xffaa33 : 0x55cc66;
        const btnLabel = isBox ? '🎲 Открыть' : 'Применить';
        const btnTxtColor = isBox ? '#ffe0aa' : '#d0ffd8';
        bg2.fillStyle(btnColor,.95); bg2.fillRoundedRect(bx, by, bw, 24, 7);
        bg2.lineStyle(1, btnBorder,.8); bg2.strokeRoundedRect(bx, by, bw, 24, 7);
        ov.push(bg2, txt(this, bx+bw/2, by+12, btnLabel, 10, btnTxtColor, true).setOrigin(.5).setDepth(134));
        const z = this.add.zone(bx+bw/2, by+12, bw, 24).setInteractive({useHandCursor:true}).setDepth(135);
        z.on('pointerdown', () => this._applyInventoryItem(it.item_id)); ov.push(z);
      });
    }

    const dimZ = this.add.zone(W/2, H/2, W, H).setInteractive().setDepth(129);
    dimZ.on('pointerdown', () => {}); ov.push(dimZ);
    this._invOverlay = ov;
  };

  StatsScene.prototype._applyInventoryItem = async function(itemId) {
    if (this._invBusy) return;
    this._invBusy = true;
    try {
      const res = await post('/api/shop/apply', { item_id: itemId, replace: false });
      this._invBusy = false;
      if (res?.conflict) {
        this._showReplaceDialog(itemId, res.active_buff_type, res.active_charges);
        return;
      }
      if (res?.ok) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        this._invData = await get('/api/shop/inventory').catch(() => this._invData);
        if (res.box_opened) {
          this._showBoxReveal(res);
        } else {
          this._showToast(res.msg || '✅ Применено!');
          this._renderInvOverlay();
          this._refreshBuffDisplay();
        }
      } else { this._showToast(`❌ ${res?.reason || 'Ошибка'}`); }
    } catch { this._invBusy = false; this._showToast('❌ Нет соединения'); }
  };

  StatsScene.prototype._showReplaceDialog = function(newItemId, activeBuffType, activeCharges) {
    const { W, H } = this, dlg = [], dlgY = H/2 - 70, dlgW = W - 48;
    const bg = this.add.graphics().setDepth(150);
    bg.fillStyle(0x1b1a30,.98); bg.fillRoundedRect(24, dlgY, dlgW, 140, 12);
    bg.lineStyle(2, 0xffaa33,.9); bg.strokeRoundedRect(24, dlgY, dlgW, 140, 12);
    dlg.push(bg);
    dlg.push(txt(this, W/2, dlgY+20, '⚠️ Уже активен свиток', 13, '#ffdd88', true).setOrigin(.5).setDepth(151));
    dlg.push(txt(this, W/2, dlgY+42, `${activeBuffType} (${activeCharges ?? '?'} боёв)`, 10, '#ccccee', true).setOrigin(.5).setDepth(151));
    dlg.push(txt(this, W/2, dlgY+60, 'Заменить? Старый сгорит.', 10, '#ffaaaa', true).setOrigin(.5).setDepth(151));

    const makeDlgBtn = (x, w, label, col, fn) => {
      const g = this.add.graphics().setDepth(151);
      g.fillStyle(col,.95); g.fillRoundedRect(x, dlgY+82, w, 30, 8);
      dlg.push(g, txt(this, x+w/2, dlgY+97, label, 11, '#fff', true).setOrigin(.5).setDepth(152));
      const z = this.add.zone(x+w/2, dlgY+97, w, 30).setInteractive({useHandCursor:true}).setDepth(153);
      z.on('pointerdown', fn); dlg.push(z);
    };
    const bw = Math.floor((dlgW - 24) / 2);
    makeDlgBtn(32, bw, 'Заменить', 0xcc6600, async () => {
      dlg.forEach(o => { try { o.destroy(); } catch {} });
      this._invBusy = true;
      const res = await post('/api/shop/apply', { item_id: newItemId, replace: true });
      this._invBusy = false;
      if (res?.ok) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        this._invData = await get('/api/shop/inventory').catch(() => this._invData);
        this._showToast(res.msg || '✅ Заменён!');
        this._renderInvOverlay();
        this._refreshBuffDisplay(); // обновить статы сразу
      } else { this._showToast(`❌ ${res?.reason || 'Ошибка'}`); }
    });
    makeDlgBtn(32 + bw + 8, bw, 'Отмена', 0x444466, () => { dlg.forEach(o => { try { o.destroy(); } catch {} }); });
    this._invOverlay = (this._invOverlay || []).concat(dlg);
  };

  StatsScene.prototype._closeInvOverlay = function() {
    (this._invOverlay || []).forEach(o => { try { o.destroy(); } catch {} });
    this._invOverlay = null;
    this._refreshBuffDisplay(); // синхронизировать статы после закрытия
  };

  /* ── Красивый попап при открытии ящика ─────────────────── */
  StatsScene.prototype._showBoxReveal = function(res) {
    const { W, H } = this;
    const icon = res.item_icon || '🎁';
    const name = res.item_name || 'Предмет';
    const isEpic = (res.item_id || '').includes('12') || (res.item_id || '').includes('titan') || (res.item_id || '').includes('500');
    const glowColor = isEpic ? 0xffaa00 : 0x55cc66;
    const glowHex   = isEpic ? '#ffaa00' : '#55cc66';
    const rvl = [];

    // Затемнение
    rvl.push(this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.85).setDepth(160));

    // Карточка
    const cW = W - 64, cH = 220, cX = 32, cY = H/2 - cH/2;
    const bg = this.add.graphics().setDepth(161);
    bg.fillStyle(0x12101e, 0.98); bg.fillRoundedRect(cX, cY, cW, cH, 16);
    bg.lineStyle(2.5, glowColor, 0.9); bg.strokeRoundedRect(cX, cY, cW, cH, 16);
    rvl.push(bg);

    // Лучи (статичные линии вместо анимации — просто)
    const rg = this.add.graphics().setDepth(161);
    rg.lineStyle(1, glowColor, 0.18);
    for (let a = 0; a < 360; a += 30) {
      const rad = a * Math.PI / 180;
      rg.lineBetween(W/2, H/2, W/2 + Math.cos(rad)*140, H/2 + Math.sin(rad)*140);
    }
    rvl.push(rg);

    rvl.push(txt(this, W/2, cY + 22, '🎲 ИЗ ЯЩИКА ВЫПАЛО', 11, glowHex, true).setOrigin(0.5).setDepth(162));
    rvl.push(txt(this, W/2, cY + 70, icon, 44).setOrigin(0.5).setDepth(162));
    rvl.push(txt(this, W/2, cY + 120, name, 15, '#ffffff', true).setOrigin(0.5).setDepth(162));
    rvl.push(txt(this, W/2, cY + 142, '→ добавлено в инвентарь', 10, '#aaaacc').setOrigin(0.5).setDepth(162));

    if (isEpic) rvl.push(txt(this, W/2, cY + 158, '⭐ РЕДКИЙ ПРЕДМЕТ ⭐', 11, '#ffcc44', true).setOrigin(0.5).setDepth(162));

    // Кнопка OK
    const okY = cY + cH - 44, okW = cW - 48;
    const okG = this.add.graphics().setDepth(162);
    okG.fillStyle(glowColor === 0xffaa00 ? 0x7a5000 : 0x1a4a2a, 1);
    okG.fillRoundedRect(cX + 24, okY, okW, 36, 10);
    okG.lineStyle(1.5, glowColor, 0.9);
    okG.strokeRoundedRect(cX + 24, okY, okW, 36, 10);
    rvl.push(okG, txt(this, W/2, okY + 18, '✅ Отлично!', 13, '#ffffff', true).setOrigin(0.5).setDepth(163));
    const okZ = this.add.zone(W/2, okY + 18, okW, 36).setInteractive({useHandCursor:true}).setDepth(164);
    okZ.on('pointerdown', () => {
      rvl.forEach(o => { try { o.destroy(); } catch {} });
      this._renderInvOverlay();
    });
    rvl.push(okZ);
    this._invOverlay = (this._invOverlay || []).concat(rvl);
  };
})();
