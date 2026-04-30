/* ============================================================
   TabProfilePremium — премиум-эффекты для иконки "Профиль":
   - размер 42 как у всех остальных табов
   - бэкдроп-диск через Graphics (не preFX) — на мобильном WebView
     preFX.addGlow временами рендерил иконку как «белый квадрат»
     (баг «на ПК есть, на телефоне нет»). Графический диск рисуется
     надёжно везде: даже если PNG льва не загрузится / отрендерится —
     виден тёплый золотой круг, а не пустота.
   - preFX.addGlow остаётся для лёгкого ободка ПОВЕРХ диска (если
     поддерживается); если упадёт — диск всё ещё на месте.
   - мягкий pulse alpha 0.92↔1.0 — еле заметный.
   Маленький модуль (Закон 1: не раздуваем tab_bar.js).
   ============================================================ */

(function () {
  // Тёплый золотой — гармонирует с золотыми акцентами на льве и
  // не теряется на тёмной панели таббара. Белый (0xffffff) сюда не
  // подходит: на серебристой шерсти он "глушит" контраст до белого.
  const GOLD = 0xfde68a;
  const GOLD_DEEP = 0xf59e0b;

  window.TabProfilePremium = {
    apply(scene, btn, isActive) {
      const img = btn?.iconImg;
      const cont = btn?.iconContainer;
      if (!img) return;

      // 1. Размер как у других табов — 42×42 (был 54, "выпирал").
      img.setDisplaySize(42, 42);

      // 2. Графический диск-бэкдроп ВНУТРИ контейнера, ПОЗАДИ льва.
      //    Это страховка от мобильного бага, когда сама картинка не
      //    отрендерилась (preFX-комбинация роняла рендер на Android
      //    Telegram WebView) — пользователь всё равно видит "премиум-диск"
      //    и понимает, что это иконка Профиля.
      if (cont && !btn._premiumDisc) {
        const disc = scene.add.graphics();
        disc.fillStyle(GOLD_DEEP, 0.18); disc.fillCircle(0, 0, 22);
        disc.fillStyle(GOLD,      0.22); disc.fillCircle(0, 0, 16);
        disc.fillStyle(GOLD,      0.10); disc.fillCircle(0, 0, 26);
        // Container.addAt(child, 0) — кладём ПЕРВЫМ, чтобы лев был сверху.
        try { cont.addAt(disc, 0); } catch(_) { cont.add(disc); }
        btn._premiumDisc = disc;
      }

      // 3. Заменяем cyan-glow из TabBar.build на золотой (если preFX живой).
      //    На моб. WebView если preFX упадёт — диск из шага 2 всё равно есть.
      try { if (btn.glowFx && img.preFX) img.preFX.remove(btn.glowFx); } catch (_) {}
      try {
        btn.glowFx = img.preFX?.addGlow(GOLD, isActive ? 2 : 1.4, 0, false, 0.12, 14);
      } catch (_) {}

      // 4. Pulse — мягко дышит, не выжигает детали льва.
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
