/* ============================================================
   Clan HTML Subviews — киберпанк-тема: Заявки, Сезон, Войны, Награды, История
   Использует cl-* классы из clan_html_overlay.js + свои доп-стили
   ============================================================ */
(() => {
const CSS = `
.cl-sub-title{font-size:13px;font-weight:800;letter-spacing:1px;color:#ffd166;text-align:center;margin:8px 0 12px;text-shadow:0 0 10px rgba(255,209,102,.5)}
.cl-sub-sub{font-size:10px;color:#80d8ff;text-align:center;margin-top:-8px;margin-bottom:12px;opacity:.85;padding:0 14px}
.cl-empty{text-align:center;padding:40px 20px;color:#80c8ff;font-size:12px;opacity:.85}
.cl-empty .em{font-size:28px;margin-bottom:8px}
.cl-err{text-align:center;padding:40px 20px;color:#ff8ea0;font-size:12px}
.cl-card-ng{margin:0 12px 10px;padding:12px;border-radius:14px;background:linear-gradient(135deg,rgba(20,0,30,.92),rgba(5,5,15,.92));border:1px solid #ff3ba8;box-shadow:0 0 18px rgba(255,59,168,.2)}
.cl-card-ng.gold{border-color:#ffd166;box-shadow:0 0 18px rgba(255,209,102,.25)}
.cl-card-ng.cyan{border-color:#00f0ff;box-shadow:0 0 18px rgba(0,240,255,.2)}
.cl-card-tl{font-size:10px;font-weight:700;color:#ff7acb;letter-spacing:.6px;margin-bottom:6px}
.cl-card-v{font-size:22px;font-weight:800;color:#fff;text-shadow:0 0 10px #00f0ff}
.cl-rlist{padding:0 12px;display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.cl-rrow{padding:10px 12px;border-radius:12px;display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,rgba(15,5,30,.85),rgba(5,5,15,.85));border:1px solid rgba(0,240,255,.2)}
.cl-rrow.gold{border-color:#ffd166;background:linear-gradient(90deg,rgba(30,20,0,.85),rgba(15,10,5,.85));box-shadow:0 0 10px rgba(255,209,102,.2)}
.cl-ric{font-size:18px;width:28px;text-align:center;flex-shrink:0}
.cl-rbody{flex:1;min-width:0}
.cl-rt{font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cl-rs{font-size:10px;color:#80c8ff;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cl-rval{font-size:13px;font-weight:800;color:#ffd166;text-shadow:0 0 6px currentColor;margin-left:auto;flex-shrink:0}
.cl-rbtns{display:flex;gap:6px;margin-left:auto;flex-shrink:0}
.cl-mini{width:36px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:14px;font-weight:800;cursor:pointer;user-select:none;border:1px solid currentColor;background:rgba(10,5,25,.9);box-shadow:0 0 8px currentColor;transition:transform .1s}
.cl-mini:active{transform:scale(.92)}
.cl-mini.ok{color:#00f0ff}
.cl-mini.no{color:#ff3ba8}
.cl-wbtn{padding:6px 12px;height:30px;border-radius:9px;font-size:11px;font-weight:800;cursor:pointer;user-select:none;border:1px solid #ff3ba8;background:rgba(10,5,25,.9);color:#ffa8d8;box-shadow:0 0 10px rgba(255,59,168,.4);transition:transform .1s}
.cl-wbtn:active{transform:scale(.95)}
.cl-vs{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin:10px 0}
.cl-vs-side{text-align:center}
.cl-vs-side .nm{font-size:11px;font-weight:700;color:#80c8ff}
.cl-vs-side .sc{font-size:32px;font-weight:900;text-shadow:0 0 12px currentColor}
.cl-vs-side.me .sc{color:#00f0ff}
.cl-vs-side.op .sc{color:#ff3ba8}
.cl-vs-sep{font-size:22px;color:#fff;font-weight:800}
.cl-timer{text-align:center;font-size:12px;font-weight:700;color:#ffd166;margin-top:8px;text-shadow:0 0 6px currentColor}
.cl-accept-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.cl-accept-row .b{height:36px;border-radius:10px;display:grid;place-items:center;font-size:12px;font-weight:800;cursor:pointer;user-select:none;border:1px solid currentColor;background:rgba(10,5,25,.9);box-shadow:0 0 10px currentColor}
.cl-accept-row .b.ok{color:#00f0ff}
.cl-accept-row .b.no{color:#ff3ba8}
.cl-medal{font-size:20px;flex-shrink:0;width:32px;text-align:center}
.cl-medal.top3{filter:drop-shadow(0 0 6px #ffd166)}
`;
function _injectCSS(){ if(document.getElementById('cl-sub-style'))return; const s=document.createElement('style'); s.id='cl-sub-style'; s.textContent=CSS; document.head.appendChild(s); }
function _esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function _trunc(s,n){return s&&s.length>n?s.slice(0,n)+'…':(s||'');}

function _shell(scene, iconEmoji, title, bodyHTML, sub) {
  window.ClanHTML._injectCSS?.();
  _injectCSS();
  window.ClanHTML.close();
  const root = document.createElement('div');
  root.id = 'cl-root';
  root.className = 'cl-overlay';
  root.innerHTML = `
  <div class="cl-panel">
    <div class="cl-hdr">
      <span class="cl-back" data-act="back">‹</span>
      <div class="cl-hdr-icon">${iconEmoji}</div>
      <div><div class="cl-hdr-title">${title}</div>${sub?`<div class="cl-hdr-sub">${_esc(sub)}</div>`:''}</div>
    </div>
    <div id="cl-sub-body">${bodyHTML}</div>
  </div>`;
  document.body.appendChild(root);
  root.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
  root.querySelector('[data-act="back"]').onclick = () => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    window.ClanHTML.close();
    scene.scene.restart({ sub: 'main' });
  };
  return root;
}

/* ── Заявки ── */
async function openRequests(scene) {
  _shell(scene, '📨', 'ЗАЯВКИ', '<div class="cl-empty"><div class="em">⏳</div>Загрузка...</div>');
  let data;
  try { data = await get('/api/clan/requests'); } catch(_) { return _setBody('<div class="cl-err">❌ Нет соединения</div>'); }
  if (!data?.ok) return _setBody(`<div class="cl-err">❌ ${_esc(data?.reason||'Ошибка')}</div>`);
  const reqs = data.requests || [];
  if (!reqs.length) return _setBody('<div class="cl-empty"><div class="em">✨</div>Заявок пока нет<br><span style="font-size:10px;opacity:.7">Игроки увидят клан в поиске</span></div>');
  const rows = reqs.map(r => `
    <div class="cl-rrow" data-id="${r.id}">
      <div class="cl-ric">👤</div>
      <div class="cl-rbody">
        <div class="cl-rt">${_esc(_trunc(r.username||`User${r.user_id}`,18))}</div>
        <div class="cl-rs">Ур.${r.level|0} · 🏆 ${r.wins|0}</div>
      </div>
      <div class="cl-rbtns">
        <div class="cl-mini ok"  data-act="accept" data-id="${r.id}">✓</div>
        <div class="cl-mini no"  data-act="reject" data-id="${r.id}">✕</div>
      </div>
    </div>`).join('');
  _setBody(`<div class="cl-rlist">${rows}</div>`);
  _bind(scene, async (act, id) => {
    if (act !== 'accept' && act !== 'reject') return;
    if (scene._clanSubBusy) return; scene._clanSubBusy = true;
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(act==='accept'?'medium':'light'); } catch(_) {}
    const ep = act === 'accept' ? '/api/clan/request_accept' : '/api/clan/request_reject';
    const res = await post(ep, { request_id: +id }).catch(() => ({ ok: false, reason: 'Нет соединения' }));
    scene._clanSubBusy = false;
    if (res.ok) { window.ClanHTML._toast?.(act==='accept'?'✅ Принят!':'❌ Отклонено'); setTimeout(()=>openRequests(scene), 300); }
    else window.ClanHTML._toast?.('❌ '+res.reason);
  });
}

