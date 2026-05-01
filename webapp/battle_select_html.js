/* ============================================================
   BattleSelectHTML — Cyberpunk HUD (CP2077 style)
   Вертикальный список · Срез угла · Один цвет · Логика цела
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
@keyframes bsFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes bsShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
@keyframes bsBlink{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes bsTicker{from{transform:translateX(110%)}to{transform:translateX(-100%)}}
@keyframes bsGlitch{0%,88%,100%{opacity:0}90%{opacity:.5;transform:translateX(-2px)}94%{opacity:.5;transform:translateX(2px)}97%{opacity:0}}
@keyframes bsScan{0%{top:-100%}100%{top:110%}}

.bs-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:stretch;justify-content:center;background:rgba(1,4,12,.97);animation:bsFadeIn .18s cubic-bezier(.22,1,.36,1)}
.bs-panel{width:100%;max-width:430px;height:100%;display:flex;flex-direction:column;background:#040d1e;overflow:hidden;position:relative;background-image:repeating-linear-gradient(0deg,transparent 0,transparent 3px,rgba(0,245,255,.007) 3px,rgba(0,245,255,.007) 4px)}

.bs-cn{position:absolute;width:16px;height:16px;pointer-events:none;z-index:5}
.bs-cn-tl{top:0;left:0;border-top:1.5px solid rgba(0,245,255,.7);border-left:1.5px solid rgba(0,245,255,.7)}
.bs-cn-tr{top:0;right:0;border-top:1.5px solid rgba(0,245,255,.7);border-right:1.5px solid rgba(0,245,255,.7)}
.bs-cn-bl{bottom:0;left:0;border-bottom:1.5px solid rgba(0,245,255,.7);border-left:1.5px solid rgba(0,245,255,.7)}
.bs-cn-br{bottom:0;right:0;border-bottom:1.5px solid rgba(0,245,255,.7);border-right:1.5px solid rgba(0,245,255,.7)}

.bs-head{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 16px 11px;border-bottom:1px solid rgba(0,245,255,.09)}
.bs-head::after{content:'';position:absolute;bottom:-1px;left:0;width:40%;height:1px;background:linear-gradient(90deg,#00f5ff,transparent);box-shadow:0 0 8px #00f5ff}
.bs-hleft{}
.bs-sys{font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(0,245,255,.32);letter-spacing:2px;margin-bottom:3px;text-transform:uppercase}
.bs-title{font-family:'Rajdhani','Share Tech Mono',monospace;font-size:20px;font-weight:700;color:#e8f4ff;letter-spacing:3px;text-transform:uppercase;position:relative;line-height:1}
.bs-title-acc{color:#00f5ff}
.bs-title::before{content:attr(data-t);position:absolute;left:1px;top:0;color:#ff2d78;clip-path:polygon(0 35%,100% 35%,100% 60%,0 60%);opacity:0;animation:bsGlitch 5s steps(1) infinite;font:inherit;pointer-events:none}
.bs-meta{display:flex;align-items:center;gap:6px;margin-top:3px;font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(0,245,255,.28);letter-spacing:1px}
.bs-odot{width:4px;height:4px;border-radius:50%;background:#00f5ff;animation:bsBlink 1.2s ease infinite;flex-shrink:0}
.bs-close{width:30px;height:30px;background:transparent;border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.5);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .15s,color .15s;font-family:inherit;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)}
.bs-close:active{border-color:rgba(255,255,255,.35);color:#fff}

.bs-ticker{font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(0,245,255,.2);padding:4px 0;border-bottom:1px solid rgba(0,245,255,.05);white-space:nowrap;overflow:hidden;letter-spacing:.8px}
.bs-ticker-i{display:inline-block;animation:bsTicker 24s linear infinite;padding-left:20px}

.bs-grid{flex:1;overflow-y:auto;padding:10px 0 14px;display:flex;flex-direction:column;gap:2px;scrollbar-width:none}
.bs-grid::-webkit-scrollbar{display:none}

.bs-divider{height:1px;background:rgba(0,245,255,.06);margin:6px 16px}

/* ── CP2077 Card — полная ширина, срез правого угла ── */
.bs-card{
  position:relative;
  display:flex;align-items:center;gap:0;
  padding:13px 38px 13px 16px;
  background:rgba(2,10,26,.0);
  border:none;
  border-left:3px solid #00f5ff;
  cursor:pointer;
  transition:background .12s;
  -webkit-tap-highlight-color:transparent;
  overflow:visible;
}
/* Срез правого угла — triangle overlay цвета фона панели */
.bs-card::after{content:'';position:absolute;top:0;right:0;width:0;height:0;border-style:solid;border-width:0 22px 22px 0;border-color:transparent #040d1e transparent transparent;pointer-events:none;z-index:2}
/* Тонкая горизонтальная разделительная линия между карточками */
.bs-card::before{content:'';position:absolute;bottom:0;left:16px;right:22px;height:1px;background:rgba(0,245,255,.06);pointer-events:none}
.bs-card:active{background:rgba(0,245,255,.07)}
.bs-card.bs-blocked{opacity:.2;filter:grayscale(.8);pointer-events:none}

/* Symbol — левый индикатор */
.bs-sym{font-family:'Share Tech Mono',monospace;font-size:11px;color:#00f5ff;width:30px;flex-shrink:0;letter-spacing:0;line-height:1;opacity:.9}

/* Content */
.bs-ctext{flex:1;min-width:0;display:flex;align-items:baseline;gap:10px}
.bs-cname{font-family:'Rajdhani','Share Tech Mono',monospace;font-size:15px;font-weight:700;color:#e8f4ff;letter-spacing:1.5px;text-transform:uppercase;line-height:1;white-space:nowrap}
.bs-cbonus{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(0,245,255,.38);letter-spacing:.5px;white-space:nowrap;flex-shrink:0;margin-left:auto}

/* HOT badge вместо left stripe для PvP */
.bs-card-pvp{border-left-color:#ff6600}
.bs-card-pvp .bs-sym{color:#ff6600}
.bs-card-pvp::after{border-right-color:#040d1e}
.bs-card-pvp .bs-hot{display:inline-flex}
.bs-hot{display:none;align-items:center;font-family:'Share Tech Mono',monospace;font-size:7.5px;letter-spacing:1.5px;color:#ff6600;padding:1px 6px;border:1px solid rgba(255,102,0,.35);background:rgba(255,102,0,.08);margin-left:8px;clip-path:polygon(3px 0,100% 0,100% 100%,0 100%,0 3px);white-space:nowrap}

.bs-hpwarn{margin:4px 16px;padding:9px 12px 9px 14px;background:rgba(255,40,80,.06);border-left:3px solid #ff2d78;font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(255,150,170,.8);letter-spacing:.5px;display:flex;align-items:center;gap:8px}

.bs-foot{padding:5px 16px;border-top:1px solid rgba(0,245,255,.05);display:flex;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:7.5px;letter-spacing:1px;color:rgba(0,245,255,.15);flex-shrink:0}
.bs-live{color:rgba(0,245,255,.4)}
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
      <div class="bs-hleft">
        <div class="bs-sys">ARENA.SYS // COMBAT_MODULE</div>
        <div class="bs-title" data-t="⚔ ВЫБЕРИ БОЙ"><span class="bs-title-acc">⚔</span> ВЫБЕРИ БОЙ</div>
        <div class="bs-meta"><span class="bs-odot"></span><span>В СЕТИ</span><span>//</span><span>ГОТОВ К БОЮ</span></div>
      </div>
      <button class="bs-close" id="bs-close">✕</button>
    </div>
    <div class="bs-ticker">
      <span class="bs-ticker-i">▶ ARENA CORE ONLINE &nbsp;//&nbsp; RANKED QUEUE ACTIVE &nbsp;//&nbsp; SEASON 4 — 14 DAYS LEFT &nbsp;//&nbsp; WAVE ASSAULT: RUNNING &nbsp;//&nbsp;</span>
    </div>
    <div class="bs-grid">
      ${lowHp ? '<div class="bs-hpwarn" id="bs-hpwarn">⚠ &nbsp;HP &lt; 15% — БОЕВЫЕ ПРОТОКОЛЫ ЗАБЛОКИРОВАНЫ</div>' : ''}
      <div class="bs-card bs-card-pvp${bl}" data-act="pvp">
        <div class="bs-sym">[ ▶ ]</div>
        <div class="bs-ctext">
          <div class="bs-cname">Поиск соперника<span class="bs-hot">HOT</span></div>
          <div class="bs-cbonus">+ELO · +30% · +XP</div>
        </div>
      </div>
      <div class="bs-card${bl}" data-act="tower">
        <div class="bs-sym">[ ◈ ]</div>
        <div class="bs-ctext">
          <div class="bs-cname">Башня Титанов</div>
          <div class="bs-cbonus">PvE · Редкие модули</div>
        </div>
      </div>
      <div class="bs-card${bl}" data-act="natisk">
        <div class="bs-sym">[ ⚡ ]</div>
        <div class="bs-ctext">
          <div class="bs-cname">Натиск</div>
          <div class="bs-cbonus">Волны · Выживание</div>
        </div>
      </div>
      <div class="bs-divider"></div>
      <div class="bs-card" data-act="challenge">
        <div class="bs-sym">[ ⊕ ]</div>
        <div class="bs-ctext">
          <div class="bs-cname">Вызов по нику</div>
          <div class="bs-cbonus">PvP · 1 на 1</div>
        </div>
      </div>
      <div class="bs-card" data-act="incoming">
        <div class="bs-sym">[ ↩ ]</div>
        <div class="bs-ctext">
          <div class="bs-cname">Мои вызовы</div>
          <div class="bs-cbonus">Исходящие · Ожидание</div>
        </div>
      </div>
      <div class="bs-divider"></div>
      <div class="bs-card${bl}" data-act="bot">
        <div class="bs-sym">[ ○ ]</div>
        <div class="bs-ctext">
          <div class="bs-cname">Бой с ботом</div>
          <div class="bs-cbonus">Практика · +Золото</div>
        </div>
      </div>
    </div>
    <div class="bs-foot"><span>ARENA_NET // SECURE</span><span class="bs-live">● LIVE</span></div>
  </div>`;
  document.body.appendChild(wrap);
  _fitToCanvas(wrap);

  const COMBAT_ACTS = new Set(['pvp','tower','natisk','bot']);
  const _shakeWarn = () => {
    const w = document.getElementById('bs-hpwarn'); if (!w) return;
    w.style.animation = 'none'; w.offsetHeight;
    w.style.animation = 'bsShake .35s ease';
    w.style.background = 'rgba(255,45,120,.16)';
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
    } catch(e) { console.warn('[BattleSelect]', act, e); }
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
