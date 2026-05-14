/* ============================================================
   Perf — простой замер времени горячих функций.
   Использование:
     const t0 = Perf.mark();
     ...синхронный код...
     Perf.end('buildProfile', t0);
   В консоли:
     Perf.dump()  — статистика по всем меткам (avg/min/max/n)
     Perf.clear() — сбросить накопленное
     Perf.data    — сырые массивы
   Включается через window.PERF_LOG=true до загрузки сцены.
   Метки >100мс автоматически логируются как WARN.
   ============================================================ */

window.Perf = (() => {
  const data = {};
  // Дефолтно ВКЛЮЧЕНО для замеров — отключить можно `Perf.off()`.
  let enabled = (typeof window !== 'undefined' && window.PERF_LOG !== false);

  function mark() {
    return enabled ? performance.now() : 0;
  }

  function end(name, t0) {
    if (!enabled || !t0) return;
    const dt = performance.now() - t0;
    const ms = Math.round(dt);
    (data[name] = data[name] || []).push(ms);
    const tag = `[Perf] ${name}: ${ms}мс`;
    if (dt > 100) console.warn(tag + ' ⚠️ >100мс');
    else console.log(tag);
    // Видимый баннер при сильном тормозе — для замеров на телефоне,
    // где DevTools-консоль недоступна.
    if (dt > 150) _banner(`⚠️ ${name}: ${ms}мс`);
  }

  let _bannerEl = null, _bannerTimer = 0;
  function _banner(text) {
    if (typeof document === 'undefined') return;
    try {
      if (!_bannerEl) {
        _bannerEl = document.createElement('div');
        _bannerEl.id = 'perf-banner';
        _bannerEl.style.cssText = 'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:99999;'
          + 'background:rgba(220,40,70,.92);color:#fff;font:700 11px/1.2 -apple-system,Segoe UI,sans-serif;'
          + 'padding:6px 12px;border-radius:10px;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.4);'
          + 'max-width:90vw;text-align:center';
        document.body.appendChild(_bannerEl);
      }
      _bannerEl.textContent = text;
      _bannerEl.style.opacity = '1';
      clearTimeout(_bannerTimer);
      _bannerTimer = setTimeout(() => { if (_bannerEl) _bannerEl.style.opacity = '0'; }, 2500);
    } catch(_) {}
  }

  function dump() {
    const keys = Object.keys(data);
    if (!keys.length) { console.log('[Perf:dump] нет данных'); return; }
    console.group('[Perf:dump] статистика');
    keys.sort().forEach(k => {
      const arr = data[k];
      const sum = arr.reduce((s, v) => s + v, 0);
      const avg = Math.round(sum / arr.length);
      const max = Math.max.apply(null, arr);
      const min = Math.min.apply(null, arr);
      const warn = max > 100 ? ' ⚠️' : '';
      console.log(`${k}: n=${arr.length} avg=${avg}мс min=${min}мс max=${max}мс${warn}`);
    });
    console.groupEnd();
  }

  function clear() { Object.keys(data).forEach(k => delete data[k]); }
  function on()  { enabled = true;  console.log('[Perf] enabled'); }
  function off() { enabled = false; console.log('[Perf] disabled'); }

  return { mark, end, dump, clear, on, off, data, get enabled() { return enabled; } };
})();
