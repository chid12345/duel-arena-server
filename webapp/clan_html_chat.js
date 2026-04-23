/* ============================================================
   Clan HTML Chat — киберпанк чат клана
   Нативный input + scroll, авто-refresh 20с, scroll-to-bottom
   ============================================================ */
(() => {
const CSS = `
.cc-overlay{position:absolute;top:0;left:0;right:0;height:100%;z-index:9000;display:flex;justify-content:center;background:radial-gradient(ellipse at 50% 0%,#1a0a2a 0%,#05050a 55%),#000;color:#e6f7ff;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}
.cc-overlay::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.025) 3px 4px);pointer-events:none;z-index:1}
.cc-overlay::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 30%,rgba(255,40,170,.12),transparent 40%),radial-gradient(circle at 80% 70%,rgba(0,230,255,.10),transparent 40%);pointer-events:none;z-index:1}
.cc-panel{width:100%;max-width:430px;position:relative;z-index:2;display:flex;flex-direction:column;height:100%}
.cc-hdr{padding:12px 14px 10px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,59,168,.3);background:linear-gradient(180deg,rgba(20,0,30,.9),rgba(10,5,20,.7));flex-shrink:0}
.cc-back{font-size:22px;color:#80d8ff;cursor:pointer;padding:4px 8px;opacity:.8;user-select:none}
.cc-hdr-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:16px;background:linear-gradient(135deg,#1a0533,#2a0a40);border:1px solid #00f0ff;box-shadow:0 0 12px rgba(0,240,255,.5),inset 0 0 8px rgba(0,240,255,.2)}
.cc-hdr-ti{font-size:14px;font-weight:800;letter-spacing:.5px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.cc-hdr-sub{font-size:10px;color:#80d8ff;opacity:.75;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
.cc-reload{margin-left:auto;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:14px;cursor:pointer;background:rgba(10,5,25,.8);border:1px solid rgba(0,240,255,.4);color:#80e8ff;user-select:none;transition:transform .15s}
.cc-reload:active{transform:rotate(180deg)}
.cc-list{flex:1;overflow-y:auto;overflow-x:hidden;padding:10px 10px 8px;display:flex;flex-direction:column;gap:6px;-webkit-overflow-scrolling:touch}
.cc-list::-webkit-scrollbar{width:3px}
.cc-list::-webkit-scrollbar-thumb{background:rgba(0,240,255,.3);border-radius:2px}
.cc-empty{text-align:center;color:#80c8ff;opacity:.6;font-size:12px;padding:30px 10px}
.cc-msg{max-width:82%;padding:8px 11px;border-radius:14px;background:linear-gradient(135deg,rgba(25,10,40,.85),rgba(10,5,20,.85));border:1px solid rgba(255,59,168,.35);box-shadow:0 0 10px rgba(255,59,168,.15);position:relative;animation:ccPop .2s ease}
.cc-msg.me{align-self:flex-end;border-color:rgba(0,240,255,.45);box-shadow:0 0 12px rgba(0,240,255,.2);background:linear-gradient(135deg,rgba(10,20,50,.9),rgba(5,15,40,.9))}
@keyframes ccPop{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.cc-nm{font-size:10px;font-weight:800;letter-spacing:.3px;color:#ff7acb;text-shadow:0 0 6px currentColor;margin-bottom:3px}
.cc-msg.me .cc-nm{color:#00f0ff}
.cc-tx{font-size:13px;color:#fff;line-height:1.35;word-wrap:break-word;white-space:pre-wrap}
.cc-tm{font-size:9px;color:#80c8ff;opacity:.65;margin-top:3px;text-align:right}
.cc-inbar{flex-shrink:0;padding:8px 10px calc(10px + env(safe-area-inset-bottom,0px));display:flex;gap:8px;align-items:center;border-top:1px solid rgba(0,240,255,.25);background:linear-gradient(0deg,rgba(15,5,30,.95),rgba(10,0,25,.8))}
.cc-inp{flex:1;height:42px;border-radius:12px;padding:0 14px;font-size:13px;color:#fff;background:rgba(10,5,25,.9);border:1px solid rgba(0,240,255,.35);outline:none;box-shadow:inset 0 0 8px rgba(0,240,255,.12);font-family:inherit}
.cc-inp::placeholder{color:rgba(128,216,255,.55)}
.cc-inp:focus{border-color:#00f0ff;box-shadow:inset 0 0 10px rgba(0,240,255,.18),0 0 10px rgba(0,240,255,.35)}
.cc-send{width:52px;height:42px;border-radius:12px;display:grid;place-items:center;font-size:16px;cursor:pointer;background:linear-gradient(135deg,#ff3ba8,#b81d6b);color:#fff;border:1px solid #ff3ba8;box-shadow:0 0 14px rgba(255,59,168,.55);user-select:none;transition:transform .1s}
.cc-send:active{transform:scale(.92)}
.cc-send.dis{opacity:.4;pointer-events:none;filter:grayscale(.6)}
`;

let _chatTimer = null;

function _injectCSS(){ if(document.getElementById('cc-style'))return; const s=document.createElement('style'); s.id='cc-style'; s.textContent=CSS; document.head.appendChild(s); }
function _esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function _trunc(s,n){s=String(s??'');return s.length>n?s.slice(0,n)+'…':s;}

function _renderMessages(list, messages, myId) {
  if (!messages.length) {
    list.innerHTML = `<div class="cc-empty">💬 Чат пуст — напишите первым!</div>`;
    return;
  }
  list.innerHTML = messages.map(m => {
    const me = m.user_id === myId;
    const nm = me ? 'Вы' : _trunc(m.username || `User${m.user_id}`, 16);
    return `<div class="cc-msg${me?' me':''}">
      <div class="cc-nm">${_esc(nm)}</div>
      <div class="cc-tx">${_esc(m.message || '')}</div>
      <div class="cc-tm">${_esc(m.time_str || '')}</div>
    </div>`;
  }).join('');
  list.scrollTop = list.scrollHeight;
}

async function _loadChat(list, myId) {
  try {
    const d = await get('/api/clan/chat');
    _renderMessages(list, d.messages || [], myId);
  } catch(_) {}
}

async function _sendMessage(inp, list, myId, sendBtn) {
  const text = (inp.value || '').trim();
  if (!text) return;
  sendBtn.classList.add('dis');
  try {
    const res = await post('/api/clan/chat/send', { message: text });
    if (res?.ok) {
      inp.value = '';
      try { tg?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
      await _loadChat(list, myId);
    } else {
      window.ClanHTML?._toast?.('❌ ' + (res?.reason || 'Ошибка'), false);
    }
  } catch(_) {
    window.ClanHTML?._toast?.('❌ Нет соединения', false);
  } finally {
    sendBtn.classList.remove('dis');
  }
}

function openChat(scene, data) {
  _injectCSS();
  close();
  const clan = data.clan || {};
  const myId = data.my_user_id;

  const root = document.createElement('div');
  root.id = 'cc-root';
  root.className = 'cc-overlay';
  root.innerHTML = `
    <div class="cc-panel">
      <div class="cc-hdr">
        <span class="cc-back" data-act="back">‹</span>
        <div class="cc-hdr-icon">💬</div>
        <div style="min-width:0">
          <div class="cc-hdr-ti">ЧАТ КЛАНА</div>
          <div class="cc-hdr-sub">[${_esc(clan.tag||'')}] ${_esc(_trunc(clan.name||'', 24))}</div>
        </div>
        <div class="cc-reload" data-act="reload">🔄</div>
      </div>
      <div class="cc-list" id="cc-list"></div>
      <div class="cc-inbar">
        <input class="cc-inp" id="cc-inp" type="text" maxlength="200" placeholder="✏️ Написать сообщение..." />
        <div class="cc-send" data-act="send">➤</div>
      </div>
    </div>`;
  document.body.appendChild(root);
  root.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });

  const list = root.querySelector('#cc-list');
  const inp  = root.querySelector('#cc-inp');
  const sendBtn = root.querySelector('.cc-send');

  _loadChat(list, myId);
  _chatTimer = setInterval(() => _loadChat(list, myId), 20000);

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); _sendMessage(inp, list, myId, sendBtn); }
  });

  root.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    try { tg?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    if (act === 'back')   { close(); scene.scene.restart({ sub: 'main' }); return; }
    if (act === 'reload') { _loadChat(list, myId); return; }
    if (act === 'send')   { _sendMessage(inp, list, myId, sendBtn); return; }
  });
}

function close() {
  if (_chatTimer) { clearInterval(_chatTimer); _chatTimer = null; }
  document.getElementById('cc-root')?.remove();
}

const _origClose = window.ClanHTML?.close;
Object.assign(window.ClanHTML = window.ClanHTML || {}, {
  openChat,
  close() { try { close(); } catch(_) {} try { _origClose?.(); } catch(_) {} },
});
})();
