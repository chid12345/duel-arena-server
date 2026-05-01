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
.bs-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(8px);animation:bsFadeIn .22s ease-out}
.bs-panel{width:100%;max-width:430px;max-height:92dvh;display:flex;flex-direction:column;background:#040212;border-top:1px solid rgba(124,58,237,.35);border-radius:20px 20px 0 0;overflow:hidden;animation:bsSlideUp .28s cubic-bezier(.22,1,.36,1)}
@keyframes bsFadeIn{from{opacity:0}to{opacity:1}}
@keyframes bsSlideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
.bs-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;border-bottom:1px solid rgba(124,58,237,.18)}
.bs-title{font-size:16px;font-weight:800;letter-spacing:.6px;background:linear-gradient(90deg,#c4b5fd,#f9a8d4,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.bs-close{width:30px;height:30px;border-radius:9px;background:rgba(220,50,80,.18);border:1px solid rgba(255,80,120,.35);color:#fca5a5;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.bs-grid{display:flex;flex-direction:column;gap:8px;padding:12px 14px 18px;overflow-y:auto;scrollbar-width:thin}
.bs-grid::-webkit-scrollbar{width:3px}
.bs-grid::-webkit-scrollbar-thumb{background:rgba(130,80,255,.5);border-radius:3px}
.bs-card{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#1a1828;border-radius:12px;border-left:5px solid var(--bsc,#7c3aed);cursor:pointer;transition:transform .15s,background .15s;-webkit-tap-highlight-color:transparent}
.bs-card:active{transform:scale(.98);background:#221f36}
.bs-emo{font-size:24px;flex-shrink:0;width:34px;text-align:center}
.bs-tx{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.bs-name{font-size:14px;font-weight:700;color:var(--bsn,#fff)}
.bs-sub{font-size:11px;color:#ddddff;opacity:.85}
.bs-bonus{font-size:10px;color:#ffc83c;margin-top:1px}
.bs-row{display:flex;gap:8px}
.bs-row .bs-card{flex:1;padding:10px 12px}
.bs-row .bs-emo{font-size:20px;width:26px}
.bs-row .bs-name{font-size:12px}
.bs-row .bs-sub{font-size:10px}
.bs-hpwarn{padding:10px 12px;background:rgba(220,60,70,.12);border:1px solid rgba(255,90,100,.4);border-radius:10px;color:#fca5a5;font-size:11px;text-align:center;margin-bottom:6px}
.bs-card.bs-blocked{opacity:.32;filter:grayscale(.55)}
.bs-card.bs-blocked:active{transform:none;background:#1a1828}
@keyframes bsShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
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
        <span class="bs-title">⚔️ ВЫБЕРИ БОЙ</span>
        <button class="bs-close" id="bs-close">✕</button>
      </div>
      <div class="bs-grid">
        ${lowHp ? '<div class="bs-hpwarn" id="bs-hpwarn">❤️ HP ниже 15% — бои заблокированы. Зайди в профиль и выпей зелье!</div>' : ''}
        <div class="bs-card${lowHp?' bs-blocked':''}" data-act="pvp" style="--bsc:#dc3c46;--bsn:#ff6672">
          <div class="bs-emo">⚔️</div>
          <div class="bs-tx">
            <div class="bs-name">Поиск соперника</div>
            <div class="bs-sub">Живой игрок · рейтинговый бой</div>
            <div class="bs-bonus">🏆 +рейтинг  💰 +30%  ⭐ +30% за победу</div>
          </div>
        </div>
        <div class="bs-card${lowHp?' bs-blocked':''}" data-act="tower" style="--bsc:#b45aff;--bsn:#c97aff">
          <div class="bs-emo">🗿</div>
          <div class="bs-tx">
            <div class="bs-name">Башня Титанов</div>
            <div class="bs-sub">PvE · прогрессия уровней · редкие награды</div>
          </div>
        </div>
        <div class="bs-card${lowHp?' bs-blocked':''}" data-act="natisk" style="--bsc:#ff5533;--bsn:#ff7755">
          <div class="bs-emo">🔥</div>
          <div class="bs-tx">
            <div class="bs-name">Натиск</div>
            <div class="bs-sub">Арена выживания · волны врагов</div>
          </div>
        </div>
        <div class="bs-row">
          <div class="bs-card" data-act="challenge" style="--bsc:#ffc83c;--bsn:#ffdca0">
            <div class="bs-emo">🎯</div>
            <div class="bs-tx">
              <div class="bs-name">Вызов по нику</div>
              <div class="bs-sub">PvP дуэль</div>
            </div>
          </div>
          <div class="bs-card" data-act="incoming" style="--bsc:#5096ff;--bsn:#b8d4ff">
            <div class="bs-emo">📨</div>
            <div class="bs-tx">
              <div class="bs-name">Мои вызовы</div>
              <div class="bs-sub">Исходящие вызовы</div>
            </div>
          </div>
        </div>
        <div class="bs-card${lowHp?' bs-blocked':''}" data-act="bot" style="--bsc:#5096ff;--bsn:#7ab4ff">
          <div class="bs-emo">🤖</div>
          <div class="bs-tx">
            <div class="bs-name">Бой с ботом</div>
            <div class="bs-sub">Практика · без рейтинга · 💰 +золото</div>
          </div>
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
