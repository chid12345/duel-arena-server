/* ============================================================
   TabProfilePremium — премиум-эффекты для иконки "Профиль":
   - крупнее остальных (54 vs 42) — видны детали гривы/короны
   - золотой glow вместо cyan + лёгкое белое сияние (drop-shadow)
   - pulse 2с (glow + alpha) — медленно "дышит"
   PNG с прозрачным фоном (chroma key через scripts/_make_lion_transparent.py)
   — поэтому glow идёт по контуру льва, без квадратной рамки.
   Маленький модуль (Закон 1: не раздуваем tab_bar.js).
   ============================================================ */

(function () {
  const GOLD  = 0xfbbf24;
  const WHITE = 0xffffff;

  window.TabProfilePremium = {
    // Применяем сразу после создания iconImg в TabBar.build().
    apply(scene, btn, isActive) {
      const img = btn?.iconImg;
      if (!img) return;

      // 1. Крупнее остальных табов.
      img.setDisplaySize(54, 54);

      // 2. Заменяем cyan-glow на золотой + кладём тонкое белое сияние сверху.
      try { if (btn.glowFx && img.preFX) img.preFX.remove(btn.glowFx); } catch (_) {}
      try {
        btn.glowFx      = img.preFX?.addGlow(GOLD,  isActive ? 7 : 5, 0, false, 0.1, 22);
        btn.glowFxWhite = img.preFX?.addGlow(WHITE, 2.0,              0, false, 0.1, 10);
      } catch (_) {}

      // 3. Pulse 2с (yoyo 1с туда + 1с обратно): дышит сила золотого свечения
      //    и слегка яркость самой иконки. Scale-контейнер не трогаем —
      //    его использует общий hover/tap из tab_bar.js (как у других табов).
      scene.tweens.killTweensOf(btn.glowFx);
      scene.tweens.killTweensOf(img);
      img.setAlpha(0.85);
      if (btn.glowFx) {
        scene.tweens.add({
          targets: btn.glowFx,
          outerStrength: 9.5,
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
