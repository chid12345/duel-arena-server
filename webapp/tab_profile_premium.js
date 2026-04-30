/* ============================================================
   TabProfilePremium — премиум-эффекты для иконки "Профиль":
   - размер 42 как у всех остальных табов
   - тёплый золотой glow вместо белого: лев бело-серебристый с
     золотыми вставками. Белый glow на белой шерсти "выжигал" детали
     до белого блоба (баг "иконка не показывает картинку"). Золотой
     glow подсвечивает контур, не съедая силуэт льва, и комплиментит
     золотые акценты в самой иконке.
   - мягкий pulse: glow дышит 1.4↔2.6, alpha 0.92↔1.0 — еле заметный,
     чтобы не пересвечивать детали льва.
   Маленький модуль (Закон 1: не раздуваем tab_bar.js).
   ============================================================ */

(function () {
  // Тёплый золотой — гармонирует с золотыми акцентами на льве и
  // не теряется на тёмной панели таббара. Белый (0xffffff) сюда не
  // подходит: на серебристой шерсти он "глушит" контраст до белого.
  const GOLD = 0xfde68a;

  window.TabProfilePremium = {
    apply(scene, btn, isActive) {
      const img = btn?.iconImg;
      if (!img) return;

      // 1. Размер как у других табов — 42×42 (был 54, "выпирал").
      img.setDisplaySize(42, 42);

      // 2. Заменяем cyan-glow из TabBar.build на золотой. Один glow вместо
      //    двух — раньше второй белый был лишним поверх золотого.
      try { if (btn.glowFx && img.preFX) img.preFX.remove(btn.glowFx); } catch (_) {}
      try {
        // outerStrength 2/1.4 + distance 14 = мягкий ободок вокруг льва.
        // Раньше было 5/3 + 18 — съедало детали в белом ореоле.
        btn.glowFx = img.preFX?.addGlow(GOLD, isActive ? 2 : 1.4, 0, false, 0.12, 14);
      } catch (_) {}

      // 3. Pulse — мягко дышит, не выжигает детали льва.
      scene.tweens.killTweensOf(btn.glowFx);
      scene.tweens.killTweensOf(img);
      img.setAlpha(0.92);
      if (btn.glowFx) {
        scene.tweens.add({
          targets: btn.glowFx,
          outerStrength: isActive ? 2.6 : 1.9,
          duration: 1100, ease: 'Sine.easeInOut',
          yoyo: true, repeat: -1,
        });
      }
      scene.tweens.add({
        targets: img,
        alpha: 1.0,
        duration: 1100, ease: 'Sine.easeInOut',
        yoyo: true, repeat: -1,
      });
    },
  };
})();
