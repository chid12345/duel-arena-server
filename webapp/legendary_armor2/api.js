/* ============================================================
   legendary_armor2/api.js — общий namespace LA2 +
   низкоуровневые хелперы: _api, _notify, _load.

   Загружается ПЕРВЫМ из модулей legendary_armor2/*.
   ============================================================ */
(() => {

  window.LA2 = window.LA2 || {};
  const N = window.LA2;

  N._busy = false;
  N._onCloseCb = null;
  N._pollTimer = null;

  N._notify = function (msg, ok = true) {
    let el = document.getElementById('la2-notify');
    if (!el) {
      el = Object.assign(document.createElement('div'), { id: 'la2-notify' });
      el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:10100;padding:10px 18px;border-radius:12px;font-size:12px;font-weight:700;max-width:280px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.5)';
      document.body.appendChild(el);
    }
    el.style.background = ok ? 'rgba(20,120,55,.97)' : 'rgba(180,30,30,.97)';
    el.style.color = ok ? '#bff5ce' : '#ffd2d2';
    el.textContent = msg;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.remove(), 2400);
  };

  N._api = async function (path, body) {
    const tg = window.Telegram?.WebApp;
    const init_data = tg?.initData || (window.State && State.initData) || '';
    const apiBase = (typeof API !== 'undefined' && API) ? API : '';
    try {
      const r = await fetch(apiBase + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        cache: 'no-store',
        body: JSON.stringify(Object.assign({ init_data }, body || {})),
      });
      return await r.json();
    } catch (_e) { return null; }
  };

  N._load = async function () {
    const r = await N._api('/api/equipment/armor2_legendary_state', {});
    if (!r || !r.ok) { N._render(null, false); return; }
    N._render(r.armor2_mods, !!r.owned);
  };

})();
