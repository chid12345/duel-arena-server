/* webapp/level_lock_helper.js — UI tier-блокировка по уровню игрока (Вариант В).
 *
 * Используется в 5 overlay (helmet/shield/boots/ring/weapon) для одинакового UX:
 * - Бейдж требуемого уровня всегда виден на T2/T3/T4 (recLevel > 1)
 * - Если игрок не дорос — карточка приглушена + кнопка серая «🔒 С N ур.»
 * - Если дорос — бейдж зелёный «✓ N+», кнопка нормальная
 *
 * Стили .wd-card.locked и .wd-lvl-badge добавляются здесь (один раз).
 */
(function (global) {
  'use strict';

  let _cssOn = false;
  function _injectCSS() {
    if (_cssOn) return;
    _cssOn = true;
    const s = document.createElement('style');
    s.id = 'lvl-lock-css';
    s.textContent = `
.wd-card.locked{opacity:.55;filter:grayscale(.35)}
.wd-card.locked .wd-img-wrap{filter:grayscale(.6) brightness(.7)}
.wd-card.locked::after{box-shadow:none}
.wd-lvl-badge{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:800;padding:2px 6px;border-radius:5px;margin-left:4px;letter-spacing:.3px;vertical-align:middle}
.wd-lvl-badge.ok{border:1px solid rgba(60,200,100,.6);background:rgba(60,200,100,.12);color:#3cc864;text-shadow:0 0 6px rgba(60,200,100,.3)}
.wd-lvl-badge.lock{border:1px solid rgba(255,90,90,.5);background:rgba(255,90,90,.1);color:#ff7070;text-shadow:0 0 6px rgba(255,90,90,.3)}
.wd-btn.locked{background:rgba(70,70,90,.55)!important;color:rgba(200,200,210,.55)!important;border:1px solid rgba(255,255,255,.12)!important;cursor:not-allowed!important;box-shadow:none!important;letter-spacing:.5px}
.wd-btn.locked:hover,.wd-btn.locked:active{transform:none!important;background:rgba(70,70,90,.55)!important}
`;
    document.head.appendChild(s);
  }

  function _playerLevel() {
    try { return Number((window.State?.player?.level) || 1); }
    catch (_) { return 1; }
  }

  function isLocked(item) {
    // Не блокируем если: уже надет, уже куплен, или это free-предмет, или recLevel<=1.
    if (!item || item.equipped || item.owned) return false;
    if (item.type === 'free') return false;
    const rec = Number(item.recLevel || 1);
    if (rec <= 1) return false;
    return _playerLevel() < rec;
  }

  function buildBadge(item) {
    _injectCSS();
    const rec = Number(item?.recLevel || 1);
    if (rec <= 1) return '';
    if (item?.equipped || item?.owned) return '';
    const reached = _playerLevel() >= rec;
    const cls = reached ? 'ok' : 'lock';
    const ico = reached ? '✓' : '🔒';
    return `<span class="wd-lvl-badge ${cls}">${ico} ${rec}+ ур</span>`;
  }

  function lockedBtn(item) {
    _injectCSS();
    // disabled=true — браузер игнорирует клики, click-обработчики в overlay не сработают.
    return `<button class="wd-btn locked" data-act="locked" data-id="${item.id}" disabled>🔒 С ${item.recLevel} ур.</button>`;
  }

  function cardLockedClass(item) {
    return isLocked(item) ? ' locked' : '';
  }

  global.LevelLock = { isLocked, buildBadge, lockedBtn, cardLockedClass };
})(window);
