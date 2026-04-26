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
      try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    });
    const iv = setInterval(() => {
      timeLeft -= 0.1;
      ov.querySelector('#wbq-t').textContent = timeLeft.toFixed(1);
      ov.querySelector('#wbq-bar').style.width = (timeLeft / 5 * 100) + '%';
      if (timeLeft <= 0) {
        clearInterval(iv); ov.remove();
        if (count >= 5) {
          _shake();
          const sc = window.WBHtml._scene;
          for (let i = 0; i < 5; i++) setTimeout(() => {
            const dmg = Math.round(60000 + Math.random() * 20000);
            _spawnBurst(`⚡ СТАН! ${dmg.toLocaleString('ru')}`, '#FFD700', 24);
          }, i * 100);
          for (let i = 0; i < 5; i++) setTimeout(() => sc?._onHit?.(), i * 320);
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
    if (!on) return;
    // Сброс таймстемпов при включении авто — чтобы не блокировать первый каст.
    _autoLast.atk = 0; _autoLast.shld = 0; _autoLast.ult = 0;
    _state.autoTimer = setInterval(() => {
      const sc = window.WBHtml._scene; const hp = sc?._state?.active?.current_hp;
      if (hp != null && hp <= 0) { setAutoAttack(false); return; }

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
      // 8 ударов с тряской). Кнопки УЛЬТА в нижнем ряду нет, единственная
      // ультимейта — через шкалу.
      if (_state.ultra >= 1 && (now - _autoLast.ult) >= AUTO_ULT_MS) {
        try {
          if (fireUltra()) {
            _autoLast.ult = now;
            window.WBHtml?.toast?.('💥 УЛЬТА (авто)!');
          }
        } catch(_) {}
      }

      // ЩИТ убран — функционала не было, кнопки больше нет.
    }, 1000);
  }

  function reset() { _state.ultra = 0; _state.qteShown = false; _state.lastPct = 100; _state.combo = 0; _state.lastThreshold = 100;
    if (_state.comboTimer) { clearTimeout(_state.comboTimer); _state.comboTimer = null; }
    Object.values(_state.cdTimers).forEach(t => t && clearInterval(t)); _state.cdTimers = {};
    if (_state.autoTimer) { clearInterval(_state.autoTimer); _state.autoTimer = null; }
    _autoLast.shld = 0; _autoLast.ult = 0; }

  Object.assign(window.WBHtml, { addUltraEnergy, fireUltra, fireUltSkill, startSkillCD, isSkillOnCD, checkQteTrigger, checkPhaseTransition, bumpCombo, getCombo, setAutoAttack, resetBattleLogic: reset });
})();
