/* wb_html_resurrect_log_hook.js — логирует воскрешение свитком в bойлог.

   scene._resurrect (в scene_world_boss_ext.js, 299 строк, не трогаем) делает
   POST /api/world_boss/resurrect и refresh state. Воскрешение успешно если
   до запроса is_dead=true, после refresh is_dead=false.

   Перехватываем через WorldBossScene.prototype, замеряем переход is_dead,
   пушим запись в WBHtml._battleLog (kind='resurrect') с восстановленным HP. */
(() => {
  if (window.__wbzResurrectHookLoaded) return;
  window.__wbzResurrectHookLoaded = true;

  function _hook() {
    if (typeof WorldBossScene === 'undefined' || !WorldBossScene.prototype || !WorldBossScene.prototype._resurrect) {
      setTimeout(_hook, 250);
      return;
    }
    if (WorldBossScene.prototype.__wbzResurrectHooked) return;
    WorldBossScene.prototype.__wbzResurrectHooked = true;

    const orig = WorldBossScene.prototype._resurrect;
    WorldBossScene.prototype._resurrect = async function(scroll_id) {
      const beforeDead = !!this._state?.player_state?.is_dead;
      try { await orig.call(this, scroll_id); } catch(_) {}
      // Оригинал делает this._refresh() при успехе — ждём пока придёт свежий state
      setTimeout(() => {
        try {
          const afterDead = !!this._state?.player_state?.is_dead;
          if (beforeDead && !afterDead) {
            const hp = this._state?.player_state?.current_hp || 0;
            window.WBHtml?.logResurrect?.(scroll_id, hp);
          }
        } catch(_) {}
      }, 900);
    };
  }

  _hook();
})();
