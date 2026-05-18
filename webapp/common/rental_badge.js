/* ============================================================
   Rental Badge — общий бейдж «🕐 Аренда · Nд» для всех 6 слотов.
   До унификации каждый overlay писал свою функцию: у armor_overlay_v2
   она была, у остальных не было. Это убирает таймер 7д с других вкладок
   и плодит копипасту.
   Используется в *_html_overlay.js. См. план «Унификация слота Тело-Броня».
   ============================================================ */
(() => {
  function _rentalFor(itemId, activeRentals) {
    if (!itemId || !Array.isArray(activeRentals)) return null;
    for (const r of activeRentals) {
      if (r && r.item_id === itemId) return r;
    }
    return null;
  }

  function html(itemId, activeRentals) {
    const r = _rentalFor(itemId, activeRentals);
    if (!r) return '';
    const sec = Number(r.seconds_left || 0);
    if (sec <= 0) return '';
    const days = Math.max(1, Math.ceil(sec / 86400));
    return `<div style="position:absolute;top:6px;left:6px;background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#dbeafe;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;border:1px solid rgba(96,165,250,.5);z-index:2">🕐 Аренда · ${days}д</div>`;
  }

  function rentalsByItem(activeRentals) {
    const out = {};
    if (!Array.isArray(activeRentals)) return out;
    for (const r of activeRentals) {
      if (r && r.item_id) out[r.item_id] = r;
    }
    return out;
  }

  function ownedSetFor(slot, ownedWeapons, activeRentals, ownedArmor) {
    const ids = [];
    if (Array.isArray(ownedWeapons)) ids.push(...ownedWeapons);
    if (slot === 'armor' && Array.isArray(ownedArmor)) ids.push(...ownedArmor);
    if (Array.isArray(activeRentals)) {
      for (const r of activeRentals) if (r && r.item_id) ids.push(r.item_id);
    }
    return new Set(ids);
  }

  // Свежий пул `/api/player` с no-store — нужен после покупки аренды,
  // иначе Telegram WebView отдаст кэшированный ответ без новой записи.
  function refreshState() {
    const ts = Date.now();
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData || (window.State && State.initData) || '';
    const apiBase = (typeof API !== 'undefined' && API) ? API : '';
    return fetch(apiBase + '/api/player?_t=' + ts, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      cache: 'no-store',
      body: JSON.stringify({ init_data: initData }),
    }).then(r => r.json().catch(() => null)).then(res => {
      if (!res) return null;
      if (Array.isArray(res.active_rentals)) State.activeRentals = res.active_rentals;
      if (Array.isArray(res.owned_weapons)) State.ownedWeapons = res.owned_weapons;
      if (Array.isArray(res.owned_armor))   State.ownedArmor   = res.owned_armor;
      if (res.equipment)                    State.equipment    = res.equipment;
      if (res.player)                       { State.player = res.player; State.playerLoadedAt = Date.now(); }
      return res;
    }).catch(() => null);
  }

  window.RentalBadge = { html, rentalsByItem, ownedSetFor, refreshState };
})();
