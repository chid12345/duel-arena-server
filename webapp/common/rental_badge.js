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

  // Форматирование оставшегося времени: 5д / 12ч / 30мин / 45с
  // (в зависимости от того, какая единица больше всего подходит).
  function _formatTimeLeft(sec) {
    if (sec < 60) return Math.max(1, sec) + 'с';
    if (sec < 3600) return Math.floor(sec / 60) + 'мин';
    if (sec < 86400) return Math.floor(sec / 3600) + 'ч';
    return Math.ceil(sec / 86400) + 'д';
  }

  function html(itemId, activeRentals) {
    const r = _rentalFor(itemId, activeRentals);
    if (!r) return '';
    const sec = Number(r.seconds_left || 0);
    if (sec <= 0) return '';
    const left = _formatTimeLeft(sec);
    // Размещаем в правом верхнем углу, чтобы не пересекаться с бейджем
    // «✅ Надета» (он в левом верхнем у всех 6 overlay'ев).
    return `<div style="position:absolute;top:6px;right:6px;background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#dbeafe;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;border:1px solid rgba(96,165,250,.5);z-index:5;box-shadow:0 2px 6px rgba(0,0,0,.4)">🕐 Аренда · ${left}</div>`;
  }

  function rentalsByItem(activeRentals) {
    const out = {};
    if (!Array.isArray(activeRentals)) return out;
    for (const r of activeRentals) {
      if (r && r.item_id) out[r.item_id] = r;
    }
    return out;
  }

  function ownedSetFor(slot, ownedWeapons, activeRentals) {
    // Используется для helmet/weapon/shield/boots/ring (одна таблица
    // player_owned_weapons). armor2 имеет свою State.ownedArmor2 — её overlay
    // ходит напрямую, не через эту функцию.
    const ids = [];
    if (Array.isArray(ownedWeapons)) ids.push(...ownedWeapons);
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
      if (Array.isArray(res.owned_armor2))  State.ownedArmor2  = res.owned_armor2;
      if (res.equipment)                    State.equipment    = res.equipment;
      if (res.shards)                       State.shards       = res.shards;
      if (res.plus)                         State.itemPlus     = res.plus;   // {item_id: +N}
      if (res.player)                       { State.player = res.player; State.playerLoadedAt = Date.now(); }
      return res;
    }).catch(() => null);
  }

  // Debug-полоса под вкладками: 2 кнопки «🔬 Debug» и «🗑 Сбросить мои аренды».
  // Используется во всех 6 overlay'ях (armor/helmet/weapon/shield/boots/ring),
  // чтобы можно было проверить аренду в любом слоте без code-дубля.
  // Доступ — только разработчику (ID 386313532). Бэкенд тоже режет чужих
  // (см. api/debug_rentals.py: ADMIN_USER_IDS из config/battle_constants).
  const DEV_USER_ID = 386313532;
  function _isDev() {
    try {
      const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (id && Number(id) === DEV_USER_ID) return true;
    } catch (_) { }
    return false;
  }
  function debugBarHtml() {
    if (!_isDev()) return '';
    return `<div style="display:flex;gap:6px;padding:4px 12px">
      <div class="rb-debug-show" style="flex:1;background:rgba(96,165,250,.08);font-size:10px;color:#a0c8ff;text-align:center;cursor:pointer;padding:4px;border-radius:4px">🔬 Debug</div>
      <div class="rb-debug-wipe" style="flex:1;background:rgba(220,80,80,.12);font-size:10px;color:#ff9aa0;text-align:center;cursor:pointer;padding:4px;border-radius:4px">🗑 Сбросить мифики + аренды</div>
    </div>`;
  }

  // Подключить обработчики кнопок Debug-бара. После «Сбросить» вызовет onWiped().
  function attachDebugBar(rootEl, onWiped, notifyFn) {
    const tg = window.Telegram?.WebApp;
    const initData = () => tg?.initData || (window.State && State.initData) || '';
    const showBtn = rootEl.querySelector('.rb-debug-show');
    const wipeBtn = rootEl.querySelector('.rb-debug-wipe');
    if (showBtn) showBtn.onclick = async () => {
      try {
        const resp = await fetch('/api/debug/my_rentals?init_data=' + encodeURIComponent(initData()));
        const data = await resp.json();
        alert('🔬 DEBUG: state of equipment_rentals\n\n' + JSON.stringify(data, null, 2));
      } catch (e) { alert('Debug error: ' + e); }
    };
    if (wipeBtn) wipeBtn.onclick = async () => {
      if (!confirm('🗑 ПОЛНЫЙ сброс мификов + аренд (для тестов)?\n\nУдалится:\n• все аренды (любые слоты)\n• все купленные мифик-брони\n• все купленные мифики (шлем/меч/щит/ноги/кольцо)\n• кастомка легендарной брони\n• ВСЕ 6 слотов экипировки будут очищены\n\nПродолжить?')) return;
      try {
        const resp = await fetch('/api/debug/wipe_my_rentals?init_data=' + encodeURIComponent(initData()), { method: 'POST' });
        const data = await resp.json();
        if (data?.ok) {
          if (typeof notifyFn === 'function')
            notifyFn(`✅ Аренд: ${data.deleted_rentals} · мификов: ${data.deleted_owned_weapons} · снято слотов: ${data.cleared_slots}. Чисто.`);
          await refreshState();
          if (typeof onWiped === 'function') onWiped();
        } else {
          if (typeof notifyFn === 'function') notifyFn('❌ Ошибка сброса', false);
        }
      } catch (e) {
        if (typeof notifyFn === 'function') notifyFn('❌ ' + e, false);
      }
    };
  }

  window.RentalBadge = { html, rentalsByItem, ownedSetFor, refreshState, debugBarHtml, attachDebugBar };
})();
