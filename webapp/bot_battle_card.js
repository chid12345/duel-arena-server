/* ============================================================
   BotBattleCard — всплывающая карточка соперника для HTML-режима боя.
   Открывается тапом по нику в шапке. Показывает persona-статус,
   статы и список надетых предметов по слотам с цветом редкости.
   ============================================================ */

const BotBattleCard = (() => {
  const PERSONA_META = {
    novice:  {emoji:'🌱', label:'Новичок',     col:'#9ad9a0'},
    farmer:  {emoji:'⚔️', label:'Фармила',     col:'#9abae0'},
    major:   {emoji:'💎', label:'Мажор',       col:'#c89aff'},
    donator: {emoji:'👑', label:'Босс-донатер', col:'#ffc83c'},
  };
  const SLOT_ICON = {weapon:'🗡', shield:'🛡', armor:'👕', belt:'🪖', boots:'👢', ring1:'💍', ring2:'💍'};
  let overlay = null;

  function _injectCss() {
    if (document.getElementById('bbc-css')) return;
    const s = document.createElement('style'); s.id = 'bbc-css';
    s.textContent = `
      #bbc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#eee;}
      #bbc-card{width:min(310px,90vw);background:linear-gradient(180deg,#141420,#0f0d18);border:2px solid #444466;border-radius:12px;padding:0;box-sizing:border-box;}
      #bbc-card.prem{border-color:#ffc83c;box-shadow:0 0 0 3px rgba(255,200,60,.10);}
      .bbc-head{display:flex;justify-content:space-between;align-items:center;padding:9px 12px 0;font-size:10px;font-weight:700;}
      .bbc-close{cursor:pointer;color:#ddddff;font-size:14px;padding:0 4px;}
      .bbc-name{text-align:center;font-size:15px;font-weight:700;margin-top:5px;}
      .bbc-lv{text-align:center;font-size:10px;color:#ccccee;margin-top:5px;}
      .bbc-div{height:1px;background:#2a2850;margin:6px 12px;opacity:.5;}
      .bbc-body{display:flex;padding:5px 12px;}
      .bbc-sprite{flex:0 0 80px;height:104px;display:flex;align-items:center;justify-content:center;}
      .bbc-sprite img{max-width:100%;max-height:100%;}
      .bbc-right{flex:1;}
      .bbc-hp-row{display:flex;justify-content:space-between;font-size:9px;color:#ddddff;}
      .bbc-hp-bar{height:9px;background:#0a0a18;border-radius:4px;margin-top:4px;overflow:hidden;}
      .bbc-hp-fill{height:100%;border-radius:4px;}
      .bbc-stats{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;margin-top:8px;}
      .bbc-stat{display:flex;align-items:center;gap:6px;}
      .bbc-stat-i{font-size:14px;}
      .bbc-stat-l{font-size:10px;color:#ccccee;}
      .bbc-stat-v{font-size:13px;font-weight:700;}
      .bbc-gear{margin-top:8px;border-top:1px dashed #2a2850;padding:6px 12px 10px;}
      .bbc-gear-title{text-align:center;font-size:9px;color:#aaaacc;font-weight:700;letter-spacing:1px;margin-bottom:6px;}
      /* Equip-grid: 3 колонки (левая 64px / центр 1fr / правая 64px), 3 ряда. */
      .bbc-equip{display:grid;grid-template-columns:64px 1fr 64px;grid-template-rows:repeat(3,64px);gap:6px;align-items:stretch;}
      .bbc-equip .bbc-eq-sprite{grid-column:2;grid-row:1 / 4;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 55%, rgba(180,90,255,.20), transparent 70%);border-radius:10px;}
      .bbc-equip .bbc-eq-sprite img{max-width:100%;max-height:100%;object-fit:contain;}
      .bbc-equip .bbc-eq-slot{background:linear-gradient(180deg,#1f1d2e,#16142a);border:1.5px solid #2a2840;border-radius:7px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:2px 2px 3px;text-align:center;position:relative;overflow:hidden;}
      .bbc-equip .bbc-eq-slot.empty{opacity:.35;border-style:dashed;}
      .bbc-equip .bbc-eq-label{font-size:7px;color:#aaaacc;letter-spacing:.4px;font-weight:700;text-transform:uppercase;}
      .bbc-equip .bbc-eq-img{flex:1;display:flex;align-items:center;justify-content:center;width:100%;margin:1px 0;}
      .bbc-equip .bbc-eq-img img{max-width:30px;max-height:30px;object-fit:contain;}
      .bbc-equip .bbc-eq-emoji{font-size:22px;line-height:1;}
      .bbc-equip .bbc-eq-name{font-size:7px;font-weight:700;line-height:1.1;max-width:60px;word-wrap:break-word;padding:0 2px;}
      .bbc-timer{position:absolute;top:8px;left:14px;font-size:10px;color:#9abae0;background:rgba(0,0,0,.4);padding:2px 6px;border-radius:4px;font-family:monospace;}
      .bbc-timer.warn{color:#ff8044;}
      .bbc-empty{text-align:center;font-size:10px;color:#666688;padding:8px;}
    `;
    document.head.appendChild(s);
  }

  // Маппинг item_id → BASE имя файла (без расширения). В webapp/ файлы лежат
  // с разными расширениями (shield_free*.jpeg, boots_dia*.jpg, helmet_*.png),
  // поэтому фронт пробует .png → .jpg → .jpeg через onerror chain.
  const _ARMOR_CLASS_MAP = {
    tank_free:'armor_free1',      agile_free:'armor_free2',
    crit_free:'armor_free3',      universal_free:'armor_free4',
    berserker_gold:'armor_gold1', assassin_gold:'armor_gold2',
    mage_gold:'armor_gold3',      paladin_gold:'armor_gold4',
    dragonknight_diamonds:'armor_dia1', shadowdancer_diamonds:'armor_dia2',
    archmage_diamonds:'armor_dia3',     universal_diamonds:'armor_dia4',
    berserker_mythic:'armor_mythic1',   assassin_mythic:'armor_mythic2',
    archmage_mythic:'armor_mythic3',    legendary_usdt:'armor_mythic4',
  };
  function _itemImageBase(it) {
    const id = it.item_id || '';
    const slot = it.slot;
    const rar = it.rarity || 'common';
    if (slot === 'shield' || slot === 'belt' || slot === 'ring1' || slot === 'boots') {
      return id;
    }
    if (slot === 'armor') {
      // Wardrobe class_id → точная текстура (например assassin_mythic → armor_mythic2)
      if (_ARMOR_CLASS_MAP[id]) return _ARMOR_CLASS_MAP[id];
      // Stat armor (armor_leather/chain/dragon) → по редкости
      const m = {common:'armor_free1', rare:'armor_gold1', epic:'armor_dia1', mythic:'armor_mythic1'};
      return m[rar] || 'armor_free1';
    }
    if (slot === 'weapon') {
      const parts = id.split('_');
      const wtype = parts[0] || 'sword';
      const sfx = parts[1] || '';
      // Новый каталог: _free/_gold/_diamond/_mythic; старый: _iron/_steel/_chaos
      const sfxMap = {gold:'rare', diamond:'epic', mythic:'mythic', free:'free',
                      steel:'rare', iron:'free'};
      const rarMap = {common:'free', rare:'rare', epic:'epic', mythic:'mythic'};
      const rcl = sfxMap[sfx] || rarMap[rar] || 'free';
      const types = ['sword','axe','club','gs'];
      const t = types.includes(wtype) ? wtype : 'sword';
      return `weapon_${t}_${rcl}`;
    }
    return null;
  }

  // Глобальный fallback для онэррора: пробуем по очереди .jpg → .jpeg, иначе эмодзи.
  if (typeof window !== 'undefined' && !window._bbcImgFb) {
    window._bbcImgFb = function(img) {
      const tries = (img.dataset.tries || '').split(',').filter(Boolean);
      if (!tries.length) {
        const slot = img.dataset.slot || '';
        const E = {weapon:'🗡',shield:'🛡',armor:'👕',belt:'🪖',boots:'👢',ring1:'💍'};
        if (img.parentNode) img.parentNode.innerHTML = '<span class="bbc-eq-emoji">' + (E[slot]||'•') + '</span>';
        return;
      }
      const next = tries.shift();
      img.dataset.tries = tries.join(',');
      img.src = (img.dataset.base || '') + '.' + next;
    };
  }

  function _spriteHtml(b, who) {
    if (who === 'me') {
      const wt = ((typeof State !== 'undefined' ? State : window.State)?.player?.warrior_type || 'crit');
      const url = (typeof getWarriorSkinPath === 'function') ? getWarriorSkinPath(wt) : 'skins/crit/1.png';
      return `<img src="${url}" alt="">`;
    }
    const skinId = b.opp_skin_id;
    if (skinId) return `<img src="bot_skins/${skinId}.png" alt="">`;
    const oppWt = b.opp_warrior_type || 'tank';
    const oppUrl = (typeof getWarriorSkinPath === 'function') ? getWarriorSkinPath(oppWt) : 'skins/sila/1.png';
    return `<img src="${oppUrl}" alt="">`;
  }

  function _show(who) {
    _injectCss();
    if (overlay) _hide();
    const b  = (typeof State !== 'undefined' ? State : window.State)?.battle || {};
    const me = (typeof State !== 'undefined' ? State : window.State)?.player || {};
    const isMe = who === 'me';
    const isPrem = isMe ? !!me.is_premium : !!b.opp_is_premium;
    const isBot  = isMe ? false : !!b.opp_is_bot;
    const name   = isMe ? (me.username || 'Вы')      : (b.opp_name  || 'Соперник');
    const level  = isMe ? (me.level    || 1)         : (b.opp_level || 1);
    const rating = isMe ? (me.rating   || '—')       : (b.opp_rating || '—');
    const curHp  = isMe ? (b.my_hp  || 0) : (b.opp_hp  || 0);
    const maxHp  = isMe ? (b.my_max_hp || 1) : (b.opp_max_hp || 1);
    const persona = (!isMe && isBot) ? b.opp_persona : null;
    // Для своей карточки — my_items, для соперника (бот ИЛИ человек в PvP) — opp_items.
    const items = isMe ? (b.my_items || []) : (b.opp_items || []);
    const meta = persona ? PERSONA_META[persona] : null;
    const head = meta ? `<span style="color:${meta.col}">${meta.emoji} ${meta.label}</span>` :
                 isMe  ? '<span style="color:#5096ff">🧑 Вы</span>' :
                 isBot ? '<span style="color:#ccccee">🤖 Бот</span>' :
                         '<span style="color:#3cc864">⚔️ Игрок</span>';
    const stats = isMe
      ? [['💪','Сила', me.strength||0,'#dc3c46'], ['🤸','Ловкость', me.agility||0,'#3cc8dc'],
         ['💥','Интуиция', me.intuition||0,'#b45aff'], ['🛡','Выносл.', me.stamina||0,'#3cc864']]
      : [['💪','Сила', b.opp_strength||0,'#dc3c46'], ['🤸','Ловкость', b.opp_agility||0,'#3cc8dc'],
         ['💥','Интуиция', b.opp_intuition||0,'#b45aff'], ['🛡','Выносл.', b.opp_stamina||0,'#3cc864']];

    const hpPct = Math.min(1, Math.max(0, curHp/maxHp));
    const hpCol = hpPct > 0.5 ? '#3cc864' : hpPct > 0.25 ? '#ffc83c' : '#dc3c46';
    const nameStr = (isPrem ? '👑 ' : '') + name;

    // Layout: левая колонка — Шлем/Броня/Сапоги (как кнопки атаки сверху→вниз),
    // центр — спрайт бота на 3 ряда, правая колонка — Оружие/Щит/Кольцо.
    const SLOT_LAYOUT = {
      belt:   {row: 1, col: 1, label: 'Шлем'},
      armor:  {row: 2, col: 1, label: 'Броня'},
      boots:  {row: 3, col: 1, label: 'Сапоги'},
      weapon: {row: 1, col: 3, label: 'Оружие'},
      shield: {row: 2, col: 3, label: 'Щит'},
      ring1:  {row: 3, col: 3, label: 'Кольцо'},
    };
    const itemsBySlot = {};
    items.forEach(it => { itemsBySlot[it.slot] = it; });
    const renderSlot = (slot) => {
      const it = itemsBySlot[slot];
      const meta = SLOT_LAYOUT[slot];
      if (!meta) return '';
      const style = `grid-row:${meta.row};grid-column:${meta.col};` +
                    (it ? `border-color:${it.color};box-shadow:inset 0 0 8px ${it.color}33;` : '');
      const cls = it ? '' : 'empty';
      const nm = it ? (it.name.length > 13 ? it.name.slice(0, 12) + '…' : it.name) : '';
      // Картинка предмета: пробуем .png → .jpg → .jpeg → fallback эмодзи.
      const base = it ? _itemImageBase(it) : null;
      const visual = base
        ? `<div class="bbc-eq-img"><img src="${base}.png" data-base="${base}" data-tries="jpg,jpeg" data-slot="${slot}" onerror="window._bbcImgFb && window._bbcImgFb(this)"></div>`
        : `<div class="bbc-eq-img"><span class="bbc-eq-emoji">${SLOT_ICON[slot] || '•'}</span></div>`;
      return `<div class="bbc-eq-slot ${cls}" style="${style}">
        <div class="bbc-eq-label">${meta.label}</div>
        ${visual}
        ${it ? `<div class="bbc-eq-name" style="color:${it.color}">${nm}</div>` : ''}
      </div>`;
    };
    const equipHtml = `
      <div class="bbc-equip">
        <div class="bbc-eq-sprite">${_spriteHtml(b, who)}</div>
        ${['belt','armor','boots','weapon','shield','ring1'].map(renderSlot).join('')}
      </div>`;
    // Equip-grid строим всегда (своя карточка / бот / PvP-соперник) — items
    // подтягиваются с бэка для всех трёх случаев.
    const gearBlock = `<div class="bbc-gear"><div class="bbc-gear-title">🎽 ЧТО ОДЕТО</div>${equipHtml}</div>`;

    overlay = document.createElement('div');
    overlay.id = 'bbc-overlay';
    // Таймер хода — чтобы игрок не пропустил ход разглядывая карточку.
    const initialDeadline = Math.max(1, Number(b.deadline_sec) || 15);
    const showTimer = !!b.deadline_sec;
    overlay.innerHTML = `
      <div id="bbc-card" class="${isPrem?'prem':''}">
        ${showTimer ? `<div class="bbc-timer" id="bbc-timer">⏱ ${initialDeadline}с</div>` : ''}
        <div class="bbc-head">
          <div>${head}</div>
          <div class="bbc-close" id="bbc-close">✕</div>
        </div>
        <div class="bbc-name" style="color:${isPrem?'#ffc83c':'#f0f0fa'}">${nameStr}</div>
        <div class="bbc-lv" style="color:${(!isMe && isBot && (b.opp_win_streak||0) > 0) ? '#ff8044' : '#ccccee'}">Ур. ${level} · ★ ${rating}${(!isMe && isBot && (b.opp_win_streak||0) > 0) ? `  ·  🔥 ${b.opp_win_streak} подряд` : ''}</div>
        <div class="bbc-div"></div>
        <div style="padding:6px 14px 0;">
          <div class="bbc-hp-row"><span>❤️ HP</span><span style="color:${hpCol}">${curHp} / ${maxHp}</span></div>
          <div class="bbc-hp-bar"><div class="bbc-hp-fill" style="width:${hpPct*100}%;background:${hpCol}"></div></div>
          <div class="bbc-stats" style="grid-template-columns:repeat(4,1fr);text-align:center;">
            ${stats.map(s=>`
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                <span style="font-size:14px">${s[0]}</span>
                <span style="font-size:13px;font-weight:700;color:${s[3]}">${s[2]}</span>
                <span style="font-size:9px;color:#aaaacc">${s[1]}</span>
              </div>`).join('')}
          </div>
        </div>
        ${gearBlock}
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.id === 'bbc-close') _hide();
    });
    // Тикаем таймер: за 3 сек до AFK закрываем карточку, чтобы игрок успел походить.
    if (showTimer) {
      const startedAt = Date.now();
      const tEl = overlay.querySelector('#bbc-timer');
      overlay._ticker = setInterval(() => {
        if (!overlay) return;
        const left = Math.max(0, initialDeadline - (Date.now() - startedAt) / 1000);
        if (tEl) {
          tEl.textContent = `⏱ ${Math.ceil(left)}с`;
          tEl.classList.toggle('warn', left <= 5);
        }
        if (left <= 3) _hide();
      }, 250);
    }
    try { window.tg?.HapticFeedback?.impactOccurred('light'); } catch(_){}
  }

  function _hide() {
    if (!overlay) return;
    try { if (overlay._ticker) clearInterval(overlay._ticker); } catch(_){}
    try { overlay.parentNode && overlay.parentNode.removeChild(overlay); } catch(_){}
    overlay = null;
  }

  return {
    show: _show,
    hide: _hide,
    isOpen: () => !!overlay,
  };
})();

if (typeof window !== 'undefined') window.BotBattleCard = BotBattleCard;

// Делегированный обработчик клика по нику в HTML-режиме боя.
// Дублирует обработчик из bot_battle_html.js — если старый файл закэширован
// в Telegram WebView и не получил последних правок, эта обвязка всё равно
// откроет карточку. Безопасно, проверяет что overlay не открыт.
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (BotBattleCard.isOpen()) return;
    const tgt = e.target;
    if (!tgt || !tgt.closest) return;
    if (tgt.closest('#bb-p2n')) BotBattleCard.show('opp');
    else if (tgt.closest('#bb-p1n')) BotBattleCard.show('me');
  }, true);
}

// Видимый бейдж версии — игрок сразу понимает «новая у меня сборка или старая».
// Если этого бейджа нет на экране — Mini App кэшируется, надо закрыть/открыть заново.
// Также показывает текущий warrior_type — диагностика «какой скин ожидается в бою».
(function _injectBuildBadge() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('da-build-badge')) return;
  const v = window.BUILD_VERSION || '?';
  const make = () => {
    if (document.getElementById('da-build-badge')) return;
    const d = document.createElement('div');
    d.id = 'da-build-badge';
    d.textContent = 'v' + v;
    Object.assign(d.style, {
      position: 'fixed', right: '4px', bottom: '4px',
      background: 'rgba(0,0,0,.55)', color: '#aaa',
      fontSize: '9px', fontFamily: 'system-ui, sans-serif',
      padding: '2px 6px', borderRadius: '4px',
      zIndex: '999', pointerEvents: 'none',
    });
    document.body.appendChild(d);
    // Лёгкий диагностический бейдж: показывает текущий warrior_type. Раз в 3с.
    setInterval(() => {
      let wt = '?';
      try {
        if (typeof State !== 'undefined' && State.player) wt = State.player.warrior_type || '?';
      } catch(_) {}
      d.textContent = 'v' + v + ' | wt:' + wt;
    }, 3000);
  };
  if (document.body) make();
  else document.addEventListener('DOMContentLoaded', make, {once: true});
})();
