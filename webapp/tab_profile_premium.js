/* ============================================================
   TabProfilePremium — премиум-эффекты для иконки "Профиль":
   - blend SCREEN: чёрный фон JPG исчезает на тёмной панели
   - золотое + белое свечение (drop-shadow look) вместо рамки
   - pulse 2с (glow + alpha) — медленно "дышит"
   - flash() — вспышка белым + scale 1.1 при тапе
   Маленький модуль (Закон 1: не раздуваем tab_bar.js).
   ============================================================ */

(function () {
  const GOLD  = 0xfbbf24;
  const WHITE = 0xffffff;

  window.TabProfilePremium = {
    // Применяем эффекты сразу после создания iconImg в TabBar.build().
    apply(scene, btn, isActive) {
      const img = btn?.iconImg;
      const cont = btn?.iconContainer;
      if (!img || !cont) return;

      // 1. SCREEN убирает чёрный фон JPG: в кадре остаются только светлые
      //    части (лев, корона, лучи), будто иконка парит над панелью.
      try { img.setBlendMode(Phaser.BlendModes.SCREEN); } catch (_) {}

      // 2. Крупнее (54 vs 42 у остальных табов) — детали гривы и короны видны.
      img.setDisplaySize(54, 54);

      // 3. Заменяем cyan-glow на золотой + добавляем тонкое белое сияние.
      //    Старый glowFx был добавлен в TabBar.build — снимаем и кладём свои.
      try { if (btn.glowFx && img.preFX) img.preFX.remove(btn.glowFx); } catch (_) {}
      try {
        btn.glowFx      = img.preFX?.addGlow(GOLD,  isActive ? 7 : 5, 0, false, 0.1, 22);
        btn.glowFxWhite = img.preFX?.addGlow(WHITE, 2.0,              0, false, 0.1, 10);
      } catch (_) {}

      // 4. Pulse 2с (yoyo 1с туда + 1с обратно): дышит сила золотого свечения
      //    и слегка яркость самой иконки. Scale-контейнера не трогаем —
      //    его использует общий hover/tap из tab_bar.js.
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

      btn._premium = true;
    },

    // Вспышка белым + scale 1.1 на короткий миг (вызывается из pointerdown).
    flash(scene, btn) {
      const img = btn?.iconImg;
      const cont = btn?.iconContainer;
      if (!img || !cont) return;

      // Резкий всплеск белого glow → плавно вернёмся.
      if (btn.glowFxWhite) {
        scene.tweens.killTweensOf(btn.glowFxWhite);
        btn.glowFxWhite.outerStrength = 14;
        scene.tweens.add({
          targets: btn.glowFxWhite,
          outerStrength: 2.0,
          duration: 280, ease: 'Quad.easeOut',
        });
      }

      // Scale 1.1 (не 1.3 как у обычных табов) — мягкая премиум-реакция.
      scene.tweens.killTweensOf(cont);
      scene.tweens.add({
        targets: cont,
        scaleX: 1.1, scaleY: 1.1,
        duration: 80, ease: 'Back.easeOut',
        yoyo: true,
      });
    },
  };
})();
