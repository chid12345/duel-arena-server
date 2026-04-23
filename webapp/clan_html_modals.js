/* ============================================================
   Clan HTML Modals — киберпанк confirm + toast поверх оверлея
   ============================================================ */
(() => {
const CSS = `
.cl-mbg{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.8);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;animation:clFade .18s ease}
@keyframes clFade{from{opacity:0}to{opacity:1}}
.cl-mdl{width:300px;max-width:calc(100vw - 32px);border-radius:18px;padding:18px 18px 16px;background:linear-gradient(135deg,rgba(20,0,30,.98),rgba(5,5,15,.98));border:1.5px solid #ff3ba8;box-shadow:0 0 40px rgba(255,59,168,.35),0 24px 70px rgba(0,0,0,.75);animation:clPop .22s cubic-bezier(.34,1.56,.64,1)}
.cl-mdl.cyan{border-color:#00f0ff;box-shadow:0 0 40px rgba(0,240,255,.35),0 24px 70px rgba(0,0,0,.75)}
@keyframes clPop{from{opacity:0;transform:scale(.86) translateY(10px)}to{opacity:1;transform:none}}
.cl-mdl-t{text-align:center;font-size:15px;font-weight:800;background:linear-gradient(90deg,#ff3ba8,#ffa8d8);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:8px}
.cl-mdl.cyan .cl-mdl-t{background:linear-gradient(90deg,#00f0ff,#80e8ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.cl-mdl-s{text-align:center;font-size:11px;color:#80d8ff;margin-bottom:6px}
.cl-mdl-tr{text-align:center;font-size:13px;font-weight:700;color:#fff;margin-bottom:6px;word-wrap:break-word}
.cl-mdl-n{text-align:center;font-size:10px;color:#a8b4d8;margin-bottom:14px;opacity:.85}
.cl-mdl-r{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cl-mdl-b{height:38px;border-radius:10px;display:grid;place-items:center;font-size:12px;font-weight:800;cursor:pointer;user-select:none;border:1px solid currentColor;background:rgba(10,5,25,.9);box-shadow:0 0 10px currentColor;transition:transform .1s}
.cl-mdl-b:active{transform:scale(.95)}
.cl-mdl-b.cancel{color:#80c8ff}
.cl-mdl-b.ok{color:#00f0ff}
.cl-mdl-b.danger{color:#ff3ba8}
.cl-toast{position:fixed;bottom:calc(70px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);z-index:9600;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:700;pointer-events:none;transition:opacity .3s;max-width:calc(100vw - 40px);text-align:center;box-shadow:0 0 20px currentColor;border:1px solid currentColor;background:rgba(10,5,25,.95);backdrop-filter:blur(6px)}
.cl-toast.ok{color:#00f0ff}
.cl-toast.err{color:#ff3ba8}
`;
function _injectCSS(){ if(document.getElementById('cl-mdl-style'))return; const s=document.createElement('style'); s.id='cl-mdl-style'; s.textContent=CSS; document.head.appendChild(s); }
function _esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function _confirm(opts) {
  _injectCSS();
  const { title, subtitle, target, note, confirmText, danger = true, onConfirm } = opts;
  document.getElementById('cl-mbg')?.remove();
  const bg = document.createElement('div');
  bg.id = 'cl-mbg';
  bg.className = 'cl-mbg';
  bg.innerHTML = `
    <div class="cl-mdl${danger?'':' cyan'}" role="dialog">
      <div class="cl-mdl-t">${_esc(title)}</div>
      ${subtitle?`<div class="cl-mdl-s">${_esc(subtitle)}</div>`:''}
      ${target?`<div class="cl-mdl-tr">${_esc(target)}</div>`:''}
      ${note?`<div class="cl-mdl-n">${_esc(note)}</div>`:''}
      <div class="cl-mdl-r">
        <div class="cl-mdl-b cancel" data-act="cancel">Отмена</div>
        <div class="cl-mdl-b ${danger?'danger':'ok'}" data-act="ok">${_esc(confirmText||'OK')}</div>
      </div>
    </div>`;
  document.body.appendChild(bg);
  const kill = () => bg.remove();
  bg.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el && e.target === bg) { kill(); return; }
    if (!el) return;
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(el.dataset.act==='ok'?'heavy':'light'); } catch(_) {}
    kill();
    if (el.dataset.act === 'ok') { try { onConfirm?.(); } catch(e) { console.error(e); } }
  });
}

