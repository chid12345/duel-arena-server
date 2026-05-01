/* ============================================================
   BattleSelectHTML — оверлей «Выбери бой» (Cyberpunk HUD)
   Логика не тронута. Только визуальный слой переработан.
   ============================================================ */
(() => {
function _fitToCanvas(root) {
  try {
    const c = document.querySelector('canvas');
    if (!c) return;
    const r = c.getBoundingClientRect();
    const tabBarH = Math.round(r.height * 76 / (c.height || 700));
    root.style.top = r.top + 'px'; root.style.left = r.left + 'px';
    root.style.width = r.width + 'px'; root.style.right = 'auto';
    root.style.bottom = 'auto';
    root.style.height = Math.max(0, r.height - tabBarH) + 'px';
  } catch(_) {}
}

const CSS = `
@keyframes bsFadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes bsShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
@keyframes bsGlitch{0%,90%,100%{opacity:0;transform:translateX(0)}92%{opacity:.6;transform:translateX(-3px)}94%{opacity:.6;transform:translateX(2px)}96%{opacity:0}}
@keyframes bsFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes bsBlink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes bsTicker{from{transform:translateX(110%)}to{transform:translateX(-100%)}}
@keyframes bsShimmer{0%{left:-120%}100%{left:180%}}

.bs-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:stretch;justify-content:center;background:rgba(2,5,15,.98);animation:bsFadeIn .22s cubic-bezier(.22,1,.36,1)}
.bs-panel{width:100%;max-width:430px;height:100%;display:flex;flex-direction:column;background:#030810;overflow:hidden;position:relative;
  background-image:repeating-linear-gradient(0deg,transparent 0px,transparent 2px,rgba(0,245,255,.011) 2px,rgba(0,245,255,.011) 4px)}

.bs-cn{position:absolute;width:20px;height:20px;pointer-events:none;z-index:3}
.bs-cn-tl{top:0;left:0;border-top:2px solid #00f5ff;border-left:2px solid #00f5ff;box-shadow:0 0 10px #00f5ff40}
.bs-cn-tr{top:0;right:0;border-top:2px solid #00f5ff;border-right:2px solid #00f5ff;box-shadow:0 0 10px #00f5ff40}
.bs-cn-bl{bottom:0;left:0;border-bottom:2px solid #00f5ff;border-left:2px solid #00f5ff;box-shadow:0 0 10px #00f5ff40}
.bs-cn-br{bottom:0;right:0;border-bottom:2px solid #00f5ff;border-right:2px solid #00f5ff;box-shadow:0 0 10px #00f5ff40}

.bs-head{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px;border-bottom:1px solid rgba(0,245,255,.1)}
.bs-head::after{content:'';position:absolute;bottom:-1px;left:0;width:34%;height:1px;background:#00f5ff;box-shadow:0 0 10px #00f5ff}
.bs-sys{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(0,245,255,.38);letter-spacing:2px;margin-bottom:4px}
.bs-title{font-family:'Rajdhani','Share Tech Mono',monospace;font-size:20px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;position:relative}
.bs-title span{color:#00f5ff;text-shadow:0 0 14px #00f5ff}
.bs-title::before{content:attr(data-t);position:absolute;left:2px;top:0;color:#ff2d78;clip-path:polygon(0 30%,100% 30%,100% 52%,0 52%);opacity:.55;animation:bsGlitch 4s steps(1) infinite;font:inherit}
.bs-meta{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(0,245,255,.32);margin-top:3px;display:flex;align-items:center;gap:7px}
.bs-odot{width:5px;height:5px;border-radius:50%;background:#39ff6e;box-shadow:0 0 7px #39ff6e;animation:bsBlink .9s ease infinite;display:inline-block;flex-shrink:0}
.bs-close{width:32px;height:32px;background:rgba(255,45,120,.1);border:1px solid rgba(255,45,120,.38);color:#ff2d78;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px);transition:background .15s}
.bs-close:active{background:rgba(255,45,120,.22)}

.bs-ticker{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(0,245,255,.28);padding:5px 0;border-bottom:1px solid rgba(0,245,255,.06);white-space:nowrap;overflow:hidden;letter-spacing:1px}
.bs-ticker-i{display:inline-block;animation:bsTicker 20s linear infinite}

.bs-grid{flex:1;overflow-y:auto;padding:10px 13px 18px;display:flex;flex-direction:column;gap:7px;scrollbar-width:thin;scrollbar-color:rgba(0,200,160,.25) transparent}
.bs-grid::-webkit-scrollbar{width:2px}.bs-grid::-webkit-scrollbar-thumb{background:rgba(0,200,160,.3)}

.bs-sec{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;color:rgba(0,245,255,.24);display:flex;align-items:center;gap:8px;margin-top:2px}
.bs-sec::after{content:'';flex:1;height:1px;background:rgba(0,245,255,.07)}

.bs-card{position:relative;background:rgba(5,14,32,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.07);border-left:3px solid var(--acc,#00f5ff);cursor:pointer;overflow:hidden;transition:transform .15s,box-shadow .15s;-webkit-tap-highlight-color:transparent}
.bs-card::before{content:'';position:absolute;left:3px;top:0;right:0;height:1px;background:linear-gradient(90deg,rgba(var(--ar,0,245,255),.32),transparent 55%);pointer-events:none}
.bs-card:active{transform:scale(.975)}
.bs-card.bs-blocked{opacity:.25;filter:grayscale(.7);pointer-events:none}
.bs-card.bs-blocked:active{transform:none}

.bs-hero{--acc:#00f5ff;--ar:0,245,255;border-radius:4px;padding:17px 17px 15px 19px;border-color:rgba(0,245,255,.18);box-shadow:0 0 32px rgba(0,245,255,.05)}
.bs-hero::after{content:'';position:absolute;top:0;left:-120%;width:55%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.045),transparent);animation:bsShimmer 3.5s ease infinite;pointer-events:none}
.bs-tc{position:absolute;width:12px;height:12px;pointer-events:none}
.bs-tc-tl{top:7px;left:7px;border-top:1.5px solid #00f5ff;border-left:1.5px solid #00f5ff}
.bs-tc-tr{top:7px;right:7px;border-top:1.5px solid #00f5ff;border-right:1.5px solid #00f5ff}
.bs-tc-bl{bottom:7px;left:7px;border-bottom:1.5px solid #00f5ff;border-left:1.5px solid #00f5ff}
.bs-tc-br{bottom:7px;right:7px;border-bottom:1.5px solid #00f5ff;border-right:1.5px solid #00f5ff}
.bs-hot{display:inline-flex;align-items:center;gap:4px;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:1.5px;color:#ffe600;padding:3px 8px;border:1px solid rgba(255,230,0,.28);background:rgba(255,230,0,.07);clip-path:polygon(4px 0,100% 0,100% 100%,0 100%,0 4px);margin-bottom:11px}
.bs-hbody{display:flex;gap:12px;align-items:flex-start}
.bs-hico{font-size:42px;line-height:1;flex-shrink:0;filter:drop-shadow(0 0 14px rgba(0,245,255,.6));animation:bsFloat 3s ease-in-out infinite}
.bs-hdata{flex:1}
.bs-hid{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(0,245,255,.45);letter-spacing:1.5px;margin-bottom:3px}
.bs-hname{font-family:'Rajdhani','Share Tech Mono',monospace;font-size:18px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
.bs-hdesc{font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(0,245,255,.4);margin-bottom:11px;letter-spacing:.4px}
.bs-chips{display:flex;gap:5px;flex-wrap:wrap}
.bs-chip{font-family:'Share Tech Mono',monospace;font-size:10px;padding:3px 8px;border:1px solid;clip-path:polygon(4px 0,100% 0,100% 100%,0 100%,0 4px)}
.chip-y{color:#ffe600;border-color:rgba(255,230,0,.3);background:rgba(255,230,0,.07)}
.chip-c{color:#00f5ff;border-color:rgba(0,245,255,.25);background:rgba(0,245,255,.05)}
.chip-p{color:#bf5fff;border-color:rgba(191,95,255,.28);background:rgba(191,95,255,.06)}

.bs-row{display:flex;gap:7px}
.bs-row .bs-mid{flex:1}
.bs-mid{border-radius:4px;padding:13px 13px 12px 17px}
.bs-tower{--acc:#bf5fff;--ar:191,95,255;border-color:rgba(191,95,255,.18)}
.bs-natisk{--acc:#ff6200;--ar:255,98,0;border-color:rgba(255,98,0,.18)}
.bs-mico{font-size:26px;display:block;margin-bottom:7px;filter:drop-shadow(0 0 9px var(--acc))}
.bs-mbadge{font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:1.5px;color:var(--acc);padding:2px 6px;border:1px solid rgba(var(--ar),.3);background:rgba(var(--ar),.07);display:inline-block;margin-bottom:6px;clip-path:polygon(3px 0,100% 0,100% 100%,0 100%,0 3px)}
.bs-mname{font-family:'Rajdhani','Share Tech Mono',monospace;font-size:14px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}
.bs-mdesc{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(255,255,255,.3);letter-spacing:.4px}

.bs-crow{display:flex;gap:7px}
.bs-crow .bs-ccard{flex:1}
.bs-ccard{border-radius:4px;padding:11px 12px 11px 16px;display:flex;flex-direction:column;gap:5px}
.bs-challenge{--acc:#ff2d78;--ar:255,45,120;border-color:rgba(255,45,120,.18)}
.bs-incoming{--acc:#3b82f6;--ar:59,130,246;border-color:rgba(59,130,246,.18)}
.bs-crow-top{display:flex;align-items:center;justify-content:space-between}
.bs-cico{font-size:21px;filter:drop-shadow(0 0 7px var(--acc))}
.bs-cnotif{font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:1px;color:var(--acc);padding:2px 5px;border:1px solid rgba(var(--ar),.35);background:rgba(var(--ar),.1)}
.bs-cname{font-family:'Rajdhani','Share Tech Mono',monospace;font-size:13px;font-weight:700;color:#fff;letter-spacing:.8px;text-transform:uppercase}
.bs-cdesc{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(255,255,255,.28);letter-spacing:.4px}

.bs-bot{--acc:#39ff6e;--ar:57,255,110;border-radius:4px;border-color:rgba(57,255,110,.13);padding:12px 15px 12px 19px;display:flex;align-items:center;gap:13px}
.bs-bico{font-size:24px;flex-shrink:0;filter:drop-shadow(0 0 8px rgba(57,255,110,.5))}
.bs-binfo{flex:1}
.bs-bname{font-family:'Rajdhani','Share Tech Mono',monospace;font-size:14px;font-weight:700;color:rgba(255,255,255,.48);letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}
.bs-bdesc{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(255,255,255,.2);letter-spacing:.4px}
.bs-bbadge{font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:1px;color:#39ff6e;padding:3px 7px;border:1px solid rgba(57,255,110,.28);background:rgba(57,255,110,.07);clip-path:polygon(4px 0,100% 0,100% 100%,0 100%,0 4px)}

.bs-hpwarn{border-radius:4px;padding:10px 13px 10px 17px;background:rgba(255,45,120,.06);border:1px solid rgba(255,45,120,.28);border-left:3px solid #ff2d78;font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(255,150,170,.8);letter-spacing:.4px;display:flex;align-items:center;gap:8px;margin-bottom:3px}
.bs-wico{font-size:17px;flex-shrink:0}

.bs-foot{padding:6px 18px;border-top:1px solid rgba(0,245,255,.06);display:flex;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:1px;color:rgba(0,245,255,.18)}
.bs-live{color:#39ff6e}
`;

let _cssOn = false;
function _injectCSS() {
  if (_cssOn) return;
  if (!document.getElementById('bs-fonts')) {
    const l = document.createElement('link');
    l.id = 'bs-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@700&display=swap';
    document.head.appendChild(l);
  }
  const s = document.createElement('style');
  s.id = 'bs-css'; s.textContent = CSS;
  document.head.appendChild(s);
  _cssOn = true;
}

function _close() {
  const el = document.getElementById('bs-overlay');
  if (el) el.remove();
}

function open(scene) {
  _injectCSS(); _close();
  const guard = document.createElement('div');
  guard.style.cssText = 'position:fixed;inset:0;z-index:10000;background:transparent;touch-action:none;';
  ['click','pointerdown','pointerup','touchstart','touchend','mousedown','mouseup'].forEach(ev =>
    guard.addEventListener(ev, e => { e.stopPropagation(); e.preventDefault(); }, true));
  document.body.appendChild(guard);
  setTimeout(() => { try { guard.remove(); } catch(_) {} }, 350);

  const p = (typeof State !== 'undefined' && State.player) ? State.player : {};
  const lowHp = (p.hp_pct || 0) < 15;
  const bl = lowHp ? ' bs-blocked' : '';

  const wrap = document.createElement('div');
  wrap.id = 'bs-overlay'; wrap.className = 'bs-overlay';
  wrap.innerHTML = `
  <div class="bs-panel">
    <div class="bs-cn bs-cn-tl"></div><div class="bs-cn bs-cn-tr"></div>
    <div class="bs-cn bs-cn-bl"></div><div class="bs-cn bs-cn-br"></div>
    <div class="bs-head">
      <div>
        <div class="bs-sys">ARENA.SYS // COMBAT_MODULE</div>
        <div class="bs-title" data-t="⚔ ВЫБЕРИ БОЙ"><span>⚔</span> ВЫБЕРИ БОЙ</div>
        <div class="bs-meta"><span class="bs-odot"></span><span>В СЕТИ</span><span>//</span><span>СЕРВЕР: ACTIVE</span></div>
      </div>
      <button class="bs-close" id="bs-close">✕</button>
    </div>
    <div class="bs-ticker"><span class="bs-ticker-i">▶ ARENA CORE ONLINE &nbsp;//&nbsp; RANKED QUEUE ACTIVE &nbsp;//&nbsp; SEASON 4: 14 DAYS LEFT &nbsp;//&nbsp; WAVE ASSAULT: RUNNING &nbsp;//&nbsp;</span></div>
    <div class="bs-grid">
      ${lowHp ? '<div class="bs-hpwarn" id="bs-hpwarn"><span class="bs-wico">⚠</span> HP &lt; 15% — БОЕВЫЕ ПРОТОКОЛЫ ЗАБЛОКИРОВАНЫ. НУЖНО ЗЕЛЬЕ.</div>' : ''}
      <div class="bs-sec">// ПРИОРИТЕТНЫЙ ПРОТОКОЛ</div>
      <div class="bs-card bs-hero${bl}" data-act="pvp">
        <div class="bs-tc bs-tc-tl"></div><div class="bs-tc bs-tc-tr"></div>
        <div class="bs-tc bs-tc-bl"></div><div class="bs-tc bs-tc-br"></div>
        <div class="bs-hot">🔴 &nbsp;ГОРЯЧО // В ПОИСКЕ</div>
        <div class="bs-hbody">
          <div class="bs-hico">⚔️</div>
          <div class="bs-hdata">
            <div class="bs-hid">[ SYS-01 ] // СЕТЕВОЙ СКАН: PvP</div>
            <div class="bs-hname">Поиск соперника</div>
            <div class="bs-hdesc">// Живой противник · Рейтинговый бой</div>
            <div class="bs-chips">
              <div class="bs-chip chip-y">🏆 +РЕЙТИНГ</div>
              <div class="bs-chip chip-c">💰 +30%</div>
              <div class="bs-chip chip-p">⭐ +30% XP</div>
            </div>
          </div>
        </div>
      </div>
      <div class="bs-sec">// БОЕВЫЕ РЕЖИМЫ</div>
      <div class="bs-row">
        <div class="bs-card bs-mid bs-tower${bl}" data-act="tower">
          <span class="bs-mico">🗿</span>
          <div class="bs-mbadge">ПРОГРЕССИЯ</div>
          <div class="bs-mname">Башня Титанов</div>
          <div class="bs-mdesc">// PvE · Уровни · Редкие модули</div>
        </div>
        <div class="bs-card bs-mid bs-natisk${bl}" data-act="natisk">
          <span class="bs-mico">🔥</span>
          <div class="bs-mbadge">ВЫЖИВАНИЕ</div>
          <div class="bs-mname">Натиск</div>
          <div class="bs-mdesc">// Волны врагов · Арена</div>
        </div>
      </div>
      <div class="bs-sec">// ПРЯМЫЕ ВЫЗОВЫ</div>
      <div class="bs-crow">
        <div class="bs-card bs-ccard bs-challenge" data-act="challenge">
          <div class="bs-crow-top"><div class="bs-cico">🎯</div><div class="bs-cnotif">PvP</div></div>
          <div class="bs-cname">Вызов по нику</div>
          <div class="bs-cdesc">// Прямая дуэль 1:1</div>
        </div>
        <div class="bs-card bs-ccard bs-incoming" data-act="incoming">
          <div class="bs-crow-top"><div class="bs-cico">📨</div><div class="bs-cnotif">НОВЫЕ</div></div>
          <div class="bs-cname">Мои вызовы</div>
          <div class="bs-cdesc">// Исходящие · Ожидание</div>
        </div>
      </div>
      <div class="bs-sec">// ТРЕНИРОВКА</div>
      <div class="bs-card bs-bot${bl}" data-act="bot">
        <div class="bs-bico">🤖</div>
        <div class="bs-binfo">
          <div class="bs-bname">Бой с ботом</div>
          <div class="bs-bdesc">// Практика · Без рейтинга · +Золото</div>
        </div>
        <div class="bs-bbadge">SAFE_MODE</div>
      </div>
    </div>
    <div class="bs-foot"><span>ARENA_NET // ENCRYPTED</span><span class="bs-live">● LIVE</span></div>
  </div>`;
  document.body.appendChild(wrap);
  _fitToCanvas(wrap);

  const COMBAT_ACTS = new Set(['pvp','tower','natisk','bot']);
  const _shakeWarn = () => {
    const w = document.getElementById('bs-hpwarn'); if (!w) return;
    w.style.animation = 'none'; w.offsetHeight;
    w.style.animation = 'bsShake .35s ease';
    w.style.background = 'rgba(255,45,120,.18)';
    if (typeof tg !== 'undefined') tg?.HapticFeedback?.notificationOccurred('error');
  };

  let _dispatched = false;
  const dispatch = (act) => {
    if (_dispatched) return;
    if (COMBAT_ACTS.has(act)) {
      const sp = (typeof State !== 'undefined' && State.player) ? State.player : null;
      if (!sp || (sp.hp_pct || 0) < 15) { _shakeWarn(); return; }
    }
    _dispatched = true;
    if (typeof tg !== 'undefined') tg?.HapticFeedback?.impactOccurred('medium');
    const g = document.createElement('div');
    g.style.cssText = 'position:fixed;inset:0;z-index:10000;background:transparent;touch-action:none;';
    ['click','pointerdown','pointerup','touchstart','touchend','mousedown','mouseup'].forEach(ev =>
      g.addEventListener(ev, e => { e.stopPropagation(); e.preventDefault(); }, true));
    document.body.appendChild(g);
    setTimeout(() => { try { g.remove(); } catch(_) {} }, 700);
    _close();
    try {
      if (act === 'pvp')            scene._onFight?.();
      else if (act === 'tower')     scene._onTitanFight?.();
      else if (act === 'natisk')    scene.scene.start('Natisk', {});
      else if (act === 'bot')       scene._onBotFight?.();
      else if (act === 'challenge') scene._onChallengeByNick?.();
      else if (act === 'incoming')  scene._showOutgoingChallenges?.();
    } catch (e) { console.warn('[BattleSelect] dispatch failed:', act, e); }
  };

  const _onCard = (ev) => {
    const card = ev.target.closest('.bs-card');
    if (!card || !card.dataset.act) return;
    ev.stopPropagation(); ev.preventDefault();
    if (card.classList.contains('bs-blocked')) { _shakeWarn(); return; }
    dispatch(card.dataset.act);
  };
  wrap.addEventListener('pointerdown', _onCard);
  wrap.addEventListener('touchstart', _onCard, { passive: false });
  wrap.addEventListener('click', _onCard);

  document.getElementById('bs-close').onclick = (e) => {
    e.stopPropagation(); e.preventDefault();
    if (typeof tg !== 'undefined') tg?.HapticFeedback?.selectionChanged();
    const g = document.createElement('div');
    g.style.cssText = 'position:fixed;inset:0;z-index:10000;background:transparent;touch-action:none;';
    ['click','pointerdown','pointerup','touchstart','touchend','mousedown','mouseup'].forEach(ev =>
      g.addEventListener(ev, e2 => { e2.stopPropagation(); e2.preventDefault(); }, true));
    document.body.appendChild(g);
    setTimeout(() => { try { g.remove(); } catch(_) {} }, 500);
    _close();
  };
}

window.BattleSelectHTML = { open, close: _close };
})();
