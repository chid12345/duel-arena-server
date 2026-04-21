/* ============================================================
   StatsScene — раскрывающийся бейдж воина с панелью бонусов
   (класс / свитки / эликсиры / скоро) + drag-скролл + click-outside
   ============================================================ */

(() => {

  const WT = {
    tank:  { name:'Берсерк',       icon:'⚔️', col:0x8a2818, tcol:'#ffbba0',
             rows:[{i:'⚔️',n:'Урон',v:'+12%',neg:false},{i:'🤸',n:'Уворот',v:'−8%',neg:true}] },
    agile: { name:'Теневой Вихрь', icon:'💨', col:0x1a6840, tcol:'#7affb8',
             rows:[{i:'🤸',n:'Уворот',v:'+8%',neg:false},{i:'🛡',n:'Броня',v:'−10%',neg:true}] },
    crit:  { name:'Хаос-Рыцарь',   icon:'💥', col:0x5a2890, tcol:'#e0b8ff',
             rows:[{i:'💥',n:'Шанс крита',v:'+5%',neg:false},{i:'⚡',n:'Множитель крита',v:'×1.65',neg:false},{i:'❤️',n:'Здоровье',v:'−10%',neg:true}] },
  };
  const BUFF_LBL = {
    strength:'⚔️ Сила', endurance:'🌀 Ловкость', stamina:'🛡 Выносливость',
    crit:'🎯 Интуиция', armor_pct:'🔰 Броня', dodge_pct:'💨 Уворот',
    hp_bonus:'❤️ HP', double_pct:'⚡ Двойной', accuracy:'👁 Точность',
    lifesteal_pct:'🩸 Вампир', gold_pct:'💰 Золото', xp_pct:'📚 Опыт',
  };
  const UPCOMING = [
    { i:'🔮', n:'Руны',        v:'скоро' },
    { i:'🎽', n:'Сеты брони',  v:'скоро' },
  ];
  const timeLeft = (iso) => {
    const ms = Math.max(0, new Date(iso + 'Z') - Date.now());
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  };

Object.assign(StatsScene.prototype, {

  _buildWarriorBadge(W, wbY) {
    const p = State.player;
    const wt = WT[p.warrior_type] || WT.tank;
    const wbH = 32;
    this._heroBonuses = { open:false, wt, W, wbY, wbH, refs:[] };
    const R = this._heroBonuses;

    const g = this.add.graphics().setDepth(2);
    g.fillStyle(wt.col, 1);
    g.fillRoundedRect(8, wbY, W-16, wbH, 8);
    g.lineStyle(2, 0xffffff, 0.35);
    g.strokeRoundedRect(8, wbY, W-16, wbH, 8);

    const cy = wbY + wbH/2;
    const nClass = wt.rows.length, nBuffs = (this._invData?.active_buffs || []).length;
    const nClan = (this._invData?.clan_bonus?.perks || []).length;
    const total = nClass + nBuffs + nClan;
    const sum = `+${total} бонус${total===1?'':(total<5?'а':'ов')}`;
    // Белый текст с тёмной обводкой — читается на любом фоне
    txt(this, 18, cy, `${wt.icon}  ${wt.name}`, 14, '#ffffff', true, '#000000').setOrigin(0, 0.5).setDepth(2);
    txt(this, W-42, cy, sum, 12, '#ffe888', true, '#000000').setOrigin(1, 0.5).setDepth(2);

    const chevBg = this.add.graphics().setDepth(2);
    chevBg.fillStyle(0x000000, 0.45); chevBg.fillCircle(W-22, cy, 11);
    chevBg.lineStyle(1.5, 0xffffff, 0.55); chevBg.strokeCircle(W-22, cy, 11);
    R.chev = txt(this, W-22, cy, '▾', 13, '#ffffff', true).setOrigin(0.5).setDepth(2);

    const z = this.add.zone(W/2, cy, W-16, wbH).setInteractive({ useHandCursor:true });
    z.on('pointerdown', () => { try { tg?.HapticFeedback?.selectionChanged(); } catch(_){} });
    z.on('pointerup', () => this._toggleHeroBonuses());
  },

  _toggleHeroBonuses() {
    const R = this._heroBonuses; if (!R) return;
    R.open ? this._closeHeroBonuses() : this._openHeroBonuses();
  },

  _closeHeroBonuses() {
    const R = this._heroBonuses; if (!R) return;
    if (R.updFn) { this.events.off('update', R.updFn); R.updFn = null; }
    R.refs.forEach(x => { try { x.destroy(); } catch(_){} });
    R.refs = []; R.open = false;
    if (R.chev) R.chev.setText('▾');
  },

  async _openHeroBonuses() {
    const R = this._heroBonuses; if (!R) return;
    if (!this._invData) {
      try { const d = await get('/api/shop/inventory'); if (d?.ok) this._invData = d; } catch(_){}
      if (!this.scene?.isActive()) return;
    }
    R.open = true; if (R.chev) R.chev.setText('▴');
    this._renderHeroBonusesPanel();
  },

  _renderHeroBonusesPanel() {
    const R = this._heroBonuses; if (!R || !R.open) return;
    R.refs.forEach(x => { try { x.destroy(); } catch(_){} }); R.refs = [];

    const { W, wbY, wbH, wt } = R, { H } = this;
    const panelX = 8, panelY = wbY + wbH + 4, panelW = W - 16;
    const maxH = Math.max(160, H * 0.935 - panelY - 8);

    // backdrop-zone (клик вне панели = закрыть)
    const back = this.add.zone(W/2, H/2, W, H).setInteractive().setDepth(2);
    back.on('pointerup', () => this._closeHeroBonuses());
    R.refs.push(back);

    // панель
    const bg = this.add.graphics().setDepth(3);
    bg.fillStyle(0x0d0a1c, 0.98); bg.fillRoundedRect(panelX, panelY, panelW, maxH, 10);
    bg.lineStyle(1, wt.col, 0.6); bg.strokeRoundedRect(panelX, panelY, panelW, maxH, 10);
    R.refs.push(bg);

    // секции
    const buffs = this._invData?.active_buffs || [];
    const charge = buffs.filter(b => b.charges != null);
    const timed  = buffs.filter(b => b.expires_at != null);
    const _eq = State.player?.eq_stats || {};
    const eqRows = [
      _eq.atk_bonus  > 0 && { i:'⚔️', n:'Урон',     v:`+${_eq.atk_bonus}`,     neg:false },
      _eq.hp_bonus   > 0 && { i:'❤️', n:'HP',        v:`+${_eq.hp_bonus}`,      neg:false },
      _eq.def_pct    > 0 && { i:'🛡',  n:'Броня',    v:`+${_eq.def_pct}%`,      neg:false },
      _eq.crit_bonus > 0 && { i:'💥', n:'Крит-стат', v:`+${_eq.crit_bonus}`,    neg:false },
      _eq.pen_pct    > 0 && { i:'🗡️', n:'Пробой',    v:`+${_eq.pen_pct}%`,     neg:false },
      _eq.dodge_bonus > 0 && { i:'💨', n:'Уворот',   v:`+${_eq.dodge_bonus}%`, neg:false },
      _eq.regen_bonus    > 0 && { i:'💚', n:'Регенерация', v:`+${_eq.regen_bonus} HP/раунд`, neg:false },
      _eq.lifesteal_pct  > 0 && { i:'🩸', n:'Вампиризм',   v:`+${_eq.lifesteal_pct}%`,       neg:false },
    ].filter(Boolean);
    const secs = [
      { title:'⚔️ Класс воина', rows: wt.rows },
      eqRows.length
        ? { title:'🪖 Экипировка', rows: eqRows }
        : { title:'🪖 Экипировка', empty:'нет бонусов · наденьте снаряжение' },
      charge.length
        ? { title:'📜 Свитки', rows: charge.map(b => ({
            i:'📜', n:BUFF_LBL[b.buff_type] || b.buff_type,
            v:`+${b.value}${b.buff_type.endsWith('_pct')?'%':''} · ${b.charges} боёв`, neg:false })) }
        : { title:'📜 Свитки', empty:'нет активных · купите в магазине' },
      timed.length
        ? { title:'🧪 Эликсиры', rows: timed.map(b => ({
            i:'🧪', n:BUFF_LBL[b.buff_type] || b.buff_type,
            v:`+${b.value}% · ${timeLeft(b.expires_at)}`, neg:false })) }
        : { title:'🧪 Эликсиры', empty:'нет активных · купите в магазине' },
      (() => {
        const cb = this._invData?.clan_bonus;
        if (!cb) return { title:'🏰 Клан', empty:'нет клана · вступите для бонусов' };
        const title = cb.clan_name ? `🏰 Клан · ${cb.clan_name}` : '🏰 Клан';
        return { title, rows: cb.perks.map(p => ({ i:p.icon, n:p.label, v:p.value, neg:false })) };
      })(),
      { title:'🔜 В разработке', rows: UPCOMING.map(u => ({ i:u.i, n:u.n, v:u.v, neg:false, soon:true })) },
    ];

    // содержимое в container — для скролла
    const cont = this.add.container(panelX, panelY + 8).setDepth(4);
    R.refs.push(cont);
    const viewH = maxH - 16;
    const maskG = this.make.graphics({ x:0, y:0, add:false });
    maskG.fillStyle(0xffffff, 1); maskG.fillRect(panelX, panelY + 8, panelW, viewH);
    cont.setMask(maskG.createGeometryMask());
    R.refs.push(maskG);

    const rowH = 20, sectH = 18, gap = 4;
    let y = 0;
    const add = (o) => cont.add(o);
    secs.forEach(sec => {
      add(txt(this, 10, y + sectH/2, sec.title, 10, '#8a7db3', true).setOrigin(0, 0.5));
      const ln = this.add.graphics();
      ln.lineStyle(1, wt.col, 0.25);
      ln.lineBetween(140, y + sectH/2, panelW - 10, y + sectH/2);
      add(ln);
      y += sectH + gap;
      if (sec.empty) {
        add(txt(this, panelW/2, y + rowH/2, sec.empty, 10, '#55506e').setOrigin(0.5));
        y += rowH;
      } else {
        sec.rows.forEach((row, i) => {
          if (i % 2 === 1) {
            const sg = this.add.graphics();
            sg.fillStyle(0xffffff, 0.025); sg.fillRoundedRect(4, y, panelW - 8, rowH, 4);
            add(sg);
          }
          add(txt(this, 14, y + rowH/2, row.i, 12).setOrigin(0, 0.5));
          add(txt(this, 34, y + rowH/2, row.n, 11, row.soon ? '#7a728f' : '#dcd8ef').setOrigin(0, 0.5));
          const vc = row.soon ? '#8a7db3' : (row.neg ? '#ff7e7e' : '#66dd99');
          add(txt(this, panelW - 12, y + rowH/2, row.v, 11, vc, true).setOrigin(1, 0.5));
          y += rowH;
        });
      }
      y += gap;
    });
    const contentH = y;

    // drag-скролл с инерцией (как в магазине)
    const scrollZ = this.add.zone(panelX, panelY, panelW, maxH).setOrigin(0)
      .setInteractive().setDepth(5);
    R.refs.push(scrollZ);
    let baseY = 0, sy = 0, dragY = 0, vel = 0, lastY = 0, lastT = 0, active = false, moved = false;
    const clamp = v => Math.min(0, Math.max(-(Math.max(0, contentH - viewH)), v));
    scrollZ.on('pointerdown', p => { sy = p.y; dragY = baseY; vel = 0; active = true; moved = false; lastY = p.y; lastT = this.game.loop.now; });
    scrollZ.on('pointermove', p => {
      if (!active) return;
      const dy = p.y - sy;
      if (Math.abs(dy) > 6) moved = true;
      const now = this.game.loop.now, dt = now - lastT;
      if (dt > 0) vel = (p.y - lastY) / dt * 16;
      lastY = p.y; lastT = now;
      baseY = clamp(dragY + dy); cont.setY(panelY + 8 + baseY);
    });
    scrollZ.on('pointerup', p => {
      if (!active) return; active = false;
      if (!moved) this._closeHeroBonuses();
    });
    scrollZ.on('pointerout', () => { active = false; });
    R.updFn = () => {
      if (Math.abs(vel) < 0.15) { vel = 0; return; }
      baseY = clamp(baseY + vel); vel *= 0.88; cont.setY(panelY + 8 + baseY);
    };
    this.events.on('update', R.updFn);
  },
});

})();
