/* wb_html_lobby.js — HyperPunk lobby overlay (waiting / idle / prep)
   Exposes window.WBHtml — расширяется в wb_html_battle.js
   Вызов: WBHtml.render(scene, state) / .close() / .toast(msg) */
window.WBHtml = (() => {
  const ID = 'wb-root';
  const CSS_ID = 'wb-style';
  let _scene = null;
  const _log = [];   // боевой лог (мой урон)
  const _wlog = [];  // общий лог (все)

  /* ── CSS ── */
  const CSS = `
#wb-root{position:fixed;inset:0;z-index:8500;overflow-y:auto;overflow-x:hidden;
  background:radial-gradient(ellipse at 50% -5%,#1d0035 0%,#04030a 55%),#000;
  font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#ddeeff;
  scrollbar-width:none;}
#wb-root::-webkit-scrollbar{display:none}
#wb-root::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,200,.016) 3px 4px);}
#wb-root::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(circle at 10% 15%,rgba(255,0,200,.09) 0%,transparent 40%),
             radial-gradient(circle at 90% 80%,rgba(0,200,255,.07) 0%,transparent 40%);}
#wb-root>*{position:relative;z-index:1;}
.wb-hdr{display:flex;align-items:center;gap:10px;padding:14px 16px 12px;
  border-bottom:1px solid rgba(255,0,200,.18);
  background:linear-gradient(180deg,rgba(30,0,50,.5) 0%,transparent 100%);position:sticky;top:0;z-index:10;}
.wb-back{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;
  background:rgba(255,0,200,.07);border:1px solid rgba(255,0,200,.3);font-size:16px;color:#ff00cc;cursor:pointer;}
.wb-hdr-icon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:22px;
  background:linear-gradient(135deg,#1a0033,#002a30);border:1px solid #ff00cc;
  box-shadow:0 0 16px rgba(255,0,200,.5),inset 0 0 10px rgba(255,0,200,.12);
  animation:wb-ip 3s ease-in-out infinite;}
@keyframes wb-ip{0%,100%{box-shadow:0 0 14px rgba(255,0,200,.45)}50%{box-shadow:0 0 26px rgba(255,0,200,.85)}}
.wb-title{font-size:15px;font-weight:900;letter-spacing:2px;
  background:linear-gradient(90deg,#ff00cc,#00e5ff);-webkit-background-clip:text;background-clip:text;color:transparent;}
.wb-sub{font-size:9px;color:#00e5ff;opacity:.65;letter-spacing:1.5px;margin-top:1px;}
.wb-hero{margin:10px 14px 0;border-radius:16px;overflow:hidden;position:relative;
  background:linear-gradient(135deg,rgba(20,0,40,.97),rgba(0,8,28,.97));
  border:1px solid rgba(255,0,200,.38);box-shadow:0 0 32px rgba(255,0,200,.12),inset 0 0 30px rgba(255,0,200,.04);}
.wb-hero::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,0,200,.6),transparent);}
.wb-hero-in{display:flex;align-items:stretch;min-height:140px;}
.wb-hero-l{flex:1;padding:14px 14px 14px 16px;display:flex;flex-direction:column;justify-content:center;}
.wb-badge{font-size:8px;font-weight:800;letter-spacing:2.5px;color:#ff00cc;text-shadow:0 0 8px currentColor;margin-bottom:8px;}
.wb-bname{font-size:13px;font-weight:900;letter-spacing:1px;margin-bottom:10px;
  background:linear-gradient(90deg,#fff,#00e5ff);-webkit-background-clip:text;background-clip:text;color:transparent;}
.wb-cnt{font-size:36px;font-weight:900;letter-spacing:3px;font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,#00ffee,#00aacc);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 10px rgba(0,230,255,.65));animation:wb-cp 1s ease-in-out infinite;}
@keyframes wb-cp{0%,100%{filter:drop-shadow(0 0 10px rgba(0,230,255,.6))}50%{filter:drop-shadow(0 0 18px rgba(0,230,255,.9))}}
.wb-insert{font-size:7px;letter-spacing:3px;color:#ff00cc;opacity:.6;margin-top:6px;animation:wb-blink 1.2s step-end infinite;}
@keyframes wb-blink{0%,100%{opacity:.6}50%{opacity:.1}}
.wb-hero-r{width:120px;flex-shrink:0;position:relative;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;}
.wb-hero-aura{position:absolute;width:140px;height:140px;border-radius:50%;bottom:-40px;left:50%;transform:translateX(-50%);
  background:radial-gradient(ellipse,rgba(255,0,200,.2) 0%,transparent 70%);
  animation:wb-ap 2.5s ease-in-out infinite;}
@keyframes wb-ap{0%,100%{opacity:.6;transform:translateX(-50%) scale(.9)}50%{opacity:1;transform:translateX(-50%) scale(1.1)}}
.wb-hero-img{width:110px;height:130px;object-fit:contain;position:relative;z-index:1;
  filter:drop-shadow(0 0 14px rgba(255,0,200,.7)) drop-shadow(0 0 28px rgba(0,200,255,.3));
  animation:wb-bf 3s ease-in-out infinite;}
.wb-hero-emoji{font-size:72px;position:relative;z-index:1;animation:wb-bf 3s ease-in-out infinite;
  filter:drop-shadow(0 0 20px rgba(255,0,200,.6));}
@keyframes wb-bf{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.wb-enter{display:none;margin:10px 14px 0;height:60px;border-radius:14px;position:relative;overflow:hidden;cursor:pointer;
  background:linear-gradient(135deg,#cc0055,#ff0080,#cc0055);background-size:200% auto;
  border:2px solid #ff00aa;animation:wb-eg 1s ease-in-out infinite,wb-ebg 3s linear infinite;
  box-shadow:0 0 40px rgba(255,0,130,.5),0 0 80px rgba(255,0,130,.2),inset 0 1px 0 rgba(255,180,220,.3);}
@keyframes wb-eg{0%,100%{box-shadow:0 0 35px rgba(255,0,130,.5),0 0 70px rgba(255,0,130,.2)}50%{box-shadow:0 0 55px rgba(255,0,130,.85),0 0 110px rgba(255,0,130,.35)}}
@keyframes wb-ebg{to{background-position:200% center}}
.wb-enter.active{display:block;}
.wb-enter-in{display:flex;align-items:center;justify-content:center;gap:10px;height:100%;position:relative;z-index:2;}
.wb-enter-icon{font-size:24px;animation:wb-eis .4s ease-in-out infinite alternate;}
@keyframes wb-eis{0%{transform:rotate(-5deg) scale(1)}100%{transform:rotate(5deg) scale(1.1)}}
.wb-enter-lbl{font-size:18px;font-weight:900;color:#fff;letter-spacing:2px;text-shadow:0 0 14px rgba(255,200,220,.9);}
.wb-enter-sub{display:block;font-size:9px;font-weight:700;color:rgba(255,200,220,.6);letter-spacing:3px;margin-top:1px;}
.wb-row2{display:flex;gap:8px;margin:8px 14px;}
.wb-btn{flex:1;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:7px;
  border:1px solid rgba(255,0,200,.3);color:#ff88dd;font-size:12px;font-weight:700;cursor:pointer;
  background:rgba(255,0,200,.06);transition:all .2s;}
.wb-btn.yl{border-color:rgba(255,200,0,.25);color:#ffdd66;background:rgba(255,200,0,.06);}
.wb-btn:hover{background:rgba(255,0,200,.12);}
.wb-btn.yl:hover{background:rgba(255,200,0,.12);}
.wb-inv-sec{margin:0 14px 8px;}
.wb-inv-lbl{font-size:8px;font-weight:800;letter-spacing:2.5px;color:#00e5ff;text-shadow:0 0 5px currentColor;margin-bottom:6px;}
.wb-chips{display:flex;gap:5px;flex-wrap:wrap;}
.wb-chip{display:flex;align-items:center;gap:4px;padding:5px 9px;border-radius:8px;
  background:rgba(0,8,25,.8);border:1px solid rgba(0,229,255,.2);font-size:10px;font-weight:700;color:#aaeeff;}
.wb-chip .v{color:#00e5ff;font-weight:900;text-shadow:0 0 4px currentColor;}
.wb-cats{display:flex;margin:0 14px 6px;border-radius:12px;background:rgba(255,255,255,.03);
  border:1px solid rgba(255,0,200,.15);overflow:hidden;}
.wb-cat{flex:1;padding:9px 0;text-align:center;font-size:10px;font-weight:800;letter-spacing:.5px;
  color:#664477;cursor:pointer;transition:all .2s;position:relative;}
.wb-cat.on{background:linear-gradient(135deg,rgba(255,0,200,.1),rgba(0,100,200,.08));
  color:#fff;text-shadow:0 0 8px rgba(255,0,200,.5);}
.wb-cat.on::after{content:"";position:absolute;bottom:0;left:10%;right:10%;height:1px;
  background:linear-gradient(90deg,transparent,#ff00cc,transparent);}
.wb-cp{display:none;}.wb-cp.on{display:block;}
.wb-bgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px 14px 10px;}
.wb-bc{padding:12px;border-radius:13px;cursor:pointer;position:relative;overflow:hidden;
  background:linear-gradient(135deg,rgba(20,0,38,.97),rgba(5,4,18,.97));
  border:1px solid rgba(255,0,200,.25);transition:all .2s;}
.wb-bc:hover{border-color:rgba(255,0,200,.55);box-shadow:0 0 18px rgba(255,0,200,.2);}
.wb-bc.wide{grid-column:1/-1;display:flex;align-items:center;gap:12px;}
.bc-ic{font-size:20px;margin-bottom:5px;filter:drop-shadow(0 0 5px rgba(255,0,200,.5));}
.bc-nm{font-size:9px;font-weight:800;letter-spacing:.8px;color:#cc88ff;margin-bottom:2px;}
.bc-vl{font-size:16px;font-weight:900;color:#ff00cc;text-shadow:0 0 8px currentColor;}
.bc-pr{font-size:9px;color:#553366;margin-top:3px;}
.bc-ow{position:absolute;top:7px;right:8px;font-size:9px;font-weight:800;color:#00e5ff;
  background:rgba(0,229,255,.1);border:1px solid rgba(0,229,255,.25);padding:1px 7px;border-radius:5px;}
.wb-rgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:8px 14px 14px;}
.wb-rc{border-radius:14px;overflow:hidden;cursor:pointer;transition:all .2s;
  background:linear-gradient(135deg,rgba(25,0,20,.97),rgba(10,0,12,.97));border:1px solid rgba(255,80,180,.2);}
.wb-rc:hover{border-color:rgba(255,80,180,.5);box-shadow:0 0 16px rgba(255,80,180,.2);}
.wb-rh{padding:10px 8px 8px;text-align:center;
  background:linear-gradient(135deg,rgba(255,0,150,.08),rgba(200,0,100,.04));border-bottom:1px solid rgba(255,80,180,.12);}
.wb-ri{font-size:24px;filter:drop-shadow(0 0 6px rgba(255,80,180,.6));}
.wb-rh-pct{font-size:13px;font-weight:900;color:#ff66bb;text-shadow:0 0 6px currentColor;margin-top:4px;}
.wb-rb{padding:8px;text-align:center;}
.wb-rb-cnt{font-size:16px;font-weight:900;color:#00e5ff;text-shadow:0 0 6px currentColor;}
.wb-rb-lbl{font-size:8px;color:#446688;letter-spacing:1px;margin-bottom:6px;}
.wb-rbtn{width:100%;padding:6px 0;border-radius:8px;font-size:9px;font-weight:800;text-align:center;
  background:rgba(255,80,180,.08);border:1px solid rgba(255,80,180,.25);color:#ff88cc;cursor:pointer;}
.wb-hist{padding:6px 14px 14px;display:flex;flex-direction:column;gap:6px;}
.wb-hc{border-radius:13px;overflow:hidden;background:rgba(8,0,18,.75);
  border:1px solid rgba(255,0,200,.12);border-left:2px solid rgba(255,0,200,.35);}
.wb-hh{display:flex;align-items:center;gap:10px;padding:10px 12px 6px;}
.wb-hi{font-size:20px;width:26px;text-align:center;flex-shrink:0;filter:drop-shadow(0 0 4px rgba(255,200,0,.5));}
.wb-hn{font-size:12px;font-weight:800;color:#ddd;flex:1;}
.wb-hm{display:flex;gap:8px;margin-top:2px;}
.wb-hd{font-size:9px;color:#445566;}
.wb-hdmg{font-size:9px;color:#ff4466;font-weight:700;}
.wb-hbdg{font-size:8px;font-weight:800;padding:3px 8px;border-radius:6px;letter-spacing:.5px;white-space:nowrap;flex-shrink:0;}
.wb-hbdg.f{background:rgba(0,229,255,.12);color:#00e5ff;border:1px solid rgba(0,229,255,.28);}
.wb-hbdg.p{background:rgba(255,200,0,.1);color:#ffcc44;border:1px solid rgba(255,200,0,.25);}
.wb-hlog{border-top:1px solid rgba(255,0,200,.08);padding:6px 12px 8px;display:flex;flex-direction:column;gap:3px;}
.wb-hl{font-size:9px;line-height:1.5;color:#6677aa;}
.wb-hl .wh{color:#cc88ff;font-weight:700;}.wb-hl .wd{color:#ff4466;font-weight:700;}
.wb-hl .wc{color:#ffcc00;font-weight:700;}.wb-hl .wg{color:#44ffaa;font-weight:700;}
.wb-prep{padding:20px 14px;text-align:center;}
.wb-prep-t{font-size:28px;font-weight:900;color:#ff00cc;text-shadow:0 0 16px currentColor;letter-spacing:2px;}
.wb-prep-s{font-size:11px;color:#8899aa;margin-top:8px;}
.wb-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:9999;
  background:rgba(10,0,25,.95);border:1px solid rgba(255,0,200,.5);border-radius:10px;
  padding:10px 18px;font-size:12px;font-weight:700;color:#fff;pointer-events:none;
  animation:wb-tin .25s ease-out forwards;box-shadow:0 0 20px rgba(255,0,200,.3);}
@keyframes wb-tin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
`;

  function _css() {
    if (document.getElementById(CSS_ID)) return;
    const s = document.createElement('style');
    s.id = CSS_ID; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function _esc(v) { return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _fmtCountdown(iso) {
    try {
      const d = Math.max(0, Math.floor((new Date(iso) - Date.now()) / 1000));
      const h = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60), s = d % 60;
      return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
                   : `${m}:${String(s).padStart(2,'0')}`;
    } catch(_) { return '—'; }
  }

  function _root() {
    let r = document.getElementById(ID);
    if (!r) { r = document.createElement('div'); r.id = ID; document.body.appendChild(r); }
    return r;
  }

  function _scrollMeta() {
    return {
      damage_25: { icon:'⚔️', name:'УРОН', val:'+25%', price:'60 💠' },
      power_10:  { icon:'🐲', name:'УРОН', val:'+10%', price:'30 💠' },
      defense_20:{ icon:'🛡️', name:'ЗАЩИТА', val:'+20%', price:'45 💠' },
      dodge_10:  { icon:'💨', name:'УВОРОТ', val:'+10%', price:'35 💠' },
      crit_10:   { icon:'🎯', name:'КРИТ', val:'+10%', price:'40 💠' },
    };
  }

  /* ── LOBBY HTML ── */
  function _lobbyHTML(s) {
    const inv = s.raid_scrolls_inv || {};
    const res = s.res_scrolls_inv || {};
    const sm = _scrollMeta();
    const bossName = s.next_boss_name || s.boss_name || 'Мировой Босс';
    const bossEmoji = s.next_boss_emoji || s.boss_emoji || '💀';
    const isRaidOpen = s.active || (s.prep_seconds_left > 0);

    const boostsHTML = Object.entries(sm).map(([id, m], i) => {
      const qty = inv[id] || 0;
      const wide = i === 4 ? ' wide' : '';
      const owned = wide ? `<div class="bc-ow" style="position:static;margin-left:auto;align-self:flex-start;">×${qty}</div>`
                        : `<div class="bc-ow">×${qty}</div>`;
      const ico = wide ? `<div class="bc-ic" style="margin-bottom:0">${m.icon}</div>` : `<div class="bc-ic">${m.icon}</div>`;
      const info = wide ? `<div style="flex:1"><div class="bc-nm">${m.name}</div><div class="bc-vl">${m.val}</div><div class="bc-pr">${m.price}</div></div>` : `<div class="bc-nm">${m.name}</div><div class="bc-vl">${m.val}</div><div class="bc-pr">${m.price}</div>`;
      return `<div class="wb-bc${wide}" data-act="buy-scroll" data-id="${id}">${owned}${ico}${info}</div>`;
    }).join('');

    const resItems = [
      { id:'res_30',  icon:'💊', pct:'30%', price:'500 🔥', qty: res.res_30 || 0, gold:true },
      { id:'res_60',  icon:'💉', pct:'60%', price:'40 💠',  qty: res.res_60 || 0 },
      { id:'res_100', icon:'✨', pct:'100%',price:'80 💠',  qty: res.res_100 || 0, gold2:true },
    ];
    const resHTML = resItems.map(r => `
      <div class="wb-rc" data-act="buy-res" data-id="${r.id}">
        <div class="wb-rh"${r.gold2?' style="border-color:rgba(255,200,0,.15);background:linear-gradient(135deg,rgba(255,200,0,.08),transparent)"':''}><div class="wb-ri"${r.gold2?' style="filter:drop-shadow(0 0 6px rgba(255,200,0,.7))"':''}>${r.icon}</div>
          <div class="wb-rh-pct"${r.gold2?' style="color:#ffdd44;text-shadow:0 0 6px rgba(255,200,0,.6)"':''}>${r.pct}</div></div>
        <div class="wb-rb"><div class="wb-rb-cnt"${r.gold2?' style="color:#ffdd44;text-shadow:0 0 6px rgba(255,200,0,.5)"':''}>${r.qty}</div>
          <div class="wb-rb-lbl">В ЗАПАСЕ</div>
          <div class="wb-rbtn"${r.gold2?' style="border-color:rgba(255,200,0,.25);color:#ffdd44;background:rgba(255,200,0,.07)"':''}>${r.price}</div></div>
      </div>`).join('');

    const topRows = (s.top || []).slice(0, 5).map((t, i) => `
      <div class="wb-hc">
        <div class="wb-hh"><div class="wb-hi">${['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</div>
          <div style="flex:1"><div class="wb-hn">${_esc(t.name || 'Игрок')}</div>
            <div class="wb-hm"><span class="wb-hd">Ур. ${t.level || '?'}</span><span class="wb-hdmg">⚔️ ${(t.damage||0).toLocaleString('ru')} урона</span></div>
          </div>
          <div class="wb-hbdg ${t.contribution >= 100 ? 'f' : 'p'}">${t.contribution >= 100 ? 'ВКЛАД 100%' : `${t.contribution||0}%`}</div>
        </div>
      </div>`).join('') || '<div style="padding:14px;text-align:center;font-size:11px;color:#445;letter-spacing:1px;">История пуста</div>';

    return `
<div class="wb-hdr">
  <div class="wb-back" data-act="back">‹</div>
  <div class="wb-hdr-icon">💀</div>
  <div><div class="wb-title">МИРОВОЙ БОСС</div><div class="wb-sub">ОБЩИЙ РЕЙД · КАЖДЫЕ 4 ЧАСА</div></div>
</div>
<div class="wb-hero">
  <div class="wb-hero-in">
    <div class="wb-hero-l">
      <div class="wb-badge">★ СЛЕДУЮЩИЙ ★</div>
      <div class="wb-bname">${bossEmoji} ${_esc(bossName)}</div>
      <div class="wb-cnt" id="wb-timer">${s.next_scheduled ? _fmtCountdown(s.next_scheduled) : '—'}</div>
      <div class="wb-insert">▶ INSERT COIN TO PLAY ◀</div>
    </div>
    <div class="wb-hero-r">
      <div class="wb-hero-aura"></div>
      <img class="wb-hero-img" src="bosses/boss3.png" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div class=wb-hero-emoji>${bossEmoji}</div>')"/>
    </div>
  </div>
</div>
<div class="wb-enter${isRaidOpen?' active':''}" data-act="enter">
  <div class="wb-enter-in"><div class="wb-enter-icon">⚔️</div>
    <div class="wb-enter-lbl">ВОЙТИ В РЕЙ<span class="wb-enter-sub">РЕЙД УЖЕ ИДЁТ · НАЖМИ!</span></div></div>
</div>
<div class="wb-row2">
  <div class="wb-btn" data-act="remind">${s.reminder_opt_in ? '🔕 Отключить напоминание' : '🔔 Напомнить за 5 мин'}</div>
  <div class="wb-btn yl" data-act="test">⚡ Тест</div>
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
<div class="wb-cp" data-cp="history"><div class="wb-hist">${topRows}</div></div>`;
  }

  function _buildInvChips(s) {
    const inv = s.raid_scrolls_inv || {};
    const res = s.res_scrolls_inv || {};
    const sm = _scrollMeta();
    const chips = [];
    for (const [id, m] of Object.entries(sm)) { const q = inv[id] || 0; if (q > 0) chips.push(`<div class="wb-chip">${m.icon} <span class="v">×${q}</span></div>`); }
    chips.push(`<div class="wb-chip">💊 <span class="v">×${res.res_30||0}</span></div>`);
    chips.push(`<div class="wb-chip">💉 <span class="v">×${res.res_60||0}</span></div>`);
    chips.push(`<div class="wb-chip">✨ <span class="v">×${res.res_100||0}</span></div>`);
    return chips.join('');
  }

  function _bind(root) {
    root.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (!el) {
        // category tabs
        const ct = e.target.closest('[data-cat]');
        if (ct) { root.querySelectorAll('.wb-cat').forEach(x=>x.classList.remove('on')); ct.classList.add('on');
          root.querySelectorAll('.wb-cp').forEach(x=>x.classList.remove('on'));
          root.querySelector(`[data-cp="${ct.dataset.cat}"]`)?.classList.add('on'); }
        return;
      }
      const act = el.dataset.act;
      if (act === 'back') { close(); _scene?.scene?.start?.('Menu',{returnTab:'more'}); }
      else if (act === 'remind') _scene?._toggleReminder?.();
      else if (act === 'test') get('/api/admin/wb_test_schedule').then(()=>_scene?._refresh?.()).catch(()=>{});
      else if (act === 'enter') { close(); _scene?.scene?.restart?.(); }
      else if (act === 'buy-scroll') _scene?._buyScroll?.(el.dataset.id);
      else if (act === 'buy-res') _scene?._buyResScroll?.(el.dataset.id);
    });
  }

  /* ── PUBLIC API ── */
  function render(scene, state) {
    _scene = scene;
    _css();
    const s = state || {};
    const root = _root();
    if (s.active || (s.prep_seconds_left > 0 && s.active)) {
      if (window.WBHtml._renderBattle) { window.WBHtml._renderBattle(root, s); return; }
    }
    if (s.active) { if (window.WBHtml._renderBattle) { window.WBHtml._renderBattle(root, s); return; } }
    if ((s.prep_seconds_left || 0) > 0) {
      root.innerHTML = `<div class="wb-hdr"><div class="wb-back" data-act="back">‹</div><div class="wb-hdr-icon">💀</div><div><div class="wb-title">МИРОВОЙ БОСС</div><div class="wb-sub">ПОДГОТОВКА К РЕЙДУ</div></div></div><div class="wb-prep"><div class="wb-prep-t" id="wb-prep-cnt">Старт через ${s.prep_seconds_left} сек</div><div class="wb-prep-s">Свитки применяй в слоты после первого удара</div></div>`;
      _bind(root);
      return;
    }
    root.innerHTML = _lobbyHTML(s);
    root.querySelector('#wb-inv-chips').innerHTML = _buildInvChips(s);
    _bind(root);
    _startTimer();
  }

  function _startTimer() {
    clearInterval(window._wbTimer);
    window._wbTimer = setInterval(() => {
      const el = document.getElementById('wb-timer'); if (!el) { clearInterval(window._wbTimer); return; }
      // find next scheduled from scene state
      const ns = _scene?._state?.next_scheduled;
      if (ns) el.textContent = _fmtCountdown(ns);
    }, 1000);
  }

  function toast(msg) {
    document.querySelectorAll('.wb-toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'wb-toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
  }

  function close() {
    clearInterval(window._wbTimer);
    document.getElementById(ID)?.remove();
  }

  return { render, toast, close, _log, _wlog };
})();
