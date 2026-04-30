/* ============================================================
   TabProfilePremium — премиум-эффекты для иконки "Профиль":
   - размер 42 как у всех остальных табов
   - белое свечение вместо cyan/золотого: лев бело-серебристый с
     золотыми вставками, белый glow подсвечивает контур, а золотые
     акценты остаются видными как контраст (а не сливаются с жёлтым)
   - мягкий pulse 2с (yoyo): glow дышит 3↔6, alpha 0.85↔1.0
   Маленький модуль (Закон 1: не раздуваем tab_bar.js).
   ============================================================ */

(function () {
  const WHITE = 0xffffff;

  window.TabProfilePremium = {
    apply(scene, btn, isActive) {
      const img = btn?.iconImg;
      if (!img) return;

      // 1. Размер как у других табов — 42×42 (был 54, "выпирал").
      img.setDisplaySize(42, 42);

      // 2. Заменяем cyan-glow из TabBar.build на белый. Один glow вместо
      //    двух — раньше второй белый был лишним поверх золотого.
      try { if (btn.glowFx && img.preFX) img.preFX.remove(btn.glowFx); } catch (_) {}
      try {
        btn.glowFx = img.preFX?.addGlow(WHITE, isActive ? 5 : 3, 0, false, 0.1, 18);
      } catch (_) {}

      // 3. Pulse 2с — мягко дышит, не выжигает детали льва.
      scene.tweens.killTweensOf(btn.glowFx);
      scene.tweens.killTweensOf(img);
      img.setAlpha(0.9);
      if (btn.glowFx) {
        scene.tweens.add({
          targets: btn.glowFx,
          outerStrength: 6,
          duration: 1000, ease: 'Sine.easeInOut',
          yoyo: true, repeat: -1,
        });
      }
      scene.tweens.add({
        targets: img,
        alpha: 1.0,
        duration: 1000, ease: 'Sine.easeInOut',
        yoyo: true, repeat: -1,
      });
    },
  };
})();
