/* ============================================================
   BotBattleHtml — HTML-overlay для PvE «Бой с ботом» (Cyberpunk).
   Внедрение визуала из bot_battle_redesign.html в реальную игру,
   но БЕЗ backdrop-filter (тяжело для мобильного WebView).
     mount(scene) / unmount() — двойной вызов безопасен
     update(b) / setTimer(s) / resetChoices() / showWait(msg) / hitFx(side)
   Phaser продолжает обрабатывать WS, timer, scene transitions.
   ============================================================ */

const BotBattleHtml = (() => {
  let scene = null, root = null, mounted = false, clickHandler = null;
  let elP1Hp, elP2Hp, elP1Bar, elP2Bar, elP2Name, elTimer, elWait;
  let attackBtns = {}, defenseBtns = {};
  let selectedAttack = null, selectedDefense = null;

  function _injectCss() {
    if (document.getElementById('bb-css')) return;
    const s = document.createElement('style');
    s.id = 'bb-css';
    s.textContent = `
      #bb-root{position:fixed;background:#03050f;color:#fff;z-index:200;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden;}
      #bb-root *{box-sizing:border-box;}
      #bb-root .bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:brightness(.78) saturate(1.05);pointer-events:none;}
      #bb-root .bg::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.4) 0%,rgba(0,0,0,.05) 35%,rgba(0,0,0,.05) 70%,rgba(0,0,0,.55) 100%);}
      #bb-root .hp-row{position:absolute;top:8px;left:8px;right:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;z-index:10;pointer-events:none;}
      #bb-root .hp-block{padding:5px 8px;border-radius:7px;background:rgba(8,8,18,.86);border:1px solid rgba(0,216,255,.3);}
      #bb-root .hp-block.opp{border-color:rgba(255,0,112,.42);}
      #bb-root .hp-name{font-size:10px;font-weight:800;letter-spacing:.8px;color:#00ffe0;text-shadow:0 0 8px rgba(0,216,255,.6);font-family:"Consolas",monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      #bb-root .hp-block.opp .hp-name{color:#ff3c80;text-shadow:0 0 8px rgba(255,0,112,.6);}
      #bb-root .hp-num{font-size:9px;opacity:.75;text-align:right;margin-top:2px;font-family:"Consolas",monospace;}
      #bb-root .hp-bar{height:8px;border-radius:4px;background:rgba(0,0,0,.7);overflow:hidden;margin-top:3px;box-shadow:inset 0 1px 2px rgba(0,0,0,.7);}
      #bb-root .hp-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#00ffe0,#5fb8ff);box-shadow:0 0 10px #00d8ff,inset 0 0 6px rgba(255,255,255,.4);transition:width .5s ease;}
      #bb-root .hp-block.opp .hp-fill{background:linear-gradient(90deg,#ff0070,#ff5fa0);box-shadow:0 0 10px #ff0070,inset 0 0 6px rgba(255,255,255,.4);}
      #bb-root .timer{position:absolute;top:104px;right:14px;font-size:14px;font-family:"Consolas",monospace;color:#fff;z-index:9;pointer-events:none;background:rgba(2,5,18,.6);padding:1px 6px;border-radius:4px;border:1px solid rgba(0,216,255,.3);}
      #bb-root .fighter{position:absolute;bottom:22%;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;}
      #bb-root .player{left:-2%;width:38%;height:48%;}
      #bb-root .boss{right:-3%;width:62%;height:78%;}
      #bb-root .fighter img{width:100%;height:100%;object-fit:contain;object-position:bottom;
        -webkit-mask-image:linear-gradient(to top,transparent 0%,#000 8%);mask-image:linear-gradient(to top,transparent 0%,#000 8%);
        -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-size:100% 100%;mask-size:100% 100%;
        transform-origin:50% 100%;}
      #bb-root .player img{transform:scaleX(-1);}
      #bb-root .shadow{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:78%;height:12px;background:radial-gradient(ellipse at center,rgba(0,0,0,.78) 0%,transparent 70%);pointer-events:none;}
      #bb-root .vs{position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);z-index:8;font-size:64px;font-weight:900;color:#fff;font-family:"Consolas",monospace;letter-spacing:6px;
        text-shadow:2px 0 0 #00ffe0,-2px 0 0 #ff0070,0 0 14px #ff0070,0 0 18px #00d8ff,0 4px 10px rgba(0,0,0,.95);
        animation:bbVsPulse 1.6s ease-in-out infinite;pointer-events:none;}
      @keyframes bbVsPulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.1)}}
      @keyframes bbBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
      #bb-root .boss > img{animation:bbBreath 3.4s ease-in-out infinite;}
      @keyframes bbHit{0%{filter:brightness(2.3) saturate(1.4)}100%{filter:brightness(1)}}
      #bb-root .hit > img{animation:bbHit .4s ease-out;}
      #bb-root .holo{position:absolute;left:0;right:0;bottom:0;z-index:9;padding:8px 10px 9px;
        background:rgba(2,5,20,.94);border-top:1px solid #00d8ff;
        box-shadow:inset 0 1px 0 rgba(0,216,255,.35),0 -2px 12px rgba(0,216,255,.15);display:flex;flex-direction:column;gap:5px;}
      #bb-root .row{display:flex;align-items:center;gap:7px;}
      #bb-root .row-lbl{flex:0 0 auto;font-size:8px;letter-spacing:1.8px;font-weight:800;text-transform:uppercase;width:54px;font-family:"Consolas",monospace;}
      #bb-root .icon-row{flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;}
      #bb-root .icon-btn{padding:4px 0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;background:rgba(0,0,0,.45);user-select:none;}
      #bb-root .atk .icon-btn{border:1px solid rgba(255,80,160,.6);}
      #bb-root .def .icon-btn{border:1px solid rgba(80,160,255,.6);}
      #bb-root .atk .icon-btn.sel{background:rgba(255,80,160,.32);border-color:#ff5fa0;box-shadow:0 0 14px rgba(255,80,160,.7);}
      #bb-root .def .icon-btn.sel{background:rgba(80,160,255,.32);border-color:#5fa0ff;box-shadow:0 0 14px rgba(80,160,255,.65);}
      #bb-root .atk .row-lbl{color:#ff8ac0;}
      #bb-root .def .row-lbl{color:#8ab8ff;}
      #bb-root .random-btn{margin-top:2px;padding:5px;text-align:center;font-size:9.5px;font-weight:700;letter-spacing:2.5px;border-radius:5px;cursor:pointer;
        background:linear-gradient(180deg,#0a0518,#1a0a3a);border:1px solid rgba(255,0,112,.6);color:#ff5fa0;
        font-family:"Consolas",monospace;text-transform:uppercase;user-select:none;}
      #bb-root .wait{position:absolute;left:0;right:0;top:55%;text-align:center;color:#ffc83c;font-size:13px;font-weight:700;z-index:9;pointer-events:none;}
    `;
    document.head.appendChild(s);
  }

  const _pkey = () => { const t=(window.State?.player?.warrior_type||'crit')+''; return ['tank','agile','crit'].includes(t)?`warrior_${t}`:'warrior_crit'; };

  function _renderShell(b, skinId) {
    const ext = skinId <= 25 ? 'png' : 'jpg';
    const bgUrl = skinId ? `bot_skins/bg/${skinId}.${ext}` : '';
    const skinUrl = skinId ? `bot_skins/${skinId}.png` : '';
    const flipBoss = skinId && typeof BotSkinPicker !== 'undefined' && BotSkinPicker.shouldFlip(skinId);
    const meName = String(window.State?.player?.username || 'Вы').toUpperCase();
    const oppName = String(b.opp_name || 'Соперник').toUpperCase();
    const ic = k => k === 'HEAD' ? '🪖' : k === 'TORSO' ? '🛡' : '👢';
    const btn = (s, k) => `<div class="icon-btn" data-side="${s}" data-key="${k}"><span>${ic(k)}</span></div>`;
    const myPct  = b.my_max_hp  > 0 ? Math.max(0, Math.min(100, b.my_hp  / b.my_max_hp  * 100)) : 0;
    const oppPct = b.opp_max_hp > 0 ? Math.max(0, Math.min(100, b.opp_hp / b.opp_max_hp * 100)) : 0;
    root.innerHTML = `
      <div class="bg" style="background-image:url('${bgUrl}')"></div>
      <div class="hp-row">
        <div class="hp-block"><div class="hp-name">${meName}</div>
          <div class="hp-bar"><div class="hp-fill" id="bb-p1b" style="width:${myPct}%"></div></div>
          <div class="hp-num" id="bb-p1h">${b.my_hp || 0} / ${b.my_max_hp || 0}</div></div>
        <div class="hp-block opp"><div class="hp-name" id="bb-p2n">${oppName}</div>
          <div class="hp-bar"><div class="hp-fill" id="bb-p2b" style="width:${oppPct}%"></div></div>
          <div class="hp-num" id="bb-p2h">${b.opp_hp || 0} / ${b.opp_max_hp || 0}</div></div>
      </div>
      <div class="timer" id="bb-timer">15</div>
      <div class="fighter player" id="bb-p1">${skinId ? `<img src="warriors/${_pkey()}.png">` : ''}<div class="shadow"></div></div>
      <div class="vs">VS</div>
      <div class="fighter boss" id="bb-p2">${skinId ? `<img src="${skinUrl}"${flipBoss ? '' : ' style="transform:scaleX(-1)"'}>` : ''}<div class="shadow"></div></div>
      <div class="holo">
        <div class="row atk"><div class="row-lbl">АТАКА</div><div class="icon-row">${['HEAD','TORSO','LEGS'].map(k => btn('atk', k)).join('')}</div></div>
        <div class="row def"><div class="row-lbl">ЗАЩИТА</div><div class="icon-row">${['HEAD','TORSO','LEGS'].map(k => btn('def', k)).join('')}</div></div>
        <div class="random-btn" id="bb-rand">🎲 Случайный ход</div>
      </div>
      <div class="wait" id="bb-wait" style="display:none"></div>`;
    elP1Hp = root.querySelector('#bb-p1h'); elP2Hp = root.querySelector('#bb-p2h');
    elP1Bar = root.querySelector('#bb-p1b'); elP2Bar = root.querySelector('#bb-p2b');
    elP2Name = root.querySelector('#bb-p2n');
    elTimer = root.querySelector('#bb-timer');
    elWait = root.querySelector('#bb-wait');
    if (typeof BotBattleLog !== 'undefined') BotBattleLog.attach(root);
    attackBtns = {}; defenseBtns = {};
    root.querySelectorAll('.atk .icon-btn').forEach(b => attackBtns[b.dataset.key] = b);
    root.querySelectorAll('.def .icon-btn').forEach(b => defenseBtns[b.dataset.key] = b);
  }

  function _onClick(e) {
    if (!mounted || !scene) return;
    const btn = e.target.closest('.icon-btn');
    if (btn) {
      const side = btn.dataset.side, key = btn.dataset.key;
      if (side === 'atk') selectedAttack = key; else selectedDefense = key;
      _refresh();
      if (selectedAttack && selectedDefense && scene._submitChoice) {
        scene._selAttack = selectedAttack; scene._selDefense = selectedDefense;
        try { scene._submitChoice(); } catch(_){}
      }
      return;
    }
    if (e.target.closest('#bb-rand') && scene._onAuto) { try { scene._onAuto(); } catch(_){} }
  }

  function _refresh() {
    Object.values(attackBtns).forEach(b => b.classList.toggle('sel', b.dataset.key === selectedAttack));
    Object.values(defenseBtns).forEach(b => b.classList.toggle('sel', b.dataset.key === selectedDefense));
  }

  return {
    isMounted: () => mounted,
    mount(s) {
      if (mounted) return;
      if (!s || !s.game || !s.game.canvas) return;
      scene = s; mounted = true; _injectCss();
      const skinId = s._currentBotSkinId || (typeof BotSkinPicker !== 'undefined' ? BotSkinPicker.pick() : null);
      s._currentBotSkinId = skinId;
      root = document.createElement('div'); root.id = 'bb-root';
      const r = s.game.canvas.getBoundingClientRect();
      Object.assign(root.style, { left:r.left+'px', top:r.top+'px', width:r.width+'px', height:r.height+'px' });
      document.body.appendChild(root);
      _renderShell(window.State?.battle || {}, skinId);
      clickHandler = _onClick;
      root.addEventListener('click', clickHandler);
    },
    update(b) {
      if (!mounted || !b || !root) return;
      try {
        if (elP1Hp)  elP1Hp.textContent = `${b.my_hp || 0} / ${b.my_max_hp || 0}`;
        if (elP2Hp)  elP2Hp.textContent = `${b.opp_hp || 0} / ${b.opp_max_hp || 0}`;
        if (elP1Bar) elP1Bar.style.width = (b.my_max_hp  > 0 ? b.my_hp  / b.my_max_hp  * 100 : 0) + '%';
        if (elP2Bar) elP2Bar.style.width = (b.opp_max_hp > 0 ? b.opp_hp / b.opp_max_hp * 100 : 0) + '%';
        if (b.opp_name && elP2Name) elP2Name.textContent = String(b.opp_name).toUpperCase();
        if (typeof BotBattleLog !== 'undefined') BotBattleLog.update(b.combat_log);
      } catch(_) {}
    },
    setTimer(s) { if (mounted && elTimer) elTimer.textContent = String(Math.max(0, s|0)); },
    resetChoices() {
      selectedAttack = null; selectedDefense = null;
      if (mounted) { _refresh(); if (elWait) elWait.style.display = 'none'; }
    },
    showWait(msg) {
      if (!mounted || !elWait) return;
      elWait.textContent = msg || ''; elWait.style.display = msg ? 'block' : 'none';
    },
    hitFx(side) {
      if (!mounted || !root) return;
      const el = root.querySelector(side === 'opp' ? '#bb-p2' : '#bb-p1');
      if (!el) return;
      el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
    },
    unmount() {
      if (!mounted) return;
      try { if (root && clickHandler) root.removeEventListener('click', clickHandler); } catch(_) {}
      try { root && root.parentNode && root.parentNode.removeChild(root); } catch(_) {}
      root = null; scene = null; mounted = false; clickHandler = null;
      attackBtns = {}; defenseBtns = {};
      selectedAttack = null; selectedDefense = null;
      elP1Hp = elP2Hp = elP1Bar = elP2Bar = elP2Name = elTimer = elWait = null;
      try { if (typeof BotBattleLog !== 'undefined') BotBattleLog.reset(); } catch(_) {}
    },
  };
})();

if (typeof window !== 'undefined') window.BotBattleHtml = BotBattleHtml;