/* ── Сезон ── */
function _fmtTime(endsAt) {
  if (!endsAt) return '—';
  try {
    const s = (typeof endsAt === 'string') ? endsAt.replace(' ','T').replace('Z','+00:00') : endsAt;
    const ms = new Date(s).getTime() - Date.now();
    if (ms <= 0) return 'обновляется...';
    const d = Math.floor(ms/86400000), h = Math.floor((ms%86400000)/3600000), m = Math.floor((ms%3600000)/60000);
    if (d > 0) return `${d}д ${h}ч`;
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
  } catch(_) { return '—'; }
}
const EM_IC = { light:'☀️', dark:'🌑', neutral:'⚖️' };

async function openSeason(scene) {
  _shell(scene, '🏆', 'СЕЗОН', '<div class="cl-empty"><div class="em">⏳</div>Загрузка...</div>');
  let d;
  try { d = await get('/api/clan/season'); } catch(_) { return _setBody('<div class="cl-err">❌ Нет соединения</div>'); }
  if (!d?.ok) return _setBody('<div class="cl-err">❌ Ошибка загрузки</div>');
  const season = d.season || {}, top = d.top || [];
  let body = `<div class="cl-card-ng gold">
    <div class="cl-card-tl">⏱️ ДО КОНЦА СЕЗОНА</div>
    <div class="cl-card-v">${_fmtTime(season.ends_at)}</div>
    <div class="cl-card-tl" style="margin-top:10px">🏅 НАГРАДЫ (КАЖДОМУ В КЛАНЕ)</div>
    <div style="font-size:11px;color:#ffd166;font-weight:700;margin-top:4px;text-shadow:0 0 6px currentColor">🥇 500🪙+5💎 · 🥈 300🪙+3💎 · 🥉 150🪙+1💎</div>
  </div>
  <div class="cl-mlabel">ТОП СЕЗОНА</div>`;
  if (!top.length) body += '<div class="cl-empty">😔 Никто пока не набрал очков</div>';
  else {
    body += '<div class="cl-rlist">';
    top.forEach((c,i) => {
      const top3 = i < 3;
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
      const em = EM_IC[c.emblem] || '⚖️';
      body += `<div class="cl-rrow${top3?' gold':''}">
        <div class="cl-medal${top3?' top3':''}">${medal}</div>
        <div class="cl-ric">${em}</div>
        <div class="cl-rbody">
          <div class="cl-rt"><span style="color:#00f0ff">[${_esc(c.tag||'')}]</span> ${_esc(_trunc(c.name,14))}</div>
          <div class="cl-rs">👥 ${c.member_count}/20 · Ур.${c.level}</div>
        </div>
        <div class="cl-rval">${c.season_score} оч</div>
      </div>`;
    });
    body += '</div>';
  }
  _setBody(body);
}

