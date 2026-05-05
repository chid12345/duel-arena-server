/* wb_html_battle_zones_fx.js — анимация результата зон-удара (Фаза 2.4).

   После каждого Совершить ход подсвечиваем что произошло:
   - Зона атаки игрока: зелёный = чистый удар, красный = заблочена боссом.
   - Зона защиты игрока (на той зоне куда метил босс): зелёный = отбил,
     красный = пропустил, плюс летящий эмодзи 💢 (попадание) / 🛡 (блок).

   API: window.WbzFx.animate(root, hitResponse, selectedAtk, selectedDef).
   Подключается после wb_html_battle_zones.js. Стили инжектятся при первом вызове. */
(() => {
  if (window.__wbzFxLoaded) return;
  window.__wbzFxLoaded = true;

  function _injectCss() {
    if (document.getElementById('wbz-fx-css')) return;
    const s = document.createElement('style');
    s.id = 'wbz-fx-css';
    s.textContent = `
      .wbz-btn.wbz-fx-green{animation:wbzFxGreen .9s ease-out}
      .wbz-btn.wbz-fx-red{animation:wbzFxRed .9s ease-out}
      @keyframes wbzFxGreen{
        0%{box-shadow:0 0 0 0 rgba(0,255,136,.95)}
        25%{box-shadow:0 0 0 2px #00ff88,0 0 26px #00ff88,0 0 50px rgba(0,255,136,.5);transform:scale(1.2)}
        65%{box-shadow:0 0 0 1px rgba(0,255,136,.4);transform:scale(1.05)}
        100%{box-shadow:none;transform:scale(1)}
      }
      @keyframes wbzFxRed{
        0%{box-shadow:0 0 0 0 rgba(255,51,68,.95)}
        15%{box-shadow:0 0 0 2px #ff3344,0 0 30px #ff3344;transform:translate(-4px,0) scale(1.2)}
        30%{transform:translate(4px,0) scale(1.2)}
        45%{transform:translate(-3px,0) scale(1.12)}
        60%{transform:translate(2px,0) scale(1.06);box-shadow:0 0 0 1px #ff3344}
        100%{box-shadow:none;transform:translate(0,0) scale(1)}
      }
      .wbz-strike-arrow{position:absolute;font-size:30px;font-weight:900;text-shadow:0 0 14px currentColor,0 0 24px currentColor;animation:wbzStrike .9s ease-out forwards;pointer-events:none;z-index:35;line-height:1;will-change:transform,opacity}
      .wbz-strike-arrow.hit{color:#ff3344}
      .wbz-strike-arrow.blk{color:#00ff88}
      @keyframes wbzStrike{
        0%{opacity:0;transform:translate(0,-32px) scale(.6) rotate(-12deg)}
        30%{opacity:1;transform:translate(0,0) scale(1.25) rotate(0deg)}
        70%{opacity:.85;transform:translate(0,12px) scale(1) rotate(6deg)}
        100%{opacity:0;transform:translate(0,28px) scale(.9) rotate(0deg)}
      }
    `;
    document.head.appendChild(s);
  }

  function _flashBtn(btn, ok) {
    if (!btn) return;
    const cls = ok ? 'wbz-fx-green' : 'wbz-fx-red';
    btn.classList.remove('wbz-fx-green', 'wbz-fx-red');
    void btn.offsetWidth;  // restart animation
    btn.classList.add(cls);
    setTimeout(() => btn.classList.remove(cls), 1000);
  }

  function _strike(rootEl, targetBtn, emoji, blocked) {
    if (!rootEl || !targetBtn) return;
    const tr = targetBtn.getBoundingClientRect();
    const rr = rootEl.getBoundingClientRect();
    const a = document.createElement('div');
    a.className = 'wbz-strike-arrow ' + (blocked ? 'blk' : 'hit');
    a.textContent = emoji;
    a.style.left = (tr.left - rr.left + tr.width / 2 - 15) + 'px';
    a.style.top  = (tr.top  - rr.top  - 22) + 'px';
    rootEl.appendChild(a);
    setTimeout(() => { try { a.remove(); } catch(_) {} }, 950);
  }

  function animate(root, r, selA, selD) {
    if (!root || !r || !r.zone_mode) return;
    try { _injectCss(); } catch(_) { return; }

    // Зона атаки игрока: зелёный = чистый удар, красный = заблочен боссом
    if (selA) {
      const atkBtn = root.querySelector('.wbz-col-atk .wbz-btn[data-key="' + selA + '"]');
      _flashBtn(atkBtn, !r.atk_blocked);
    }

    // Зона защиты на ноге боя (куда реально целился босс): зелёный = отбил, красный = пропустил
    const targetZone = r.boss_atk_zone || selD;
    if (targetZone) {
      const defBtn = root.querySelector('.wbz-col-def .wbz-btn[data-key="' + targetZone + '"]');
      _flashBtn(defBtn, !!r.def_blocked);
      // Летящий эмодзи: 💢 если босс попал, 🛡 если игрок отбил
      _strike(root, defBtn, r.def_blocked ? '🛡' : '💢', !!r.def_blocked);
    }
  }

  window.WbzFx = { animate };
})();
