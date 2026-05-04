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
.rt-podium{display:flex;align-items:flex-end;justify-content:center;gap:6px;padding:8px 12px 0}
.rt-pod-col{display:flex;flex-direction:column;align-items:center}
.rt-pod-medal{font-size:18px;margin-bottom:1px;filter:drop-shadow(0 0 5px currentColor)}
.rt-pod-name{font-size:9px;font-weight:700;color:#fff;text-align:center;max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px}
.rt-pod-block{width:78px;border-radius:7px 7px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 4px;position:relative;overflow:hidden}
.rt-pod-block::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(255,255,255,.03) 2px 3px)}
.rt-pod-score{font-size:13px;font-weight:800;color:#fff;text-shadow:0 0 8px currentColor}
.rt-pod-lvl{font-size:8px;color:rgba(255,255,255,.55);margin-top:1px}
.rt-pod-me{box-shadow:0 0 0 2px #00f5ff,0 0 14px rgba(0,245,255,.45)!important}
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
.rt-mypos{margin:5px 8px;padding:7px 12px;border-radius:10px;display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,rgba(0,12,24,.98),rgba(0,4,12,.98));border:1.5px solid #00f5ff;box-shadow:0 0 12px rgba(0,245,255,.2)}
.rt-mypos-label{font-size:8px;color:#00f5ff;opacity:.7;letter-spacing:.5px;text-transform:uppercase;margin-bottom:1px}
.rt-mypos-val{font-size:14px;font-weight:800;color:#00f5ff;text-shadow:0 0 7px rgba(0,245,255,.5)}
.rt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 20px;gap:8px}
.rt-empty-icon{font-size:32px;opacity:.5}
.rt-empty-txt{font-size:12px;color:#8888aa;text-align:center}
.rt-row{cursor:pointer}
.rt-row:active{opacity:.75}
.rt-pod-col{cursor:pointer}
.rt-pod-col:active{opacity:.75}
.rt-pc-wrap{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(5px)}
.rt-pc{width:min(300px,88vw);border-radius:16px;overflow:hidden;background:linear-gradient(180deg,#141420,#0f0d18);border:2px solid #444466;box-shadow:0 0 40px rgba(120,80,255,.2);position:relative;max-height:90vh;overflow-y:auto}
.rt-pc::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,200,.012) 3px 4px);pointer-events:none;z-index:0}
.rt-pc.prem{border-color:#ffc83c;box-shadow:0 0 0 3px rgba(255,200,60,.12),0 0 30px rgba(255,200,60,.15)}
.rt-pc.me{border-color:#00f5ff;box-shadow:0 0 0 3px rgba(0,245,255,.12),0 0 30px rgba(0,245,255,.15)}
.rt-pc-head{display:flex;justify-content:space-between;align-items:center;padding:9px 12px 0;font-size:10px;font-weight:700;position:relative;z-index:1}
.rt-pc-close{cursor:pointer;color:#ddddff;font-size:14px;padding:2px 4px;opacity:.7}
.rt-pc-close:active{opacity:.4}
.rt-pc-name{text-align:center;font-size:15px;font-weight:800;padding:0 12px;margin-top:5px;color:#f0f0fa;position:relative;z-index:1}
.rt-pc-name.prem{color:#ffc83c}
.rt-pc-name.me{color:#00f5ff}
.rt-pc-sub{text-align:center;font-size:10px;color:#9090bb;margin-top:4px;position:relative;z-index:1}
.rt-pc-divider{height:1px;background:#2a2850;margin:6px 12px;opacity:.5;position:relative;z-index:1}
.rt-pc-body{display:flex;padding:5px 12px;position:relative;z-index:1}
.rt-pc-sprite{flex:0 0 76px;height:98px;display:flex;align-items:center;justify-content:center}
.rt-pc-sprite img{max-width:100%;max-height:100%;object-fit:contain}
.rt-pc-right{flex:1;padding-left:4px}
.rt-pc-hp-row{display:flex;justify-content:space-between;font-size:9px;color:#ddddff}
.rt-pc-hp-bar{height:8px;background:#0a0a18;border-radius:4px;margin-top:3px;overflow:hidden}
.rt-pc-hp-fill{height:100%;border-radius:4px;transition:width .3s}
.rt-pc-stats-g{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;margin-top:7px}
.rt-pc-sg{display:flex;align-items:center;gap:5px}
.rt-pc-sg-i{font-size:13px}
.rt-pc-sg-l{font-size:9px;color:#ccccee}
.rt-pc-sg-v{font-size:12px;font-weight:700}
.rt-pc-gear{margin-top:7px;border-top:1px dashed #2a2850;padding:6px 12px 12px;position:relative;z-index:1}
.rt-pc-gear-title{text-align:center;font-size:9px;color:#aaaacc;font-weight:700;letter-spacing:1px;margin-bottom:5px}
.rt-pc-equip{display:grid;grid-template-columns:56px 1fr 56px;grid-template-rows:repeat(3,56px);gap:5px;align-items:stretch}
.rt-pc-eq-sprite{grid-column:2;grid-row:1/4;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 55%,rgba(180,90,255,.18),transparent 70%);border-radius:8px}
.rt-pc-eq-sprite img{max-width:100%;max-height:100%;object-fit:contain}
.rt-pc-eq-slot{background:linear-gradient(180deg,#1f1d2e,#16142a);border:1.5px solid #2a2840;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:2px;text-align:center;overflow:hidden}
.rt-pc-eq-slot.empty{opacity:.3;border-style:dashed}
.rt-pc-eq-label{font-size:6.5px;color:#aaaacc;letter-spacing:.4px;font-weight:700;text-transform:uppercase}
.rt-pc-eq-img{flex:1;display:flex;align-items:center;justify-content:center;width:100%;margin:1px 0}
.rt-pc-eq-img img{max-width:26px;max-height:26px;object-fit:contain;mix-blend-mode:lighten;filter:drop-shadow(0 0 4px rgba(180,120,255,.5))}
.rt-pc-eq-emoji{font-size:18px;line-height:1}
.rt-pc-eq-name{font-size:6px;font-weight:700;line-height:1.1;max-width:52px;word-wrap:break-word;padding:0 1px}
.rt-pc-wl{display:flex;justify-content:center;gap:12px;padding:6px 12px 10px;position:relative;z-index:1}
.rt-pc-wl-item{display:flex;flex-direction:column;align-items:center;gap:2px}
.rt-pc-wl-v{font-size:14px;font-weight:800;color:#ffd700}
.rt-pc-wl-v.me{color:#00f5ff}
.rt-pc-wl-l{font-size:8px;color:#8888aa;letter-spacing:.3px}
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
  { key: 'boss',   label: '☠️ Босс',   icon: '☠️' },
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
  const order = [top3[1], top3[0], top3[2]]; // 2-1-3
  const ranks  = [2, 1, 3];
  const heights = [62, 84, 48];
  const medals  = ['🥈','🥇','🥉'];
  const colors  = ['#aabbcc','#ffd700','#cc9955'];
  const bgs     = ['rgba(20,22,30,.95)','rgba(30,22,0,.95)','rgba(24,14,6,.95)'];
  const borders = ['rgba(170,180,200,.5)','rgba(255,215,0,.7)','rgba(160,100,48,.5)'];
  const myUid   = State?.player?.user_id;

  return `<div class="rt-podium">${order.map((p, i) => {
    if (!p) return `<div class="rt-pod-col" style="width:76px"></div>`;
    const isMe = p.user_id === myUid;
    const meClass = isMe ? ' rt-pod-me' : '';
    const nm = _esc(_trunc(p.username || `User${p.user_id}`, 10));
    return `<div class="rt-pod-col" data-pid="${p.user_id}" data-rank="${ranks[i]}" data-tab="${tabKey}">
      <div class="rt-pod-medal" style="color:${colors[i]}">${medals[i]}</div>
      <div class="rt-pod-name">${nm}</div>
      <div class="rt-pod-block${meClass}" style="height:${heights[i]}px;background:${bgs[i]};border:1.5px solid ${borders[i]};box-shadow:0 0 18px ${borders[i]},inset 0 0 12px rgba(255,255,255,.03)">
        <div class="rt-pod-score" style="color:${colors[i]};text-shadow:0 0 10px ${colors[i]}">${_esc(meta.scoreLabel(p))}</div>
        <div class="rt-pod-lvl">Ур.${p.level||'—'}</div>
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

  const top3 = list.length >= 3 ? list.slice(0,3) : null;
  let html = '';
  if (top3) html += _podiumHTML(top3, meta, tabKey);
  if (list.length > 3) {
    html += `<div class="rt-section">Остальные участники</div><div class="rt-list">${list.slice(3).map((p,i)=>_rowHTML(p, i+3, meta, tabKey)).join('')}</div>`;
  }
  return html;
}

function _myPosHTML(meta, myRank, myScore, label) {
  if (!myRank) return '';
  return `<div class="rt-mypos">
    <div style="flex:1">
      <div class="rt-mypos-label">Ваш результат</div>
      <div class="rt-mypos-val">#${myRank} · ${label || myScore}</div>
    </div>
    <div style="font-size:11px;color:#00f5ff;opacity:.6">${myScore}</div>
  </div>`;
}

function _infoBox(title, lines) {
  return `<div class="rt-info">
    <div class="rt-info-title">${_esc(title)}</div>
    <div class="rt-info-sub">${lines.map(l => _esc(l)).join(' · ')}</div>
  </div>`;
}

const _ITEM_IMG_BASE = {
  tank_free:'armor_free1', agile_free:'armor_free2', crit_free:'armor_free3', universal_free:'armor_free4',
  berserker_gold:'armor_gold1', assassin_gold:'armor_gold2', mage_gold:'armor_gold3', paladin_gold:'armor_gold4',
  dragonknight_diamonds:'armor_dia1', shadowdancer_diamonds:'armor_dia2', archmage_diamonds:'armor_dia3', universal_diamonds:'armor_dia4',
  berserker_mythic:'armor_mythic1', assassin_mythic:'armor_mythic2', archmage_mythic:'armor_mythic3', legendary_usdt:'armor_mythic4',
};
const _SLOT_ICON = { weapon:'🗡', shield:'🛡', armor:'👕', belt:'🪖', boots:'👢', ring1:'💍' };
const _SLOT_LABEL = { weapon:'Оружие', shield:'Щит', armor:'Броня', belt:'Шлем', boots:'Сапоги', ring1:'Кольцо' };
const _SLOT_LAYOUT = { belt:{r:1,c:1}, armor:{r:2,c:1}, boots:{r:3,c:1}, weapon:{r:1,c:3}, shield:{r:2,c:3}, ring1:{r:3,c:3} };

if (!window._rtImgFb) {
  window._rtImgFb = function(img) {
    const tries = (img.dataset.tries || '').split(',').filter(Boolean);
    if (!tries.length) {
      const E = _SLOT_ICON;
      if (img.parentNode) img.parentNode.innerHTML = `<span class="rt-pc-eq-emoji">${E[img.dataset.slot]||'•'}</span>`;
      return;
    }
    img.src = (img.dataset.base||'') + '.' + tries.shift();
    img.dataset.tries = tries.join(',');
  };
}

function _itemImgBase(it) {
  const id = it.item_id || '', slot = it.slot, rar = it.rarity || 'common';
  if (['shield','belt','ring1','boots'].includes(slot)) return id;
  if (slot === 'armor') return _ITEM_IMG_BASE[id] || ({common:'armor_free1',rare:'armor_gold1',epic:'armor_dia1',mythic:'armor_mythic1'}[rar]||'armor_free1');
  if (slot === 'weapon') {
    const [wt='sword', sfx=''] = id.split('_');
    const rcl = {gold:'rare',diamond:'epic',mythic:'mythic',free:'free',steel:'rare',iron:'free'}[sfx] || {common:'free',rare:'rare',epic:'epic',mythic:'mythic'}[rar] || 'free';
    return `weapon_${['sword','axe','club','gs'].includes(wt)?wt:'sword'}_${rcl}`;
  }
  return null;
}

function _renderEquipSlot(slot, it) {
  const L = _SLOT_LAYOUT[slot]; if (!L) return '';
  const style = `grid-row:${L.r};grid-column:${L.c};` + (it ? `border-color:${it.color};box-shadow:inset 0 0 7px ${it.color}33;` : '');
  const base = it ? _itemImgBase(it) : null;
  const visual = base
    ? `<div class="rt-pc-eq-img"><img src="${base}.png" data-base="${base}" data-tries="jpg,jpeg" data-slot="${slot}" onerror="window._rtImgFb&&window._rtImgFb(this)"></div>`
    : `<div class="rt-pc-eq-img"><span class="rt-pc-eq-emoji">${_SLOT_ICON[slot]||'•'}</span></div>`;
  const nm = it ? _esc(_trunc(it.name, 12)) : '';
  return `<div class="rt-pc-eq-slot${it?'':' empty'}" style="${style}">
    <div class="rt-pc-eq-label">${_SLOT_LABEL[slot]||slot}</div>${visual}
    ${it?`<div class="rt-pc-eq-name" style="color:${it.color}">${nm}</div>`:''}
  </div>`;
}

async function _fetchAndShowCard(uid, rank, tabKey, fallbackData) {
  document.getElementById('rt-pc-wrap')?.remove();
  const myUid = State?.player?.user_id;
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  // Показываем скелетон пока грузим
  const wrap = document.createElement('div');
  wrap.id = 'rt-pc-wrap'; wrap.className = 'rt-pc-wrap';
  wrap.innerHTML = `<div class="rt-pc"><div style="padding:40px;text-align:center;color:#888;font-size:13px;position:relative;z-index:1">⏳ Загрузка...</div></div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });

  let d;
  try { d = await get(`/api/player/public/${uid}`); } catch(_) { d = null; }

  if (!document.getElementById('rt-pc-wrap')) return; // закрыли пока грузилось

  if (!d?.ok) {
    // Fallback: показать базовые данные из leaderboard без HP/stats/items
    d = { ok: true, user_id: uid, username: fallbackData?.username || '', level: fallbackData?.level || '?',
          wins: fallbackData?.wins, losses: fallbackData?.losses, rating: fallbackData?.rating,
          max_hp: 0, current_hp: 0, strength: 0, endurance: 0, crit: 0, warrior_type: 'tank',
          is_premium: false, win_streak: 0, items: [] };
  }

  const isMe  = uid === myUid;
  const isPrem = d.is_premium;
  const nm    = _esc(_trunc(d.username || `ID${uid}`, 22));
  const wt    = d.warrior_type || 'tank';
  const skinUrl = (typeof getWarriorSkinPath === 'function') ? getWarriorSkinPath(wt) : `skins/sila/1.png`;
  const hpPct  = d.max_hp > 0 ? Math.min(1, Math.max(0, d.current_hp / d.max_hp)) : 1;
  const hpCol  = hpPct > 0.5 ? '#3cc864' : hpPct > 0.25 ? '#ffc83c' : '#dc3c46';

  const itemsBySlot = {};
  (d.items || []).forEach(it => { itemsBySlot[it.slot] = it; });
  const equipHtml = ['belt','armor','boots','weapon','shield','ring1']
    .map(sl => _renderEquipSlot(sl, itemsBySlot[sl])).join('');

  const headLabel = isMe ? '<span style="color:#00f5ff">🧑 Вы</span>' :
                   isPrem ? '<span style="color:#ffc83c">👑 Игрок</span>' :
                            '<span style="color:#3cc864">⚔️ Игрок</span>';

  const hpBlock = d.max_hp > 0 ? `
    <div class="rt-pc-hp-row"><span>❤️ HP</span><span style="color:${hpCol}">${d.current_hp} / ${d.max_hp}</span></div>
    <div class="rt-pc-hp-bar"><div class="rt-pc-hp-fill" style="width:${hpPct*100}%;background:${hpCol}"></div></div>` : '';

  const statsBlock = (d.strength || d.endurance || d.crit) ? `
    <div class="rt-pc-stats-g">
      <div class="rt-pc-sg"><span class="rt-pc-sg-i">💪</span><div><div class="rt-pc-sg-v" style="color:#dc3c46">${d.strength}</div><div class="rt-pc-sg-l">Сила</div></div></div>
      <div class="rt-pc-sg"><span class="rt-pc-sg-i">🤸</span><div><div class="rt-pc-sg-v" style="color:#3cc8dc">${d.endurance}</div><div class="rt-pc-sg-l">Ловкость</div></div></div>
      <div class="rt-pc-sg"><span class="rt-pc-sg-i">💥</span><div><div class="rt-pc-sg-v" style="color:#b45aff">${d.crit}</div><div class="rt-pc-sg-l">Интуиция</div></div></div>
      <div class="rt-pc-sg"><span class="rt-pc-sg-i">⭐</span><div><div class="rt-pc-sg-v" style="color:#ffd700">${d.rating||1000}</div><div class="rt-pc-sg-l">Рейтинг</div></div></div>
    </div>` : '';

  wrap.querySelector('.rt-pc').outerHTML = `<div class="rt-pc${isPrem?' prem':''}${isMe?' me':''}">
    <div class="rt-pc-head">
      <div>${headLabel} · ${medal}</div>
      <div class="rt-pc-close" id="rt-pc-close">✕</div>
    </div>
    <div class="rt-pc-name${isPrem?' prem':''}${isMe?' me':''}">${isPrem?'👑 ':''}${nm}</div>
    <div class="rt-pc-sub">Ур. ${d.level||'?'}${d.win_streak>0?` · 🔥 ${d.win_streak} подряд`:''}</div>
    <div class="rt-pc-divider"></div>
    <div class="rt-pc-body">
      <div class="rt-pc-sprite"><img src="${skinUrl}" alt="" onerror="this.style.display='none'"></div>
      <div class="rt-pc-right">${hpBlock}${statsBlock}</div>
    </div>
    <div class="rt-pc-wl">
      <div class="rt-pc-wl-item"><div class="rt-pc-wl-v${isMe?' me':''}">🏆 ${d.wins??'—'}</div><div class="rt-pc-wl-l">ПОБЕДЫ</div></div>
      <div class="rt-pc-wl-item"><div class="rt-pc-wl-v${isMe?' me':''}">💀 ${d.losses??'—'}</div><div class="rt-pc-wl-l">ПОРАЖЕНИЙ</div></div>
    </div>
    <div class="rt-pc-gear">
      <div class="rt-pc-gear-title">🎽 ЧТО ОДЕТО</div>
      <div class="rt-pc-equip">
        <div class="rt-pc-eq-sprite"><img src="${skinUrl}" alt="" onerror="this.style.display='none'"></div>
        ${equipHtml}
      </div>
    </div>
  </div>`;

  document.getElementById('rt-pc-close')?.addEventListener('click', () => wrap.remove());
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
      if (!myRank || myRank > 10) html += _myPosHTML(meta, myRank, `★ ${myElo}`, myRank ? `#${myRank}` : 'вне топа');

    } else if (key === 'titans') {
      const d = cache.titans || (cache.titans = await get('/api/titans/top'));
      if (!d.ok) throw new Error();
      const list = d.leaders || [];
      const myIdx  = list.findIndex(p => p.user_id === myUid);
      const myRank = myIdx >= 0 ? myIdx + 1 : null;
      const myFloor = myIdx >= 0 ? list[myIdx].weekly_best_floor : null;
      html += _infoBox(`🗿 Неделя: ${d.week_key||'—'}`, ['🥇 400💰+150💎  🥈 250💰+90💎  🥉 150💰+60💎  4-10: 60💰+25💎']);
      html += _buildList(list, meta, key);
      if (!myRank || myRank > 10) html += _myPosHTML(meta, myRank, myFloor ? `Этаж ${myFloor}` : 'нет данных', myRank ? `#${myRank}` : 'не участвовал');

    } else if (key === 'natisk') {
      const d = cache.natisk || (cache.natisk = await get('/api/endless/top'));
      if (!d.ok) throw new Error();
      const list   = d.weekly || d.leaders || [];
      const myIdx  = list.findIndex(p => p.user_id === myUid);
      const myRank = myIdx >= 0 ? myIdx + 1 : (d.my_pos || null);
      const myWave = myIdx >= 0 ? list[myIdx].best_wave : null;
      html += _infoBox(`🔥 Неделя: ${d.week_key||'—'}`, ['🥇 300💰+100💎  🥈 200💰+60💎  🥉 100💰+40💎  4-10: 50💰+15💎']);
      html += _buildList(list, meta, key);
      if (!myRank || myRank > 10) html += _myPosHTML(meta, myRank, myWave ? `Волна ${myWave}` : 'нет данных', myRank ? `#${myRank}` : 'не участвовал');

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
      if (!myRank || myRank > 10) html += _myPosHTML(meta, myRank, `★ ${myElo}`, myRank ? `#${myRank}` : 'вне топа');

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
      if (myPos && myPos > 10 && myDmg > 0) html += _myPosHTML(meta, myPos, _fmtNum(myDmg), `#${myPos}`);
    }

    body.innerHTML = html;

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
      const fallback = this._players?.[uid];
      _fetchAndShowCard(uid, rank, tKey, fallback);
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
