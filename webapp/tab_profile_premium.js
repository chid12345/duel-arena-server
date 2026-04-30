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

      // 2. Премиум-диск: золотой ободок + 2 концентрических круга. Кладём
      //    ВНУТРИ контейнера. На ПК — лежит ПОД иконкой и работает как
      //    тёплое сияние. На моб. Android WebView, где PNG льва иногда
      //    роняется в "белый квадрат" из-за preFX-комбинации, — золотой
      //    ободок выходит ЗА пределы 42×42 PNG и остаётся виден короной
      //    вокруг квадрата. Игрок понимает, что это иконка Профиля.
      if (cont && !btn._premiumDisc) {
        const disc = scene.add.graphics();
        // Внешний ободок (24px) — выходит за PNG (21px радиус). Видно
        // даже когда центр закрыт белым квадратом.
        disc.lineStyle(2, GOLD_DEEP, 0.85); disc.strokeCircle(0, 0, 24);
        disc.lineStyle(1, GOLD,      0.55); disc.strokeCircle(0, 0, 27);
        // Подложка-сияние под иконкой
        disc.fillStyle(GOLD_DEEP, 0.20); disc.fillCircle(0, 0, 22);
        disc.fillStyle(GOLD,      0.18); disc.fillCircle(0, 0, 16);
        try { cont.addAt(disc, 0); } catch(_) { cont.add(disc); }
        btn._premiumDisc = disc;
      }

      // 3. preFX-glow ОТКЛЮЧЁН: на Android Telegram WebView связка
      //    "PNG + preFX.addGlow + tween" периодически рендерит спрайт
      //    как белый квадрат. Это стабильный воспроизводимый баг
      //    (повторялся через несколько итераций фиксов). Премиум-роль
      //    исполняет графический диск из шага 2 — стабильно везде.
      try { if (btn.glowFx && img.preFX) img.preFX.remove(btn.glowFx); } catch (_) {}
      btn.glowFx = null;

      // 4. Мягкий pulse alpha — еле заметный, без выгорания деталей.
      scene.tweens.killTweensOf(img);
      img.setAlpha(0.92);
      scene.tweens.add({
        targets: img,
        alpha: 1.0,
        duration: 1100, ease: 'Sine.easeInOut',
        yoyo: true, repeat: -1,
      });
    },
  };
})();
