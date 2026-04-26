/* wb_html_lobby.js — лобби Мирового Босса
   Exposes window.WBHtml — расширяется в wb_html_battle.js / wb_html_actions.js / wb_html_boss_card.js
   Вызов: WBHtml.render(scene, state) / .close() / .toast(msg) */
window.WBHtml = (() => {
  const ID = 'wb-root';
  let _scene = null, _state = null;
  const _log = [], _wlog = [];

  function _esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _boughtKey() { return 'wb_bought_' + (_state?.next_scheduled?.scheduled_at || 'now'); }
  function _getBought() { try { return JSON.parse(sessionStorage.getItem(_boughtKey()) || '[]'); } catch(_) { return []; } }
  function _markBought(id) { try { const b=_getBought(); if(!b.includes(id)){b.push(id);sessionStorage.setItem(_boughtKey(),JSON.stringify(b));} } catch(_) {} }

  function _fmtCountdown(iso) {
    try {
      const d = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
      const h = Math.floor(d/3600), m = Math.floor((d%3600)/60), s = d%60;
      return h>0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
                 : `${m}:${String(s).padStart(2,'0')}`;
    } catch(_) { return '—'; }
  }
  function _root() {
    let r = document.getElementById(ID);
    if (!r) { r = document.createElement('div'); r.id = ID; document.body.appendChild(r); }
    return r;
  }

  const SCROLL_META = {
    damage_25:  { icon:'⚔️', name:'УРОН',   val:'+25%', price:'60 🪙' },
    power_10:   { icon:'🐲', name:'УРОН',   val:'+10%', price:'30 🪙' },
    defense_20: { icon:'🛡️', name:'ЗАЩИТА', val:'+20%', price:'45 🪙' },
    dodge_10:   { icon:'💨', name:'УВОРОТ', val:'+10%', price:'35 🪙' },
    crit_10:    { icon:'🎯', name:'КРИТ ШАНС', val:'+10%', price:'40 🪙' },
  };
  const RES_META = [
    { id:'res_30',  icon:'💊', pct:'30%',  price:'500 🪙',  desc:'Восстанавливает 30% HP после гибели' },
    { id:'res_60',  icon:'💉', pct:'60%',  price:'1 500 🪙', desc:'Восстанавливает 60% HP после гибели' },
    { id:'res_100', icon:'✨', pct:'100%', price:'3 000 🪙', desc:'Полное воскрешение с 100% HP', gold:true },
  ];
  const BOSS_TYPE_STYLE = {
    universal: { hdr:'rgba(60,20,90,.97)',  border:'rgba(150,80,255,.55)', badge:'#cc88ff', label:'УНИВЕРСАЛЬНЫЙ' },
    fire:      { hdr:'rgba(90,15,5,.97)',   border:'rgba(255,80,20,.6)',   badge:'#ff8844', label:'ОГНЕННЫЙ' },
    ice:       { hdr:'rgba(5,25,75,.97)',   border:'rgba(30,160,255,.6)',  badge:'#55ccff', label:'ЛЕДЯНОЙ' },
    poison:    { hdr:'rgba(5,45,10,.97)',   border:'rgba(60,210,60,.55)',  badge:'#88ff88', label:'ЯДОВИТЫЙ' },
    shadow:    { hdr:'rgba(15,5,35,.97)',   border:'rgba(130,60,200,.55)', badge:'#bb88ff', label:'ТЕНЕВОЙ' },
  };

  function _lobbyHTML(s) {
    const inv = s.raid_scrolls_inv || {}, res = s.res_scrolls_inv || {};
    const ns = s.next_scheduled || {};
    const bossName  = ns.boss_name  || s.boss_name  || 'Мировой Босс';
    const bossEmoji = ns.boss_emoji || s.boss_emoji || '💀';
    const bossType  = ns.boss_type  || s.boss_type  || 'universal';
    const bossLabel = ns.boss_type_label || '';
    const bst       = BOSS_TYPE_STYLE[bossType] || BOSS_TYPE_STYLE.universal;
    const schedAt   = ns.scheduled_at;
    const regCnt    = s.registrants_count || 0;
    const until     = s.seconds_until_raid;
    const showJoin  = until != null && until <= 3600;
    const joined    = s.is_registered || false;
    const reminded  = s.reminder_opt_in || false;
    const joinedAll = joined; // показываем joined если зарегистрирован (не ждём reminder)
    // Призовой фонд = пул за вклад (50/игрока). Каждому ещё +30 гарантия.
    const _GOLD_GUARANTEED = 30;
    const _GOLD_PER_PLAYER = 50;
    const prizePool = (regCnt * _GOLD_PER_PLAYER).toLocaleString('ru');

    const bought = _getBought();
    const boostEntries = Object.entries(SCROLL_META);
    const boostsHTML = boostEntries.map(([id,m]) => {
      const isBought = bought.includes(id);
      const bCls = isBought ? ' bought' : '';
      return `<div class="wb-bc${bCls}" data-act="boost-info" data-id="${id}">
        <div class="bc-top"><div class="bc-ic">${m.icon}</div><div class="bc-ow">×${inv[id]||0}</div></div>
        <div class="bc-nm">${m.name}</div><div class="bc-vl">${m.val}</div>
        <div class="bc-buy">${m.price}</div>
        <div class="bc-bought-lbl">✓ КУПЛЕНО</div>
      </div>`;
    }).join('');

    const resHTML = RES_META.map(r => {
      const gc = r.gold ? ' style="color:#ffdd44"' : '';
      return `<div class="wb-rc" data-act="buy-res" data-id="${r.id}">
        <div class="wb-rh"${r.gold?' style="border-color:rgba(255,200,0,.15)"':''}><div class="wb-ri">${r.icon}</div>
          <div class="wb-rh-pct"${gc}>${r.pct}</div></div>
        <div class="wb-rb"><div class="wb-rb-cnt"${gc}>${res[r.id]||0}</div>
          <div class="wb-rb-lbl">В ЗАПАСЕ</div><div class="wb-rb-desc">${r.desc}</div>
          <div class="wb-rbtn"${gc}>${r.price}</div></div>
      </div>`;
    }).join('');

    const topRows = (s.top||[]).slice(0,5).map((t,i)=>
      `<div class="wb-hc"><div class="wb-hh">
        <div class="wb-hi">${['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</div>
        <div style="flex:1"><div class="wb-hn">${_esc(t.name||'Игрок')}</div>
          <div class="wb-hm"><span class="wb-hd">Ур.${t.level||'?'}</span><span class="wb-hdmg">⚔️${(t.damage||0).toLocaleString('ru')}</span></div>
        </div>
        <div class="wb-hbdg ${t.contribution>=100?'f':'p'}">${t.contribution>=100?'100%':`${t.contribution||0}%`}</div>
      </div></div>`).join('') || '<div style="padding:14px;text-align:center;font-size:11px;color:#445;letter-spacing:1px;">История пуста</div>';

    const top5 = (s.top||[]).slice(0,6);
    const DEF_EM = ['⚔️','🛡️','🔮','🐉','⚡','🗡️','🔥'];
    const avEmojis = top5.length > 0 ? top5.map(t=>t.emoji||'⚔️') : DEF_EM.slice(0,7);
    const avatarsHTML = avEmojis.map(em=>`<div class="wb-av">${em}</div>`).join('');

    return `
<div class="wb-hdr">
  <div class="wb-back" data-act="back">‹</div>
  <div class="wb-hdr-icon">💀</div>
  <div><div class="wb-title">МИРОВОЙ БОСС</div><div class="wb-sub">ОБЩИЙ РЕЙД · КАЖДЫЕ 4 ЧАСА</div></div>
  <div class="wb-live"><div class="wb-ldot"></div><div class="wb-livenum">${regCnt||0}</div></div>
</div>
<div class="wb-bcard2" data-act="boss-card">
  <div class="wb-bc2-tlbl">⏱ БОЙ НАЧНЁТСЯ ЧЕРЕЗ</div>
  <div class="wb-bc2-tval" id="wb-timer">${schedAt?_fmtCountdown(schedAt):'—'}</div>
</div>
<div class="wb-enter" id="wb-enter-btn" data-act="enter">
  <div class="wb-enter-in"><div class="wb-enter-icon">⚔️</div>
    <div class="wb-enter-lbl">ВОЙТИ В РЕЙ<span class="wb-enter-sub">РЕЙД УЖЕ ИДЁТ · НАЖМИ!</span></div>
  </div>
</div>
<div class="wb-prize">
  <div class="wb-prize-l">
    <div class="wb-prize-lbl">⚡ ПРИЗОВОЙ ФОНД</div>
    <div class="wb-prize-coins">🪙 ${prizePool}</div>
    <div class="wb-prize-sub">+30 гарантия · пул делится по урону</div>
  </div>
  <div class="wb-prize-r">
    <div class="wb-prize-cnt">${regCnt}</div>
    <div class="wb-prize-players">игроков</div>
  </div>
</div>
<div class="wb-avstrip">${avatarsHTML}<span class="wb-av-more">${regCnt||0} участников</span></div>
<div class="wb-recon" data-act="boss-card">
  <div class="wb-recon-ic">🔍</div>
  <div class="wb-recon-txt">
    <div class="wb-recon-main">Разведка босса</div>
    <div class="wb-recon-sub">Узнай слабые места и стику — +15% эффективность</div>
  </div>
  <div class="wb-recon-arr">›</div>
</div>
<div class="wb-auto-row" data-act="auto-toggle">
  <div class="wb-auto-ic">🤖</div>
  <div class="wb-auto-txt">
    <div class="wb-auto-main">Авто-бой (50% эффективности)</div>
    <div class="wb-auto-sub">Бот зайдёт за тебя — даже если ты офлайн</div>
  </div>
  <div class="wb-toggle${s.auto_bot_pending?' on':''}" id="wb-auto-toggle"></div>
</div>
<div class="wb-join-btn${joinedAll?' joined':''}" data-act="join">
  <div class="wb-join-ico">${joinedAll?'✅':'⚔️'}</div>
  <div class="wb-join-txt">
    <div class="wb-join-main">${joinedAll?(reminded?'Ты участвуешь · Напоминание вкл.':'Ты участвуешь'):'Участвую + напомни за 5 мин'}</div>
    <div class="wb-join-sub">${regCnt>0?`${regCnt} игроков уже записались`:'Зарегистрируйся и получи уведомление'}</div>
  </div>
  <div class="wb-join-arr">${joinedAll?'✓':'›'}</div>
</div>
<div class="wb-shop-hdr"><span>🛒 МАГАЗИН БОЯ</span><div class="wb-shop-line"></div></div>
<div class="wb-cats">
  <div class="wb-cat on" data-cat="boosts"><span class="wb-cat-ic">⚔️</span><span class="wb-cat-lb">БУСТЫ</span></div>
  <div class="wb-cat" data-cat="revival"><span class="wb-cat-ic">💊</span><span class="wb-cat-lb">ВОСКРЕШЕНИЕ</span></div>
  <div class="wb-cat" data-cat="history"><span class="wb-cat-ic">📜</span><span class="wb-cat-lb">ИСТОРИЯ</span></div>
</div>
<div class="wb-cp on" data-cp="boosts"><div class="wb-bgrid">${boostsHTML}</div></div>
<div class="wb-cp" data-cp="revival"><div class="wb-rgrid">${resHTML}</div></div>
<div class="wb-cp" data-cp="history"><div class="wb-hist">${topRows}</div></div>
<div style="text-align:right;padding:4px 16px 16px;">
  <span style="font-size:9px;color:#220011;cursor:pointer;" data-act="test">⚡ dev·test</span>
</div>`;
  }

  function _buildInvChips(s) {
    const inv = s.raid_scrolls_inv||{}, res = s.res_scrolls_inv||{};
    const chips = [];
    for (const [id,m] of Object.entries(SCROLL_META)) { const q=inv[id]||0; if(q>0) chips.push(`<div class="wb-chip">${m.icon} <b>×${q}</b></div>`); }
    if ((res.res_30||0)>0)  chips.push(`<div class="wb-chip">💊 <b>×${res.res_30}</b></div>`);
    if ((res.res_60||0)>0)  chips.push(`<div class="wb-chip">💉 <b>×${res.res_60}</b></div>`);
    if ((res.res_100||0)>0) chips.push(`<div class="wb-chip">✨ <b>×${res.res_100}</b></div>`);
    return chips.join('');
  }

  function _updateInvSection(root, s) {
    const el = root.querySelector('#wb-inv-chips'); if (!el) return;
    const html = _buildInvChips(s); el.innerHTML = html;
    const sec = root.querySelector('.wb-inv-sec'); if (sec) sec.style.display = html ? '' : 'none';
  }

  function _bind(root) {
    // Защита от дубликатов: каждый _render() вызывает _bind, но listener на root
    // переживает innerHTML. Без флага получаем 2-3-N обработчиков → join-toggle
    // срабатывает дважды и отменяет себя. Биндим только один раз на root.
    if (root.__wbBound) return;
    root.__wbBound = true;
    root.addEventListener('click', e => {
      const ct = e.target.closest('[data-cat]');
      if (ct) {
        root.querySelectorAll('.wb-cat').forEach(x=>x.classList.remove('on')); ct.classList.add('on');
        root.querySelectorAll('.wb-cp').forEach(x=>x.classList.remove('on'));
        root.querySelector(`[data-cp="${ct.dataset.cat}"]`)?.classList.add('on'); return;
      }
      const el = e.target.closest('[data-act]'); if (!el) return;
      try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
      const act = el.dataset.act;
      if (act==='back')       { close(); _scene?.scene?.start?.('Menu',{returnTab:'more'}); }
      else if (act==='enter') {
        // Явный «вход в рейд» — запоминаем spawn_id чтобы при ререндере
        // переключиться в боевой экран. Без этого лобби «затягивает» всех
        // кто просто открыл вкладку Босс во время активного рейда.
        try {
          localStorage.removeItem('wb_left_raid');
          if (_state?.active?.spawn_id) {
            localStorage.setItem('wb_entered_raid', String(_state.active.spawn_id));
          }
        } catch(_) {}
        close(); _scene?.scene?.restart?.();
      }
      else if (act==='join')  {
        // Защита от двойного клика.
        if (el.classList.contains('busy')) return;
        el.classList.add('busy');
        // Оптимистично переключаем UI — пользователь сразу видит результат.
        // Если API не подтвердит — _render() в _registerForRaid вернёт правильный вид.
        const willJoin = !el.classList.contains('joined');
        el.classList.toggle('joined', willJoin);
        const ico  = el.querySelector('.wb-join-ico');
        const main = el.querySelector('.wb-join-main');
        const arr  = el.querySelector('.wb-join-arr');
        const sub  = el.querySelector('.wb-join-sub');
        if (ico)  ico.textContent  = willJoin ? '✅' : '⚔️';
        if (main) main.textContent = willJoin ? 'Ты участвуешь · Напоминание вкл.' : 'Участвую + напомни за 5 мин';
        if (arr)  arr.textContent  = willJoin ? '✓' : '›';
        // Счётчик игроков — оптимистично.
        const avMore = root.querySelector('.wb-av-more');
        const prizeCnt = root.querySelector('.wb-prize-cnt');
        const cur = parseInt(avMore?.textContent) || 0;
        const next = Math.max(0, cur + (willJoin ? 1 : -1));
        if (avMore)   avMore.textContent = next + ' участников';
        if (prizeCnt) prizeCnt.textContent = next;
        if (sub)      sub.textContent = next > 0 ? `${next} игроков уже записались` : 'Зарегистрируйся и получи уведомление';
        try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('medium'); } catch(_) {}
        (async () => {
          try {
            if (!_scene) return;
            const wasReg = !!_state?.is_registered;
            await _scene._registerForRaid?.(); // обновит _state и сделает _render
            if (!wasReg && _state?.is_registered && !_state?.reminder_opt_in) await _scene._toggleReminder?.();
            if (wasReg && !_state?.is_registered && _state?.reminder_opt_in) await _scene._toggleReminder?.();
          } finally {
            if (el.isConnected) el.classList.remove('busy');
          }
        })();
      }
      else if (act==='boss-card')    { window.WBHtml.showBossCard?.(_state); }
      else if (act==='auto-toggle')  {
        // Тогл «авто-бой из лобби»: бот зайдёт за тебя если будешь офлайн.
        const tg = document.getElementById('wb-auto-toggle');
        if (!tg || tg.classList.contains('busy')) return;
        tg.classList.add('busy');
        const willOn = !tg.classList.contains('on');
        tg.classList.toggle('on', willOn);
        try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light'); } catch(_) {}
        (async () => {
          try {
            const r = await post('/api/world_boss/toggle_auto_bot', { enabled: willOn });
            if (r && r.ok) {
              if (_state) _state.auto_bot_pending = !!r.enabled;
              window.WBHtml?.toast?.(r.enabled ? '🤖 Авто-бой включён · бот зайдёт за тебя' : '🤖 Авто-бой выключен');
            } else {
              tg.classList.toggle('on', !willOn); // откат
              window.WBHtml?.toast?.('❌ ' + (r?.reason || 'Ошибка'));
            }
          } catch(_) {
            tg.classList.toggle('on', !willOn);
            window.WBHtml?.toast?.('❌ Нет соединения');
          } finally {
            tg.classList.remove('busy');
          }
        })();
      }
      else if (act==='boost-info') {
        if (el.classList.contains('bought')) return;
        window.WBHtml.showBoostInfo?.(el.dataset.id, _state, _scene, SCROLL_META, _markBought);
      }
      else if (act==='buy-res') { _scene?._buyResScroll?.(el.dataset.id); }
      else if (act==='test')    { get('/api/admin/wb_test_schedule').then(()=>_scene?._refresh?.()).catch(()=>{}); }
    });
  }

  function _setTabBar(visible) {
    try { _scene?._tabBarResult?.objs?.forEach(o => o.setVisible?.(visible)); } catch(_) {}
  }

  function _fitToCanvas(root) {
    try {
      const c = document.querySelector('canvas'); if (!c) return;
      const r = c.getBoundingClientRect();
      const tabBarH = Math.round((r.height * 76) / (c.height || 700));
      root.style.top    = r.top  + 'px';
      root.style.left   = r.left + 'px';
      root.style.right  = 'auto';
      root.style.bottom = 'auto';
      root.style.width  = r.width + 'px';
      root.style.height = Math.max(0, r.height - tabBarH) + 'px';
    } catch(_) {}
  }

  // Auto-refit при resize окна / viewport Telegram / scale Phaser.
  // Без этого после смены ориентации, появления клавиатуры или развёртывания
  // header'а Telegram оверлей закрывает таб-бар → клики на нижнем меню не доходят.
  let _fitTeardown = null;
  function _setupFitObservers(root) {
    if (_fitTeardown) return; // уже стоит
    const refit = () => _fitToCanvas(root);
    const onResize = () => requestAnimationFrame(refit);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    let ro = null;
    try {
      const c = document.querySelector('canvas');
      if (c && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(onResize); ro.observe(c);
      }
    } catch(_) {}
    let tgOff = null;
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.onEvent) { tg.onEvent('viewportChanged', onResize); tgOff = () => tg.offEvent?.('viewportChanged', onResize); }
    } catch(_) {}
    _fitTeardown = () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      try { ro?.disconnect(); } catch(_) {}
      try { tgOff?.(); } catch(_) {}
      _fitTeardown = null;
    };
  }

  function render(scene, state) {
    _scene = scene; _state = state; window.WBHtml._scene = scene;
    if (state?.unclaimed_rewards?.length) { window.WBBattleCSS?.inject(); window.WBHtml.showMvpResult?.(state, scene); }
    window.WBLobbyCSS?.inject();
    try { window._closeAllTabOverlays?.(); } catch(_) {}
    const s = state || {};
    const root = _root();
    // Cleanup флагов localStorage когда рейд закончился — иначе они копятся
    // и ломают логику следующих рейдов.
    if (!s.active) {
      try {
        localStorage.removeItem('wb_left_raid');
        localStorage.removeItem('wb_entered_raid');
      } catch(_) {}
    }
    const _leftSid = (() => { try { return localStorage.getItem('wb_left_raid'); } catch(_) { return null; } })();
    let _enteredSid = (() => { try { return localStorage.getItem('wb_entered_raid'); } catch(_) { return null; } })();
    // Если тапнул ENTER но 2-минутное окно входа закрылось, и удара ещё
    // не было (нет player_state) — чистим флаг чтобы не показать боевой
    // экран без возможности участвовать.
    if (s.active && !s.player_state && _enteredSid === String(s.active.spawn_id)) {
      const elapsed = 600 - (s.active.seconds_left || 600);
      if (elapsed > 120) {
        try { localStorage.removeItem('wb_entered_raid'); } catch(_) {}
        _enteredSid = null;
      }
    }
    // Авто-бот: если включил «Авто-бой 50%» в лобби — НЕ форсим в бой,
    // бот сам дерётся, игрок занимается чем хочет.
    const isAutoBotMe = !!s.player_state?.auto_bot;
    // Боевой экран только если ИГРОК явно вошёл в рейд:
    //  1) уже бил (есть player_state без auto_bot) — он в бою
    //  2) тапнул «ВОЙТИ В РЕЙД» (wb_entered_raid совпадает с активным spawn_id)
    // Иначе показываем лобби с кнопкой «ВОЙТИ В РЕЙД» — даже во время активного рейда.
    // Это исправляет «затянуло в бой» когда я просто открыл вкладку Босс
    // во время чужого рейда.
    const hasJoinedActive = s.active && s.player_state && !isAutoBotMe;
    const tappedEnter = s.active && _enteredSid === String(s.active.spawn_id);
    if (hasJoinedActive || (tappedEnter && _leftSid !== String(s.active.spawn_id))) {
      if (_leftSid) try { localStorage.removeItem('wb_left_raid'); } catch(_) {}
      _setTabBar(false); root.style.cssText = ''; window.WBHtml._renderBattle?.(root, s); return;
    }
    _setTabBar(true);
    _fitToCanvas(root);
    _setupFitObservers(root);
    if ((s.prep_seconds_left||0) > 0) {
      root.innerHTML = `<div class="wb-hdr"><div class="wb-back" data-act="back">‹</div><div class="wb-hdr-icon">💀</div><div><div class="wb-title">МИРОВОЙ БОСС</div><div class="wb-sub">ПОДГОТОВКА К РЕЙДУ</div></div></div><div class="wb-prep"><div class="wb-prep-t" id="wb-prep-cnt">Старт через ${s.prep_seconds_left} сек</div><div class="wb-prep-s">Свитки применяй в слоты после первого удара</div></div>`;
      _bind(root); return;
    }
    root.innerHTML = _lobbyHTML(s);
    _updateInvSection(root, s);
    if (s.active) {
      // Вход в рейд открыт только первые 2 минуты после старта.
      // После — кнопка «ВХОД ЗАКРЫТ», тап ничего не делает + плашка ниже
      // с дружелюбным текстом «дождись окончания».
      const elapsed = 600 - (s.active.seconds_left || 600); // WB_DURATION_SEC = 600
      const lateClosed = elapsed > 120;
      const btn = root.querySelector('#wb-enter-btn');
      if (btn) {
        if (lateClosed) {
          btn.classList.add('locked');
          btn.removeAttribute('data-act'); // отключаем клик
          const lbl = btn.querySelector('.wb-enter-lbl');
          if (lbl) lbl.innerHTML = '🔒 ВХОД ЗАКРЫТ<span class="wb-enter-sub">Можно зайти только в первые 2 минуты</span>';
          // Дружелюбная плашка под кнопкой.
          const note = document.createElement('div');
          note.className = 'wb-enter-note';
          const mins = Math.ceil((s.active.seconds_left || 0) / 60);
          note.innerHTML = `⏳ Бой ещё идёт · осталось ~${mins} мин<br><span style="opacity:.7">Дождись окончания — после рейда сразу будет следующий через 4 часа</span>`;
          btn.insertAdjacentElement('afterend', note);
        } else {
          btn.classList.add('active');
        }
      }
    }
    _bind(root);
    _startTimer();
  }

  function _startTimer() {
    clearInterval(window._wbTimer);
    window._wbTimer = setInterval(() => {
      const el = document.getElementById('wb-timer'); if (!el) { clearInterval(window._wbTimer); return; }
      const sa = _state?.next_scheduled?.scheduled_at;
      if (sa) el.textContent = _fmtCountdown(sa);
    }, 1000);
  }

  function toast(msg) {
    document.querySelectorAll('.wb-toast').forEach(t=>t.remove());
    const t = document.createElement('div'); t.className='wb-toast'; t.textContent=msg;
    document.body.appendChild(t); setTimeout(()=>t.remove(), 2500);
  }

  function close() {
    clearInterval(window._wbTimer);
    try { _fitTeardown?.(); } catch(_) {}
    document.getElementById(ID)?.remove();
    _setTabBar(true);
  }

  // Live-обновление счётчиков без перерисовки всего лобби.
  // Вызывается из WS-handler'ов (wb_idle / wb_tick) — счётчики и пул растут
  // у всех клиентов одновременно, не нужно ждать заход-выход.
  function updateLobbyCounters(s) {
    const root = document.getElementById(ID);
    if (!root) return;
    if (_state) {
      if (s.registrants_count != null) _state.registrants_count = s.registrants_count;
      if (s.fighters_count != null) _state.registrants_count = Math.max(_state.registrants_count || 0, s.fighters_count);
    }
    const cnt = (s.fighters_count != null ? Math.max(s.fighters_count, s.registrants_count || 0) : (s.registrants_count || 0));
    const live = root.querySelector('.wb-livenum');
    if (live) live.textContent = cnt;
    const prizeCnt = root.querySelector('.wb-prize-cnt');
    if (prizeCnt) prizeCnt.textContent = cnt;
    const coins = root.querySelector('.wb-prize-coins');
    if (coins) coins.textContent = '🪙 ' + (cnt * 50).toLocaleString('ru');
    const avMore = root.querySelector('.wb-av-more');
    if (avMore) avMore.textContent = cnt + ' участников';
    const sub = root.querySelector('.wb-join-sub');
    const joined = root.querySelector('.wb-join-btn.joined');
    if (sub && !joined) {
      sub.textContent = cnt > 0 ? `${cnt} игроков уже записались` : 'Зарегистрируйся и получи уведомление';
    }
  }

  return { render, toast, close, updateLobbyCounters, _log, _wlog };
})();
