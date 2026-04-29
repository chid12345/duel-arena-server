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
      #bbc-card{width:min(360px,92vw);background:linear-gradient(180deg,#141420,#0f0d18);border:2px solid #444466;border-radius:14px;padding:0;box-sizing:border-box;}
      #bbc-card.prem{border-color:#ffc83c;box-shadow:0 0 0 3px rgba(255,200,60,.10);}
      .bbc-head{display:flex;justify-content:space-between;align-items:center;padding:11px 14px 0;font-size:11px;font-weight:700;}
      .bbc-close{cursor:pointer;color:#ddddff;font-size:16px;padding:0 4px;}
      .bbc-name{text-align:center;font-size:17px;font-weight:700;margin-top:6px;}
      .bbc-lv{text-align:center;font-size:11px;color:#ccccee;margin-top:6px;}
      .bbc-div{height:1px;background:#2a2850;margin:8px 12px;opacity:.5;}
      .bbc-body{display:flex;padding:6px 14px;}
      .bbc-sprite{flex:0 0 95px;height:120px;display:flex;align-items:center;justify-content:center;}
      .bbc-sprite img{max-width:100%;max-height:100%;}
      .bbc-right{flex:1;}
      .bbc-hp-row{display:flex;justify-content:space-between;font-size:10px;color:#ddddff;}
      .bbc-hp-bar{height:11px;background:#0a0a18;border-radius:4px;margin-top:6px;overflow:hidden;}
      .bbc-hp-fill{height:100%;border-radius:4px;}
      .bbc-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;margin-top:10px;}
      .bbc-stat{display:flex;align-items:center;gap:8px;}
      .bbc-stat-i{font-size:17px;}
      .bbc-stat-l{font-size:11px;color:#ccccee;}
      .bbc-stat-v{font-size:15px;font-weight:700;}
      .bbc-gear{margin-top:10px;border-top:1px dashed #2a2850;padding:8px 14px 12px;}
      .bbc-gear-title{text-align:center;font-size:9px;color:#aaaacc;font-weight:700;letter-spacing:1px;margin-bottom:8px;}
      .bbc-equip{display:grid;grid-template-columns:64px 1fr 64px;grid-template-rows:64px 1fr 64px;gap:6px;align-items:stretch;justify-items:stretch;}
      .bbc-equip .bbc-eq-sprite{grid-column:2;grid-row:2;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 60%, rgba(180,90,255,.18), transparent 70%);border-radius:8px;min-height:80px;}
      .bbc-equip .bbc-eq-sprite img{max-width:100%;max-height:110px;}
      .bbc-equip .bbc-eq-slot{background:#1a1828;border:1.5px solid #2a2840;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3px 2px;text-align:center;min-height:64px;}
      .bbc-equip .bbc-eq-slot.empty{opacity:.35;border-style:dashed;}
      .bbc-equip .bbc-eq-icon{font-size:18px;line-height:1.1;}
      .bbc-equip .bbc-eq-label{font-size:8px;color:#888;margin-top:1px;letter-spacing:.3px;}
      .bbc-equip .bbc-eq-name{font-size:8px;font-weight:700;margin-top:1px;line-height:1.1;max-width:60px;word-wrap:break-word;}
      .bbc-empty{text-align:center;font-size:10px;color:#666688;padding:8px;}
    `;
    document.head.appendChild(s);
  }

  function _spriteHtml(b, who) {
    if (who === 'me') {
      const wt = ((typeof State !== 'undefined' ? State : window.State)?.player?.warrior_type || 'crit');
      const key = ['tank','agile','crit'].includes(wt) ? `warrior_${wt}` : 'warrior_crit';
      return `<img src="warriors/${key}.png" alt="">`;
    }
    const skinId = b.opp_skin_id;
    if (skinId) return `<img src="bot_skins/${skinId}.png" alt="">`;
    return `<img src="warriors/warrior_tank.png" alt="">`;
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
    const items = (!isMe && isBot) ? (b.opp_items || []) : [];
    const meta = persona ? PERSONA_META[persona] : null;
    const head = meta ? `<span style="color:${meta.col}">${meta.emoji} ${meta.label}</span>` :
                 (isMe ? '<span style="color:#5096ff">🧑 Вы</span>' : '<span style="color:#ccccee">🤖 Бот</span>');
    const stats = isMe
      ? [['💪','Сила', me.strength||0,'#dc3c46'], ['🤸','Ловкость', me.agility||0,'#3cc8dc'],
         ['💥','Интуиция', me.intuition||0,'#b45aff'], ['🛡','Выносл.', me.stamina||0,'#3cc864']]
      : [['💪','Сила', b.opp_strength||0,'#dc3c46'], ['🤸','Ловкость', b.opp_agility||0,'#3cc8dc'],
         ['💥','Интуиция', b.opp_intuition||0,'#b45aff'], ['🛡','Выносл.', b.opp_stamina||0,'#3cc864']];

    const hpPct = Math.min(1, Math.max(0, curHp/maxHp));
    const hpCol = hpPct > 0.5 ? '#3cc864' : hpPct > 0.25 ? '#ffc83c' : '#dc3c46';
    const nameStr = (isPrem ? '👑 ' : '') + name;

    // Equipment grid: спрайт по центру, 6 слотов вокруг (как в гардеробе игрока).
    // Индекс по слоту — позиция в 3x3 сетке.
    const SLOT_LAYOUT = {
      belt:   {row: 1, col: 2, label: 'Шлем'},
      weapon: {row: 2, col: 1, label: 'Оружие'},
      shield: {row: 2, col: 3, label: 'Щит'},
      ring1:  {row: 3, col: 1, label: 'Кольцо'},
      armor:  {row: 3, col: 2, label: 'Броня'},
      boots:  {row: 3, col: 3, label: 'Сапоги'},
    };
    const itemsBySlot = {};
    items.forEach(it => { itemsBySlot[it.slot] = it; });
    const renderSlot = (slot) => {
      const it = itemsBySlot[slot];
      const meta = SLOT_LAYOUT[slot];
      if (!meta) return '';
      const style = `grid-row:${meta.row};grid-column:${meta.col};` +
                    (it ? `border-color:${it.color};` : '');
      const cls = it ? '' : 'empty';
      const nm = it ? (it.name.length > 14 ? it.name.slice(0, 13) + '…' : it.name) : '—';
      return `<div class="bbc-eq-slot ${cls}" style="${style}">
        <div class="bbc-eq-icon">${SLOT_ICON[slot] || '•'}</div>
        <div class="bbc-eq-label">${meta.label}</div>
        ${it ? `<div class="bbc-eq-name" style="color:${it.color}">${nm}</div>` : ''}
      </div>`;
    };
    const equipHtml = `
      <div class="bbc-equip">
        <div class="bbc-eq-sprite">${_spriteHtml(b, who)}</div>
        ${['belt','weapon','shield','ring1','armor','boots'].map(renderSlot).join('')}
      </div>`;
    const gearBlock = (isBot) ? `<div class="bbc-gear"><div class="bbc-gear-title">🎽 ЧТО ОДЕТО</div>${equipHtml}</div>` : '';

    overlay = document.createElement('div');
    overlay.id = 'bbc-overlay';
    overlay.innerHTML = `
      <div id="bbc-card" class="${isPrem?'prem':''}">
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
        ${isMe ? `<div style="padding:10px 14px;display:flex;justify-content:center;">${_spriteHtml(b, who)}</div>` : gearBlock}
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.id === 'bbc-close') _hide();
    });
    try { window.tg?.HapticFeedback?.impactOccurred('light'); } catch(_){}
  }

  function _hide() {
    if (!overlay) return;
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
  };
  if (document.body) make();
  else document.addEventListener('DOMContentLoaded', make, {once: true});
})();
