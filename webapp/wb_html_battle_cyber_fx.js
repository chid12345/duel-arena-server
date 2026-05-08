/* ============================================================
   wb_html_battle_cyber_fx.js — импакт-эффекты для киберпанк-боя WB.
   Все эффекты одноразовые (setTimeout-remove), без накопления DOM.
   Экспорт: window.CyberFx = { spawnImpact, spawnDmg, flashZone, pushClog, _fmtSec }
   ============================================================ */
(() => {
  if (window.CyberFx) return;

  const ZONES = ['HEAD','TORSO','LEGS'];
  const ZONE_NAME = { HEAD:'Голова', TORSO:'Тело', LEGS:'Ноги' };

  // Импакт по боссу: slash + shockwave + sparks + boss shake.
  function spawnImpact(arena, boss, isCrit) {
    if (!arena) return;
    const c = isCrit ? ' crit' : '';

    // boss shake (через CSS-класс — ставим/снимаем чтобы анимация рестартовала)
    if (boss) {
      boss.classList.remove('hit','crit'); void boss.offsetWidth;
      boss.classList.add('hit');
      if (isCrit) boss.classList.add('crit');
    }

    // SLASH — диагональная молния под случайным углом
    const slash = document.createElement('div');
    slash.className = 'cy-slash' + c;
    const angle = -35 + Math.random() * 70;
    slash.style.setProperty('--slash-rot', angle + 'deg');
    arena.appendChild(slash);
    setTimeout(() => { try { slash.remove(); } catch(_) {} }, 500);

    // SHOCKWAVE — расходящееся кольцо
    const wave = document.createElement('div');
    wave.className = 'cy-shock' + c;
    arena.appendChild(wave);
    setTimeout(() => { try { wave.remove(); } catch(_) {} }, 600);

    // SPARKS — радиальные искры (на крите больше и дальше)
    const n = isCrit ? 10 : 6;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'cy-spark' + c;
      const a = (Math.PI * 2 * i / n) + (Math.random() * 0.4 - 0.2);
      const dist = (isCrit ? 80 : 60) + Math.random() * 35;
      s.style.setProperty('--dx', Math.cos(a) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(a) * dist + 'px');
      arena.appendChild(s);
      setTimeout(() => { try { s.remove(); } catch(_) {} }, 600);
    }
  }

  // Цифра урона над боссом (комикс-стиль).
  function spawnDmg(arena, dmg, isCrit) {
    if (!arena || dmg == null) return;
    const r = arena.getBoundingClientRect();
    const e = document.createElement('div');
    e.className = 'cy-dmg' + (isCrit ? ' crit' : '');
    e.textContent = (isCrit ? '💥 −' : '−') + (Number(dmg) || 0).toLocaleString('ru') + (isCrit ? '!' : '');
    e.style.left = (r.width/2 + (Math.random()-.5)*60) + 'px';
    e.style.top  = (r.height*0.42) + 'px';
    arena.appendChild(e);
    setTimeout(() => { try { e.remove(); } catch(_) {} }, 1500);
  }

  // Подсветка зоны после удара (пульс зелёный=попал, красный=мимо).
  function flashZone(root, side, zone, ok) {
    if (!root) return;
    const el = root.querySelector('.cy-col-' + side + ' .cy-zbtn[data-zone="' + zone + '"]');
    if (!el) return;
    el.classList.remove('fx-ok','fx-bad'); void el.offsetWidth;
    el.classList.add(ok ? 'fx-ok' : 'fx-bad');
    setTimeout(() => { try { el.classList.remove('fx-ok','fx-bad'); } catch(_) {} }, 950);
  }

  // Рендер ОДНОГО раунда: тег "Р{N}" + краткая инфа (моя атака → результат · защита → результат).
  function _renderRound(num, sel, r) {
    const atkZ = ZONE_NAME[sel.atk] || '—';
    const defZ = ZONE_NAME[sel.def] || '—';
    const atkRes = r.atk_blocked
      ? '<span class="cy-clog-res blk">⊘ блок</span>'
      : (r.is_crit
          ? '<span class="cy-clog-res crit">−' + (r.damage || 0) + '!</span>'
          : '<span class="cy-clog-res dmg">−' + (r.damage || 0) + '</span>');
    const defRes = r.def_blocked
      ? '<span class="cy-clog-res blk">⊘ отбил</span>'
      : '<span class="cy-clog-res hp">❤' + Math.max(0, r.player_hp || 0) + '</span>';
    return '<span class="cy-clog-tag round">Р' + num + '</span>'
         + '<span class="cy-clog-zone atk">' + atkZ + '</span> ' + atkRes
         + '<span class="cy-clog-arr">·</span>'
         + '<span class="cy-clog-zone def">' + defZ + '</span> ' + defRes;
  }

  // Лог раундов: Р1, Р2, Р3, ... В шапке всегда видны ПОСЛЕДНИЕ ДВА раунда
  // (старые скроллятся вверх). Полная история — в попапе тапом.
  function pushClog(root, sel, r) {
    if (!root || !r) return;
    const hist = root.__cyHistory = root.__cyHistory || [];
    const num = hist.length + 1;
    hist.push({ num, sel, r });

    const empty = root.querySelector('#cy-clog-empty');
    const prev  = root.querySelector('#cy-clog-prev');
    const curr  = root.querySelector('#cy-clog-curr');
    if (empty) empty.style.display = 'none';
    if (hist.length === 1) {
      if (prev) prev.style.display = 'none';
      if (curr) { curr.style.display = ''; curr.innerHTML = _renderRound(num, sel, r); }
    } else {
      const a = hist[hist.length - 2], b = hist[hist.length - 1];
      if (prev) { prev.style.display = ''; prev.innerHTML = _renderRound(a.num, a.sel, a.r); }
      if (curr) { curr.style.display = ''; curr.innerHTML = _renderRound(b.num, b.sel, b.r); }
    }
    // мерцание плашки
    const c = root.querySelector('#cy-clog');
    if (c) { c.classList.remove('fresh'); void c.offsetWidth; c.classList.add('fresh'); }
  }

  function _fmtSec(s) {
    if (s == null || s < 0) return '—';
    return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
  }

  window.CyberFx = { spawnImpact, spawnDmg, flashZone, pushClog, _fmtSec, ZONES, ZONE_NAME };
})();
