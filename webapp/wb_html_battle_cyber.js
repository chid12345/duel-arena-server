/* ============================================================
   wb_html_battle_cyber.js — киберпанк-редизайн боя WB.
   ПОЛНОСТЬЮ переопределяет window.WBHtml._renderBattle (без orig.call):
   старые слои-патчи (zones / zones_extras / zones_autobot) перекрываются.
   View → wb_html_battle_cyber_view.js. FX → wb_html_battle_cyber_fx.js.
   CSS → wb_battle_cyber.css.
   ============================================================ */
(() => {
  if (window.__cyberBattleHooked) return;

  const ZONES = (window.CyberView?.ZONES) || ['HEAD','TORSO','LEGS'];

  function _bind(root, s) {
    if (root.__cyBound) return;
    root.__cyBound = true;
    let selA = null, selD = null, busy = false;
    let _lastHpPct = 1;   // для детекта порогов босса 75/50/25 по HP
    const apply = root.querySelector('#cy-apply');
    const auto  = root.querySelector('#cy-auto');

    const refresh = () => {
      root.querySelectorAll('.cy-col-atk .cy-zbtn').forEach(b => b.classList.toggle('sel', b.dataset.zone === selA));
      root.querySelectorAll('.cy-col-def .cy-zbtn').forEach(b => b.classList.toggle('sel', b.dataset.zone === selD));
      apply?.classList.toggle('ready', !!(selA && selD) && !busy);
    };

    root.addEventListener('click', (ev) => {
      const sc = window.WBHtml?._scene;
      const zb = ev.target.closest('.cy-zbtn');
      if (zb) {
        if (busy) return;
        if (zb.dataset.side === 'atk') selA = zb.dataset.zone;
        else                            selD = zb.dataset.zone;
        refresh();
        return;
      }
      if (ev.target.closest('#cy-apply') && apply.classList.contains('ready')) { performHit(); return; }
      if (ev.target.closest('#cy-dice')) {
        if (busy) return;
        selA = ZONES[Math.floor(Math.random()*3)];
        selD = ZONES[Math.floor(Math.random()*3)];
        refresh();
        setTimeout(performHit, 220);
        return;
      }
      if (ev.target.closest('#cy-auto')) {
        const isPrem = !!(s?.is_premium || sc?._state?.is_premium);
        if (!isPrem) { try { window.WBHtml?.toast?.('👑 АВТО — только для подписчиков'); } catch(_) {} return; }
        const on = auto.classList.toggle('on');
        try { window.WBHtml?.setAutoAttack?.(on); } catch(_) {}
        return;
      }
      if (ev.target.closest('#cy-clog')) { try { window.WBHtml?.showBattleHistory?.(); } catch(_) {} return; }
      if (ev.target.closest('[data-act="boss-fx"]')) { _showBossFishki(); return; }
      const res = ev.target.closest('[data-act="res"]');
      if (res) { try { sc?._resurrect?.(res.dataset.t); } catch(_) {} return; }
      const resBuy = ev.target.closest('[data-act="res-buy"]');
      if (resBuy) {
        (async () => {
          try {
            const r = await post('/api/shop/buy', { item_id: resBuy.dataset.t });
            if (!r?.ok) { try { window.WBHtml?.toast?.('❌ ' + (r?.reason || 'Нет золота')); } catch(_) {} return; }
            try { sc?._resurrect?.(resBuy.dataset.t); } catch(_) {}
          } catch(_) { try { window.WBHtml?.toast?.('❌ Ошибка сети'); } catch(_) {} }
        })();
        return;
      }
      if (ev.target.closest('[data-act="back"]')) {
        const inFight = !!sc?._state?.active && !sc?._state?.player_state?.is_dead && !!sc?._state?.player_state;
        if (inFight) { try { window.WBHtml?.toast?.('⚔️ Нельзя выйти — ты в бою'); } catch(_) {} return; }
        try { window.WBHtml?.close?.(); } catch(_) {}
        try { sc?.scene?.start?.('Menu', { returnTab: 'more' }); } catch(_) {}
        return;
      }
      if (ev.target.closest('[data-act="enter"]')) { performHit(true); return; }
    });

    async function performHit(isFirstEnter) {
      if (busy) return;
      const a = isFirstEnter ? null : selA;
      const d = isFirstEnter ? null : selD;
      if (!isFirstEnter && (!a || !d)) return;
      busy = true;
      apply?.classList.add('cd');
      apply?.classList.remove('ready');
      const txt = root.querySelector('#cy-apply-text'); if (txt) txt.textContent = '1.5c';

      try {
        const body = a && d ? { attack_zone: a, defense_zone: d } : {};
        const r = await post('/api/world_boss/hit', body);
        if (r && r.ok) {
          const arena = root.querySelector('#cy-arena');
          const boss  = root.querySelector('#cy-boss');
          window.CyberFx?.spawnImpact?.(arena, boss, !!r.is_crit);
          window.CyberFx?.spawnDmg?.(arena, r.damage, !!r.is_crit);
          window.CyberFx?.flashZone?.(root, 'atk', a, !r.atk_blocked);
          if (r.boss_atk_zone) window.CyberFx?.flashZone?.(root, 'def', r.boss_atk_zone, !!r.def_blocked);
          window.CyberFx?.pushClog?.(root, { atk: a, def: d }, r);

          const sc = window.WBHtml?._scene;
          if (sc?._state?.active) sc._state.active.current_hp = r.boss_hp;

          // Пороги босса (75/50/25) ПО HP — надёжно, т.к. идёт на каждом ударе
          // (WS-эффекты до кибер-боя не доходят). Имена фишек — из boss_features.
          try {
            const act = sc?._state?.active;
            const mhp = Number(act?.max_hp) || 0;
            if (mhp > 0 && r.boss_hp != null) {
              const pct = r.boss_hp / mhp;
              const feats = act?.boss_features || [];
              const nameAt = (h) => (feats.find(f => f && f.hp === h) || {}).name;
              [[0.75, 75, '#ffaa3c'],
               [0.50, 50, '#ff6a30'],
               [0.25, 25, '#ff5a3c']].forEach(([thr, lab, col]) => {
                if (_lastHpPct > thr && pct <= thr) {
                  const nm = nameAt(lab) || (lab === 50 ? 'Ярость' : lab === 25 ? 'Хаос' : 'Коронный удар');
                  // Верхняя плашка (бывшая ФАЗА) → новая фишка + вспышка.
                  try {
                    const badge = root.querySelector('#cy-fx-badge');
                    if (badge) {
                      badge.textContent = '⚡ ' + nm + ' ▾';
                      badge.style.color = col;
                      badge.style.boxShadow = '0 0 14px ' + col;
                      setTimeout(() => { try { badge.style.boxShadow = 'none'; } catch (_) {} }, 1200);
                    }
                  } catch (_) {}
                  // Всплывающее сообщение над ареной (само исчезает, экран не двигает).
                  try { window.CyberFx?.spawnAnnounce?.(root.querySelector('#cy-arena'), nm, col); } catch (_) {}
                  try { sc?._fxDomShake?.(); } catch (_) {}        // лёгкая тряска экрана
                  try {                                            // вспышка картинки босса
                    const b = root.querySelector('#cy-boss');
                    if (b) { b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
                  } catch (_) {}
                }
              });
              _lastHpPct = pct;
            }
          } catch (_) {}

          if (sc?._state?.player_state && r.player_hp != null) {
            sc._state.player_state.current_hp = r.player_hp;
            if (r.player_died) sc._state.player_state.is_dead = 1;
          }
          try { window.WBHtml?.updateHUD?.(sc?._state); } catch(_) {}
          try { window.WBHtml?.addHitLog?.(r.damage, r.is_crit); } catch(_) {}
          try { window.WBHtml?.logMyHit?.(r.damage, !!r.is_crit, r.boss_hp, a); } catch(_) {}
          try { tg?.HapticFeedback?.impactOccurred?.(r.is_crit ? 'medium' : 'light'); } catch(_) {}
          if (r.player_died || isFirstEnter) setTimeout(() => sc?._refresh?.(), 400);
        } else if (r && r.reason && r.reason !== 'Слишком быстро') {
          try { window.WBHtml?.toast?.('❌ ' + r.reason); } catch(_) {}
        }
      } catch(_) {}

      // КД между ходами: 800мс. Раньше было 1500мс — игроки жаловались на «бой тормозит».
      // 800мс хватает чтобы рука дошла до новой зоны, но не ощущается как «думает».
      let left = 800;
      const tm = setInterval(() => {
        left -= 100;
        if (left <= 0) {
          clearInterval(tm);
          apply?.classList.remove('cd');
          if (txt) txt.textContent = '⚔ Совершить ход';
          busy = false; selA = null; selD = null;
          refresh();
          return;
        }
        if (txt) txt.textContent = (left/1000).toFixed(1) + 'c';
      }, 100);
    }
  }

  // Переопределяем setAutoAttack: старая (logic.js) дёргает sc._onHit() БЕЗ
  // attack_zone/defense_zone — серверу нужны зоны → удары не проходят. Эмулируем
  // тап по кубику автоудара (он сам выбирает случайные зоны и шлёт hit).
  function _setAutoAttackCyber(on) {
    if (window._cyAutoTimer) { clearInterval(window._cyAutoTimer); window._cyAutoTimer = null; }
    if (window.WBHtml) window.WBHtml._autoOn = !!on;
    if (!on) return;
    window._cyAutoTimer = setInterval(() => {
      const root = document.getElementById('wb-root');
      if (!root || !root.classList.contains('cy')) { _setAutoAttackCyber(false); return; }
      const sc = window.WBHtml?._scene;
      if (!sc || sc._alive === false) { _setAutoAttackCyber(false); return; }
      const hp = sc._state?.active?.current_hp;
      if (hp != null && hp <= 0) { _setAutoAttackCyber(false); return; }
      if (sc._state?.player_state?.is_dead) return;
      // emul-клик по кубику — он сам выберет зоны и стартанёт ход
      const dice = root.querySelector('#cy-dice');
      const apply = root.querySelector('#cy-apply');
      // если CD активен — пропускаем тик, дождёмся следующего
      if (apply?.classList.contains('cd')) return;
      dice?.click();
    }, 1100); // ~1.1с между раундами (apply CD = 800мс + запас)
  }

  // Окно «Фишки босса» по тапу на верхнюю плашку. Показывает пассивку (всегда)
  // + все пройденные пороги (pct ≤ hp) с описанием. Накапливается по ходу боя.
  function _showBossFishki() {
    try {
      const a = window.WBHtml?._scene?._state?.active || {};
      const feats = a.boss_features || [];
      const pct = a.max_hp > 0 ? (a.current_hp / a.max_hp * 100) : 100;
      document.getElementById('cy-fx-pop')?.remove();
      const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
      const shown = feats
        .filter(f => f && (f.hp == null || pct <= f.hp))
        .sort((x, y) => ((y.hp == null ? 101 : y.hp) - (x.hp == null ? 101 : x.hp)));
      const rows = shown.map(f => {
        const when = f.hp == null ? 'Всегда' : f.hp + '%';
        return '<div style="margin-bottom:11px;">'
          + '<div style="color:#ffce54;font-weight:800;font-size:12px;">' + when + ' · ' + esc(f.name) + '</div>'
          + '<div style="color:#cfd6e6;font-size:11px;line-height:1.45;margin-top:2px;">' + esc(f.desc) + '</div>'
          + '</div>';
      }).join('');
      const title = esc((a.boss_emoji || '⚡') + ' ' + (a.boss_name || 'Босс') + ' — фишки');
      const ov = document.createElement('div');
      ov.id = 'cy-fx-pop';
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;'
        + 'justify-content:center;background:rgba(0,0,0,.78);padding:18px;';
      ov.innerHTML = '<div style="width:100%;max-width:340px;max-height:80vh;overflow-y:auto;'
        + 'background:linear-gradient(180deg,#140a2a,#06030f);border:1px solid rgba(255,120,60,.35);'
        + 'border-radius:16px;padding:16px;box-shadow:0 8px 50px rgba(0,0,0,.7);">'
        + '<div style="font-size:14px;font-weight:900;color:#ffae5c;margin-bottom:12px;">' + title + '</div>'
        + (rows || '<div style="color:#8899aa;font-size:12px;">Фишки ещё не сработали</div>')
        + '<div id="cy-fx-pop-x" style="margin-top:8px;text-align:center;padding:11px;border-radius:12px;'
        + 'background:rgba(255,120,60,.22);color:#fff;font-weight:800;cursor:pointer;">ПОНЯТНО</div></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', e => {
        if (e.target === ov || e.target.id === 'cy-fx-pop-x') ov.remove();
      });
    } catch (_) {}
  }

  function _hook() {
    if (!window.WBHtml || !window.WBHtml._renderBattle) { setTimeout(_hook, 50); return; }
    if (window.__cyberBattleHooked) return;
    window.__cyberBattleHooked = true;
    window.WBHtml._renderBattle = function(root, s) {
      try {
        window.CyberView?.render?.(root, s);
        _bind(root, s);
      } catch(e) { console.warn('[cyber-battle]', e); }
    };
    // Переопределяем АВТОБОЙ — старая реализация несовместима с zone-режимом
    window.WBHtml.setAutoAttack = _setAutoAttackCyber;
  }
  _hook();
})();
