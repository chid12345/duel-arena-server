/* ============================================================
   Tasks HTML Overlay — киберпанк UI для вкладки Задания
   Табы: Стрик / Задания / Достижения
   ============================================================ */
(() => {
const CSS = `
.tsk-ov{position:fixed;top:0;left:0;right:0;bottom:76px;z-index:9000;display:flex;justify-content:center;background:radial-gradient(ellipse at 50% 0%,#1a0a2a 0%,#05050a 55%),#000;color:#e6f7ff;overflow-y:auto;overflow-x:hidden;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}
.tsk-ov::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.025) 3px 4px);pointer-events:none;z-index:1}
.tsk-ov::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 30%,rgba(255,40,170,.10),transparent 40%),radial-gradient(circle at 80% 70%,rgba(0,230,255,.08),transparent 40%);pointer-events:none;z-index:1}
.tsk-panel{width:100%;max-width:430px;position:relative;z-index:2;padding-bottom:16px}
.tsk-hdr{display:flex;align-items:center;gap:10px;padding:14px 14px 10px;border-bottom:1px solid rgba(0,240,255,.12);position:sticky;top:0;background:rgba(10,2,20,.96);backdrop-filter:blur(8px);z-index:10}
@keyframes tskBack{0%,100%{text-shadow:0 0 8px #00f5ff,0 0 18px rgba(0,245,255,.3);opacity:.75}50%{text-shadow:0 0 16px #00f5ff,0 0 32px rgba(0,245,255,.6);opacity:1}}
.tsk-back{display:inline-flex;flex-direction:column;align-items:center;line-height:1;font-size:30px;color:#00f5ff;cursor:pointer;padding:2px 10px;user-select:none;animation:tskBack 2s ease-in-out infinite}
.tsk-back::after{content:'НАЗАД';font-size:6px;font-weight:700;letter-spacing:1.2px;color:rgba(0,245,255,.6);margin-top:-1px}
.tsk-back:active{transform:scale(.88)}
.tsk-hdr-icon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:18px;background:linear-gradient(135deg,#1a0533,#2a0a40);border:1px solid #ff3ba8;box-shadow:0 0 12px rgba(255,59,168,.5),inset 0 0 8px rgba(255,59,168,.2)}
.tsk-hdr-title{font-size:16px;font-weight:800;letter-spacing:.5px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.tsk-hdr-sub{font-size:10px;color:#00e0ff;opacity:.75;margin-top:1px}
.tsk-tabs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding:10px 12px 6px}
.tsk-tab{height:34px;border-radius:10px;display:grid;place-items:center;font-size:10.5px;font-weight:700;cursor:pointer;background:rgba(10,5,25,.8);border:1px solid rgba(0,240,255,.3);color:#80e8ff;text-shadow:0 0 4px currentColor;user-select:none;transition:all .15s;position:relative}
.tsk-tab.active{border-color:#ff3ba8;color:#ffa8d8;box-shadow:0 0 12px rgba(255,59,168,.3),inset 0 0 8px rgba(255,59,168,.08)}
.tsk-tab:active{transform:scale(.96)}
.tsk-dot{position:absolute;top:4px;right:6px;width:7px;height:7px;border-radius:50%;background:#ff3ba8;box-shadow:0 0 6px rgba(255,59,168,.8)}
.tsk-sec{font-size:10px;font-weight:700;padding:8px 16px 4px;color:#00f0ff;letter-spacing:.5px;opacity:.85;display:flex;align-items:center;gap:6px}
.tsk-sec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(0,240,255,.3),transparent)}
.tsk-date{margin-left:auto;font-size:9px;color:#80d8ff;background:rgba(0,240,255,.08);border:1px solid rgba(0,240,255,.2);border-radius:6px;padding:2px 7px}
.tsk-reset{text-align:center;padding:10px;font-size:10px;color:#80c8ff;opacity:.5;display:flex;align-items:center;justify-content:center;gap:6px}
.tsk-reset::before,.tsk-reset::after{content:"";flex:1;height:1px;background:rgba(0,240,255,.12)}
.tsk-psum{margin:8px 12px 0;padding:9px 12px;border-radius:10px;background:rgba(0,240,255,.05);border:1px solid rgba(0,240,255,.18);display:flex;align-items:center;gap:8px;font-size:10px;color:#80e8ff}
.tsk-psbar{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.08)}
.tsk-psfill{height:100%;border-radius:2px;background:linear-gradient(90deg,#00f0ff,#3cc864);box-shadow:0 0 6px rgba(0,240,255,.4)}
@keyframes tskFloat{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.75;transform:translateY(-2px)}}
.tsk-gift-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;background:none;border:none;padding:2px 4px;color:#ff3ba8;transition:transform .12s;user-select:none}
.tsk-gift-btn:active{transform:scale(.92)}
.tsk-gift-btn img{width:32px;height:32px;object-fit:contain;filter:drop-shadow(0 0 12px currentColor) drop-shadow(0 0 4px rgba(0,0,0,.6));animation:tskFloat 3s ease-in-out infinite;transition:filter .18s,transform .18s;flex-shrink:0}
.tsk-gift-btn:active img{filter:drop-shadow(0 0 18px currentColor) drop-shadow(0 0 6px rgba(0,0,0,.6));transform:scale(.94)}
.tsk-gift-btn span{font-size:8px;font-weight:800;color:currentColor;text-shadow:0 0 6px currentColor;letter-spacing:.3px;white-space:nowrap}
.tsk-lock{font-size:14px;color:rgba(255,255,255,.2)}
.tsk-loading{display:flex;align-items:center;justify-content:center;height:200px;font-size:13px;color:#80c8ff;opacity:.6}
`;

function _injectCSS() {
  if (document.getElementById('tsk-style')) return;
  const s = document.createElement('style');
  s.id = 'tsk-style'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _fitToCanvas(el) {
  try {
    const c = document.querySelector('canvas');
    if (!c) return;
    const r = c.getBoundingClientRect();
    Object.assign(el.style, { left: r.left+'px', top: r.top+'px', width: r.width+'px', right: '', bottom: '' });
  } catch(_) {}
}

function _esc(s) { return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

let _root = null, _scene = null, _data = null, _curTab = 'daily'; // дефолт — ежедневные

window.TasksHTML = {
  open(scene, tab) {
    _injectCSS();
    _scene = scene;
    _curTab = tab || 'daily';
    if (_root) _root.remove();
    _root = document.createElement('div');
    _root.className = 'tsk-ov';
    _root.id = 'tsk-overlay';
    document.body.appendChild(_root);
    _fitToCanvas(_root);
    _root.innerHTML = '<div class="tsk-panel"><div class="tsk-loading">⚡ Загрузка...</div></div>';
    this._load();
  },

  close() {
    _root?.remove(); _root = null; _scene = null; _data = null;
  },

  async _load() {
    try {
      post('/api/tasks/login').catch(() => null);
      const d = await get('/api/tasks/status');
      if (!d?.ok || !_root) return;
      _data = d;
      this._render();
    } catch(e) {
      if (_root) _root.querySelector('.tsk-panel').innerHTML = '<div class="tsk-loading">❌ Нет соединения</div>';
    }
  },

  _render() {
    if (!_root || !_data) return;
    const hasReady = (_data.achievements||[]).some(a => a.can_claim_tier !== null && !a.all_done);
    const hasDailyDone = (_data.daily||[]).some(q => q.is_completed && !q.reward_claimed);
    _root.querySelector('.tsk-panel').innerHTML = _buildShell(hasReady, hasDailyDone);
    const streakTop = _root.querySelector('#tsk-streak-top');
    if (streakTop) streakTop.innerHTML = window.TasksHTML_StreakTop?.(_data.streak) || '';
    _attachStreakClaims();
    window.TasksHTML_attachStreakDayPopups?.(streakTop);
    _attachBack();
    this.switchTab(_curTab);
  },

  switchTab(name) {
    if (!_root) return;
    _curTab = name;
    ['daily','weekly','achieve'].forEach(t => {
      const el = _root.querySelector('#tsk-'+t);
      if (el) el.style.display = t === name ? '' : 'none';
    });
    _root.querySelectorAll('.tsk-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    if (name === 'daily')   { _root.querySelector('#tsk-daily').innerHTML   = window.TasksHTML_Daily(_data);          _attachTaskClaims(); window.TasksHTML_attachPopups?.(_root.querySelector('#tsk-daily'), _scene); }
    if (name === 'weekly')  { _root.querySelector('#tsk-weekly').innerHTML  = window.TasksHTML_Weekly?.(_data) || ''; _attachTaskClaims(); window.TasksHTML_attachPopups?.(_root.querySelector('#tsk-weekly'), _scene); }
    if (name === 'achieve') { _root.querySelector('#tsk-achieve').innerHTML = window.TasksHTML_Achieve(_data.achievements||[]); _attachAchClaims(); window.TasksHTML_attachAchPopups?.(_root.querySelector('#tsk-achieve'), _scene); }
  },
};

function _buildShell(hasReady, hasDailyDone) {
  const date = new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
  return `
<div class="tsk-hdr">
  <div class="tsk-back" id="tsk-back">‹</div>
  <div class="tsk-hdr-icon">⚡</div>
  <div><div class="tsk-hdr-title">ЗАДАНИЯ</div><div class="tsk-hdr-sub">${_esc(date)}</div></div>
</div>
<div id="tsk-streak-top"></div>
<div class="tsk-tabs">
  <div class="tsk-tab" data-tab="daily">⚡ ЕЖЕДН.${hasDailyDone?'<div class="tsk-dot"></div>':''}</div>
  <div class="tsk-tab" data-tab="weekly">📅 НЕДЕЛ.</div>
  <div class="tsk-tab" data-tab="achieve">🏆 ДОСТИЖ.${hasReady?'<div class="tsk-dot"></div>':''}</div>
</div>
<div id="tsk-daily"   style="display:none"></div>
<div id="tsk-weekly"  style="display:none"></div>
<div id="tsk-achieve" style="display:none"></div>`;
}

function _attachBack() {
  _root.querySelector('#tsk-back')?.addEventListener('click', () => {
    const s = _scene;
    window.TasksHTML.close();
    try { s?.scene?.start('Menu', {}); } catch(_) {}
  });
  _root.querySelectorAll('.tsk-tab').forEach(t => {
    t.addEventListener('click', () => window.TasksHTML.switchTab(t.dataset.tab));
  });
}

function _attachStreakClaims() {
  _root.querySelectorAll('[data-claim-streak]').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = +btn.dataset.claimStreak;
      if (btn._busy) return; btn._busy = true;
      post('/api/tasks/claim_streak', { day_num: day }).then(r => {
        btn._busy = false;
        if (r?.ok) { if (r.player) State.player = r.player; window.TasksHTML_showReward?.(r, () => window.TasksHTML._load()); }
      }).catch(() => { btn._busy = false; });
    });
  });
}

function _attachTaskClaims() {
  _root.querySelectorAll('[data-claim-daily]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn._busy) return; btn._busy = true;
      post('/api/tasks/claim_daily', { task_key: btn.dataset.claimDaily }).then(r => {
        btn._busy = false;
        if (r?.ok) { if (r.player) State.player = r.player; tg?.HapticFeedback?.notificationOccurred('success'); window.TasksHTML_showReward?.(r, () => window.TasksHTML._load()); }
      }).catch(() => { btn._busy = false; });
    });
  });
  _root.querySelectorAll('[data-claim-weekly]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn._busy) return; btn._busy = true;
      post('/api/tasks/claim_weekly_extra', { task_key: btn.dataset.claimWeekly }).then(r => {
        btn._busy = false;
        if (r?.ok) { if (r.player) State.player = r.player; tg?.HapticFeedback?.notificationOccurred('success'); window.TasksHTML_showReward?.(r, () => window.TasksHTML._load()); }
      }).catch(() => { btn._busy = false; });
    });
  });
}

function _attachAchClaims() {
  _root.querySelectorAll('[data-claim-ach]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn._busy) return; btn._busy = true;
      const [key, tier] = btn.dataset.claimAch.split('|');
      post('/api/tasks/claim_achievement', { quest_key: key, tier: +tier }).then(r => {
        btn._busy = false;
        if (r?.ok) { if (r.player) State.player = r.player; tg?.HapticFeedback?.notificationOccurred('success'); window.TasksHTML_showReward?.(r, () => window.TasksHTML._load()); }
      }).catch(() => { btn._busy = false; });
    });
  });
}

window._TasksHTML_esc = _esc;
})();
