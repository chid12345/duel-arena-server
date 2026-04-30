/* BotBattleHtml — HTML-overlay для PvE «Бой с ботом». Без backdrop-filter
   (тяжко для мобайла). Phaser обрабатывает WS, timer, scene transitions.
   API: mount(s)/update(b)/setTimer(s)/resetChoices()/showWait(m)/dmgFx(s,a,c)/unmount() */

const BotBattleHtml = (() => {
  let scene = null, root = null, mounted = false, clickHandler = null;
  let elP1Hp, elP2Hp, elP1Bar, elP2Bar, elP2Name, elTimer, elWait;
  let attackBtns = {}, defenseBtns = {};
  let selectedAttack = null, selectedDefense = null;

  // Стили вынесены в bot_battle_css.js (Закон 1 — лимит файла).
  function _injectCss() {
    if (typeof BotBattleCss !== 'undefined') BotBattleCss.inject();
  }

  // State объявлен через const в game_globals — НЕТ на window. Читаем напрямую.
  const _pWt = () => {
    try { if (typeof State !== 'undefined' && State.player) return State.player.warrior_type; } catch(_) {}
    try { return window.State?.player?.warrior_type; } catch(_) {}
    return null;
  };
  const _pSkin = () => (typeof getWarriorSkinPath === 'function')
    ? getWarriorSkinPath(_pWt())
    : 'skins/crit/1.png';

  function _renderShell(b, skinId, pvpBgIdx) {
    // PvP (соперник-человек): фон — рандомный из pvp_bg/1..5,
    // спрайт соперника — getWarriorSkinPath по его warrior_type.
    // PvE-бот: фон + скин из bot_skins/ (как было).
    const isPvp = !b.opp_is_bot;
    const ext = skinId <= 25 ? 'png' : 'jpg';
    const bgUrl = isPvp ? `pvp_bg/${pvpBgIdx || 1}.png` : (skinId ? `bot_skins/bg/${skinId}.${ext}` : '');
    const skinUrl = isPvp
      ? ((typeof getWarriorSkinPath === 'function') ? getWarriorSkinPath(b.opp_warrior_type || 'tank') : 'skins/sila/1.png')
      : (skinId ? `bot_skins/${skinId}.png` : '');
    const flipBoss = isPvp ? false : (skinId && typeof BotSkinPicker !== 'undefined' && BotSkinPicker.shouldFlip(skinId));
    const meName = String(window.State?.player?.username || 'Вы').toUpperCase();
    const oppName = String(b.opp_name || 'Соперник').toUpperCase();
    const myRating  = window.State?.player?.rating || 0;
    const oppRating = b.opp_rating || 0;
    const myRatingHtml  = myRating  > 0 ? `<span class="hp-rating">★ ${myRating}</span>`  : '';
    const oppRatingHtml = oppRating > 0 ? `<span class="hp-rating">★ ${oppRating}</span>` : '';
    const ic = k => k === 'HEAD' ? 'head' : k === 'TORSO' ? 'torso' : 'legs';
    const nm = k => k === 'HEAD' ? 'Голова' : k === 'TORSO' ? 'Тело' : 'Ноги';
    const btn = (s, k) => `<div class="ic-btn" data-side="${s}" data-key="${k}"><div class="halo"></div><img src="battle_icons/${ic(k)}.png"><div class="nm">${nm(k)}</div></div>`;
    // Fallback: если сервер вернул null HP (race при старте), берём данные игрока из State
    const myHp    = b.my_hp     != null ? b.my_hp     : (window.State?.player?.current_hp ?? 0);
    const myMaxHp = b.my_max_hp != null ? b.my_max_hp : (window.State?.player?.max_hp ?? 100);
    const oppHp   = b.opp_hp    != null ? b.opp_hp    : (b.opp_max_hp ?? 100);
    const oppMaxHp = b.opp_max_hp != null ? b.opp_max_hp : 100;
    const myPct  = myMaxHp  > 0 ? Math.max(0, Math.min(100, myHp  / myMaxHp  * 100)) : 100;
    const oppPct = oppMaxHp > 0 ? Math.max(0, Math.min(100, oppHp / oppMaxHp * 100)) : 100;
    root.innerHTML = `
      <div class="bg" style="background-image:url('${bgUrl}')"></div>
      <div class="hp-row">
        <div class="hp-block"><div class="hp-name" id="bb-p1n" style="cursor:pointer">${meName}${myRatingHtml}</div>
          <div class="hp-bar"><div class="hp-fill" id="bb-p1b" style="width:${myPct}%"></div></div>
          <div class="hp-num" id="bb-p1h">${myHp} / ${myMaxHp}</div></div>
        <div class="hp-block opp"><div class="hp-name" id="bb-p2n" style="cursor:pointer">${oppName}${oppRatingHtml}</div>
          <div class="hp-bar"><div class="hp-fill" id="bb-p2b" style="width:${oppPct}%"></div></div>
          <div class="hp-num" id="bb-p2h">${oppHp} / ${oppMaxHp}</div></div>
      </div>
      <div class="timer" id="bb-timer">15</div>
      <div class="fighter player" id="bb-p1"><img src="${_pSkin()}"><div class="shadow"></div></div>
      <div class="vs">VS</div>
      <div class="fighter boss${isPvp ? ' flip' : ''}" id="bb-p2">${skinUrl ? `<img src="${skinUrl}"${flipBoss ? '' : ' style="transform:scaleX(-1)"'}>` : ''}<div class="shadow"></div></div>
      <div class="col atk-col"><div class="col-lbl">АТАКА</div>${['HEAD','TORSO','LEGS'].map(k => btn('atk', k)).join('')}</div>
      <div class="col def-col"><div class="col-lbl">ЗАЩИТА</div>${['HEAD','TORSO','LEGS'].map(k => btn('def', k)).join('')}</div>
      <div class="action-row"><div class="auto-btn" id="bb-auto" title="Случайный ход">🎲</div><div class="confirm-btn" id="bb-confirm">⚔ Совершить ход</div></div>
      <div class="wait" id="bb-wait" style="display:none"></div>`;
    elP1Hp = root.querySelector('#bb-p1h'); elP2Hp = root.querySelector('#bb-p2h');
    elP1Bar = root.querySelector('#bb-p1b'); elP2Bar = root.querySelector('#bb-p2b');
    elP2Name = root.querySelector('#bb-p2n');
    elTimer = root.querySelector('#bb-timer');
    elWait = root.querySelector('#bb-wait');
    if (typeof BotBattleLog !== 'undefined') BotBattleLog.attach(root);
    if (typeof BotBattleModeBanner !== 'undefined') BotBattleModeBanner.attach(root);
    attackBtns = {}; defenseBtns = {};
    root.querySelectorAll('.atk-col .ic-btn').forEach(b => attackBtns[b.dataset.key] = b);
    root.querySelectorAll('.def-col .ic-btn').forEach(b => defenseBtns[b.dataset.key] = b);
  }

  function _onClick(e) {
    if (!mounted || !scene) return;
    const btn = e.target.closest('.ic-btn');
    if (btn) {
      if (btn.dataset.side === 'atk') selectedAttack = btn.dataset.key; else selectedDefense = btn.dataset.key;
      _refresh();
      return;
    }
    if (e.target.closest('#bb-confirm') && selectedAttack && selectedDefense && scene._submitChoice) {
      scene._selAttack = selectedAttack; scene._selDefense = selectedDefense;
      try { scene._submitChoice(); } catch(_){}
      return;
    }
    if (e.target.closest('#bb-auto') && typeof BotBattleFx !== 'undefined' && BotBattleFx.spinChoice) BotBattleFx.spinChoice(attackBtns, defenseBtns, (a, d) => {
      selectedAttack = a; selectedDefense = d; _refresh();
      setTimeout(() => { if (scene && scene._submitChoice) { scene._selAttack = a; scene._selDefense = d; try { scene._submitChoice(); } catch(_){} } }, 250);
    });
    if (typeof BotBattleCard !== 'undefined') { if (e.target.closest('#bb-p2n')) BotBattleCard.show('opp'); else if (e.target.closest('#bb-p1n')) BotBattleCard.show('me'); }
  }

  function _refresh() {
    Object.values(attackBtns).forEach(b => b.classList.toggle('sel', b.dataset.key === selectedAttack));
    Object.values(defenseBtns).forEach(b => b.classList.toggle('sel', b.dataset.key === selectedDefense));
    const cf = root && root.querySelector('#bb-confirm');
    if (cf) cf.classList.toggle('ready', !!(selectedAttack && selectedDefense));
  }

  return {
    isMounted: () => mounted,
    mount(s) {
      if (mounted) return;
      if (!s || !s.game || !s.game.canvas) return;
      // Страховка: убираем зависший #bb-root от предыдущего боя (если unmount не отработал чисто)
      try { const old = document.getElementById('bb-root'); if (old) old.remove(); } catch(_) {}
      scene = s; mounted = true; _injectCss();
      const b0 = window.State?.battle || {};
      const isPvp = !b0.opp_is_bot;
      // PvE-бот: skin_id с сервера → случайный из 31 бот-скина.
      // PvP: skin_id не нужен (спрайт = warrior_type соперника), фон — рандом из 5.
      const skinId = isPvp ? null : (s._currentBotSkinId
        || b0.opp_skin_id
        || (typeof BotSkinPicker !== 'undefined' ? BotSkinPicker.pick() : null));
      s._currentBotSkinId = skinId;
      const pvpBgIdx = isPvp ? (s._currentPvpBgIdx || (1 + Math.floor(Math.random() * 5))) : 0;
      s._currentPvpBgIdx = pvpBgIdx;
      root = document.createElement('div'); root.id = 'bb-root';
      if (isPvp) root.classList.add('pvp');
      const r = s.game.canvas.getBoundingClientRect();
      Object.assign(root.style, { left:r.left+'px', top:r.top+'px', width:r.width+'px', height:r.height+'px' });
      document.body.appendChild(root);
      _renderShell(b0, skinId, pvpBgIdx);
      clickHandler = _onClick;
      root.addEventListener('click', clickHandler);
      // Прямой listener на ники — bbBreath и pointer-events иногда мешают
      // bubbling до root. Дублируем напрямую, чтобы карточка соперника
      // в PvP открывалась гарантированно.
      try {
        const p1n = root.querySelector('#bb-p1n');
        const p2n = root.querySelector('#bb-p2n');
        if (p1n) p1n.addEventListener('click', e => {
          e.stopPropagation();
          if (typeof BotBattleCard !== 'undefined') BotBattleCard.show('me');
        });
        if (p2n) p2n.addEventListener('click', e => {
          e.stopPropagation();
          if (typeof BotBattleCard !== 'undefined') BotBattleCard.show('opp');
        });
      } catch(_) {}
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
    setTimer(s) {
      if (!mounted || !elTimer) return;
      const v = Math.max(0, s|0);
      elTimer.textContent = String(v);
      // Красный пульсирующий таймер при ≤5 сек.
      elTimer.classList.toggle('danger', v > 0 && v <= 5);
    },
    resetChoices() {
      selectedAttack = null; selectedDefense = null;
      if (mounted) { _refresh(); if (elWait) elWait.style.display = 'none'; }
    },
    showWait(msg) {
      if (!mounted || !elWait) return;
      elWait.textContent = msg || ''; elWait.style.display = msg ? 'block' : 'none';
    },
    dmgFx(side, amount, isCrit) {
      if (!mounted) return;
      if (typeof BotBattleFx !== 'undefined') BotBattleFx.apply(side, amount, isCrit);
      // Подсветка спрайта жертвы при крите.
      if (isCrit && root) {
        const sel = side === 'me' ? '#bb-p1' : '#bb-p2';
        const el = root.querySelector(sel);
        if (el) {
          el.classList.remove('crit-hit');
          void el.offsetWidth;
          el.classList.add('crit-hit');
          setTimeout(() => { try { el.classList.remove('crit-hit'); } catch(_) {} }, 360);
        }
      }
    },
    dodgeFx(side) {
      if (!mounted || !root) return;
      const sel = side === 'me' ? '#bb-p1' : '#bb-p2';
      const el = root.querySelector(sel);
      if (!el) return;
      const cls = side === 'me' ? 'dodge-left' : 'dodge-right';
      el.classList.remove(cls);  // перезапуск если уже идёт
      void el.offsetWidth;        // force reflow для рестарта animation
      el.classList.add(cls);
      setTimeout(() => { try { el.classList.remove(cls); } catch(_) {} }, 420);
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
