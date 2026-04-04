/* ============================================================
   sound.js — Duel Arena Sound Manager
   Всё генерируется через Web Audio API, никаких файлов.
   Подключается до game.js, экспортирует глобальный объект Sound.
   ============================================================ */

const Sound = (() => {
  let _ctx  = null;
  let _mute = false;

  /* ── Контекст (ленивый, нужен gesture) ─────────────────── */
  function ctx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  /* ── Мастер-шина с gain ────────────────────────────────── */
  function bus(gain = 1) {
    const g = ctx().createGain();
    g.gain.value = _mute ? 0 : gain;
    g.connect(ctx().destination);
    return g;
  }

  /* ── Осциллятор ─────────────────────────────────────────── */
  function osc(type, freq, startT, dur, vol = 0.25, freqEnd = null) {
    const c  = ctx();
    const o  = c.createOscillator();
    const g  = c.createGain();
    o.type   = type;
    o.frequency.setValueAtTime(freq, startT);
    if (freqEnd !== null)
      o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), startT + dur);
    g.gain.setValueAtTime(vol,    startT);
    g.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
    o.connect(g); g.connect(bus());
    o.start(startT); o.stop(startT + dur + 0.02);
  }

  /* ── Белый шум через фильтр ─────────────────────────────── */
  function noise(filterType, freq, Q, startT, dur, vol = 0.2, freqEnd = null) {
    const c   = ctx();
    const len = Math.ceil(c.sampleRate * (dur + 0.05));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buf;

    const f = c.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, startT);
    if (freqEnd !== null)
      f.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), startT + dur);
    f.Q.value = Q;

    const g = c.createGain();
    g.gain.setValueAtTime(vol,    startT);
    g.gain.exponentialRampToValueAtTime(0.0001, startT + dur);

    src.connect(f); f.connect(g); g.connect(bus());
    src.start(startT); src.stop(startT + dur + 0.05);
  }

  /* ══════════════════════════════════════════════════════════
     П У Б Л И Ч Н Ы Й   А П И
     ══════════════════════════════════════════════════════════ */
  return {

    get muted() { return _mute; },
    toggleMute() {
      _mute = !_mute;
      // Сохраняем в localStorage
      try { localStorage.setItem('da_mute', _mute ? '1' : '0'); } catch(_) {}
      return _mute;
    },
    init() {
      try { _mute = localStorage.getItem('da_mute') === '1'; } catch(_) {}
    },

    /* ── UI клик ─────────────────────────────────────────── */
    click() {
      if (_mute) return;
      const t = ctx().currentTime;
      osc('sine', 880, t, 0.04, 0.12);
    },

    /* ── Вкладка переключилась ───────────────────────────── */
    tab() {
      if (_mute) return;
      const t = ctx().currentTime;
      osc('sine', 660, t, 0.05, 0.07);
    },

    /* ── Обычный удар ────────────────────────────────────── */
    hit() {
      if (_mute) return;
      const t = ctx().currentTime;
      osc('sine', 110, t, 0.10, 0.55, 38);          // низкий thump
      noise('bandpass', 900, 2.5, t, 0.07, 0.22, 180); // шум контакта
    },

    /* ── Крит ────────────────────────────────────────────── */
    crit() {
      if (_mute) return;
      const t = ctx().currentTime;
      osc('sine',     95, t,        0.13, 0.75, 32);   // мощный thump
      osc('sawtooth', 420, t,       0.06, 0.18, 210);  // металлический привкус
      noise('bandpass', 2200, 3, t, 0.11, 0.38, 380);  // хруст
    },

    /* ── Уворот ──────────────────────────────────────────── */
    dodge() {
      if (_mute) return;
      const t = ctx().currentTime;
      noise('bandpass', 280, 4.5, t, 0.20, 0.18, 1400); // свист
      osc('sine', 550, t, 0.16, 0.06, 1600);             // тон
    },

    /* ── Блок/защита ─────────────────────────────────────── */
    block() {
      if (_mute) return;
      const t = ctx().currentTime;
      osc('triangle', 200, t, 0.09, 0.3, 120);
      noise('highpass', 1500, 1, t, 0.05, 0.15);
    },

    /* ── Победа ──────────────────────────────────────────── */
    victory() {
      if (_mute) return;
      const t = ctx().currentTime;
      // Восходящая мелодия
      [330, 392, 494, 659, 880].forEach((f, i) =>
        osc('triangle', f, t + i * 0.10, 0.16, 0.22)
      );
      // Финальный аккорд
      [523, 659, 784].forEach(f =>
        osc('sine', f, t + 0.60, 0.55, 0.10)
      );
    },

    /* ── Поражение ───────────────────────────────────────── */
    defeat() {
      if (_mute) return;
      const t = ctx().currentTime;
      [440, 370, 330, 247].forEach((f, i) =>
        osc('triangle', f, t + i * 0.22, 0.30, 0.18)
      );
    },

    /* ── Покупка (монетка) ───────────────────────────────── */
    buy() {
      if (_mute) return;
      const t = ctx().currentTime;
      osc('sine', 820, t,        0.06, 0.18);
      osc('sine', 1100, t + 0.07, 0.08, 0.14);
    },

    /* ── Квест выполнен ──────────────────────────────────── */
    questDone() {
      if (_mute) return;
      const t = ctx().currentTime;
      [523, 659, 784, 1047].forEach((f, i) =>
        osc('triangle', f, t + i * 0.09, 0.14, 0.20)
      );
    },

    /* ── Повышение уровня ────────────────────────────────── */
    levelUp() {
      if (_mute) return;
      const t = ctx().currentTime;
      [330, 392, 494, 659, 880, 1047].forEach((f, i) =>
        osc('triangle', f, t + i * 0.07, 0.13, 0.24)
      );
      noise('bandpass', 600, 2, t + 0.45, 0.25, 0.12);
    },

    /* ── HP мало ─────────────────────────────────────────── */
    lowHp() {
      if (_mute) return;
      const t = ctx().currentTime;
      osc('sine', 220, t,        0.14, 0.25);
      osc('sine', 220, t + 0.22, 0.14, 0.25);
    },

    /* ── Счётчик раунда ──────────────────────────────────── */
    roundTick() {
      if (_mute) return;
      const t = ctx().currentTime;
      osc('sine', 440, t, 0.05, 0.08);
    },

    /* ── Отсчёт (3-2-1) ──────────────────────────────────── */
    countdown(n) {
      if (_mute) return;
      const t = ctx().currentTime;
      const f = n === 1 ? 660 : 440;
      osc('sine', f, t, 0.08, 0.20);
    },
  };
})();

// Инициализируем (читаем mute из localStorage)
Sound.init();
