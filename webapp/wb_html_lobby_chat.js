/* wb_html_lobby_chat.js — чат в зале ожидания рейда WB.
   API: init(scene), stop(). Поллинг GET messages?since=lastId каждые 3 сек,
   POST send. Чат живёт только пока gather в фазе scheduled — на старте боя
   сервер очищает таблицу, мы видим пустоту и идём дальше. */
(() => {
  const POLL_INTERVAL_MS = 3000;
  const MAX_MSG_LEN = 200;
  const COOLDOWN_SEC = 2;

  let _pollTimer = null;
  let _lastId = 0;
  let _sendingCooldownUntil = 0;

  function _initData() {
    return window.Telegram?.WebApp?.initData || '';
  }

  function _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function _myUid() {
    return Number(window.Telegram?.WebApp?.initDataUnsafe?.user?.id) || 0;
  }

  function _renderMessages(listEl, messages) {
    const myId = _myUid();
    const html = messages.map(m => {
      const isMe = Number(m.user_id) === myId;
      const nm = _esc(m.username || 'Воин');
      const tx = _esc(m.message || '');
      return `<div class="wb-chat-msg${isMe?' me':''}">` +
        `<div class="wb-chat-msg-nm">${nm}${isMe?' (вы)':''}</div>` +
        `<div class="wb-chat-msg-tx">${tx}</div>` +
      `</div>`;
    }).join('');
    listEl.insertAdjacentHTML('beforeend', html);
    // Скролл вниз — пользователь видит свежие сообщения
    listEl.scrollTop = listEl.scrollHeight;
  }

  async function _poll() {
    const listEl = document.getElementById('wb-chat-list');
    if (!listEl) return; // экран сменился
    try {
      const r = await get('/api/world_boss/lobby_chat/messages', {
        init_data: _initData(), since: _lastId,
      });
      if (r?.ok && Array.isArray(r.messages) && r.messages.length) {
        _renderMessages(listEl, r.messages);
        _lastId = r.messages[r.messages.length - 1].id;
      }
    } catch (_) { /* сеть — молча, попробуем в следующий тик */ }
  }

  function _startCooldown(sec) {
    _sendingCooldownUntil = Date.now() + sec * 1000;
    const btn = document.getElementById('wb-chat-send');
    if (btn) btn.classList.add('dis');
    setTimeout(() => {
      const b = document.getElementById('wb-chat-send');
      if (b && Date.now() >= _sendingCooldownUntil) b.classList.remove('dis');
    }, sec * 1000 + 50);
  }

  async function _send() {
    const inp = document.getElementById('wb-chat-inp');
    const btn = document.getElementById('wb-chat-send');
    if (!inp || !btn || btn.classList.contains('dis')) return;
    const text = (inp.value || '').trim();
    if (!text) return;
    if (text.length > MAX_MSG_LEN) {
      inp.value = text.slice(0, MAX_MSG_LEN);
      return;
    }
    btn.classList.add('dis');
    try {
      const r = await post('/api/world_boss/lobby_chat/send', {
        init_data: _initData(), text,
      });
      if (r?.ok) {
        inp.value = '';
        _startCooldown(COOLDOWN_SEC);
        // Сразу подтянем своё сообщение — без ожидания poll
        _poll();
      } else if (r?.reason === 'cooldown') {
        _startCooldown(Math.max(1, r.retry_in || COOLDOWN_SEC));
      } else if (r?.reason === 'too_long') {
        inp.classList.add('err');
        setTimeout(() => inp.classList.remove('err'), 600);
        btn.classList.remove('dis');
      } else {
        // not_registered / no_gather / empty / internal — кнопку отпускаем,
        // юзеру не показываем подробности
        btn.classList.remove('dis');
      }
    } catch (_) {
      btn.classList.remove('dis');
    }
  }

  function _onInput(e) {
    const inp = e.target;
    const counter = document.getElementById('wb-chat-len');
    if (counter) {
      const n = (inp.value || '').length;
      counter.textContent = `${n}/${MAX_MSG_LEN}`;
      counter.classList.toggle('warn', n > MAX_MSG_LEN * 0.85);
    }
  }

  function init() {
    stop();
    _lastId = 0;
    // Биндинг через делегирование на родителе чата
    const wrap = document.getElementById('wb-chat-wrap');
    if (!wrap) return;
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('#wb-chat-send')) _send();
    });
    const inp = document.getElementById('wb-chat-inp');
    if (inp) {
      inp.addEventListener('input', _onInput);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _send(); }
      });
    }
    // Первый poll сразу + интервал
    _poll();
    _pollTimer = setInterval(_poll, POLL_INTERVAL_MS);
  }

  function stop() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    _lastId = 0;
    _sendingCooldownUntil = 0;
  }

  Object.assign(window.WBHtml = window.WBHtml || {}, {
    initLobbyChat: init,
    stopLobbyChat: stop,
  });
})();
