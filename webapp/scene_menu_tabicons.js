/* ============================================================
   TAB_ICONS — filled + stroked RPG icons for Crystal Glass tab bar
   Each: TAB_ICONS.key(graphics, cx, cy, colorHex, lineWidth)
   lw > 1.6 = active state (brighter fill)
   ============================================================ */

const TAB_ICONS = {

  // Профиль — щит с силуэтом игрока
  profile(g, cx, cy, col, lw) {
    const a = lw > 1.6 ? 0.32 : 0.22;
    // Shield fill
    g.fillStyle(col, a);
    g.beginPath();
    g.moveTo(cx-9, cy-10); g.lineTo(cx+9, cy-10);
    g.lineTo(cx+10, cy); g.lineTo(cx, cy+11);
    g.lineTo(cx-10, cy); g.closePath(); g.fillPath();
    // Shield stroke
    g.lineStyle(lw, col, 1);
    g.beginPath();
    g.moveTo(cx-9, cy-10); g.lineTo(cx+9, cy-10);
    g.lineTo(cx+10, cy); g.lineTo(cx, cy+11);
    g.lineTo(cx-10, cy); g.closePath(); g.strokePath();
    // Head
    g.fillStyle(col, 1); g.fillCircle(cx, cy-3, 2.5);
    // Shoulders arc
    g.lineStyle(lw*0.85, col, 1);
    g.beginPath(); g.arc(cx, cy+4, 4, Math.PI, 0, false); g.strokePath();
  },

  // Клан — скрещенные мечи
  clan(g, cx, cy, col, lw) {
    // Blade 1: top-left → bottom-right
    g.lineStyle(lw+0.6, col, 1);
    g.lineBetween(cx-9, cy-9, cx+6, cy+6);
    // Blade 2: top-right → bottom-left
    g.lineBetween(cx+9, cy-9, cx-6, cy+6);
    // Cross-guards
    g.lineStyle(lw*0.85, col, 0.9);
    g.lineBetween(cx-4, cy-3, cx-1, cy);
    g.lineBetween(cx+4, cy-3, cx+1, cy);
    // Tips & hilts
    g.fillStyle(col, 1);
    g.fillCircle(cx+7, cy+7, lw*0.85);
    g.fillCircle(cx-7, cy+7, lw*0.85);
    g.fillCircle(cx-9, cy-9, lw*0.7);
    g.fillCircle(cx+9, cy-9, lw*0.7);
  },

  // Герой — рыцарский шлем
  stats(g, cx, cy, col, lw) {
    const a = lw > 1.6 ? 0.32 : 0.22;
    // Dome fill
    g.fillStyle(col, a);
    g.beginPath();
    g.arc(cx, cy-1, 8, Math.PI, 0, false);
    g.lineTo(cx+8, cy+6); g.lineTo(cx-8, cy+6); g.closePath(); g.fillPath();
    // Dome + cheeks stroke
    g.lineStyle(lw, col, 1);
    g.beginPath(); g.arc(cx, cy-1, 8, Math.PI, 0, false); g.strokePath();
    g.lineBetween(cx-8, cy-1, cx-8, cy+6);
    g.lineBetween(cx+8, cy-1, cx+8, cy+6);
    g.lineBetween(cx-8, cy+6, cx+8, cy+6);
    // Visor T-bar
    g.lineStyle(lw*0.85, col, 0.95);
    g.lineBetween(cx, cy-5, cx, cy+5);
    g.lineBetween(cx-7, cy+1, cx+7, cy+1);
  },

  // Босс — череп
  boss(g, cx, cy, col, lw) {
    const a = lw > 1.6 ? 0.32 : 0.22;
    // Skull dome fill
    g.fillStyle(col, a);
    g.beginPath();
    g.arc(cx, cy-1, 7, Math.PI, 0, false);
    g.lineTo(cx+7, cy+3); g.lineTo(cx-7, cy+3); g.closePath(); g.fillPath();
    // Skull outline
    g.lineStyle(lw, col, 1);
    g.beginPath(); g.arc(cx, cy-1, 7, Math.PI, 0, false); g.strokePath();
    g.lineBetween(cx-7, cy-1, cx-7, cy+4);
    g.lineBetween(cx+7, cy-1, cx+7, cy+4);
    g.lineBetween(cx-7, cy+4, cx-4, cy+8);
    g.lineBetween(cx+7, cy+4, cx+4, cy+8);
    g.lineBetween(cx-4, cy+8, cx+4, cy+8);
    // Teeth
    g.lineStyle(lw*0.75, col, 0.9);
    g.lineBetween(cx-2, cy+4, cx-2, cy+8);
    g.lineBetween(cx+2, cy+4, cx+2, cy+8);
    // Eyes filled
    g.fillStyle(col, 1);
    g.fillCircle(cx-3, cy-2, 2.5);
    g.fillCircle(cx+3, cy-2, 2.5);
  },

  // Рейтинг — корона
  rating(g, cx, cy, col, lw) {
    const a = lw > 1.6 ? 0.32 : 0.22;
    // Crown fill
    g.fillStyle(col, a);
    g.beginPath();
    g.moveTo(cx-9, cy+6); g.lineTo(cx+9, cy+6);
    g.lineTo(cx+9, cy-1); g.lineTo(cx+4, cy+2);
    g.lineTo(cx, cy-8);   g.lineTo(cx-4, cy+2);
    g.lineTo(cx-9, cy-1); g.closePath(); g.fillPath();
    // Crown stroke
    g.lineStyle(lw, col, 1);
    g.lineBetween(cx-9, cy+6, cx+9, cy+6);
    g.lineBetween(cx-9, cy+2, cx-9, cy+6);
    g.lineBetween(cx+9, cy+2, cx+9, cy+6);
    g.lineBetween(cx-9, cy+2, cx-9, cy-5);
    g.lineBetween(cx-9, cy-5, cx-4, cy+2);
    g.lineBetween(cx-4, cy+2, cx,   cy-8);
    g.lineBetween(cx,   cy-8, cx+4, cy+2);
    g.lineBetween(cx+4, cy+2, cx+9, cy-5);
    g.lineBetween(cx+9, cy-5, cx+9, cy+2);
    // Base line + jewels
    g.fillStyle(col, 1);
    g.fillCircle(cx-6, cy+4, 1.5);
    g.fillCircle(cx,   cy+4, 1.5);
    g.fillCircle(cx+6, cy+4, 1.5);
  },

  // Меню — свиток/документ
  more(g, cx, cy, col, lw) {
    const a = lw > 1.6 ? 0.32 : 0.22;
    // Document fill
    g.fillStyle(col, a);
    g.fillRoundedRect(cx-8, cy-10, 16, 20, 3);
    // Dog-ear corner fill (white highlight)
    g.fillStyle(col, a * 1.5);
    g.fillTriangle(cx+2, cy-10, cx+8, cy-10, cx+8, cy-4);
    // Document stroke
    g.lineStyle(lw, col, 1);
    g.strokeRoundedRect(cx-8, cy-10, 16, 20, 3);
    g.lineBetween(cx+2, cy-10, cx+2, cy-4);
    g.lineBetween(cx+2, cy-4,  cx+8, cy-4);
    // Text lines inside
    g.lineStyle(lw*0.85, col, 0.9);
    g.lineBetween(cx-5, cy-2, cx+5, cy-2);
    g.lineBetween(cx-5, cy+2, cx+5, cy+2);
    g.lineBetween(cx-5, cy+6, cx+3, cy+6);
  },

};
