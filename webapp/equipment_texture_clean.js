/* ============================================================
   equipment_texture_clean.js — canvas-чистка чёрного фона
   скинов экипировки для Phaser-текстур.

   Аналог _removeDarkBg() из *_html_overlay.js, но для Phaser:
   - Берём исходное изображение текстуры → canvas
   - Проверяем 4 угла: если 2+ тёмных (luma<80, low saturation) —
     считаем что у PNG/JPG есть чёрный фон
   - Прогоняем все пиксели: тёмные и нейтральные → alpha=0
   - Регистрируем canvas как новую Phaser-текстуру с суффиксом
   - Кэшируем (не обрабатываем повторно)

   Работает с любым форматом (PNG/JPG/JPEG), потому что canvas
   читает готовую bitmap, ему не важно откуда она пришла.
   ============================================================ */

(function() {
  'use strict';

  const CLEAN_SUFFIX = '_bgless';

  window.cleanEquipmentTexture = function(scene, key) {
    if (!key || !scene || !scene.textures) return key;
    const cleanKey = key + CLEAN_SUFFIX;
    if (scene.textures.exists(cleanKey)) return cleanKey;
    if (!scene.textures.exists(key)) return key;

    try {
      const src = scene.textures.get(key);
      const frame = src.getSourceImage ? src.getSourceImage() : null;
      if (!frame || !frame.width || !frame.height) return key;

      const W = frame.width | 0, H = frame.height | 0;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.drawImage(frame, 0, 0);
      const d = ctx.getImageData(0, 0, W, H);

      // 4 угла: тёмный = luma<80 и низкая насыщенность
      let darkCorners = 0;
      const corners = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]];
      for (let k = 0; k < 4; k++) {
        const i = (corners[k][1] * W + corners[k][0]) * 4;
        const mx = Math.max(d.data[i], d.data[i + 1], d.data[i + 2]);
        const mn = Math.min(d.data[i], d.data[i + 1], d.data[i + 2]);
        if (d.data[i + 3] > 10 && mx < 80 && mx - mn < 30) darkCorners++;
      }
      if (darkCorners < 2) return key; // фона нет, оставляем оригинал

      // Делаем тёмные нейтральные пиксели прозрачными
      for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx < 72 && mx - mn < 28) d.data[i + 3] = 0;
      }
      ctx.putImageData(d, 0, 0);

      scene.textures.addCanvas(cleanKey, c);
      return cleanKey;
    } catch (e) {
      return key;
    }
  };
})();
