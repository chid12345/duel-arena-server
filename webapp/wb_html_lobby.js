/* wb_html_lobby.js — HyperPunk lobby overlay (waiting / idle / prep)
   Exposes window.WBHtml — расширяется в wb_html_battle.js / wb_html_actions.js / wb_html_boss_card.js
   Вызов: WBHtml.render(scene, state) / .close() / .toast(msg) */
window.WBHtml = (() => {
  const ID = 'wb-root';
  let _scene = null, _state = null;
  const _log = [], _wlog = [];

  function _esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _fmtCountdown(iso) {
    try {
      const d = Math.max(0, Math.floor((new Date(iso) - Date.now()) / 1000));
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
    damage_25:  { icon:'⚔️', name:'УРОН',    val:'+25%', price:'60 🪙',  desc:'Усиливает твой урон по боссу на весь бой' },
    power_10:   { icon:'🐲', name:'УРОН',    val:'+10%', price:'30 🪙',  desc:'Лёгкий бонус урона на весь бой' },
    defense_20: { icon:'🛡️', name:'ЗАЩИТА',  val:'+20%', price:'45 🪙',  desc:'Снижает входящий урон от босса на весь бой' },
    dodge_10:   { icon:'💨', name:'УВОРОТ',  val:'+10%', price:'35 🪙',  desc:'Повышает шанс уклонения от атак босса' },
    crit_10:    { icon:'🎯', name:'КРИТ',    val:'+10%', price:'40 🪙',  desc:'Увеличивает шанс критического удара' },
  };
  const RES_META = [
    { id:'res_30',  icon:'💊', pct:'30%',  price:'500 🪙',  desc:'Восстанавливает 30% HP после гибели' },
    { id:'res_60',  icon:'💉', pct:'60%',  price:'1500 🪙', desc:'Восстанавливает 60% HP после гибели' },
    { id:'res_100', icon:'✨', pct:'100%', price:'3000 🪙', desc:'Полное воскрешение с 100% HP', gold:true },
  ];

  function _lobbyHTML(s) {
    const inv = s.raid_scrolls_inv || {}, res = s.res_scrolls_inv || {};
    const ns = s.next_scheduled || {};
    const bossName  = ns.boss_name  || s.boss_name  || 'Мировой Босс';
    const bossEmoji = ns.boss_emoji || s.boss_emoji || '💀';
    const bossLabel = ns.boss_type_label || '';
    const schedAt   = ns.scheduled_at;
    const regCnt    = s.registrants_count || 0;
    const joined    = s.is_registered || false;
    const reminded  = s.reminder_opt_in || false;
    const joinedAndReminded = joined && reminded;

    const boostsHTML = Object.entries(SCROLL_META).map(([id,m]) =>
      `<div class="wb-bc" data-act="buy-scroll" data-id="${id}">
        <div class="bc-ow">×${inv[id]||0}</div>
        <div class="bc-ic">${m.icon}</div>
        <div class="bc-nm">${m.name}</div>
        <div class="bc-vl">${m.val}</div>
        <div class="bc-desc">${m.desc}</div>
        <div class="bc-pr">${m.price}</div>
      </div>`).join('');

    const resHTML = RES_META.map(r => {
      const g = r.gold ? ' style="border-color:rgba(255,200,0,.15)"' : '';
      const gc = r.gold ? ' style="color:#ffdd44"' : '';
      return `<div class="wb-rc" data-act="buy-res" data-id="${r.id}">
        <div class="wb-rh"${g}><div class="wb-ri">${r.icon}</div>
          <div class="wb-rh-pct"${gc}>${r.pct}</div></div>
        <div class="wb-rb">
          <div class="wb-rb-cnt"${gc}>${res[r.id]||0}</div>
          <div class="wb-rb-lbl">В ЗАПАСЕ</div>
          <div class="wb-rb-desc">${r.desc}</div>
          <div class="wb-rbtn"${gc}>${r.price}</div>
        </div>
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

    return `
<div class="wb-hdr">
  <div class="wb-back" data-act="back">‹</div>
  <div class="wb-hdr-icon">💀</div>
  <div><div class="wb-title">МИРОВОЙ БОСС</div><div class="wb-sub">ОБЩИЙ РЕЙД · КАЖДЫЕ 4 ЧАСА</div></div>
</div>
<div class="wb-boss-card" data-act="boss-card">
  <div class="wb-bc-top">
    <div class="wb-timer-lbl">⏱ БОЙ НАЧНЁТСЯ ЧЕРЕЗ</div>
    <div class="wb-cnt" id="wb-timer">${schedAt?_fmtCountdown(schedAt):'—'}</div>
    <div class="wb-insert">▶ INSERT COIN TO PLAY ◀</div>
  </div>
  <div class="wb-bc-div"></div>
  <div class="wb-bc-bot">
    <div class="wb-boss-card-l">
      <div class="wb-boss-type-badge">${bossLabel?bossLabel.toUpperCase()+' · ':''}СЛЕДУЮЩИЙ БОСС</div>
      <div class="wb-boss-card-name">${bossEmoji} ${_esc(bossName)}</div>
      <div class="wb-boss-card-hint">Нажми — характеристики босса →</div>
    </div>
    <div class="wb-hero-r">
      <div class="wb-hero-aura"></div>
      <img class="wb-hero-img" src="bosses/boss3.png" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div class=wb-hero-emoji>${bossEmoji}</div>')"/>
    </div>
  </div>
</div>
<div class="wb-enter" id="wb-enter-btn" data-act="enter">
  <div class="wb-enter-in"><div class="wb-enter-icon">⚔️</div>
    <div class="wb-enter-lbl">ВОЙТИ В РЕЙ<span class="wb-enter-sub">РЕЙД УЖЕ ИДЁТ · НАЖМИ!</span></div>
  </div>
</div>
<div class="wb-join-btn${joinedAndReminded?' joined':''}" data-act="join">
  <div class="wb-join-ico">${joinedAndReminded?'✅':'⚔️'}</div>
  <div class="wb-join-txt">
    <div class="wb-join-main">${joinedAndReminded?'Ты участвуешь · Напоминание включено':'Участвую + напомни за 5 мин'}</div>
    <div class="wb-join-sub">${regCnt>0?`${regCnt} игрок${regCnt===1?'':regCnt<5?'а':'ов'} уже записались`:'Зарегистрируйся и получи уведомление'}</div>
  </div>
  <div class="wb-join-arr">${joinedAndReminded?'✓':'›'}</div>
</div>
<div class="wb-inv-sec">
  <div class="wb-inv-lbl">★ МОИ ЗАПАСЫ</div>
  <div class="wb-chips" id="wb-inv-chips"></div>
</div>
<div class="wb-cats">
  <div class="wb-cat on" data-cat="boosts">⚔️ БУСТЫ</div>
  <div class="wb-cat" data-cat="revival">💊 ВОСКРЕШЕНИЕ</div>
  <div class="wb-cat" data-cat="history">📜 ИСТОРИЯ</div>
</div>
<div class="wb-cp on" data-cp="boosts"><div class="wb-bgrid">${boostsHTML}</div></div>
<div class="wb-cp" data-cp="revival"><div class="wb-rgrid">${resHTML}</div></div>
<div class="wb-cp" data-cp="history"><div class="wb-hist">${topRows}</div></div>
<div style="text-align:right;padding:4px 16px 16px;">
  <span style="font-size:9px;color:#330022;cursor:pointer;" data-act="test">⚡ dev·test</span>
</div>`;
  }

  function _buildInvChips(s) {
    const inv = s.raid_scrolls_inv||{}, res = s.res_scrolls_inv||{};
    const chips = [];
    for (const [id,m] of Object.entries(SCROLL_META)) { const q=inv[id]||0; if(q>0) chips.push(`<div class="wb-chip">${m.icon} <b>×${q}</b></div>`); }
    chips.push(`<div class="wb-chip">💊 <b>×${res.res_30||0}</b></div>`);
    chips.push(`<div class="wb-chip">💉 <b>×${res.res_60||0}</b></div>`);
    chips.push(`<div class="wb-chip">✨ <b>×${res.res_100||0}</b></div>`);
    return chips.join('');
  }

  function _bind(root) {
    root.addEventListener('click', e => {
      const ct = e.target.closest('[data-cat]');
      if (ct) {
        root.querySelectorAll('.wb-cat').forEach(x=>x.classList.remove('on')); ct.classList.add('on');
        root.querySelectorAll('.wb-cp').forEach(x=>x.classList.remove('on'));
        root.querySelector(`[data-cp="${ct.dataset.cat}"]`)?.classList.add('on');
        return;
      }
      const el = e.target.closest('[data-act]'); if (!el) return;
      try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
      const act = el.dataset.act;
      if (act==='back')       { close(); _scene?.scene?.start?.('Menu',{returnTab:'more'}); }
      else if (act==='enter') { close(); _scene?.scene?.restart?.(); }
      else if (act==='join')  {
        (async () => {
          if (!_scene) return;
          const wasReg = !!_state?.is_registered;
          await _scene._registerForRaid?.();
          // auto-sync reminder: enable on join, disable on cancel
          if (!wasReg && _state?.is_registered && !_state?.reminder_opt_in) await _scene._toggleReminder?.();
          if (wasReg && !_state?.is_registered && _state?.reminder_opt_in) await _scene._toggleReminder?.();
        })();
      }
      else if (act==='boss-card') { window.WBHtml.showBossCard?.(_state); }
      else if (act==='buy-scroll') { _scene?._buyScroll?.(el.dataset.id); }
      else if (act==='buy-res')    { _scene?._buyResScroll?.(el.dataset.id); }
      else if (act==='test')  { get('/api/admin/wb_test_schedule').then(()=>_scene?._refresh?.()).catch(()=>{}); }
    });
  }

  function render(scene, state) {
    _scene = scene; _state = state;
    window.WBLobbyCSS?.inject();
    try { window._closeAllTabOverlays?.(); } catch(_) {}
    const s = state || {};
    const root = _root();
    if (s.active) { window.WBHtml._renderBattle?.(root, s); return; }
    if ((s.prep_seconds_left||0) > 0) {
      root.innerHTML = `<div class="wb-hdr"><div class="wb-back" data-act="back">‹</div><div class="wb-hdr-icon">💀</div><div><div class="wb-title">МИРОВОЙ БОСС</div><div class="wb-sub">ПОДГОТОВКА К РЕЙДУ</div></div></div><div class="wb-prep"><div class="wb-prep-t" id="wb-prep-cnt">Старт через ${s.prep_seconds_left} сек</div><div class="wb-prep-s">Свитки применяй в слоты после первого удара</div></div>`;
      _bind(root); return;
    }
    root.innerHTML = _lobbyHTML(s);
    root.querySelector('#wb-inv-chips').innerHTML = _buildInvChips(s);
    if (s.active) root.querySelector('#wb-enter-btn')?.classList.add('active');
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
    document.getElementById(ID)?.remove();
  }

  return { render, toast, close, _log, _wlog };
})();
