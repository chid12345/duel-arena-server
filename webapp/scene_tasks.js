/* ============================================================
   TasksScene — система заданий v2
   Рендеринг через HTML overlay (tasks_html_overlay.js)
   ============================================================ */

class TasksScene extends Phaser.Scene {
  constructor() { super('Tasks'); }

  init(data) {
    this._tab = (data && data.tab) ? data.tab : 'daily';
  }

  create() {
    try { window._closeAllTabOverlays?.(); } catch(_) {}
    if (typeof ScreenHints !== 'undefined') ScreenHints.show('tasks');
    window.TasksHTML?.open(this, this._tab);
  }

  shutdown() {
    window.TasksHTML?.close();
  }
}
