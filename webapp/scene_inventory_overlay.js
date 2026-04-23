/* ============================================================
   Inventory Overlay — вкладка "Моё" для StatsScene
   Показывает купленные в магазине предметы + активные бафы.
   ============================================================ */

(() => {
  // Мета по item_id: иконка, название, описание
  const ITEM_META = {
    // ── Свитки: золотые (1 бой) ──
    scroll_str_3:   { icon:'⚔️', name:'Эликсир силы +3',      desc:'Сила +3 · на 1 бой', tab:'scrolls' },
    scroll_end_3:   { icon:'🌀', name:'Эликсир ловкости +3',   desc:'Ловкость +3 · на 1 бой', tab:'scrolls' },
    scroll_crit_3:  { icon:'🎯', name:'Эликсир интуиции +3',   desc:'Интуиция +3 · на 1 бой', tab:'scrolls' },
    scroll_armor_6: { icon:'🛡️', name:'Свиток брони 6%',      desc:'Броня +6% · на 1 бой', tab:'scrolls' },
    scroll_hp_100:  { icon:'❤️', name:'Эликсир HP +100',      desc:'+100 к здоровью · на 1 бой', tab:'scrolls' },
    scroll_warrior: { icon:'⚔️', name:'Комбо Воина',          desc:'Сила +2, Ловкость +2 · на 1 бой', tab:'scrolls' },
    scroll_shadow:  { icon:'🌑', name:'Комбо Тени',            desc:'Ловкость +3, Уворот +3% · на 1 бой', tab:'scrolls' },
    scroll_fury:    { icon:'💥', name:'Комбо Ярости',          desc:'Сила +4, Крит +2 · на 1 бой', tab:'scrolls' },
    // ── Свитки: алмазные (3 боя) ──
    scroll_str_6:   { icon:'⚔️', name:'Эликсир силы +6',      desc:'Сила +6 · на 3 боя', tab:'scrolls' },
    scroll_end_6:   { icon:'🌀', name:'Эликсир ловкости +6',   desc:'Ловкость +6 · на 3 боя', tab:'scrolls' },
    scroll_crit_6:  { icon:'🎯', name:'Эликсир интуиции +6',   desc:'Интуиция +6 · на 3 боя', tab:'scrolls' },
    scroll_dodge_5: { icon:'💨', name:'Свиток уворота 5%',     desc:'Уворот +5% · на 3 боя', tab:'scrolls' },
    scroll_armor_10:{ icon:'🛡️', name:'Свиток брони 10%',     desc:'Броня +10% · на 3 боя', tab:'scrolls' },
    scroll_hp_200:  { icon:'❤️', name:'Эликсир HP +200',      desc:'+200 к здоровью · на 3 боя', tab:'scrolls' },
    scroll_double_10:{icon:'⚡', name:'Двойной удар +10%',     desc:'Шанс двойного удара +10% · на 3 боя', tab:'scrolls' },
    scroll_all_4:   { icon:'✨', name:'Все пассивки +4',       desc:'Сила, Ловк, Инт, Вын +4 · на 1 бой', tab:'scrolls' },
    scroll_bastion: { icon:'🏰', name:'Бастион',               desc:'Ловкость +5, Броня +8% · на 3 боя', tab:'scrolls' },
    scroll_predator:{ icon:'🐍', name:'Хищник',                desc:'Крит +5, Двойной удар +8% · на 3 боя', tab:'scrolls' },
    scroll_berserker:{icon:'🔥', name:'Берсерк',               desc:'Сила +8, Броня −5% · на 3 боя', tab:'scrolls' },
    scroll_accuracy:{ icon:'👁️', name:'Свиток точности',      desc:'Точность +15 · на 3 боя', tab:'scrolls' },
    // ── Особые (USDT-уровень) ──
    scroll_str_12:  { icon:'⚔️', name:'Эликсир силы +12',     desc:'Сила +12 · на 5 боёв', tab:'special' },
    scroll_end_12:  { icon:'🌀', name:'Эликсир ловкости +12',  desc:'Ловкость +12 · на 5 боёв', tab:'special' },
    scroll_stam_12: { icon:'🛡️', name:'Эликсир выносливости +12',desc:'Выносливость +12 · на 5 боёв', tab:'special' },
    scroll_crit_12: { icon:'🎯', name:'Эликсир интуиции +12',  desc:'Интуиция +12 · на 5 боёв', tab:'special' },
    scroll_hp_500:  { icon:'❤️', name:'Эликсир HP +500',      desc:'+500 к здоровью · на 7 боёв', tab:'special' },
    scroll_all_12:  { icon:'✨', name:'Все пассивки +12',      desc:'Сила, Ловк, Инт, Вын +12 · на 5 боёв', tab:'special' },
    scroll_titan:   { icon:'🏔️', name:'Свиток Титана',        desc:'Все статы +15 · на 3 боя', tab:'special' },
    // ── Ящики ──
    box_common:     { icon:'📦', name:'Обычный ящик',          desc:'2–4 свитка · шанс на алмазный', tab:'special' },
    box_rare:       { icon:'🟦', name:'Редкий ящик',           desc:'3–6 алмазных свитков', tab:'special' },
    box_rare_c:     { icon:'🟪', name:'Редкий ящик+',          desc:'2+ алмазных · шанс 300💎 и Premium', tab:'special' },
    box_epic_e2:    { icon:'🔮', name:'Эпический: Удача',      desc:'USDT-свиток + алмазные · шанс Титана', tab:'special' },
    box_epic_e3:    { icon:'⚔️', name:'Эпический: Набор воина',desc:'USDT-свиток + XP×2 + свитки', tab:'special' },
    // ── Эликсиры ──
    xp_boost_5:    { icon:'⚡', name:'XP Буст ×1.5',          desc:'Опыт ×1.5 · на 5 боёв', tab:'elixirs' },
    xp_boost_20:   { icon:'⚡', name:'XP Буст ×1.5',          desc:'Опыт ×1.5 · на 20 боёв', tab:'elixirs' },
    xp_boost_x2:   { icon:'🚀', name:'XP Буст ×2.0',          desc:'Опыт ×2.0 · на 10 боёв', tab:'elixirs' },
    gold_hunt:     { icon:'💰', name:'Охота за золотом',       desc:'+20% золота за бой · 24 часа', tab:'elixirs' },
    xp_hunt:       { icon:'📚', name:'Охота за опытом',        desc:'+50% опыта за бой · 24 часа', tab:'elixirs' },
    // ── Мировой Босс: свитки рейда (применяются в слоты во вкладке ⚔️ Босс) ──
    damage_25:     { icon:'⚔️', name:'+25% урон',             desc:'Урон ×1.25 весь рейд · применить в слот', tab:'boss' },
    power_10:      { icon:'💪', name:'+10% урон',             desc:'Урон ×1.10 весь рейд · применить в слот', tab:'boss' },
    defense_20:    { icon:'🛡️', name:'+20% защита',           desc:'Защита ×1.20 весь рейд · применить в слот', tab:'boss' },
    dodge_10:      { icon:'💨', name:'+10% уворот',           desc:'Уворот +10% весь рейд · применить в слот', tab:'boss' },
    crit_10:       { icon:'🎯', name:'+10% крит',             desc:'Крит +10% весь рейд · применить в слот', tab:'boss' },
    // ── Мировой Босс: свитки воскрешения (применяются при смерти в рейде) ──
    res_30:        { icon:'🕯️', name:'Воскрешение 30% HP',    desc:'Воскреснуть с 30% HP · только в рейде босса', tab:'boss' },
    res_60:        { icon:'🔮', name:'Воскрешение 60% HP',    desc:'Воскреснуть с 60% HP · только в рейде босса', tab:'boss' },
    res_100:       { icon:'✨', name:'Воскрешение 100% HP',   desc:'Воскреснуть со 100% HP · только в рейде босса', tab:'boss' },
    // ── Мировой Босс: сундуки наград (выдаются за топ-урон / последний удар) ──
    wb_gold_chest:    { icon:'🏆', name:'Золотой сундук рейда',   desc:'За последний удар по боссу · открыть в магазине', tab:'boss' },
    wb_diamond_chest: { icon:'💠', name:'Алмазный сундук рейда',  desc:'За топ урон в рейде · открыть в магазине', tab:'boss' },
  };

  const TABS = [
    { key: 'scrolls', label: '📜 Свитки' },
    { key: 'elixirs', label: '⚗️ Элексиры' },
    { key: 'special', label: '🏆 Особые' },
    { key: 'boss',    label: '⚔️ Рейд' },
  ];

  StatsScene.prototype._openInventoryPanel = async function() {
    if (this._invBusy) return;
    this._invBusy = true;
    // Сброс счётчика "новых покупок" магазина при любом входе в инвентарь
    try { localStorage.removeItem('shop_inv_new_count'); } catch(_) {}
    if (State?.player) State.player.inventory_unseen = 0;
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

    // Затемнение
    ov.push(this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.82).setDepth(130));

    // Фон панели — тёмно-коричневый RPG
    const bg = this.add.graphics().setDepth(131);
    bg.fillStyle(0x150a04, 0.99);
    bg.fillRoundedRect(8, panelY, W-16, panelH, 12);
    bg.lineStyle(2, 0x6a4520, 0.9);
    bg.strokeRoundedRect(8, panelY, W-16, panelH, 12);
    // Золотая полоса-шапка
    bg.fillStyle(0xc88030, 0.15);
    bg.fillRoundedRect(8, panelY, W-16, 32, 12);
    ov.push(bg);

    // Заголовок
    ov.push(txt(this, W/2, panelY+15, '📜 Инвентарь', 14, '#ffe888', true)
      .setOrigin(0.5).setDepth(132));

    // Кнопка закрыть
    const cg = this.add.graphics().setDepth(132);
    cg.fillStyle(0x5a1a10, 1);
    cg.fillRoundedRect(W-44, panelY+8, 28, 22, 6);
    cg.lineStyle(1, 0xcc4422, 0.9);
    cg.strokeRoundedRect(W-44, panelY+8, 28, 22, 6);
    ov.push(cg, txt(this, W-30, panelY+19, '✕', 11, '#ffaa88', true).setOrigin(0.5).setDepth(133));
    const cz = this.add.zone(W-30, panelY+19, 28, 22).setInteractive({useHandCursor:true}).setDepth(134);
    cz.on('pointerdown', () => this._closeInvOverlay()); ov.push(cz);

    // Разделитель под заголовком
    const div1 = this.add.graphics().setDepth(132);
    div1.lineStyle(1, 0x7a5028, 0.6);
    div1.beginPath(); div1.moveTo(18, panelY+32); div1.lineTo(W-18, panelY+32); div1.strokePath();
    ov.push(div1);

    // Вкладки
    const tabW = Math.floor((W - 28) / TABS.length);
    TABS.forEach((tab, i) => {
      const active = this._invTab === tab.key;
      const tx = 12 + i * (tabW + 2);
      const g = this.add.graphics().setDepth(132);
      if (active) {
        g.fillStyle(0x3a1e08, 0.95);
        g.fillRoundedRect(tx, panelY+36, tabW, 22, 5);
        g.lineStyle(1, 0xc8903c, 0.9);
        g.strokeRoundedRect(tx, panelY+36, tabW, 22, 5);
        // Нижняя золотая черта
        g.fillStyle(0xd4a040, 1);
        g.fillRect(tx+8, panelY+57, tabW-16, 2);
      } else {
        g.fillStyle(0x1e1006, 0.7);
        g.fillRoundedRect(tx, panelY+36, tabW, 22, 5);
        g.lineStyle(1, 0x4a2e10, 0.6);
        g.strokeRoundedRect(tx, panelY+36, tabW, 22, 5);
      }
      ov.push(g, txt(this, tx+tabW/2, panelY+47, tab.label, 9,
        active ? '#ffe478' : '#b08848', active).setOrigin(.5).setDepth(133));
      const z = this.add.zone(tx+tabW/2, panelY+47, tabW, 22).setInteractive({useHandCursor:true}).setDepth(134);
      z.on('pointerdown', () => { this._invTab = tab.key; this._renderInvOverlay(); }); ov.push(z);
    });

    // ── Блок активных бафов ─────────────────────────────
    const buffCardY = panelY + 63;
    let buffCardH = 0;
    if (activeBuffs.length > 0) {
      const chargeBased = activeBuffs.filter(b => b.charges != null);
      const timeBased   = activeBuffs.filter(b => b.expires_at != null);
      const lines = [];
      if (chargeBased.length > 0) {
        const parts = chargeBased.map(b => `${BUFF_LABEL[b.buff_type] || b.buff_type}+${b.value}`);
        const ch = chargeBased[0].charges;
        const chWord = ch === 1 ? 'бой' : ch < 5 ? 'боя' : 'боёв';
        for (let i = 0; i < parts.length; i += 2) {
          const chunk = parts.slice(i, i + 2).join('   ');
          const isLast = i + 2 >= parts.length;
          lines.push({ text: isLast ? `${chunk}   · ${ch} ${chWord}` : chunk, color: '#fff8d0' });
        }
        lines.push({ text: `Натиск / Башня Титанов = 1 заряд за заход`, color: '#d4b870' });
      }
      timeBased.forEach(b => {
        const msLeft = Math.max(0, new Date(b.expires_at + 'Z') - Date.now());
        const hLeft  = Math.floor(msLeft / 3600000);
        const mLeft  = Math.floor((msLeft % 3600000) / 60000);
        const timeStr = hLeft > 0 ? `${hLeft}ч ${mLeft}м` : `${mLeft}м`;
        const label = BUFF_LABEL[b.buff_type] || b.buff_type;
        lines.push({ text: `${label}+${b.value}%   · ${timeStr}`, color: '#ffe04a' });
      });
      buffCardH = 18 + lines.length * 17 + 4;
      const bcg = this.add.graphics().setDepth(132);
      bcg.fillStyle(0x3c1e0a, 0.95);
      bcg.fillRoundedRect(12, buffCardY, W-24, buffCardH, 7);
      bcg.lineStyle(1.5, 0x8c5a1e, 0.8);
      bcg.strokeRoundedRect(12, buffCardY, W-24, buffCardH, 7);
      // Левый золотой акцент
      bcg.fillStyle(0xc8903c, 1);
      bcg.fillRoundedRect(12, buffCardY, 3, buffCardH, 2);
      ov.push(bcg);
      ov.push(txt(this, 22, buffCardY + 9, '✦ Активный баф:', 9, '#e0b870', true).setDepth(133));
      lines.forEach((line, i) => {
        ov.push(txt(this, 22, buffCardY + 19 + i * 17, line.text, 10, line.color, true).setDepth(133));
      });
    }

    // Список предметов
    const items = inventory.filter(it => ITEM_META[it.item_id] && ITEM_META[it.item_id].tab === this._invTab);
    const listY = buffCardY + (buffCardH > 0 ? buffCardH + 5 : 2);
    const listH = panelY + panelH - listY - 10;
    const cardH = 56, cardW = W - 32;

    if (items.length === 0) {
      ov.push(txt(this, W/2, listY + listH/2, 'Пусто. Загляни в Магазин!', 11, '#a07848', true).setOrigin(.5).setDepth(133));
    } else {
      const maxVisible = Math.floor(listH / (cardH + 6));
      items.slice(0, maxVisible).forEach((it, i) => {
        const meta = ITEM_META[it.item_id] || { icon:'📦', name: it.item_id, desc: '', tab: 'scrolls' };
        const y = listY + i * (cardH + 6);
        const crd = this.add.graphics().setDepth(132);
        // Фон карточки
        crd.fillStyle(0x190f05, 0.97);
        crd.fillRoundedRect(16, y, cardW, cardH, 7);
        crd.lineStyle(1, 0x5a3a18, 0.75);
        crd.strokeRoundedRect(16, y, cardW, cardH, 7);
        // Левый золотой акцент
        crd.fillStyle(0xc8903c, 0.75);
        crd.fillRoundedRect(16, y, 3, cardH, 2);
        ov.push(crd);
        ov.push(txt(this, 28, y+10, `${meta.icon} ${meta.name}`, 12, '#fff8d0', true).setDepth(133));
        ov.push(txt(this, 28, y+27, meta.desc, 9, '#c8a878').setDepth(133));
        ov.push(txt(this, 28, y+41, `Кол-во: ${it.quantity}`, 9, '#ffe04a').setDepth(133));
        const isBox  = it.item_id.startsWith('box_');
        const isBoss = meta.tab === 'boss';
        const bw = 90, bx = 16 + cardW - bw - 6, by = y + (cardH - 24) / 2;
        const bg2 = this.add.graphics().setDepth(133);
        const btnColor  = isBoss ? 0x1a2a4a : (isBox ? 0x7a3800 : 0x6e4810);
        const btnBorder = isBoss ? 0x5096ff : (isBox ? 0xffaa33 : 0xdca028);
        const btnLabel  = isBoss ? '⚔️ В рейде' : (isBox ? '🎲 Открыть' : 'Применить');
        const btnTxt    = isBoss ? '#aaddff'    : (isBox ? '#ffe0aa'    : '#ffe878');
        bg2.fillStyle(btnColor, 0.95);
        bg2.fillRoundedRect(bx, by, bw, 24, 6);
        bg2.lineStyle(1, btnBorder, 0.85);
        bg2.strokeRoundedRect(bx, by, bw, 24, 6);
        ov.push(bg2, txt(this, bx+bw/2, by+12, btnLabel, 10, btnTxt, true).setOrigin(.5).setDepth(134));
        const z = this.add.zone(bx+bw/2, by+12, bw, 24).setInteractive({useHandCursor:true}).setDepth(135);
        z.on('pointerdown', () => isBoss
          ? this._showToast('Переходи в ⚔️ Мировой Босс — там применишь')
          : this._applyInventoryItem(it.item_id));
        ov.push(z);
        // Тап на карточку (вне кнопки) → попап с описанием
        const cardZ = this.add.zone(16 + (cardW - bw - 6) / 2, y + cardH / 2, cardW - bw - 6, cardH)
          .setInteractive({ useHandCursor: true }).setDepth(135);
        cardZ.on('pointerdown', () => {
          showItemDetailPopup(this, {
            icon: meta.icon, name: meta.name, desc: meta.desc,
            actionLabel: btnLabel,
            depthBase: 250,
            actionFn: () => { closeItemDetailPopup(this); this._applyInventoryItem(it.item_id); },
          });
        }); ov.push(cardZ);
      });
    }

    const dimZ = this.add.zone(W/2, H/2, W, H).setInteractive().setDepth(129);
    dimZ.on('pointerdown', () => {}); ov.push(dimZ);
    this._invOverlay = ov;
  };

  // Экспортируем ITEM_META / TABS, чтобы HTML-оверлей "Герой→Рюкзак" не дублировал таблицу.
  window.INVENTORY_META = { ITEM_META, TABS, BUFF_LABEL };
})();
