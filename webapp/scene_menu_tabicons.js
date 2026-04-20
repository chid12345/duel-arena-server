/* ============================================================
   TAB_ICONS — Arena-themed SVG-style icons for bottom tab bar
   profile=Shield  clan=CrossedAxes  stats=Helmet
   boss=Skull      rating=Crown      more=Scroll
   Usage: TAB_ICONS.profile(graphics, cx, cy, colorHex, lineWidth)
   ============================================================ */

const TAB_ICONS = {

  // Профиль — щит с эмблемой
  profile(g, cx, cy, col, lw) {
    g.lineStyle(lw, col, 1);
    g.beginPath();
    g.moveTo(cx-8, cy-9); g.lineTo(cx+8, cy-9);
    g.lineTo(cx+8, cy+1); g.lineTo(cx, cy+10);
    g.lineTo(cx-8, cy+1); g.closePath();
    g.strokePath();
    // Эмблема: маленький ромб внутри
    g.lineStyle(lw * 0.85, col, 0.75);
    g.beginPath();
    g.moveTo(cx, cy-6); g.lineTo(cx+3, cy-2);
    g.lineTo(cx, cy+2); g.lineTo(cx-3, cy-2);
    g.closePath(); g.strokePath();
  },

  // Клан — скрещенные боевые топоры
  clan(g, cx, cy, col, lw) {
    g.lineStyle(lw, col, 1);
    // Рукоять 1 (лево-низ → право-верх)
    g.lineBetween(cx-7, cy+8, cx+5, cy-6);
    // Рукоять 2 (право-низ → лево-верх)
    g.lineBetween(cx+7, cy+8, cx-5, cy-6);
    g.lineStyle(lw + 0.5, col, 1);
    // Лезвие топора 1 (верх-право)
    g.lineBetween(cx+4, cy-7, cx+9, cy-4);
    g.lineBetween(cx+9, cy-4, cx+6, cy-2);
    // Лезвие топора 2 (верх-лево)
    g.lineBetween(cx-4, cy-7, cx-9, cy-4);
    g.lineBetween(cx-9, cy-4, cx-6, cy-2);
  },

  // Герой — рыцарский шлем
  stats(g, cx, cy, col, lw) {
    g.lineStyle(lw, col, 1);
    // Купол
    g.beginPath(); g.arc(cx, cy-2, 8, Math.PI, 0, false); g.strokePath();
    // Щёки
    g.lineBetween(cx-8, cy-2, cx-8, cy+6);
    g.lineBetween(cx+8, cy-2, cx+8, cy+6);
    // Подбородок
    g.lineBetween(cx-8, cy+6, cx+8, cy+6);
    // Визор: вертикальная + горизонтальная перекладины
    g.lineStyle(lw, col, 0.9);
    g.lineBetween(cx, cy-5, cx, cy+5);
    g.lineBetween(cx-7, cy+1, cx+7, cy+1);
  },

  // Босс — череп
  boss(g, cx, cy, col, lw) {
    g.lineStyle(lw, col, 1);
    // Черепная коробка (верхняя дуга)
    g.beginPath(); g.arc(cx, cy-1, 7, Math.PI, 0, false); g.strokePath();
    // Скулы/нижняя часть
    g.lineBetween(cx-7, cy-1, cx-7, cy+5);
    g.lineBetween(cx+7, cy-1, cx+7, cy+5);
    g.lineBetween(cx-7, cy+5, cx+7, cy+5);
    // Зубы (два разделителя)
    g.lineStyle(lw * 0.8, col, 1);
    g.lineBetween(cx-3, cy+3, cx-3, cy+5);
    g.lineBetween(cx+3, cy+3, cx+3, cy+5);
    // Глаза (заполненные круги)
    g.fillStyle(col, 1);
    g.fillCircle(cx-3, cy-2, 2);
    g.fillCircle(cx+3, cy-2, 2);
  },

  // Рейтинг — корона чемпиона
  rating(g, cx, cy, col, lw) {
    g.lineStyle(lw, col, 1);
    // Обруч
    g.lineBetween(cx-8, cy+5, cx+8, cy+5);
    g.lineBetween(cx-8, cy+1, cx-8, cy+5);
    g.lineBetween(cx+8, cy+1, cx+8, cy+5);
    // Три зубца короны
    g.lineBetween(cx-8, cy+1, cx-8, cy-7);
    g.lineBetween(cx-8, cy-7, cx-4, cy+1);
    g.lineBetween(cx-4, cy+1, cx, cy-9);
    g.lineBetween(cx, cy-9, cx+4, cy+1);
    g.lineBetween(cx+4, cy+1, cx+8, cy-7);
    g.lineBetween(cx+8, cy-7, cx+8, cy+1);
    // Самоцветы на обруче
    g.fillStyle(col, 0.9);
    g.fillCircle(cx-5, cy+3, 1.5);
    g.fillCircle(cx,   cy+3, 1.5);
    g.fillCircle(cx+5, cy+3, 1.5);
  },

  // Меню — свиток/пергамент
  more(g, cx, cy, col, lw) {
    g.lineStyle(lw, col, 1);
    // Корпус свитка
    g.strokeRect(cx-7, cy-7, 14, 14);
    // Строки текста
    g.lineStyle(lw * 0.8, col, 0.8);
    g.lineBetween(cx-4, cy-3, cx+4, cy-3);
    g.lineBetween(cx-4, cy+1, cx+4, cy+1);
    g.lineBetween(cx-4, cy+5, cx+2, cy+5);
    // Закруглённые валики сверху и снизу
    g.lineStyle(lw, col, 1);
    g.beginPath(); g.arc(cx, cy-7, 3, Math.PI, 0, false); g.strokePath();
    g.beginPath(); g.arc(cx, cy+7, 3, 0, Math.PI, false); g.strokePath();
  },

};
