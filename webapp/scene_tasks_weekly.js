/* ============================================================
   TasksWeeklyScene — редирект на вкладку Задания → страница Недельные
   Сцена оставлена для совместимости, содержимое перенесено в
   scene_tasks_daily.js (страница 'weekly')
   ============================================================ */

class TasksWeeklyScene extends Phaser.Scene {
  constructor() { super('TasksWeekly'); }
  init() {}
  create() {
    // Сразу перенаправляем в основную сцену заданий на страницу недельных
    this.scene.start('Tasks', { tab: 'daily', subpage: 'weekly' });
  }
}
