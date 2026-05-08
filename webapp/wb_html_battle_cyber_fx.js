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

  // Заполняет мини-лог последнего обмена P2 (босс) и P1 (игрок).
  // r — ответ /api/world_boss/hit { damage, is_crit, boss_atk_zone, atk_blocked, def_blocked, counter_damage, player_hp, ... }
  function pushClog(root, sel, r) {
    if (!root || !r) return;
    const empty = root.querySelector('#cy-clog-empty');
    const p2 = root.querySelector('#cy-clog-p2');
    const p1 = root.querySelector('#cy-clog-p1');
    if (empty) empty.style.display = 'none';
    if (p2)    p2.style.display = '';
    if (p1)    p1.style.display = '';

    const bossAtk = r.boss_atk_zone || '?';
    const setText = (id, txt) => { const el = root.querySelector('#' + id); if (el) el.textContent = txt; };
    const setRes  = (id, cls, txt) => {
      const el = root.querySelector('#' + id);
      if (!el) return;
      el.className = 'cy-clog-res ' + cls;
      el.textContent = txt;
    };

    // P2 (босс): атака bossAtk → отбили (def_blocked) или прошёл -counter_damage
    setText('cy-p2-atk', ZONE_NAME[bossAtk] || '—');
    if (r.def_blocked) setRes('cy-p2-atk-r', 'blk', '⊘ блок');
    else               setRes('cy-p2-atk-r', 'dmg', '−' + (r.counter_damage || 0));

    // P1 (мы): атака selA → пробил (-damage) или босс отбил (atk_blocked)
    setText('cy-p1-atk', ZONE_NAME[sel.atk] || '—');
    if (r.atk_blocked) setRes('cy-p1-atk-r', 'blk', '⊘ блок');
    else if (r.is_crit) setRes('cy-p1-atk-r', 'crit', '−' + (r.damage || 0) + '!');
    else                setRes('cy-p1-atk-r', 'dmg',  '−' + (r.damage || 0));

    // P1 защита selD → если defOK — отбил, иначе показываем текущий HP
    setText('cy-p1-def', ZONE_NAME[sel.def] || '—');
    if (r.def_blocked) setRes('cy-p1-def-r', 'blk', '⊘ отбил');
    else               setRes('cy-p1-def-r', 'hp',  '❤' + Math.max(0, r.player_hp || 0));

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