let _toastTimer = null;
function _toast(msg, ok = true) {
  _injectCSS();
  let el = document.getElementById('cl-toast');
  if (!el) { el = document.createElement('div'); el.id = 'cl-toast'; document.body.appendChild(el); }
  el.className = 'cl-toast ' + (ok ? 'ok' : 'err');
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}

async function _doDisband(scene) {
  try {
    const res = await post('/api/clan/disband');
    if (res?.ok) {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}
      if (res.player) State.player = res.player;
      _toast('🧨 Клан распущен');
      setTimeout(() => { window.ClanHTML.close(); scene.scene.restart({ sub: 'main' }); }, 700);
    } else _toast('❌ ' + (res?.reason||'Ошибка'), false);
  } catch(_) { _toast('❌ Нет соединения', false); }
}

async function _doLeave(scene) {
  try {
    const res = await post('/api/clan/leave');
    if (res?.ok) {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}
      _toast('🚪 Вы вышли из клана');
      setTimeout(() => { window.ClanHTML.close(); scene.scene.restart({ sub: 'main' }); }, 700);
    } else _toast('❌ ' + (res?.reason||'Ошибка'), false);
  } catch(_) { _toast('❌ Нет соединения', false); }
}

async function _doKick(scene, uid) {
  try {
    const res = await post('/api/clan/kick', { target_user_id: uid });
    if (res?.ok) {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}
      _toast('⛔ Игрок исключён');
      setTimeout(() => { window.ClanHTML.close(); scene.scene.restart({ sub: 'main' }); }, 500);
    } else _toast('❌ ' + (res?.reason||'Ошибка'), false);
  } catch(_) { _toast('❌ Нет соединения', false); }
}

async function _doTransfer(scene, uid) {
  try {
    const res = await post('/api/clan/transfer_leader', { new_leader_id: uid });
    if (res?.ok) {
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}
      _toast('👑 Лидерство передано');
      setTimeout(() => { window.ClanHTML.close(); scene.scene.restart({ sub: 'main' }); }, 700);
    } else _toast('❌ ' + (res?.reason||'Ошибка'), false);
  } catch(_) { _toast('❌ Нет соединения', false); }
}

/* Публичные обёртки — принимают scene, показывают HTML-confirm */
function confirmDisband(scene) {
  _confirm({
    title: '🧨 Распустить клан',
    subtitle: 'Все участники будут удалены из клана',
    target: 'Действие необратимо',
    note: 'Клан и чат будут удалены полностью',
    confirmText: '🧨 Распустить',
    danger: true,
    onConfirm: () => _doDisband(scene),
  });
}
function confirmLeave(scene) {
  _confirm({
    title: '🚪 Выйти из клана',
    subtitle: 'Вы покинете клан',
    note: 'Вы сможете вступить снова через поиск',
    confirmText: '🚪 Выйти',
    danger: true,
    onConfirm: () => _doLeave(scene),
  });
}
function confirmKick(scene, member) {
  _confirm({
    title: '⛔ Исключить игрока',
    subtitle: 'Исключить из клана:',
    target: member.username || `User${member.user_id}`,
    note: 'Игрок сможет вступить обратно по приглашению',
    confirmText: '⛔ Исключить',
    danger: true,
    onConfirm: () => _doKick(scene, member.user_id),
  });
}
function confirmTransfer(scene, member) {
  _confirm({
    title: '👑 Передача лидерства',
    subtitle: 'Передать лидерство игроку:',
    target: member.username || `User${member.user_id}`,
    note: 'Отменить нельзя. Вы станете участником',
    confirmText: '👑 Передать',
    danger: false,
    onConfirm: () => _doTransfer(scene, member.user_id),
  });
}

Object.assign(window.ClanHTML = window.ClanHTML || {}, {
  _toast, _confirm,
  confirmDisband, confirmLeave, confirmKick, confirmTransfer,
});
})();
