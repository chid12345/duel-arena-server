/* wb_html_battle_zones_extras.js — UI-доп для боя WB:
   1) Скрывает УЛЬТА + СКИЛЛЫ
   2) Лента истории «БОСС ЦЕЛИЛ» в sticky-шапке
   3) flex-layout — убирает пустоту внизу
   4) Фон босса на ВЕСЬ экран (включая шапку) — через CSS bt-X на root
   5) Полупрозрачные шапка/ticker/HP игрока — фон проступает */
(() => {
  if (window.__wbzExtrasLoaded) return;
  window.__wbzExtrasLoaded = true;

  const HKEY = 'wbz_history_';
  const MAX = 5;
  const ZONE_ICON = { HEAD:'battle_icons/head.png', TORSO:'battle_icons/torso.png', LEGS:'battle_icons/legs.png' };
  const BG_VER = 'a10';

  function _key(scene) {
    const sid = scene?._state?.active?.spawn_id;
    return sid ? HKEY + sid : null;
  }
  function _load(scene) {
    const k = _key(scene); if (!k) return [];
    try { const a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a.slice(-MAX) : []; }
    catch(_) { return []; }
  }
  function _save(scene, arr) {
    const k = _key(scene); if (!k) return;
    try { localStorage.setItem(k, JSON.stringify(arr.slice(-MAX))); } catch(_) {}
  }

  function _injectCss() {
    if (document.getElementById('wbz-x-css')) return;
    const s = document.createElement('style');
    s.id = 'wbz-x-css';
    s.textContent = `
      /* Layout — boss-zone забирает всё свободное место. Flex может не работать
         в Telegram WebView — высоту boss-zone JS считает явно через JS. */
      #wb-root.wbz-fill{display:flex!important;flex-direction:column!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;background-color:#02000a!important}
      #wb-root.wbz-fill > .wb-bhdr2,
      #wb-root.wbz-fill > .wb-ticker,
      #wb-root.wbz-fill > .wb-plhp,
      #wb-root.wbz-fill > .wb-dead{flex-shrink:0!important}
      #wb-root.wbz-fill > .wb-boss-zone{flex:1 1 0!important;min-height:0!important;background-image:none!important;background-color:transparent!important}
      /* ULT/SKILLS — display:none + position:absolute + size:0 — гарантированно
         не занимают flex-место. Иначе создавали пустоту между боссом и UI внизу. */
      #wb-root.wbz-fill .wb-ultra,
      #wb-root.wbz-fill .wb-skills{display:none!important;position:absolute!important;left:-9999px!important;top:-9999px!important;width:0!important;height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;pointer-events:none!important}
      /* Карточка игрока — фиксированный overlay, не флекс-элемент */
      #wb-root.wbz-fill .wb-pcard-ov{position:fixed!important;left:0!important;top:0!important;right:0!important;bottom:0!important;z-index:1000}

      /* Фон босса на весь экран — отдельные правила для каждого типа */
      #wb-root.wbz-fill.bt-lich    {background-image:url('bosses/bg/lich.png?v=${BG_VER}')!important}
      #wb-root.wbz-fill.bt-shadow  {background-image:url('bosses/bg/shadow.png?v=${BG_VER}')!important}
      #wb-root.wbz-fill.bt-spider  {background-image:url('bosses/bg/spider.png?v=${BG_VER}')!important}
      #wb-root.wbz-fill.bt-fire    {background-image:url('bosses/bg/fire.png?v=${BG_VER}')!important}
      #wb-root.wbz-fill.bt-poison  {background-image:url('bosses/bg/poison.png?v=${BG_VER}')!important}
      #wb-root.wbz-fill.bt-lava    {background-image:url('bosses/bg/lava.png?v=${BG_VER}')!important}
      #wb-root.wbz-fill.bt-demon   {background-image:url('bosses/bg/demon.png?v=${BG_VER}')!important}
      #wb-root.wbz-fill.bt-universal{background-image:url('bosses/bg/lich.png?v=${BG_VER}')!important}

      /* Полупрозрачные плашки. Шапка sticky сверху (как было изначально). */
      #wb-root.wbz-fill > .wb-bhdr2{background:linear-gradient(180deg,rgba(0,0,0,.7),rgba(0,0,0,.3))!important;border-bottom:1px solid rgba(255,0,85,.2)!important}
      #wb-root.wbz-fill > .wb-ticker{background:rgba(0,0,0,.45)!important;border-bottom:none!important}
      #wb-root.wbz-fill > .wb-plhp{background:linear-gradient(0deg,rgba(0,0,0,.7),rgba(0,0,0,.2))!important}

      /* Кнопка «Лог боя» — flow внутри sticky-шапки (заменила старую ленту истории) */
      .wbz-logbtn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;margin:5px 2px 1px;border-radius:6px;font-family:Consolas,monospace;font-size:9px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:#ffc83c;background:linear-gradient(180deg,rgba(60,40,5,.65),rgba(30,15,0,.85));border:1px solid rgba(255,200,60,.35);text-shadow:0 0 5px rgba(255,200,60,.5);cursor:pointer;user-select:none;transition:all .15s}
      .wbz-logbtn:active{transform:scale(.96);background:linear-gradient(180deg,rgba(80,55,10,.75),rgba(50,25,0,.9))}
    `;
    document.head.appendChild(s);
  }

  function _hideOldUI(root) {
    // Вырываем скрытые элементы из flex-flow — иначе пустота между боссом и UI
    root.querySelectorAll('.wb-ultra, .wb-skills').forEach(el => {
      el.style.cssText = 'display:none!important;position:absolute!important;left:-9999px!important;width:0!important;height:0!important';
    });
    // Player-card overlay — fixed, не во flex
    const pcov = root.querySelector('.wb-pcard-ov');
    if (pcov) pcov.style.position = 'fixed';
  }

  // Высота boss-zone = vh - (шапка+ticker сверху) - (plhp+dead снизу).
  function _resizeBossZone(root) {
    if (!root) return;
    const zone = root.querySelector('.wb-boss-zone');
    if (!zone) return;
    try {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const bhdr = root.querySelector('.wb-bhdr2');
      const ticker = root.querySelector('.wb-ticker');
      const plhp = root.querySelector('.wb-plhp');
      const dead = root.querySelector('.wb-dead');
      const headerH = (bhdr?.offsetHeight || 0) + (ticker?.offsetHeight || 0);
      const bottomH = (plhp?.offsetHeight || 0) + (dead?.offsetHeight || 0);
      const target = Math.max(220, vh - headerH - bottomH);
      zone.style.height = target + 'px';
      zone.style.minHeight = target + 'px';
    } catch(_) {}
  }

  let _resizeBound = false;
  function _bindResize() {
    if (_resizeBound) return;
    _resizeBound = true;
    window.addEventListener('resize', () => {
      const root = document.getElementById('wb-root');
      if (root && root.classList.contains('wbz-fill')) _resizeBossZone(root);
    });
  }

  // Вместо ленты «БОСС ЦЕЛИЛ» — компактная кнопка «📜 Лог боя».
  // Тап → открывает существующий wb-bhist popup из wb_html_battle_log.js.
  function _renderLogBtn(root) {
    // Удаляем старую ленту если осталась от прошлой версии (быстрый cleanup)
    root.querySelectorAll('.wbz-hbar').forEach(el => el.remove());
    let btn = root.querySelector('.wbz-logbtn');
    if (btn) return;
    btn = document.createElement('div');
    btn.className = 'wbz-logbtn';
    btn.innerHTML = '📜 ЛОГ БОЯ';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      try { window.WBHtml?.showBattleHistory?.(); } catch(_) {}
    });
    const hdr = root.querySelector('.wb-bhdr2');
    const hpSec = hdr?.querySelector('.wb-hp2-sec');
    if (hpSec && hpSec.parentNode) hpSec.parentNode.insertBefore(btn, hpSec.nextSibling);
    else if (hdr) hdr.appendChild(btn);
    else root.appendChild(btn);
  }

  // Сохраняем удары в лог боя (используется для popup истории)
  function logHit(scene, r) {
    if (!scene || !r || !r.zone_mode || !r.boss_atk_zone) return;
    const arr = _load(scene);
    arr.push({ ts:Date.now(), boss_atk:r.boss_atk_zone, boss_def:r.boss_def_zone,
               def_blocked:!!r.def_blocked, atk_blocked:!!r.atk_blocked });
    _save(scene, arr);
  }

  function _hookRender() {
    if (!window.WBHtml || !window.WBHtml._renderBattle) { setTimeout(_hookRender, 50); return; }
    if (window.WBHtml.__wbzExtrasHooked) return;
    window.WBHtml.__wbzExtrasHooked = true;
    const orig = window.WBHtml._renderBattle;
    window.WBHtml._renderBattle = function(root, s) {
      orig.call(this, root, s);
      try {
        _injectCss();
        if (root.classList) root.classList.add('wbz-fill');
        _hideOldUI(root);
        const sc = window.WBHtml?._scene;
        _renderLogBtn(root);
        try { window.WbzAutobot?.render?.(root, s); } catch(_) {}
        // Принудительный resize boss-zone — flex ненадёжен в Telegram WebView
        _resizeBossZone(root);
        _bindResize();
        // Re-run после прогрузки картинок и DOM-перестановки
        setTimeout(() => _resizeBossZone(root), 100);
        setTimeout(() => _resizeBossZone(root), 500);
      } catch(e) { console.warn('[wbz extras]', e); }
    };
  }

  window.WbzExtras = { logHit };
  _hookRender();
})();
