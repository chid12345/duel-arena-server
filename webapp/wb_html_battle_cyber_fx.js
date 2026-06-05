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

  // Сокращения зон (как в боте: Гол / Тело / Ноги).
  const ZONE_SHORT = { HEAD:'Гол', TORSO:'Тело', LEGS:'Ноги' };

  // Рендер ОДНОГО раунда (формат как bot_battle_log: моя атака+рез · его атака+рез).
  // isFresh=true → тег розовый (свежий), false → тег циан (старый, приглушён).
  function _renderRound(num, sel, r, isFresh) {
    const myZ = ZONE_SHORT[sel.atk] || '—';
    const oppZ = ZONE_SHORT[r.boss_atk_zone] || '—';
    const myRes = r.atk_blocked
      ? '<span class="cy-clog-res blk">⊘ блок</span>'
      : (r.is_crit
          ? '<span class="cy-clog-res crit">💥−' + (r.damage || 0) + '</span>'
          : '<span class="cy-clog-res dmg">−' + (r.damage || 0) + '</span>');
    const oppRes = r.def_blocked
      ? '<span class="cy-clog-res blk">⊘ блок</span>'
      : (r.counter_damage
          ? '<span class="cy-clog-res dmg">−' + r.counter_damage + '</span>'
          : '<span class="cy-clog-res miss">✕ мимо</span>');
    const tagCls = isFresh ? 't-pink' : 't-cyan';
    return '<span class="cy-clog-tag ' + tagCls + '">Р' + num + '</span>'
         + '<span class="cy-clog-zone me">' + myZ + '</span> ' + myRes
         + '<span class="cy-clog-arr">·</span>'
         + '<span class="cy-clog-zone opp">' + oppZ + '</span> ' + oppRes;
  }

  // Лог раундов: Р1, Р2, Р3, ... В шапке всегда видны ПОСЛЕДНИЕ ДВА раунда
  // (свежий розовый, предыдущий циан + opacity:.55). Полная история — попап тапом.
  function pushClog(root, sel, r) {
    if (!root || !r) return;
    const hist = root.__cyHistory = root.__cyHistory || [];
    const num = hist.length + 1;
    hist.push({ num, sel, r });

    const empty = root.querySelector('#cy-clog-empty');
    const prev  = root.querySelector('#cy-clog-prev');
    const curr  = root.querySelector('#cy-clog-curr');
    if (empty) empty.style.display = 'none';
    // curr — самый свежий (розовый), prev — предыдущий (циан, приглушён)
    if (hist.length === 1) {
      if (prev) prev.style.display = 'none';
      if (curr) {
        curr.style.display = '';
        curr.classList.remove('old');
        curr.innerHTML = _renderRound(num, sel, r, true);
      }
    } else {
      const a = hist[hist.length - 2], b = hist[hist.length - 1];
      if (prev) {
        prev.style.display = '';
        prev.classList.add('old');
        prev.innerHTML = _renderRound(a.num, a.sel, a.r, false);
      }
      if (curr) {
        curr.style.display = '';
        curr.classList.remove('old');
        curr.innerHTML = _renderRound(b.num, b.sel, b.r, true);
      }
    }
    const c = root.querySelector('#cy-clog');
    if (c) { c.classList.remove('fresh'); void c.offsetWidth; c.classList.add('fresh'); }
  }

  function _fmtSec(s) {
    if (s == null || s < 0) return '—';
    return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
  }

  // Всплывающее сообщение «фишка началась» над ареной — само исчезает,
  // в layout места не занимает (absolute внутри #cy-arena).
  function spawnAnnounce(arena, text, color) {
    if (!arena) return;
    const e = document.createElement('div');
    e.textContent = '⚡ ' + String(text == null ? '' : text);
    e.style.cssText = 'position:absolute;left:50%;top:15%;transform:translate(-50%,0) scale(.85);'
      + 'z-index:60;pointer-events:none;font-weight:900;font-size:15px;white-space:nowrap;'
      + 'padding:7px 14px;border-radius:12px;background:rgba(8,0,18,.8);color:' + (color || '#ff8a4c') + ';'
      + 'border:1px solid ' + (color || '#ff7a3c') + '99;text-shadow:0 0 10px #000;opacity:0;'
      + 'transition:opacity .25s ease, transform .25s ease;';
    arena.appendChild(e);
    requestAnimationFrame(() => { e.style.opacity = '1'; e.style.transform = 'translate(-50%,0) scale(1)'; });
    setTimeout(() => { e.style.opacity = '0'; e.style.transform = 'translate(-50%,-10px) scale(1)'; }, 1400);
    setTimeout(() => { try { e.remove(); } catch (_) {} }, 1750);
  }

  window.CyberFx = { spawnImpact, spawnDmg, flashZone, pushClog, spawnAnnounce, _fmtSec, ZONES, ZONE_NAME };
})();
