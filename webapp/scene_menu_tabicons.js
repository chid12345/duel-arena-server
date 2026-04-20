/* ============================================================
   TAB_ICONS — Arena SVG icons for glassmorphism tab bar
   Each: TAB_ICONS.key(graphics, cx, cy, colorHex, lineWidth)
   ============================================================ */

const TAB_ICONS = {

  // Профиль — щит с ромбовым гербом
  profile(g, cx, cy, col, lw) {
    g.lineStyle(lw, col, 1);
    g.beginPath();
    g.moveTo(cx-8, cy-9); g.lineTo(cx+8, cy-9);
    g.lineTo(cx+9, cy); g.lineTo(cx, cy+10);
    g.lineTo(cx-9, cy); g.closePath(); g.strokePath();
    g.lineStyle(lw * 0.8, col, 0.7);
    g.beginPath();
    g.moveTo(cx, cy-5); g.lineTo(cx+3, cy-1);
    g.lineTo(cx, cy+4); g.lineTo(cx-3, cy-1);
    g.closePath(); g.strokePath();
  },

  // Клан — скрещенные мечи с гардами
  clan(g, cx, cy, col, lw) {
    g.lineStyle(lw + 0.5, col, 1);
    g.lineBetween(cx-8, cy+8, cx+8, cy-8);
    g.lineBetween(cx+8, cy+8, cx-8, cy-8);
    g.lineStyle(lw * 0.9, col, 1);
    g.lineBetween(cx-5, cy+4, cx-1, cy);
    g.lineBetween(cx+5, cy+4, cx+1, cy);
    g.fillStyle(col, 1);
    g.fillCircle(cx-9, cy+9, lw * 0.9);
    g.fillCircle(cx+9, cy+9, lw * 0.9);
  },

  // Герой — рыцарский шлем с забралом
  stats(g, cx, cy, col, lw) {
    g.lineStyle(lw, col, 1);
    g.beginPath(); g.arc(cx, cy-1, 8, Math.PI, 0, false); g.strokePath();
    g.lineBetween(cx-8, cy-1, cx-8, cy+6);
    g.lineBetween(cx+8, cy-1, cx+8, cy+6);
    g.lineBetween(cx-8, cy+6, cx+8, cy+6);
    g.lineStyle(lw * 0.85, col, 0.95);
    g.lineBetween(cx, cy-4, cx, cy+5);
    g.lineBetween(cx-7, cy+2, cx+7, cy+2);
  },

  // Босс — череп с разинутой пастью
  boss(g, cx, cy, col, lw) {
    g.lineStyle(lw, col, 1);
    g.beginPath(); g.arc(cx, cy-1, 7, Math.PI, 0, false); g.strokePath();
    g.lineBetween(cx-7, cy-1, cx-7, cy+4);
    g.lineBetween(cx+7, cy-1, cx+7, cy+4);
    g.lineBetween(cx-7, cy+4, cx-4, cy+8);
    g.lineBetween(cx+7, cy+4, cx+4, cy+8);
    g.lineBetween(cx-4, cy+8, cx+4, cy+8);
    g.lineStyle(lw * 0.75, col, 0.9);
    g.lineBetween(cx-2, cy+4, cx-2, cy+8);
    g.lineBetween(cx+2, cy+4, cx+2, cy+8);
    g.fillStyle(col, 1);
    g.fillCircle(cx-3, cy-2, 2);
    g.fillCircle(cx+3, cy-2, 2);
  },

  // Рейтинг — корона с тремя зубцами и самоцветами
  rating(g, cx, cy, col, lw) {
    g.lineStyle(lw, col, 1);
    g.lineBetween(cx-9, cy+5, cx+9, cy+5);
    g.lineBetween(cx-9, cy+1, cx-9, cy+5);
    g.lineBetween(cx+9, cy+1, cx+9, cy+5);
    g.lineBetween(cx-9, cy+1, cx-9, cy-7);
    g.lineBetween(cx-9, cy-7, cx-4, cy+1);
    g.lineBetween(cx-4, cy+1, cx,   cy-9);
    g.lineBetween(cx,   cy-9, cx+4, cy+1);
    g.lineBetween(cx+4, cy+1, cx+9, cy-7);
    g.lineBetween(cx+9, cy-7, cx+9, cy+1);
    g.fillStyle(col, 1);
    g.fillCircle(cx-6, cy+3, 1.5);
    g.fillCircle(cx,   cy+3, 1.5);
    g.fillCircle(cx+6, cy+3, 1.5);
  },

  // Меню — три строки с декором (список)
  more(g, cx, cy, col, lw) {
    g.lineStyle(lw + 0.5, col, 1);
    g.lineBetween(cx-8, cy-5, cx+8, cy-5);
    g.lineBetween(cx-8, cy,   cx+8, cy);
    g.lineBetween(cx-8, cy+5, cx+5, cy+5);
    g.fillStyle(col, 1);
    g.fillCircle(cx+7, cy+5, lw * 0.8);
  },

};