/* ── Войны ── */
async function openWars(scene) {
  _shell(scene, '⚔️', 'ВОЙНЫ', '<div class="cl-empty"><div class="em">⏳</div>Загрузка...</div>',
    '24ч · победа = +1 очко · награда 200🪙+2💎 каждому');
  let wd, cd;
  try { [wd, cd] = await Promise.all([get('/api/clan/war'), get('/api/clan')]); }
  catch(_) { return _setBody('<div class="cl-err">❌ Нет соединения</div>'); }
  if (!wd?.ok) return _setBody(`<div class="cl-err">❌ ${_esc(wd?.reason||'Нет клана')}</div>`);
  const myCid = wd.my_clan_id, isLeader = !!cd?.is_leader, war = wd.war;
  let body = '';
  if (war) {
    const isA = (war.clan_a === myCid);
    const myScore = isA ? war.score_a : war.score_b;
    const opScore = isA ? war.score_b : war.score_a;
    const opCid = isA ? war.clan_b : war.clan_a;
    if (war.status === 'pending') {
      const incoming = !isA;
      body = `<div class="cl-card-ng gold">
        <div class="cl-card-tl" style="text-align:center;color:#ffd166">${incoming?'📨 ВЫЗОВ НА ВОЙНУ':'⏳ ОЖИДАНИЕ ОТВЕТА'}</div>
        <div style="text-align:center;font-size:13px;color:#fff;margin-top:6px">${incoming?`Клан #${war.clan_a} вызывает вас!`:`Вы вызвали клан #${war.clan_b}`}</div>
        ${incoming && isLeader
          ? `<div class="cl-accept-row"><div class="b ok" data-act="accept" data-id="${war.id}">✓ Принять</div><div class="b no" data-act="decline" data-id="${war.id}">✕ Отклонить</div></div>`
          : `<div style="text-align:center;font-size:10px;color:#80c8ff;margin-top:8px;opacity:.8">${incoming?'Только лидер может ответить':'Жди ответа лидера соперника'}</div>`}
      </div>`;
    } else {
      body = `<div class="cl-card-ng cyan">
        <div class="cl-card-tl" style="text-align:center;color:#00f0ff">⚔️ ИДЁТ ВОЙНА</div>
        <div class="cl-vs">
          <div class="cl-vs-side me"><div class="nm">ВЫ</div><div class="sc">${myScore}</div></div>
          <div class="cl-vs-sep">:</div>
          <div class="cl-vs-side op"><div class="nm">Клан #${opCid}</div><div class="sc">${opScore}</div></div>
        </div>
        <div class="cl-timer">⏱️ ${_fmtTime(war.ends_at)}</div>
      </div>`;
    }
  } else if (isLeader) {
    body = '<div class="cl-mlabel">ВЫЗВАТЬ КЛАН НА ВОЙНУ</div><div id="cl-wars-top" class="cl-rlist"><div class="cl-empty">⏳</div></div>';
  } else {
    body = '<div class="cl-empty"><div class="em">😴</div>Войн нет<br><span style="font-size:10px;opacity:.7">Только лидер может бросить вызов</span></div>';
  }
  _setBody(body);
  _bind(scene, async (act, id) => {
    if (act === 'accept' || act === 'decline') {
      if (scene._clanSubBusy) return; scene._clanSubBusy = true;
      const action = act === 'accept' ? 'accept' : 'decline';
      const res = await post('/api/clan/war/'+action, { war_id: +id }).catch(() => ({ok:false,reason:'Нет соединения'}));
      scene._clanSubBusy = false;
      if (res.ok) { window.ClanHTML._toast?.(act==='accept'?'⚔️ Война началась!':'❌ Отклонено'); setTimeout(()=>openWars(scene), 700); }
      else window.ClanHTML._toast?.('❌ '+res.reason);
    }
    if (act === 'challenge') {
      if (scene._clanSubBusy) return; scene._clanSubBusy = true;
      const res = await post('/api/clan/war/challenge', { target_clan_id: +id }).catch(() => ({ok:false,reason:'Нет соединения'}));
      scene._clanSubBusy = false;
      if (res.ok) { window.ClanHTML._toast?.('⚔️ Вызов отправлен'); setTimeout(()=>openWars(scene), 700); }
      else window.ClanHTML._toast?.('❌ '+res.reason);
    }
  });
  if (!war && isLeader) {
    try {
      const tr = await get('/api/clan/top');
      const list = (tr?.clans||[]).filter(c => c.id !== myCid).slice(0, 5);
      const topEl = document.getElementById('cl-wars-top');
      if (topEl) {
        topEl.innerHTML = list.length ? list.map(c => `
          <div class="cl-rrow">
            <div class="cl-ric">${EM_IC[c.emblem]||'⚖️'}</div>
            <div class="cl-rbody">
              <div class="cl-rt"><span style="color:#00f0ff">[${_esc(c.tag||'')}]</span> ${_esc(_trunc(c.name,14))}</div>
              <div class="cl-rs">Ур.${c.level} · 🏆 ${c.wins|0}</div>
            </div>
            <div class="cl-wbtn" data-act="challenge" data-id="${c.id}">⚔️ Вызвать</div>
          </div>`).join('') : '<div class="cl-empty">Нет доступных кланов</div>';
      }
    } catch(_) {}
  }
}

/* ── Награды (достижения) ── */
async function openAchievements(scene) {
  _shell(scene, '🏅', 'НАГРАДЫ', '<div class="cl-empty"><div class="em">⏳</div>Загрузка...</div>');
  let d;
  try { d = await get('/api/clan/achievements'); } catch(_) { return _setBody('<div class="cl-err">❌ Нет соединения</div>'); }
  if (!d?.ok) return _setBody(`<div class="cl-err">❌ ${_esc(d?.reason||'Нет клана')}</div>`);
  const items = d.achievements || [];
  const unlocked = items.filter(i => i.unlocked).length;
  let body = `<div style="text-align:center;font-size:11px;color:#80d8ff;margin:-6px 0 10px">Открыто: <span style="color:#ffd166;font-weight:800;text-shadow:0 0 6px currentColor">${unlocked}</span> / ${items.length}</div><div class="cl-rlist">`;
  items.forEach(it => {
    const open = !!it.unlocked;
    body += `<div class="cl-rrow${open?' gold':''}">
      <div class="cl-ric" style="${open?'filter:drop-shadow(0 0 6px #ffd166)':'opacity:.5'}">${it.icon||'🏅'}</div>
      <div class="cl-rbody">
        <div class="cl-rt" style="color:${open?'#ffd166':'#a8b4d8'}">${_esc(it.name)}</div>
        <div class="cl-rs">${_esc(it.description||'')}</div>
      </div>
      <div class="cl-rval" style="color:${open?'#00f0ff':'#80c8ff'}">${open?'✓':'≥ '+it.threshold}</div>
    </div>`;
  });
  body += '</div>';
  _setBody(body);
}

/* ── История ── */
const HIST = {
  join:         {i:'🚪',t:'вступил в клан',c:'#a0e0a0'},
  leave:        {i:'🚶',t:'покинул клан',c:'#c8d4f0'},
  kick:         {i:'⛔',t:'исключён',c:'#ff8ea0'},
  autokick:     {i:'⏰',t:'авто-кик (неактив 30д)',c:'#ff8ea0'},
  transfer:     {i:'👑',t:'стал лидером',c:'#ffd166'},
  achievement:  {i:'🏅',t:'достижение',c:'#ffd166'},
  season_reward:{i:'🏆',t:'награда сезона',c:'#ffc83c'},
  level_up:     {i:'⬆️',t:'уровень клана повышен',c:'#00f0ff'},
};
function _histTime(ts) {
  if (!ts) return '';
  try {
    const s = (typeof ts === 'string') ? ts.replace(' ','T').replace('Z','+00:00') : ts;
    const ms = Date.now() - new Date(s).getTime();
    if (ms < 60_000)    return 'только что';
    if (ms < 3600_000)  return Math.floor(ms/60_000) + 'м назад';
    if (ms < 86400_000) return Math.floor(ms/3600_000) + 'ч назад';
    return Math.floor(ms/86400_000) + 'д назад';
  } catch(_) { return ''; }
}
async function openHistory(scene) {
  _shell(scene, '📜', 'ИСТОРИЯ', '<div class="cl-empty"><div class="em">⏳</div>Загрузка...</div>');
  let d;
  try { d = await get('/api/clan/history'); } catch(_) { return _setBody('<div class="cl-err">❌ Нет соединения</div>'); }
  if (!d?.ok) return _setBody(`<div class="cl-err">❌ ${_esc(d?.reason||'Нет клана')}</div>`);
  const events = d.events || [];
  if (!events.length) return _setBody('<div class="cl-empty"><div class="em">✨</div>Событий пока нет</div>');
  let body = '<div class="cl-rlist">';
  events.forEach(ev => {
    const meta = HIST[ev.event_type] || {i:'•',t:ev.event_type,c:'#c8d4f0'};
    const who = _trunc(ev.actor_name || (ev.actor_id?`User${ev.actor_id}`:''), 14);
    body += `<div class="cl-rrow">
      <div class="cl-ric">${meta.i}</div>
      <div class="cl-rbody">
        <div class="cl-rt" style="color:${meta.c}">${who?_esc(who)+' — ':''}${meta.t}</div>
        ${ev.extra?`<div class="cl-rs">${_esc(_trunc(ev.extra,30))}</div>`:''}
      </div>
      <div class="cl-rval" style="color:#80c8ff;text-shadow:none;font-size:10px;font-weight:600">${_histTime(ev.created_at)}</div>
    </div>`;
  });
  body += '</div>';
  _setBody(body);
}

/* ── helpers ── */
function _setBody(html) { const b = document.getElementById('cl-sub-body'); if (b) b.innerHTML = html; }
function _bind(scene, handler) {
  const root = document.getElementById('cl-root');
  if (!root) return;
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.dataset.act === 'back') return;
    handler(el.dataset.act, el.dataset.id);
  });
}

Object.assign(window.ClanHTML, { openRequests, openSeason, openWars, openAchievements, openHistory, _shell, _setBody, _bind, _esc, _trunc });
})();
