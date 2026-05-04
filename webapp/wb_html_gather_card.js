/* wb_html_gather_card.js — полная карточка игрока в зале ожидания рейда.
   Зависит от: get() (game_globals.js), getWarriorSkinPath().
   Экспортирует: window.WBHtml.showGatherCard(p). */
(() => {
  function _esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _uidNum(uid) { return Number(uid) || 0; }

  function _myTgId() {
    return _uidNum(window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
  }
  function _nameFor(p) {
    const myId = _myTgId();
    if (myId && _uidNum(p && p.user_id) === myId) {
      const tgu = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
      const my = tgu.username || tgu.first_name || '';
      if (my) return my;
    }
    const n = (p && p.name) || '';
    if (n && n !== 'Игрок') return n;
    const uid = Math.abs(_uidNum(p && p.user_id));
    return `Воин #${String(uid % 10000).padStart(4,'0')}`;
  }

  function _ensureCss() {
    if (document.getElementById('wb-gth-bbc-css')) return;
    const s = document.createElement('style'); s.id = 'wb-gth-bbc-css';
    s.textContent = `
      #wb-gth-pcard{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#eee}
      #wb-gth-bbc{width:min(310px,90vw);background:linear-gradient(180deg,#141420,#0f0d18);border:2px solid #444466;border-radius:12px;padding:0;box-sizing:border-box}
      #wb-gth-bbc.prem{border-color:#ffc83c;box-shadow:0 0 0 3px rgba(255,200,60,.10)}
      .bbc-head{display:flex;justify-content:space-between;align-items:center;padding:9px 12px 0;font-size:10px;font-weight:700}
      .bbc-close{cursor:pointer;color:#ddddff;font-size:14px;padding:0 4px}
      .bbc-name{text-align:center;font-size:15px;font-weight:700;margin-top:5px}
      .bbc-lv{text-align:center;font-size:10px;color:#ccccee;margin-top:5px}
      .bbc-div{height:1px;background:#2a2850;margin:6px 12px;opacity:.5}
      .bbc-hp-row{display:flex;justify-content:space-between;font-size:9px;color:#ddddff}
      .bbc-hp-bar{height:9px;background:#0a0a18;border-radius:4px;margin-top:4px;overflow:hidden}
      .bbc-hp-fill{height:100%;border-radius:4px}
      .bbc-stats{display:grid;gap:5px 10px;margin-top:8px}
      .bbc-gear{margin-top:8px;border-top:1px dashed #2a2850;padding:6px 12px 10px}
      .bbc-gear-title{text-align:center;font-size:9px;color:#aaaacc;font-weight:700;letter-spacing:1px;margin-bottom:6px}
      .bbc-equip{display:grid;grid-template-columns:64px 1fr 64px;grid-template-rows:repeat(3,64px);gap:6px;align-items:stretch}
      .bbc-equip .bbc-eq-sprite{grid-column:2;grid-row:1/4;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 55%,rgba(180,90,255,.20),transparent 70%);border-radius:10px}
      .bbc-equip .bbc-eq-sprite img{max-width:100%;max-height:100%;object-fit:contain}
      .bbc-equip .bbc-eq-slot{background:linear-gradient(180deg,#1f1d2e,#16142a);border:1.5px solid #2a2840;border-radius:7px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:2px 2px 3px;text-align:center;position:relative;overflow:hidden}
      .bbc-equip .bbc-eq-slot.empty{opacity:.35;border-style:dashed}
      .bbc-equip .bbc-eq-label{font-size:7px;color:#aaaacc;letter-spacing:.4px;font-weight:700;text-transform:uppercase}
      .bbc-equip .bbc-eq-img{flex:1;display:flex;align-items:center;justify-content:center;width:100%;margin:1px 0}
      .bbc-equip .bbc-eq-img img{max-width:30px;max-height:30px;object-fit:contain;mix-blend-mode:lighten;filter:drop-shadow(0 0 5px rgba(180,120,255,.5))}
      .bbc-equip .bbc-eq-emoji{font-size:22px;line-height:1}
      .bbc-equip .bbc-eq-name{font-size:7px;font-weight:700;line-height:1.1;max-width:60px;word-wrap:break-word;padding:0 2px}
    `;
    document.head.appendChild(s);
  }

  const _ARMOR_MAP = {
    tank_free:'armor_free1',agile_free:'armor_free2',crit_free:'armor_free3',universal_free:'armor_free4',
    berserker_gold:'armor_gold1',assassin_gold:'armor_gold2',mage_gold:'armor_gold3',paladin_gold:'armor_gold4',
    dragonknight_diamonds:'armor_dia1',shadowdancer_diamonds:'armor_dia2',archmage_diamonds:'armor_dia3',universal_diamonds:'armor_dia4',
    berserker_mythic:'armor_mythic1',assassin_mythic:'armor_mythic2',archmage_mythic:'armor_mythic3',legendary_usdt:'armor_mythic4',
  };
  const _SLOT_ICON  = {weapon:'🗡',shield:'🛡',armor:'👕',belt:'🪖',boots:'👢',ring1:'💍'};
  const _SLOT_LABEL = {weapon:'Оружие',shield:'Щит',armor:'Броня',belt:'Шлем',boots:'Сапоги',ring1:'Кольцо'};
  const _SLOT_POS   = {belt:{r:1,c:1},armor:{r:2,c:1},boots:{r:3,c:1},weapon:{r:1,c:3},shield:{r:2,c:3},ring1:{r:3,c:3}};

  function _imgFb(img) {
    const tries = (img.dataset.tries||'').split(',').filter(Boolean);
    if (!tries.length) {
      const slot = img.dataset.slot||'';
      if (img.parentNode) img.parentNode.innerHTML = `<span class="bbc-eq-emoji">${_SLOT_ICON[slot]||'•'}</span>`;
      return;
    }
    img.src = (img.dataset.base||'') + '.' + tries.shift();
    img.dataset.tries = tries.join(',');
  }

  function _itemBase(it) {
    const id = it.item_id||'', slot = it.slot, rar = it.rarity||'common';
    if (['shield','belt','ring1','boots'].includes(slot)) return id;
    if (slot === 'armor') return _ARMOR_MAP[id] || ({common:'armor_free1',rare:'armor_gold1',epic:'armor_dia1',mythic:'armor_mythic1'}[rar]||'armor_free1');
    if (slot === 'weapon') {
      const parts = id.split('_'), wt = parts[0]||'sword', sfx = parts[1]||'';
      const rcl = {gold:'rare',diamond:'epic',mythic:'mythic',free:'free',steel:'rare',iron:'free'}[sfx]||{common:'free',rare:'rare',epic:'epic',mythic:'mythic'}[rar]||'free';
      return `weapon_${['sword','axe','club','gs'].includes(wt)?wt:'sword'}_${rcl}`;
    }
    return null;
  }

  function _slotHtml(slot, it) {
    const L = _SLOT_POS[slot]; if (!L) return '';
    const style = `grid-row:${L.r};grid-column:${L.c};`+(it?`border-color:${it.color};box-shadow:inset 0 0 8px ${it.color}33;`:'');
    const base = it ? _itemBase(it) : null;
    const visual = base
      ? `<div class="bbc-eq-img"><img src="${base}.png" data-base="${base}" data-tries="jpg,jpeg" data-slot="${slot}" onerror="window._wbGthImgFb&&window._wbGthImgFb(this)"></div>`
      : `<div class="bbc-eq-img"><span class="bbc-eq-emoji">${_SLOT_ICON[slot]||'•'}</span></div>`;
    const nm = it ? _esc(String(it.name||'').slice(0,13)) : '';
    return `<div class="bbc-eq-slot${it?'':' empty'}" style="${style}">
      <div class="bbc-eq-label">${_SLOT_LABEL[slot]||slot}</div>${visual}
      ${it?`<div class="bbc-eq-name" style="color:${it.color}">${nm}</div>`:''}
    </div>`;
  }

  async function showGatherCard(p) {
    document.getElementById('wb-gth-pcard')?.remove();
    _ensureCss();
    window._wbGthImgFb = _imgFb;

    const uid  = _uidNum(p.user_id);
    const myId = _myTgId();

    const wrap = document.createElement('div'); wrap.id = 'wb-gth-pcard';
    wrap.innerHTML = `<div id="wb-gth-bbc"><div style="padding:44px;text-align:center;color:#888;font-size:13px">⏳ Загрузка...</div></div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });

    let d;
    try { d = await get(`/api/player/public/${uid}`); } catch(_) { d = null; }
    if (!document.getElementById('wb-gth-pcard')) return;

    if (!d?.ok) {
      d = { ok:true, user_id:uid, username:_nameFor(p), level:p.level||'?',
            wins:0, losses:0, rating:0, max_hp:p.max_hp||0, current_hp:p.max_hp||0,
            strength:p.strength||0, endurance:0, crit:0, stamina:0,
            warrior_type:'tank', is_premium:false, win_streak:0, items:[] };
    }

    const isMe   = uid === myId;
    const isPrem = d.is_premium;
    const nm     = _esc(String(d.username||`ID${uid}`).slice(0,22));
    const wt     = d.warrior_type || 'tank';
    const skinUrl = (typeof getWarriorSkinPath === 'function') ? getWarriorSkinPath(wt) : 'skins/sila/1.png';
    const hpPct  = d.max_hp > 0 ? Math.min(1, Math.max(0, d.current_hp / d.max_hp)) : 1;
    const hpCol  = hpPct > 0.5 ? '#3cc864' : hpPct > 0.25 ? '#ffc83c' : '#dc3c46';

    const headLabel = isMe ? '<span style="color:#5096ff">🧑 Вы</span>'
                    : isPrem ? '<span style="color:#ffc83c">👑 Игрок</span>'
                    : '<span style="color:#ff8844">⚔️ Участник</span>';

    const itemsBySlot = {};
    (d.items||[]).forEach(it => { itemsBySlot[it.slot] = it; });
    const equipSlots = ['belt','armor','boots','weapon','shield','ring1'].map(sl => _slotHtml(sl, itemsBySlot[sl])).join('');

    const stats = [
      ['💪','Сила',     d.strength||0, '#dc3c46'],
      ['🤸','Ловкость', d.endurance||0,'#3cc8dc'],
      ['💥','Интуиция', d.crit||0,     '#b45aff'],
      ['🛡','Выносл.',  d.stamina||0,  '#3cc864'],
    ];

    wrap.querySelector('#wb-gth-bbc').outerHTML = `
      <div id="wb-gth-bbc" class="${isPrem?'prem':''}">
        <div class="bbc-head">
          <div>${headLabel}${d.win_streak>0?` · <span style="color:#ff8044">🔥${d.win_streak}</span>`:''}</div>
          <div class="bbc-close" id="wb-gth-bbc-x">✕</div>
        </div>
        <div class="bbc-name" style="color:${isPrem?'#ffc83c':isMe?'#00f5ff':'#f0f0fa'}">${isPrem?'👑 ':''}${nm}</div>
        <div class="bbc-lv">Ур. ${d.level||'?'} · ★ ${d.rating||'—'} · ⚔️ Рейд</div>
        <div class="bbc-div"></div>
        <div style="padding:6px 14px 0">
          <div class="bbc-hp-row"><span>❤️ HP</span><span style="color:${hpCol}">${d.current_hp} / ${d.max_hp}</span></div>
          <div class="bbc-hp-bar"><div class="bbc-hp-fill" style="width:${hpPct*100}%;background:${hpCol}"></div></div>
          <div class="bbc-stats" style="grid-template-columns:repeat(4,1fr);text-align:center;margin-top:8px">
            ${stats.map(s=>`<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
              <span style="font-size:14px">${s[0]}</span>
              <span style="font-size:13px;font-weight:700;color:${s[3]}">${s[2]}</span>
              <span style="font-size:9px;color:#aaaacc">${s[1]}</span>
            </div>`).join('')}
          </div>
        </div>
        <div class="bbc-gear">
          <div class="bbc-gear-title">🎽 ЧТО ОДЕТО</div>
          <div class="bbc-equip">
            <div class="bbc-eq-sprite"><img src="${skinUrl}" alt=""></div>
            ${equipSlots}
          </div>
        </div>
      </div>`;

    document.getElementById('wb-gth-bbc-x')?.addEventListener('click', () => wrap.remove());
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
  }

  Object.assign(window.WBHtml = window.WBHtml || {}, { showGatherCard });
})();
