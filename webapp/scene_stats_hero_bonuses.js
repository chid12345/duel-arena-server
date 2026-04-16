/* ============================================================
   StatsScene — расширение: раскрывающийся бейдж воина
   с полной панелью бонусов (класс / свитки / эликсиры / скоро)
   ============================================================ */

(() => {

  const WT = {
    tank:  { name: 'Берсерк',       icon: '⚔️', col: 0x4a1208, tcol: '#ff9977',
             rows: [ {i:'⚔️', n:'Урон',   v:'+12%', neg:false},
                     {i:'🤸', n:'Уворот', v:'−8%',  neg:true } ] },
    agile: { name: 'Теневой Вихрь', icon: '💨', col: 0x0a2e18, tcol: '#44ff99',
             rows: [ {i:'🤸', n:'Уворот', v:'+8%',  neg:false},
                     {i:'🛡', n:'Броня',  v:'−10%', neg:true } ] },
    crit:  { name: 'Хаос-Рыцарь',   icon: '💥', col: 0x220a3a, tcol: '#cc77ff',
             rows: [ {i:'💥', n:'Шанс крита',    v:'+5%',   neg:false},
                     {i:'⚡', n:'Множитель крита', v:'×1.65', neg:false},
                     {i:'❤️', n:'Здоровье',      v:'−10%',  neg:true } ] },
  };

  const BUFF_LBL = {
    strength:'⚔️ Сила', endurance:'🌀 Ловкость', stamina:'🛡 Выносливость',
    crit:'🎯 Интуиция', armor_pct:'🔰 Броня', dodge_pct:'💨 Уворот',
    hp_bonus:'❤️ HP', double_pct:'⚡ Двойной', accuracy:'👁 Точность',
    lifesteal_pct:'🩸 Вампир', gold_pct:'💰 Золото', xp_pct:'📚 Опыт',
  };

  const timeLeft = (iso) => {
    const ms = Math.max(0, new Date(iso + 'Z') - Date.now());
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  };

Object.assign(StatsScene.prototype, {

  /* Рисует интерактивный бейдж воина + сохраняет данные для раскрытия */
  _buildWarriorBadge(W, wbY) {
    const p = State.player;
    const _wt = WT[p.warrior_type] || WT.tank;
    const wbH = 28;
    const ref = { open:false, refs:[], panelRefs:[], wt:_wt, W, wbY, wbH };
    this._heroBonuses = ref;

    const g = this.add.graphics().setDepth(2);
    g.fillStyle(_wt.col, 0.95);
    g.fillRoundedRect(8, wbY, W - 16, wbH, 8);
    g.lineStyle(1, 0xffffff, 0.08);
    g.strokeRoundedRect(8, wbY, W - 16, wbH, 8);
    ref.refs.push(g);

    // счётчик "+N бонусов"
    const nClass = _wt.rows.length;
    const buffs = this._invData?.active_buffs || [];
    const summary = `+${nClass + buffs.length} бонус${buffs.length+nClass===1?'':'ов'}`;

    const cy = wbY + wbH / 2;
    ref.refs.push(txt(this, 18, cy, `${_wt.icon}  ${_wt.name}`, 11, _wt.tcol, true).setOrigin(0, 0.5));
    const sumT = txt(this, W - 40, cy, summary, 10, '#d8c6ef', true).setOrigin(1, 0.5);
    ref.sumT = sumT;
    ref.refs.push(sumT);

    // шеврон
    const chevBg = this.add.graphics().setDepth(2);
    chevBg.fillStyle(0xffffff, 0.08);
    chevBg.fillCircle(W - 22, cy, 9);
    ref.refs.push(chevBg);
    const chev = txt(this, W - 22, cy, '▾', 10, _wt.tcol, true).setOrigin(0.5);
    ref.chev = chev;
    ref.refs.push(chev);

    // hit-zone на всю ширину бейджа
    const z = this.add.zone(W/2, cy, W - 16, wbH).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => { try { tg?.HapticFeedback?.selectionChanged(); } catch(_){} });
    z.on('pointerup', () => this._toggleHeroBonuses());
    ref.refs.push(z);
  },

  _toggleHeroBonuses() {
    const r = this._heroBonuses; if (!r) return;
    if (r.open) return this._closeHeroBonuses();
    this._openHeroBonuses();
  },

  _closeHeroBonuses() {
    const r = this._heroBonuses; if (!r) return;
    r.panelRefs.forEach(x => { try { x.destroy(); } catch(_){} });
    r.panelRefs = [];
    r.open = false;
    if (r.chev) r.chev.setText('▾');
  },

  async _openHeroBonuses() {
    const r = this._heroBonuses; if (!r) return;
    // Подгрузим инвентарь, если ещё нет — для актуальных свитков/эликсиров
    if (!this._invData) {
      try { const d = await get('/api/shop/inventory'); if (d?.ok) this._invData = d; } catch(_){}
      if (!this.scene?.isActive()) return;
    }
    r.open = true;
    if (r.chev) r.chev.setText('▴');
    this._renderHeroBonusesPanel();
  },

  _renderHeroBonusesPanel() {
    const r = this._heroBonuses; if (!r || !r.open) return;
    r.panelRefs.forEach(x => { try { x.destroy(); } catch(_){} });
    r.panelRefs = [];

    const { W, wbY, wbH, wt } = r;
    const { H } = this;
    const bottomGuard = H * 0.935 - 8;
    const panelX = 8;
    const panelY = wbY + wbH + 4;
    const panelW = W - 16;
    const maxH = Math.max(160, bottomGuard - panelY);

    // собрать секции
    const buffs = this._invData?.active_buffs || [];
    const chargeBuffs = buffs.filter(b => b.charges != null);
    const timeBuffs   = buffs.filter(b => b.expires_at != null);

    const sections = [];
    sections.push({ title:'⚔️ Класс воина',
      rows: wt.rows.map(r => ({ i:r.i, n:r.n, v:r.v, neg:r.neg })) });

    if (chargeBuffs.length) {
      sections.push({ title:'📜 Свитки',
        rows: chargeBuffs.map(b => ({
          i:'📜', n:BUFF_LBL[b.buff_type] || b.buff_type,
          v:`+${b.value}${b.buff_type.endsWith('_pct')?'%':''} · ${b.charges} боёв`, neg:false })) });
    } else {
      sections.push({ title:'📜 Свитки', empty:'нет активных · купите в магазине' });
    }

    if (timeBuffs.length) {
      sections.push({ title:'🧪 Эликсиры',
        rows: timeBuffs.map(b => ({
          i:'🧪', n:BUFF_LBL[b.buff_type] || b.buff_type,
          v:`+${b.value}% · ${timeLeft(b.expires_at)}`, neg:false })) });
    } else {
      sections.push({ title:'🧪 Эликсиры', empty:'нет активных · купите в магазине' });
    }

    sections.push({ title:'🔜 В разработке', empty:'руны · ауры клана · сеты брони' });

    // отрисовка
    const rowH = 20, sectH = 18, padT = 8, padB = 8, gap = 4;
    let totalH = padT + padB;
    sections.forEach(s => {
      totalH += sectH + gap;
      if (s.rows) totalH += s.rows.length * rowH;
      else totalH += rowH;
      totalH += gap;
    });
    const h = Math.min(maxH, totalH);

    const bg = this.add.graphics().setDepth(3);
    bg.fillStyle(0x0d0a1c, 0.98);
    bg.fillRoundedRect(panelX, panelY, panelW, h, 10);
    bg.lineStyle(1, wt.col, 0.6);
    bg.strokeRoundedRect(panelX, panelY, panelW, h, 10);
    r.panelRefs.push(bg);

    let y = panelY + padT;
    sections.forEach(sec => {
      // заголовок секции
      const tc = '#8a7db3';
      r.panelRefs.push(txt(this, panelX + 10, y + sectH/2, sec.title, 10, tc, true).setOrigin(0, 0.5).setDepth(4));
      const line = this.add.graphics().setDepth(4);
      line.lineStyle(1, wt.col, 0.25);
      line.lineBetween(panelX + 140, y + sectH/2, panelX + panelW - 10, y + sectH/2);
      r.panelRefs.push(line);
      y += sectH + gap;

      if (sec.empty) {
        r.panelRefs.push(txt(this, panelX + panelW/2, y + rowH/2, sec.empty, 10, '#55506e').setOrigin(0.5).setDepth(4));
        y += rowH;
      } else {
        sec.rows.forEach((row, i) => {
          if (i % 2 === 1) {
            const sg = this.add.graphics().setDepth(3);
            sg.fillStyle(0xffffff, 0.025);
            sg.fillRoundedRect(panelX + 4, y, panelW - 8, rowH, 4);
            r.panelRefs.push(sg);
          }
          r.panelRefs.push(txt(this, panelX + 14, y + rowH/2, row.i, 12).setOrigin(0, 0.5).setDepth(4));
          r.panelRefs.push(txt(this, panelX + 34, y + rowH/2, row.n, 11, '#dcd8ef').setOrigin(0, 0.5).setDepth(4));
          r.panelRefs.push(txt(this, panelX + panelW - 12, y + rowH/2, row.v, 11, row.neg?'#ff7e7e':'#66dd99', true).setOrigin(1, 0.5).setDepth(4));
          y += rowH;
        });
      }
      y += gap;
    });
  },
});

})();
