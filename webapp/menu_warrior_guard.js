/* ============================================================
   Menu Warrior Guard — единый предохранитель от входа в любой
   бой без выбранного воина (3 базовых класса: tank/agile/crit).
   Используется во всех точках входа:
     - кнопка "В БОЙ" (scene_warrior_select.js _tryBattle)
     - PvP / Бот / Башня / Натиск (scene_menu_ext2.js)
   Сервер дублирует проверку (страховка от обхода UI).
   ============================================================ */
(() => {
  if (typeof MenuScene === 'undefined') return;
  Object.assign(MenuScene.prototype, {
    /** Возвращает true — воин выбран, можно идти в бой.
        Иначе показывает тост, открывает выбор воина и возвращает false.
        returnTab — куда вернуть после выбора (по умолчанию 'battle'). */
    _requireWarrior(returnTab) {
      const wt = String(State?.player?.warrior_type || '').split('_')[0];
      if (wt === 'tank' || wt === 'agile' || wt === 'crit') return true;
      try { tg?.HapticFeedback?.notificationOccurred('warning'); } catch (_) {}
      try { this._toast?.('⚔️ Сначала выбери воина — он влияет на бой!'); } catch (_) {}
      this._wsReturnTab = returnTab || 'battle';
      try { this._openWarriorSelect?.(); } catch (_) {}
      return false;
    },
  });
})();
