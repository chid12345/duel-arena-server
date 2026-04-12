/* ============================================================
   VirtScroll — движок виртуализированного скролла
   Рендерит только видимые элементы + буфер сверху/снизу.

   items: [{ y, h, render(scene): obj[], onTap?(): void,
              xMin?: number, xMax?: number }]

   obj[] может содержать Phaser GameObjects ИЛИ
   tween-обёртки: { _tw: true, destroy() }
   ============================================================ */

const VIRT_BUF = 130; // px буфера сверху/снизу от viewport

class VirtScroll {
  constructor(scene, container, items, viewH) {
    this._sc   = scene;
    this._ct   = container;
    this._its  = items;
    this._vh   = viewH;
    this._rend = new Map(); // itemIdx → obj[]
  }

  /* Вызывать при скролле и при инициализации. scrollY >= 0 */
  update(scrollY) {
    const top = scrollY - VIRT_BUF;
    const bot = scrollY + this._vh + VIRT_BUF;

    // Удаляем элементы, вышедшие за экран
    for (const [i, objs] of this._rend) {
      const it = this._its[i];
      if (it.y + it.h < top || it.y > bot) {
        objs.forEach(o => { try { o.destroy(); } catch (_) {} });
        this._rend.delete(i);
      }
    }

    // Создаём элементы, вошедшие в экран
    this._its.forEach((it, i) => {
      if (this._rend.has(i)) return;
      if (it.y + it.h < top || it.y > bot) return;
      const objs = it.render(this._sc);
      if (objs && objs.length) {
        objs.forEach(o => { if (!o._tw) this._ct.add(o); });
        this._rend.set(i, objs);
      }
    });
  }

  /* Найти элемент по тапу (relY/relX — в координатах контейнера) */
  tap(relY, relX) {
    for (const it of this._its) {
      if (relY < it.y || relY >= it.y + it.h) continue;
      if (it.xMin !== undefined && relX < it.xMin) continue;
      if (it.xMax !== undefined && relX > it.xMax) continue;
      if (it.onTap) { it.onTap(); return; }
    }
  }

  destroy() {
    for (const objs of this._rend.values())
      objs.forEach(o => { try { o.destroy(); } catch (_) {} });
    this._rend.clear();
  }
}
