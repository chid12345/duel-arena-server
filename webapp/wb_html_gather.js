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

  // Эмодзи-ник: используем хэш от user_id для стабильного эмодзи на игрока
  const _AVATARS = ['⚔️','🛡️','🧙','🐉','⚡','🗡️','🔥','🦅','🐺','🔮','✨','💀','🏹','🪓'];
  function _avatarFor(uid) {
    return _AVATARS[Math.abs((uid|0)) % _AVATARS.length];
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

    const rows = players.map(p =>
      `<div class="wb-gth-row" data-uid="${p.user_id}" data-act="gth-card">
        <span class="av">${_avatarFor(p.user_id)}</span>
        <span class="nm">${_esc(p.name||'Игрок')}</span>
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
    ov.innerHTML = `<div class="wb-gth-pcard">
      <div class="wb-gth-pcard-x">×</div>
      <div class="wb-gth-pcard-av">${_avatarFor(p.user_id)}</div>
      <div class="wb-gth-pcard-name">@${_esc(p.name||'Игрок')}</div>
      <div class="wb-gth-pcard-lv">Уровень ${p.level||'?'}</div>
      <div class="wb-gth-pcard-msg">Готов к бою с боссом</div>
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
