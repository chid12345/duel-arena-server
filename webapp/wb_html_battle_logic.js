/* wb_html_battle_logic.js — локальная боевая механика по эталону raid_boss_preview.html
   - Шкала ульты заполняется от ударов (+4-6%) и скиллов (+6%)
   - При 100% — кнопка УДАР активна, тап = 8 фиолетовых burst-чисел + тряска
   - При HP=50% — триггер QTE (коллективный удар)
   - КД скиллов: атака 4с, щит 8с, ульта 15с, авто 0
   - HP-бар меняет цвет на 25/50% */
(() => {
  const CD = { atk: 4, shld: 8, ult: 15, auto: 0 };
  const _state = { ultra: 0, qteShown: false, lastPct: 100, cdTimers: {}, combo: 0, comboTimer: null, lastThreshold: 100 };

  function _bossZone() { return document.getElementById('wb-boss-zone'); }
  function _shake() {
    const root = document.getElementById('wb-root'); if (!root) return;
    root.classList.remove('wb-shake'); void root.offsetWidth; root.classList.add('wb-shake');
    setTimeout(() => root.classList.remove('wb-shake'), 450);
  }
  function _spawnBurst(text, color, fs) {
    const z = _bossZone(); if (!z) return;
    const r = z.getBoundingClientRect();
    const x = 30 + Math.random() * (r.width - 60);
    const y = 30 + Math.random() * (r.height - 80);
    const el = document.createElement('div');
    el.className = 'wb-dmg-num';
    el.textContent = text;
    el.style.cssText = `left:${x}px;top:${y}px;font-size:${fs}px;color:${color};text-shadow:0 0 15px ${color};`;
    z.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  function addUltraEnergy(delta) {
    _state.ultra = Math.min(1, _state.ultra + delta);
    const fill = document.getElementById('wb-ultra-fill');
    if (fill) fill.style.width = (_state.ultra * 100) + '%';
    if (_state.ultra >= 1) {
      const btn = document.getElementById('wb-ultra-btn');
      if (btn) { btn.classList.add('ready'); btn.innerHTML = '⚡ УДАР!'; }
    }
  }
  function fireUltra() {
    const btn = document.getElementById('wb-ultra-btn');
    if (!btn?.classList.contains('ready')) return false;
    _shake();
    const sc = window.WBHtml._scene;
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const dmg = Math.round(30000 + Math.random() * 20000);
        _spawnBurst(`💜 ${dmg.toLocaleString('ru')}`, '#BF00FF', 22 + Math.random() * 10);
      }, i * 80);
    }
    for (let i = 0; i < 5; i++) setTimeout(() => sc?._onHit?.(), i * 320);
    _state.ultra = 0;
    const fill = document.getElementById('wb-ultra-fill');
    if (fill) fill.style.width = '0%';
    btn.classList.remove('ready'); btn.innerHTML = 'УДАР';
    return true;
  }

  function startSkillCD(sk) {
    const sec = CD[sk] || 0; if (sec <= 0) return;
    if (_state.cdTimers[sk]) clearInterval(_state.cdTimers[sk]);
    let r = sec;
    window.WBHtml?.setSkillCooldown?.(sk, r);
    _state.cdTimers[sk] = setInterval(() => {
      r--;
      window.WBHtml?.setSkillCooldown?.(sk, r);
      if (r <= 0) { clearInterval(_state.cdTimers[sk]); _state.cdTimers[sk] = null; }
    }, 1000);
  }
  function isSkillOnCD(sk) { return !!_state.cdTimers[sk]; }

  function bumpCombo() {
    _state.combo++;
    if (_state.comboTimer) clearTimeout(_state.comboTimer);
    _state.comboTimer = setTimeout(() => { _state.combo = 0; _updateRage(); }, 2000);
    _updateRage();
  }
  function getCombo() { return _state.combo; }
  function _updateRage() {
    const v = document.getElementById('wb-rage2');
    if (v) v.classList.toggle('rage', _state.combo > 8);
  }

  function checkPhaseTransition(pct) {
    const thresholds = [75, 50, 25];
    for (const t of thresholds) {
      if (_state.lastThreshold > t && pct <= t) {
        _state.lastThreshold = t;
        _shake();
        const root = document.getElementById('wb-root');
        if (root) { root.classList.remove('wb-flash'); void root.offsetWidth; root.classList.add('wb-flash');
          setTimeout(() => root.classList.remove('wb-flash'), 800); }
        const ph = document.querySelector('.wb-phase');
        if (ph) ph.textContent = t === 25 ? 'ФИНАЛ ☠️' : t === 50 ? 'ФАЗА 2 🔥' : 'ФАЗА 1';
      }
    }
  }

  function checkQteTrigger(curPct) {
    if (_state.qteShown) return;
    if (_state.lastPct > 50 && curPct <= 50) {
      _state.qteShown = true;
      _triggerQTE();
    }
    _state.lastPct = curPct;
  }
  function _triggerQTE() {
    let count = 0, timeLeft = 5;
    const z = _bossZone(); if (!z) return;
    const ov = document.createElement('div'); ov.id = 'wb-qte-local'; ov.className = 'wb-qte-ov open';
    ov.innerHTML = `<div class="wb-qte-title">⚡ КОЛЛЕКТИВНЫЙ УДАР ⚡</div>
      <div class="wb-qte-btn"><div class="wb-qte-lbl">ВСЕ ЖМУТ</div><div class="wb-qte-ic">💥</div>
      <div class="wb-qte-cnt" id="wbq-cnt">0 / 10</div></div>
      <div class="wb-qte-bar-wrap"><div class="wb-qte-bar-lbl">ОСТАЛОСЬ: <span id="wbq-t">5.0</span>с</div>
      <div class="wb-qte-bar"><div class="wb-qte-bar-fill" id="wbq-bar" style="width:100%"></div></div></div>`;
    z.appendChild(ov);
    ov.querySelector('.wb-qte-btn').addEventListener('click', () => {
      count = Math.min(count + 1, 10);
      ov.querySelector('#wbq-cnt').textContent = count + ' / 10';
      try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch(_) {}
    });
    const iv = setInterval(() => {
      timeLeft -= 0.1;
      ov.querySelector('#wbq-t').textContent = timeLeft.toFixed(1);
      ov.querySelector('#wbq-bar').style.width = (timeLeft / 5 * 100) + '%';
      if (timeLeft <= 0) {
        clearInterval(iv); ov.remove();
        if (count >= 10) {
          _shake();
          const sc = window.WBHtml._scene;
          // 10 ударов с интервалом 320мс (> 300мс кулдаун сервера)
          // Числа урона показывает addHitLog при каждом реальном ударе
          for (let i = 0; i < 10; i++) setTimeout(() => sc?._onHit?.(), i * 320);
          // Бонусный удар +15% через сервер (после всех 10 ударов)
          setTimeout(() => {
            fetch(API + '/api/world_boss/qte_bonus', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ init_data: State.initData }),
            }).then(r => r.json()).then(d => {
              if (d.ok && d.bonus_damage) {
                _shake();
                try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}
                _spawnBurst(`⚡ +15%  ${d.bonus_damage.toLocaleString('ru')}`, '#FF8C00', 30);
              }
            }).catch(() => {});
          }, 3500);
          // Визуальные числа — показываем реальные числа из _onHit через addHitLog
          // Фейковые 60K убраны: игрок видит настоящий урон в зоне босса
        } else {
          _spawnBurst(`❌ ${count}/10 — МИМО!`, '#ff4444', 24);
        }
      }
    }, 100);
  }

  function fireUltSkill() {
    _shake();
    const sc = window.WBHtml._scene;
    for (let i = 0; i < 5; i++) setTimeout(() => {
      const dmg = Math.round(20000 + Math.random() * 15000);
      _spawnBurst(`💥 ${dmg.toLocaleString('ru')}`, '#BF00FF', 22);
    }, i * 90);
    for (let i = 0; i < 3; i++) setTimeout(() => sc?._onHit?.(), i * 320);
  }

  function _flashSkillBtn(cls) {
    // Визуальный feedback: подсвечиваем кнопку скилла когда авто-режим
    // её «нажимает». Без этого пользователь не понимает что бот применяет
    // АТАКА/ЩИТ/УЛЬТА — кнопки выглядят неактивными.
    const btn = document.querySelector('.wb-skill.' + cls);
    if (!btn) return;
    btn.classList.remove('firing'); void btn.offsetWidth;
    btn.classList.add('firing');
    setTimeout(() => btn.classList.remove('firing'), 350);
  }

  // Таймстемпы последних авто-применений. Интервалы по стандартным CD:
  //   ATK 4 сек, SHLD 8 сек, ULT 15 сек.
  const _autoLast = { atk: 0, shld: 0, ult: 0 };
  const AUTO_ATK_MS  = 4000;
  const AUTO_SHLD_MS = 8000;
  const AUTO_ULT_MS  = 15000;

  function setAutoAttack(on) {
    if (_state.autoTimer) { clearInterval(_state.autoTimer); _state.autoTimer = null; }
    window.WBHtml._autoOn = !!on; // сохраняем состояние чтобы кнопка восстановилась после ре-рендера
    if (!on) return;
    // Сброс таймстемпов при включении авто — чтобы не блокировать первый каст.
    _autoLast.atk = 0; _autoLast.shld = 0; _autoLast.ult = 0;
    _state.autoTimer = setInterval(() => {
      const sc = window.WBHtml._scene;
      // Если сцена умерла — останавливаем авто
      if (!sc || sc._alive === false) { setAutoAttack(false); return; }
      const hp = sc?._state?.active?.current_hp;
      if (hp != null && hp <= 0) { setAutoAttack(false); return; }
      // Игрок мёртв — анимации не нужны, ждём воскрешения
      if (sc?._state?.player_state?.is_dead) return;

      const now = Date.now();

      // 1. АТАКА ×2 — раз в 4 секунды, два удара подряд (как ручная кнопка).
      if ((now - _autoLast.atk) >= AUTO_ATK_MS) {
        sc?._onHit?.();
        setTimeout(() => sc?._onHit?.(), 350);
        _autoLast.atk = now;
        _flashSkillBtn('atk');
        startSkillCD('atk');
      }

      // 2. УЛЬТА — когда шкала ≥100%, выпускаем ШКАЛЬНЫЙ ультимейт (fireUltra,
      // 8 ударов с тряской). Без тоста — игрок видит тряску и burst-числа.
      if (_state.ultra >= 1 && (now - _autoLast.ult) >= AUTO_ULT_MS) {
        try {
          if (fireUltra()) _autoLast.ult = now;
        } catch(_) {}
      }

      // 3. ЩИТ — автоматически каждые AUTO_SHLD_MS (8 сек). Премиум-фича:
      // постоянная защита, не зависит от HP. Игрок видит регулярные
      // активации каждые 8 сек (видна вспышка + CD таймер).
      try {
        if ((now - _autoLast.shld) >= AUTO_SHLD_MS) {
          _autoLast.shld = now;
          startSkillCD('shld');
          _flashSkillBtn('shld');
          const shldBtn = document.querySelector('.wb-skill.shld');
          if (shldBtn) {
            shldBtn.classList.remove('shield-active'); void shldBtn.offsetWidth;
            shldBtn.classList.add('shield-active');
            setTimeout(() => shldBtn.classList.remove('shield-active'), 2000);
          }
          fetch(API + '/api/world_boss/shield', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: State.initData }),
          }).catch(() => {});
        }
      } catch(_) {}
    }, 1000);
  }

  function reset() { _state.ultra = 0; _state.qteShown = false; _state.lastPct = 100; _state.combo = 0; _state.lastThreshold = 100;
    if (_state.comboTimer) { clearTimeout(_state.comboTimer); _state.comboTimer = null; }
    Object.values(_state.cdTimers).forEach(t => t && clearInterval(t)); _state.cdTimers = {};
    if (_state.autoTimer) { clearInterval(_state.autoTimer); _state.autoTimer = null; }
    _autoLast.shld = 0; _autoLast.ult = 0; }

  // Геттер шкалы ульты — нужен чтобы ВОССТАНОВИТЬ её после ререндера UI.
  // Без этого каждый _refresh (раз в 8 сек) обнулял width в DOM, хотя
  // логика _state.ultra сохранялась — получался визуальный «глюк».
  function getUltraPct() { return Math.round((_state.ultra || 0) * 100); }

  // Геттеры остатков КД скиллов — их интервалы продолжают тикать после
  // ререндера (1 раз в сек), но первая секунда после ререндера показывает
  // «—». Геттер позволяет сразу восстановить корректное число.
  function getSkillCdSec(sk) {
    return _state.cdTimers[sk] ? null : 0; // null = тикает (точное число знает интервал), 0 = свободен
  }

  Object.assign(window.WBHtml, { addUltraEnergy, fireUltra, fireUltSkill, startSkillCD, isSkillOnCD, checkQteTrigger, checkPhaseTransition, bumpCombo, getCombo, setAutoAttack, getUltraPct, getSkillCdSec, resetBattleLogic: reset });
})();
