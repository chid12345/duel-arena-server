/* ============================================================
   BattleSelectHTML — оверлей «Выбери бой» (PvP/Башня/Натиск/Бот/Вызов)
   Заменяет хрупкий Phaser-путь _switchTab('battle') на надёжный HTML.
   Открывается из профиля по тапу «В БОЙ». Каждая карточка → свой режим.
   ============================================================ */
(() => {
function _fitToCanvas(root) {
  try {
    const c = document.querySelector('canvas');
    if (!c) return;
    const r = c.getBoundingClientRect();
    const tabBarH = Math.round(r.height * 76 / (c.height || 700));
    root.style.top    = r.top  + 'px';
    root.style.left   = r.left + 'px';
    root.style.width  = r.width + 'px';
    root.style.right  = 'auto';
    root.style.bottom = 'auto';
    root.style.height = Math.max(0, r.height - tabBarH) + 'px';
  } catch(_) {}
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');
.bs-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:stretch;justify-content:center;background:rgba(2,1,10,.97);animation:bsFadeIn .18s ease-out}
.bs-panel{width:100%;max-width:430px;height:100%;display:flex;flex-direction:column;background:#04050f;border:none;border-radius:0;overflow:hidden;animation:bsFadeIn .22s ease-out;position:relative}
.bs-panel::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.07) 2px,rgba(0,0,0,.07) 4px);pointer-events:none;z-index:0}
.bs-panel::after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(0,229,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.025) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0}
@keyframes bsFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes bsGlitch{0%,90%,100%{text-shadow:0 0 14px rgba(0,229,255,.6)}91%{text-shadow:-2px 0 rgba(255,0,100,.7),2px 0 rgba(0,255,200,.7);transform:translateX(1px)}93%{text-shadow:2px 0 rgba(255,0,100,.7),-2px 0 rgba(0,255,200,.7);transform:translateX(-1px)}95%{transform:none}}
@keyframes bsPulse{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes bsShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
.bs-head{display:flex;align-items:center;gap:10px;padding:14px 16px 11px;border-bottom:1px solid rgba(0,229,255,.1);position:relative;z-index:1}
.bs-head::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,229,255,.4),transparent)}
.bs-head-icon{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:rgba(0,229,255,.07);border:1px solid rgba(0,229,255,.25);clip-path:polygon(7px 0%,100% 0%,calc(100% - 7px) 100%,0% 100%);font-size:15px;flex-shrink:0}
.bs-head-txt{flex:1}
.bs-title{display:block;font-family:'Orbitron',sans-serif;font-size:14px;font-weight:900;color:#00e5ff;letter-spacing:3px;animation:bsGlitch 5s infinite;text-shadow:0 0 14px rgba(0,229,255,.6)}
.bs-title-sub{display:block;font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(0,229,255,.4);letter-spacing:2px;margin-top:2px}
.bs-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:#39ff14;box-shadow:0 0 6px #39ff14;animation:bsPulse 2s infinite;vertical-align:middle;margin-right:3px}
.bs-close{width:26px;height:26px;background:rgba(255,34,68,.1);border:1px solid rgba(255,34,68,.3);color:#ff2244;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%);transition:all .15s;flex-shrink:0}
.bs-close:hover,.bs-close:active{background:rgba(255,34,68,.25);box-shadow:0 0 12px rgba(255,34,68,.4)}
.bs-grid{display:flex;flex-direction:column;gap:8px;padding:14px 14px 20px;overflow-y:auto;scrollbar-width:thin;position:relative;z-index:1}
.bs-grid::-webkit-scrollbar{width:3px}
.bs-grid::-webkit-scrollbar-thumb{background:rgba(0,229,255,.3);border-radius:3px}
.bs-card{display:flex;align-items:center;gap:12px;padding:12px 14px 12px 16px;background:#0a0d1e;border:1px solid rgba(255,255,255,.05);cursor:pointer;transition:transform .15s,background .15s,box-shadow .15s;-webkit-tap-highlight-color:transparent;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px));position:relative;overflow:hidden}
.bs-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--bsc,#00e5ff);box-shadow:0 0 8px var(--bsc,#00e5ff),0 0 16px var(--bsc,#00e5ff)}
.bs-card::after{content:'';position:absolute;top:0;right:0;width:10px;height:10px;border-top:1px solid var(--bsc,#00e5ff);border-right:1px solid var(--bsc,#00e5ff);opacity:.5}
.bs-card:hover,.bs-card:focus{background:#0d1228;transform:translateX(2px);box-shadow:-3px 0 14px var(--bsc,#00e5ff)}
.bs-card:active{transform:translateX(1px) scale(.99)}
.bs-ico-wrap{width:38px;height:38px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)}
.bs-emo{font-size:20px;filter:drop-shadow(0 0 5px var(--bsc,#00e5ff))}
.bs-tx{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.bs-name{font-family:'Orbitron',sans-serif;font-size:11px;font-weight:700;color:var(--bsn,#00e5ff);letter-spacing:1.5px;text-shadow:0 0 8px var(--bsc,#00e5ff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bs-sub{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(200,216,255,.45);letter-spacing:.4px;margin-top:2px}
.bs-bonus{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.bs-chip{font-size:8px;padding:1px 5px;border:1px solid rgba(255,215,0,.3);color:#ffd700;background:rgba(255,215,0,.06);letter-spacing:.4px;clip-path:polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%);font-family:'Share Tech Mono',monospace}
.bs-chip.c{border-color:rgba(0,229,255,.3);color:#00e5ff;background:rgba(0,229,255,.06)}
.bs-chip.g{border-color:rgba(57,255,20,.3);color:#39ff14;background:rgba(57,255,20,.06)}
.bs-arr{color:var(--bsc,#00e5ff);font-size:9px;opacity:.55;flex-shrink:0}
.bs-num{position:absolute;top:4px;right:14px;font-size:7px;color:rgba(255,255,255,.1);letter-spacing:1px;font-family:'Share Tech Mono',monospace}
.bs-div{display:flex;align-items:center;gap:8px;font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(0,229,255,.2);letter-spacing:2px;margin:2px 0}
.bs-div::before,.bs-div::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(0,229,255,.15))}
.bs-div::after{background:linear-gradient(90deg,rgba(0,229,255,.15),transparent)}
.bs-row{display:flex;gap:8px}
.bs-row .bs-card{flex:1;padding:10px 12px 10px 14px}
.bs-row .bs-ico-wrap{width:30px;height:30px}
.bs-row .bs-emo{font-size:15px}
.bs-row .bs-name{font-size:9px;letter-spacing:1px}
.bs-row .bs-sub{font-size:8px}
.bs-hpwarn{padding:8px 12px;background:rgba(255,34,68,.08);border:1px solid rgba(255,34,68,.25);color:rgba(255,100,120,.9);font-size:9px;letter-spacing:.5px;margin-bottom:4px;font-family:'Share Tech Mono',monospace;clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))}
.bs-card.bs-blocked{opacity:.3;filter:grayscale(.6)}
.bs-card.bs-blocked:active{transform:none;background:#0a0d1e}
`;

let _cssOn = false;
function _injectCSS() {
  if (_cssOn) return;
  const s = document.createElement('style');
  s.id = 'bs-css';
  s.textContent = CSS;
  document.head.appendChild(s);
  _cssOn = true;
}

function _close() {
  const el = document.getElementById('bs-overlay');
  if (el) el.remove();
}

function open(scene) {
  _injectCSS();
  _close();
  // Click-through blocker — глушит хвостовые pointerup/click/touchend от того же
  // тапа что нас открыл (по В БОЙ-зоне на Phaser-канвасе). Без него overlay
  // открывается и СРАЗУ закрывается тем же тапом — пользователь видит ничего.
  // Паттерн скопирован из scene_warrior_select.js fadeClose (350ms safety net).
  const guard = document.createElement('div');
  guard.style.cssText = 'position:fixed;inset:0;z-index:10000;background:transparent;touch-action:none;';
  ['click','pointerdown','pointerup','touchstart','touchend','mousedown','mouseup'].forEach(ev =>
    guard.addEventListener(ev, e => { e.stopPropagation(); e.preventDefault(); }, true));
  document.body.appendChild(guard);
  setTimeout(() => { try { guard.remove(); } catch(_) {} }, 350);

  const p = (typeof State !== 'undefined' && State.player) ? State.player : {};
  const lowHp = (p.hp_pct || 0) < 15;

  const wrap = document.createElement('div');
  wrap.id = 'bs-overlay';
  wrap.className = 'bs-overlay';
  wrap.innerHTML = `
    <div class="bs-panel">
      <div class="bs-head">
        <div class="bs-head-icon">⚔️</div>
        <div class="bs-head-txt">
          <span class="bs-title">// ВЫБЕРИ БОЙ</span>
          <span class="bs-title-sub"><span class="bs-dot"></span>АРЕНА ОНЛАЙН · SELECT COMBAT MODE</span>
        </div>
        <button class="bs-close" id="bs-close">✕</button>
      </div>
      <div class="bs-grid">
        ${lowHp ? '<div class="bs-hpwarn" id="bs-hpwarn">⚠ HP &lt; 15% — выпей зелье в профиле</div>' : ''}
        <div class="bs-card${lowHp?' bs-blocked':''}" data-act="pvp" style="--bsc:#00e5ff;--bsn:#00e5ff">
          <span class="bs-num">01</span>
          <div class="bs-ico-wrap"><span class="bs-emo">⚔️</span></div>
          <div class="bs-tx">
            <div class="bs-name">ПОИСК СОПЕРНИКА</div>
            <div class="bs-sub">Живой игрок · рейтинговый бой</div>
            <div class="bs-bonus">
              <span class="bs-chip c">+РЕЙТИНГ</span>
              <span class="bs-chip">+30% ⭐</span>
              <span class="bs-chip">+30% ПОБЕДА</span>
            </div>
          </div>
          <span class="bs-arr">▶</span>
        </div>
        <div class="bs-div">PVE</div>
        <div class="bs-card${lowHp?' bs-blocked':''}" data-act="tower" style="--bsc:#b845ff;--bsn:#c97aff">
          <span class="bs-num">02</span>
          <div class="bs-ico-wrap"><span class="bs-emo">🗼</span></div>
          <div class="bs-tx">
            <div class="bs-name">БАШНЯ ТИТАНОВ</div>
            <div class="bs-sub">PvE · прогрессия уровней · редкие награды</div>
          </div>
          <span class="bs-arr">▶</span>
        </div>
        <div class="bs-card${lowHp?' bs-blocked':''}" data-act="natisk" style="--bsc:#ff4500;--bsn:#ff7755">
          <span class="bs-num">03</span>
          <div class="bs-ico-wrap"><span class="bs-emo">🔥</span></div>
          <div class="bs-tx">
            <div class="bs-name">НАТИСК</div>
            <div class="bs-sub">Арена выживания · волны врагов</div>
          </div>
          <span class="bs-arr">▶</span>
        </div>
        <div class="bs-div">PVP SOCIAL</div>
        <div class="bs-row">
          <div class="bs-card" data-act="challenge" style="--bsc:#ffd700;--bsn:#ffd700">
            <span class="bs-num">04</span>
            <div class="bs-ico-wrap"><span class="bs-emo">🎯</span></div>
            <div class="bs-tx">
              <div class="bs-name">ВЫЗОВ ПО НИКУ</div>
              <div class="bs-sub">PvP дуэль</div>
            </div>
          </div>
          <div class="bs-card" data-act="incoming" style="--bsc:#4488ff;--bsn:#b8d4ff">
            <span class="bs-num">05</span>
            <div class="bs-ico-wrap"><span class="bs-emo">📨</span></div>
            <div class="bs-tx">
              <div class="bs-name">МОИ ВЫЗОВЫ</div>
              <div class="bs-sub">Исходящие</div>
            </div>
          </div>
        </div>
        <div class="bs-card${lowHp?' bs-blocked':''}" data-act="bot" style="--bsc:#39ff14;--bsn:#39ff14">
          <span class="bs-num">06</span>
          <div class="bs-ico-wrap"><span class="bs-emo">🤖</span></div>
          <div class="bs-tx">
            <div class="bs-name">БОЙ С БОТОМ</div>
            <div class="bs-sub">Практика · без рейтинга</div>
            <div class="bs-bonus"><span class="bs-chip g">+ЗОЛОТО</span></div>
          </div>
          <span class="bs-arr">▶</span>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  _fitToCanvas(wrap);

  const COMBAT_ACTS = new Set(['pvp', 'tower', 'natisk', 'bot']);

  // Показать встряску предупреждения внутри overlay (не тост на canvas)
  const _shakeWarn = () => {
    const warn = document.getElementById('bs-hpwarn');
    if (!warn) return;
    warn.style.animation = 'none';
    // eslint-disable-next-line no-unused-expressions
    warn.offsetHeight; // reflow
    warn.style.animation = 'bsShake .35s ease';
    warn.style.background = 'rgba(220,60,70,.28)';
    warn.style.borderColor = 'rgba(255,90,100,.8)';
    if (typeof tg !== 'undefined') tg?.HapticFeedback?.notificationOccurred('error');
  };

  let _dispatched = false;
  const dispatch = (act) => {
    if (_dispatched) return;

    // Для боевых действий: проверяем HP ДО закрытия overlay.
    // Если HP < 15 — встряска предупреждения внутри overlay (не тихий тост
    // на canvas под непрозрачным guard-блокером). Overlay остаётся открытым.
    if (COMBAT_ACTS.has(act)) {
      const sp = (typeof State !== 'undefined' && State.player) ? State.player : null;
      if (!sp || (sp.hp_pct || 0) < 15) {
        _shakeWarn();
        return;   // _dispatched остаётся false → можно нажать другую кнопку
      }
    }

    _dispatched = true;
    if (typeof tg !== 'undefined') tg?.HapticFeedback?.impactOccurred('medium');
    // Click-through guard: overlay sits over the Phaser tab bar.
    // When we remove it, the browser re-dispatches remaining pointer
    // events to the canvas → tab bar navigates to Clan/Boss/Rating.
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
    // bs-blocked карточки можно нажать — показываем встряску вместо dispatch
    if (card.classList.contains('bs-blocked')) { _shakeWarn(); return; }
    dispatch(card.dataset.act);
  };
  // pointerdown/touchstart fire BEFORE click — catch the event early
  // so remaining pointer events don't leak to the canvas after overlay removal.
  wrap.addEventListener('pointerdown', _onCard);
  wrap.addEventListener('touchstart', _onCard, { passive: false });
  wrap.addEventListener('click', _onCard);
  document.getElementById('bs-close').onclick = (e) => {
    e.stopPropagation(); e.preventDefault();
    if (typeof tg !== 'undefined') tg?.HapticFeedback?.selectionChanged();
    // Guard for close button too (it's near tab bar)
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
