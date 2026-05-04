/* ============================================================
   Rating HTML Overlay — киберпанк рейтинг, 5 табов, скролл
   ============================================================ */
(() => {
const CSS = `
.rt-ov{position:fixed;top:0;left:0;width:100%;height:100%;z-index:9000;display:flex;flex-direction:column;background:radial-gradient(ellipse at 50% 0%,#0d001a 0%,#050008 60%),#000;color:#e6f7ff;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}
.rt-ov::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.018) 3px 4px);pointer-events:none;z-index:1}
.rt-ov::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 15% 20%,rgba(255,200,0,.08),transparent 40%),radial-gradient(circle at 85% 75%,rgba(0,220,255,.07),transparent 40%);pointer-events:none;z-index:1}
.rt-hdr{display:flex;align-items:center;gap:8px;padding:7px 12px 6px;border-bottom:1px solid rgba(255,200,0,.2);position:relative;z-index:2;flex-shrink:0}
.rt-hdr-icon{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:14px;background:linear-gradient(135deg,#1a1000,#2a1a00);border:1px solid #ffd700;box-shadow:0 0 10px rgba(255,215,0,.5)}
.rt-hdr-title{font-size:14px;font-weight:800;letter-spacing:.5px;background:linear-gradient(90deg,#ffd700,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1}
.rt-hdr-sub{font-size:9px;color:#ffd700;opacity:.55;margin-top:1px;letter-spacing:.3px}
.rt-tabs{display:flex;gap:4px;padding:5px 8px 0;flex-shrink:0;position:relative;z-index:2}
.rt-tab{flex:1;padding:4px 2px;border-radius:16px;font-size:9.5px;font-weight:700;cursor:pointer;background:rgba(10,5,20,.8);border:1px solid rgba(255,215,0,.25);color:#aaa;transition:all .15s;user-select:none;white-space:nowrap;text-align:center;min-width:0}
.rt-tab.active{background:linear-gradient(135deg,rgba(30,18,0,.9),rgba(15,10,0,.9));border-color:#ffd700;color:#ffd700;box-shadow:0 0 10px rgba(255,215,0,.3)}
.rt-tab:active{transform:scale(.93)}
.rt-body{flex:1;overflow-y:auto;overflow-x:hidden;position:relative;z-index:2;padding-bottom:6px}
.rt-body::-webkit-scrollbar{width:3px}
.rt-body::-webkit-scrollbar-thumb{background:rgba(255,215,0,.25);border-radius:3px}
.rt-loading{display:flex;align-items:center;justify-content:center;height:160px;font-size:13px;color:#aabbcc}
.rt-err{display:flex;flex-direction:column;align-items:center;justify-content:center;height:160px;gap:8px}
.rt-err-icon{font-size:28px}
.rt-err-txt{font-size:12px;color:#ff4455}
.rt-info{margin:5px 10px 0;padding:5px 10px;border-radius:8px;background:linear-gradient(135deg,rgba(20,14,0,.9),rgba(8,6,0,.9));border:1px solid rgba(255,215,0,.25);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rt-info-title{font-size:10px;font-weight:700;color:#ffd700;white-space:nowrap}
.rt-info-sub{font-size:9px;color:#c0b890;line-height:1.3}
.rt-podium{display:flex;align-items:flex-end;justify-content:center;gap:8px;padding:10px 12px 0}
.rt-pod-col{display:flex;flex-direction:column;align-items:center}
.rt-pod-medal{font-size:20px;margin-bottom:2px;filter:drop-shadow(0 0 6px currentColor)}
.rt-pod-name{font-size:9px;font-weight:700;color:#fff;text-align:center;max-width:82px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px}
.rt-pod-block{width:82px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px 7px;position:relative;overflow:hidden;gap:2px}
.rt-pod-block::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(255,255,255,.025) 2px 3px);pointer-events:none}
.rt-pod-block::after{content:"";position:absolute;top:-30px;left:-30px;width:40px;height:160%;background:linear-gradient(110deg,transparent,rgba(255,255,255,.07),transparent);pointer-events:none}
.rt-pod-av{font-size:26px;line-height:1;filter:drop-shadow(0 0 8px rgba(255,255,255,.4));margin-bottom:1px}
.rt-pod-score{font-size:14px;font-weight:800;color:#fff;text-shadow:0 0 12px currentColor;letter-spacing:.3px}
.rt-pod-lvl{font-size:8px;color:rgba(255,255,255,.5);margin-top:0}
.rt-pod-me{box-shadow:0 0 0 2px #00f5ff,0 0 18px rgba(0,245,255,.5)!important}
.rt-section{padding:5px 10px 2px;font-size:9px;font-weight:700;color:#ffd700;letter-spacing:.7px;opacity:.65;text-transform:uppercase}
.rt-list{display:flex;flex-direction:column;gap:3px;padding:0 8px}
.rt-row{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:10px;background:linear-gradient(90deg,rgba(15,10,25,.9),rgba(6,4,14,.9));border:1px solid rgba(255,215,0,.12)}
.rt-row.me{border-color:#00f5ff;box-shadow:0 0 10px rgba(0,245,255,.18);background:linear-gradient(90deg,rgba(0,15,28,.95),rgba(0,5,15,.95))}
.rt-row.gold{border-color:rgba(255,215,0,.45);background:linear-gradient(90deg,rgba(28,18,0,.95),rgba(12,8,0,.95))}
.rt-row.silver{border-color:rgba(170,180,200,.35);background:linear-gradient(90deg,rgba(18,20,28,.95),rgba(6,7,14,.95))}
.rt-row.bronze{border-color:rgba(160,100,48,.35);background:linear-gradient(90deg,rgba(22,14,8,.95),rgba(8,5,4,.95))}
.rt-rank{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:9px;font-weight:800;flex-shrink:0}
.rt-rank.gold{background:rgba(255,215,0,.2);color:#ffd700;box-shadow:0 0 7px rgba(255,215,0,.4)}
.rt-rank.silver{background:rgba(170,180,200,.15);color:#aabbcc}
.rt-rank.bronze{background:rgba(160,100,48,.15);color:#cc9955}
.rt-rank.other{background:rgba(40,36,60,.8);color:#ccccee}
.rt-pinfo{flex:1;min-width:0}
.rt-pname{font-size:11px;font-weight:700;color:#f0f0fa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rt-pname.me{color:#00f5ff;text-shadow:0 0 5px rgba(0,245,255,.4)}
.rt-psub{font-size:9px;color:#8888aa;margin-top:1px}
.rt-score{font-size:13px;font-weight:800;color:#ffd700;text-shadow:0 0 7px rgba(255,215,0,.4);flex-shrink:0}
.rt-score.me{color:#00f5ff;text-shadow:0 0 7px rgba(0,245,255,.5)}
.rt-mypos{position:sticky;bottom:0;padding:9px 14px;display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,rgba(0,10,22,.99),rgba(0,4,14,.99));border-top:1.5px solid rgba(0,245,255,.3);box-shadow:0 -6px 20px rgba(0,0,0,.6);z-index:5;margin-top:auto}
.rt-mypos-label{font-size:8px;color:#00f5ff;opacity:.6;letter-spacing:.5px;text-transform:uppercase;margin-bottom:1px}
.rt-mypos-val{font-size:15px;font-weight:800;color:#00f5ff;text-shadow:0 0 8px rgba(0,245,255,.6)}
.rt-mypos-btn{font-size:10px;font-weight:700;color:#00f5ff;background:rgba(0,245,255,.12);border:1px solid rgba(0,245,255,.3);border-radius:7px;padding:4px 10px;cursor:pointer;white-space:nowrap;flex-shrink:0}
.rt-mypos-btn:active{opacity:.7}
.rt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 20px;gap:8px}
.rt-empty-icon{font-size:32px;opacity:.5}
.rt-empty-txt{font-size:12px;color:#8888aa;text-align:center}
.rt-row{cursor:pointer}
.rt-row:active{opacity:.75}
.rt-pod-col{cursor:pointer}
.rt-pod-col:active{opacity:.75}
#rt-bbc-wrap{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:9800;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#eee}
#rt-bbc-card{width:min(310px,90vw);background:linear-gradient(180deg,#141420,#0f0d18);border:2px solid #444466;border-radius:12px;padding:0;box-sizing:border-box}
#rt-bbc-card.prem{border-color:#ffc83c;box-shadow:0 0 0 3px rgba(255,200,60,.10)}
#rt-bbc-card.me{border-color:#00f5ff;box-shadow:0 0 0 3px rgba(0,245,255,.10)}
`;

function _injectCSS() {
  if (document.getElementById('rt-style')) return;
  const s = document.createElement('style');
  s.id = 'rt-style'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function _trunc(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }

function _fitRoot(root) {
  try {
    const c = document.querySelector('canvas');
    if (!c) return;
    const r = c.getBoundingClientRect();
    const scaleH = r.height / (c.height || 700);
    const tabH = 76 * scaleH;
    root.style.cssText = `position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${Math.max(0, r.height - tabH)}px;z-index:9000;display:flex;flex-direction:column;background:radial-gradient(ellipse at 50% 0%,#0d001a 0%,#050008 60%),#000;color:#e6f7ff;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden`;
  } catch(_) {}
}

const TABS = [
  { key: 'season', label: '🌟 Сезон',  icon: '🌟' },
  { key: 'titans', label: '🗿 Башня',  icon: '🗿' },
  { key: 'natisk', label: '🔥 Натиск', icon: '🔥' },
];

const TAB_META = {
  pvp:    { title: 'РЕЙТИНГ СЛАВЫ',   sub: 'Топ игроков по ELO рейтингу',              color: '#ffd700', glow: 'rgba(255,215,0,.35)',   scoreLabel: p => `★ ${p.rating}`,   subLabel: p => `🏆 ${p.wins||0}В  💀 ${p.losses||0}П` },
  titans: { title: 'БАШНЯ ТИТАНОВ',   sub: 'Топ покорителей башни за неделю',           color: '#00f0ff', glow: 'rgba(0,240,255,.35)',   scoreLabel: p => `${p.weekly_best_floor||0}`, subLabel: p => `🗿 Этаж ${p.weekly_best_floor||0}` },
  natisk: { title: 'НАТИСК ВОЛН',     sub: 'Топ выживших за неделю',                    color: '#ff6644', glow: 'rgba(255,100,70,.35)',  scoreLabel: p => `${p.best_wave||0}`, subLabel: p => `🔥 Волна ${p.best_wave||0}` },
  season: { title: 'РЕЙТИНГ СЕЗОНА',  sub: 'Топ игроков · сбрасывается каждые 30 дней', color: '#c78fff', glow: 'rgba(180,100,255,.35)', scoreLabel: p => `★ ${p.rating}`,   subLabel: p => `🏆 ${p.wins||0}В  💀 ${p.losses||0}П` },
  boss:   { title: 'ТОП РЕЙДА',       sub: 'Лучшие по урону в последнем рейде',         color: '#ff3ba8', glow: 'rgba(255,59,168,.35)',  scoreLabel: p => _fmtNum(p.damage||p.total_damage||0), subLabel: p => `⚔️ ${_fmtNum(p.damage||p.total_damage||0)} урона` },
};

function _fmtNum(n) { return n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n); }

function _rankClass(i) { return i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other'; }
function _rowClass(i, isMe) { return 'rt-row' + (isMe ? ' me' : i === 0 ? ' gold' : i === 1 ? ' silver' : i === 2 ? ' bronze' : ''); }

function _podiumHTML(top3, meta, tabKey) {
  const order  = [top3[1], top3[0], top3[2]]; // 2-1-3
  const ranks  = [2, 1, 3];
  const heights = [72, 96, 58];
  const medals  = ['🥈','🥇','🥉'];
  const colors  = ['#b0c8e8','#ffd700','#e0945a'];
  const bgs = [
    'linear-gradient(160deg,rgba(38,50,74,.98),rgba(12,14,26,.98))',
    'linear-gradient(160deg,rgba(72,54,0,.98),rgba(22,14,0,.98))',
    'linear-gradient(160deg,rgba(64,34,8,.98),rgba(18,8,2,.98))',
  ];
  const borders = ['rgba(160,195,235,.75)','rgba(255,215,0,.9)','rgba(210,130,60,.8)'];
  const glows   = ['rgba(130,170,220,.45)','rgba(255,200,0,.55)','rgba(200,110,40,.45)'];
  const _AVEMOJI = ['⚔️','🛡️','🧙','🐉','⚡','🗡️','🔥','🦅','🐺','🔮','✨','💀','🏹','🪓'];
  const myUid   = State?.player?.user_id;

  return `<div class="rt-podium">${order.map((p, i) => {
    if (!p) return `<div class="rt-pod-col" style="width:82px"></div>`;
    const isMe = p.user_id === myUid;
    const meClass = isMe ? ' rt-pod-me' : '';
    const nm  = _esc(_trunc(p.username || `User${p.user_id}`, 10));
    const av  = _AVEMOJI[Math.abs(Number(p.user_id)||0) % _AVEMOJI.length];
    const lvl = p.level ? `<div class="rt-pod-lvl">Ур. ${p.level}</div>` : '';
    return `<div class="rt-pod-col" data-pid="${p.user_id}" data-rank="${ranks[i]}" data-tab="${tabKey}">
      <div class="rt-pod-medal" style="color:${colors[i]}">${medals[i]}</div>
      <div class="rt-pod-name">${nm}</div>
      <div class="rt-pod-block${meClass}" style="height:${heights[i]}px;background:${bgs[i]};border:1.5px solid ${borders[i]};box-shadow:0 0 22px ${glows[i]},inset 0 0 16px rgba(255,255,255,.04)">
        <div class="rt-pod-av">${av}</div>
        <div class="rt-pod-score" style="color:${colors[i]};text-shadow:0 0 14px ${colors[i]}">${_esc(meta.scoreLabel(p))}</div>
        ${lvl}
      </div>
    </div>`;
  }).join('')}</div>`;
}

function _rowHTML(p, i, meta, tabKey) {
  const myUid = State?.player?.user_id;
  const isMe  = p.user_id === myUid;
  const rc    = _rankClass(i);
  const nm    = _esc(_trunc(p.username || `User${p.user_id}`, 18));
  const score = _esc(meta.scoreLabel(p));
  const sub   = _esc(meta.subLabel(p));
  return `<div class="${_rowClass(i, isMe)}" data-pid="${p.user_id}" data-rank="${i+1}" data-tab="${tabKey}">
    <div class="rt-rank ${rc}">${i+1}</div>
    <div class="rt-pinfo">
      <div class="rt-pname${isMe?' me':''}">${nm}${isMe?' <span style="font-size:8px;color:#00f5ff;opacity:.7">● ВЫ</span>':''}</div>
      <div class="rt-psub">${sub}</div>
    </div>
    <div class="rt-score${isMe?' me':''}">${score}</div>
  </div>`;
}

function _buildList(list, meta, tabKey) {
  if (!list || !list.length) {
    return `<div class="rt-empty"><div class="rt-empty-icon">📭</div><div class="rt-empty-txt">Данных пока нет — первым войди в историю!</div></div>`;
  }
  // Сохраняем данные для карточки по user_id
  window.RatingHTML._players = {};
  list.forEach(p => { window.RatingHTML._players[p.user_id] = p; });

  const top3 = list.slice(0, 3);
  let html = _podiumHTML(top3, meta, tabKey);
  if (list.length > 3) {
    html += `<div class="rt-section">Остальные участники</div><div class="rt-list">${list.slice(3).map((p,i)=>_rowHTML(p, i+3, meta, tabKey)).join('')}</div>`;
  } else {
    // ≤3 игроков: рендерим строки списка под подиумом — гарантированный клик для карточки
    html += `<div class="rt-list" style="margin-top:6px">${list.map((p,i)=>_rowHTML(p, i, meta, tabKey)).join('')}</div>`;
  }
  return html;
}

function _myPosHTML(myRank, scoreText, noRankLabel) {
  const findBtn = (myRank && myRank > 3)
    ? `<div class="rt-mypos-btn" id="rt-find-me">↑ Найти</div>` : '';
  if (!myRank) {
    return `<div class="rt-mypos">
      <div style="flex:1"><div class="rt-mypos-label">Ваша позиция</div>
      <div class="rt-mypos-val" style="opacity:.45;font-size:12px">${noRankLabel||'вне топа'}</div></div>
    </div>`;
  }
  return `<div class="rt-mypos">
    <div style="flex:1;min-width:0">
      <div class="rt-mypos-label">Ваша позиция</div>
      <div class="rt-mypos-val">#${myRank}</div>
    </div>
    ${scoreText ? `<div style="font-size:11px;color:#00f5ff;opacity:.6;flex-shrink:0">${scoreText}</div>` : ''}
    ${findBtn}
  </div>`;
}

function _infoBox(title, lines) {
  return `<div class="rt-info">
    <div class="rt-info-title">${_esc(title)}</div>
    <div class="rt-info-sub">${lines.map(l => _esc(l)).join(' · ')}</div>
  </div>`;
}

// ── Карточка игрока (один в один как BotBattleCard) ─────────────────────────
function _ensureBbcCss() {
  if (document.getElementById('bbc-css')) return;
  // Инжектируем CSS боевой карточки если ещё не загружен (BotBattleCard ленивый)
  const s = document.createElement('style'); s.id = 'bbc-css';
  s.textContent = `
    #rt-bbc-wrap{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:9800;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#eee}
    #bbc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#eee}
    #bbc-card,#rt-bbc-card{width:min(310px,90vw);background:linear-gradient(180deg,#141420,#0f0d18);border:2px solid #444466;border-radius:12px;padding:0;box-sizing:border-box}
    #bbc-card.prem,#rt-bbc-card.prem{border-color:#ffc83c;box-shadow:0 0 0 3px rgba(255,200,60,.10)}
    #rt-bbc-card.me{border-color:#00f5ff;box-shadow:0 0 0 3px rgba(0,245,255,.10)}
    .bbc-head{display:flex;justify-content:space-between;align-items:center;padding:9px 12px 0;font-size:10px;font-weight:700}
    .bbc-close{cursor:pointer;color:#ddddff;font-size:14px;padding:0 4px}
    .bbc-name{text-align:center;font-size:15px;font-weight:700;margin-top:5px}
    .bbc-lv{text-align:center;font-size:10px;color:#ccccee;margin-top:5px}
    .bbc-div{height:1px;background:#2a2850;margin:6px 12px;opacity:.5}
    .bbc-body{display:flex;padding:5px 12px}
    .bbc-sprite{flex:0 0 80px;height:104px;display:flex;align-items:center;justify-content:center}
    .bbc-sprite img{max-width:100%;max-height:100%}
    .bbc-right{flex:1}
    .bbc-hp-row{display:flex;justify-content:space-between;font-size:9px;color:#ddddff}
    .bbc-hp-bar{height:9px;background:#0a0a18;border-radius:4px;margin-top:4px;overflow:hidden}
    .bbc-hp-fill{height:100%;border-radius:4px}
    .bbc-stats{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;margin-top:8px}
    .bbc-stat{display:flex;align-items:center;gap:6px}
    .bbc-stat-i{font-size:14px}
    .bbc-stat-l{font-size:10px;color:#ccccee}
    .bbc-stat-v{font-size:13px;font-weight:700}
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
    .bbc-empty{text-align:center;font-size:10px;color:#666688;padding:8px}
  `;
  document.head.appendChild(s);
}

const _BBC_ARMOR_MAP = {
  tank_free:'armor_free1',agile_free:'armor_free2',crit_free:'armor_free3',universal_free:'armor_free4',
  berserker_gold:'armor_gold1',assassin_gold:'armor_gold2',mage_gold:'armor_gold3',paladin_gold:'armor_gold4',
  dragonknight_diamonds:'armor_dia1',shadowdancer_diamonds:'armor_dia2',archmage_diamonds:'armor_dia3',universal_diamonds:'armor_dia4',
  berserker_mythic:'armor_mythic1',assassin_mythic:'armor_mythic2',archmage_mythic:'armor_mythic3',legendary_usdt:'armor_mythic4',
};
const _BBC_SLOT_ICON = {weapon:'🗡',shield:'🛡',armor:'👕',belt:'🪖',boots:'👢',ring1:'💍'};
const _BBC_SLOT_LABEL = {weapon:'Оружие',shield:'Щит',armor:'Броня',belt:'Шлем',boots:'Сапоги',ring1:'Кольцо'};
const _BBC_SLOT_LAYOUT = {belt:{r:1,c:1},armor:{r:2,c:1},boots:{r:3,c:1},weapon:{r:1,c:3},shield:{r:2,c:3},ring1:{r:3,c:3}};

if (!window._bbcImgFbRt) {
  window._bbcImgFbRt = function(img) {
    const tries = (img.dataset.tries||'').split(',').filter(Boolean);
    if (!tries.length) {
      const slot = img.dataset.slot||'';
      if (img.parentNode) img.parentNode.innerHTML = `<span class="bbc-eq-emoji">${_BBC_SLOT_ICON[slot]||'•'}</span>`;
      return;
    }
    img.src = (img.dataset.base||'') + '.' + tries.shift();
    img.dataset.tries = tries.join(',');
  };
}

function _bbcItemBase(it) {
  const id = it.item_id||'', slot = it.slot, rar = it.rarity||'common';
  if (['shield','belt','ring1','boots'].includes(slot)) return id;
  if (slot === 'armor') return _BBC_ARMOR_MAP[id] || ({common:'armor_free1',rare:'armor_gold1',epic:'armor_dia1',mythic:'armor_mythic1'}[rar]||'armor_free1');
  if (slot === 'weapon') {
    const parts = id.split('_'), wt = parts[0]||'sword', sfx = parts[1]||'';
    const rcl = {gold:'rare',diamond:'epic',mythic:'mythic',free:'free',steel:'rare',iron:'free'}[sfx]||{common:'free',rare:'rare',epic:'epic',mythic:'mythic'}[rar]||'free';
    return `weapon_${['sword','axe','club','gs'].includes(wt)?wt:'sword'}_${rcl}`;
  }
  return null;
}

function _bbcSlotHtml(slot, it) {
  const L = _BBC_SLOT_LAYOUT[slot]; if (!L) return '';
  const style = `grid-row:${L.r};grid-column:${L.c};`+(it?`border-color:${it.color};box-shadow:inset 0 0 8px ${it.color}33;`:'');
  const base = it ? _bbcItemBase(it) : null;
  const visual = base
    ? `<div class="bbc-eq-img"><img src="${base}.png" data-base="${base}" data-tries="jpg,jpeg" data-slot="${slot}" onerror="window._bbcImgFbRt&&window._bbcImgFbRt(this)"></div>`
    : `<div class="bbc-eq-img"><span class="bbc-eq-emoji">${_BBC_SLOT_ICON[slot]||'•'}</span></div>`;
  const nm = it ? _esc(_trunc(it.name, 13)) : '';
  return `<div class="bbc-eq-slot${it?'':' empty'}" style="${style}">
    <div class="bbc-eq-label">${_BBC_SLOT_LABEL[slot]||slot}</div>${visual}
    ${it?`<div class="bbc-eq-name" style="color:${it.color}">${nm}</div>`:''}
  </div>`;
}

async function _fetchAndShowCard(uid, rank, tabKey, fallbackData) {
  document.getElementById('rt-bbc-wrap')?.remove();
  _ensureBbcCss();

  const myUid = State?.player?.user_id;
  const medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':`#${rank}`;

  // Скелетон
  const wrap = document.createElement('div'); wrap.id = 'rt-bbc-wrap';
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:9800;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#eee';
  wrap.innerHTML = `<div id="rt-bbc-card"><div style="padding:44px;text-align:center;color:#888;font-size:13px">⏳ Загрузка...</div></div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });

  let d;
  try { d = await get(`/api/player/public/${uid}`); } catch(_) { d = null; }
  if (!document.getElementById('rt-bbc-wrap')) return;

  if (!d?.ok) {
    d = { ok:true, user_id:uid, username:fallbackData?.username||'', level:fallbackData?.level||'?',
          wins:fallbackData?.wins, losses:fallbackData?.losses, rating:fallbackData?.rating,
          max_hp:0, current_hp:0, strength:0, endurance:0, crit:0,
          warrior_type:'tank', is_premium:false, win_streak:0, items:[] };
  }

  const isMe   = uid === myUid;
  const isPrem = d.is_premium;
  const nm     = _esc(_trunc(d.username||`ID${uid}`, 22));
  const wt     = d.warrior_type || 'tank';
  const skinUrl = (typeof getWarriorSkinPath === 'function') ? getWarriorSkinPath(wt) : 'skins/sila/1.png';
  const hpPct  = d.max_hp > 0 ? Math.min(1, Math.max(0, d.current_hp / d.max_hp)) : 1;
  const hpCol  = hpPct > 0.5 ? '#3cc864' : hpPct > 0.25 ? '#ffc83c' : '#dc3c46';

  const headLabel = isMe ? '<span style="color:#5096ff">🧑 Вы</span>'
                  : isPrem ? '<span style="color:#ffc83c">👑 Игрок</span>'
                  : '<span style="color:#3cc864">⚔️ Игрок</span>';

  const itemsBySlot = {};
  (d.items||[]).forEach(it => { itemsBySlot[it.slot] = it; });
  const equipSlots = ['belt','armor','boots','weapon','shield','ring1'].map(sl => _bbcSlotHtml(sl, itemsBySlot[sl])).join('');

  const stats = [
    ['💪','Сила',      d.strength||0,  '#dc3c46'],
    ['🤸','Ловкость',  d.endurance||0, '#3cc8dc'],
    ['💥','Интуиция',  d.crit||0,      '#b45aff'],
    ['🛡','Выносл.',   d.stamina||0,   '#3cc864'],
  ];

  wrap.querySelector('#rt-bbc-card').outerHTML = `
    <div id="rt-bbc-card" class="${isPrem?'prem':''}${isMe?' me':''}">
      <div class="bbc-head">
        <div>${headLabel} · ${medal}${d.win_streak>0?` · <span style="color:#ff8044">🔥${d.win_streak}</span>`:''}</div>
        <div class="bbc-close" id="rt-bbc-close">✕</div>
      </div>
      <div class="bbc-name" style="color:${isPrem?'#ffc83c':isMe?'#00f5ff':'#f0f0fa'}">${isPrem?'👑 ':''}${nm}</div>
      <div class="bbc-lv">${d.win_streak>0?`<span style="color:#ff8044">🔥 ${d.win_streak} подряд · </span>`:''}Ур. ${d.level||'?'} · ★ ${d.rating||'—'}</div>
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

  document.getElementById('rt-bbc-close')?.addEventListener('click', () => wrap.remove());
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
}

// ── Рендер по вкладке ────────────────────────────────────────────────────────
async function _renderTab(key, body) {
  const cache = window.RatingHTML._cache;
  const myUid = State?.player?.user_id;
  const meta  = TAB_META[key];

  body.innerHTML = `<div class="rt-loading">⏳ Загрузка...</div>`;

  try {
    let html = '';

    if (key === 'pvp') {
      const d = cache.pvp || (cache.pvp = await get('/api/pvp/top'));
      if (!d.ok) throw new Error();
      const list = d.elo_top || [];
      const myIdx = list.findIndex(p => p.user_id === myUid);
      const myRank = myIdx >= 0 ? myIdx + 1 : null;
      const myElo  = State?.player?.rating || 1000;
      html += _infoBox('🎁 Награды', ['🥇 500💰+200💎  🥈 300💰+120💎  🥉 200💰+75💎  4–10: 50💰+20💎']);
      html += _buildList(list, meta, key);
      html += _myPosHTML(myRank, `★ ${myElo}`, 'вне топа');

    } else if (key === 'titans') {
      const d = cache.titans || (cache.titans = await get('/api/titans/top'));
      if (!d.ok) throw new Error();
      const list = d.leaders || [];
      const myIdx  = list.findIndex(p => p.user_id === myUid);
      const myRank = myIdx >= 0 ? myIdx + 1 : null;
      const myFloor = myIdx >= 0 ? list[myIdx].weekly_best_floor : null;
      html += _infoBox(`🗿 Неделя: ${d.week_key||'—'}`, ['🥇 400💰+150💎  🥈 250💰+90💎  🥉 150💰+60💎  4-10: 60💰+25💎']);
      html += _buildList(list, meta, key);
      html += _myPosHTML(myRank, myFloor ? `Этаж ${myFloor}` : null, 'не участвовал');

    } else if (key === 'natisk') {
      const d = cache.natisk || (cache.natisk = await get('/api/endless/top'));
      if (!d.ok) throw new Error();
      const list   = (d.weekly && d.weekly.length ? d.weekly : d.leaders) || [];
      const myIdx  = list.findIndex(p => p.user_id === myUid);
      const myRank = myIdx >= 0 ? myIdx + 1 : (d.my_pos || null);
      const myWave = myIdx >= 0 ? list[myIdx].best_wave : null;
      html += _infoBox(`🔥 Неделя: ${d.week_key||'—'}`, ['🥇 300💰+100💎  🥈 200💰+60💎  🥉 100💰+40💎  4-10: 50💰+15💎']);
      html += _buildList(list, meta, key);
      html += _myPosHTML(myRank, myWave ? `Волна ${myWave}` : null, 'не участвовал');

    } else if (key === 'season') {
      const d = cache.season || (cache.season = await get('/api/season'));
      if (!d.ok) throw new Error();
      const season = d.season;
      const list   = d.leaderboard || [];
      const myIdx  = list.findIndex(p => p.user_id === myUid);
      const myRank = myIdx >= 0 ? myIdx + 1 : null;
      const myElo  = list[myIdx]?.rating || State?.player?.rating || 1000;
      let sub = '⏳ Сезон скоро начнётся';
      if (season) {
        const endsMs  = new Date(String(season.started_at).replace(' ','T')).getTime() + 30*24*3600*1000;
        const daysLeft = Math.max(0, Math.ceil((endsMs - Date.now()) / (24*3600*1000)));
        sub = `⏳ До конца: ${daysLeft} дн.`;
      }
      html += _infoBox(season ? season.name : 'Текущий сезон', [sub, '🥇500💰+200💎  🥈300💰+120💎  🥉200💰+75💎']);
      html += _buildList(list, meta, key);
      html += _myPosHTML(myRank, `★ ${myElo}`, 'вне топа');

    } else if (key === 'boss') {
      const d = cache.boss || (cache.boss = await get('/api/rating/world_boss'));
      if (!d.ok) throw new Error();
      if (!d.spawn) {
        html = `<div class="rt-empty"><div class="rt-empty-icon">☠️</div><div class="rt-empty-txt">Рейдов ещё не было.<br>Первый рейд скоро!</div></div>`;
        body.innerHTML = html; return;
      }
      const spawn  = d.spawn;
      const top    = d.top || [];
      const myPos  = d.my_pos;
      const myDmg  = d.my_damage || 0;
      const status = spawn.status === 'won' ? '✅' : '💀';
      const ended  = spawn.ended_at ? new Date(String(spawn.ended_at).replace(' ','T')).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}) : '—';
      html += _infoBox(`${status} ${spawn.boss_name||'Титан'} · ${ended}`, [`👥 Участников: ${spawn.total_participants||top.length}`]);
      html += _buildList(top, meta, key);
      html += _myPosHTML(myPos || null, myDmg > 0 ? _fmtNum(myDmg) + ' урона' : null, 'не участвовал');
    }

    body.innerHTML = html;

    // Кнопка «↑ Найти» — прокрутка к строке игрока в списке
    body.querySelector('#rt-find-me')?.addEventListener('click', () => {
      const me = body.querySelector('.rt-row.me') || body.querySelector('[class*="rt-pod-me"]');
      if (me) me.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

  } catch(e) {
    body.innerHTML = `<div class="rt-err"><div class="rt-err-icon">⚠️</div><div class="rt-err-txt">Нет соединения</div></div>`;
  }
}

// ── Публичный API ─────────────────────────────────────────────────────────────
window.RatingHTML = {
  _cache: {},
  _players: {},
  _root: null,
  _activeTab: 'season',

  open(tab) {
    tab = tab || 'season';
    this._activeTab = tab;
    _injectCSS();
    this.close();

    // Сброс кэша каждую минуту
    const now = Date.now();
    if (!this._cacheTs || (now - this._cacheTs) > 60_000) {
      this._cache = {};
      this._cacheTs = now;
    }

    const root = document.createElement('div');
    root.id = 'rt-overlay';
    _fitRoot(root);
    document.body.appendChild(root);
    this._root = root;

    const tabsHTML = TABS.map(t =>
      `<div class="rt-tab${t.key===tab?' active':''}" data-tab="${t.key}">${t.label}</div>`
    ).join('');

    const m = TAB_META[tab];
    root.innerHTML = `
      <div class="rt-hdr">
        <div class="rt-hdr-icon">🏆</div>
        <div>
          <div class="rt-hdr-title" id="rt-tab-title">${m.title}</div>
          <div class="rt-hdr-sub" id="rt-tab-sub">${m.sub}</div>
        </div>
      </div>
      <div class="rt-tabs" id="rt-tabs">${tabsHTML}</div>
      <div class="rt-body" id="rt-body"></div>`;

    root.querySelector('#rt-tabs').addEventListener('click', e => {
      const el = e.target.closest('[data-tab]'); if (!el) return;
      const k  = el.dataset.tab; if (k === this._activeTab) return;
      try { window.Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch(_) {}
      this._switchTab(k);
    });

    // Тап по строке или подиуму → полная карточка игрока
    root.querySelector('#rt-body').addEventListener('click', e => {
      const el = e.target.closest('[data-pid]'); if (!el) return;
      const uid  = +el.dataset.pid;
      const rank = +el.dataset.rank;
      const tKey = el.dataset.tab || this._activeTab;
      _fetchAndShowCard(uid, rank, tKey, this._players?.[uid]);
    });

    _renderTab(tab, root.querySelector('#rt-body'));

    // Адаптация при ресайзе
    this._onResize = () => { if (this._root) _fitRoot(this._root); };
    window.addEventListener('resize', this._onResize);
  },

  _switchTab(key) {
    this._activeTab = key;
    const root = this._root; if (!root) return;
    const m = TAB_META[key];
    root.querySelector('#rt-tab-title').textContent = m.title;
    root.querySelector('#rt-tab-sub').textContent   = m.sub;
    root.querySelectorAll('.rt-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === key);
    });
    const body = root.querySelector('#rt-body');
    body.scrollTop = 0;
    _renderTab(key, body);
  },

  close() {
    document.getElementById('rt-overlay')?.remove();
    this._root = null;
    if (this._onResize) { window.removeEventListener('resize', this._onResize); this._onResize = null; }
  },
};

})();
