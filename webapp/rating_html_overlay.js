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
  { key: 'pvp',    label: '👑 Слава',  icon: '👑' },
  { key: 'titans', label: '🗿 Башня',  icon: '🗿' },
  { key: 'natisk', label: '🔥 Натиск', icon: '🔥' },
  { key: 'season', label: '🌟 Сезон',  icon: '🌟' },
  { key: 'boss',   label: '☠️ Босс',   icon: '☠️' },
];

const TAB_META = {
  pvp:    { title: 'РЕЙТИНГ СЛАВЫ',   sub: 'Топ игроков по ELO рейтингу',              color: '#ffd700', glow: 'rgba(255,215,0,.35)',   scoreLabel: p => `★ ${p.rating}`,   subLabel: p => `🏆 ${p.wins||0}В  💀 ${p.losses||0}П` },
  titans: { title: 'БАШНЯ ТИТАНОВ',   sub: 'Топ покорителей башни за неделю',           color: '#00f0ff', glow: 'rgba(0,240,255,.35)',   scoreLabel: p => `${p.weekly_best_floor||0}`, subLabel: p => `🗿 Этаж ${p.weekly_best_floor||0}` },
  natisk: { title: 'НАТИСК ВОЛН',     sub: 'Топ выживших за неделю',                    color: '#ff6644', glow: 'rgba(255,100,70,.35)',  scoreLabel: p => `${p.best_wave||0}`, subLabel: p => `🔥 Волна ${p.best_wave||0}` },
  season: { title: 'СЕЗОННЫЙ РЕЙТИНГ',sub: 'Сезонные рейтинговые бои',                  color: '#c78fff', glow: 'rgba(180,100,255,.35)', scoreLabel: p => `★ ${p.rating}`,   subLabel: p => `🏆 ${p.wins||0}В  💀 ${p.losses||0}П` },
  boss:   { title: 'ТОП РЕЙДА',       sub: 'Лучшие по урону в последнем рейде',         color: '#ff3ba8', glow: 'rgba(255,59,168,.35)',  scoreLabel: p => _fmtNum(p.damage||p.total_damage||0), subLabel: p => `⚔️ ${_fmtNum(p.damage||p.total_damage||0)} урона` },
};

function _fmtNum(n) { return n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n); }

function _rankClass(i) { return i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other'; }
function _rowClass(i, isMe) { return 'rt-row' + (isMe ? ' me' : i === 0 ? ' gold' : i === 1 ? ' silver' : i === 2 ? ' bronze' : ''); }

function _podiumHTML(top3, meta) {
  const order = [top3[1], top3[0], top3[2]]; // 2-1-3
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
    return `<div class="rt-pod-col">
      <div class="rt-pod-medal" style="color:${colors[i]}">${medals[i]}</div>
      <div class="rt-pod-name">${nm}</div>
      <div class="rt-pod-block${meClass}" style="height:${heights[i]}px;background:${bgs[i]};border:1.5px solid ${borders[i]};box-shadow:0 0 18px ${borders[i]},inset 0 0 12px rgba(255,255,255,.03)">
        <div class="rt-pod-score" style="color:${colors[i]};text-shadow:0 0 10px ${colors[i]}">${_esc(meta.scoreLabel(p))}</div>
        <div class="rt-pod-lvl">Ур.${p.level||'—'}</div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function _rowHTML(p, i, meta) {
  const myUid = State?.player?.user_id;
  const isMe  = p.user_id === myUid;
  const rc    = _rankClass(i);
  const nm    = _esc(_trunc(p.username || `User${p.user_id}`, 18));
  const score = _esc(meta.scoreLabel(p));
  const sub   = _esc(meta.subLabel(p));
  return `<div class="${_rowClass(i, isMe)}">
    <div class="rt-rank ${rc}">${i+1}</div>
    <div class="rt-pinfo">
      <div class="rt-pname${isMe?' me':''}">${nm}${isMe?' <span style="font-size:8px;color:#00f5ff;opacity:.7">● ВЫ</span>':''}</div>
      <div class="rt-psub">${sub}</div>
    </div>
    <div class="rt-score${isMe?' me':''}">${score}</div>
  </div>`;
}

function _buildList(list, meta) {
  if (!list || !list.length) {
    return `<div class="rt-empty"><div class="rt-empty-icon">📭</div><div class="rt-empty-txt">Данных пока нет — первым войди в историю!</div></div>`;
  }
  const top3 = list.length >= 3 ? list.slice(0,3) : null;
  let html = '';
  if (top3) html += _podiumHTML(top3, meta);
  if (list.length > 3) {
    html += `<div class="rt-section">Остальные участники</div><div class="rt-list">${list.slice(3).map((p,i)=>_rowHTML(p, i+3, meta)).join('')}</div>`;
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
      html += _infoBox('🎁 Сезонные награды', ['🥇 500💰+200💎  🥈 300💰+120💎  🥉 200💰+75💎','4–10 место: 50💰+20💎']);
      html += _buildList(list, meta);
      if (!myRank || myRank > 10) html += _myPosHTML(meta, myRank, `★ ${myElo}`, myRank ? `#${myRank}` : 'вне топа');

    } else if (key === 'titans') {
      const d = cache.titans || (cache.titans = await get('/api/titans/top'));
      if (!d.ok) throw new Error();
      const list = d.leaders || [];
      html += _infoBox(`🗿 Неделя: ${d.week_key||'—'}`, ['🥇 400💰+150💎  🥈 250💰+90💎  🥉 150💰+60💎','Титулы: Покоритель / Гроза / Титаноборец']);
      html += _buildList(list, meta);

    } else if (key === 'natisk') {
      const d = cache.natisk || (cache.natisk = await get('/api/endless/top'));
      if (!d.ok) throw new Error();
      const list = d.weekly || d.leaders || [];
      html += _infoBox(`🔥 Неделя: ${d.week_key||'—'}`, ['🥇 300💰+100💎  🥈 200💰+60💎  🥉 100💰+40💎','Титулы: Покоритель Волн / Штормовой / Волновой']);
      html += _buildList(list, meta);

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
        const endsMs  = new Date(String(season.started_at).replace(' ','T')).getTime() + 14*24*3600*1000;
        const daysLeft = Math.max(0, Math.ceil((endsMs - Date.now()) / (24*3600*1000)));
        sub = `⏳ До конца: ${daysLeft} дн.`;
      }
      html += _infoBox(season ? season.name : 'Текущий сезон', [sub, '🥇500💰+200💎  🥈300💰+120💎  🥉200💰+75💎']);
      html += _buildList(list, meta);
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
      html += _buildList(top, meta);
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
  _root: null,
  _activeTab: 'pvp',

  open(tab) {
    tab = tab || 'pvp';
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
