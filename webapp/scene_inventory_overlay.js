/* ============================================================
   Inventory Overlay — вкладка "Моё" для StatsScene
   Показывает купленные в магазине предметы + активные бафы.
   ============================================================ */

(() => {
  // Мета по item_id: иконка, название, описание
  const ITEM_META = {
    scroll_str_3:   { icon:'⚔️', name:'Сила +3',        desc:'strength +3, 1 бой', tab:'scrolls' },
    scroll_end_3:   { icon:'🌀', name:'Ловкость +3',     desc:'уворот +3, 1 бой', tab:'scrolls' },
    scroll_crit_3:  { icon:'🎯', name:'Интуиция +3',     desc:'крит +3, 1 бой', tab:'scrolls' },
    scroll_armor_6: { icon:'🔰', name:'Броня +6%',       desc:'armor_pct +6%, 1 бой', tab:'scrolls' },
    scroll_hp_100:  { icon:'❤️', name:'HP +100',         desc:'hp_bonus +100, 1 бой', tab:'scrolls' },
    scroll_warrior: { icon:'⚔️', name:'Воин',           desc:'str+2, end+2, 1 бой', tab:'scrolls' },
    scroll_shadow:  { icon:'🌑', name:'Тень',            desc:'end+3, dodge+3%, 1 бой', tab:'scrolls' },
    scroll_fury:    { icon:'🔥', name:'Ярость',          desc:'str+4, crit+2, 1 бой', tab:'scrolls' },
    scroll_str_6:   { icon:'⚔️', name:'Сила +6',        desc:'strength +6, 3 боя', tab:'scrolls' },
    scroll_end_6:   { icon:'🌀', name:'Ловкость +6',     desc:'уворот +6, 3 боя', tab:'scrolls' },
    scroll_crit_6:  { icon:'🎯', name:'Интуиция +6',     desc:'крит +6, 3 боя', tab:'scrolls' },
    scroll_dodge_5: { icon:'💨', name:'Уворот +5%',      desc:'dodge_pct +5%, 3 боя', tab:'scrolls' },
    scroll_armor_10:{ icon:'🔰', name:'Броня +10%',      desc:'armor_pct +10%, 3 боя', tab:'scrolls' },
    scroll_hp_200:  { icon:'❤️', name:'HP +200',         desc:'hp_bonus +200, 3 боя', tab:'scrolls' },
    scroll_double_10:{icon:'⚡', name:'Двойной удар +10%',desc:'double_pct +10%, 3 боя', tab:'scrolls' },
    scroll_all_4:   { icon:'✨', name:'Все статы +4',    desc:'str/end/crit +4, 1 бой', tab:'scrolls' },
    scroll_bastion: { icon:'🏰', name:'Бастион',         desc:'end+5, armor+8%, 3 боя', tab:'scrolls' },
    scroll_predator:{ icon:'🐍', name:'Хищник',          desc:'крит+5, двойной+8%, 3 боя', tab:'scrolls' },
    scroll_berserker:{icon:'🔥', name:'Берсерк',         desc:'сила+8, броня-5%, 3 боя', tab:'scrolls' },
    scroll_accuracy:{ icon:'👁️', name:'Точность +15',    desc:'accuracy +15, 3 боя', tab:'scrolls' },
    scroll_str_12:  { icon:'⚔️', name:'Сила +12',       desc:'strength +12, 5 боёв', tab:'special' },
    scroll_end_12:  { icon:'🌀', name:'Ловкость +12',    desc:'уворот +12, 5 боёв', tab:'special' },
    scroll_stam_12: { icon:'🛡️', name:'Выносливость +12',desc:'броня+HP +12, 5 боёв', tab:'special' },
    scroll_crit_12: { icon:'🎯', name:'Интуиция +12',    desc:'крит +12, 5 боёв', tab:'special' },
    scroll_hp_500:  { icon:'❤️', name:'HP +500',         desc:'hp_bonus +500, 7 боёв', tab:'special' },
    scroll_all_12:  { icon:'✨', name:'Все статы +12',   desc:'str/end/crit +12, 5 боёв', tab:'special' },
    scroll_titan:   { icon:'👹', name:'Титан',           desc:'сила+ловк+инт+вын +15, 3 боя', tab:'special' },
    box_common:     { icon:'📦', name:'Обычный ящик',     desc:'Случайный предмет (открыть)', tab:'special' },
    box_rare:       { icon:'🟦', name:'Редкий ящик',      desc:'Ценный предмет · 5% USDT', tab:'special' },
    box_epic:       { icon:'🟣', name:'Эпик ящик',        desc:'гарантированный USDT-свиток', tab:'special' },
    xp_boost_5:    { icon:'⚡', name:'XP Буст ×1.5',    desc:'×1.5 XP, 5 зарядов', tab:'elixirs' },
    xp_boost_20:   { icon:'⚡', name:'XP Буст ×1.5',    desc:'×1.5 XP, 20 зарядов', tab:'elixirs' },
    xp_boost_x2:   { icon:'⚡', name:'XP Буст ×2.0',    desc:'×2.0 XP, 10 зарядов', tab:'elixirs' },
    gold_hunt:     { icon:'💰', name:'Охота за золотом', desc:'+20% золото за бой · 24 ч', tab:'elixirs' },
    xp_hunt:       { icon:'📚', name:'Охота за опытом',  desc:'+50% опыта за бой · 24 ч', tab:'elixirs' },
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
    strength: '⚔️ Сила', endurance: '🌀 Ловкость', stamina: '🛡 Выносливость', crit: '🎯 Интуиция',
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
        const parts = chargeBased.map(b => `${BUFF_LABEL[b.buff_type] || b.buff_type}+${b.value}`);
        const ch = chargeBased[0].charges;
        const chWord = ch === 1 ? 'бой' : ch < 5 ? 'боя' : 'боёв';
        // Разбить на строки по 2 стата чтобы не переполнять строку
        for (let i = 0; i < parts.length; i += 2) {
          const chunk = parts.slice(i, i + 2).join('   ');
          const isLast = i + 2 >= parts.length;
          lines.push({ text: isLast ? `${chunk}   · ${ch} ${chWord}` : chunk, color: '#ffffff' });
        }
        lines.push({ text: `Натиск / Башня Титанов = 1 заряд за заход`, color: '#aaccff' });
      }
      timeBased.forEach(b => {
        const msLeft = Math.max(0, new Date(b.expires_at + 'Z') - Date.now());
        const hLeft  = Math.floor(msLeft / 3600000);
        const mLeft  = Math.floor((msLeft % 3600000) / 60000);
        const timeStr = hLeft > 0 ? `${hLeft}ч ${mLeft}м` : `${mLeft}м`;
        const label = BUFF_LABEL[b.buff_type] || b.buff_type;
        lines.push({ text: `${label}+${b.value}%   · ${timeStr}`, color: '#ffc83c' });
      });
      buffCardH = 18 + lines.length * 17 + 4;
      const bcg = this.add.graphics().setDepth(132);
      bcg.fillStyle(0x0a1a30, 0.97);
      bcg.fillRoundedRect(12, buffCardY, W-24, buffCardH, 8);
      bcg.lineStyle(1.5, 0x4488cc, 0.8);
      bcg.strokeRoundedRect(12, buffCardY, W-24, buffCardH, 8);
      ov.push(bcg);
      ov.push(txt(this, 20, buffCardY + 9, '🧪 Активный баф:', 9, '#88ccff', true).setDepth(133));
      lines.forEach((line, i) => {
        ov.push(txt(this, 20, buffCardY + 19 + i * 17, line.text, 10, line.color, true).setDepth(133));
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
})();
