/* ============================================================
   Clan HTML Overlay — киберпанк/неон тема для "Мой клан"
   Скрины: аватар-голограмма, розово-бирюзовые контуры, скан-линии
   ============================================================ */
(() => {
const CSS = `
.cl-overlay{position:fixed;top:0;left:0;right:0;bottom:76px;z-index:9000;display:flex;justify-content:center;background:radial-gradient(ellipse at 50% 0%,#1a0a2a 0%,#05050a 55%),#000;color:#e6f7ff;overflow-y:auto;overflow-x:hidden;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}
.cl-overlay::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.025) 3px 4px);pointer-events:none;z-index:1}
.cl-overlay::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 30%,rgba(255,40,170,.12),transparent 40%),radial-gradient(circle at 80% 70%,rgba(0,230,255,.10),transparent 40%);pointer-events:none;z-index:1}
.cl-panel{width:100%;max-width:430px;position:relative;z-index:2;padding:0 0 100px}
.cl-hdr{padding:14px 16px 10px;display:flex;align-items:center;gap:10px}
.cl-back{font-size:22px;color:#80d8ff;cursor:pointer;padding:4px 8px;opacity:.7;user-select:none}
.cl-hdr-icon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:18px;background:linear-gradient(135deg,#1a0533,#2a0a40);border:1px solid #ff3ba8;box-shadow:0 0 12px rgba(255,59,168,.5),inset 0 0 8px rgba(255,59,168,.2)}
.cl-hdr-title{font-size:16px;font-weight:800;letter-spacing:.5px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.cl-hdr-sub{font-size:10px;color:#00e0ff;opacity:.75;margin-top:1px}
.cl-card{margin:4px 12px;padding:12px;border-radius:14px;display:flex;gap:12px;align-items:center;background:linear-gradient(135deg,rgba(20,0,30,.95),rgba(5,5,15,.95));border:1px solid #ff3ba8;box-shadow:0 0 24px rgba(255,59,168,.25),inset 0 0 20px rgba(255,59,168,.05)}
.cl-av{width:72px;height:72px;display:grid;place-items:center;flex-shrink:0;position:relative;background:none;border:none;box-shadow:none}
.cl-av-img{width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(0,240,255,.65)) drop-shadow(0 0 5px rgba(0,240,255,.45));animation:clHolo 3s ease-in-out infinite}
@keyframes clHolo{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.75;transform:translateY(-1px)}}
.cl-info{flex:1;min-width:0}
.cl-tagrow{display:flex;gap:6px;align-items:center;font-size:11px;font-weight:700}
.cl-tag{color:#00f0ff;text-shadow:0 0 6px currentColor}
.cl-lvl{color:#ff3ba8;text-shadow:0 0 6px currentColor}
.cl-nm{font-size:17px;font-weight:800;color:#fff;text-shadow:0 0 12px rgba(0,240,255,.5);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cl-desc{font-size:10px;color:#80d8ff;margin-top:2px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cl-pills{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.cl-pill{padding:3px 10px;font-size:10px;font-weight:700;border-radius:10px;background:#0a0518;border:1px solid #ff3ba8;color:#ff7acb;box-shadow:0 0 8px rgba(255,59,168,.3)}
.cl-pill.wins{border-color:#ffd166;color:#ffe08a;box-shadow:0 0 8px rgba(255,209,102,.3)}
.cl-pill.closed{border-color:#ff3ba8;color:#ffa8d8;box-shadow:0 0 8px rgba(255,59,168,.35)}
.cl-pill.open{border-color:#00f0ff;color:#80e8ff;box-shadow:0 0 8px rgba(0,240,255,.3)}
.cl-pill.clickable{cursor:pointer;user-select:none;transition:transform .1s}
.cl-pill.clickable:active{transform:scale(.93)}
.cl-nav{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:10px 12px 6px}
.cl-navb{height:34px;border-radius:10px;display:grid;place-items:center;font-size:10.5px;font-weight:700;cursor:pointer;background:rgba(10,5,25,.8);border:1px solid rgba(0,240,255,.35);color:#80e8ff;text-shadow:0 0 4px currentColor;user-select:none;transition:all .15s}
.cl-navb.hot{border-color:#ff3ba8;color:#ffa8d8}
.cl-navb:active{transform:scale(.95)}
.cl-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:4px 12px 10px}
.cl-st{padding:10px 6px;border-radius:12px;text-align:center;background:linear-gradient(135deg,rgba(20,5,35,.9),rgba(5,5,18,.9));border:1px solid rgba(255,59,168,.4);box-shadow:0 0 10px rgba(255,59,168,.15)}
.cl-st-v{font-size:18px;font-weight:800;color:#00f0ff;text-shadow:0 0 10px currentColor}
.cl-st-l{font-size:9px;font-weight:700;color:#ff7acb;margin-top:4px;letter-spacing:.5px}
.cl-mlabel{font-size:10px;font-weight:700;padding:4px 16px;color:#00f0ff;letter-spacing:.5px;opacity:.85}
.cl-mlist{padding:0 12px;display:flex;flex-direction:column;gap:4px}
.cl-st.btn{cursor:pointer;user-select:none;transition:all .15s;border-color:rgba(0,240,255,.7);box-shadow:0 0 14px rgba(0,240,255,.2)}
.cl-st.btn:active{transform:scale(.93);box-shadow:0 0 20px rgba(0,240,255,.45)}
.cl-st-arr{font-size:9px;color:#00f0ff;margin-top:3px;opacity:.75;letter-spacing:.5px}
.cl-my-label{font-size:10px;font-weight:700;padding:4px 16px;color:#ff7acb;letter-spacing:.5px;opacity:.85}
.cl-mem-panel{background:linear-gradient(160deg,rgba(14,2,26,.98),rgba(4,4,14,.98));animation:clSlide .18s ease;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#e6f7ff}
@keyframes clSlide{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes clFadeOut{from{opacity:1}to{opacity:0;transform:translateY(8px)}}
.cl-mem-panel.closing{animation:clFadeOut .22s ease forwards}
.cl-mem-hdr{display:flex;align-items:center;gap:10px;padding:12px 14px 10px;border-bottom:1px solid rgba(0,240,255,.18);position:sticky;top:0;background:rgba(10,2,20,.97);z-index:2}
.cl-mem-hdr-title{font-size:13px;font-weight:800;color:#00f0ff;text-shadow:0 0 8px currentColor;letter-spacing:.5px}
.cl-mem-hdr-back{font-size:22px;color:#80d8ff;cursor:pointer;padding:2px 8px;opacity:.75;user-select:none}
.cl-mrow{padding:8px 10px;border-radius:10px;display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,rgba(15,5,30,.8),rgba(5,5,15,.8));border:1px solid rgba(0,240,255,.2)}
.cl-mrow.leader{border-color:#ffd166;box-shadow:0 0 12px rgba(255,209,102,.25)}
.cl-mic{font-size:15px;width:22px;text-align:center}
.cl-mn{font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
.cl-ms{font-size:10px;color:#80c8ff;margin-top:2px}
.cl-mbadge{padding:3px 8px;font-size:8px;font-weight:800;border-radius:6px;letter-spacing:.5px;margin-left:auto;background:rgba(0,240,255,.15);color:#00f0ff;border:1px solid #00f0ff;cursor:default;flex-shrink:0}
.cl-mbadge.leader{background:rgba(255,209,102,.15);color:#ffd166;border-color:#ffd166;box-shadow:0 0 8px rgba(255,209,102,.4)}
.cl-mact{display:flex;gap:4px;margin-left:auto;flex-shrink:0}
.cl-mact .cl-mbadge{margin:0;cursor:pointer}
.cl-mact .cl-mbadge:active{opacity:.7}
.cl-mact .danger{background:rgba(220,60,90,.15);color:#ff8ea0;border-color:#ff5a7a;box-shadow:0 0 8px rgba(220,60,90,.35)}
.cl-more{text-align:center;padding:8px;font-size:10px;color:#80c8ff;opacity:.75}
.cl-actions{position:fixed;left:0;right:0;bottom:calc(76px + 8px);padding:0 12px;display:grid;gap:10px;z-index:9100;max-width:430px;margin:0 auto;justify-items:center}
.cl-actions.three{grid-template-columns:1fr 1fr 1fr}
.cl-actions.two{grid-template-columns:1fr 1fr}
.cl-abtn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;background:none;border:none;padding:2px 4px;user-select:none;position:relative;transition:transform .12s}
.cl-abtn:active{transform:scale(.92)}
.cl-abtn.chat{color:#00f0ff}
.cl-abtn.req{color:#ffd166}
.cl-abtn.danger{color:#ff3ba8}
.cl-bi{width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 0 12px currentColor) drop-shadow(0 0 4px rgba(0,0,0,.6));flex-shrink:0;transition:filter .18s,transform .18s}
.cl-abtn:active .cl-bi{filter:drop-shadow(0 0 18px currentColor) drop-shadow(0 0 6px rgba(0,0,0,.6));transform:scale(.94)}
.cl-bi-em{width:72px;height:72px;display:grid;place-items:center;font-size:38px;text-shadow:0 0 14px currentColor,0 0 5px rgba(0,0,0,.8)}
.cl-bt{font-size:10.5px;font-weight:800;color:currentColor;text-shadow:0 0 6px currentColor;letter-spacing:.3px;margin-top:1px;white-space:nowrap}
.cl-reqdot{position:absolute;top:-2px;right:2px;background:#dc3c46;color:#fff;font-size:9px;font-weight:800;min-width:16px;height:16px;border-radius:8px;padding:0 5px;display:grid;place-items:center;box-shadow:0 0 10px rgba(220,60,70,.85);z-index:2}
`;

function _injectCSS() {
  if (document.getElementById('cl-style')) return;
  const s = document.createElement('style');
  s.id = 'cl-style'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _trunc(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }
function _esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function _fitToCanvas(root) {
  try {
    const c = document.querySelector('canvas');
    if (!c) return;
    const r = c.getBoundingClientRect();
    const canvasH = c.height || 700;
    const tabBarH = (r.height * 76) / canvasH;
    root.style.top = r.top + 'px';
    root.style.left = r.left + 'px';
    root.style.width = r.width + 'px';
    root.style.right = 'auto';
    root.style.bottom = 'auto';
    root.style.height = Math.max(0, r.height - tabBarH) + 'px';
    const actions = root.querySelector('.cl-actions');
    if (actions) {
      const actBottom = (window.innerHeight - r.bottom) + tabBarH + 8;
      actions.style.bottom = actBottom + 'px';
      actions.style.left = r.left + 'px';
      actions.style.right = 'auto';
      actions.style.width = r.width + 'px';
    }
  } catch(_) {}
}

function _memberRow(m, isLeader) {
  const isLdr = m.role === 'leader';
  const name = _esc(_trunc(m.username || `User${m.user_id}`, 17));
  const sub = `Ур.${m.level} · ${m.wins} побед`;
  let right = '';
  if (isLdr) {
    right = `<span class="cl-mbadge leader">ЛИДЕР</span>`;
  } else if (isLeader) {
    right = `<div class="cl-mact">
      <span class="cl-mbadge" data-act="transfer" data-uid="${m.user_id}">👑 Передать</span>
      <span class="cl-mbadge danger" data-act="kick" data-uid="${m.user_id}">✕</span>
    </div>`;
  } else {
    right = `<span class="cl-mbadge">БОЕЦ</span>`;
  }
  return `<div class="cl-mrow${isLdr?' leader':''}">
    <div class="cl-mic">${isLdr?'👑':'⚔️'}</div>
    <div style="min-width:0;flex:1">
      <div class="cl-mn">${name}</div>
      <div class="cl-ms">${sub}</div>
    </div>
    ${right}
  </div>`;
}

// Глушим ghost-tap в Phaser/cl-root: блокируем все типы событий в capture-фазе на 500мс
function _closeMemPanel(panel) {
  if (panel.dataset.closing) return;
  panel.dataset.closing = '1';
  panel.classList.add('closing');
  const evs = ['click','touchstart','touchend','mousedown','mouseup','pointerdown','pointerup'];
  const blocker = ev => { ev.stopPropagation(); ev.preventDefault(); };
  evs.forEach(e => document.addEventListener(e, blocker, true));
  setTimeout(() => { panel.remove(); evs.forEach(e => document.removeEventListener(e, blocker, true)); }, 500);
}

function _showMembersPanel(members, isLeader, scene) {
  document.getElementById('cl-mem-panel')?.remove();
  const panel = document.createElement('div');
  panel.id = 'cl-mem-panel';
  panel.className = 'cl-mem-panel';
  let css = 'position:fixed;inset:0;z-index:9200;overflow-y:auto;animation:clSlide .18s ease';
  try { const c = document.querySelector('canvas'); if (c) { const r = c.getBoundingClientRect();
    css = `position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;z-index:9200;overflow-y:auto;animation:clSlide .18s ease`; } } catch(_) {}
  panel.style.cssText = css;
  panel.innerHTML = `
    <div class="cl-mem-hdr">
      <span class="cl-mem-hdr-back" data-act="mem-back">‹</span>
      <div class="cl-mem-hdr-title">УЧАСТНИКИ ${members.length}/20</div>
    </div>
    <div class="cl-mlist" style="padding:8px 12px 100px">${members.map(m=>_memberRow(m,isLeader)).join('')}</div>`;
  document.body.appendChild(panel);
  panel.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
  const onBack = e => { e.preventDefault(); e.stopPropagation(); _closeMemPanel(panel); };
  const bb = panel.querySelector('.cl-mem-hdr-back');
  bb.addEventListener('touchstart', onBack, { passive: false }); // блокирует синтез mouse/click
  bb.addEventListener('click', onBack);
  panel.addEventListener('click', e => {
    e.stopPropagation();
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act;
    if (act === 'mem-back') return; // обрабатывается отдельно
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    const m = members.find(x => x.user_id === +el.dataset.uid);
    if (act === 'transfer' && m) window.ClanHTML.confirmTransfer?.(scene, m);
    else if (act === 'kick' && m) window.ClanHTML.confirmKick?.(scene, m);
  });
}

function openMyClan(scene, data) {
  _injectCSS();
  close();
  const clan = data.clan || {};
  const members = data.members || [];
  const isLeader = !!data.is_leader;
  const myUserId = data.my_user_id;
  const isClosed = (clan.closed|0) === 1;
  const pending = data.pending_requests || 0;
  const threeBtns = isLeader && isClosed;
  const myMember = members.find(m => m.user_id === myUserId) || members[0];

  const root = document.createElement('div');
  root.id = 'cl-root';
  root.className = 'cl-overlay';
  const rightBtn = isLeader
    ? `<div class="cl-abtn danger" data-act="disband"><img src="clan_btn_disband.png" class="cl-bi" alt=""><div class="cl-bt">Распустить</div></div>`
    : `<div class="cl-abtn danger" data-act="leave"><div class="cl-bi-em">🚪</div><div class="cl-bt">Выйти</div></div>`;
  const midBtn = threeBtns
    ? `<div class="cl-abtn req" data-act="requests"><img src="clan_btn_req.png" class="cl-bi" alt=""><div class="cl-bt">Заявки</div>${pending>0?`<div class="cl-reqdot">${pending>9?'9+':pending}</div>`:''}</div>`
    : '';

  root.innerHTML = `
  <div class="cl-panel">
    <div class="cl-hdr">
      <span class="cl-back" data-act="back">‹</span>
      <div class="cl-hdr-icon">⚔️</div>
      <div>
        <div class="cl-hdr-title">КЛАН</div>
        <div class="cl-hdr-sub">Кланы · Поиск · Рейтинг</div>
      </div>
    </div>
    <div class="cl-card">
      <div class="cl-av">
        <img class="cl-av-img" src="clan_em_${clan.emblem||'neutral'}.png" alt="">
      </div>
      <div class="cl-info">
        <div class="cl-tagrow">
          <span class="cl-tag">[${_esc(clan.tag||'')}]</span>
          <span class="cl-lvl">Ур.${clan.level|0}</span>
        </div>
        <div class="cl-nm">${_esc(_trunc(clan.name,22))}</div>
        ${clan.description?`<div class="cl-desc">${_esc(_trunc(clan.description,42))}</div>`:''}
        <div class="cl-pills">
          ${isLeader?'<span class="cl-pill">👑 Лидер</span>':''}
          <span class="cl-pill wins">🏆 ${clan.wins|0}</span>
          ${isLeader
            ? `<span class="cl-pill ${isClosed?'closed':'open'} clickable" data-act="toggle-closed">${isClosed?'🔒 Закрыт':'🔓 Открыт'}</span>`
            : `<span class="cl-pill ${isClosed?'closed':'open'}">${isClosed?'🔒 Закрыт':'🔓 Открыт'}</span>`
          }
        </div>
      </div>
    </div>
    <div class="cl-nav">
      <div class="cl-navb hot" data-act="nav" data-sub="season">🏆 Сезон</div>
      <div class="cl-navb hot" data-act="nav" data-sub="wars">⚔️ Войны</div>
      <div class="cl-navb" data-act="nav" data-sub="achievements">🏅 Награды</div>
      <div class="cl-navb" data-act="nav" data-sub="history">📜 История</div>
    </div>
    <div class="cl-stats">
      <div class="cl-st btn" data-act="members"><div class="cl-st-v">${members.length}/20</div><div class="cl-st-l">БОЙЦОВ</div><div class="cl-st-arr">▼ список</div></div>
      <div class="cl-st"><div class="cl-st-v">${clan.wins|0}</div><div class="cl-st-l">ПОБЕД</div></div>
      <div class="cl-st"><div class="cl-st-v">Ур.${clan.level|0}</div><div class="cl-st-l">УРОВЕНЬ</div></div>
    </div>
    <div class="cl-my-label">ВЫ В КЛАНЕ</div>
    <div class="cl-mlist">${myMember ? _memberRow(myMember, isLeader) : ''}</div>
  </div>
  <div class="cl-actions ${threeBtns?'three':'two'}">
    <div class="cl-abtn chat" data-act="chat"><img src="clan_btn_chat.png" class="cl-bi" alt=""><div class="cl-bt">Чат</div></div>
    ${midBtn}
    ${rightBtn}
  </div>`;
  document.body.appendChild(root);
  _fitToCanvas(root);
  const onResize = () => _fitToCanvas(root);
  window.addEventListener('resize', onResize);
  root._onResize = onResize;
  document.getElementById('cl-placeholder')?.remove();
  root.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });

  root.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    if (act === 'back')      { close(); scene.scene.start('Menu', { target: 'more' }); return; }
    if (act === 'members')   { _showMembersPanel(members, isLeader, scene); return; }
    if (act === 'nav')       { scene.scene.restart({ sub: el.dataset.sub }); return; }
    if (act === 'chat')      { scene.scene.restart({ sub: 'chat' }); return; }
    if (act === 'requests')  { scene.scene.restart({ sub: 'requests' }); return; }
    if (act === 'toggle-closed') {
      const next = isClosed ? 0 : 1;
      post('/api/clan/meta', { closed: next }).then(res => {
        if (res?.ok) {
          try { tg?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}
          window.ClanHTML._toast?.(next ? '🔒 Клан закрыт — вступление по заявке' : '🔓 Клан открыт — вступление свободное');
          setTimeout(() => scene.scene.restart({ sub: 'main' }), 500);
        } else {
          window.ClanHTML._toast?.('❌ ' + (res?.reason || 'Ошибка'), false);
        }
      }).catch(() => window.ClanHTML._toast?.('❌ Нет соединения', false));
      return;
    }
    if (act === 'disband')   { window.ClanHTML.confirmDisband?.(scene); return; }
    if (act === 'leave')     { window.ClanHTML.confirmLeave?.(scene); return; }
  });
}

function close() {
  const r = document.getElementById('cl-root');
  if (r?._onResize) { try { window.removeEventListener('resize', r._onResize); } catch(_) {} }
  r?.remove();
}

window.ClanHTML = { openMyClan, close, _injectCSS, _fitToCanvas };
})();
