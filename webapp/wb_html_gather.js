/* wb_html_gather.js — комната ожидания перед боссом.
   Открывается за 5 мин до старта (state.gather.is_open).
   Когда state.active != null → автоматически уходим в боевой экран. */
(() => {
  function _esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _fmtCountdown(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec/60), s = sec%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // ВАЖНО: реальные Telegram user_id бывают > 2^31, поэтому НИГДЕ
  // не используем `| 0` (32-битное переполнение). Только Number().
  const _AVATARS = ['⚔️','🛡️','🧙','🐉','⚡','🗡️','🔥','🦅','🐺','🔮','✨','💀','🏹','🪓'];
  function _uidNum(uid) { return Number(uid) || 0; }
  function _avatarFor(uid) {
    const u = Math.abs(_uidNum(uid));
    return _AVATARS[u % _AVATARS.length];
  }
  // Если это сам текущий игрок — берём ник напрямую из Telegram WebApp,
  // не дожидаясь серверной БД. Так же делается в wb_html_result.js.
  function _myTgName() {
    const tgu = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    return tgu.username
      || [tgu.first_name, tgu.last_name].filter(Boolean).join(' ').trim()
      || '';
  }
  function _myTgId() {
    return _uidNum(window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
  }
  // Имя по умолчанию если сервер не отдал ник: "Воин #1234" (последние 4 цифры uid)
  function _nameFor(p) {
    // 1) Если это сам игрок — отдаём имя из Telegram (актуально, не зависит от БД)
    const myId = _myTgId();
    if (myId && _uidNum(p && p.user_id) === myId) {
      const my = _myTgName();
      if (my) return my;
    }
    // 2) Сервер вернул нормальный ник
    const n = (p && p.name) || '';
    if (n && n !== 'Игрок') return n;
    // 3) Безопасный fallback
    const uid = Math.abs(_uidNum(p && p.user_id));
    return `Воин #${String(uid % 10000).padStart(4,'0')}`;
  }

  // Локальный таймер для отсчёта в 1-сек шагом, не ждём refresh раз в 8 сек
  let _gatherTickInterval = null;
  function _stopLocalTick() {
    if (_gatherTickInterval) { clearInterval(_gatherTickInterval); _gatherTickInterval = null; }
  }
  function _startLocalTick(initialSec) {
    _stopLocalTick();
    let remaining = initialSec;
    let _ticks = 0;
    _gatherTickInterval = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      _ticks++;
      const el = document.getElementById('wb-gth-cnt');
      if (!el) { _stopLocalTick(); return; }
      el.textContent = _fmtCountdown(remaining);
      if (remaining <= 0) {
        _stopLocalTick();
        // Время вышло — форсим refresh, чтобы клиент увидел active рейд и
        // ушёл в боевой экран
        try { window.WBHtml._scene?._refresh?.(); } catch(_) {}
      } else if (_ticks % 10 === 0) {
        // Каждые 10 сек обновляем список игроков в ростере
        try { window.WBHtml._scene?._refresh?.(); } catch(_) {}
      }
    }, 1000);
  }

  function renderGather(root, s) {
    // Если рейд уже стартанул — клиент должен переключиться на бой автоматически
    // (логика в wb_html_lobby.js: state.active → _renderBattle).
    // Здесь рендерим только «комнату ожидания» с таймером и ростером.
    const g = s.gather || {};
    const players = g.players || [];
    const count = g.count || players.length || 0;
    const sec = g.seconds_left || 0;

    // ВРЕМЕННАЯ ОТЛАДКА: видно прямо в UI, что отдаёт Telegram WebApp
    // и что приходит с сервера. Удалить после фикса проблемы с ником.
    const _tgu = window.Telegram?.WebApp?.initDataUnsafe?.user || null;
    const _dbg = {
      tg_user_exists: !!_tgu,
      tg_id: _tgu?.id ?? '—',
      tg_username: _tgu?.username ?? '—',
      tg_first_name: _tgu?.first_name ?? '—',
      tg_last_name: _tgu?.last_name ?? '—',
      myTgId_computed: _myTgId(),
      myTgName_computed: _myTgName() || '(пусто)',
      players_uids: players.map(p => p.user_id).join(','),
      players_names: players.map(p => p.name).join('|'),
    };
    const _dbgHtml = Object.entries(_dbg)
      .map(([k,v]) => `<div>${k}: ${_esc(String(v))}</div>`).join('');

    const rows = players.map(p =>
      `<div class="wb-gth-row" data-uid="${p.user_id}" data-act="gth-card">
        <span class="av">${_avatarFor(p.user_id)}</span>
        <span class="nm">${_esc(_nameFor(p))}</span>
        <span class="lv">${p.level||'?'}</span>
      </div>`
    ).join('');

    root.innerHTML = `
<div class="wb-gth">
  <div class="wb-gth-bg b1"></div>
  <div class="wb-gth-bg b2"></div>
  <div class="wb-gth-vignette"></div>

  <div class="wb-gth-top">
    <div class="wb-gth-head">⌛ КОМНАТА ОЖИДАНИЯ</div>
    <div class="wb-gth-sub">сбор перед боем · автовход в 0:00</div>
  </div>

  <div class="wb-gth-timer">
    <div class="wb-gth-timer-lbl">До боя</div>
    <div class="wb-gth-timer-val" id="wb-gth-cnt">${_fmtCountdown(sec)}</div>
  </div>

  <div class="wb-gth-roster">
    <div class="wb-gth-roster-h">⚔ В БОЮ <span class="cnt">${count}</span></div>
    <div class="wb-gth-roster-list">${rows || '<div class="wb-gth-empty">Пока пусто. Будь первым!</div>'}</div>
  </div>

  <div class="wb-gth-leave" data-act="gth-leave">↩ Выйти из комнаты</div>

  <div style="margin-top:10px;padding:8px;background:rgba(0,0,0,0.6);
    border:1px solid #ff66aa;border-radius:6px;font-size:10px;
    color:#ffccff;line-height:1.4;font-family:monospace;
    word-break:break-all;">
    <div style="color:#ff66aa;font-weight:700;margin-bottom:4px;">
      🔧 DEBUG (временно)
    </div>
    ${_dbgHtml}
  </div>
</div>`;

    // Биндинг: тап по нику открывает карточку (как в боевом экране).
    if (!root.__wbGatherBound) {
      root.__wbGatherBound = true;
      root.addEventListener('click', e => {
        const el = e.target.closest('[data-act]'); if (!el) return;
        const act = el.dataset.act;
        if (act === 'gth-leave') {
          try { sessionStorage.removeItem('wb_in_gather'); } catch(_) {}
          window.WBHtml._scene?._refresh?.();
        } else if (act === 'gth-card') {
          const uid = parseInt(el.dataset.uid);
          const p = (window.WBHtml._lastGatherState?.gather?.players || []).find(x => x.user_id === uid);
          if (p) _showGatherCard(p);
        }
      });
    }
    window.WBHtml._lastGatherState = s;
    // Запускаем локальный отсчёт сразу после рендера
    _startLocalTick(sec);
  }

  function _showGatherCard(p) {
    document.getElementById('wb-gth-pcard')?.remove();
    const ov = document.createElement('div');
    ov.id = 'wb-gth-pcard'; ov.className = 'wb-gth-pcard-ov';
    const str = p.strength || '?';
    const mhp = p.max_hp || '?';
    const lvl = p.level || '?';
    ov.innerHTML = `<div class="wb-gth-pcard">
      <div class="wb-gth-pcard-x">×</div>
      <div class="wb-gth-pcard-av">${_avatarFor(p.user_id)}</div>
      <div class="wb-gth-pcard-name">${_esc(_nameFor(p))}</div>
      <div class="wb-gth-pcard-lv">Уровень ${lvl}</div>
      <div class="wb-pc-stats" style="padding:14px 0 4px;">
        <div class="wb-pc-st">
          <div class="sv" style="color:#ff6680">${str}</div>
          <div class="sl">СИЛА</div>
        </div>
        <div class="wb-pc-st">
          <div class="sv" style="color:#00ccff">${mhp}</div>
          <div class="sl">MAX HP</div>
        </div>
        <div class="wb-pc-st">
          <div class="sv" style="color:#ffdd44">${lvl}</div>
          <div class="sl">УРОВЕНЬ</div>
        </div>
      </div>
      <div class="wb-gth-pcard-msg">⚔️ Готов к бою с боссом</div>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.classList.contains('wb-gth-pcard-x')) {
        ov.classList.remove('open');
        setTimeout(() => ov.remove(), 200);
      }
    });
  }

  // Обновление таймера без перерисовки всего ростера (вызывается из _refresh / _onWsTick).
  // Также пересинхронизируем локальный тикер с актуальным значением сервера.
  function updateGatherTimer(sec) {
    const el = document.getElementById('wb-gth-cnt');
    if (el) el.textContent = _fmtCountdown(sec);
    if (sec > 0) _startLocalTick(sec); // ресинк
  }

  // Обновляет только счётчик «В БОЮ N» без перерисовки всего ростера.
  // Вызывается из _onWsIdle при получении registrants_count.
  function updateGatherCount(count) {
    const el = document.querySelector('.wb-gth-roster-h .cnt');
    if (el) el.textContent = count;
  }

  Object.assign(window.WBHtml = window.WBHtml || {}, { renderGather, updateGatherTimer, updateGatherCount });
})();
