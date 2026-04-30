/* ============================================================
   TabProfilePremium — премиум-эффекты для иконки "Профиль":
   - размер 42 как у всех остальных табов
   - НИКАКОГО круга/диска/ободка под иконкой: пользователь явно попросил,
     чтобы Профиль "парил" как остальные табы. Лев уже с короной — этого
     достаточно для премиум-вида.
   - preFX.addGlow тоже не используется: на Android Telegram WebView
     связка "PNG + preFX" роняла именно эту иконку в "белый квадрат".
     Активный таб подсвечивается общей activeBubble (3 точки сверху).
   - мягкий pulse alpha 0.92↔1.0 — еле заметный «дыхание» иконки.
   ============================================================ */

(function () {
  window.TabProfilePremium = {
    apply(scene, btn, _isActive) {
      const img = btn?.iconImg;
      if (!img) return;

      // Размер как у других табов — 42×42.
      img.setDisplaySize(42, 42);

      // Если в прошлой сборке таббара остался диск-фон от старой версии —
      // удаляем. Это идемпотентность при горячей перезагрузке.
      if (btn._premiumDisc) {
        try { btn._premiumDisc.destroy(); } catch (_) {}
        btn._premiumDisc = null;
      }

      // preFX-glow всегда выключен (см. tab_bar.js — для всех PNG-табов).
      try { if (btn.glowFx && img.preFX) img.preFX.remove(btn.glowFx); } catch (_) {}
      btn.glowFx = null;

      // Мягкий pulse alpha — еле заметный, без выгорания.
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
